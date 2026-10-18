package com.helpniche.app;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.util.Log;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.widget.Toast;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkRequest;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class BlockerAccessibilityService extends AccessibilityService {

    private static final String TAG = "BlockerAccessibility";
    private static final String PREFS_NAME = "HelpnichePrefs";
    private static final String KEY_UNLOCK_UNTIL = "unlock_until_timestamp";
    private static final String KEY_FOCUS_LOCKED = "is_focus_locked";
    private static final String KEY_IS_PERMANENT_UNLOCK = "is_permanent_unlock";
    private static final String PREF_BLOCK_PREFIX = "block_expiry_";
    private static final String PREF_BLOCK_ELAPSED_PREFIX = "block_elapsed_";

    public static final String KEY_REELS_BLOCK_ENABLED = "reels_block_enabled";
    public static final String KEY_REELS_BLOCK_EXPIRY_WALL = "reels_block_expiry_wall";
    public static final String KEY_REELS_BLOCK_EXPIRY_ELAPSED = "reels_block_expiry_elapsed";
    public static final String KEY_REELS_BLOCK_SET_ELAPSED = "reels_block_set_elapsed";
    public static final String KEY_REELS_BLOCK_DURATION_MS = "reels_block_duration_ms";
    public static final long MIN_REELS_BLOCK_DURATION_MS = 30 * 60 * 1000L; // 30 mins

    private ScreenUnlockReceiver unlockReceiver = null;
    private android.app.KeyguardManager keyguardManager = null;
    private boolean wasKeyguardLocked = true;

    private static volatile boolean currentlyInBrowser = false;

    public static boolean isCurrentlyInBrowser() {
        return currentlyInBrowser;
    }

    // ভিপিএন আপ-ডাউন এবং ফ্লিকারিং বন্ধ করার হ্যান্ডলার ও টাইমার
    private final Handler vpnHandler = new Handler(Looper.getMainLooper());
    private Runnable stopVpnRunnable = null;

    // পরিচিত সকল জনপ্রিয় ব্রাউজার প্যাকেজের তালিকা
    private static final String[] BROWSER_PACKAGES = {
            "com.android.chrome",
            "org.mozilla.firefox",
            "org.mozilla.focus",
            "org.mozilla.fenix",
            "com.sec.android.app.sbrowser",
            "com.sec.android.app.sbrowser.beta",
            "com.opera.browser",
            "com.opera.mini.native",
            "com.opera.gx",
            "com.microsoft.emmx",
            "com.brave.browser",
            "com.duckduckgo.mobile.android",
            "com.UCMobile.intl",
            "com.uc.browser.en",
            "com.mi.globalbrowser",
            "com.vivo.browser",
            "com.kiwibrowser.browser",
            "com.vivaldi.browser"
    };

    private static final String[] FOCUS_APP_IDENTIFIERS = {
            "helpniche", "com.helpniche.app", "focusdurood", "focus durood",
            "focus_durood", "focus.durood", "com.focus.durood", "focushield", "focus shield"
    };

    private static final String[] UNINSTALL_DEACTIVATE_TERMS = {
            "deactivate and uninstall", "deactivate this device admin",
            "deactivate app", "ডিভাইস অ্যাডমিন নিষ্ক্রিয়", "অ্যাডমিন নিষ্ক্রিয়",
            "do you want to uninstall", "uninstall this app", "আনইনস্টল করতে চান"
    };

    private static final String[] STORAGE_CLEAR_TERMS = {
            "delete app data", "all this app's data will be deleted", "clear all data",
            "ডেটা মুছে ফেলুন", "সব অ্যাপ ডেটা মুছে ফেলা হবে"
    };

    private static final String[] VPN_DISCONNECT_TERMS = {
            "disconnect", "forget vpn", "remove vpn", "delete vpn", "turn off vpn",
            "disable vpn", "ডিসকানেক্ট", "মুছে ফেলুন", "রিমুভ"
    };

    public static boolean isDeviceAdminActive(Context context) {
        if (context == null) return false;
        try {
            android.app.admin.DevicePolicyManager dpm = (android.app.admin.DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
            android.content.ComponentName admin = new android.content.ComponentName(context, AdminReceiver.class);
            return dpm != null && dpm.isAdminActive(admin);
        } catch (Exception e) {
            return false;
        }
    }

    public static boolean isPermanentUnlocked(Context context) {
        if (context == null) return false;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getBoolean(KEY_IS_PERMANENT_UNLOCK, false);
    }

    public static boolean isUnlocked(Context context) {
        if (context == null) return false;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        if (prefs.getBoolean(KEY_IS_PERMANENT_UNLOCK, false)) return true;
        long unlockUntil = prefs.getLong(KEY_UNLOCK_UNTIL, 0);
        return System.currentTimeMillis() < unlockUntil;
    }

    public static boolean isFocusLocked(Context context) {
        if (context == null) return false;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getBoolean(KEY_FOCUS_LOCKED, false);
    }

    public static long getRemainingUnlockTimeMs(Context context) {
        if (context == null) return 0;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        if (prefs.getBoolean(KEY_IS_PERMANENT_UNLOCK, false)) return 999999999L;
        long unlockUntil = prefs.getLong(KEY_UNLOCK_UNTIL, 0);
        long diff = unlockUntil - System.currentTimeMillis();
        return Math.max(0, diff);
    }

    // আবার আনলক বাতিল করে নতুন করে সুরক্ষা সক্রিয় করার মেথড
    public static void reEnableProtection(Context context) {
        if (context == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putBoolean(KEY_IS_PERMANENT_UNLOCK, false)
                .putLong(KEY_UNLOCK_UNTIL, 0)
                .apply();
        Log.i(TAG, "Protection re-enabled completely.");
    }

    public static void setUnlockDuration(Context context, int minutes) {
        if (context == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        if (minutes >= 999999) {
            editor.putBoolean(KEY_IS_PERMANENT_UNLOCK, true);
            editor.putLong(KEY_UNLOCK_UNTIL, System.currentTimeMillis() + (36500L * 24 * 60 * 60 * 1000L));
        } else if (minutes > 0) {
            editor.putBoolean(KEY_IS_PERMANENT_UNLOCK, false);
            editor.putLong(KEY_UNLOCK_UNTIL, System.currentTimeMillis() + (minutes * 60 * 1000L));
        } else {
            editor.putBoolean(KEY_IS_PERMANENT_UNLOCK, false);
            editor.putLong(KEY_UNLOCK_UNTIL, 0);
        }
        editor.apply();

        if (minutes > 0) {
            try {
                LocalDnsVpnService.stopVpn(context);
            } catch (Exception ignored) {}
        }
    }

    public static final long MAX_BLOCK_DURATION_MS = 7 * 24 * 60 * 60 * 1000L;
    private static final String PREF_SET_ELAPSED_PREFIX = "block_set_elapsed_";
    private static final String PREF_MAX_DURATION_PREFIX = "block_max_duration_";

    public static void setAppBlock(Context context, String packageName, long durationMs) {
        if (context == null || packageName == null) return;

        long clampedDurationMs = Math.min(Math.max(durationMs, 60 * 1000L), MAX_BLOCK_DURATION_MS);
        long nowWall = System.currentTimeMillis();
        long nowElapsed = SystemClock.elapsedRealtime();

        long expiryWallClock = nowWall + clampedDurationMs;
        long expiryElapsed = nowElapsed + clampedDurationMs;

        String pkgKey = packageName.toLowerCase();

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putLong(PREF_BLOCK_PREFIX + pkgKey, expiryWallClock)
                .putLong(PREF_BLOCK_ELAPSED_PREFIX + pkgKey, expiryElapsed)
                .putLong(PREF_SET_ELAPSED_PREFIX + pkgKey, nowElapsed)
                .putLong(PREF_MAX_DURATION_PREFIX + pkgKey, clampedDurationMs)
                .apply();
    }

    public static void clearAppBlock(Context context, String packageName) {
        if (context == null || packageName == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String pkgKey = packageName.toLowerCase();
        prefs.edit()
                .remove(PREF_BLOCK_PREFIX + pkgKey)
                .remove(PREF_BLOCK_ELAPSED_PREFIX + pkgKey)
                .remove(PREF_SET_ELAPSED_PREFIX + pkgKey)
                .remove(PREF_MAX_DURATION_PREFIX + pkgKey)
                .apply();
    }

    public static boolean isAppBlocked(Context context, String packageName) {
        return getAppBlockRemainingMs(context, packageName) > 0;
    }

    public static long getAppBlockRemainingMs(Context context, String packageName) {
        if (context == null || packageName == null) return 0;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        String pkgKey = packageName.toLowerCase();
        long expiryWallClock = prefs.getLong(PREF_BLOCK_PREFIX + pkgKey, 0);
        long expiryElapsed = prefs.getLong(PREF_BLOCK_ELAPSED_PREFIX + pkgKey, 0);
        long setElapsed = prefs.getLong(PREF_SET_ELAPSED_PREFIX + pkgKey, 0);
        long maxDuration = prefs.getLong(PREF_MAX_DURATION_PREFIX + pkgKey, MAX_BLOCK_DURATION_MS);

        if (expiryWallClock == 0) return 0;

        long nowWall = System.currentTimeMillis();
        long nowElapsed = SystemClock.elapsedRealtime();

        long diffWall = expiryWallClock - nowWall;
        long diffElapsed = 0;

        if (nowElapsed >= setElapsed && expiryElapsed > nowElapsed) {
            diffElapsed = expiryElapsed - nowElapsed;
        }

        long remaining = Math.max(diffWall, diffElapsed);

        if (remaining <= 0) {
            clearAppBlock(context, packageName);
            return 0;
        }

        return Math.min(remaining, maxDuration);
    }

    public static final long REELS_MANDATORY_LOCK_MS = 30 * 60 * 1000L; // 30 minutes

    public static void enableReelsBlock(Context context) {
        if (context == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        long nowWall = System.currentTimeMillis();
        long nowElapsed = SystemClock.elapsedRealtime();
        long expiryWall = nowWall + REELS_MANDATORY_LOCK_MS;
        long expiryElapsed = nowElapsed + REELS_MANDATORY_LOCK_MS;

        prefs.edit()
                .putBoolean(KEY_REELS_BLOCK_ENABLED, true)
                .putLong(KEY_REELS_BLOCK_EXPIRY_WALL, expiryWall)
                .putLong(KEY_REELS_BLOCK_EXPIRY_ELAPSED, expiryElapsed)
                .putLong(KEY_REELS_BLOCK_SET_ELAPSED, nowElapsed)
                .apply();
        Log.i(TAG, "Reels block enabled with mandatory 30-min lock");
    }

    public static boolean isReelsBlockActive(Context context) {
        if (context == null) return false;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getBoolean(KEY_REELS_BLOCK_ENABLED, false);
    }

    public static long getReelsBlockRemainingLockMs(Context context) {
        if (context == null) return 0;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        if (!prefs.getBoolean(KEY_REELS_BLOCK_ENABLED, false)) return 0;

        long expiryWall = prefs.getLong(KEY_REELS_BLOCK_EXPIRY_WALL, 0);
        long expiryElapsed = prefs.getLong(KEY_REELS_BLOCK_EXPIRY_ELAPSED, 0);
        long setElapsed = prefs.getLong(KEY_REELS_BLOCK_SET_ELAPSED, 0);

        if (expiryWall == 0) return 0;

        long nowWall = System.currentTimeMillis();
        long nowElapsed = SystemClock.elapsedRealtime();

        long diffWall = expiryWall - nowWall;
        long diffElapsed = 0;
        if (nowElapsed >= setElapsed && expiryElapsed > nowElapsed) {
            diffElapsed = expiryElapsed - nowElapsed;
        }

        long remaining = Math.max(diffWall, diffElapsed);
        return Math.max(0, remaining);
    }

    public static boolean disableReelsBlock(Context context) {
        if (context == null) return false;
        long remainingLock = getReelsBlockRemainingLockMs(context);
        if (remainingLock > 0) {
            return false;
        }

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
                .putBoolean(KEY_REELS_BLOCK_ENABLED, false)
                .remove(KEY_REELS_BLOCK_EXPIRY_WALL)
                .remove(KEY_REELS_BLOCK_EXPIRY_ELAPSED)
                .remove(KEY_REELS_BLOCK_SET_ELAPSED)
                .apply();
        Log.i(TAG, "Reels block disabled");
        return true;
    }

    public static String getAppNameFromPackage(Context context, String packageName) {
        if (context == null || packageName == null) return "অ্যাপ";
        try {
            PackageManager pm = context.getPackageManager();
            ApplicationInfo appInfo = pm.getApplicationInfo(packageName, 0);
            CharSequence label = pm.getApplicationLabel(appInfo);
            if (label != null && !label.toString().trim().isEmpty()) {
                return label.toString().trim();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error fetching label for package: " + packageName, e);
        }
        String pkgLower = packageName.toLowerCase();
        if (pkgLower.contains("youtube")) return "YouTube";
        if (pkgLower.contains("facebook") || pkgLower.contains("katana")) return "Facebook";
        if (pkgLower.contains("instagram")) return "Instagram";
        if (pkgLower.contains("tiktok") || pkgLower.contains("musically")) return "TikTok";
        if (pkgLower.contains("whatsapp")) return "WhatsApp";
        if (pkgLower.contains("messenger")) return "Messenger";
        if (pkgLower.contains("twitter")) return "Twitter/X";
        if (pkgLower.contains("chrome")) return "Chrome";
        return "অ্যাপ";
    }

    public static String formatRemainingTimeBangla(long totalSeconds) {
        if (totalSeconds <= 0) return "০ সেকেন্ড";
        long minutes = totalSeconds / 60;
        long seconds = totalSeconds % 60;

        StringBuilder sb = new StringBuilder();
        if (minutes > 0) {
            sb.append(toBanglaDigits(minutes)).append(" মিনিট ");
        }
        if (seconds > 0 || minutes == 0) {
            sb.append(toBanglaDigits(seconds)).append(" সেকেন্ড");
        }
        return sb.toString().trim();
    }

    private static String toBanglaDigits(long number) {
        String str = String.valueOf(number);
        char[] banglaDigits = {'০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'};
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < str.length(); i++) {
            char c = str.charAt(i);
            if (c >= '0' && c <= '9') {
                result.append(banglaDigits[c - '0']);
            } else {
                result.append(c);
            }
        }
        return result.toString();
    }

    private boolean isBrowserOrTargetApp(String packageName) {
        if (packageName == null || packageName.isEmpty()) return false;
        for (String browser : BROWSER_PACKAGES) {
            if (packageName.equalsIgnoreCase(browser)) {
                return true;
            }
        }
        return packageName.contains("browser") ||
                (packageName.contains("chrome") && !packageName.contains("chromecast")) ||
                packageName.contains("firefox") ||
                packageName.contains("opera");
    }

    public static boolean isThirdPartyVpnActive(Context context) {
        if (context == null) return false;

        // ১. যদি আমাদের নিজস্ব VPN এখন সক্রিয় বা শুরু হচ্ছে, তবে অন্য কোনো VPN সক্রিয় নেই
        if (LocalDnsVpnService.isVpnStartingOrRunning()) {
            return false;
        }

        try {
            android.net.ConnectivityManager cm = (android.net.ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    android.net.Network activeNetwork = cm.getActiveNetwork();
                    if (activeNetwork != null) {
                        android.net.NetworkCapabilities caps = cm.getNetworkCapabilities(activeNetwork);
                        if (caps != null && caps.hasTransport(android.net.NetworkCapabilities.TRANSPORT_VPN)) {
                            return true;
                        }
                    }
                } else {
                    android.net.NetworkInfo activeInfo = cm.getActiveNetworkInfo();
                    if (activeInfo != null && activeInfo.getType() == android.net.ConnectivityManager.TYPE_VPN) {
                        return true;
                    }
                }

                android.net.Network[] allNetworks = cm.getAllNetworks();
                if (allNetworks != null) {
                    for (android.net.Network net : allNetworks) {
                        android.net.NetworkCapabilities caps = cm.getNetworkCapabilities(net);
                        if (caps != null && caps.hasTransport(android.net.NetworkCapabilities.TRANSPORT_VPN)) {
                            return true;
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking VPN transport via ConnectivityManager", e);
        }

        try {
            java.util.Enumeration<java.net.NetworkInterface> interfaces = java.net.NetworkInterface.getNetworkInterfaces();
            if (interfaces != null) {
                while (interfaces.hasMoreElements()) {
                    java.net.NetworkInterface iface = interfaces.nextElement();
                    if (iface.isUp()) {
                        String name = iface.getName().toLowerCase();
                        if (name.contains("tun") || name.contains("ppp") || name.contains("tap") || name.contains("wg")) {
                            return true;
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error scanning network interfaces for 3rd-party VPN", e);
        }

        return false;
    }

    private boolean isIgnoredOrKeyboardPackage(String packageName) {
        if (packageName == null) return true;
        return packageName.equals("com.helpniche.app") ||
                packageName.equals("com.focus.durood") ||
                packageName.contains("systemui") ||
                packageName.contains("statusbar") ||
                packageName.contains("quicksettings") ||
                packageName.contains("inputmethod") ||
                packageName.contains("keyboard") ||
                packageName.contains("ime");
    }

    private boolean isHomeLauncher(String packageName) {
        if (packageName == null || packageName.isEmpty()) return false;
        String pkgLower = packageName.toLowerCase();
        if (pkgLower.contains("launcher") || pkgLower.contains("home") || pkgLower.contains("nexuslauncher") || pkgLower.contains("systemui")) {
            return true;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_MAIN);
            intent.addCategory(Intent.CATEGORY_HOME);
            android.content.pm.ResolveInfo resolveInfo = getPackageManager().resolveActivity(intent, PackageManager.MATCH_DEFAULT_ONLY);
            if (resolveInfo != null && resolveInfo.activityInfo != null) {
                if (packageName.equalsIgnoreCase(resolveInfo.activityInfo.packageName)) {
                    return true;
                }
            }
        } catch (Exception ignored) {}
        return false;
    }

    private ConnectivityManager.NetworkCallback accessibilityNetworkCallback = null;

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        registerUnlockReceiver();
        registerNetworkMonitoring();

        try {
            keyguardManager = (android.app.KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (keyguardManager != null) {
                wasKeyguardLocked = keyguardManager.isKeyguardLocked();
            }
        } catch (Exception ignored) {}

        try {
            if (ScreenUnlockReceiver.isScreenInteractiveAndUnlocked(this)) {
                ScreenUnlockReceiver.handleScreenUnlocked(this);
            }
        } catch (Exception ignored) {}
    }

    private void registerNetworkMonitoring() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                accessibilityNetworkCallback = new ConnectivityManager.NetworkCallback() {
                    @Override
                    public void onAvailable(Network network) {
                        if (ScreenUnlockReceiver.isScreenInteractiveAndUnlocked(BlockerAccessibilityService.this)) {
                            ScreenUnlockReceiver.handleScreenUnlocked(BlockerAccessibilityService.this);
                        } else {
                            if (LocalDnsVpnService.isVpnRunning()) {
                                LocalDnsVpnService.stopVpn(BlockerAccessibilityService.this);
                            }
                        }
                    }

                    @Override
                    public void onLost(Network network) {
                        if (!ScreenUnlockReceiver.isNetworkAvailable(BlockerAccessibilityService.this)) {
                            if (LocalDnsVpnService.isVpnRunning()) {
                                Log.i(TAG, "Internet disconnected: Stopping VPN to save battery and data.");
                                LocalDnsVpnService.stopVpn(BlockerAccessibilityService.this);
                            }
                        }
                    }
                };
                NetworkRequest request = new NetworkRequest.Builder()
                        .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                        .build();
                cm.registerNetworkCallback(request, accessibilityNetworkCallback);
                Log.i(TAG, "Network monitoring callback registered in Accessibility Service.");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error registering network monitoring callback", e);
        }
    }

    private void unregisterNetworkMonitoring() {
        if (accessibilityNetworkCallback != null) {
            try {
                ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                if (cm != null) {
                    cm.unregisterNetworkCallback(accessibilityNetworkCallback);
                }
            } catch (Exception ignored) {}
            accessibilityNetworkCallback = null;
        }
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
                Log.i(TAG, "Dynamic ScreenUnlockReceiver registered successfully in Accessibility Service.");
            } catch (Exception e) {
                Log.e(TAG, "Error registering ScreenUnlockReceiver in Accessibility Service", e);
            }
        }
    }

    private void checkKeyguardUnlockTransition() {
        try {
            if (keyguardManager == null) {
                keyguardManager = (android.app.KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            }
            if (keyguardManager != null) {
                boolean isLockedNow = keyguardManager.isKeyguardLocked();
                if (wasKeyguardLocked && !isLockedNow) {
                    wasKeyguardLocked = false;
                    Log.i(TAG, "Keyguard transition: LOCKED -> UNLOCKED detected via Accessibility.");
                    ScreenUnlockReceiver.triggerUnlockReminder(this);
                    ScreenUnlockReceiver.handleScreenUnlocked(this);
                } else if (isLockedNow) {
                    wasKeyguardLocked = true;
                    ScreenUnlockReceiver.handleScreenLocked(this);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking keyguard transition", e);
        }
    }

    private long lastReelsCheckTime = 0;
    private long lastReelsBlockedActionTime = 0;
    private long lastReelsToastTime = 0;
    private int reelsConsecutiveBackCount = 0;

    private boolean isDedicatedShortVideoApp(String packageName) {
        if (packageName == null || packageName.isEmpty()) return false;
        String pkg = packageName.toLowerCase();
        return pkg.contains("tiktok") ||
                pkg.contains("musically") ||
                pkg.contains("trill") ||
                pkg.contains("zhiliao") ||
                pkg.contains("likee") ||
                pkg.contains("video.like") ||
                pkg.contains("kwai") ||
                pkg.contains("snackvideo");
    }

    private boolean checkAndHandleReelsShorts(AccessibilityEvent event, String packageName) {
        if (!isReelsBlockActive(this)) return false;

        // ১. ডেডিকেটেড শর্ট ভিডিও অ্যাপস (TikTok, Likee, Kwai ইত্যাদি) সম্পূর্ণ বন্ধ করা
        if (isDedicatedShortVideoApp(packageName)) {
            performGlobalAction(GLOBAL_ACTION_HOME);
            try {
                Intent homeIntent = new Intent(Intent.ACTION_MAIN);
                homeIntent.addCategory(Intent.CATEGORY_HOME);
                homeIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                startActivity(homeIntent);
            } catch (Exception ignored) {}

            long now = SystemClock.elapsedRealtime();
            if (now - lastReelsToastTime > 2500) {
                lastReelsToastTime = now;
                Toast.makeText(this, "শর্ট ভিডিও ব্লক করা রয়েছে! কাজে মনোযোগ বজায় রাখুন।", Toast.LENGTH_SHORT).show();
            }
            return true;
        }

        // ২. হাইব্রিড অ্যাপস: YouTube, Facebook (Regular & Lite), Instagram
        boolean isYouTube = packageName.contains("youtube");
        boolean isFacebook = packageName.contains("facebook") || packageName.contains("katana") || packageName.contains("lite");
        boolean isInstagram = packageName.contains("instagram");

        if (!isYouTube && !isFacebook && !isInstagram) {
            return false;
        }

        long now = SystemClock.elapsedRealtime();
        if (now - lastReelsBlockedActionTime < 350) {
            return false;
        }

        AccessibilityNodeInfo rootNode = null;
        try {
            rootNode = getRootInActiveWindow();
        } catch (Exception ignored) {}

        if (rootNode == null && event != null) {
            try {
                rootNode = event.getSource();
            } catch (Exception ignored) {}
        }

        if (rootNode == null && event == null) return false;

        try {
            CharSequence classNameSeq = event != null ? event.getClassName() : null;
            String className = classNameSeq != null ? classNameSeq.toString().toLowerCase() : "";

            boolean isReelsDetected = false;

            if (isYouTube && rootNode != null) {
                if (className.contains("reelwatchfragment") || className.contains("shorts")) {
                    isReelsDetected = true;
                } else if (scanNodeTreeForIds(rootNode,
                        "reel_player_page_view",
                        "reel_recycler",
                        "reel_watch_fragment",
                        "reel_player_container",
                        "reel_container",
                        "shorts_pivot_button",
                        "reel_player_playback_button",
                        "reel_player_title_text")) {
                    isReelsDetected = true;
                } else if (isShortsTabSelected(rootNode)) {
                    isReelsDetected = true;
                }
            } else if (isFacebook) {
                isReelsDetected = isFacebookReelsDetected(rootNode, event, packageName);
            } else if (isInstagram && rootNode != null) {
                if (className.contains("clipsvieweractivity") || className.contains("reelsvieweractivity")) {
                    isReelsDetected = true;
                } else if (isShortsTabSelected(rootNode)) {
                    isReelsDetected = true;
                } else if (scanNodeTreeForText(rootNode,
                        "original audio", "use audio", "remix this reel",
                        "reels audio", "clips_viewer")) {
                    isReelsDetected = true;
                } else if (scanNodeTreeForIds(rootNode,
                        "clips_viewer",
                        "reel_viewer",
                        "clips_video_container",
                        "reel_video_view",
                        "clips_media_item")) {
                    isReelsDetected = true;
                }
            }

            if (isReelsDetected) {
                if (now - lastReelsBlockedActionTime < 1800) {
                    reelsConsecutiveBackCount++;
                } else {
                    reelsConsecutiveBackCount = 1;
                }
                lastReelsBlockedActionTime = now;

                if (reelsConsecutiveBackCount >= 2) {
                    performGlobalAction(GLOBAL_ACTION_HOME);
                    try {
                        Intent homeIntent = new Intent(Intent.ACTION_MAIN);
                        homeIntent.addCategory(Intent.CATEGORY_HOME);
                        homeIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                        startActivity(homeIntent);
                    } catch (Exception ignored) {}
                    reelsConsecutiveBackCount = 0;
                } else {
                    performGlobalAction(GLOBAL_ACTION_BACK);
                    new Handler(Looper.getMainLooper()).postDelayed(() -> {
                        try {
                            AccessibilityNodeInfo checkNode = getRootInActiveWindow();
                            if (checkNode != null) {
                                try {
                                    if (isFacebook && isFacebookReelsDetected(checkNode, null, packageName)) {
                                        performGlobalAction(GLOBAL_ACTION_BACK);
                                    }
                                } finally {
                                    checkNode.recycle();
                                }
                            }
                        } catch (Exception ignored) {}
                    }, 140);
                }

                if (now - lastReelsToastTime > 2500) {
                    lastReelsToastTime = now;
                    String targetName = isYouTube ? "ইউটিউব শর্টস" : (isFacebook ? (packageName.contains("lite") ? "ফেসবুক লাইট রিলস" : "ফেসবুক রিলস") : "ইনস্টাগ্রাম রিলস");
                    Toast.makeText(this, targetName + " ব্লক করা রয়েছে!", Toast.LENGTH_SHORT).show();
                }
                return true;
            }
        } finally {
            if (rootNode != null) {
                try {
                    rootNode.recycle();
                } catch (Exception ignored) {}
            }
        }

        return false;
    }

    private boolean isFacebookReelsDetected(AccessibilityNodeInfo rootNode, AccessibilityEvent event, String packageName) {
        String className = "";
        if (event != null && event.getClassName() != null) {
            className = event.getClassName().toString().toLowerCase();
        }

        // ১. ফেসবুক অফিশিয়াল (Katana) রিলস অ্যাক্টিভিটি চেক (ফিডে থাকাকালীন এটি কখনো ট্রিগার হবে না)
        if (className.contains("reelsvieweractivity") ||
                className.contains("fbshortsvieweractivity") ||
                className.contains("reelsmediaviewer") ||
                className.contains("fbshortsplayerviewer")) {
            return true;
        }

        // ২. ফেসবুক অফিশিয়াল রিলস প্লেয়ার কন্টেইনার ভিউ আইডি (ফিডের ট্রের আইডি এখানে রাখা হয়নি)
        if (rootNode != null && scanNodeTreeForIds(rootNode,
                "reels_viewer_container", "fb_shorts_viewer_container", "fb_shorts_bottom_sheet")) {
            return true;
        }

        // ৩. শর্টস/রিলস ট্যাব সিলেক্টেড আছে কিনা চেক
        if (rootNode != null && isShortsTabSelected(rootNode)) {
            return true;
        }

        // ৪. শতভাগ নিশ্চিত রিলস-অনলি অ্যাকশন টার্মস (সাধারণ পোস্ট বা ফিডে এগুলো কখনোই থাকে না)
        if (rootNode != null && scanNodeTreeForText(rootNode,
                "original audio", "মূল অডিও", "অরিজিনাল অডিও",
                "remix this reel", "remix with reel", "রিল রিমিক্স",
                "watch more reels", "আরও রিল দেখুন", "আরও রিলস দেখুন",
                "create a reel", "reels audio", "fb_shorts", "fbshorts")) {
            return true;
        }

        // ৫. ফেসবুক লাইট (FB Lite): শুধুমাত্র ফুলস্ক্রিন রিলস প্লেয়ার ডিটেকশন
        if (isFbLiteReelsPlayer(rootNode)) {
            return true;
        }

        // ৬. ইভেন্ট সোর্স নোড চেক (শুধুমাত্র সুনির্দিষ্ট রিলস টার্মের জন্য)
        if (event != null) {
            AccessibilityNodeInfo sourceNode = null;
            try {
                sourceNode = event.getSource();
            } catch (Exception ignored) {}
            if (sourceNode != null && sourceNode != rootNode) {
                try {
                    if (scanNodeTreeForText(sourceNode,
                            "original audio", "মূল অডিও", "অরিজিনাল অডিও",
                            "remix this reel", "remix with reel", "রিল রিমিক্স",
                            "watch more reels", "আরও রিল দেখুন", "fb_shorts")) {
                        return true;
                    }
                } finally {
                    try { sourceNode.recycle(); } catch (Exception ignored) {}
                }
            }
        }

        return false;
    }

    private boolean isFbLiteReelsPlayer(AccessibilityNodeInfo rootNode) {
        if (rootNode == null) return false;

        // ফেসবুক লাইট রিলস স্ক্রিনের এক্সাক্ট টাইটেল "Reels" বা "রিলস" আছে কিনা
        boolean hasExactTitle = hasNodeWithExactText(rootNode, "reels", "রিলস");
        if (!hasExactTitle) return false;

        // এক্সাক্ট টাইটেল পাওয়ার পর নিশ্চিত হওয়া যে এটি রিলস প্লেয়ার (অডিও বা রিমিক্স বা সাউন্ড এলিমেন্ট উপস্থিত)
        boolean hasAudioOrReelsControl = scanNodeTreeForText(rootNode,
                "original audio", "মূল অডিও", "অরিজিনাল অডিও",
                "remix", "রিমিক্স", "audio", "অডিও", "sound", "শব্দ");

        // সাধারণ ফিডের পোস্ট বক্স থাকলে কখনো ব্লক করা যাবে না
        boolean hasFeedComposer = scanNodeTreeForText(rootNode,
                "what's on your mind", "whats on your mind", "আপনার মনে কী আছে",
                "create a post", "পোস্ট তৈরি করুন", "কিছু লিখুন");

        return hasAudioOrReelsControl && !hasFeedComposer;
    }

    private boolean hasNodeWithExactText(AccessibilityNodeInfo node, String... targets) {
        if (node == null) return false;
        try {
            CharSequence textSeq = node.getText();
            CharSequence descSeq = node.getContentDescription();
            String text = textSeq != null ? textSeq.toString().trim().toLowerCase() : "";
            String desc = descSeq != null ? descSeq.toString().trim().toLowerCase() : "";

            for (String target : targets) {
                String tLower = target.trim().toLowerCase();
                if (text.equals(tLower) || desc.equals(tLower)) {
                    return true;
                }
            }

            int childCount = node.getChildCount();
            for (int i = 0; i < childCount; i++) {
                AccessibilityNodeInfo child = node.getChild(i);
                if (child != null) {
                    try {
                        if (hasNodeWithExactText(child, targets)) {
                            return true;
                        }
                    } finally {
                        child.recycle();
                    }
                }
            }
        } catch (Exception ignored) {}
        return false;
    }

    private boolean isShortsTabSelected(AccessibilityNodeInfo node) {
        if (node == null) return false;
        try {
            CharSequence descSeq = node.getContentDescription();
            CharSequence textSeq = node.getText();
            String desc = descSeq != null ? descSeq.toString().toLowerCase() : "";
            String text = textSeq != null ? textSeq.toString().toLowerCase() : "";
            boolean isMatch = desc.equals("shorts") || text.equals("shorts") ||
                    desc.equals("শর্টস") || text.equals("শর্টস") ||
                    desc.equals("reels") || text.equals("reels") ||
                    desc.equals("রিলস") || text.equals("রিলস") ||
                    desc.contains("reels tab") || text.contains("reels tab");
            if (isMatch && node.isSelected()) {
                return true;
            }
            int childCount = node.getChildCount();
            for (int i = 0; i < childCount; i++) {
                AccessibilityNodeInfo child = node.getChild(i);
                if (child != null) {
                    try {
                        if (isShortsTabSelected(child)) return true;
                    } finally {
                        child.recycle();
                    }
                }
            }
        } catch (Exception ignored) {}
        return false;
    }

    private boolean scanNodeTreeForIds(AccessibilityNodeInfo node, String... targetIds) {
        if (node == null) return false;
        try {
            CharSequence viewIdSeq = node.getViewIdResourceName();
            if (viewIdSeq != null) {
                String viewId = viewIdSeq.toString().toLowerCase();
                for (String target : targetIds) {
                    if (viewId.contains(target.toLowerCase())) {
                        return true;
                    }
                }
            }
            int childCount = node.getChildCount();
            for (int i = 0; i < childCount; i++) {
                AccessibilityNodeInfo child = node.getChild(i);
                if (child != null) {
                    try {
                        if (scanNodeTreeForIds(child, targetIds)) {
                            return true;
                        }
                    } finally {
                        child.recycle();
                    }
                }
            }
        } catch (Exception ignored) {}
        return false;
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event == null) return;
        int evtType = event.getEventType();

        // ১. ব্যাটারি সেভার: শুধুমাত্র উইন্ডো পরিবর্তন (State changed) হলেই লক স্ক্রিন রূপান্তর চেক
        if (evtType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            checkKeyguardUnlockTransition();
        }

        CharSequence pkgNameSeq = event.getPackageName();
        if (pkgNameSeq == null) return;
        String packageName = pkgNameSeq.toString().toLowerCase();

        // ২. ফাস্ট বাইপাস: কীবোর্ড, আইএমই এবং সিস্টেম প্যাকেজ সম্পূর্ণ এড়িয়ে যাওয়া (জিরো সিপিইউ লস)
        if (isIgnoredOrKeyboardPackage(packageName)) return;

        // রিলস ও শর্ট ভিডিও ব্লকার চেক (সক্রিয় থাকলে)
        if (checkAndHandleReelsShorts(event, packageName)) {
            return;
        }

        boolean isSettingsOrManager = packageName.contains("settings") ||
                packageName.contains("securitycenter") ||
                packageName.contains("safecenter") ||
                packageName.contains("packageinstaller") ||
                packageName.contains("permissioncontroller") ||
                packageName.contains("permissionmanager") ||
                packageName.contains("installer") ||
                packageName.contains("vending") ||
                packageName.equals("android");

        // ৩. আল্ট্রা ব্যাটারি ও পারফরম্যান্স সেভার:
        // সাধারণ স্ক্রলিং, চ্যাটিং বা ভিডিও দেখার সময় (TYPE_WINDOW_CONTENT_CHANGED)
        // যদি প্যাকেজটি সেটিংস বা প্যাকেজ ম্যানেজার না হয়, তবে তৎক্ষণাৎ রিটার্ন করা!
        if (evtType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED && !isSettingsOrManager) {
            return;
        }

        // পার্মানেন্ট আনলক মোড সক্রিয় থাকলে অ্যাপ ব্লকার নিষ্ক্রিয় থাকবে, কিন্তু সিস্টেম-ওয়াইড অ্যাড/অ্যাডাল্ট ব্লকার সচল থাকবে
        if (isPermanentUnlocked(this)) {
            SharedPreferences prefs = getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            boolean isSystemWide = prefs.getBoolean("system_wide_adblock_enabled", true);
            if (!isSystemWide && !LocalDnsVpnService.hasActiveNetworkBlocks(this)) {
                LocalDnsVpnService.stopVpn(this);
            } else if (!LocalDnsVpnService.isVpnRunning()) {
                LocalDnsVpnService.startVpn(this);
            }
            return;
        }

        boolean isTempUnlocked = isUnlocked(this);

        // অন-ডিমান্ড ভিপিএন ও ব্রাউজারে স্মার্ট টেকওভার / প্রোটেকশন হ্যান্ডলিং
        if (!isTempUnlocked) {
            if (evtType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED || evtType == AccessibilityEvent.TYPE_WINDOWS_CHANGED) {
                if (!isIgnoredOrKeyboardPackage(packageName)) {
                    if (isBrowserOrTargetApp(packageName)) {
                        currentlyInBrowser = true;
                        if (stopVpnRunnable != null) {
                            vpnHandler.removeCallbacks(stopVpnRunnable);
                            stopVpnRunnable = null;
                        }

                        // ১. থার্ড-পার্টি VPN সক্রিয় থাকা অবস্থায় ব্রাউজারে প্রবেশ করলে
                        if (isThirdPartyVpnActive(this)) {
                            // ক. অটো-টেকওভার চেষ্টা: আমাদের ফ্যামিলি ফিল্টার VPN শুরু করা (Android OS আগের VPN কেটে আমাদেরটি কানেক্ট করবে)
                            LocalDnsVpnService.startVpn(this);

                            // খ. ওয়ার্কঅ্যারাউন্ড / সেফগার্ড: যদি ব্যাকগ্রাউন্ডে টেকওভার বাধা পায় বা অন্য VPN এখনও সক্রিয় থাকে
                            vpnHandler.postDelayed(() -> {
                                if (isThirdPartyVpnActive(BlockerAccessibilityService.this)) {
                                    blockAndGoHome("ব্রাউজার ব্যবহারের জন্য অন্য VPN বন্ধ করে Helpniche সুরক্ষিত মোডে আসুন!");
                                }
                            }, 2500);
                        } else {
                            // কোনো থার্ড-পার্টি VPN চালু না থাকলে বা আমাদের VPN ইতোমধ্যে সক্রিয় থাকলে
                            if (!LocalDnsVpnService.isVpnRunning()) {
                                LocalDnsVpnService.startVpn(this);
                                Log.i(TAG, "ব্রাউজার ডিটেক্ট (" + packageName + ") -> Helpniche VPN সক্রিয় করা হলো!");
                            }
                        }
                    } else {
                        currentlyInBrowser = false;
                        SharedPreferences prefs = getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
                        boolean isSystemWideEnabled = prefs.getBoolean("system_wide_adblock_enabled", true);

                        if (!isSystemWideEnabled) {
                            // সিস্টেম-ওয়াইড বন্ধ থাকলে ব্রাউজার ত্যাগ করার ৩ সেকেন্ড পর VPN বন্ধ করা
                            if (LocalDnsVpnService.isVpnRunning() && stopVpnRunnable == null) {
                                stopVpnRunnable = () -> {
                                    LocalDnsVpnService.stopVpn(BlockerAccessibilityService.this);
                                    stopVpnRunnable = null;
                                    Log.i(TAG, "ব্রাউজার ত্যাগ -> Helpniche VPN বন্ধ করা হলো!");
                                };
                                vpnHandler.postDelayed(stopVpnRunnable, 3000);
                            }
                        } else {
                            // সিস্টেম-ওয়াইড সক্রিয় থাকলে টাইমার বাতিল এবং সার্বক্ষণিক ভিপিএন অন রাখা
                            if (stopVpnRunnable != null) {
                                vpnHandler.removeCallbacks(stopVpnRunnable);
                                stopVpnRunnable = null;
                            }
                            if (!LocalDnsVpnService.isVpnRunning()) {
                                LocalDnsVpnService.startVpn(this);
                            }
                        }
                    }
                }
            }
        } else {
            // টেম্পোরারি আনলক থাকা অবস্থায় অ্যাপ ব্লক হবে না, কিন্তু সিস্টেম-ওয়াইড অ্যাড/অ্যাডাল্ট ফিল্টারিং চালু থাকবে
            SharedPreferences prefs = getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            boolean isSystemWideEnabled = prefs.getBoolean("system_wide_adblock_enabled", true);
            if (!isSystemWideEnabled && !LocalDnsVpnService.hasActiveNetworkBlocks(this)) {
                LocalDnsVpnService.stopVpn(this);
            } else if (!LocalDnsVpnService.isVpnRunning()) {
                LocalDnsVpnService.startVpn(this);
            }
        }

        // Strict App Blocker Check
        if (!isTempUnlocked && isAppBlocked(this, packageName)) {
            performGlobalAction(GLOBAL_ACTION_HOME);

            String appName = getAppNameFromPackage(this, packageName);
            long remainingMs = getAppBlockRemainingMs(this, packageName);
            long remainingSeconds = Math.max(0, remainingMs / 1000L);

            try {
                Intent overlayIntent = new Intent(this, MainActivity.class);
                overlayIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                overlayIntent.putExtra("show_blocked_app_overlay", true);
                overlayIntent.putExtra("blocked_package_name", packageName);
                overlayIntent.putExtra("blocked_app_name", appName);
                overlayIntent.putExtra("blocked_remaining_seconds", remainingSeconds);
                startActivity(overlayIntent);
            } catch (Exception e) {
                Log.e(TAG, "Error launching blocked app overlay", e);
            }

            String timeMsg = formatRemainingTimeBangla(remainingSeconds);
            Toast.makeText(this, appName + " দেখার জন্য " + timeMsg + " অপেক্ষা করুন", Toast.LENGTH_LONG).show();
            return;
        }

        // Strict Focus Session Lock
        if (!isTempUnlocked && isFocusLocked(this)) {
            if (!isIgnoredOrKeyboardPackage(packageName) && !isHomeLauncher(packageName)) {
                Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                    startActivity(launchIntent);
                    Toast.makeText(this, "Deep Focus Session Active! মনোযোগ বজায় রাখুন।", Toast.LENGTH_SHORT).show();
                    return;
                }
            }
        }

        // Uninstall, Deactivate & Storage Clear Protection (যখন লক মোডে থাকবে)
        boolean isUninstallContext = isSettingsOrManager ||
                (evtType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && isHomeLauncher(packageName));

        if (isUninstallContext && !isTempUnlocked && !isPermanentUnlocked(this)) {
            AccessibilityNodeInfo rootNode = getRootInActiveWindow();
            if (rootNode != null) {
                try {
                    boolean isFocusTargeted = checkNodeOrSource(event, rootNode, FOCUS_APP_IDENTIFIERS);

                    CharSequence classNameSeq = event.getClassName();
                    String className = classNameSeq != null ? classNameSeq.toString() : "";
                    boolean isDeviceAdminDeactivate = className.contains("DeviceAdminDeactivate") ||
                            scanNodeTreeForText(rootNode, "device admin", "ডিভাইস অ্যাডমিন", "deactivate", "নিষ্ক্রিয়");

                    if (isFocusTargeted) {
                        boolean isUninstallOrAppDetails = isDeviceAdminDeactivate ||
                                checkNodeOrSource(event, rootNode, UNINSTALL_DEACTIVATE_TERMS) ||
                                checkNodeOrSource(event, rootNode, "uninstall", "আনইনস্টল", "force stop", "disable", "নিষ্ক্রিয় করুন", "app info", "অ্যাপের বিবরণ", "অ্যাপের তথ্য", "accessibility", "অ্যাক্সেসিবিলিটি", "stop service", "turn off", "বন্ধ করুন");

                        if (isUninstallOrAppDetails) {
                            blockAndGoHome("Helpniche আনইনস্টল বা সুরক্ষা বন্ধ করা নিষিদ্ধ!");
                            return;
                        }

                        if (checkNodeOrSource(event, rootNode, STORAGE_CLEAR_TERMS)) {
                            blockAndGoHome("Helpniche অ্যাপ ডেটা বা স্টোরেজ ক্লিয়ার করা নিষিদ্ধ!");
                            return;
                        }
                    }

                    if (isVpnDisconnectAttempt(rootNode, packageName)) {
                        blockAndGoHome("Helpniche ভিপিএন ডিসকানেক্ট বা পরিবর্তন করা নিষিদ্ধ!");
                    }
                } finally {
                    rootNode.recycle();
                }
            }
        }
    }

    private void blockAndGoHome(String message) {
        performGlobalAction(GLOBAL_ACTION_HOME);
        Toast.makeText(this, message, Toast.LENGTH_LONG).show();
    }

    private boolean isVpnDisconnectAttempt(AccessibilityNodeInfo rootNode, String packageName) {
        if (!isDeviceAdminActive(this)) return false;
        boolean isVpnSettings = packageName.contains("settings");
        if (isVpnSettings) {
            boolean mentionsHelpniche = scanNodeTreeForText(rootNode, "helpniche", "com.helpniche.app");
            if (mentionsHelpniche) {
                return scanNodeTreeForText(rootNode, VPN_DISCONNECT_TERMS);
            }
        }
        return false;
    }

    private boolean checkNodeOrSource(AccessibilityEvent event, AccessibilityNodeInfo rootNode, String... targets) {
        if (scanNodeTreeForText(rootNode, targets)) {
            return true;
        }
        if (event != null) {
            return scanNodeTreeForText(event.getSource(), targets);
        }
        return false;
    }

    private boolean scanNodeTreeForText(AccessibilityNodeInfo node, String... targets) {
        if (node == null) return false;

        CharSequence textSeq = node.getText();
        CharSequence descSeq = node.getContentDescription();
        CharSequence viewIdSeq = node.getViewIdResourceName();

        String text = textSeq != null ? textSeq.toString().toLowerCase() : "";
        String desc = descSeq != null ? descSeq.toString().toLowerCase() : "";
        String viewId = viewIdSeq != null ? viewIdSeq.toString().toLowerCase() : "";
        String combined = text + " " + desc + " " + viewId;

        if (!combined.trim().isEmpty()) {
            for (String target : targets) {
                if (combined.contains(target.toLowerCase())) {
                    return true;
                }
            }
        }

        int childCount = node.getChildCount();
        for (int i = 0; i < childCount; i++) {
            AccessibilityNodeInfo child = node.getChild(i);
            if (child != null) {
                try {
                    if (scanNodeTreeForText(child, targets)) {
                        return true;
                    }
                } finally {
                    child.recycle();
                }
            }
        }

        return false;
    }

    @Override
    public void onDestroy() {
        unregisterNetworkMonitoring();
        if (unlockReceiver != null) {
            try {
                unregisterReceiver(unlockReceiver);
            } catch (Exception ignored) {}
            unlockReceiver = null;
        }
        super.onDestroy();
    }

    @Override
    public void onInterrupt() {}
}