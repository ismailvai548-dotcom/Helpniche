package com.helpniche.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

public class OemPermissionHelper {

    private static final String TAG = "OemPermissionHelper";

    public static boolean isOemDevice() {
        String manufacturer = Build.MANUFACTURER.toLowerCase();
        return manufacturer.contains("xiaomi") || 
               manufacturer.contains("redmi") || 
               manufacturer.contains("poco") || 
               manufacturer.contains("oppo") || 
               manufacturer.contains("realme") || 
               manufacturer.contains("vivo");
    }

    public static void openOemPermissionSettings(Context context) {
        if (context == null) return;
        String manufacturer = Build.MANUFACTURER.toLowerCase();
        
        try {
            if (manufacturer.contains("xiaomi") || manufacturer.contains("redmi") || manufacturer.contains("poco")) {
                Intent intent = new Intent("miui.intent.action.APP_PERM_EDITOR");
                intent.setClassName("com.miui.securitycenter", "com.miui.permcenter.permissions.PermissionsEditorActivity");
                intent.putExtra("extra_pkgname", context.getPackageName());
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                return;
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to launch MIUI permissions editor", e);
        }

        try {
            if (manufacturer.contains("oppo") || manufacturer.contains("realme")) {
                Intent intent = new Intent();
                intent.setClassName("com.coloros.safecenter", "com.coloros.safecenter.permission.singlepage.PermissionSinglePageActivity");
                intent.putExtra("packageName", context.getPackageName());
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                return;
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to launch Oppo/Realme permissions editor", e);
        }

        try {
            if (manufacturer.contains("vivo")) {
                Intent intent = new Intent();
                intent.setClassName("com.vivo.permissionmanager", "com.vivo.permissionmanager.activity.SoftPermissionDetailActivity");
                intent.putExtra("packagename", context.getPackageName());
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                return;
            }
        } catch (Exception e) {
            Log.w(TAG, "Failed to launch Vivo permissions editor", e);
        }

        // Default App Settings fallback
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception e) {
            Log.e(TAG, "Failed to launch default app details settings", e);
        }
    }
}
