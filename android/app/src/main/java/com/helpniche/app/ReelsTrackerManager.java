package com.helpniche.app;

import android.accessibilityservice.AccessibilityService;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import com.getcapacitor.JSObject;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Iterator;
import java.util.Locale;

public class ReelsTrackerManager {

    private static final String TAG = "ReelsTrackerManager";
    private static final String PREFS_NAME = "HelpnichePrefs";

    public static final String PREF_REELS_TODAY_DATE = "reels_today_date";
    public static final String PREF_REELS_TODAY_COUNT = "reels_today_count";
    public static final String PREF_REELS_DAILY_LIMIT = "reels_daily_limit";
    public static final String PREF_REELS_HISTORY_JSON = "reels_history_json";
    public static final String PREF_REELS_PEAK_COUNT = "reels_peak_count";
    public static final String PREF_REELS_PEAK_DATE = "reels_peak_date";

    public static final int MAX_HARD_CAP_LIMIT = 1000;

    private static final Handler mainHandler = new Handler(Looper.getMainLooper());
    private static WindowManager windowManager = null;
    private static View floatingPillView = null;
    private static TextView tvPillCount = null;
    private static View alertDialogView = null;

    private static long lastIncrementTime = 0;
    private static int lastAlertedMilestone = 0;
    private static boolean isOverlayVisible = false;
    private static String currentReelSignature = "";
    private static long lastReelChangeTime = 0;

    private static final Runnable hideRunnable = () -> {
        try {
            if (floatingPillView != null) {
                floatingPillView.setVisibility(View.GONE);
            }
            isOverlayVisible = false;
        } catch (Exception ignored) {}
    };

    // --- ১. লোকাল ডাটা ও ক্যালকুলেশন ইঞ্জিন ---

    public static synchronized void checkAndResetNewDay(Context context) {
        if (context == null) return;
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            String todayStr = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
            String savedDate = prefs.getString(PREF_REELS_TODAY_DATE, "");

            if (!todayStr.equals(savedDate)) {
                int prevCount = prefs.getInt(PREF_REELS_TODAY_COUNT, 0);
                if (prevCount > 0 && !savedDate.isEmpty()) {
                    String histJsonStr = prefs.getString(PREF_REELS_HISTORY_JSON, "{}");
                    JSONObject hist = new JSONObject(histJsonStr);
                    hist.put(savedDate, prevCount);

                    int peak = prefs.getInt(PREF_REELS_PEAK_COUNT, 0);
                    SharedPreferences.Editor editor = prefs.edit();
                    editor.putString(PREF_REELS_HISTORY_JSON, hist.toString());
                    if (prevCount > peak) {
                        editor.putInt(PREF_REELS_PEAK_COUNT, prevCount);
                        editor.putString(PREF_REELS_PEAK_DATE, savedDate);
                    }
                    editor.apply();
                }

                prefs.edit()
                        .putString(PREF_REELS_TODAY_DATE, todayStr)
                        .putInt(PREF_REELS_TODAY_COUNT, 0)
                        .apply();
                lastAlertedMilestone = 0;
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking new day reset", e);
        }
    }

    public static synchronized int getTodayCount(Context context) {
        if (context == null) return 0;
        checkAndResetNewDay(context);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getInt(PREF_REELS_TODAY_COUNT, 0);
    }

    public static synchronized int getDailyLimit(Context context) {
        if (context == null) return 0;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        return prefs.getInt(PREF_REELS_DAILY_LIMIT, 0);
    }

    public static synchronized void setDailyLimit(Context context, int limit) {
        if (context == null) return;
        int clamped = Math.max(0, Math.min(limit, MAX_HARD_CAP_LIMIT));
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putInt(PREF_REELS_DAILY_LIMIT, clamped).apply();
    }

    public static synchronized void handleReelImpression(Context context, AccessibilityService service, String signature, boolean isScrollEvent) {
        if (context == null) return;
        long now = SystemClock.elapsedRealtime();

        boolean isNewReel = false;

        // ১. যদি ইউজার স্ক্রল করে (YouTube Shorts, Instagram Lite, FB Lite, TikTok ইত্যাদি)
        if (isScrollEvent) {
            if (now - lastReelChangeTime >= 400) {
                lastReelChangeTime = now;
                if (signature != null && !signature.trim().isEmpty()) {
                    currentReelSignature = signature.trim();
                }
                isNewReel = true;
            }
        }
        // ২. যদি স্ক্রোল ইভেন্ট না আসে কিন্তু স্ক্রিনে নতুন রিলসের সিগনেচার আসে (Facebook Katana কাস্টম পেজার)
        else if (signature != null && !signature.trim().isEmpty()) {
            String sig = signature.trim();
            if (!sig.equalsIgnoreCase(currentReelSignature)) {
                if (now - lastReelChangeTime >= 400 || currentReelSignature.isEmpty()) {
                    currentReelSignature = sig;
                    lastReelChangeTime = now;
                    isNewReel = true;
                }
            }
        }

        if (isNewReel) {
            Log.d(TAG, "New reel detected! sig=" + currentReelSignature + ", isScroll=" + isScrollEvent);
            recordReelCount(context, service);
        }
    }

