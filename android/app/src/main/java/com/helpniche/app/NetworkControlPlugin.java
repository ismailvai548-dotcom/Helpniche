package com.helpniche.app;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.VpnService;
import android.os.Build;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@CapacitorPlugin(name = "NetworkControlPlugin")
public class NetworkControlPlugin extends Plugin {

    private static final String TAG = "NetworkControlPlugin";
    private static final String PREFS_NAME = "HelpnichePrefs";
    private static final String PREF_KEY_WIFI_BLOCKED = "network_blocked_wifi";
    private static final String PREF_KEY_DATA_BLOCKED = "network_blocked_data";

    private static final Set<String> SOCIAL_PACKAGES = new HashSet<>(Arrays.asList(
            "com.facebook.katana", "com.facebook.lite", "com.instagram.android",
            "com.google.android.youtube", "com.zhiliaoapp.musically", "com.ss.android.ugc.trill",
            "com.whatsapp", "com.whatsapp.w4b", "com.facebook.orca", "com.facebook.mlite",
            "com.twitter.android", "com.snapchat.android", "org.telegram.messenger",
            "org.telegram.messenger.web", "com.instagram.barcelona", "com.reddit.frontpage",
            "com.pinterest", "com.linkedin.android", "com.imo.android.imoim", "com.discord",
            "com.viber.voip", "com.tencent.mm", "com.quora.android", "com.tumblrofficial"
    ));

    private static final String[] SOCIAL_KEYWORDS = {
            "facebook", "fb", "instagram", "youtube", "tiktok", "whatsapp",
            "messenger", "twitter", "snapchat", "telegram", "threads",
            "reddit", "pinterest", "linkedin", "imo", "discord", "viber", "quora"
    };

