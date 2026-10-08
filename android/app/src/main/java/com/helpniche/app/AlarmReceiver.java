package com.helpniche.app;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;
import android.widget.Toast;
import androidx.core.content.ContextCompat;

public class AlarmReceiver extends BroadcastReceiver {

    private static final String TAG = "AlarmReceiver";
    private static final int NOTIFICATION_ID = 999;

    public static final String ACTION_FIRE_ALARM = "ACTION_FIRE_ALARM";
    public static final String ACTION_DISMISS_ALARM = "ACTION_DISMISS_ALARM";
    public static final String ACTION_SNOOZE_ALARM = "ACTION_SNOOZE_ALARM";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null || intent == null) return;

        String action = intent.getAction();
        Log.i(TAG, "AlarmReceiver intercepted system broadcast action: " + action);

        // Handle Notification Action: DISMISS
        if (ACTION_DISMISS_ALARM.equals(action)) {
            int originalAlarmId = intent.getIntExtra("originalAlarmId", intent.getIntExtra("id", 0));
            Log.i(TAG, "Notification DISMISS clicked for originalId=" + originalAlarmId);

            stopAlarmServicesAndNotification(context);
            AlarmManagerHelper.scheduleNextDayAlarm(context, originalAlarmId);
            Toast.makeText(context, "অ্যালার্ম বন্ধ করা হলো।", Toast.LENGTH_SHORT).show();
            return;
        }

        // Handle Notification Action: SNOOZE (2 Mins)
        if (ACTION_SNOOZE_ALARM.equals(action)) {
            int originalAlarmId = intent.getIntExtra("originalAlarmId", intent.getIntExtra("id", 0));
            String title = intent.getStringExtra("title");
            String timeStr = intent.getStringExtra("time");
            String audioType = intent.getStringExtra("audioType");

            Log.i(TAG, "Notification SNOOZE clicked for originalId=" + originalAlarmId);

            stopAlarmServicesAndNotification(context);
            AlarmManagerHelper.scheduleSnoozeAlarm(context, originalAlarmId, title, timeStr, audioType);
            Toast.makeText(context, "২ মিনিট পর আবার ডাকবে।", Toast.LENGTH_SHORT).show();
            return;
        }

        // Handle Unlock Protection Restart Action
        if ("ACTION_RESTART_VPN_PROTECTION".equals(action)) {
            Log.i(TAG, "Unlock duration expired! Force launching MainActivity & restarting LocalDnsVpnService...");
            BlockerAccessibilityService.setUnlockDuration(context, 0);

            try {
                Intent vpnIntent = new Intent(context, LocalDnsVpnService.class);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    context.startForegroundService(vpnIntent);
                } else {
                    context.startService(vpnIntent);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error restarting LocalDnsVpnService", e);
            }

            try {
                Intent appIntent = new Intent(context, MainActivity.class);
                appIntent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK |
                    Intent.FLAG_ACTIVITY_CLEAR_TOP |
                    Intent.FLAG_ACTIVITY_SINGLE_TOP |
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                );
                appIntent.putExtra("unlock_expired", true);
                context.startActivity(appIntent);
            } catch (Exception e) {
                Log.e(TAG, "Error force launching MainActivity", e);
            }
            return;
        }

        // Handle Focus Task Reminder Notification
        if ("ACTION_TASK_NOTIFICATION".equals(action)) {
            // ১. ওয়েক-লক দিয়ে স্ক্রিন ও প্রসেসর সাথে সাথে জাগিয়ে তোলা
            try {
                PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
                if (pm != null) {
                    PowerManager.WakeLock wakeLock = pm.newWakeLock(
                        PowerManager.FULL_WAKE_LOCK |
                        PowerManager.ACQUIRE_CAUSES_WAKEUP |
                        PowerManager.ON_AFTER_RELEASE,
                        "Helpniche:TaskNotificationWakeLock"
                    );
                    wakeLock.acquire(15000L); // ১৫ সেকেন্ড ওয়েক-লক স্ক্রিন অন করার জন্য
                }
            } catch (Exception ignored) {}

            try {
                String title = intent.getStringExtra("title");
                String details = intent.getStringExtra("details");
                int taskId = intent.getIntExtra("taskId", 1001);

                NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                String channelId = "helpniche_task_channel_sound_v1";

                android.net.Uri soundUri = android.net.Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.task_sound);

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    android.app.NotificationChannel channel = new android.app.NotificationChannel(
                        channelId,
                        "ফোকাস টাস্ক রিমাইন্ডার",
                        NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setDescription("ফোকাস টাস্ক কাজের জরুরি নোটিফিকেশন");
                    channel.enableVibration(true);
                    channel.setVibrationPattern(new long[]{0, 300, 200, 300});

                    android.media.AudioAttributes audioAttributes = new android.media.AudioAttributes.Builder()
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                        .build();
                    channel.setSound(soundUri, audioAttributes);
                    channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
                    nm.createNotificationChannel(channel);
                }

                Intent appIntent = new Intent(context, MainActivity.class);
                appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                android.app.PendingIntent pi = android.app.PendingIntent.getActivity(
                    context,
                    taskId,
                    appIntent,
                    android.app.PendingIntent.FLAG_UPDATE_CURRENT | android.app.PendingIntent.FLAG_IMMUTABLE
                );

                androidx.core.app.NotificationCompat.Builder builder = new androidx.core.app.NotificationCompat.Builder(context, channelId)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setContentTitle(title != null && !title.isEmpty() ? title : "ফোকাস টাস্ক")
                    .setContentText(details != null && !details.isEmpty() ? details : "কাজের সময় হয়েছে!")
                    .setPriority(androidx.core.app.NotificationCompat.PRIORITY_MAX)
                    .setCategory(androidx.core.app.NotificationCompat.CATEGORY_REMINDER)
                    .setVisibility(androidx.core.app.NotificationCompat.VISIBILITY_PUBLIC)
                    .setSound(soundUri)
                    .setVibrate(new long[]{0, 300, 200, 300})
                    .setAutoCancel(true)
                    .setContentIntent(pi);

                nm.notify(taskId, builder.build());

                // নিশ্চয়তার জন্য সরাসরি MediaPlayer দিয়েও সাউন্ড বাজানো
                try {
                    android.media.MediaPlayer mp = android.media.MediaPlayer.create(context, R.raw.task_sound);
                    if (mp != null) {
                        mp.setOnCompletionListener(android.media.MediaPlayer::release);
                        mp.start();
                    }
                } catch (Exception ignored) {}
            } catch (Exception e) {
                Log.e(TAG, "Error showing task notification", e);
            }
            return;
        }

        // Handle Fire Alarm Event (App Killed / Phone Locked / Background)
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                PowerManager.WakeLock wakeLock = pm.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "Helpniche:AlarmReceiverWakeLock"
                );
                wakeLock.acquire(30000L);
            }

            int id = intent.getIntExtra("id", (int) System.currentTimeMillis());
            int originalAlarmId = intent.getIntExtra("originalAlarmId", id);
            String title = intent.getStringExtra("title");
            String timeStr = intent.getStringExtra("time");
            String audioType = intent.getStringExtra("audioType");

            if (title == null || title.trim().isEmpty()) title = "Helpniche অ্যালার্ম";
            if (timeStr == null || timeStr.trim().isEmpty()) timeStr = "⏰ সময় হয়েছে!";

            // 1. Start AlarmOverlayService as Foreground Service (Posts FullScreenIntent notification & manages sound)
            Intent serviceIntent = new Intent(context, AlarmOverlayService.class);
            serviceIntent.putExtra("id", id);
            serviceIntent.putExtra("originalAlarmId", originalAlarmId);
            serviceIntent.putExtra("title", title);
            serviceIntent.putExtra("time", timeStr);
            serviceIntent.putExtra("audioType", audioType);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, serviceIntent);
            } else {
                context.startService(serviceIntent);
            }

            // 2. Direct startActivity attempt to AlarmAlertActivity
            Intent alarmActivityIntent = new Intent(context, AlarmAlertActivity.class);
            alarmActivityIntent.putExtra("id", id);
            alarmActivityIntent.putExtra("originalAlarmId", originalAlarmId);
            alarmActivityIntent.putExtra("title", title);
            alarmActivityIntent.putExtra("time", timeStr);
            alarmActivityIntent.putExtra("audioType", audioType);
            alarmActivityIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            );

            try {
                context.startActivity(alarmActivityIntent);
            } catch (Exception e) {
                Log.i(TAG, "Direct startActivity from receiver restricted, AlarmOverlayService fullScreenIntent will handle lockscreen display", e);
            }

        } catch (Exception e) {
            Log.e(TAG, "Error in AlarmReceiver onReceive", e);
        }
    }

    private void stopAlarmServicesAndNotification(Context context) {
        try {
            Intent serviceIntent = new Intent(context, AlarmOverlayService.class);
            context.stopService(serviceIntent);

            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(NOTIFICATION_ID);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping alarm services and notification", e);
        }
    }
}
