package com.helpniche.app;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;
import android.view.KeyEvent;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class AlarmAlertActivity extends Activity {

    private static final String TAG = "AlarmAlertActivity";
    private static final long AUTO_MUTE_TIMEOUT_MS = 60000L; // Fallback timeout

    private PowerManager.WakeLock wakeLock = null;

    private int originalAlarmId = 0;
    private String titleStr = "Helpniche অ্যালার্ম";
    private String timeStr = "05:30 AM";
    private String audioTypeStr = "alarm";

    private final Handler autoMuteHandler = new Handler(Looper.getMainLooper());
    private final Runnable autoMuteRunnable = new Runnable() {
        @Override
        public void run() {
            Log.i(TAG, "Unattended alarm timeout reached. Stopping audio...");
            performHardStopAndDismiss();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null) {
                km.requestDismissKeyguard(this, null);
            }
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            );
        }

        getWindow().addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
        );

        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_alarm);

        acquireWakeLock();
        ensureAlarmVolume();

        Intent intent = getIntent();
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

        TextView tvTitle = findViewById(R.id.tv_alarm_title);
        TextView tvTime = findViewById(R.id.tv_alarm_time);
        Button btnStop = findViewById(R.id.btn_alarm_dismiss);
        Button btnSnooze = findViewById(R.id.btn_alarm_snooze);

        if (tvTitle != null) tvTitle.setText(titleStr);
        if (tvTime != null) tvTime.setText(timeStr);

        // Action 1: STOP Button (Solid Red Rounded Rectangle)
        if (btnStop != null) {
            btnStop.setOnClickListener(v -> performHardStopAndDismiss());
        }

        // Action 2: SNOOZE Button (2 Mins)
        if (btnSnooze != null) {
            btnSnooze.setOnClickListener(v -> performSnoozeTwoMinutes());
        }

        startAlarmSoundAndVibration();

        autoMuteHandler.removeCallbacks(autoMuteRunnable);
        autoMuteHandler.postDelayed(autoMuteRunnable, AUTO_MUTE_TIMEOUT_MS);
    }

    private void acquireWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                wakeLock = pm.newWakeLock(
                    PowerManager.FULL_WAKE_LOCK |
                    PowerManager.ACQUIRE_CAUSES_WAKEUP |
                    PowerManager.ON_AFTER_RELEASE,
                    "Helpniche:AlarmAlertActivityWakeLock"
                );
                wakeLock.acquire(60000L);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error acquiring WakeLock", e);
        }
    }

    private void ensureAlarmVolume() {
        try {
            AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                int maxVol = am.getStreamMaxVolume(AudioManager.STREAM_ALARM);
                int currentVol = am.getStreamVolume(AudioManager.STREAM_ALARM);
                if (currentVol < maxVol / 2) {
                    am.setStreamVolume(AudioManager.STREAM_ALARM, (int) (maxVol * 0.8), 0);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error ensuring alarm volume", e);
        }
    }

    private void startAlarmSoundAndVibration() {
        try {
            Intent serviceIntent = new Intent(this, AlarmOverlayService.class);
            serviceIntent.putExtra("originalAlarmId", originalAlarmId);
            serviceIntent.putExtra("title", titleStr);
            serviceIntent.putExtra("time", timeStr);
            serviceIntent.putExtra("audioType", audioTypeStr);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting AlarmOverlayService", e);
        }
    }

    /**
     * Requirement 3: Permanent Hard Stop on Volume or Power Key Press
     */
    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP ||
            keyCode == KeyEvent.KEYCODE_VOLUME_DOWN ||
            keyCode == KeyEvent.KEYCODE_VOLUME_MUTE ||
            keyCode == KeyEvent.KEYCODE_POWER) {
            Log.i(TAG, "Hardware key pressed (Volume/Power). Hard-stopping alarm permanently...");
            performHardStopAndDismiss();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        int keyCode = event.getKeyCode();
        if (keyCode == KeyEvent.KEYCODE_VOLUME_UP ||
            keyCode == KeyEvent.KEYCODE_VOLUME_DOWN ||
            keyCode == KeyEvent.KEYCODE_VOLUME_MUTE ||
            keyCode == KeyEvent.KEYCODE_POWER) {
            if (event.getAction() == KeyEvent.ACTION_DOWN) {
                Log.i(TAG, "dispatchKeyEvent caught Volume/Power key: " + keyCode);
                performHardStopAndDismiss();
            }
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    private void markDismissedFlag() {
        try {
            SharedPreferences prefs = getSharedPreferences("HelpnicheAlarmPrefs", Context.MODE_PRIVATE);
            String todayDateStr = new SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(new Date());
            prefs.edit().putBoolean("is_dismissed_" + originalAlarmId + "_" + todayDateStr, true).apply();
        } catch (Exception e) {
            Log.e(TAG, "Error marking dismissed flag", e);
        }
    }

    /**
     * Action 1: STOP (Hard Stop)
     * Completely stops sound/vibration permanently, cancels 2-minute snooze, and schedules next occurrence.
     */
    private void performHardStopAndDismiss() {
        autoMuteHandler.removeCallbacks(autoMuteRunnable);
        AlarmOverlayService.stopAlarmSound(this);
        markDismissedFlag();

        AlarmManagerHelper.cancelSnoozeAlarm(this, originalAlarmId);
        AlarmManagerHelper.scheduleNextDayAlarm(this, originalAlarmId);

        Toast.makeText(this, "অ্যালার্ম বন্ধ করা হলো।", Toast.LENGTH_SHORT).show();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            finishAndRemoveTask();
        } else {
            finish();
        }
    }

    /**
     * Action 2: SNOOZE (2 Mins)
     * Stops current sound and reschedules exact 2-minute snooze follow-up.
     */
    private void performSnoozeTwoMinutes() {
        autoMuteHandler.removeCallbacks(autoMuteRunnable);
        AlarmOverlayService.stopAlarmSound(this);
        markDismissedFlag();

        AlarmManagerHelper.scheduleSnoozeAlarm(this, originalAlarmId, titleStr, timeStr, audioTypeStr);

        Toast.makeText(this, "২ মিনিট পর আবার ডাকবে।", Toast.LENGTH_SHORT).show();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            finishAndRemoveTask();
        } else {
            finish();
        }
    }

    @Override
    protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        Log.i(TAG, "User moved app to background. Stopping sound and snoozing...");
        performSnoozeTwoMinutes();
    }

    private void stopPlaybackAndCleanup() {
        autoMuteHandler.removeCallbacks(autoMuteRunnable);

        try {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
                wakeLock = null;
            }

            AlarmOverlayService.stopAlarmSound(this);

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(999);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error during playback cleanup", e);
        }
    }

    @Override
    protected void onDestroy() {
        stopPlaybackAndCleanup();
        super.onDestroy();
    }
}
