package com.helpniche.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import android.net.VpnService;
import android.os.Build;
import android.os.ParcelFileDescriptor;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import java.io.BufferedReader;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.zip.GZIPInputStream;

public class LocalDnsVpnService extends VpnService {

    private static final String TAG = "LocalDnsVpnService";
    private static final String CHANNEL_ID = "FocusShieldVpnChannel";
    private static final int NOTIFICATION_ID = 1001;
    private static final int PROTECTION_ALERT_NOTIFICATION_ID = 1002;

    private static volatile LocalDnsVpnService instance = null;

    private ParcelFileDescriptor vpnInterface = null;
    private ScreenUnlockReceiver unlockReceiver = null;
    private static volatile boolean isStarting = false;
    private Thread vpnThread = null;
    private volatile boolean isRunning = false;
    private ExecutorService dnsThreadPool = null;

    private ConnectivityManager connectivityManager = null;
    private ConnectivityManager.NetworkCallback networkCallback = null;
    private volatile boolean isFirewallMode = false;
    private Set<String> currentBlockedApps = new HashSet<>();

    // উচ্চগতির ও ব্যাটারি-সেভিং লোকাল ডিএনএস ক্যাশ (রেডিও ও সিপিইউ সেভার)
    private static class DnsCacheEntry {
        final byte[] responseDnsBytes;
        final long expiresAt;
        DnsCacheEntry(byte[] bytes, long expiresAt) {
            this.responseDnsBytes = bytes;
            this.expiresAt = expiresAt;
        }
    }
    private static final Map<String, DnsCacheEntry> DNS_CACHE = new ConcurrentHashMap<>();
    private static int lastKnownTransport = -1;

    // আপস্ট্রিম সেফ ফ্যামিলি, অ্যাডব্লকিং ও পর্নোগ্রাফিক ফিল্টারিং ডিএনএস সার্ভারসমূহ
    private static final String[] UPSTREAM_DNS_SERVERS = {
            "94.140.14.15",   // AdGuard Family Protection (Ad Blocking + Adult Content Blocking)
            "94.140.15.16",   // AdGuard Family Secondary
            "185.228.168.168", // CleanBrowsing Family
            "1.1.1.3",        // Cloudflare Family
            "1.0.0.3"         // Cloudflare Family Secondary
    };

    // মেমরি-অপ্টিমাইজড ডোমেইন ব্লকলিস্ট সেট
    private static volatile Set<String> BLOCKED_DOMAINS = new HashSet<>();
    private static volatile boolean isBlocklistLoaded = false;

    /**
     * ব্যাকগ্রাউন্ড থ্রেডে blocklist লোড করার মেথড।
     * প্রথমে assets/blocklist.txt.gz চেষ্টা করে; না পেলে assets/blocklist.txt (plain)
     * ফলব্যাক হিসেবে লোড করে — যাতে build-এ ভুল ফাইল গেলেও AdBlock নীরবে মরে না যায়।
     */
    private void loadBlocklistFromAssets() {
        if (isBlocklistLoaded) return;

        ExecutorService executor = Executors.newSingleThreadExecutor();
        executor.submit(() -> {
            boolean loaded = tryLoadBlocklist("blocklist.txt", false);
            if (!loaded) {
                Log.w(TAG, "plain blocklist.txt not found, falling back to blocklist.txt.gz");
                loaded = tryLoadBlocklist("blocklist.txt.gz", true);
            }
            if (!loaded) {
                Log.e(TAG, "CRITICAL: No blocklist asset found (tried .txt and .gz). AdBlock DNS sinkhole is DISABLED.");
            }
            executor.shutdown();
        });
    }

