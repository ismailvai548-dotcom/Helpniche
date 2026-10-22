package com.helpniche.app;

import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.text.TextUtils;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@CapacitorPlugin(name = "SocialMediaControlPlugin")
public class SocialMediaControlPlugin extends Plugin {

    private static final String TAG = "SocialMediaControlPlugin";

    // Known social media app package names
    private static final Set<String> SOCIAL_PACKAGES = new HashSet<>(Arrays.asList(
            "com.facebook.katana",
            "com.facebook.lite",
            "com.instagram.android",
            "com.google.android.youtube",
            "com.zhiliaoapp.musically",
            "com.ss.android.ugc.trill",
            "com.whatsapp",
            "com.whatsapp.w4b",
            "com.facebook.orca",
            "com.facebook.mlite",
            "com.twitter.android",
            "com.snapchat.android",
            "org.telegram.messenger",
            "org.telegram.messenger.web",
            "com.instagram.barcelona",
            "com.reddit.frontpage",
            "com.pinterest",
            "com.linkedin.android",
            "com.imo.android.imoim",
            "com.imo.android.imoimhd",
            "com.discord",
            "com.viber.voip",
            "com.ss.android.ugc.boom",
            "com.tencent.mm",
            "com.quora.android",
            "com.tumblrofficial",
            "com.vkontakte.android"
    ));

    // Social media keyword fallbacks
    private static final String[] SOCIAL_KEYWORDS = {
            "facebook", "fb", "instagram", "youtube", "tiktok", "whatsapp",
            "messenger", "twitter", "snapchat", "telegram", "threads",
            "reddit", "pinterest", "linkedin", "imo", "discord", "viber",
            "quora", "wechat", "tumblr", "vk"
    };

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

                for (ResolveInfo resolveInfo : resolveInfoList) {
                    try {
                        String packageName = resolveInfo.activityInfo.packageName;

                        if (processedPackages.contains(packageName)) {
                            continue;
                        }
                        processedPackages.add(packageName);

                        ApplicationInfo appInfo = pm.getApplicationInfo(packageName, 0);
                        String appName = pm.getApplicationLabel(appInfo).toString();

                        Drawable iconDrawable = pm.getApplicationIcon(appInfo);
                        String iconBase64 = drawableToBase64(iconDrawable);

                        boolean isSocial = isSocialMediaApp(packageName, appName);
                        boolean isBlocked = BlockerAccessibilityService.isAppBlocked(context, packageName);
                        long remainingMs = BlockerAccessibilityService.getAppBlockRemainingMs(context, packageName);

                        JSObject appObj = new JSObject();
                        appObj.put("appName", appName);
                        appObj.put("packageName", packageName);
                        appObj.put("icon", iconBase64);
                        appObj.put("isSocialMedia", isSocial);
                        appObj.put("isSystemApp", (appInfo.flags & ApplicationInfo.FLAG_SYSTEM) != 0);
                        appObj.put("isBlocked", isBlocked);
                        appObj.put("remainingSeconds", remainingMs / 1000L);

                        appsArray.put(appObj);
                    } catch (Exception e) {
                        Log.e(TAG, "Error processing app item: " + resolveInfo.activityInfo.packageName, e);
                    }
                }