    public static synchronized int incrementCount(Context context, AccessibilityService service) {
        handleReelImpression(context, service, null, true);
        return getTodayCount(context);
    }

    public static synchronized void recordReelCount(Context context, AccessibilityService service) {
        checkAndResetNewDay(context);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        int today = prefs.getInt(PREF_REELS_TODAY_COUNT, 0) + 1;
        String todayStr = prefs.getString(PREF_REELS_TODAY_DATE, "");

        int peak = prefs.getInt(PREF_REELS_PEAK_COUNT, 0);
        SharedPreferences.Editor editor = prefs.edit().putInt(PREF_REELS_TODAY_COUNT, today);
        if (today > peak) {
            editor.putInt(PREF_REELS_PEAK_COUNT, today);
            editor.putString(PREF_REELS_PEAK_DATE, todayStr);
        }
        editor.apply();

        // লাইভ ভাসমান ক্যাপসুল টেক্সট তাৎক্ষণিক আপডেট
        updateFloatingPillCount(today);

        // ২. লিমিট চেক (যদি কাস্টম লিমিট সেট করা থাকে)
        int limit = prefs.getInt(PREF_REELS_DAILY_LIMIT, 0);
        if (limit > 0 && today >= limit) {
            triggerLimitExceededAction(service, today, limit);
            return;
        }

        // ৩. প্রোগ্রেসিভ মাইলস্টোন অ্যালার্ট (৫০, ১০০, ১৫০, ২০০...)
        int milestone = (today / 50) * 50;
        if (milestone >= 50 && milestone != lastAlertedMilestone && today % 50 == 0) {
            lastAlertedMilestone = milestone;
            triggerProgressiveAlert(service, milestone);
        }
    }

    public static JSObject getAnalytics(Context context) {
        JSObject ret = new JSObject();
        if (context == null) return ret;

        checkAndResetNewDay(context);
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        int today = prefs.getInt(PREF_REELS_TODAY_COUNT, 0);
        int limit = prefs.getInt(PREF_REELS_DAILY_LIMIT, 0);
        int peakCount = prefs.getInt(PREF_REELS_PEAK_COUNT, today);
        String peakDate = prefs.getString(PREF_REELS_PEAK_DATE, "আজ");

        int last7DaysSum = today;
        int last30DaysSum = today;
        int lifetimeSum = today;

        try {
            String histStr = prefs.getString(PREF_REELS_HISTORY_JSON, "{}");
            JSONObject hist = new JSONObject(histStr);
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            Date nowDate = new Date();

            Iterator<String> keys = hist.keys();
            while (keys.hasNext()) {
                String dateKey = keys.next();
                int dayVal = hist.optInt(dateKey, 0);
                lifetimeSum += dayVal;

                if (dayVal > peakCount) {
                    peakCount = dayVal;
                    peakDate = dateKey;
                }

                try {
                    Date d = sdf.parse(dateKey);
                    if (d != null) {
                        long diffMs = nowDate.getTime() - d.getTime();
                        long diffDays = diffMs / (24L * 60 * 60 * 1000L);
                        if (diffDays <= 7) {
                            last7DaysSum += dayVal;
                        }
                        if (diffDays <= 30) {
                            last30DaysSum += dayVal;
                        }
                    }
                } catch (Exception ignored) {}
            }
        } catch (Exception e) {
            Log.e(TAG, "Error calculating analytics", e);
        }

        ret.put("today", today);
        ret.put("dailyLimit", limit);
        ret.put("last7Days", last7DaysSum);
        ret.put("last30Days", last30DaysSum);
        ret.put("lifetime", lifetimeSum);
        ret.put("peakCount", peakCount);
        ret.put("peakDate", peakDate);
        return ret;
    }

    // --- ২. স্ক্রিনের ওপরে ভাসমান মিনিমালিস্ট কাউন্টার (Floating Badge / Pill) ---

