package com.helpniche.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import androidx.core.app.NotificationCompat;

import java.util.Locale;

public class FloatingBubbleService extends Service {

    private static final String TAG = "FloatingBubbleService";
    private static final String CHANNEL_ID = "FocusShieldBubbleChannel";
    private static final int NOTIFICATION_ID = 99;

    private WindowManager windowManager;
    private View bubbleView;
    private TextView labelTextView;
    private TextView timerTextView;
    private GradientDrawable bubbleBackground;
    private WindowManager.LayoutParams windowParams;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable countdownRunnable;

    private int remainingSeconds = 0;
    private boolean isBlinkingRed = false;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            int minutes = intent.getIntExtra("minutes", 0);
            int seconds = intent.getIntExtra("seconds", 0);
            if (minutes > 0 || seconds > 0) {
                remainingSeconds = (minutes * 60) + seconds;
            } else {
                remainingSeconds = 300; // Default 5 minutes
            }
        } else if (remainingSeconds <= 0) {
            remainingSeconds = 300;
        }

        // Stop any active countdown task to avoid duplicate ticking
        if (countdownRunnable != null) {
            handler.removeCallbacks(countdownRunnable);
            countdownRunnable = null;
        }

        startForegroundNotification(formatMMSS(remainingSeconds));

        if (Settings.canDrawOverlays(this)) {
            showFloatingBubbleView();
            startCountdownTimer();
        } else {
            Log.w(TAG, "Cannot draw overlay: SYSTEM_ALERT_WINDOW permission missing");
            // Still run background countdown to ensure protection re-locks on time
            startCountdownTimer();
        }

        return START_STICKY;
    }

    private void startForegroundNotification(String timeText) {
        try {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && manager != null) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID,
                        "Helpniche Floating Bubble Counter",
                        NotificationManager.IMPORTANCE_LOW
                );
                channel.setDescription("Floating countdown overlay notification");
                manager.createNotificationChannel(channel);
            }

            Intent appIntent = new Intent(this, MainActivity.class);
            appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            PendingIntent pendingIntent = PendingIntent.getActivity(
                this, 0, appIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                    .setContentTitle("Helpniche - Temporary Unlock Active")
                    .setContentText("Remaining Time: " + timeText)
                    .setSmallIcon(R.mipmap.ic_launcher)
                    .setPriority(NotificationCompat.PRIORITY_LOW)
                    .setOngoing(true)
                    .setContentIntent(pendingIntent)
                    .build();

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting foreground notification for bubble", e);
        }
    }

    private void updateNotificationText(String timeText) {
        try {
            NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                Intent appIntent = new Intent(this, MainActivity.class);
                appIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                PendingIntent pendingIntent = PendingIntent.getActivity(
                    this, 0, appIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
                        .setContentTitle("Helpniche - Temporary Unlock Active")
                        .setContentText("Remaining Time: " + timeText)
                        .setSmallIcon(R.mipmap.ic_launcher)
                        .setPriority(NotificationCompat.PRIORITY_LOW)
                        .setOngoing(true)
                        .setContentIntent(pendingIntent)
                        .build();

                manager.notify(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error updating notification", e);
        }
    }

    private void showFloatingBubbleView() {
        try {
            windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
            if (windowManager == null) return;

            if (bubbleView != null) {
                // View already attached, just update timer text and reset background style
                if (timerTextView != null) {
                    timerTextView.setText(formatMMSS(remainingSeconds));
                }
                resetBubbleStyleNormal();
                return;
            }

            LinearLayout layout = new LinearLayout(this);
            layout.setOrientation(LinearLayout.VERTICAL);
            layout.setGravity(Gravity.CENTER);
            int paddingPx = dpToPx(10);
            layout.setPadding(paddingPx, paddingPx, paddingPx, paddingPx);

            bubbleBackground = new GradientDrawable();
            bubbleBackground.setShape(GradientDrawable.RECTANGLE);
            bubbleBackground.setCornerRadius(dpToPx(20));
            bubbleBackground.setColor(Color.parseColor("#1B5E20"));
            bubbleBackground.setStroke(dpToPx(2), Color.parseColor("#00E676"));
            layout.setBackground(bubbleBackground);

            labelTextView = new TextView(this);
            labelTextView.setText("UNLOCKED");
            labelTextView.setTextColor(Color.parseColor("#00E676"));
            labelTextView.setTextSize(10);
            labelTextView.setGravity(Gravity.CENTER);
            labelTextView.setTypeface(null, Typeface.BOLD);

            timerTextView = new TextView(this);
            timerTextView.setText(formatMMSS(remainingSeconds));
            timerTextView.setTextColor(Color.WHITE);
            timerTextView.setTextSize(14);
            timerTextView.setGravity(Gravity.CENTER);
            timerTextView.setTypeface(null, Typeface.BOLD);

            layout.addView(labelTextView);
            layout.addView(timerTextView);

            bubbleView = layout;

            int layoutType;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                layoutType = WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;
            } else {
                layoutType = WindowManager.LayoutParams.TYPE_PHONE;
            }

            windowParams = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    layoutType,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                    PixelFormat.TRANSLUCENT
            );

            windowParams.gravity = Gravity.TOP | Gravity.START;
            windowParams.x = 100;
            windowParams.y = 200;

            bubbleView.setOnTouchListener(new View.OnTouchListener() {
                private int initialX;
                private int initialY;
                private float initialTouchX;
                private float initialTouchY;

                @Override
                public boolean onTouch(View v, MotionEvent event) {
                    if (windowParams == null) return false;
                    switch (event.getAction()) {
                        case MotionEvent.ACTION_DOWN:
                            initialX = windowParams.x;
                            initialY = windowParams.y;
                            initialTouchX = event.getRawX();
                            initialTouchY = event.getRawY();
                            return true;

                        case MotionEvent.ACTION_MOVE:
                            windowParams.x = initialX + (int) (event.getRawX() - initialTouchX);
                            windowParams.y = initialY + (int) (event.getRawY() - initialTouchY);
                            if (windowManager != null && bubbleView != null) {
                                try {
                                    windowManager.updateViewLayout(bubbleView, windowParams);
                                } catch (Exception e) {
                                    Log.e(TAG, "Error updating layout on touch move", e);
                                }
                            }
                            return true;
                    }
                    return false;
                }
            });

            windowManager.addView(bubbleView, windowParams);
            Log.i(TAG, "Floating bubble view added successfully.");
        } catch (Exception e) {
            Log.e(TAG, "Error showing floating bubble view", e);
        }
    }

    private void resetBubbleStyleNormal() {
        if (bubbleBackground != null) {
            bubbleBackground.setColor(Color.parseColor("#1B5E20"));
            bubbleBackground.setStroke(dpToPx(2), Color.parseColor("#00E676"));
        }
        if (labelTextView != null) {
            labelTextView.setText("UNLOCKED");
            labelTextView.setTextColor(Color.parseColor("#00E676"));
        }
        if (timerTextView != null) {
            timerTextView.setTextColor(Color.WHITE);
        }
        isBlinkingRed = false;
    }

    private void setBubbleStyleRedAlert(boolean blinkState) {
        if (bubbleBackground != null) {
            if (blinkState) {
                bubbleBackground.setColor(Color.parseColor("#D50000")); // Solid Warning Red
                bubbleBackground.setStroke(dpToPx(3), Color.parseColor("#FFEB3B")); // Bright Yellow Border
            } else {
                bubbleBackground.setColor(Color.parseColor("#8B0000")); // Dark Red Alert
                bubbleBackground.setStroke(dpToPx(3), Color.parseColor("#FF5252")); // Bright Red Border
            }
        }
        if (labelTextView != null) {
            labelTextView.setText("EXPIRING");
            labelTextView.setTextColor(Color.parseColor("#FFEB3B"));
        }
        if (timerTextView != null) {
            timerTextView.setTextColor(Color.WHITE);
        }
    }

    private void startCountdownTimer() {
        countdownRunnable = new Runnable() {
            @Override
            public void run() {
                remainingSeconds--;

                String timeText = formatMMSS(remainingSeconds);

                if (timerTextView != null) {
                    timerTextView.setText(timeText);
                }

                if (remainingSeconds % 5 == 0 || remainingSeconds <= 10) {
                    updateNotificationText(timeText);
                }

                // Last 10 seconds: RED ALERT with blinking/pulsing signal
                if (remainingSeconds <= 10 && remainingSeconds > 0) {
                    isBlinkingRed = !isBlinkingRed;
                    setBubbleStyleRedAlert(isBlinkingRed);
                }

                if (remainingSeconds <= 0) {
                    onUnlockTimeExpired();
                } else {
                    handler.postDelayed(this, 1000);
                }
            }
        };
        handler.postDelayed(countdownRunnable, 1000);
    }

    private void onUnlockTimeExpired() {
        if (countdownRunnable != null) {
            handler.removeCallbacks(countdownRunnable);
            countdownRunnable = null;
        }

        if (windowManager != null && bubbleView != null) {
            try {
                windowManager.removeView(bubbleView);
            } catch (Exception e) {
                Log.e(TAG, "Error removing bubble view", e);
            }
            bubbleView = null;
        }

        BlockerAccessibilityService.setUnlockDuration(this, 0);

        try {
            Intent vpnIntent = new Intent(this, LocalDnsVpnService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(vpnIntent);
            } else {
                startService(vpnIntent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error restarting VPN service on unlock expiry", e);
        }

        try {
            Intent appIntent = new Intent(this, MainActivity.class);
            appIntent.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK |
                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            );
            appIntent.putExtra("unlock_expired", true);
            startActivity(appIntent);
        } catch (Exception e) {
            Log.e(TAG, "Error force launching MainActivity on bubble expiry", e);
        }

        Toast.makeText(this, "সাময়িক আনলক সময় শেষ! সিকিউরিটি প্রোটেকশন পুনরায় শতভাগ সক্রিয় করা হলো।", Toast.LENGTH_LONG).show();

        stopSelf();
    }

    private String formatMMSS(int totalSec) {
        if (totalSec <= 0) return "00:00";
        int m = totalSec / 60;
        int s = totalSec % 60;
        return String.format(Locale.US, "%02d:%02d", m, s);
    }

    private int dpToPx(int dp) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(dp * density);
    }

    @Override
    public void onDestroy() {
        if (handler != null && countdownRunnable != null) {
            handler.removeCallbacks(countdownRunnable);
            countdownRunnable = null;
        }
        if (windowManager != null && bubbleView != null) {
            try {
                windowManager.removeView(bubbleView);
            } catch (Exception ignored) {}
            bubbleView = null;
        }
        super.onDestroy();
    }
}