                JSObject ret = new JSObject();
                ret.put("apps", appsArray);
                call.resolve(ret);

            } catch (Exception e) {
                Log.e(TAG, "Error fetching installed apps", e);
                call.reject("Failed to fetch installed apps: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void setAppBlock(PluginCall call) {
        try {
            String packageName = call.getString("packageName");
            Integer h = call.getInt("hours", 0);
            Integer m = call.getInt("minutes", 0);
            int hours = h != null ? Math.max(0, h) : 0;
            int minutes = m != null ? Math.max(0, m) : 0;

            if (packageName == null || packageName.trim().isEmpty()) {
                call.reject("Package name is required");
                return;
            }

            long totalMinutes = (hours * 60L) + minutes;
            if (totalMinutes <= 0) {
                call.reject("Invalid block duration: must be > 0 minutes");
                return;
            }

            // Enforce max 7 days (10,080 minutes)
            long MAX_ALLOWED_MINUTES = 10080L;
            if (totalMinutes > MAX_ALLOWED_MINUTES) {
                totalMinutes = MAX_ALLOWED_MINUTES;
            }

            long durationMs = totalMinutes * 60 * 1000L;
            BlockerAccessibilityService.setAppBlock(getContext(), packageName, durationMs);

            long remainingMs = BlockerAccessibilityService.getAppBlockRemainingMs(getContext(), packageName);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("packageName", packageName);
            ret.put("isBlocked", true);
            ret.put("remainingSeconds", remainingMs / 1000L);
            call.resolve(ret);

        } catch (Exception e) {
            Log.e(TAG, "Error setting app block", e);
            call.reject("Failed to set app block: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getAppBlockStatus(PluginCall call) {
        try {
            String packageName = call.getString("packageName");
            if (packageName == null || packageName.trim().isEmpty()) {
                call.reject("Package name is required");
                return;
            }

            boolean isBlocked = BlockerAccessibilityService.isAppBlocked(getContext(), packageName);
            long remainingMs = BlockerAccessibilityService.getAppBlockRemainingMs(getContext(), packageName);

            JSObject ret = new JSObject();
            ret.put("packageName", packageName);
            ret.put("isBlocked", isBlocked);
            ret.put("remainingSeconds", remainingMs / 1000L);
            call.resolve(ret);

        } catch (Exception e) {
            Log.e(TAG, "Error getting app block status", e);
            call.reject("Failed to get app block status: " + e.getMessage());
        }
    }

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        try {
            Context context = getContext();
            boolean accessibilityEnabled = isAccessibilityServiceEnabled(context);
            boolean overlayEnabled = isOverlayPermissionGranted(context);

            JSObject ret = new JSObject();
            ret.put("accessibilityEnabled", accessibilityEnabled);
            ret.put("overlayEnabled", overlayEnabled);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error checking permissions", e);
            call.reject("Failed to check permissions: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestAccessibilityPermission(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error opening accessibility settings", e);
            call.reject("Failed to open accessibility settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getContext().getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            Log.e(TAG, "Error opening overlay settings", e);
            call.reject("Failed to open overlay settings: " + e.getMessage());
        }
    }

    private boolean isAccessibilityServiceEnabled(Context context) {
        int accessibilityEnabled = 0;
        final String service = context.getPackageName() + "/" + BlockerAccessibilityService.class.getCanonicalName();
        try {
            accessibilityEnabled = Settings.Secure.getInt(
                    context.getContentResolver(),
                    Settings.Secure.ACCESSIBILITY_ENABLED);
        } catch (Settings.SettingNotFoundException e) {
            Log.e(TAG, "Error finding accessibility setting", e);
        }
        TextUtils.SimpleStringSplitter stringSplitter = new TextUtils.SimpleStringSplitter(':');

        if (accessibilityEnabled == 1) {
            String settingValue = Settings.Secure.getString(
                    context.getContentResolver(),
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            if (settingValue != null) {
                stringSplitter.setString(settingValue);
                while (stringSplitter.hasNext()) {
                    String accessibilityService = stringSplitter.next();
                    if (accessibilityService.equalsIgnoreCase(service)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private boolean isOverlayPermissionGranted(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return Settings.canDrawOverlays(context);
        }
        return true;
    }

    private boolean isSocialMediaApp(String packageName, String appName) {
        if (packageName != null && SOCIAL_PACKAGES.contains(packageName.toLowerCase())) {
            return true;
        }

        if (appName != null) {
            String lowerName = appName.toLowerCase();
            for (String keyword : SOCIAL_KEYWORDS) {
                if (lowerName.contains(keyword)) {
                    return true;
                }
            }
        }

        if (packageName != null) {
            String lowerPkg = packageName.toLowerCase();
            for (String keyword : SOCIAL_KEYWORDS) {
                if (lowerPkg.contains(keyword)) {
                    return true;
                }
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
            Log.e(TAG, "Error converting drawable to base64", e);
            return "";
        }
    }

    @PluginMethod
    public void getReelsBlockStatus(PluginCall call) {
        try {
            Context context = getContext();
            boolean enabled = BlockerAccessibilityService.isReelsBlockActive(context);
            long remainingMs = BlockerAccessibilityService.getReelsBlockRemainingLockMs(context);
            boolean isLocked = remainingMs > 0;

            JSObject ret = new JSObject();
            ret.put("enabled", enabled);
            ret.put("remainingSeconds", remainingMs / 1000L);
            ret.put("isLocked", isLocked);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to get reels block status: " + e.getMessage());
        }
    }

    @PluginMethod
    public void enableReelsBlock(PluginCall call) {
        try {
            Context context = getContext();
            BlockerAccessibilityService.enableReelsBlock(context);
            long remainingMs = BlockerAccessibilityService.getReelsBlockRemainingLockMs(context);

            JSObject ret = new JSObject();
            ret.put("enabled", true);
            ret.put("remainingSeconds", remainingMs / 1000L);
            ret.put("isLocked", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to enable reels block: " + e.getMessage());
        }
    }

    @PluginMethod
    public void disableReelsBlock(PluginCall call) {
        try {
            Context context = getContext();
            long remainingMs = BlockerAccessibilityService.getReelsBlockRemainingLockMs(context);
            if (remainingMs > 0) {
                String timeMsg = BlockerAccessibilityService.formatRemainingTimeBangla(remainingMs / 1000L);
                call.reject("নির্ধারিত ৩০ মিনিট শেষ না হওয়া পর্যন্ত এটি বন্ধ করা যাবে না। অবশিষ্ট লক সময়: " + timeMsg);
                return;
            }

            boolean success = BlockerAccessibilityService.disableReelsBlock(context);
            if (!success) {
                call.reject("লক চলমান থাকায় বন্ধ করা সম্ভব হয়নি");
                return;
            }

            JSObject ret = new JSObject();
            ret.put("enabled", false);
            ret.put("remainingSeconds", 0);
            ret.put("isLocked", false);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to disable reels block: " + e.getMessage());
        }
    }

    @PluginMethod
    public void getReelsAnalytics(PluginCall call) {
        try {
            Context context = getContext();
            JSObject data = ReelsTrackerManager.getAnalytics(context);
            call.resolve(data);
        } catch (Exception e) {
            call.reject("Failed to get reels analytics: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setReelsDailyLimit(PluginCall call) {
        try {
            int limit = call.getInt("limit", 0);
            Context context = getContext();
            ReelsTrackerManager.setDailyLimit(context, limit);
            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("limit", Math.max(0, Math.min(limit, ReelsTrackerManager.MAX_HARD_CAP_LIMIT)));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to set reels limit: " + e.getMessage());
        }
    }
}
