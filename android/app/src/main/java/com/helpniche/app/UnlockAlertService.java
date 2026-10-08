package com.helpniche.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

public class UnlockAlertService extends Service {

    private static final String TAG = "UnlockAlertService";
    private static final String CHANNEL_ID = "UnlockAlertChannel";
    private static final int NOTIFICATION_ID = 888;

    private ScreenUnlockReceiver unlockReceiver = null;

    public static void startService(Context context) {
        if (context == null) return;
        try {
            Intent intent = new Intent(context, UnlockAlertService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, intent);
            } else {
                context.startService(intent);
            }
            Log.i(TAG, "UnlockAlertService start requested.");
        } catch (Exception e) {
            Log.e(TAG, "Error starting UnlockAlertService", e);
        }
    }

    public static void stopService(Context context) {
        if (context == null) return;
        try {
            Intent intent = new Intent(context, UnlockAlertService.class);
            context.stopService(intent);
            Log.i(TAG, "UnlockAlertService stop requested.");
        } catch (Exception e) {
            Log.e(TAG, "Error stopping UnlockAlertService", e);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        SharedPreferences prefs = getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean("unlock_reminder_enabled", false);
        if (!enabled) {
            SharedPreferences altPrefs = getSharedPreferences("FocusDuroodPrefs", Context.MODE_PRIVATE);
            enabled = altPrefs.getBoolean("unlock_reminder_enabled", false);
        }

        if (!enabled) {
            Log.i(TAG, "Unlock alert is disabled. Stopping UnlockAlertService.");
            stopSelf();
            return START_NOT_STICKY;
        }

        startForegroundNotification();
        registerUnlockReceiver();

        return START_STICKY;
    }

    private void startForegroundNotification() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Helpniche Unlock Alert Service",
                        NotificationManager.IMPORTANCE_MIN
                );
                channel.setDescription("Background service for phone unlock Durood alert");
                channel.setShowBadge(false);
                channel.setSound(null, null);
                nm.createNotificationChannel(channel);
            }

            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setContentTitle("Helpniche Unlock Alert")
                    .setContentText("ফোন আনলক সতর্কতা ব্যাকগ্রাউন্ডে সক্রিয় রয়েছে")
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setPriority(NotificationCompat.PRIORITY_MIN)
                    .setOngoing(false)
                    .setAutoCancel(true)
                    .build();

            startForeground(NOTIFICATION_ID, notification);
        } catch (Exception e) {
            Log.e(TAG, "Error starting foreground notification for UnlockAlertService", e);
        }
    }

    private void registerUnlockReceiver() {
        if (unlockReceiver == null) {
            try {
                unlockReceiver = new ScreenUnlockReceiver();
                IntentFilter filter = new IntentFilter();
                filter.addAction(Intent.ACTION_USER_PRESENT);
                filter.addAction(Intent.ACTION_SCREEN_ON);
                filter.addAction(Intent.ACTION_SCREEN_OFF);
                filter.addAction(android.net.ConnectivityManager.CONNECTIVITY_ACTION);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    registerReceiver(unlockReceiver, filter, Context.RECEIVER_EXPORTED);
                } else {
                    registerReceiver(unlockReceiver, filter);
                }
                Log.i(TAG, "ScreenUnlockReceiver registered dynamically in UnlockAlertService.");
            } catch (Exception e) {
                Log.e(TAG, "Error registering ScreenUnlockReceiver in UnlockAlertService", e);
            }
        }
    }

    @Override
    public void onDestroy() {
        if (unlockReceiver != null) {
            try {
                unregisterReceiver(unlockReceiver);
                unlockReceiver = null;
                Log.i(TAG, "ScreenUnlockReceiver unregistered in UnlockAlertService.");
            } catch (Exception e) {
                Log.e(TAG, "Error unregistering ScreenUnlockReceiver", e);
            }
        }
        super.onDestroy();
    }
}
