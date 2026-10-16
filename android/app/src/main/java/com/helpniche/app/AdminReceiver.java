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
                // মূল ব্যাকগ্রাউন্ড সার্ভিস (লক স্ক্রিনে ইনস্ট্যান্ট ছবি তোলার অরিজিনাল কার্যকরী মেকানিজম)
                try {
                    Intent serviceIntent = new Intent(context, IntruderCaptureService.class);
                    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent);
                    } else {
                        context.startService(serviceIntent);
                    }
                } catch (Exception serviceEx) {
                    android.util.Log.e("AdminReceiver", "startForegroundService error, attempting fallback activity", serviceEx);
                    try {
                        Intent actIntent = new Intent(context, IntruderCaptureActivity.class);
                        actIntent.addFlags(
                                Intent.FLAG_ACTIVITY_NEW_TASK |
                                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                                Intent.FLAG_ACTIVITY_NO_ANIMATION
                        );
                        context.startActivity(actIntent);
                    } catch (Exception actEx) {
                        android.util.Log.e("AdminReceiver", "startActivity fallback error: " + actEx.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            android.util.Log.e("AdminReceiver", "Error in onPasswordFailed", e);
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
