package com.helpniche.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.Vibrator;
import android.util.Log;
import android.widget.Toast;
import androidx.core.app.NotificationCompat;

public class AlarmOverlayService extends Service {

    private static final String TAG = "AlarmOverlayService";
    private static final String CHANNEL_ID = "HelpnicheAlarmChannel_v12";
    private static final int NOTIFICATION_ID = 999;
    private static final long AUTO_MUTE_TIMEOUT_MS = 60000L; // 60s (1 minute) auto-mute limit

    private static volatile AlarmOverlayService instance = null;

    private MediaPlayer mediaPlayer = null;
    private Vibrator vibrator = null;
    private PowerManager.WakeLock wakeLock = null;
    private AudioFocusRequest audioFocusRequest = null;

    private int originalAlarmId = 0;
    private String titleStr = "Helpniche অ্যালার্ম";
    private String timeStr = "05:30 AM";
    private String audioTypeStr = "alarm";

    private final Handler autoMuteHandler = new Handler(Looper.getMainLooper());
    private final Runnable autoMuteRunnable = new Runnable() {
        @Override
        public void run() {
            Log.i(TAG, "Unattended alarm timeout (60s) reached. Auto-muting and rescheduling for next day...");
            performAutoMuteDismiss();
        }
    };

    public static void stopAlarmSound(Context context) {
        if (instance != null) {
            instance.stopAudioAndCleanup();
            instance.stopSelf();
            instance = null;
        }
        if (context != null) {
            try {
                Intent serviceIntent = new Intent(context, AlarmOverlayService.class);
                context.stopService(serviceIntent);
            } catch (Exception e) {
                Log.e(TAG, "Error stopping AlarmOverlayService via Intent", e);
            }
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        instance = this;

        if (intent != null) {
            originalAlarmId = intent.getIntExtra("originalAlarmId", intent.getIntExtra("id", 0));
            if (intent.hasExtra("title") && intent.getStringExtra("title") != null) {
                titleStr = intent.getStringExtra("title");
            }
            if (intent.hasExtra("time") && intent.getStringExtra("time") != null) {
                timeStr = intent.getStringExtra("time");
            }
            if (intent.hasExtra("audioType") && intent.getStringExtra("audioType") != null) {
                audioTypeStr = intent.getStringExtra("audioType");
            }
        }

        acquireWakeLock();
        startForegroundNotification();
        startSoundAndVibration(audioTypeStr);

        launchAlarmActivity();

        // 1 Minute Auto-Mute Timeout
        autoMuteHandler.removeCallbacks(autoMuteRunnable);
        autoMuteHandler.postDelayed(autoMuteRunnable, AUTO_MUTE_TIMEOUT_MS);

        return START_NOT_STICKY;
    }

    private void launchAlarmActivity() {
        try {
            Intent alarmActivityIntent = new Intent(this, AlarmAlertActivity.class);
            alarmActivityIntent.putExtra("originalAlarmId", originalAlarmId);
            alarmActivityIntent.putExtra("title", titleStr);
            alarmActivityIntent.putExtra("time", timeStr);
            alarmActivityIntent.putExtra("audioType", audioTypeStr);
            alarmActivityIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            );

            PendingIntent pi = PendingIntent.getActivity(
                this,
                originalAlarmId,
                alarmActivityIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            try {
                pi.send();
            } catch (Exception ex) {
                startActivity(alarmActivityIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error launching AlarmAlertActivity from Foreground Service", e);
        }
    }

    private void startForegroundNotification() {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Helpniche High Priority Lockscreen Alarms",
                    NotificationManager.IMPORTANCE_HIGH
                );
                channel.setDescription("Lockscreen Alarm Overlay Service");
                channel.setBypassDnd(true);
                channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                // Zero System Tone: Force-mute notification channel sound and vibration
                channel.setSound(null, null);
                channel.enableVibration(false);
                nm.createNotificationChannel(channel);
            }

            Intent alarmActivityIntent = new Intent(this, AlarmAlertActivity.class);
            alarmActivityIntent.putExtra("originalAlarmId", originalAlarmId);
            alarmActivityIntent.putExtra("title", titleStr);
            alarmActivityIntent.putExtra("time", timeStr);
            alarmActivityIntent.putExtra("audioType", audioTypeStr);
            alarmActivityIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

            PendingIntent pendingIntent = PendingIntent.getActivity(
                this, originalAlarmId, alarmActivityIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Intent dismissIntent = new Intent(this, AlarmReceiver.class);
            dismissIntent.setAction(AlarmReceiver.ACTION_DISMISS_ALARM);
            dismissIntent.putExtra("originalAlarmId", originalAlarmId);
            PendingIntent dismissPendingIntent = PendingIntent.getBroadcast(
                this, originalAlarmId + 1000, dismissIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Intent snoozeIntent = new Intent(this, AlarmReceiver.class);
            snoozeIntent.setAction(AlarmReceiver.ACTION_SNOOZE_ALARM);
            snoozeIntent.putExtra("originalAlarmId", originalAlarmId);
            snoozeIntent.putExtra("title", titleStr);
            snoozeIntent.putExtra("time", timeStr);
            snoozeIntent.putExtra("audioType", audioTypeStr);
            PendingIntent snoozePendingIntent = PendingIntent.getBroadcast(
                this, originalAlarmId + 2000, snoozeIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(titleStr)
                .setContentText(timeStr)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setSound(null)
                .setSilent(true)
                .setDefaults(0)
                .setContentIntent(pendingIntent)
                .setFullScreenIntent(pendingIntent, true)
                .addAction(0, "স্টপ (Stop)", dismissPendingIntent)
                .addAction(0, "স্নুজ (২ মিনিট)", snoozePendingIntent);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(NOTIFICATION_ID, builder.build(), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            } else {
                startForeground(NOTIFICATION_ID, builder.build());
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting foreground notification", e);
        }
    }

    private void acquireWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "Helpniche:AlarmOverlayWakeLock"
                );
                wakeLock.acquire(60000L);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error acquiring WakeLock", e);
        }
    }

    private void startSoundAndVibration(String audioType) {
        stopAudioAndCleanupPlayerOnly();
        try {
            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    audioFocusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE)
                        .setAudioAttributes(
                            new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_ALARM)
                                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                                .build()
                        )
                        .build();
                    audioManager.requestAudioFocus(audioFocusRequest);
                } else {
                    audioManager.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_EXCLUSIVE);
                }

                int maxVol = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                int curVol = audioManager.getStreamVolume(AudioManager.STREAM_ALARM);
                if (curVol < maxVol / 2) {
                    audioManager.setStreamVolume(AudioManager.STREAM_ALARM, (int) (maxVol * 0.8), 0);
                }
            }

            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (vibrator != null) {
                long[] pattern = {0, 800, 400, 800, 400};
                vibrator.vibrate(pattern, 0);
            }

            mediaPlayer = new MediaPlayer();
            boolean sourceSet = false;

            if (audioType != null && audioType.startsWith("prayer_")) {
                String prayerKey = audioType.replace("prayer_", "").toLowerCase().trim();
                String assetPath = "public/audio/prayer/" + prayerKey + ".mp3";
                try {
                    android.content.res.AssetFileDescriptor afd = getAssets().openFd(assetPath);
                    mediaPlayer.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
                    afd.close();
                    sourceSet = true;
                    Log.i(TAG, "Loaded prayer audio asset successfully: " + assetPath);
                } catch (Exception e) {
                    Log.w(TAG, "Prayer audio asset not found for " + assetPath + ", falling back to durood.mp3", e);
                }
            }

            if (!sourceSet) {
                int rawResId = getResources().getIdentifier("durood", "raw", getPackageName());
                if (rawResId != 0) {
                    mediaPlayer.setDataSource(this, Uri.parse("android.resource://" + getPackageName() + "/" + rawResId));
                } else {
                    Uri alertUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
                    if (alertUri != null) mediaPlayer.setDataSource(this, alertUri);
                }
            }

            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build()
            );

            // Requirement 1: Set looping to FALSE. Play custom audio EXACTLY 2 times using OnCompletionListener then auto-stop!
            mediaPlayer.setLooping(false);
            mediaPlayer.setOnCompletionListener(new MediaPlayer.OnCompletionListener() {
                private int playCount = 1;

                @Override
                public void onCompletion(MediaPlayer mp) {
                    if (playCount < 2) {
                        playCount++;
                        Log.i(TAG, "Custom audio completed 1st play. Starting 2nd play...");
                        try {
                            mp.seekTo(0);
                            mp.start();
                        } catch (Exception e) {
                            Log.e(TAG, "Error starting 2nd play, stopping audio", e);
                            stopAudioAndCleanup();
                            stopSelf();
                        }
                    } else {
                        Log.i(TAG, "Custom audio completed 2nd play! Auto-stopping audio and service.");
                        stopAudioAndCleanup();
                        stopSelf();
                    }
                }
            });

            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
            Log.e(TAG, "Error starting alarm sound in Overlay Service", e);
        }
    }

    /**
     * H16: Unattended auto-mute path. Previously this scheduled a 2-minute snooze
     * without advancing to the next day, so the alarm re-fired every 2 minutes
     * forever. Now a missed alarm is treated like a user dismissal: audio stops
     * and the alarm is rescheduled for its next daily occurrence (or disabled if
     * one-time) via scheduleNextDayAlarm().
     */
    private void performAutoMuteDismiss() {
        stopAudioAndCleanup();
        AlarmManagerHelper.scheduleNextDayAlarm(this, originalAlarmId);
        Toast.makeText(this, "অ্যালার্ম মিস হয়েছে। পরের বার নির্ধারিত সময়ে ডাকবে।", Toast.LENGTH_SHORT).show();
        stopSelf();
    }

    private void stopAudioAndCleanupPlayerOnly() {
        try {
            if (mediaPlayer != null) {
                try {
                    if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                } catch (Exception ignored) {}
                mediaPlayer.release();
                mediaPlayer = null;
            }
            if (vibrator != null) {
                vibrator.cancel();
                vibrator = null;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping player", e);
        }
    }

    public void stopAudioAndCleanup() {
        autoMuteHandler.removeCallbacks(autoMuteRunnable);
        stopAudioAndCleanupPlayerOnly();

        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                try { wakeLock.release(); } catch (Exception ignored) {}
                wakeLock = null;
            }

            AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (audioManager != null && audioFocusRequest != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioManager.abandonAudioFocusRequest(audioFocusRequest);
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE);
            } else {
                stopForeground(true);
            }

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(NOTIFICATION_ID);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error stopping audio and overlay", e);
        }
    }

    @Override
    public void onDestroy() {
        stopAudioAndCleanup();
        if (instance == this) {
            instance = null;
        }
        super.onDestroy();
    }
}
