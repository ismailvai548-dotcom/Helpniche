package com.helpniche.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(
    name = "UnlockPlugin",
    permissions = {
        @Permission(
            alias = "camera",
            strings = { android.Manifest.permission.CAMERA }
        ),
        @Permission(
            alias = "location",
            strings = { android.Manifest.permission.ACCESS_FINE_LOCATION, android.Manifest.permission.ACCESS_COARSE_LOCATION }
        )
    }
)
public class UnlockPlugin extends Plugin {

    private static final String TAG = "UnlockPlugin";

    @Override
    public void load() {
        super.load();
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            boolean enabled = prefs.getBoolean("unlock_reminder_enabled", false);
            if (!enabled) {
                SharedPreferences altPrefs = context.getSharedPreferences("FocusDuroodPrefs", Context.MODE_PRIVATE);
                enabled = altPrefs.getBoolean("unlock_reminder_enabled", false);
            }
            if (enabled) {
                UnlockAlertService.startService(context);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting UnlockAlertService on plugin load", e);
        }
    }

    @PluginMethod
    public void setSystemWideAdBlock(PluginCall call) {
        try {
            Boolean enabled = call.getBoolean("enabled", true);
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            prefs.edit().putBoolean("system_wide_adblock_enabled", Boolean.TRUE.equals(enabled)).apply();

            try {
                SharedPreferences altPrefs = context.getSharedPreferences("FocusDuroodPrefs", Context.MODE_PRIVATE);
                altPrefs.edit().putBoolean("system_wide_adblock_enabled", Boolean.TRUE.equals(enabled)).apply();
            } catch (Exception ignored) {}

            if (Boolean.TRUE.equals(enabled)) {
                LocalDnsVpnService.startVpn(context);
            } else {
                if (!BlockerAccessibilityService.isCurrentlyInBrowser()) {
                    LocalDnsVpnService.stopVpn(context);
                }
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("enabled", Boolean.TRUE.equals(enabled));
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error setting system wide ad block state", e);
            call.reject("Failed to set system wide ad block state: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getSystemWideAdBlockStatus(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            boolean enabled = prefs.getBoolean("system_wide_adblock_enabled", true);

            JSObject ret = new JSObject();
            ret.put("enabled", enabled);
            ret.put("isVpnRunning", LocalDnsVpnService.isVpnRunning());
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error getting system wide ad block status", e);
            call.reject("Failed to get status: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getBatterySaverStatus(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            boolean enabled = prefs.getBoolean("smart_battery_saver_enabled", true);

            JSObject ret = new JSObject();
            ret.put("enabled", enabled);
            ret.put("isVpnRunning", LocalDnsVpnService.isVpnRunning());
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error getting battery saver status", e);
            call.reject("Failed to get status: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setBatterySaverStatus(PluginCall call) {
        try {
            Boolean enabled = call.getBoolean("enabled", true);
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            prefs.edit().putBoolean("smart_battery_saver_enabled", Boolean.TRUE.equals(enabled)).apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("enabled", Boolean.TRUE.equals(enabled));
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error setting battery saver status", e);
            call.reject("Failed to set battery saver status: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getDeviceId(PluginCall call) {
        try {
            Context context = getContext();
            String deviceId = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ANDROID_ID);
            if (deviceId == null || deviceId.trim().isEmpty()) {
                deviceId = "UNKNOWN_DEVICE";
            }
            String deviceName = (Build.MANUFACTURER + " " + Build.MODEL).trim();
            JSObject ret = new JSObject();
            ret.put("deviceId", deviceId);
            ret.put("deviceName", deviceName);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error getting device ID", e);
            call.reject("Failed to get device ID: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setUnlockDuration(PluginCall call) {
        try {
            Integer minutes = call.getInt("minutes", 0);
            if (minutes != null && minutes > 0) {
                // ১. অ্যাক্সেসিবিলিটি প্রটেকশন আনলক করা
                BlockerAccessibilityService.setUnlockDuration(getContext(), minutes);

                // ২. VPN পরিষ্কারভাবে স্টপ করা
                try {
                    LocalDnsVpnService.stopVpn(getContext());
                    Log.i(TAG, "LocalDnsVpnService stopped cleanly during unlock.");
                } catch (Exception e) {
                    Log.e(TAG, "Error stopping LocalDnsVpnService", e);
                }

                // ৩. আনলক সময় শেষ হলে পুনরায় চালু করার অ্যালার্ম
                if (minutes < 999999 && minutes <= 1440) {
                    try {
                        AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
                        Intent restartIntent = new Intent(getContext(), AlarmReceiver.class);
                        restartIntent.setAction("ACTION_RESTART_VPN_PROTECTION");

                        PendingIntent pi = PendingIntent.getBroadcast(
                                getContext(),
                                8888,
                                restartIntent,
                                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                        );

                        long triggerAtMs = System.currentTimeMillis() + (minutes * 60 * 1000L);
                        if (am != null) {
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
                            } else {
                                am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
                            }
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error scheduling VPN restart alarm", e);
                    }
                }

                // ৪. ফ্লোটিং বাবল সার্ভিস শুরু করা
                if (minutes <= 1440) {
                    try {
                        Intent bubbleIntent = new Intent(getContext(), FloatingBubbleService.class);
                        bubbleIntent.putExtra("minutes", minutes);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                            getContext().startForegroundService(bubbleIntent);
                        } else {
                            getContext().startService(bubbleIntent);
                        }
                    } catch (Exception e) {
                        Log.e(TAG, "Error launching FloatingBubbleService", e);
                    }
                }

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("unlockUntil", System.currentTimeMillis() + (minutes * 60 * 1000L));
                call.resolve(ret);
            } else {
                call.reject("Invalid duration: must be > 0 minutes");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error setting unlock duration", e);
            call.reject("Failed to set unlock duration: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getUnlockStatus(PluginCall call) {
        try {
            boolean unlocked = BlockerAccessibilityService.isUnlocked(getContext());
            long remainingMs = BlockerAccessibilityService.getRemainingUnlockTimeMs(getContext());
            JSObject ret = new JSObject();
            ret.put("isUnlocked", unlocked);
            ret.put("remainingSeconds", remainingMs / 1000);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error getting unlock status", e);
            call.reject("Failed to get unlock status: " + e.getMessage());
        }
    }

    @PluginMethod
    public void reEnableProtection(PluginCall call) {
        try {
            BlockerAccessibilityService.reEnableProtection(getContext());

            // ১. ফ্লোটিং বাবল বন্ধ করা
            try {
                Intent bubbleIntent = new Intent(getContext(), FloatingBubbleService.class);
                getContext().stopService(bubbleIntent);
            } catch (Exception ignored) {}

            // ২. সিস্টেম-ওয়াইড অ্যাডব্লকার বা ভিপিএন পুনরায় চালু করা
            try {
                SharedPreferences prefs = getContext().getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
                boolean isSystemWide = prefs.getBoolean("system_wide_adblock_enabled", true);
                if (isSystemWide) {
                    LocalDnsVpnService.startVpn(getContext());
                }
            } catch (Exception ignored) {}

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error re-enabling protection", e);
            call.reject("Failed to re-enable protection: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setFocusLock(PluginCall call) {
        try {
            Boolean locked = call.getBoolean("locked", false);
            SharedPreferences prefs = getContext().getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            prefs.edit().putBoolean("is_focus_locked", Boolean.TRUE.equals(locked)).apply();
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error setting focus lock", e);
            call.reject("Failed to set focus lock: " + e.getMessage());
        }
    }

    @PluginMethod
    public void scheduleAlarm(PluginCall call) {
        try {
            int id = call.getInt("id", (int) System.currentTimeMillis());
            String title = call.getString("title", "Helpniche অ্যালার্ম");
            String timeStr = call.getString("timeStr", "05:30");
            int hour = call.getInt("hour", 5);
            int minute = call.getInt("minute", 30);
            boolean enabled = call.getBoolean("enabled", true);
            String audioType = call.getString("audioType", "alarm");
            String repeatMode = call.getString("repeatMode", "everyday");
            JSArray repeatDaysArr = call.getArray("repeatDays");
            String repeatDaysStr = repeatDaysArr != null ? repeatDaysArr.toString() : "[1,2,3,4,5,6,7]";

            AlarmManagerHelper.AlarmItem item = new AlarmManagerHelper.AlarmItem();
            item.id = id;
            item.title = title;
            item.timeStr = timeStr;
            item.hour = hour;
            item.minute = minute;
            item.enabled = enabled;
            item.audioType = audioType;
            item.repeatMode = repeatMode;
            item.repeatDays = repeatDaysStr;

            if (enabled) {
                AlarmManagerHelper.scheduleDailyAlarm(getContext(), item);
            } else {
                AlarmManagerHelper.cancelAlarm(getContext(), id);
                AlarmManagerHelper.saveOrUpdateAlarmInPrefs(getContext(), item);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("id", id);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling alarm", e);
            call.reject("Failed to schedule alarm: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelAlarm(PluginCall call) {
        try {
            int id = call.getInt("id", 0);
            AlarmManagerHelper.cancelAlarm(getContext(), id);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling alarm", e);
            call.reject("Failed to cancel alarm: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getAlarms(PluginCall call) {
        try {
            JSONArray arr = AlarmManagerHelper.getAllAlarmsJson(getContext());
            JSArray jsArr = new JSArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                JSObject jsObj = new JSObject();
                jsObj.put("id", obj.optInt("id"));
                jsObj.put("title", obj.optString("title"));
                jsObj.put("timeStr", obj.optString("timeStr"));
                jsObj.put("hour", obj.optInt("hour"));
                jsObj.put("minute", obj.optInt("minute"));
                jsObj.put("enabled", obj.optBoolean("enabled"));
                jsObj.put("audioType", obj.optString("audioType"));
                jsObj.put("repeatMode", obj.optString("repeatMode", "everyday"));
                jsObj.put("repeatDays", obj.optString("repeatDays", "[1,2,3,4,5,6,7]"));
                jsArr.put(jsObj);
            }
            JSObject ret = new JSObject();
            ret.put("alarms", jsArr);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error getting alarms", e);
            call.reject("Failed to get alarms: " + e.getMessage());
        }
    }

    /**
     * ফোন আনলক সতর্কতা (Unlock Guard) কনফিগারেশন হ্যান্ডলার
     * টগল স্ট্যাটাস, টেক্সট মেসেজ এবং ইউজার সিলেক্ট করা কাস্টম অডিও ইন্টারনাল স্টোরেজে সংরক্ষণ করে
     */
    @PluginMethod
    public void setUnlockReminder(PluginCall call) {
        try {
            Boolean enabled = call.getBoolean("enabled", false);
            String text = call.getString("text", "");
            String audioType = call.getString("audioType", "durood_sharif");
            String customAudioBase64 = call.getString("customAudioBase64", "");
            String customAudioName = call.getString("customAudioName", "");

            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putBoolean("unlock_reminder_enabled", Boolean.TRUE.equals(enabled));
            editor.putString("unlock_reminder_text", text != null ? text.trim() : "");
            editor.putString("unlock_reminder_audio_type", audioType != null ? audioType.trim() : "durood_sharif");
            editor.putString("custom_unlock_audio_name", customAudioName != null ? customAudioName.trim() : "");

            // ইউজার কাস্টম অডিও আপলোড করলে Base64 ডিকোড করে সরাসরি ফোনে mp3 ফাইল হিসেবে সেভ করা
            if ("custom".equalsIgnoreCase(audioType) && customAudioBase64 != null && !customAudioBase64.trim().isEmpty()) {
                try {
                    String cleanBase64 = customAudioBase64;
                    if (cleanBase64.contains(",")) {
                        cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                    }
                    byte[] audioBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                    File audioFile = new File(context.getFilesDir(), "custom_unlock_audio.mp3");
                    FileOutputStream fos = new FileOutputStream(audioFile);
                    fos.write(audioBytes);
                    fos.flush();
                    fos.close();

                    editor.putString("custom_unlock_audio_path", audioFile.getAbsolutePath());
                    Log.i(TAG, "Custom unlock audio saved successfully: " + audioFile.getAbsolutePath());
                } catch (Exception fileErr) {
                    Log.e(TAG, "Error saving custom audio file to storage", fileErr);
                }
            }

            editor.apply();

            // ব্যাকআপ হিসেবে FocusDuroodPrefs এও সেভ রাখা
            try {
                SharedPreferences altPrefs = context.getSharedPreferences("FocusDuroodPrefs", Context.MODE_PRIVATE);
                altPrefs.edit()
                        .putBoolean("unlock_reminder_enabled", Boolean.TRUE.equals(enabled))
                        .putString("unlock_reminder_text", text != null ? text.trim() : "")
                        .putString("unlock_reminder_audio_type", audioType != null ? audioType.trim() : "durood_sharif")
                        .putString("custom_unlock_audio_name", customAudioName != null ? customAudioName.trim() : "")
                        .apply();
            } catch (Exception ignored) {}

            // স্বাধীন ব্যাকগ্রাউন্ড আনলক অ্যালার্ট সার্ভিস পরিচালনা
            if (Boolean.TRUE.equals(enabled)) {
                UnlockAlertService.startService(context);
            } else {
                UnlockAlertService.stopService(context);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error setting unlock reminder", e);
            call.reject("Failed to set unlock reminder: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openTelegramBot(PluginCall call) {
        try {
            String botUsername = call.getString("botUsername", "");
            String deviceId = call.getString("deviceId", "");
            if (botUsername != null && botUsername.startsWith("@")) {
                botUsername = botUsername.substring(1);
            }

            String tgUri = "tg://resolve?domain=" + botUsername;
            String webUri = "https://t.me/" + botUsername;
            if (deviceId != null && !deviceId.trim().isEmpty()) {
                tgUri += "&start=" + deviceId.trim();
                webUri += "?start=" + deviceId.trim();
            }

            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(tgUri));
            intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getContext().startActivity(intent);
            } catch (Exception ex) {
                Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(webUri));
                webIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(webIntent);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error opening Telegram bot", e);
            call.reject("Failed to open Telegram: " + e.getMessage());
        }
    }

    private boolean isVpnPermissionGranted() {
        try {
            return android.net.VpnService.prepare(getContext()) == null;
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isDeviceAdminActive() {
        try {
            android.app.admin.DevicePolicyManager dpm = (android.app.admin.DevicePolicyManager) getContext().getSystemService(Context.DEVICE_POLICY_SERVICE);
            android.content.ComponentName admin = new android.content.ComponentName(getContext(), AdminReceiver.class);
            return dpm != null && dpm.isAdminActive(admin);
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isAccessibilityServiceEnabled() {
        try {
            int enabled = Settings.Secure.getInt(getContext().getContentResolver(), Settings.Secure.ACCESSIBILITY_ENABLED);
            if (enabled != 1) return false;
            String setting = Settings.Secure.getString(getContext().getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            return setting != null && setting.contains(getContext().getPackageName());
        } catch (Exception e) {
            return false;
        }
    }

    private boolean isIgnoringBatteryOptimizations() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.os.PowerManager pm = (android.os.PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
            return pm != null && pm.isIgnoringBatteryOptimizations(getContext().getPackageName());
        }
        return true;
    }

    @PluginMethod
    public void getOnboardingStatus(PluginCall call) {
        try {
            boolean vpn = isVpnPermissionGranted();
            boolean admin = isDeviceAdminActive();
            SharedPreferences prefs = getContext().getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            boolean restrictedDone = (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU)
                    || isAccessibilityServiceEnabled()
                    || prefs.getBoolean("restricted_settings_done", false);
            boolean accessibility = isAccessibilityServiceEnabled();
            boolean battery = isIgnoringBatteryOptimizations();

            JSObject ret = new JSObject();
            ret.put("vpnGranted", vpn);
            ret.put("adminActive", admin);
            ret.put("restrictedSettingsDone", restrictedDone);
            ret.put("accessibilityEnabled", accessibility);
            ret.put("batteryBypassed", battery);
            ret.put("sdkInt", Build.VERSION.SDK_INT);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error getting onboarding status", e);
            call.reject("Failed to get onboarding status: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestPermissionStep(PluginCall call) {
        try {
            int step = call.getInt("step", 1);
            Context ctx = getContext();
            if (step == 1) {
                Intent vpnIntent = android.net.VpnService.prepare(ctx);
                if (vpnIntent != null) {
                    if (getActivity() != null) {
                        getActivity().startActivityForResult(vpnIntent, 101);
                    } else {
                        vpnIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        ctx.startActivity(vpnIntent);
                    }
                } else {
                    SharedPreferences prefs = ctx.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
                    prefs.edit().putBoolean("system_wide_adblock_enabled", true).apply();
                    if (getActivity() instanceof MainActivity) {
                        ((MainActivity) getActivity()).checkAndRunNextOnboardingStep();
                    }
                }
            } else if (step == 2) {
                android.content.ComponentName admin = new android.content.ComponentName(ctx, AdminReceiver.class);
                Intent intent = new Intent(android.app.admin.DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
                intent.putExtra(android.app.admin.DevicePolicyManager.EXTRA_DEVICE_ADMIN, admin);
                intent.putExtra(android.app.admin.DevicePolicyManager.EXTRA_ADD_EXPLANATION, "Helpniche সুরক্ষা ও আনইনস্টল রদ করতে ডিভাইস অ্যাডমিন পারমিশন দিন।");
                if (getActivity() != null) {
                    getActivity().startActivityForResult(intent, 102);
                } else {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(intent);
                }
            } else if (step == 3) {
                SharedPreferences prefs = ctx.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
                prefs.edit().putBoolean("restricted_settings_done", true).apply();
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                intent.setData(Uri.parse("package:" + ctx.getPackageName()));
                if (getActivity() != null) {
                    getActivity().startActivityForResult(intent, 103);
                } else {
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    ctx.startActivity(intent);
                }
            } else if (step == 4) {
                Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                if (getActivity() != null) {
                    getActivity().startActivityForResult(intent, 104);
                } else {
                    ctx.startActivity(intent);
                }
            } else if (step == 5) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    try {
                        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                        intent.setData(Uri.parse("package:" + ctx.getPackageName()));
                        if (getActivity() != null) {
                            getActivity().startActivityForResult(intent, 105);
                        } else {
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            ctx.startActivity(intent);
                        }
                    } catch (Exception ex) {
                        try {
                            Intent fallback = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                            if (getActivity() != null) {
                                getActivity().startActivityForResult(fallback, 105);
                            } else {
                                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                ctx.startActivity(fallback);
                            }
                        } catch (Exception ignored) {}
                    }
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error requesting permission step", e);
            call.reject("Failed to request permission step: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getIntruderSettings(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            boolean enabled = prefs.getBoolean("intruder_selfie_enabled", false);
            int threshold = prefs.getInt("intruder_selfie_threshold", 1);

            File dir = new File(context.getFilesDir(), "intruder_logs");
            int count = 0;
            if (dir.exists() && dir.isDirectory()) {
                File[] files = dir.listFiles();
                if (files != null) {
                    for (File f : files) {
                        if (f.getName().endsWith(".jpg") || f.getName().endsWith(".jpeg")) count++;
                    }
                }
            }

            boolean hasCamera = true;
            boolean hasLocation = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                hasCamera = context.checkSelfPermission(android.Manifest.permission.CAMERA) == android.content.pm.PackageManager.PERMISSION_GRANTED;
                hasLocation = context.checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED;
            }

            JSObject ret = new JSObject();
            ret.put("enabled", enabled);
            ret.put("threshold", threshold);
            ret.put("totalCount", count);
            ret.put("hasCameraPermission", hasCamera);
            ret.put("hasLocationPermission", hasLocation);
            ret.put("isAdminActive", isDeviceAdminActive());
            ret.put("telegramChatId", prefs.getString("intruder_telegram_chat_id", ""));
            ret.put("telegramBotToken", prefs.getString("intruder_telegram_bot_token", ""));
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error getting intruder settings", e);
            call.reject("Failed to get intruder settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setIntruderSettings(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            if (call.hasOption("enabled")) {
                editor.putBoolean("intruder_selfie_enabled", Boolean.TRUE.equals(call.getBoolean("enabled", false)));
            }
            if (call.hasOption("threshold")) {
                editor.putInt("intruder_selfie_threshold", call.getInt("threshold", 1));
            }
            if (call.hasOption("telegramChatId")) {
                editor.putString("intruder_telegram_chat_id", call.getString("telegramChatId", "").trim());
            }
            if (call.hasOption("telegramBotToken")) {
                editor.putString("intruder_telegram_bot_token", call.getString("telegramBotToken", "").trim());
            }
            editor.apply();

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error setting intruder settings", e);
            call.reject("Failed to set intruder settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void testTelegramNotification(PluginCall call) {
        new Thread(() -> {
            try {
                Context context = getContext();
                SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
                String chatId = call.getString("chatId", prefs.getString("intruder_telegram_chat_id", ""));
                if (chatId == null || chatId.trim().isEmpty()) {
                    chatId = "6271611009";
                }
                String customToken = call.getString("botToken", prefs.getString("intruder_telegram_bot_token", ""));
                String botToken = (customToken != null && !customToken.trim().isEmpty()) ? customToken.trim() : "8808381690:AAH0wNxbtraOhxP6q3v7mQuqfhCQHXX6EMM";

                String text = java.net.URLEncoder.encode("Helpniche সিকিউরিটি টেস্ট:\nআপনার ব্যক্তিগত টেলিগ্রাম চ্যাট আইডি সফলভাবে সংযুক্ত হয়েছে। ভুল পাসওয়ার্ড দিলে এই আইডিতে ছবি ও লোকেশন আসবে।", "UTF-8");
                URL url = new URL("https://api.telegram.org/bot" + botToken + "/sendMessage?chat_id=" + chatId.trim() + "&text=" + text);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("GET");
                conn.setConnectTimeout(6000);
                int code = conn.getResponseCode();

                JSObject ret = new JSObject();
                ret.put("success", code == 200);
                ret.put("responseCode", code);
                if (code == 403) {
                    ret.put("errorMsg", "বট সক্রিয় করা হয়নি। প্রথমে টেলিগ্রাম বটে গিয়ে Start চাপুন।");
                } else if (code == 400) {
                    ret.put("errorMsg", "চ্যাট আইডি বা বট টোকেন সঠিক নয়।");
                } else if (code != 200) {
                    ret.put("errorMsg", "সার্ভার রেসপন্স এরর কোড: " + code);
                }
                call.resolve(ret);
            } catch (Exception e) {
                Log.e(TAG, "Error testing telegram notification", e);
                call.reject("Failed to test telegram: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void requestCameraPermission(PluginCall call) {
        try {
            boolean hasCamera = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Context context = getContext();
                hasCamera = context.checkSelfPermission(android.Manifest.permission.CAMERA) == android.content.pm.PackageManager.PERMISSION_GRANTED;

                if (!hasCamera && getActivity() != null) {
                    final String[] perms = new String[]{ android.Manifest.permission.CAMERA };
                    getActivity().runOnUiThread(() -> {
                        try {
                            androidx.core.app.ActivityCompat.requestPermissions(getActivity(), perms, 205);
                        } catch (Exception ex) {
                            Log.e(TAG, "Error requesting runtime camera permission", ex);
                        }
                    });
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("hasCameraPermission", hasCamera);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error requesting camera permission", e);
            call.reject("Failed to request camera permission: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestLocationPermission(PluginCall call) {
        try {
            boolean hasLocation = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Context context = getContext();
                hasLocation = context.checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION) == android.content.pm.PackageManager.PERMISSION_GRANTED;

                if (!hasLocation && getActivity() != null) {
                    final String[] perms = new String[]{
                            android.Manifest.permission.ACCESS_FINE_LOCATION,
                            android.Manifest.permission.ACCESS_COARSE_LOCATION
                    };
                    getActivity().runOnUiThread(() -> {
                        try {
                            androidx.core.app.ActivityCompat.requestPermissions(getActivity(), perms, 206);
                        } catch (Exception ex) {
                            Log.e(TAG, "Error requesting runtime location permissions", ex);
                        }
                    });
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("hasLocationPermission", hasLocation);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error requesting location permissions", e);
            call.reject("Failed to request location permissions: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestDeviceAdminPermission(PluginCall call) {
        try {
            Context ctx = getContext();
            android.content.ComponentName admin = new android.content.ComponentName(ctx, AdminReceiver.class);
            Intent intent = new Intent(android.app.admin.DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
            intent.putExtra(android.app.admin.DevicePolicyManager.EXTRA_DEVICE_ADMIN, admin);
            intent.putExtra(android.app.admin.DevicePolicyManager.EXTRA_ADD_EXPLANATION, "অনুপ্রবেশকারী সেলফি ও আনইনস্টল সুরক্ষার জন্য ডিভাইস অ্যাডমিন পারমিশন দিন।");
            if (getActivity() != null) {
                getActivity().startActivityForResult(intent, 102);
            } else {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(intent);
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error requesting device admin permission", e);
            call.reject("Failed to request device admin permission: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Context ctx = getContext();
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + ctx.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error opening app settings", e);
            call.reject("Failed to open app settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getIntruderLogs(PluginCall call) {
        try {
            Context context = getContext();
            File dir = new File(context.getFilesDir(), "intruder_logs");
            JSArray logs = new JSArray();

            if (dir.exists() && dir.isDirectory()) {
                File[] files = dir.listFiles();
                if (files != null && files.length > 0) {
                    java.util.Arrays.sort(files, (f1, f2) -> Long.compare(f2.lastModified(), f1.lastModified()));

                    java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("dd MMM yyyy, hh:mm a", java.util.Locale.ENGLISH);

                    for (int i = 0; i < Math.min(files.length, 60); i++) {
                        File f = files[i];
                        if (f.getName().endsWith(".jpg") || f.getName().endsWith(".jpeg")) {
                            byte[] bytes = new byte[(int) f.length()];
                            try (java.io.FileInputStream fis = new java.io.FileInputStream(f)) {
                                fis.read(bytes);
                            }
                            String base64 = "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);

                            JSObject item = new JSObject();
                            item.put("id", f.getName());
                            item.put("timestamp", f.lastModified());
                            item.put("dateText", sdf.format(new java.util.Date(f.lastModified())));
                            item.put("image", base64);
                            logs.put(item);
                        }
                    }
                }
            }

            JSObject ret = new JSObject();
            ret.put("logs", logs);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error getting intruder logs", e);
            call.reject("Failed to get intruder logs: " + e.getMessage());
        }
    }

    @PluginMethod
    public void deleteIntruderLog(PluginCall call) {
        try {
            String id = call.getString("id");
            if (id != null) {
                File file = new File(new File(getContext().getFilesDir(), "intruder_logs"), id);
                if (file.exists()) {
                    file.delete();
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error deleting intruder log", e);
            call.reject("Failed to delete log: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clearAllIntruderLogs(PluginCall call) {
        try {
            File dir = new File(getContext().getFilesDir(), "intruder_logs");
            if (dir.exists() && dir.isDirectory()) {
                File[] files = dir.listFiles();
                if (files != null) {
                    for (File f : files) {
                        f.delete();
                    }
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error clearing intruder logs", e);
            call.reject("Failed to clear logs: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getAutoVibrateConfig(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(AutoVibrateHelper.PREFS_NAME, Context.MODE_PRIVATE);
            String configStr = prefs.getString(AutoVibrateHelper.KEY_AUTO_VIBRATE_CONFIG, null);
            boolean currentlyActive = prefs.getBoolean(AutoVibrateHelper.KEY_CURRENTLY_VIBRATING, false);
            boolean isDndGranted = AutoVibrateHelper.isDndPermissionGranted(context);

            JSObject ret = new JSObject();
            ret.put("configJson", configStr != null ? configStr : "");
            ret.put("isCurrentlyVibrating", currentlyActive);
            ret.put("isDndGranted", isDndGranted);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error getting Auto Vibrate config", e);
            call.reject("Failed to get Auto Vibrate config: " + e.getMessage());
        }
    }

    @PluginMethod
    public void saveAutoVibrateConfig(PluginCall call) {
        try {
            String configJson = call.getString("configJson");
            if (configJson == null) {
                configJson = "";
            }
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences(AutoVibrateHelper.PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().putString(AutoVibrateHelper.KEY_AUTO_VIBRATE_CONFIG, configJson).apply();

            AutoVibrateHelper.applyCurrentVibrateState(context);

            boolean currentlyActive = prefs.getBoolean(AutoVibrateHelper.KEY_CURRENTLY_VIBRATING, false);
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("isCurrentlyVibrating", currentlyActive);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error saving Auto Vibrate config", e);
            call.reject("Failed to save Auto Vibrate config: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openDndSettings(PluginCall call) {
        try {
            Context ctx = getActivity() != null ? getActivity() : getContext();
            AutoVibrateHelper.openDndSettings(ctx);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error opening DND settings", e);
            call.reject("Failed to open DND settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void showSystemNotification(PluginCall call) {
        try {
            String title = call.getString("title", "Helpniche টার্গেট রিমাইন্ডার");
            String message = call.getString("message", "");
            Context context = getContext();

            android.app.NotificationManager nm = (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            String channelId = "helpniche_target_channel";
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                android.app.NotificationChannel channel = new android.app.NotificationChannel(channelId, "টার্গেট অ্যালার্ট", android.app.NotificationManager.IMPORTANCE_HIGH);
                channel.setDescription("Helpniche টার্গেট ও মাইলস্টোন নোটিফিকেশন");
                nm.createNotificationChannel(channel);
            }

            Intent intent = new Intent(context, MainActivity.class);
            PendingIntent pi = PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

            androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(new androidx.core.app.NotificationCompat.BigTextStyle().bigText(message))
                .setPriority(androidx.core.app.NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pi);

            nm.notify((int) (System.currentTimeMillis() % 100000), builder.build());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error showing system notification", e);
            call.reject("Failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void syncTargetData(PluginCall call) {
        try {
            Context context = getContext();
            SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();

            if (call.hasOption("title")) editor.putString("target_title", call.getString("title", ""));
            if (call.hasOption("days")) editor.putInt("target_days", call.getInt("days", 0));
            if (call.hasOption("startTime")) editor.putLong("target_start_time", call.getLong("startTime", 0L));
            if (call.hasOption("endTime")) editor.putLong("target_end_time", call.getLong("endTime", 0L));
            if (call.hasOption("isActive")) editor.putBoolean("target_is_active", Boolean.TRUE.equals(call.getBoolean("isActive", false)));
            if (call.hasOption("streakDays")) editor.putInt("streak_days", call.getInt("streakDays", 0));
            if (call.hasOption("rankTitle")) editor.putString("rank_title", call.getString("rankTitle", "সংগ্রামী পথিক"));
            editor.apply();

            // হোম স্ক্রিন উইজেট আপডেট
            StreakTargetWidgetProvider.updateAllWidgets(context);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error syncing target data", e);
            call.reject("Failed to sync target data: " + e.getMessage());
        }
    }

    @PluginMethod
    public void pinStreakWidget(PluginCall call) {
        try {
            Context context = getContext();
            android.appwidget.AppWidgetManager appWidgetManager = android.appwidget.AppWidgetManager.getInstance(context);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (appWidgetManager.isRequestPinAppWidgetSupported()) {
                    android.content.ComponentName myProvider = new android.content.ComponentName(context, StreakTargetWidgetProvider.class);
                    appWidgetManager.requestPinAppWidget(myProvider, null, null);
                    JSObject ret = new JSObject();
                    ret.put("success", true);
                    ret.put("supported", true);
                    call.resolve(ret);
                    return;
                }
            }
            JSObject ret = new JSObject();
            ret.put("success", false);
            ret.put("supported", false);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error pinning widget to home screen", e);
            call.reject("Failed to pin widget: " + e.getMessage());
        }
    }

    @PluginMethod
    public void scheduleTaskNotification(PluginCall call) {
        try {
            int id = call.getInt("id", (int) (System.currentTimeMillis() % 1000000));
            String title = call.getString("title", "ফোকাস টাস্ক");
            String details = call.getString("details", "কাজের সময় হয়েছে!");
            Long triggerAtMs = call.getLong("triggerAtMs", 0L);

            Context context = getContext();

            // অ্যান্ড্রয়েড ১৩+ এ নোটিফিকেশন পারমিশন নিশ্চিত করা
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (context.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                    if (getActivity() != null) {
                        getActivity().runOnUiThread(() -> {
                            try {
                                androidx.core.app.ActivityCompat.requestPermissions(
                                    getActivity(),
                                    new String[]{android.Manifest.permission.POST_NOTIFICATIONS},
                                    301
                                );
                            } catch (Exception ignored) {}
                        });
                    }
                }
            }

            if (triggerAtMs != null && triggerAtMs > System.currentTimeMillis()) {
                AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                if (am != null) {
                    Intent intent = new Intent(context, AlarmReceiver.class);
                    intent.setAction("ACTION_TASK_NOTIFICATION");
                    intent.putExtra("taskId", id);
                    intent.putExtra("title", title);
                    intent.putExtra("details", details);

                    PendingIntent pi = PendingIntent.getBroadcast(
                        context,
                        id + 60000,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    Intent showIntent = new Intent(context, MainActivity.class);
                    PendingIntent showPi = PendingIntent.getActivity(
                        context,
                        id + 60000,
                        showIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                    );

                    try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                            AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerAtMs, showPi);
                            am.setAlarmClock(clockInfo, pi);
                        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
                        } else {
                            am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
                        }
                        Log.i(TAG, "Task notification scheduled via setAlarmClock for time: " + triggerAtMs);
                    } catch (SecurityException se) {
                        Log.e(TAG, "Fallback to setAndAllowWhileIdle for task notification", se);
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
                        } else {
                            am.set(AlarmManager.RTC_WAKEUP, triggerAtMs, pi);
                        }
                    }
                }
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error scheduling task notification", e);
            call.reject("Failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void cancelTaskNotification(PluginCall call) {
        try {
            int id = call.getInt("id", 0);
            Context context = getContext();
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            Intent intent = new Intent(context, AlarmReceiver.class);
            intent.setAction("ACTION_TASK_NOTIFICATION");
            PendingIntent pi = PendingIntent.getBroadcast(
                context,
                id + 60000,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            if (am != null) {
                am.cancel(pi);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error cancelling task notification", e);
            call.reject("Failed: " + e.getMessage());
        }
    }
}