    public static void showFloatingPill(AccessibilityService service) {
        if (service == null) return;
        mainHandler.removeCallbacks(hideRunnable);
        mainHandler.post(() -> {
            try {
                if (windowManager == null) {
                    windowManager = (WindowManager) service.getSystemService(Context.WINDOW_SERVICE);
                }
                if (floatingPillView != null) {
                    floatingPillView.setVisibility(View.VISIBLE);
                    isOverlayVisible = true;
                    int count = getTodayCount(service);
                    updateFloatingPillCount(count);
                    return;
                }

                int count = getTodayCount(service);

                // পিল কন্টেইনার
                LinearLayout pillLayout = new LinearLayout(service);
                pillLayout.setOrientation(LinearLayout.HORIZONTAL);
                pillLayout.setGravity(Gravity.CENTER_VERTICAL);
                int padH = dpToPx(service, 12);
                int padV = dpToPx(service, 6);
                pillLayout.setPadding(padH, padV, padH, padV);

                // আধুনিক ডার্ক-গ্লাস ব্যাকগ্রাউন্ড ও হালকা সবুজ বর্ডার
                GradientDrawable bg = new GradientDrawable();
                bg.setShape(GradientDrawable.RECTANGLE);
                bg.setColor(Color.parseColor("#E60F172A")); // 90% opacity deep slate
                bg.setCornerRadius(dpToPx(service, 24));
                bg.setStroke(dpToPx(service, 1.5f), Color.parseColor("#00E676"));
                pillLayout.setBackground(bg);

                // মিনি লোগো / আইকন
                ImageView icon = new ImageView(service);
                icon.setImageResource(R.mipmap.ic_launcher);
                int iconSize = dpToPx(service, 18);
                LinearLayout.LayoutParams iconParams = new LinearLayout.LayoutParams(iconSize, iconSize);
                iconParams.setMargins(0, 0, dpToPx(service, 6), 0);
                pillLayout.addView(icon, iconParams);

                // কাউন্টার টেক্সট
                tvPillCount = new TextView(service);
                tvPillCount.setTextColor(Color.WHITE);
                tvPillCount.setTextSize(12);
                tvPillCount.setText(formatCountText(count));
                tvPillCount.setTypeface(null, android.graphics.Typeface.BOLD);
                pillLayout.addView(tvPillCount);

                // উইন্ডো ম্যানেজার প্যারামস (TYPE_ACCESSIBILITY_OVERLAY - ১০০% পারমিশনলেস ও সিস্টেম-লেভেল)
                WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                        WindowManager.LayoutParams.WRAP_CONTENT,
                        WindowManager.LayoutParams.WRAP_CONTENT,
                        WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                        PixelFormat.TRANSLUCENT
                );
                params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
                params.y = dpToPx(service, 36);

                // ড্র্যাগ অ্যান্ড ড্রপ লিসেনার (ইউজার চাইলে আঙুল দিয়ে যেকোনো জায়গায় সরাতে পারবে)
                pillLayout.setOnTouchListener(new View.OnTouchListener() {
                    private int initialX, initialY;
                    private float initialTouchX, initialTouchY;

                    @Override
                    public boolean onTouch(View v, MotionEvent event) {
                        switch (event.getAction()) {
                            case MotionEvent.ACTION_DOWN:
                                initialX = params.x;
                                initialY = params.y;
                                initialTouchX = event.getRawX();
                                initialTouchY = event.getRawY();
                                return true;
                            case MotionEvent.ACTION_MOVE:
                                params.x = initialX + (int) (event.getRawX() - initialTouchX);
                                params.y = initialY + (int) (event.getRawY() - initialTouchY);
                                try {
                                    if (windowManager != null && floatingPillView != null) {
                                        windowManager.updateViewLayout(floatingPillView, params);
                                    }
                                } catch (Exception ignored) {}
                                return true;
                        }
                        return false;
                    }
                });

                windowManager.addView(pillLayout, params);
                floatingPillView = pillLayout;
                isOverlayVisible = true;
            } catch (Exception e) {
                Log.e(TAG, "Error displaying floating pill", e);
            }
        });
    }

    public static void hideFloatingPill() {
        currentReelSignature = "";
        mainHandler.removeCallbacks(hideRunnable);
        mainHandler.post(hideRunnable);
    }

    public static void scheduleHideFloatingPill() {
        mainHandler.removeCallbacks(hideRunnable);
        mainHandler.postDelayed(hideRunnable, 800);
    }

    private static void updateFloatingPillCount(int count) {
        mainHandler.post(() -> {
            try {
                if (tvPillCount != null) {
                    tvPillCount.setText(formatCountText(count));
                }
            } catch (Exception ignored) {}
        });
    }

    private static String formatCountText(int count) {
        return "রিলস: " + count;
    }

    // --- ৩. ধাপে ধাপে কড়া হওয়ার ভাইব্রেশন ও ডায়ালগ অ্যালার্ট ---

    private static void triggerProgressiveAlert(AccessibilityService service, int count) {
        if (service == null) return;
        mainHandler.post(() -> {
            try {
                // ১. ভাইব্রেশন
                Vibrator v = (Vibrator) service.getSystemService(Context.VIBRATOR_SERVICE);
                if (v != null && v.hasVibrator()) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        if (count <= 50) {
                            // ৫০টি: মৃদু দ্বৈত ভাইব্রেশন
                            v.vibrate(VibrationEffect.createWaveform(new long[]{0, 160, 100, 160}, -1));
                        } else if (count <= 100) {
                            // ১০০টি: শক্তিশালী দ্বৈত ভাইব্রেশন
                            v.vibrate(VibrationEffect.createWaveform(new long[]{0, 300, 140, 300}, -1));
                        } else {
                            // ১৫০+টি: তীব্র তিনবার ভাইব্রেশন
                            v.vibrate(VibrationEffect.createWaveform(new long[]{0, 400, 140, 400, 140, 400}, -1));
                        }
                    } else {
                        v.vibrate(count <= 50 ? 300 : 700);
                    }
                }

                // ২. স্ক্রিনে সতর্কতামূলক কার্ড ডায়ালগ
                showAlertOverlayDialog(service, count);
            } catch (Exception e) {
                Log.e(TAG, "Error triggering progressive alert", e);
            }
        });
    }

    private static void showAlertOverlayDialog(AccessibilityService service, int count) {
        try {
            if (windowManager == null) {
                windowManager = (WindowManager) service.getSystemService(Context.WINDOW_SERVICE);
            }
            dismissAlertOverlayDialog();

            // ডায়ালগ কন্টেইনার
            LinearLayout dialogCard = new LinearLayout(service);
            dialogCard.setOrientation(LinearLayout.VERTICAL);
            dialogCard.setGravity(Gravity.CENTER);
            int pad = dpToPx(service, 20);
            dialogCard.setPadding(pad, pad, pad, pad);

            GradientDrawable cardBg = new GradientDrawable();
            cardBg.setShape(GradientDrawable.RECTANGLE);
            cardBg.setColor(Color.parseColor("#F20F172A")); // 95% opacity
            cardBg.setCornerRadius(dpToPx(service, 20));
            cardBg.setStroke(dpToPx(service, 2), count >= 100 ? Color.parseColor("#FF1744") : Color.parseColor("#38BDF8"));
            dialogCard.setBackground(cardBg);

            // টাইটেল
            TextView tvTitle = new TextView(service);
            tvTitle.setTextSize(16);
            tvTitle.setTypeface(null, android.graphics.Typeface.BOLD);
            tvTitle.setTextColor(count >= 100 ? Color.parseColor("#FF5252") : Color.parseColor("#38BDF8"));
            tvTitle.setGravity(Gravity.CENTER);
            if (count == 50) {
                tvTitle.setText("৫০টি রিলস সম্পন্ন!");
            } else if (count == 100) {
                tvTitle.setText("১০০টি রিলস দেখা শেষ!");
            } else {
                tvTitle.setText(count + "টি রিলস সম্পন্ন! অতিরিক্ত আসক্তি সতর্কতা");
            }
            dialogCard.addView(tvTitle);

            // বিবরণী মেসেজ
            TextView tvMsg = new TextView(service);
            tvMsg.setTextSize(12.5f);
            tvMsg.setTextColor(Color.parseColor("#CBD5E1"));
            tvMsg.setGravity(Gravity.CENTER);
            tvMsg.setLineSpacing(0, 1.25f);
            LinearLayout.LayoutParams msgParams = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            msgParams.setMargins(0, dpToPx(service, 10), 0, dpToPx(service, 18));

            if (count <= 50) {
                tvMsg.setText("আপনি আজ ৫০টি রিলস দেখে ফেলেছেন। আপনার সময় মূল্যবান, অনর্থক সময় নষ্ট না করে কাজে মনোযোগ দিন।");
            } else if (count <= 100) {
                tvMsg.setText("১০০টি রিলস শেষ! আপনি প্রায় ১ ঘণ্টারও বেশি সময় রিলসে নষ্ট করেছেন। নিজের কল্যাণে অনুগ্রহ করে এবার ফোন রেখে দিন।");
            } else {
                tvMsg.setText("আপনি ইতিমধ্যে " + count + "টি রিলস দেখে ফেলেছেন! এটি আপনার মানসিক শক্তি ও ব্রেইনের ডোপামিন নষ্ট করছে। নিজেকে নিয়ন্ত্রণ করুন।");
            }
            dialogCard.addView(tvMsg, msgParams);

            // ওয়ান-ট্যাপ "রিলস ব্লক করুন" বাটন
            Button btnBlockNow = new Button(service);
            btnBlockNow.setText("রিলস ব্লক করুন");
            btnBlockNow.setTextColor(Color.WHITE);
            btnBlockNow.setTextSize(13.5f);
            btnBlockNow.setTypeface(null, android.graphics.Typeface.BOLD);

            GradientDrawable btnBg = new GradientDrawable();
            btnBg.setShape(GradientDrawable.RECTANGLE);
            btnBg.setColor(Color.parseColor("#D50000")); // Solid red
            btnBg.setCornerRadius(dpToPx(service, 10));
            btnBlockNow.setBackground(btnBg);
            btnBlockNow.setPadding(0, dpToPx(service, 10), 0, dpToPx(service, 10));

            btnBlockNow.setOnClickListener(v -> {
                dismissAlertOverlayDialog();
                hideFloatingPill();
                BlockerAccessibilityService.enableReelsBlock(service);
                service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME);
                Toast.makeText(service, "রিলস সফলভাবে ব্লক করা হয়েছে! আপনার কাজে মনোযোগ দিন।", Toast.LENGTH_LONG).show();
            });

            LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
            btnParams.setMargins(0, 0, 0, dpToPx(service, 8));
            dialogCard.addView(btnBlockNow, btnParams);

            // "পরে মনে করান" বাটন
            Button btnDismiss = new Button(service);
            btnDismiss.setText("পরে মনে করান");
            btnDismiss.setTextColor(Color.parseColor("#94A3B8"));
            btnDismiss.setTextSize(12);

            GradientDrawable dismissBg = new GradientDrawable();
            dismissBg.setShape(GradientDrawable.RECTANGLE);
            dismissBg.setColor(Color.parseColor("#1E293B"));
            dismissBg.setCornerRadius(dpToPx(service, 10));
            btnDismiss.setBackground(dismissBg);
            btnDismiss.setPadding(0, dpToPx(service, 8), 0, dpToPx(service, 8));

            btnDismiss.setOnClickListener(v -> dismissAlertOverlayDialog());
            dialogCard.addView(btnDismiss, new LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

            // লেআউট প্যারামস
            int cardWidth = (int) (service.getResources().getDisplayMetrics().widthPixels * 0.85);
            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    cardWidth,
                    WindowManager.LayoutParams.WRAP_CONTENT,
                    WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
                    WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
                    PixelFormat.TRANSLUCENT
            );
            params.gravity = Gravity.CENTER;

            windowManager.addView(dialogCard, params);
            alertDialogView = dialogCard;
        } catch (Exception e) {
            Log.e(TAG, "Error showing alert overlay dialog", e);
        }
    }

    public static void dismissAlertOverlayDialog() {
        mainHandler.post(() -> {
            try {
                if (alertDialogView != null && windowManager != null) {
                    windowManager.removeView(alertDialogView);
                    alertDialogView = null;
                }
            } catch (Exception ignored) {}
        });
    }

    // --- ৪. কাস্টম লিমিট শেষ হওয়ার অ্যাকশন ---

    private static void triggerLimitExceededAction(AccessibilityService service, int today, int limit) {
        if (service == null) return;
        mainHandler.post(() -> {
            try {
                dismissAlertOverlayDialog();
                hideFloatingPill();
                BlockerAccessibilityService.enableReelsBlock(service);
                service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME);
                Toast.makeText(service, "আজকের জন্য আপনার দৈনিক রিলস লিমিট (" + limit + "টি) সম্পন্ন হয়েছে! রিলস লক করা হলো।", Toast.LENGTH_LONG).show();
            } catch (Exception e) {
                Log.e(TAG, "Error triggering limit exceeded action", e);
            }
        });
    }

    private static int dpToPx(Context context, float dp) {
        if (context == null) return (int) dp;
        return (int) (dp * context.getResources().getDisplayMetrics().density + 0.5f);
    }
}
