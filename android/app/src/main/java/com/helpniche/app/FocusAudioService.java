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
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import androidx.core.app.NotificationCompat;

public class FocusAudioService extends Service {

    private static final String TAG = "FocusAudioService";
    private static final String CHANNEL_ID = "FocusAudioPlaybackChannel";
    private static final int NOTIFICATION_ID = 555;

    public static final String ACTION_PLAY = "com.helpniche.app.ACTION_PLAY_FOCUS_AUDIO";
    public static final String ACTION_STOP = "com.helpniche.app.ACTION_STOP_FOCUS_AUDIO";
    public static final String ACTION_SET_MUTED = "com.helpniche.app.ACTION_SET_MUTED_FOCUS_AUDIO";

    public static final String EXTRA_AUDIO_URI = "extra_audio_uri";
    public static final String EXTRA_AUDIO_TYPE = "extra_audio_type"; // "library", "device", "raw", "url"
    public static final String EXTRA_AUDIO_NAME = "extra_audio_name";

    private MediaPlayer mediaPlayer = null;
    private boolean isMuted = false;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                stopAudioPlayback();
                return START_NOT_STICKY;
            }
            if (ACTION_SET_MUTED.equals(action)) {
                isMuted = intent.getBooleanExtra("is_muted", false);
                if (mediaPlayer != null) {
                    try {
                        float vol = isMuted ? 0.0f : 1.0f;
                        mediaPlayer.setVolume(vol, vol);
                        Log.i(TAG, "FocusAudioService setVolume: " + vol);
                    } catch (Exception e) {
                        Log.e(TAG, "Error setting volume on MediaPlayer", e);
                    }
                }
                return START_STICKY;
            }
        }

        String audioUri = intent != null ? intent.getStringExtra(EXTRA_AUDIO_URI) : null;
        String audioType = intent != null ? intent.getStringExtra(EXTRA_AUDIO_TYPE) : "library";
        String audioName = intent != null ? intent.getStringExtra(EXTRA_AUDIO_NAME) : "Focus Audio";

        startForegroundServiceNotification(audioName);
        startAudioPlayback(audioUri, audioType);

        return START_STICKY;
    }

    private void startForegroundServiceNotification(String trackName) {
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && nm != null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Focus Session Audio Playback",
                    NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Background audio playback during deep focus session");
                nm.createNotificationChannel(channel);
            }

            Intent appIntent = new Intent(this, MainActivity.class);
            appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, appIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("Deep Focus Session Active")
                .setContentText("Playing: " + (trackName != null ? trackName : "Focus Sound"))
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .setContentIntent(pendingIntent)
                .build();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting foreground notification for audio service", e);
        }
    }

    private void startAudioPlayback(String uriStr, String type) {
        stopMediaPlayer();

        try {
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setAudioAttributes(
                new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build()
            );

            if (uriStr != null && !uriStr.trim().isEmpty()) {
                if ("raw".equalsIgnoreCase(type) || uriStr.startsWith("raw/")) {
                    String resourceName = uriStr.replace("raw/", "");
                    int rawResId = getResources().getIdentifier(resourceName, "raw", getPackageName());
                    if (rawResId == 0) rawResId = R.raw.durood;
                    Uri rawUri = Uri.parse("android.resource://" + getPackageName() + "/" + rawResId);
                    mediaPlayer.setDataSource(this, rawUri);
                } else {
                    Uri audioUri = Uri.parse(uriStr);
                    mediaPlayer.setDataSource(this, audioUri);
                }
            } else {
                // Default fallback sound: R.raw.durood
                Uri rawUri = Uri.parse("android.resource://" + getPackageName() + "/" + R.raw.durood);
                mediaPlayer.setDataSource(this, rawUri);
            }

            mediaPlayer.setLooping(true);
            mediaPlayer.prepareAsync();
            mediaPlayer.setOnPreparedListener(mp -> {
                try {
                    mp.start();
                    Log.i(TAG, "Focus Audio playback started successfully.");
                } catch (Exception e) {
                    Log.e(TAG, "Error starting MediaPlayer after prepare", e);
                }
            });
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "MediaPlayer error: " + what + ", " + extra);
                stopAudioPlayback();
                return true;
            });

        } catch (Exception e) {
            Log.e(TAG, "Error setting up MediaPlayer for URI: " + uriStr, e);
            stopAudioPlayback();
        }
    }

    private void stopMediaPlayer() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) {
                    mediaPlayer.stop();
                }
                mediaPlayer.release();
            } catch (Exception e) {
                Log.e(TAG, "Error releasing MediaPlayer", e);
            }
            mediaPlayer = null;
        }
    }

    private void stopAudioPlayback() {
        stopMediaPlayer();
        try {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } catch (Exception ignored) {}
        stopSelf();
    }

    @Override
    public void onDestroy() {
        stopMediaPlayer();
        super.onDestroy();
    }
}
