package com.helpniche.app;

import android.app.AlertDialog;
import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.net.Uri;
import android.net.VpnService;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Log;
import android.widget.Toast;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";

    // Request Codes for Onboarding Sequence
    private static final int REQUEST_CODE_VPN = 101;
    private static final int REQUEST_CODE_DEVICE_ADMIN = 102;
    private static final int REQUEST_CODE_RESTRICTED_SETTINGS = 103;
    private static final int REQUEST_CODE_ACCESSIBILITY = 104;
    private static final int REQUEST_CODE_BATTERY_OPTIMIZATION = 105;
    private static final int REQUEST_CODE_OVERLAY = 106;
    private static final int REQUEST_CODE_NOTIFICATION = 107;
    private static final int REQUEST_CODE_EXACT_ALARM = 108;
    private static final int REQUEST_CODE_FULL_SCREEN = 109;

    // Flags to track onboarding prompts
    private boolean hasPromptedVpnPermission = false;
    private boolean hasPromptedAdminPermission = false;
    private boolean hasPromptedRestrictedSettings = false;
    private boolean hasPromptedAccessibility = false;
    private boolean hasPromptedBatteryOptimization = false;
    private boolean hasPromptedOverlayPermission = false;
    private boolean hasPromptedExactAlarmPermission = false;
    private boolean hasPromptedFullScreenIntentPermission = false;
    private boolean hasShownBrandGuidance = false;

    private ScreenUnlockReceiver unlockReceiver = null;
    private android.net.ConnectivityManager.NetworkCallback mainNetworkCallback = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UnlockPlugin.class);
        registerPlugin(SocialMediaControlPlugin.class);
        registerPlugin(FocusAudioPlugin.class);
        registerPlugin(NetworkControlPlugin.class);
        super.onCreate(savedInstanceState);

        // অ্যাপ ফ্রেশ ইনস্টল বা প্রথম ওপেন হলে পার্মানেন্ট আনলক ও সকল লক স্টেট রিসেট নিশ্চিত করা
        checkAndResetFirstRun();

        // স্বাধীন আনলক অ্যালার্ট ব্যাকগ্রাউন্ড সার্ভিস সক্রিয় থাকলে চালু করা
        try {
            SharedPreferences prefs = getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            if (prefs.getBoolean("unlock_reminder_enabled", false)) {
                UnlockAlertService.startService(this);
            }
        } catch (Exception ignored) {}

        // সিস্টেম-ওয়াইড অ্যাড ব্লকিং সক্রিয় থাকলে ব্যাকগ্রাউন্ডে ভিপিএন চালু রাখা
        try {
            SharedPreferences prefs = getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            boolean isSystemWideEnabled = prefs.getBoolean("system_wide_adblock_enabled", true);
            if (isSystemWideEnabled && VpnService.prepare(this) == null && !BlockerAccessibilityService.isUnlocked(this)) {
                LocalDnsVpnService.startVpn(this);
            }
        } catch (Exception ignored) {}

        // স্মার্ট ব্যাটারি সেভার ও স্ক্রিন/নেটওয়ার্ক লিসেনার চালু করা
        registerScreenAndNetworkListeners();

        // Onboarding লজিক ও ওভারলে হ্যান্ডলিং
        getWindow().getDecorView().postDelayed(() -> {
            checkAndRunNextOnboardingStep();
            handleBlockedAppOverlayIntent(getIntent());
        }, 600);
    }

    private void checkAndResetFirstRun() {
        try {
            SharedPreferences prefs = getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            long currentInstallTime = getPackageManager().getPackageInfo(getPackageName(), 0).firstInstallTime;
            long savedInstallTime = prefs.getLong("app_first_install_time", 0);

            if (savedInstallTime != currentInstallTime) {
                Log.i(TAG, "Fresh installation detected (installTime=" + currentInstallTime + "). Resetting all lock states to default.");

                SharedPreferences.Editor editor = prefs.edit();
                editor.clear();
                editor.putBoolean("is_permanent_unlock", false);
                editor.putLong("unlock_until_timestamp", 0);
                editor.putBoolean("is_focus_locked", false);
                editor.putLong("app_first_install_time", currentInstallTime);
                editor.putBoolean("is_first_launch_done", true);
                editor.apply();

                try {
                    SharedPreferences altPrefs = getSharedPreferences("FocusDuroodPrefs", Context.MODE_PRIVATE);
                    altPrefs.edit().clear().apply();
                } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking first run install time", e);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleBlockedAppOverlayIntent(intent);
    }

    private void handleBlockedAppOverlayIntent(Intent intent) {
        if (intent == null) return;
        boolean showOverlay = intent.getBooleanExtra("show_blocked_app_overlay", false);
        if (showOverlay) {
            String packageName = intent.getStringExtra("blocked_package_name");
            String appName = intent.getStringExtra("blocked_app_name");
            long remainingSeconds = intent.getLongExtra("blocked_remaining_seconds", 0);

            if (packageName == null) packageName = "";
            if (appName == null || appName.isEmpty()) appName = "অ্যাপ";

            final String finalAppName = appName;
            final String finalPkg = packageName;
            final long finalSecs = remainingSeconds;

            getWindow().getDecorView().postDelayed(() -> {
                try {
                    if (getBridge() != null && getBridge().getWebView() != null) {
                        String js = String.format(
                                java.util.Locale.US,
                                "if(window.showBlockedAppTakeoverOverlay){ window.showBlockedAppTakeoverOverlay('%s', %d, '%s'); }",
                                escapeJs(finalAppName), finalSecs, escapeJs(finalPkg)
                        );
                        getBridge().getWebView().evaluateJavascript(js, null);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error evaluating blocked overlay JS", e);
                }
            }, 300);
        }
    }

    private String escapeJs(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }

    public boolean hasPromptedRestrictedSettings() {
        return hasPromptedRestrictedSettings;
    }

    /**
     * ১. স্টেপ-বাই-স্টেপ অনবোর্ডিং পারমিশন ফ্লো ও স্টেট সিঙ্ক
     */
    public void checkAndRunNextOnboardingStep() {
        if (isFinishing() || isDestroyed()) return;

        try {
            boolean vpn = isVpnPermissionGranted();
            boolean admin = isDeviceAdminActive();
            SharedPreferences prefs = getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            boolean restrictedDone = (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU)
                    || isAccessibilityServiceEnabled()
                    || hasPromptedRestrictedSettings
                    || prefs.getBoolean("restricted_settings_done", false);
            boolean accessibility = isAccessibilityServiceEnabled();
            boolean battery = isIgnoringBatteryOptimizations();

            org.json.JSONObject status = new org.json.JSONObject();
            status.put("vpnGranted", vpn);
            status.put("adminActive", admin);
            status.put("restrictedSettingsDone", restrictedDone);
            status.put("accessibilityEnabled", accessibility);
            status.put("batteryBypassed", battery);
            status.put("sdkInt", Build.VERSION.SDK_INT);

            if (getBridge() != null && getBridge().getWebView() != null) {
                String js = String.format(
                        java.util.Locale.US,
                        "if(window.syncOnboardingPermissionStatus){ window.syncOnboardingPermissionStatus(%s); }",
                        status.toString()
                );
                getBridge().getWebView().evaluateJavascript(js, null);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error during onboarding step execution", e);
        }
    }

    public void requestPermissionStepFromJs(int step) {
        runOnUiThread(() -> {
            try {
                switch (step) {
                    case 1:
                        requestVpnPermission();
                        break;
                    case 2:
                        requestDeviceAdmin();
                        break;
                    case 3:
                        requestRestrictedSettingsGuidance();
                        break;
                    case 4:
                        requestAccessibilityPermission();
                        break;
                    case 5:
                        requestBatteryOptimizationBypass();
                        break;
                    // H15: wire the previously dead permission requests into the
                    // onboarding step sequence. Steps 6/7/8 match the existing
                    // REQUEST_CODE_OVERLAY(106) / REQUEST_CODE_EXACT_ALARM(108) /
                    // REQUEST_CODE_FULL_SCREEN(109) handling in onActivityResult.
                    case 6:
                        requestOverlayPermission();
                        break;
                    case 7:
                        requestExactAlarmPermission();
                        break;
                    case 8:
                        requestFullScreenIntentPermission();
                        break;
                    default:
                        Log.w(TAG, "Unknown permission step requested: " + step);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error executing permission step " + step, e);
            }
        });
    }

    // --- ধাপ ১: VPN Permission ---
    public boolean isVpnPermissionGranted() {
        try {
            return VpnService.prepare(this) == null;
        } catch (Exception e) {
            Log.e(TAG, "Error checking VPN permission", e);
            return false;
        }
    }

    public void requestVpnPermission() {
        try {
            Intent vpnIntent = VpnService.prepare(this);
            if (vpnIntent != null) {
                startActivityForResult(vpnIntent, REQUEST_CODE_VPN);
            } else {
                checkAndRunNextOnboardingStep();
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting VPN permission", e);
        }
    }

    // --- ধাপ ২: Device Policy Manager (Device Admin) ---
    public boolean isDeviceAdminActive() {
        DevicePolicyManager dpm = (DevicePolicyManager) getSystemService(Context.DEVICE_POLICY_SERVICE);
        ComponentName adminComponent = new ComponentName(this, AdminReceiver.class);
        return dpm != null && dpm.isAdminActive(adminComponent);
    }

    public void requestDeviceAdmin() {
        try {
            ComponentName adminComponent = new ComponentName(this, AdminReceiver.class);
            Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
            intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent);
            intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Helpniche সুরক্ষা ও আনইনস্টল রদ করতে ডিভাইস অ্যাডমিন পারমিশন দিন।");
            startActivityForResult(intent, REQUEST_CODE_DEVICE_ADMIN);
        } catch (Exception e) {
            Log.e(TAG, "Error requesting device admin", e);
        }
    }

    // --- ধাপ ৩: Android 13+ Restricted Settings Guidance ---
    public void requestRestrictedSettingsGuidance() {
        try {
            hasPromptedRestrictedSettings = true;
            getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE)
                    .edit().putBoolean("restricted_settings_done", true).apply();
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + getPackageName()));
            startActivityForResult(intent, REQUEST_CODE_RESTRICTED_SETTINGS);
        } catch (Exception e) {
            Log.e(TAG, "Error opening application details settings", e);
        }
    }

    // --- ধাপ ৪: Accessibility Service ---
    public boolean isAccessibilityServiceEnabled() {
        int accessibilityEnabled = 0;
        final String service = getPackageName() + "/" + BlockerAccessibilityService.class.getCanonicalName();
        try {
            accessibilityEnabled = Settings.Secure.getInt(
                    getContentResolver(),
                    Settings.Secure.ACCESSIBILITY_ENABLED);
        } catch (Settings.SettingNotFoundException e) {
            Log.e(TAG, "Error finding accessibility setting", e);
        }
        TextUtils.SimpleStringSplitter stringSplitter = new TextUtils.SimpleStringSplitter(':');

        if (accessibilityEnabled == 1) {
            String settingValue = Settings.Secure.getString(
                    getContentResolver(),
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            if (settingValue != null) {
                if (settingValue.contains(getPackageName())) {
                    return true;
                }
                stringSplitter.setString(settingValue);
                while (stringSplitter.hasNext()) {
                    String accessibilityService = stringSplitter.next();
                    if (accessibilityService.equalsIgnoreCase(service) || accessibilityService.contains("BlockerAccessibilityService")) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public void requestAccessibilityPermission() {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivityForResult(intent, REQUEST_CODE_ACCESSIBILITY);
        } catch (Exception e) {
            Log.e(TAG, "Error launching accessibility settings", e);
        }
    }

    // --- ধাপ ৫: Battery Optimization Bypass ---
    public boolean isIgnoringBatteryOptimizations() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            return pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
        }
        return true;
    }

    public void requestBatteryOptimizationBypass() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + getPackageName()));
                startActivityForResult(intent, REQUEST_CODE_BATTERY_OPTIMIZATION);
                return;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting battery optimization ignore, attempting settings fallback", e);
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent fallbackIntent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                startActivity(fallbackIntent);
            }
        } catch (Exception ignored) {}
    }

    // --- Overlay & Other Permissions ---
    private boolean isOverlayPermissionGranted() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(this);
        }
        return true;
    }

    private void requestOverlayPermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                hasPromptedOverlayPermission = true;
                Toast.makeText(this, "'Display over other apps' পারমিশন অন করুন", Toast.LENGTH_LONG).show();
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getPackageName()));
                startActivityForResult(intent, REQUEST_CODE_OVERLAY);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting overlay permission", e);
        }
    }

    private void requestExactAlarmPermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                hasPromptedExactAlarmPermission = true;
                Toast.makeText(this, "সঠিক সময়ে অ্যালার্ম বাজার জন্য 'Alarms & Reminders' পারমিশন অন করুন", Toast.LENGTH_LONG).show();
                Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,
                        Uri.parse("package:" + getPackageName()));
                startActivityForResult(intent, REQUEST_CODE_EXACT_ALARM);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting exact alarm permission", e);
        }
    }

    private void requestFullScreenIntentPermission() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                hasPromptedFullScreenIntentPermission = true;
                Toast.makeText(this, "লক স্ক্রিনে ফুল স্ক্রিন অ্যালার্ম দেখানোর জন্য 'Full screen notifications' পারমিশন অন করুন", Toast.LENGTH_LONG).show();
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
                        Uri.parse("package:" + getPackageName()));
                startActivityForResult(intent, REQUEST_CODE_FULL_SCREEN);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error requesting full screen intent permission", e);
        }
    }

    // --- ২. ব্র্যান্ড ডিটেকশন ও গাইডেন্স (Build.MANUFACTURER) ---
    public static String getBrandGuidanceText() {
        String manufacturer = Build.MANUFACTURER != null ? Build.MANUFACTURER.toLowerCase() : "";
        String brandName = Build.MANUFACTURER != null ? Build.MANUFACTURER : "আপনার ডিভাইস";

        if (manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco")) {
            return "Xiaomi / MIUI / Redmi ডিভাইস ডিটেক্ট হয়েছে:\n\n" +
                    "১. 'Autostart' অপশনটি অন করুন।\n" +
                    "২. Battery Saver সেটিংস এ 'No restrictions' দিন।\n" +
                    "৩. Display over other apps এবং Pop-up windows পারমিশন অন রাখুন।";
        } else if (manufacturer.contains("samsung")) {
            return "Samsung ডিভাইস ডিটেক্ট হয়েছে:\n\n" +
                    "১. 'Never sleeping apps' তালিকায় Helpniche যোগ করুন।\n" +
                    "২. Device Care -> Battery থেকে Background usage limit সরিয়ে দিন।\n" +
                    "৩. Auto-optimization অপশন বন্ধ রাখুন।";
        } else if (manufacturer.contains("vivo") || manufacturer.contains("iqoo")) {
            return "Vivo / iQOO ডিভাইস ডিটেক্ট হয়েছে:\n\n" +
                    "১. Autostart অপশন চালু করুন।\n" +
                    "২. Background Power Consumption এ 'High Background Power Consumption' সিলেক্ট করুন।";
        } else if (manufacturer.contains("oppo") || manufacturer.contains("realme")) {
            return "OPPO / Realme ডিভাইস ডিটেক্ট হয়েছে:\n\n" +
                    "১. Auto-launch পারমিশন অন রাখুন।\n" +
                    "২. Allow Background Running অপশন সক্রিয় করুন।\n" +
                    "৩. Battery Optimization 'Don't optimize' এ সেট করুন।";
        } else if (manufacturer.contains("oneplus")) {
            return "OnePlus ডিভাইস ডিটেক্ট হয়েছে:\n\n" +
                    "১. Battery Optimization থেকে Helpniche এর জন্য 'Don't optimize' সিলেক্ট করুন।\n" +
                    "২. Recent Apps থেকে Helpniche লক করে রাখুন।";
        } else if (manufacturer.contains("huawei") || manufacturer.contains("honor")) {
            return "Huawei / Honor ডিভাইস ডিটেক্ট হয়েছে:\n\n" +
                    "১. App Launch সেটিংস এ 'Manage Manually' সিলেক্ট করে Auto-launch ও Run in background অন রাখুন।";
        } else {
            return brandName + " ডিভাইস ডিটেক্ট হয়েছে:\n\n" +
                    "অ্যাপটি ব্যাকগ্রাউন্ডে সঠিকভাবে কাজ করার জন্য অটো-স্টার্ট এবং ব্যাটারি অপটিমাইজেশন অফ রাখুন।";
        }
    }

    private void showBrandGuidanceDialog() {
        try {
            String guidance = getBrandGuidanceText();
            new AlertDialog.Builder(this)
                    .setTitle("ডিভাইস গাইডলাইন (" + Build.MANUFACTURER + ")")
                    .setMessage(guidance)
                    .setPositiveButton("ব্র্যান্ড সেটিংস খুলুন", (dialog, which) -> {
                        OemPermissionHelper.openOemPermissionSettings(MainActivity.this);
                    })
                    .setNegativeButton("ঠিক আছে", null)
                    .show();

            // ওয়েবভিউতে গাইডেন্স টেক্সট পাঠানো
            if (getBridge() != null && getBridge().getWebView() != null) {
                String js = String.format(
                        java.util.Locale.US,
                        "if(window.showBrandGuidance){ window.showBrandGuidance('%s'); }",
                        escapeJs(guidance)
                );
                getBridge().getWebView().evaluateJavascript(js, null);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error showing brand guidance dialog", e);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_CODE_NOTIFICATION) {
            checkAndRunNextOnboardingStep();
        }
    }

    @Override
    public void onResume() {
        super.onResume();

        // ইউজার সেটিংস থেকে ফিরে আসলে ফ্ল্যাগ রিসেট করা
        if (!isVpnPermissionGranted()) {
            hasPromptedVpnPermission = false;
        }
        if (!isDeviceAdminActive()) {
            hasPromptedAdminPermission = false;
        }
        if (!isAccessibilityServiceEnabled()) {
            hasPromptedAccessibility = false;
        }
        if (!isIgnoringBatteryOptimizations()) {
            hasPromptedBatteryOptimization = false;
        }

        // সেটিংস থেকে ফিরে আসার পর পরবর্তী অনবোর্ডিং ধাপ এক্সিকিউট করা
        getWindow().getDecorView().postDelayed(this::checkAndRunNextOnboardingStep, 500);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == REQUEST_CODE_DEVICE_ADMIN) {
            if (isDeviceAdminActive()) {
                Toast.makeText(this, "ডিভাইস অ্যাডমিন সফলভাবে সক্রিয় হয়েছে", Toast.LENGTH_SHORT).show();
            }
            checkAndRunNextOnboardingStep();
        } else if (requestCode == REQUEST_CODE_VPN) {
            if (resultCode == RESULT_OK || isVpnPermissionGranted()) {
                Log.i(TAG, "VPN permission authorized. Starting LocalDnsVpnService...");
                try {
                    getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE)
                            .edit().putBoolean("system_wide_adblock_enabled", true).apply();
                    getSharedPreferences("FocusDuroodPrefs", Context.MODE_PRIVATE)
                            .edit().putBoolean("system_wide_adblock_enabled", true).apply();

                    Intent vpnServiceIntent = new Intent(this, LocalDnsVpnService.class);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        startForegroundService(vpnServiceIntent);
                    } else {
                        startService(vpnServiceIntent);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error starting LocalDnsVpnService", e);
                }
                Toast.makeText(this, "ভিপিএন সুরক্ষা অনুমতি সফলভাবে দেওয়া হয়েছে", Toast.LENGTH_SHORT).show();
            } else {
                Log.w(TAG, "VPN permission denied by user.");
                hasPromptedVpnPermission = false;
            }
            checkAndRunNextOnboardingStep();
        } else if (requestCode == REQUEST_CODE_RESTRICTED_SETTINGS ||
                requestCode == REQUEST_CODE_ACCESSIBILITY ||
                requestCode == REQUEST_CODE_BATTERY_OPTIMIZATION ||
                requestCode == REQUEST_CODE_OVERLAY ||
                requestCode == REQUEST_CODE_EXACT_ALARM ||
                requestCode == REQUEST_CODE_FULL_SCREEN) {
            checkAndRunNextOnboardingStep();
        }
    }

    private void registerScreenAndNetworkListeners() {
        if (unlockReceiver == null) {
            try {
                unlockReceiver = new ScreenUnlockReceiver();
                IntentFilter filter = new IntentFilter();
                filter.addAction(Intent.ACTION_USER_PRESENT);
                filter.addAction(Intent.ACTION_SCREEN_OFF);
                filter.addAction(android.net.ConnectivityManager.CONNECTIVITY_ACTION);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    registerReceiver(unlockReceiver, filter, Context.RECEIVER_EXPORTED);
                } else {
                    registerReceiver(unlockReceiver, filter);
                }
                Log.i(TAG, "ScreenUnlockReceiver registered dynamically in MainActivity.");
            } catch (Exception e) {
                Log.e(TAG, "Error registering ScreenUnlockReceiver in MainActivity", e);
            }
        }

        try {
            android.net.ConnectivityManager cm = (android.net.ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && mainNetworkCallback == null) {
                mainNetworkCallback = new android.net.ConnectivityManager.NetworkCallback() {
                    @Override
                    public void onAvailable(android.net.Network network) {
                        if (ScreenUnlockReceiver.isScreenInteractiveAndUnlocked(MainActivity.this)) {
                            ScreenUnlockReceiver.handleScreenUnlocked(MainActivity.this);
                        } else {
                            ScreenUnlockReceiver.handleScreenLocked(MainActivity.this);
                        }
                    }

                    @Override
                    public void onLost(android.net.Network network) {
                        if (!ScreenUnlockReceiver.isNetworkAvailable(MainActivity.this)) {
                            ScreenUnlockReceiver.handleScreenLocked(MainActivity.this);
                        }
                    }
                };
                android.net.NetworkRequest request = new android.net.NetworkRequest.Builder()
                        .addCapability(android.net.NetworkCapabilities.NET_CAPABILITY_INTERNET)
                        .build();
                cm.registerNetworkCallback(request, mainNetworkCallback);
                Log.i(TAG, "Dynamic network monitoring callback registered in MainActivity.");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error registering network callback in MainActivity", e);
        }
    }

    @Override
    public void onDestroy() {
        if (unlockReceiver != null) {
            try {
                unregisterReceiver(unlockReceiver);
            } catch (Exception ignored) {}
            unlockReceiver = null;
        }
        if (mainNetworkCallback != null) {
            try {
                android.net.ConnectivityManager cm = (android.net.ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
                if (cm != null) {
                    cm.unregisterNetworkCallback(mainNetworkCallback);
                }
            } catch (Exception ignored) {}
            mainNetworkCallback = null;
        }
        super.onDestroy();
    }
}