    /**
     * Get all launcher apps with their Wi-Fi and Mobile Data block states
     */
    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        new Thread(() -> {
            try {
                Context context = getContext();
                PackageManager pm = context.getPackageManager();

                Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
                mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);

                List<ResolveInfo> resolveInfoList = pm.queryIntentActivities(mainIntent, 0);
                JSArray appsArray = new JSArray();
                Set<String> processedPackages = new HashSet<>();

                SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                Set<String> wifiBlockedSet = getPackageSet(prefs, PREF_KEY_WIFI_BLOCKED);
                Set<String> dataBlockedSet = getPackageSet(prefs, PREF_KEY_DATA_BLOCKED);

                for (ResolveInfo resolveInfo : resolveInfoList) {
                    try {
                        String packageName = resolveInfo.activityInfo.packageName;
                        if (processedPackages.contains(packageName)) {
                            continue;
                        }
                        processedPackages.add(packageName);

                        // Don't show our own app in firewall list
                        if (packageName.equals(context.getPackageName())) {
                            continue;
                        }

                        ApplicationInfo appInfo = pm.getApplicationInfo(packageName, 0);
                        String appName = pm.getApplicationLabel(appInfo).toString();
                        Drawable iconDrawable = pm.getApplicationIcon(appInfo);
                        String iconBase64 = drawableToBase64(iconDrawable);

                        boolean isSocial = isSocialMediaApp(packageName, appName);
                        boolean wifiBlocked = wifiBlockedSet.contains(packageName);
                        boolean dataBlocked = dataBlockedSet.contains(packageName);

                        JSObject appObj = new JSObject();
                        appObj.put("appName", appName);
                        appObj.put("packageName", packageName);
                        appObj.put("icon", iconBase64);
                        appObj.put("isSocialMedia", isSocial);
                        appObj.put("isSystemApp", (appInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0);
                        appObj.put("wifiBlocked", wifiBlocked);
                        appObj.put("dataBlocked", dataBlocked);

                        appsArray.put(appObj);
                    } catch (Exception e) {
                        Log.e(TAG, "Error processing app: " + resolveInfo.activityInfo.packageName, e);
                    }
                }

                JSObject ret = new JSObject();
                ret.put("apps", appsArray);
                ret.put("activeNetwork", getActiveNetworkType(context));
                ret.put("isVpnRunning", LocalDnsVpnService.isVpnRunning());
                ret.put("isVpnPermissionGranted", VpnService.prepare(context) == null);
                call.resolve(ret);

            } catch (Exception e) {
                Log.e(TAG, "Error fetching installed apps for network control", e);
                call.reject("Failed to fetch apps: " + e.getMessage());
            }
        }).start();
    }

    /**
     * Set or toggle network block rules for a single application
     */
    @PluginMethod
    public void setAppNetworkRule(PluginCall call) {
        try {
            String packageName = call.getString("packageName");
            Boolean wifiBlocked = call.getBoolean("wifiBlocked");
            Boolean dataBlocked = call.getBoolean("dataBlocked");

            if (packageName == null || packageName.trim().isEmpty()) {
                call.reject("Package name is required");
                return;
            }

            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

            Set<String> wifiBlockedSet = new HashSet<>(getPackageSet(prefs, PREF_KEY_WIFI_BLOCKED));
            Set<String> dataBlockedSet = new HashSet<>(getPackageSet(prefs, PREF_KEY_DATA_BLOCKED));

            if (wifiBlocked != null) {
                if (wifiBlocked) {
                    wifiBlockedSet.add(packageName);
                } else {
                    wifiBlockedSet.remove(packageName);
                }
                savePackageSet(prefs, PREF_KEY_WIFI_BLOCKED, wifiBlockedSet);
            }

            if (dataBlocked != null) {
                if (dataBlocked) {
                    dataBlockedSet.add(packageName);
                } else {
                    dataBlockedSet.remove(packageName);
                }
                savePackageSet(prefs, PREF_KEY_DATA_BLOCKED, dataBlockedSet);
            }

            // Immediately refresh firewall rules in VPN
            LocalDnsVpnService.refreshRules(context);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("packageName", packageName);
            ret.put("wifiBlocked", wifiBlockedSet.contains(packageName));
            ret.put("dataBlocked", dataBlockedSet.contains(packageName));
            call.resolve(ret);

        } catch (Exception e) {
            Log.e(TAG, "Error setting app network rule", e);
            call.reject("Failed to set network rule: " + e.getMessage());
        }
    }

    /**
     * Batch block or unblock apps for Wi-Fi and/or Mobile Data
     */
    @PluginMethod
    public void setBatchNetworkRule(PluginCall call) {
        try {
            String type = call.getString("type", "both"); // "wifi", "data", "both"
            boolean blocked = call.getBoolean("blocked", false);
            JSArray packagesArr = call.getArray("packageNames");

            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

            Set<String> wifiBlockedSet = new HashSet<>(getPackageSet(prefs, PREF_KEY_WIFI_BLOCKED));
            Set<String> dataBlockedSet = new HashSet<>(getPackageSet(prefs, PREF_KEY_DATA_BLOCKED));

            List<String> targetPackages = new ArrayList<>();
            if (packagesArr != null) {
                for (int i = 0; i < packagesArr.length(); i++) {
                    targetPackages.add(packagesArr.getString(i));
                }
            }

            if ("wifi".equalsIgnoreCase(type) || "both".equalsIgnoreCase(type)) {
                if (blocked) {
                    wifiBlockedSet.addAll(targetPackages);
                } else {
                    if (targetPackages.isEmpty()) {
                        wifiBlockedSet.clear();
                    } else {
                        wifiBlockedSet.removeAll(targetPackages);
                    }
                }
                savePackageSet(prefs, PREF_KEY_WIFI_BLOCKED, wifiBlockedSet);
            }

            if ("data".equalsIgnoreCase(type) || "both".equalsIgnoreCase(type)) {
                if (blocked) {
                    dataBlockedSet.addAll(targetPackages);
                } else {
                    if (targetPackages.isEmpty()) {
                        dataBlockedSet.clear();
                    } else {
                        dataBlockedSet.removeAll(targetPackages);
                    }
                }
                savePackageSet(prefs, PREF_KEY_DATA_BLOCKED, dataBlockedSet);
            }

            // Immediately refresh firewall rules in VPN
            LocalDnsVpnService.refreshRules(context);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("wifiBlockedCount", wifiBlockedSet.size());
            ret.put("dataBlockedCount", dataBlockedSet.size());
            call.resolve(ret);

        } catch (Exception e) {
            Log.e(TAG, "Error setting batch network rule", e);
            call.reject("Failed to set batch rule: " + e.getMessage());
        }
    }

    /**
     * Get current status of Network Control and VPN
     */
    @PluginMethod
    public void getNetworkControlStatus(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            Set<String> wifiSet = getPackageSet(prefs, PREF_KEY_WIFI_BLOCKED);
            Set<String> dataSet = getPackageSet(prefs, PREF_KEY_DATA_BLOCKED);

            JSObject ret = new JSObject();
            ret.put("isVpnRunning", LocalDnsVpnService.isVpnRunning());
            ret.put("isVpnPermissionGranted", VpnService.prepare(context) == null);
            ret.put("activeNetwork", getActiveNetworkType(context));
            ret.put("wifiBlockedCount", wifiSet.size());
            ret.put("dataBlockedCount", dataSet.size());
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error getting network control status", e);
            call.reject("Failed to get status: " + e.getMessage());
        }
    }

    /**
     * Request VPN permission
     */
    @PluginMethod
    public void requestVpnPermission(PluginCall call) {
        try {
            Context context = getContext();
            Intent vpnIntent = VpnService.prepare(context);
            if (vpnIntent != null) {
                if (getActivity() != null) {
                    getActivity().startActivityForResult(vpnIntent, 101);
                }
                JSObject ret = new JSObject();
                ret.put("granted", false);
                ret.put("prompted", true);
                call.resolve(ret);
            } else {
                LocalDnsVpnService.startVpn(context);
                JSObject ret = new JSObject();
                ret.put("granted", true);
                ret.put("prompted", false);
                call.resolve(ret);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting VPN permission", e);
            call.reject("Failed to request VPN permission: " + e.getMessage());
        }
    }

    // --- Helpers ---

    private static String getActiveNetworkType(Context context) {
        if (context == null) return "none";
        try {
            ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return "none";

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Network net = cm.getActiveNetwork();
                if (net == null) return "none";
                NetworkCapabilities caps = cm.getNetworkCapabilities(net);
                if (caps == null) return "none";
                if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)) {
                    return "wifi";
                } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)) {
                    return "cellular";
                } else if (caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                    return "ethernet";
                }
            } else {
                android.net.NetworkInfo ni = cm.getActiveNetworkInfo();
                if (ni != null && ni.isConnected()) {
                    if (ni.getType() == ConnectivityManager.TYPE_WIFI) return "wifi";
                    if (ni.getType() == ConnectivityManager.TYPE_MOBILE) return "cellular";
                }
            }
        } catch (Exception ignored) {}
        return "none";
    }

    public static Set<String> getPackageSet(SharedPreferences prefs, String key) {
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

    public static void savePackageSet(SharedPreferences prefs, String key, Set<String> set) {
        JSONArray arr = new JSONArray();
        for (String pkg : set) {
            arr.put(pkg);
        }
        prefs.edit().putString(key, arr.toString()).apply();
    }

    private boolean isSocialMediaApp(String packageName, String appName) {
        if (packageName != null && SOCIAL_PACKAGES.contains(packageName.toLowerCase())) {
            return true;
        }
        if (appName != null) {
            String lowerName = appName.toLowerCase();
            for (String kw : SOCIAL_KEYWORDS) {
                if (lowerName.contains(kw)) return true;
            }
        }
        if (packageName != null) {
            String lowerPkg = packageName.toLowerCase();
            for (String kw : SOCIAL_KEYWORDS) {
                if (lowerPkg.contains(kw)) return true;
            }
        }
        return false;
    }

    private String drawableToBase64(Drawable drawable) {
        if (drawable == null) return "";
        try {
            int targetSize = 72;
            Bitmap bitmap = Bitmap.createBitmap(targetSize, targetSize, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            drawable.setBounds(0, 0, targetSize, targetSize);
            drawable.draw(canvas);

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 80, baos);
            byte[] byteArray = baos.toByteArray();
            bitmap.recycle();
            return "data:image/png;base64," + Base64.encodeToString(byteArray, Base64.NO_WRAP);
        } catch (Throwable e) {
            return "";
        }
    }
}