    private boolean tryLoadBlocklist(String assetName, boolean gzipped) {
        BufferedReader reader = null;
        try {
            InputStream inputStream = getAssets().open(assetName);
            if (gzipped) {
                inputStream = new GZIPInputStream(inputStream);
            }
            reader = new BufferedReader(new InputStreamReader(inputStream, StandardCharsets.UTF_8));

            Set<String> tempSet = new HashSet<>(150000);

            String line;
            while (true) {
                try {
                    line = reader.readLine();
                    if (line == null) break;
                } catch (java.io.EOFException e) {
                    Log.w(TAG, "Reached EOF of blocklist file: " + assetName);
                    break;
                }

                line = line.trim().toLowerCase();

                // ১. খালি লাইন ও কমেন্ট বাদ দেওয়া
                if (line.isEmpty() || line.startsWith("#") || line.startsWith("!") || line.startsWith("//")) {
                    continue;
                }

                // ২. ইনলাইন কমেন্ট থাকলে কেটে বাদ দেওয়া
                int commentIdx = line.indexOf('#');
                if (commentIdx != -1) {
                    line = line.substring(0, commentIdx).trim();
                }

                // ৩. IP প্রিফিক্স (0.0.0.0 বা 127.0.0.1) বাদ দিয়ে মূল ডোমেইন আলাদা করা
                if (line.startsWith("0.0.0.0") || line.startsWith("127.0.0.1")) {
                    String[] parts = line.split("\\s+");
                    if (parts.length >= 2) {
                        line = parts[1].trim();
                    } else {
                        continue;
                    }
                } else if (line.contains(" ")) {
                    String[] parts = line.split("\\s+");
                    if (parts.length >= 2) {
                        line = parts[1].trim();
                    }
                }

                if (!line.isEmpty()) {
                    tempSet.add(line);
                }
            }

            synchronized (LocalDnsVpnService.class) {
                BLOCKED_DOMAINS = tempSet;
                isBlocklistLoaded = true;
            }
            Log.i(TAG, "Blocklist loaded successfully from " + assetName + "! Total blocked domains: " + tempSet.size());
            return true;
        } catch (java.io.FileNotFoundException e) {
            Log.w(TAG, "Blocklist asset not found: " + assetName);
            return false;
        } catch (Exception e) {
            Log.e(TAG, "Error loading " + assetName + " from assets", e);
            return false;
        } finally {
            if (reader != null) {
                try {
                    reader.close();
                } catch (Exception ignored) {}
            }
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        dnsThreadPool = Executors.newCachedThreadPool();
        loadBlocklistFromAssets();
        registerNetworkCallback();
    }

    public static boolean hasActiveNetworkBlocks(Context context) {
        if (context == null) return false;
        try {
            SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            String wifi = prefs.getString("network_blocked_wifi", "[]");
            String data = prefs.getString("network_blocked_data", "[]");
            return (!"[]".equals(wifi) && !wifi.isEmpty()) || (!"[]".equals(data) && !data.isEmpty());
        } catch (Exception e) {
            return false;
        }
    }

    public static Set<String> getActiveBlockedPackages(Context context) {
        Set<String> activeBlocked = new HashSet<>();
        if (context == null) return activeBlocked;
        try {
            SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            Set<String> wifiBlocked = getPackageSetFromPrefs(prefs, "network_blocked_wifi");
            Set<String> dataBlocked = getPackageSetFromPrefs(prefs, "network_blocked_data");

            boolean isWifi = false;
            boolean isCellular = false;

            ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    Network net = cm.getActiveNetwork();
                    if (net != null) {
                        NetworkCapabilities caps = cm.getNetworkCapabilities(net);
                        if (caps != null) {
                            isWifi = caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI);
                            isCellular = caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR);
                        }
                    }
                } else {
                    android.net.NetworkInfo ni = cm.getActiveNetworkInfo();
                    if (ni != null && ni.isConnected()) {
                        isWifi = ni.getType() == ConnectivityManager.TYPE_WIFI;
                        isCellular = ni.getType() == ConnectivityManager.TYPE_MOBILE;
                    }
                }
            }

            if (isWifi) {
                activeBlocked.addAll(wifiBlocked);
            } else if (isCellular) {
                activeBlocked.addAll(dataBlocked);
            } else {
                activeBlocked.addAll(wifiBlocked);
                activeBlocked.addAll(dataBlocked);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error computing active blocked packages", e);
        }
        return activeBlocked;
    }

    private static Set<String> getPackageSetFromPrefs(SharedPreferences prefs, String key) {
        String json = prefs.getString(key, "[]");
        Set<String> set = new HashSet<>();
        try {
            JSONArray arr = new JSONArray(json);
            for (int i = 0; i < arr.length(); i++) {
                set.add(arr.getString(i));
            }
        } catch (Exception ignored) {}
        return set;
    }

    public static synchronized void refreshRules(Context context) {
        if (instance != null && instance.isRunning) {
            instance.evaluateAndRebuildVpn();
        } else if (context != null) {
            startVpn(context);
        }
    }

    public synchronized void evaluateAndRebuildVpn() {
        Set<String> newBlocked = getActiveBlockedPackages(this);
        boolean modeChanged = (isFirewallMode != (!newBlocked.isEmpty()));
        boolean setChanged = !newBlocked.equals(currentBlockedApps);

        if (modeChanged || setChanged || vpnInterface == null) {
            Log.i(TAG, "Rebuilding VPN interface: isFirewall=" + (!newBlocked.isEmpty()) + ", count=" + newBlocked.size());
            setupVpn();
            startPacketLoopThread();
        }
    }

    private void registerNetworkCallback() {
        try {
            connectivityManager = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (connectivityManager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                networkCallback = new ConnectivityManager.NetworkCallback() {
                    @Override
                    public void onAvailable(Network network) {
                        evaluateAndRebuildVpn();
                    }

                    @Override
                    public void onLost(Network network) {
                        if (!ScreenUnlockReceiver.isNetworkAvailable(LocalDnsVpnService.this)) {
                            Log.i(TAG, "Network lost (WiFi/Data off): Stopping VPN immediately.");
                            stopVpn(LocalDnsVpnService.this);
                        }
                    }

                    @Override
                    public void onCapabilitiesChanged(Network network, NetworkCapabilities networkCapabilities) {
                        int currentTransport = -1;
                        if (networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                            currentTransport = 1;
                        } else if (networkCapabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
                            currentTransport = 2;
                        }
                        if (currentTransport != lastKnownTransport) {
                            lastKnownTransport = currentTransport;
                            evaluateAndRebuildVpn();
                        }
                    }
                };
                NetworkRequest request = new NetworkRequest.Builder()
                        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                        .build();
                connectivityManager.registerNetworkCallback(request, networkCallback);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error registering network callback", e);
        }
    }

    private void unregisterNetworkCallback() {
        if (connectivityManager != null && networkCallback != null) {
            try {
                connectivityManager.unregisterNetworkCallback(networkCallback);
            } catch (Exception ignored) {}
            networkCallback = null;
        }
    }

    public static synchronized void startVpn(Context context) {
        if (context == null) return;

        if (VpnService.prepare(context) != null) {
            Log.w(TAG, "VPN permission is not granted yet. Skipping start.");
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
        boolean isSystemWide = prefs.getBoolean("system_wide_adblock_enabled", true);
        boolean inBrowser = BlockerAccessibilityService.isCurrentlyInBrowser();
        if (!isSystemWide && !inBrowser && BlockerAccessibilityService.isUnlocked(context) && !hasActiveNetworkBlocks(context)) {
            Log.i(TAG, "Ad block disabled, not in browser, protection is unlocked and no network blocks. Skipping VPN start.");
            return;
        }

        if (!ScreenUnlockReceiver.isScreenInteractiveAndUnlocked(context)) {
            Log.i(TAG, "Screen is off or keyguard is locked. Skipping VPN start to save battery.");
            return;
        }

        if (!ScreenUnlockReceiver.isNetworkAvailable(context)) {
            Log.i(TAG, "No active internet connection. Skipping VPN start to save battery.");
            return;
        }

        if (isVpnRunning() || isStarting) {
            return;
        }

        isStarting = true;
        try {
            Intent intent = new Intent(context, LocalDnsVpnService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
            Log.i(TAG, "LocalDnsVpnService start requested.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to start VPN service", e);
            isStarting = false;
            // H13: On Android 12+, startForegroundService() from a background context
            // (boot, screen-unlock, accessibility callbacks) throws
            // ForegroundServiceStartNotAllowedException. Don't swallow it silently —
            // show the user an alert so they can reopen the app and resume protection.
            if (isBackgroundForegroundStartRejected(e)) {
                showProtectionPausedNotification(context);
            }
        }
    }

    /**
     * True when the given exception is the Android 12+ rejection of a background
     * startForegroundService() call. Compares the class name instead of using a
     * direct reference so this is safe on API < 31 where the class does not exist.
     */
    private static boolean isBackgroundForegroundStartRejected(Throwable e) {
        return e != null
                && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                && "android.app.ForegroundServiceStartNotAllowedException".equals(e.getClass().getName());
    }

    /**
     * Shows a user-visible "Protection paused" alert that deep-links into
     * MainActivity so the user can reopen the app and resume protection.
     * Note: posting requires POST_NOTIFICATIONS on Android 13+; if the permission
     * is missing the failure is caught and logged harmlessly.
     */
    private static void showProtectionPausedNotification(Context context) {
        try {
            if (context == null) return;
            Context app = context.getApplicationContext();
            NotificationManager manager = (NotificationManager) app.getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager == null) return;

            String channelId = "HelpnicheProtectionAlertChannel";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                        channelId,
                        "Protection Alerts",
                        NotificationManager.IMPORTANCE_DEFAULT);
                channel.setDescription("Alerts when Helpniche protection cannot restart in the background");
                manager.createNotificationChannel(channel);
            }

            Intent openApp = new Intent(app, MainActivity.class);
            openApp.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            int piFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                piFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(app, 0, openApp, piFlags);

            Notification notification = new NotificationCompat.Builder(app, channelId)
                    .setContentTitle("Protection paused")
                    .setContentText("সুরক্ষা ব্যাকগ্রাউন্ডে চালু করা যায়নি। চালিয়ে যেতে Helpniche খুলুন।")
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentIntent(pendingIntent)
                    .setAutoCancel(true)
                    .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                    .build();

            manager.notify(PROTECTION_ALERT_NOTIFICATION_ID, notification);
        } catch (Exception e) {
            Log.e(TAG, "Failed to post protection-paused notification", e);
        }
    }

    public static synchronized void stopVpn(Context context) {
        isStarting = false;
        if (instance != null) {
            try {
                instance.isRunning = false;
                if (instance.dnsThreadPool != null) {
                    instance.dnsThreadPool.shutdownNow();
                    instance.dnsThreadPool = null;
                }
                instance.closeVpnInterface();
                instance.stopForeground(STOP_FOREGROUND_REMOVE);
                instance.stopSelf();
            } catch (Exception e) {
                Log.e(TAG, "Error shutting down VPN instance", e);
            }
            instance = null;
        }
        if (context != null) {
            try {
                Intent intent = new Intent(context, LocalDnsVpnService.class);
                context.stopService(intent);
            } catch (Exception e) {
                Log.e(TAG, "Error stopping service via intent", e);
            }
        }
    }

    public static boolean isVpnRunning() {
        return instance != null && instance.vpnInterface != null;
    }

    public static boolean isVpnStartingOrRunning() {
        return isStarting || isVpnRunning();
    }

    public synchronized void closeVpnInterface() {
        isRunning = false;
        if (vpnInterface != null) {
            try {
                vpnInterface.close();
            } catch (IOException e) {
                Log.e(TAG, "Error closing VPN interface", e);
            }
            vpnInterface = null;
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForegroundServiceNotification();

        SharedPreferences prefs = getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
        boolean isSystemWide = prefs.getBoolean("system_wide_adblock_enabled", true);
        boolean inBrowser = BlockerAccessibilityService.isCurrentlyInBrowser();
        if (!isSystemWide && !inBrowser && BlockerAccessibilityService.isUnlocked(this) && !hasActiveNetworkBlocks(this)) {
            Log.i(TAG, "Ad block disabled, not in browser, protection is unlocked and no network blocks. Stopping VPN.");
            stopVpn(this);
            isStarting = false;
            return START_NOT_STICKY;
        }

        if (!ScreenUnlockReceiver.isScreenInteractiveAndUnlocked(this) || !ScreenUnlockReceiver.isNetworkAvailable(this)) {
            Log.i(TAG, "Screen off/locked or no network available. Stopping VPN.");
            stopVpn(this);
            isStarting = false;
            return START_NOT_STICKY;
        }

        if (dnsThreadPool == null || dnsThreadPool.isShutdown()) {
            dnsThreadPool = Executors.newCachedThreadPool();
        }

        loadBlocklistFromAssets();
        setupVpn();
        registerUnlockReceiver();
        startPacketLoopThread();
        isStarting = false;
        // H13: keep the service sticky once it is running from a foreground start so
        // the system restarts it (and protection resumes) if it is killed.
        return START_STICKY;
    }

    private void registerUnlockReceiver() {
        if (unlockReceiver == null) {
            try {
                unlockReceiver = new ScreenUnlockReceiver();
                IntentFilter filter = new IntentFilter();
                filter.addAction(Intent.ACTION_USER_PRESENT);
                filter.addAction(Intent.ACTION_SCREEN_OFF);
                filter.addAction(ConnectivityManager.CONNECTIVITY_ACTION);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    registerReceiver(unlockReceiver, filter, Context.RECEIVER_EXPORTED);
                } else {
                    registerReceiver(unlockReceiver, filter);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error registering ScreenUnlockReceiver in VPN Service", e);
            }
        }
    }

    private void startForegroundServiceNotification() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Helpniche Protection",
                        NotificationManager.IMPORTANCE_MIN
                );
                channel.setDescription("Protects your browsing from explicit and pornographic content");
                channel.setShowBadge(false);
                channel.setSound(null, null);
                NotificationManager manager = getSystemService(NotificationManager.class);
                if (manager != null) {
                    manager.createNotificationChannel(channel);
                }
            }

            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setContentTitle("Helpniche Active")
                    .setContentText("পর্নোগ্রাফিক ফিল্টার ও ফ্যামিলি ডিএনএস সচল")
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setPriority(NotificationCompat.PRIORITY_MIN)
                    .setOngoing(false)
                    .setAutoCancel(true)
                    .build();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to start foreground notification", e);
        }
    }

    private void setupVpn() {
        if (vpnInterface != null) {
            closeVpnInterface();
        }

        try {
            Set<String> activeBlocked = getActiveBlockedPackages(this);
            currentBlockedApps = new HashSet<>(activeBlocked);

            Builder builder = new Builder();
            builder.setMtu(1500);

            if (!activeBlocked.isEmpty()) {
                // --- FIREWALL SINKHOLE MODE (Per-app Network Block) ---
                isFirewallMode = true;
                builder.setSession("HelpnicheFirewall");
                builder.addAddress("10.254.1.2", 24);
                builder.addAddress("fd00:254::2", 64);
                builder.addRoute("0.0.0.0", 0);
                builder.addRoute("::", 0);
                builder.addDnsServer("10.254.1.1");

                int added = 0;
                for (String pkg : activeBlocked) {
                    try {
                        builder.addAllowedApplication(pkg);
                        added++;
                    } catch (PackageManager.NameNotFoundException ignored) {
                    } catch (Exception e) {
                        Log.w(TAG, "Could not add allowed app: " + pkg, e);
                    }
                }

                if (added > 0) {
                    vpnInterface = builder.establish();
                    Log.i(TAG, "Firewall VPN established with " + added + " blocked apps.");
                    return;
                }
            }

            // --- STANDARD MODE (Family DNS & Porn Filtering) ---
            isFirewallMode = false;
            builder.setSession("FocusShieldLocalVPN");
            builder.addAddress("10.0.0.2", 24);
            builder.addAddress("fd00:1::2", 64);

            // ১. সেফ, অ্যাডব্লকিং ও ফ্যামিলি ডিএনএস সার্ভিস যুক্ত করা
            builder.addDnsServer("94.140.14.15"); // AdGuard Family Protection (Primary - Ad & Adult Blocking)
            builder.addDnsServer("94.140.15.16"); // AdGuard Family Secondary
            builder.addDnsServer("10.0.0.2");     // Local TUN DNS - ensures all port 53 traffic routes directly into VPN
            builder.addDnsServer("fd00:1::2");    // Local TUN IPv6 DNS

            // ২. রাউট যুক্ত করা
            builder.addRoute("10.0.0.0", 24);
            builder.addRoute("fd00:1::", 64);

            for (String dnsIp : UPSTREAM_DNS_SERVERS) {
                try {
                    builder.addRoute(dnsIp, 32);
                } catch (Exception ignored) {}
            }

            // পাবলিক বাইপাস DNS আইপি ব্লকড রাখা
            String[] publicDnsIps = {
                    "8.8.8.8", "8.8.4.4",
                    "1.1.1.1", "1.0.0.1",
                    "9.9.9.9", "149.112.112.112",
                    "208.67.222.222", "208.67.220.220",
                    "76.76.2.0", "76.76.10.0"
            };

            for (String ip : publicDnsIps) {
                try {
                    builder.addRoute(ip, 32);
                } catch (Exception ignored) {}
            }

            // IPv6 পাবলিক ও ফ্যামিলি DNS বাইপাস রোধে রাউট যুক্ত করা
            String[] publicDnsV6 = {
                    "2001:4860:4860::8888", "2001:4860:4860::8844",
                    "2606:4700:4700::1111", "2606:4700:4700::1001",
                    "2606:4700:4700::1113", "2606:4700:4700::1003",
                    "2a10:50c0::bad1:ff", "2a10:50c0::bad2:ff",
                    "2620:fe::fe", "2620:fe::9"
            };
            for (String ip6 : publicDnsV6) {
                try {
                    builder.addRoute(ip6, 128);
                } catch (Exception ignored) {}
            }

            // আমাদের নিজস্ব অ্যাপ বাইপাস
            try {
                builder.addDisallowedApplication(getPackageName());
                builder.addDisallowedApplication("com.focus.durood");
                builder.addDisallowedApplication("com.helpniche.browser");
            } catch (Exception ignored) {}

            // MFS, ব্যাংকিং, সোশ্যাল ও মেসেজিং অ্যাপস বাইপাস (Zero Latency for Calls & Chat)
            String[] disallowedAppPackages = {
                    // MFS ও ব্যাংকিং অ্যাপ
                    "com.bKash.customerapp", "com.bkash.merchant", "com.bkash.agent",
                    "com.konasl.nagad", "com.konasl.nagad.agent", "com.dbbl.mbs.mpay.prod",
                    "bd.com.upay.customer", "com.sjibl.tap", "com.alarafah.islamicwallet",
                    "com.ibbl.cellfin", "com.dbbl.nexus.pay", "com.ebl.skybanking",
                    "com.thecitybank.citytouch", "com.bracbank.astha", "com.mbl.rainbow",
                    "com.bankasia.smart", "bd.gov.sonalibank.esheba", "com.sonalibank.ewallet",
                    "com.dhakabank.dhakabankgo", "com.primebank.altitudemobile",
                    "com.mtb.smartbanking", "com.onebank.smartapp", "bd.com.trustbank.tblmoney",
                    "com.jamunabank.smartbanking", "com.pubalibank.PIBanking",
                    "com.abbl.abdirect", "com.southeastbank.telecash", "com.sc.mobile.bd",
                    // মেসেজিং ও ভিডিও কলিং অ্যাপস (Zero Latency Bypass)
                    "com.whatsapp",
                    "org.telegram.messenger",
                    "com.imo.android.imoim",
                    "com.facebook.orca",
                    "com.viber.voip",
                    // কৃত্রিম বুদ্ধিমত্তা ও এআই অ্যাপস (AI Apps Bypass - 100% Direct & Fast)
                    "com.openai.chatgpt",
                    "com.google.android.apps.bard",
                    "com.anthropic.claude",
                    "com.microsoft.copilot",
                    "com.microsoft.bing",
                    "ai.perplexity.app.android",
                    "com.deepseek.chat",
                    "com.poe.android",
                    "ai.character.app",
                    "ai.inflection.pi",
                    "com.mistralai.chat"
            };

            for (String packageName : disallowedAppPackages) {
                try {
                    builder.addDisallowedApplication(packageName);
                } catch (PackageManager.NameNotFoundException ignored) {
                } catch (Exception ignored) {}
            }

            builder.allowBypass();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                builder.setMetered(false);
            }

            vpnInterface = builder.establish();
            Log.i(TAG, "Stable Safe Family DNS VPN established successfully with AdBlock & Messaging Bypass.");
        } catch (Exception e) {
            Log.e(TAG, "Failed to establish VPN interface", e);
        }
    }

    private void startPacketLoopThread() {
        if (vpnInterface == null) return;
        isRunning = true;
        vpnThread = new Thread(this::runPacketLoop, "LocalDnsVpnLoop");
        vpnThread.setPriority(Thread.NORM_PRIORITY);
        vpnThread.start();
    }

    private void runPacketLoop() {
        FileInputStream in = null;
        FileOutputStream out = null;
        try {
            in = new FileInputStream(vpnInterface.getFileDescriptor());
            out = new FileOutputStream(vpnInterface.getFileDescriptor());

            byte[] buffer = new byte[32768];
            while (isRunning && vpnInterface != null) {
                int length = in.read(buffer);
                if (length > 0) {
                    processPacket(buffer, length, out);
                }
            }
        } catch (Exception e) {
            if (isRunning) {
                Log.e(TAG, "Error in VPN packet loop", e);
            }
        } finally {
            try {
                if (in != null) in.close();
                if (out != null) out.close();
            } catch (Exception ignored) {}
        }
    }

    private void processPacket(byte[] packet, int length, FileOutputStream out) {
        if (length < 28) return;

        int version = (packet[0] >> 4) & 0x0F;

        if (version == 4) {
            int ihl = (packet[0] & 0x0F) * 4;
            if (length < ihl + 8) return;

            int protocol = packet[9] & 0xFF;

            // ১. Private DNS (DoT - Port 853) ইন্টারসেপ্ট ও TCP RST ইনজেকশন
            // Android OS যখন DoT সার্ভারে পোর্ট ৮৫৩-এ কানেক্ট করার চেষ্টা করে, সাথে সাথে TCP RST পাঠানো হলে
            // ফোন বুঝতে পারে DoT অনুপলব্ধ এবং সাথে সাথে লোকাল UDP Port 53 DNS (10.0.0.2)-এ ফলব্যাক করে।
            if (protocol == 6) { // TCP
                if (length < ihl + 20) return;
                int destPort = ((packet[ihl + 2] & 0xFF) << 8) | (packet[ihl + 3] & 0xFF);
                if (destPort == 853) {
                    sendTcpReset(packet, length, ihl, out);
                }
                return;
            }

            if (protocol != 17) return; // UDP
            if (length < ihl + 8 + 12) return;

            int destPort = ((packet[ihl + 2] & 0xFF) << 8) | (packet[ihl + 3] & 0xFF);
            if (destPort != 53) return; // Port 53 DNS

            int dnsOffset = ihl + 8;
            String queryDomain = parseDnsQueryDomain(packet, dnsOffset, length);

            if (isFirewallMode) {
                if (dnsThreadPool != null && !dnsThreadPool.isShutdown()) {
                    byte[] packetCopy = Arrays.copyOf(packet, length);
                    dnsThreadPool.submit(() -> sendSinkholeDnsResponse(packetCopy, length, ihl, dnsOffset, out));
                }
                return;
            }

            if (queryDomain != null) {
                byte[] packetCopy = Arrays.copyOf(packet, length);
                if (isAdDomain(queryDomain)) {
                    if (dnsThreadPool != null && !dnsThreadPool.isShutdown()) {
                        dnsThreadPool.submit(() -> sendSinkholeDnsResponse(packetCopy, length, ihl, dnsOffset, out));
                    }
                    Log.d(TAG, "DNS Sinkhole Blocked Domain: " + queryDomain);
                    return;
                }

                // লোকাল ডিএনএস ক্যাশ চেক (যদি ক্যাশে থাকে, তবে আপস্ট্রিম সকেট ছাড়া দ্রুত লোকাল রেসপন্স)
                DnsCacheEntry cached = DNS_CACHE.get(queryDomain);
                if (cached != null && System.currentTimeMillis() < cached.expiresAt) {
                    if (dnsThreadPool != null && !dnsThreadPool.isShutdown()) {
                        dnsThreadPool.submit(() -> sendCachedDnsResponse(packetCopy, length, ihl, dnsOffset, cached.responseDnsBytes, out));
                    }
                    return;
                }

                if (dnsThreadPool != null && !dnsThreadPool.isShutdown()) {
                    dnsThreadPool.submit(() -> forwardDnsQueryUpstream(packetCopy, length, ihl, dnsOffset, out, queryDomain));
                }
            }
        } else if (version == 6) {
            // IPv6 DNS ও DoT হ্যান্ডলিং
            if (length < 48) return; // 40 IPv6 + 8 UDP
            int nextHeader = packet[6] & 0xFF;
            if (nextHeader == 6) { // TCP (IPv6)
                // IPv6 DoT ট্রাফিক ড্রপ
                return;
            }
            if (nextHeader != 17) return; // UDP (IPv6)
            int destPort = ((packet[42] & 0xFF) << 8) | (packet[43] & 0xFF);
            if (destPort != 53) return;

            int dnsOffset = 48;
            String queryDomain = parseDnsQueryDomain(packet, dnsOffset, length);
            if (queryDomain != null) {
                byte[] packetCopy = Arrays.copyOf(packet, length);
                if (isAdDomain(queryDomain)) {
                    if (dnsThreadPool != null && !dnsThreadPool.isShutdown()) {
                        dnsThreadPool.submit(() -> sendSinkholeDnsResponseV6(packetCopy, length, 40, dnsOffset, out));
                    }
                    Log.d(TAG, "DNS Sinkhole Blocked IPv6 Domain: " + queryDomain);
                    return;
                }

                if (dnsThreadPool != null && !dnsThreadPool.isShutdown()) {
                    dnsThreadPool.submit(() -> forwardDnsQueryUpstreamV6(packetCopy, length, 40, dnsOffset, out, queryDomain));
                }
            }
        }
    }

    // Canary ডোমেইন: গুগল ক্রোম ও ফায়ারফক্সকে DoH বন্ধ করানোর নির্দেশক
    private static final String CANARY_DOMAIN = "use-application-dns.net";
    private static final String[] DOH_BOOTSTRAP_DOMAINS = {
            "dns.google", "dns.google.com",
            "cloudflare-dns.com", "one.one.one.one",
            "dns.quad9.net", "doh.cleanbrowsing.org",
            "dns.adguard.com", "dns.adguard-dns.com"
    };

    // স্পষ্ট অ্যাডাল্ট ও পর্নোগ্রাফিক কিওয়ার্ড তালিকা
    private static final String[] ADULT_KEYWORDS = {
            "porn", "xxx", "xvideos", "xnxx", "xhamster", "hentai",
            "brazzers", "redtube", "youporn", "chaturbate", "stripchat",
            "bongacams", "beeg", "tnaflix", "spankbang", "eporner",
            "fapello", "heavy-r", "nhentai", "rule34", "onlyfans",
            "cam4", "livejasmin", "erovideo", "hqporner", "motherless",
            "nudist", "camgirl", "javhd", "porno", "jav", "fetish",
            "erotic", "boobs", "nsfw", "tube8", "hardcore"
    };

    private static boolean isAdultDomainPattern(String domain) {
        if (domain == null || domain.length() < 4) return false;
        if (domain.contains("essex") || domain.contains("sussex") ||
            domain.contains("middlesex") || domain.contains("assessment") ||
            domain.contains("pass") || domain.contains("class") ||
            domain.contains("compass") || domain.contains("glass") ||
            domain.contains("grass") || domain.contains("mass") ||
            domain.contains("press") || domain.contains("brass") ||
            domain.contains("asset") || domain.contains("express") ||
            domain.contains("session") || domain.contains("lesson") ||
            domain.contains("massage") || domain.contains("classic") ||
            domain.contains("assistant") || domain.contains("javascript") ||
            domain.contains("activex")) {
            return false;
        }

        if (domain.contains("sex") && !domain.contains("essex") && !domain.contains("sussex") && !domain.contains("middlesex")) {
            return true;
        }

        for (String kw : ADULT_KEYWORDS) {
            if (domain.contains(kw)) {
                return true;
            }
        }
        return false;
    }

    /**
     * ডোমেইন ম্যাচিং এবং সাবডোমেইন ম্যাচিং চেক
     */
    private static boolean isAdDomain(String domain) {
        if (domain == null || domain.isEmpty()) return false;

        String lower = domain.toLowerCase().trim();

        // ১. এআই প্ল্যাটফর্মের ডোমেইন ফিল্টারের বাইরে (100% Whitelist Bypass)
        if (isAiDomain(lower)) {
            return false;
        }

        // ২. DoH Canary ডোমেইন: NXDOMAIN দিলে ক্রোম ও ফায়ারফক্স DoH বন্ধ করে সিস্টেম ডিএনএসে ফিরে আসে
        if (lower.equals(CANARY_DOMAIN) || lower.endsWith("." + CANARY_DOMAIN)) {
            return true;
        }

        // ৩. DoH বুটস্ট্র্যাপ ডোমেইন ব্লক
        for (String doh : DOH_BOOTSTRAP_DOMAINS) {
            if (lower.equals(doh) || lower.endsWith("." + doh)) {
                return true;
            }
        }

        // ৪. স্পষ্ট অ্যাডাল্ট ও পর্নোগ্রাফিক কিওয়ার্ড/প্যাটার্ন ডোমেইন
        if (isAdultDomainPattern(lower)) {
            return true;
        }

        Set<String> currentBlocklist = BLOCKED_DOMAINS;
        if (currentBlocklist == null || currentBlocklist.isEmpty()) {
            return false;
        }

        // ৫. সরাসরি সমান (Exact Match from 160,000+ Blocklist)
        if (currentBlocklist.contains(lower)) {
            return true;
        }

        // ৬. সাবডোমেইন ম্যাচিং
        int dotIndex = lower.indexOf('.');
        while (dotIndex != -1 && dotIndex < lower.length() - 1) {
            String sub = lower.substring(dotIndex + 1);
            if (currentBlocklist.contains(sub)) {
                return true;
            }
            dotIndex = lower.indexOf('.', dotIndex + 1);
        }

        return false;
    }

    private static boolean isAiDomain(String domain) {
        if (domain == null) return false;
        return domain.equals("openai.com") || domain.endsWith(".openai.com") ||
                domain.equals("chatgpt.com") || domain.endsWith(".chatgpt.com") ||
                domain.equals("oaistatic.com") || domain.endsWith(".oaistatic.com") ||
                domain.equals("oaiusercontent.com") || domain.endsWith(".oaiusercontent.com") ||
                domain.equals("anthropic.com") || domain.endsWith(".anthropic.com") ||
                domain.equals("claude.ai") || domain.endsWith(".claude.ai") ||
                domain.equals("deepseek.com") || domain.endsWith(".deepseek.com") ||
                domain.equals("perplexity.ai") || domain.endsWith(".perplexity.ai") ||
                domain.equals("poe.com") || domain.endsWith(".poe.com") ||
                domain.equals("character.ai") || domain.endsWith(".character.ai") ||
                domain.contains("gemini.google.com") ||
                domain.contains("copilot.microsoft.com");
    }

    /**
     * ব্লকলিস্টভুক্ত ডোমেইনের জন্য লোকালভাবে RFC-compliant NXDOMAIN (Name Error) রেসপন্স পাঠানো
     */
    private void sendSinkholeDnsResponse(byte[] packet, int length, int ihl, int dnsOffset, FileOutputStream out) {
        try {
            int dnsQueryLen = length - dnsOffset;
            if (dnsQueryLen < 12) return;

            // Compute length of Question section (12-byte header + QNAME + 2-byte QTYPE + 2-byte QCLASS)
            int qPos = dnsOffset + 12;
            while (qPos < length) {
                int labelLen = packet[qPos] & 0xFF;
                if (labelLen == 0) {
                    qPos++; // Past zero terminator
                    break;
                }
                if ((labelLen & 0xC0) == 0xC0) {
                    qPos += 2; // Pointer
                    break;
                }
                qPos += 1 + labelLen;
            }
            int qLen = (qPos + 4) - dnsOffset;
            if (qLen <= 12 || dnsOffset + qLen > length) {
                qLen = length - dnsOffset;
            }

            int respDnsLen = qLen;
            byte[] respPacket = new byte[ihl + 8 + respDnsLen];

            // 1. Copy IPv4 header
            System.arraycopy(packet, 0, respPacket, 0, ihl);

            // 2. Swap IPv4 Addresses
            System.arraycopy(packet, 12, respPacket, 16, 4);
            System.arraycopy(packet, 16, respPacket, 12, 4);

            // 3. UDP Header: Swap Ports
            respPacket[ihl] = packet[ihl + 2];
            respPacket[ihl + 1] = packet[ihl + 3];
            respPacket[ihl + 2] = packet[ihl];
            respPacket[ihl + 3] = packet[ihl + 1];

            // 4. UDP Length
            int udpLen = 8 + respDnsLen;
            respPacket[ihl + 4] = (byte) ((udpLen >> 8) & 0xFF);
            respPacket[ihl + 5] = (byte) (udpLen & 0xFF);

            // 5. Zero out UDP Checksum
            respPacket[ihl + 6] = 0;
            respPacket[ihl + 7] = 0;

            // 6. IP Total Length
            int ipLen = ihl + udpLen;
            respPacket[2] = (byte) ((ipLen >> 8) & 0xFF);
            respPacket[3] = (byte) (ipLen & 0xFF);

            // 7. Compute IP Header Checksum
            computeIpHeaderChecksum(respPacket, ihl);

            // 8. Construct DNS Response (Header + Question only, RCODE 3 = NXDOMAIN)
            int respDnsOffset = ihl + 8;
            System.arraycopy(packet, dnsOffset, respPacket, respDnsOffset, respDnsLen);

            // Modify DNS Header Flags to Response with NXDOMAIN
            respPacket[respDnsOffset + 2] = (byte) (0x80 | (packet[dnsOffset + 2] & 0x01)); // QR=1, preserve RD
            respPacket[respDnsOffset + 3] = (byte) 0x83; // RA=1, RCODE=3 (NXDOMAIN)

            // QDCOUNT = 1
            respPacket[respDnsOffset + 4] = 0x00;
            respPacket[respDnsOffset + 5] = 0x01;

            // ANCOUNT = 0
            respPacket[respDnsOffset + 6] = 0x00;
            respPacket[respDnsOffset + 7] = 0x00;

            // NSCOUNT = 0
            respPacket[respDnsOffset + 8] = 0x00;
            respPacket[respDnsOffset + 9] = 0x00;

            // ARCOUNT = 0
            respPacket[respDnsOffset + 10] = 0x00;
            respPacket[respDnsOffset + 11] = 0x00;

            if (out != null) {
                synchronized (out) {
                    out.write(respPacket, 0, ipLen);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error sending sinkhole DNS response", e);
        }
    }

    private void forwardDnsQueryUpstream(byte[] packet, int length, int ihl, int dnsOffset, FileOutputStream out, String queryDomain) {
        DatagramSocket socket = null;
        try {
            socket = new DatagramSocket();
            protect(socket);
            socket.setSoTimeout(1200);

            int dnsLength = length - dnsOffset;
            byte[] dnsQuery = new byte[dnsLength];
            System.arraycopy(packet, dnsOffset, dnsQuery, 0, dnsLength);

            InetAddress upstreamAddress = InetAddress.getByName(UPSTREAM_DNS_SERVERS[0]);
            DatagramPacket outPacket = new DatagramPacket(dnsQuery, dnsLength, upstreamAddress, 53);
            socket.send(outPacket);

            byte[] respBuf = new byte[1500];
            DatagramPacket inPacket = new DatagramPacket(respBuf, respBuf.length);
            try {
                socket.receive(inPacket);
            } catch (java.net.SocketTimeoutException ste) {
                // Secondary fallback: AdGuard Family Secondary (94.140.15.16)
                InetAddress fallbackAddress = InetAddress.getByName(UPSTREAM_DNS_SERVERS[1]);
                outPacket.setAddress(fallbackAddress);
                socket.send(outPacket);
                socket.receive(inPacket);
            }

            int respDnsLen = inPacket.getLength();
            byte[] respPacket = new byte[ihl + 8 + respDnsLen];
            System.arraycopy(packet, 0, respPacket, 0, ihl);

            // Swap IP addresses
            System.arraycopy(packet, 12, respPacket, 16, 4);
            System.arraycopy(packet, 16, respPacket, 12, 4);

            // Swap UDP ports
            respPacket[ihl] = packet[ihl + 2];
            respPacket[ihl + 1] = packet[ihl + 3];
            respPacket[ihl + 2] = packet[ihl];
            respPacket[ihl + 3] = packet[ihl + 1];

            int udpLen = 8 + respDnsLen;
            respPacket[ihl + 4] = (byte) ((udpLen >> 8) & 0xFF);
            respPacket[ihl + 5] = (byte) (udpLen & 0xFF);

            // Zero out UDP checksum
            respPacket[ihl + 6] = 0;
            respPacket[ihl + 7] = 0;

            int ipLen = ihl + udpLen;
            respPacket[2] = (byte) ((ipLen >> 8) & 0xFF);
            respPacket[3] = (byte) (ipLen & 0xFF);

            // Recompute valid IPv4 Header Checksum
            computeIpHeaderChecksum(respPacket, ihl);

            System.arraycopy(inPacket.getData(), 0, respPacket, ihl + 8, respDnsLen);

            // সফল ডিএনএস উত্তর লোকাল ক্যাশে সংরক্ষণ করা (২ মিনিটের জন্য)
            if (queryDomain != null && respDnsLen > 12) {
                byte[] copy = Arrays.copyOf(inPacket.getData(), respDnsLen);
                if (DNS_CACHE.size() > 600) {
                    DNS_CACHE.clear();
                }
                DNS_CACHE.put(queryDomain, new DnsCacheEntry(copy, System.currentTimeMillis() + (120 * 1000L)));
            }

            if (out != null) {
                synchronized (out) {
                    out.write(respPacket, 0, ipLen);
                }
            }
        } catch (Exception ignored) {
        } finally {
            if (socket != null) {
                try {
                    socket.close();
                } catch (Exception ignored) {}
            }
        }
    }

    /**
     * লোকাল ক্যাশ থেকে শূন্য ল্যাটেন্সিতে এবং কোনো নেটওয়ার্ক মডেম অ্যাক্টিভিটি ছাড়াই উত্তর পাঠানো
     */
    private void sendCachedDnsResponse(byte[] packet, int length, int ihl, int dnsOffset, byte[] cachedDns, FileOutputStream out) {
        try {
            int respDnsLen = cachedDns.length;
            byte[] respPacket = new byte[ihl + 8 + respDnsLen];
            System.arraycopy(packet, 0, respPacket, 0, ihl);

            // Swap IP addresses
            System.arraycopy(packet, 12, respPacket, 16, 4);
            System.arraycopy(packet, 16, respPacket, 12, 4);

            // Swap UDP ports
            respPacket[ihl] = packet[ihl + 2];
            respPacket[ihl + 1] = packet[ihl + 3];
            respPacket[ihl + 2] = packet[ihl];
            respPacket[ihl + 3] = packet[ihl + 1];

            int udpLen = 8 + respDnsLen;
            respPacket[ihl + 4] = (byte) ((udpLen >> 8) & 0xFF);
            respPacket[ihl + 5] = (byte) (udpLen & 0xFF);

            // Zero out UDP checksum
            respPacket[ihl + 6] = 0;
            respPacket[ihl + 7] = 0;

            int ipLen = ihl + udpLen;
            respPacket[2] = (byte) ((ipLen >> 8) & 0xFF);
            respPacket[3] = (byte) (ipLen & 0xFF);

            computeIpHeaderChecksum(respPacket, ihl);

            // Copy cached DNS response body
            System.arraycopy(cachedDns, 0, respPacket, ihl + 8, respDnsLen);

            // Overwrite transaction ID to match this query
            respPacket[ihl + 8] = packet[dnsOffset];
            respPacket[ihl + 9] = packet[dnsOffset + 1];

            if (out != null) {
                synchronized (out) {
                    out.write(respPacket, 0, ipLen);
                }
            }
        } catch (Exception ignored) {}
    }

    private static void computeIpHeaderChecksum(byte[] packet, int ihl) {
        packet[10] = 0;
        packet[11] = 0;
        int sum = 0;
        for (int i = 0; i < ihl; i += 2) {
            int word = ((packet[i] & 0xFF) << 8) | (packet[i + 1] & 0xFF);
            sum += word;
        }
        while ((sum >> 16) != 0) {
            sum = (sum & 0xFFFF) + (sum >> 16);
        }
        int checksum = ~sum & 0xFFFF;
        packet[10] = (byte) ((checksum >> 8) & 0xFF);
        packet[11] = (byte) (checksum & 0xFF);
    }

    /**
     * DoT (Port 853) রিকোয়েস্টের জন্য তৎক্ষণাৎ RFC 793 TCP RST রেসপন্স তৈরি ও পাঠানো।
     * এর ফলে Android OS বিলম্ব ছাড়াই সাথে সাথে বুঝতে পারে DoT ডাউন, এবং লোকাল Port 53 UDP DNS-এ ট্রাফিকের গতি ঘুরিয়ে দেয়।
     */
    private void sendTcpReset(byte[] packet, int length, int ihl, FileOutputStream out) {
        try {
            int tcpOffset = ihl;
            if (length < tcpOffset + 20) return;

            int totalLen = ihl + 20;
            byte[] rstPacket = new byte[totalLen];

            // 1. IP Header কপি ও ফিল্ড এডজাস্ট
            System.arraycopy(packet, 0, rstPacket, 0, ihl);
            rstPacket[2] = (byte) ((totalLen >> 8) & 0xFF);
            rstPacket[3] = (byte) (totalLen & 0xFF);

            // Swap IP addresses
            System.arraycopy(packet, 12, rstPacket, 16, 4);
            System.arraycopy(packet, 16, rstPacket, 12, 4);

            computeIpHeaderChecksum(rstPacket, ihl);

            // 2. TCP Header
            // Swap Ports: Source Port = packet destPort, Dest Port = packet srcPort
            rstPacket[tcpOffset] = packet[tcpOffset + 2];
            rstPacket[tcpOffset + 1] = packet[tcpOffset + 3];
            rstPacket[tcpOffset + 2] = packet[tcpOffset];
            rstPacket[tcpOffset + 3] = packet[tcpOffset + 1];

            long origSeq = (((long) (packet[tcpOffset + 4] & 0xFF)) << 24) |
                           (((long) (packet[tcpOffset + 5] & 0xFF)) << 16) |
                           (((long) (packet[tcpOffset + 6] & 0xFF)) << 8) |
                           ((long) (packet[tcpOffset + 7] & 0xFF));

            int flags = packet[tcpOffset + 13] & 0xFF;
            boolean isSyn = (flags & 0x02) != 0;
            boolean isAck = (flags & 0x10) != 0;

            long rstSeq = 0;
            long rstAck = 0;
            byte rstFlags = 0x04; // RST

            if (isAck) {
                rstSeq = (((long) (packet[tcpOffset + 8] & 0xFF)) << 24) |
                         (((long) (packet[tcpOffset + 9] & 0xFF)) << 16) |
                         (((long) (packet[tcpOffset + 10] & 0xFF)) << 8) |
                         ((long) (packet[tcpOffset + 11] & 0xFF));
                rstFlags = 0x04;
            } else {
                rstSeq = 0;
                rstAck = (origSeq + (isSyn ? 1 : 0)) & 0xFFFFFFFFL;
                rstFlags = 0x14; // RST | ACK
            }

            // Sequence Number
            rstPacket[tcpOffset + 4] = (byte) ((rstSeq >> 24) & 0xFF);
            rstPacket[tcpOffset + 5] = (byte) ((rstSeq >> 16) & 0xFF);
            rstPacket[tcpOffset + 6] = (byte) ((rstSeq >> 8) & 0xFF);
            rstPacket[tcpOffset + 7] = (byte) (rstSeq & 0xFF);

            // Acknowledgment Number
            rstPacket[tcpOffset + 8] = (byte) ((rstAck >> 24) & 0xFF);
            rstPacket[tcpOffset + 9] = (byte) ((rstAck >> 16) & 0xFF);
            rstPacket[tcpOffset + 10] = (byte) ((rstAck >> 8) & 0xFF);
            rstPacket[tcpOffset + 11] = (byte) (rstAck & 0xFF);

            // Data offset: 5 (20 bytes)
            rstPacket[tcpOffset + 12] = 0x50;
            rstPacket[tcpOffset + 13] = rstFlags;

            // Window, Checksum placeholder, Urgent pointer
            rstPacket[tcpOffset + 14] = 0;
            rstPacket[tcpOffset + 15] = 0;
            rstPacket[tcpOffset + 16] = 0;
            rstPacket[tcpOffset + 17] = 0;
            rstPacket[tcpOffset + 18] = 0;
            rstPacket[tcpOffset + 19] = 0;

            computeTcpChecksum(rstPacket, ihl, 20);

            if (out != null) {
                synchronized (out) {
                    out.write(rstPacket, 0, totalLen);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error sending TCP RST", e);
        }
    }

    private static void computeTcpChecksum(byte[] packet, int ihl, int tcpLen) {
        long sum = 0;
        for (int i = 12; i < 16; i += 2) {
            sum += ((packet[i] & 0xFF) << 8) | (packet[i + 1] & 0xFF);
        }
        for (int i = 16; i < 20; i += 2) {
            sum += ((packet[i] & 0xFF) << 8) | (packet[i + 1] & 0xFF);
        }
        sum += 6; // Protocol TCP
        sum += tcpLen;

        int tcpOffset = ihl;
        for (int i = 0; i < tcpLen; i += 2) {
            if (i + 1 < tcpLen) {
                sum += ((packet[tcpOffset + i] & 0xFF) << 8) | (packet[tcpOffset + i + 1] & 0xFF);
            } else {
                sum += (packet[tcpOffset + i] & 0xFF) << 8;
            }
        }

        while ((sum >> 16) > 0) {
            sum = (sum & 0xFFFF) + (sum >> 16);
        }

        int checksum = (int) (~sum & 0xFFFF);
        packet[tcpOffset + 16] = (byte) ((checksum >> 8) & 0xFF);
        packet[tcpOffset + 17] = (byte) (checksum & 0xFF);
    }

    /**
     * IPv6 DNS Sinkhole NXDOMAIN রেসপন্স
     */
    private void sendSinkholeDnsResponseV6(byte[] packet, int length, int ipHdrLen, int dnsOffset, FileOutputStream out) {
        try {
            int dnsQueryLen = length - dnsOffset;
            if (dnsQueryLen < 12) return;

            int qPos = dnsOffset + 12;
            while (qPos < length) {
                int labelLen = packet[qPos] & 0xFF;
                if (labelLen == 0) {
                    qPos++;
                    break;
                }
                if ((labelLen & 0xC0) == 0xC0) {
                    qPos += 2;
                    break;
                }
                qPos += 1 + labelLen;
            }
            int qLen = (qPos + 4) - dnsOffset;
            if (qLen <= 12 || dnsOffset + qLen > length) {
                qLen = length - dnsOffset;
            }

            int respDnsLen = qLen;
            int udpLen = 8 + respDnsLen;
            int totalLen = ipHdrLen + udpLen;
            byte[] respPacket = new byte[totalLen];

            // 1. IPv6 Header কপি
            System.arraycopy(packet, 0, respPacket, 0, ipHdrLen);
            respPacket[4] = (byte) ((udpLen >> 8) & 0xFF);
            respPacket[5] = (byte) (udpLen & 0xFF);

            // Swap IPv6 addresses
            System.arraycopy(packet, 8, respPacket, 24, 16);
            System.arraycopy(packet, 24, respPacket, 8, 16);

            // 2. UDP Header: Swap Ports
            int udpOffset = ipHdrLen;
            respPacket[udpOffset] = packet[udpOffset + 2];
            respPacket[udpOffset + 1] = packet[udpOffset + 3];
            respPacket[udpOffset + 2] = packet[udpOffset];
            respPacket[udpOffset + 3] = packet[udpOffset + 1];

            respPacket[udpOffset + 4] = (byte) ((udpLen >> 8) & 0xFF);
            respPacket[udpOffset + 5] = (byte) (udpLen & 0xFF);
            respPacket[udpOffset + 6] = 0;
            respPacket[udpOffset + 7] = 0;

            // 3. DNS Header + Question (NXDOMAIN)
            int respDnsOffset = ipHdrLen + 8;
            System.arraycopy(packet, dnsOffset, respPacket, respDnsOffset, respDnsLen);

            respPacket[respDnsOffset + 2] = (byte) (0x80 | (packet[dnsOffset + 2] & 0x01));
            respPacket[respDnsOffset + 3] = (byte) 0x83; // NXDOMAIN
            respPacket[respDnsOffset + 4] = 0x00;
            respPacket[respDnsOffset + 5] = 0x01;
            respPacket[respDnsOffset + 6] = 0x00;
            respPacket[respDnsOffset + 7] = 0x00;
            respPacket[respDnsOffset + 8] = 0x00;
            respPacket[respDnsOffset + 9] = 0x00;
            respPacket[respDnsOffset + 10] = 0x00;
            respPacket[respDnsOffset + 11] = 0x00;

            computeUdpV6Checksum(respPacket, udpOffset, udpLen);

            if (out != null) {
                synchronized (out) {
                    out.write(respPacket, 0, totalLen);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error sending IPv6 sinkhole DNS response", e);
        }
    }

    private void forwardDnsQueryUpstreamV6(byte[] packet, int length, int ipHdrLen, int dnsOffset, FileOutputStream out, String queryDomain) {
        DatagramSocket socket = null;
        try {
            socket = new DatagramSocket();
            protect(socket);
            socket.setSoTimeout(1200);

            int dnsLength = length - dnsOffset;
            byte[] dnsQuery = new byte[dnsLength];
            System.arraycopy(packet, dnsOffset, dnsQuery, 0, dnsLength);

            InetAddress upstreamAddress = InetAddress.getByName(UPSTREAM_DNS_SERVERS[0]);
            DatagramPacket outPacket = new DatagramPacket(dnsQuery, dnsLength, upstreamAddress, 53);
            socket.send(outPacket);

            byte[] respBuf = new byte[1500];
            DatagramPacket inPacket = new DatagramPacket(respBuf, respBuf.length);
            try {
                socket.receive(inPacket);
            } catch (java.net.SocketTimeoutException ste) {
                // Secondary fallback: AdGuard Family Secondary (94.140.15.16)
                InetAddress fallbackAddress = InetAddress.getByName(UPSTREAM_DNS_SERVERS[1]);
                outPacket.setAddress(fallbackAddress);
                socket.send(outPacket);
                socket.receive(inPacket);
            }

            int respDnsLen = inPacket.getLength();
            int udpLen = 8 + respDnsLen;
            int totalLen = ipHdrLen + udpLen;
            byte[] respPacket = new byte[totalLen];

            System.arraycopy(packet, 0, respPacket, 0, ipHdrLen);
            respPacket[4] = (byte) ((udpLen >> 8) & 0xFF);
            respPacket[5] = (byte) (udpLen & 0xFF);

            System.arraycopy(packet, 8, respPacket, 24, 16);
            System.arraycopy(packet, 24, respPacket, 8, 16);

            int udpOffset = ipHdrLen;
            respPacket[udpOffset] = packet[udpOffset + 2];
            respPacket[udpOffset + 1] = packet[udpOffset + 3];
            respPacket[udpOffset + 2] = packet[udpOffset];
            respPacket[udpOffset + 3] = packet[udpOffset + 1];

            respPacket[udpOffset + 4] = (byte) ((udpLen >> 8) & 0xFF);
            respPacket[udpOffset + 5] = (byte) (udpLen & 0xFF);
            respPacket[udpOffset + 6] = 0;
            respPacket[udpOffset + 7] = 0;

            System.arraycopy(inPacket.getData(), 0, respPacket, ipHdrLen + 8, respDnsLen);

            computeUdpV6Checksum(respPacket, udpOffset, udpLen);

            if (out != null) {
                synchronized (out) {
                    out.write(respPacket, 0, totalLen);
                }
            }
        } catch (Exception ignored) {
        } finally {
            if (socket != null) {
                try {
                    socket.close();
                } catch (Exception ignored) {}
            }
        }
    }

    private static void computeUdpV6Checksum(byte[] packet, int udpOffset, int udpLen) {
        long sum = 0;
        for (int i = 8; i < 24; i += 2) {
            sum += ((packet[i] & 0xFF) << 8) | (packet[i + 1] & 0xFF);
        }
        for (int i = 24; i < 40; i += 2) {
            sum += ((packet[i] & 0xFF) << 8) | (packet[i + 1] & 0xFF);
        }
        sum += udpLen;
        sum += 17; // UDP protocol

        for (int i = 0; i < udpLen; i += 2) {
            if (i + 1 < udpLen) {
                sum += ((packet[udpOffset + i] & 0xFF) << 8) | (packet[udpOffset + i + 1] & 0xFF);
            } else {
                sum += (packet[udpOffset + i] & 0xFF) << 8;
            }
        }
        while ((sum >> 16) > 0) {
            sum = (sum & 0xFFFF) + (sum >> 16);
        }
        int checksum = (int) (~sum & 0xFFFF);
        if (checksum == 0) checksum = 0xFFFF;
        packet[udpOffset + 6] = (byte) ((checksum >> 8) & 0xFF);
        packet[udpOffset + 7] = (byte) (checksum & 0xFF);
    }

    private String parseDnsQueryDomain(byte[] packet, int dnsOffset, int length) {
        try {
            int pos = dnsOffset + 12;
            StringBuilder domain = new StringBuilder();

            while (pos < length) {
                int labelLen = packet[pos] & 0xFF;
                if (labelLen == 0) break;
                if ((labelLen & 0xC0) == 0xC0) break;

                if (pos + 1 + labelLen > length) return null;

                if (domain.length() > 0) domain.append(".");
                domain.append(new String(packet, pos + 1, labelLen, "UTF-8"));
                pos += 1 + labelLen;
            }

            return domain.toString();
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    public void onRevoke() {
        closeVpnInterface();
        if (instance == this) instance = null;
        super.onRevoke();
    }

    @Override
    public void onDestroy() {
        unregisterNetworkCallback();
        if (unlockReceiver != null) {
            try {
                unregisterReceiver(unlockReceiver);
            } catch (Exception ignored) {}
            unlockReceiver = null;
        }
        if (dnsThreadPool != null) {
            try {
                dnsThreadPool.shutdownNow();
            } catch (Exception ignored) {}
            dnsThreadPool = null;
        }
        closeVpnInterface();
        if (instance == this) instance = null;
        super.onDestroy();
    }
}
