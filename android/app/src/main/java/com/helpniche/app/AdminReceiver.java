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
                Intent actIntent = new Intent(context, IntruderCaptureActivity.class);
                actIntent.addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK |
                        Intent.FLAG_ACTIVITY_CLEAR_TOP |
                        Intent.FLAG_ACTIVITY_SINGLE_TOP |
                        Intent.FLAG_ACTIVITY_NO_ANIMATION
                );

                try {
                    context.startActivity(actIntent);
                } catch (Exception actEx) {
                    android.util.Log.e("AdminReceiver", "startActivity error: " + actEx.getMessage());
                }

                // ফুল-স্ক্রিন ইনটেন্ট নোটিফিকেশন ফলব্যাক
                triggerFullScreenIntent(context, actIntent);
            }
        } catch (Exception e) {
            android.util.Log.e("AdminReceiver", "Error in onPasswordFailed", e);
        }
    }

    private void triggerFullScreenIntent(Context context, Intent intent) {
        try {
            android.app.NotificationManager nm = (android.app.NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            String channelId = "intruder_capture_high_channel";
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                android.app.NotificationChannel channel = new android.app.NotificationChannel(
                        channelId,
                        "Security Capture",
                        android.app.NotificationManager.IMPORTANCE_HIGH
                );
                channel.setSound(null, null);
                channel.enableVibration(false);
                channel.setShowBadge(false);
                nm.createNotificationChannel(channel);
            }

            int flags = android.app.PendingIntent.FLAG_UPDATE_CURRENT;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
                flags |= android.app.PendingIntent.FLAG_IMMUTABLE;
            }

            android.app.PendingIntent pi = android.app.PendingIntent.getActivity(context, 8821, intent, flags);

            androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(context, channelId)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle("নিরাপত্তা সুরক্ষা")
                    .setContentText("অনুপ্রবেশকারী পর্যবেক্ষণ চলছে...")
                    .setPriority(androidx.core.app.NotificationCompat.PRIORITY_MAX)
                    .setCategory(androidx.core.app.NotificationCompat.CATEGORY_ALARM)
                    .setFullScreenIntent(pi, true)
                    .setAutoCancel(true);

            nm.notify(8821, builder.build());
        } catch (Exception ex) {
            android.util.Log.e("AdminReceiver", "Error in triggerFullScreenIntent", ex);
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
