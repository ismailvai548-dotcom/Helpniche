package com.helpniche.app;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

public class AdminReceiver extends DeviceAdminReceiver {

    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
        Toast.makeText(context, "ডিভাইস অ্যাডমিন সুরক্ষা চালু হয়েছে!", Toast.LENGTH_SHORT).show();
    }

    @Override
    public CharSequence onDisableRequested(Context context, Intent intent) {
        // কেউ সেটিংস থেকে ডিভাইস অ্যাডমিন অফ করার চেষ্টা করলে সতর্কবার্তা দেবে
        return "সতর্কতা: এই সুরক্ষা বন্ধ করতে অ্যাডমিনের টেলিগ্রাম পারমিশন কোড প্রয়োজন!";
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
        Toast.makeText(context, "ডিভাইস অ্যাডমিন সুরক্ষা বন্ধ করা হয়েছে।", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onPasswordFailed(Context context, Intent intent) {
        super.onPasswordFailed(context, intent);
        handlePasswordFailed(context);
    }

    @Override
    public void onPasswordFailed(Context context, Intent intent, android.os.UserHandle user) {
        super.onPasswordFailed(context, intent, user);
        handlePasswordFailed(context);
    }

    private void handlePasswordFailed(Context context) {
        // প্রসেসর যেন সাথে সাথে স্লিপে না যায় সেজন্য তাত্ক্ষণিক WakeLock নেওয়া
        try {
            android.os.PowerManager pm = (android.os.PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                android.os.PowerManager.WakeLock wl = pm.newWakeLock(android.os.PowerManager.PARTIAL_WAKE_LOCK, "Helpniche:AdminReceiverWakeLock");
                wl.acquire(8000);
            }
        } catch (Exception ignored) {}

        try {
            android.content.SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            boolean enabled = prefs.getBoolean("intruder_selfie_enabled", false);
            if (!enabled) return;

            // ক্যামেরা পারমিশন দেওয়া আছে কি না চেক
            if (androidx.core.content.ContextCompat.checkSelfPermission(context, android.Manifest.permission.CAMERA)
                    != android.content.pm.PackageManager.PERMISSION_GRANTED) {
                return;
            }

            int threshold = prefs.getInt("intruder_selfie_threshold", 1);
            int currentFailed = prefs.getInt("intruder_failed_attempts", 0) + 1;
            prefs.edit().putInt("intruder_failed_attempts", currentFailed).apply();

            if (currentFailed >= threshold) {
                Intent serviceIntent = new Intent(context, IntruderCaptureService.class);
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    context.startForegroundService(serviceIntent);
                } else {
                    context.startService(serviceIntent);
                }
            }
        } catch (Exception e) {
            android.util.Log.e("AdminReceiver", "Error in handlePasswordFailed", e);
        }
    }

    @Override
    public void onPasswordSucceeded(Context context, Intent intent) {
        super.onPasswordSucceeded(context, intent);
        try {
            android.content.SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            prefs.edit().putInt("intruder_failed_attempts", 0).apply();
        } catch (Exception ignored) {}
    }
}
