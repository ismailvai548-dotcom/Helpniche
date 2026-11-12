package com.helpniche.app;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

public class MandatoryReLockActivity extends Activity {

    private static final String TAG = "MandatoryReLockActivity";
    public static final String ACTION_ACCESSIBILITY_ENABLED_SUCCESS = "com.helpniche.app.ACTION_ACCESSIBILITY_ENABLED_SUCCESS";

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable periodicCheckRunnable;
    private boolean isNavigatingToSettings = false;

    private final BroadcastReceiver successReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            Log.i(TAG, "Received ACTION_ACCESSIBILITY_ENABLED_SUCCESS! Unlocking activity...");
            unlockAndFinish();
        }
    };

    public static boolean isAccessibilityEnabled(Context context) {
        if (context == null) return false;
        try {
            int enabled = Settings.Secure.getInt(context.getContentResolver(), Settings.Secure.ACCESSIBILITY_ENABLED);
            if (enabled != 1) return false;
            String setting = Settings.Secure.getString(context.getContentResolver(), Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            return setting != null && setting.contains(context.getPackageName());
        } catch (Exception e) {
            return false;
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Keep screen on, show over lockscreen
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }

        buildProgrammaticUI();

        // Register success receiver
        IntentFilter filter = new IntentFilter(ACTION_ACCESSIBILITY_ENABLED_SUCCESS);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(successReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(successReceiver, filter);
        }
    }

    private void buildProgrammaticUI() {
        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setGravity(Gravity.CENTER);
        rootLayout.setBackgroundColor(Color.parseColor("#090D16")); // Deep dark navy
        int p = dpToPx(24);
        rootLayout.setPadding(p, p, p, p);
        rootLayout.setLayoutParams(new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));

        // Card Container
        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER_HORIZONTAL);
        int cardPad = dpToPx(24);
        card.setPadding(cardPad, cardPad, cardPad, cardPad);

        GradientDrawable cardBg = new GradientDrawable();
        cardBg.setColor(Color.parseColor("#161F30"));
        cardBg.setCornerRadius(dpToPx(18));
        cardBg.setStroke(dpToPx(2), Color.parseColor("#EF4444")); // Warning red border
        card.setBackground(cardBg);

        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        cardParams.setMargins(dpToPx(16), 0, dpToPx(16), 0);
        card.setLayoutParams(cardParams);

        // Warning Icon
        TextView iconView = new TextView(this);
        iconView.setText("⚠️");
        iconView.setTextSize(54);
        iconView.setGravity(Gravity.CENTER);
        card.addView(iconView);

        // Title
        TextView titleView = new TextView(this);
        titleView.setText("৫ মিনিট সময় শেষ!");
        titleView.setTextSize(22);
        titleView.setTypeface(null, Typeface.BOLD);
        titleView.setTextColor(Color.parseColor("#F87171")); // Bright warning red
        titleView.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams titleParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        titleParams.setMargins(0, dpToPx(14), 0, dpToPx(10));
        titleView.setLayoutParams(titleParams);
        card.addView(titleView);

        // Mandatory Subtitle
        TextView subView = new TextView(this);
        subView.setText("সুরক্ষা সার্ভিস অন করা বাধ্যতামূলক");
        subView.setTextSize(16);
        subView.setTypeface(null, Typeface.BOLD);
        subView.setTextColor(Color.parseColor("#FDE047")); // Warning yellow
        subView.setGravity(Gravity.CENTER);
        card.addView(subView);

        // Explanation text
        TextView descView = new TextView(this);
        descView.setText("আপনার বিকাশ বা জরুরি কাজের ৫ মিনিটের সাময়িক বিরতি শেষ হয়েছে।\n\nফোনের নিরাপত্তা বজায় রাখতে Helpniche অ্যাক্সেসিবিলিটি সার্ভিস পুনরায় চালু করা বাধ্যতামূলক। সার্ভিস অন না করা পর্যন্ত ফোন লক থাকবে।");
        descView.setTextSize(14);
        descView.setTextColor(Color.parseColor("#CBD5E1")); // Light grey
        descView.setGravity(Gravity.CENTER);
        descView.setLineSpacing(dpToPx(3), 1.1f);
        LinearLayout.LayoutParams descParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        descParams.setMargins(0, dpToPx(14), 0, dpToPx(24));
        descView.setLayoutParams(descParams);
        card.addView(descView);

        // Action Button: Open Accessibility Settings
        Button enableBtn = new Button(this);
        enableBtn.setText("🛡️ এখনই এক্সেসিবিলিটি অন করুন");
        enableBtn.setTextSize(16);
        enableBtn.setTypeface(null, Typeface.BOLD);
        enableBtn.setTextColor(Color.WHITE);

        GradientDrawable btnBg = new GradientDrawable();
        btnBg.setColor(Color.parseColor("#059669")); // Emerald green
        btnBg.setCornerRadius(dpToPx(12));
        enableBtn.setBackground(btnBg);
        enableBtn.setPadding(dpToPx(16), dpToPx(14), dpToPx(16), dpToPx(14));

        LinearLayout.LayoutParams btnParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
        );
        enableBtn.setLayoutParams(btnParams);

        enableBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                isNavigatingToSettings = true;
                openAccessibilitySettings();
            }
        });
        card.addView(enableBtn);

        rootLayout.addView(card);
        setContentView(rootLayout);
    }

    private void openAccessibilitySettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            Toast.makeText(this, "তালিকা থেকে 'Helpniche' খুঁজে অন করে দিন", Toast.LENGTH_LONG).show();
        } catch (Exception e) {
            Log.e(TAG, "Error opening accessibility settings", e);
            Toast.makeText(this, "সেটিংস খুলতে ব্যর্থ হয়েছে", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (isAccessibilityEnabled(this)) {
            unlockAndFinish();
            return;
        }

        // Start periodic check every 1 second
        startPeriodicCheck();
    }

    @Override
    protected void onPause() {
        super.onPause();
        stopPeriodicCheck();

        // If user didn't intentionally navigate to settings and accessibility is still off, re-assert lock
        if (!isNavigatingToSettings && !isAccessibilityEnabled(this)) {
            handler.postDelayed(() -> {
                if (!isAccessibilityEnabled(MandatoryReLockActivity.this)) {
                    Intent bringBack = new Intent(MandatoryReLockActivity.this, MandatoryReLockActivity.class);
                    bringBack.addFlags(
                            Intent.FLAG_ACTIVITY_NEW_TASK |
                            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT |
                            Intent.FLAG_ACTIVITY_SINGLE_TOP
                    );
                    startActivity(bringBack);
                }
            }, 500);
        }
        isNavigatingToSettings = false;
    }

    private void startPeriodicCheck() {
        stopPeriodicCheck();
        periodicCheckRunnable = new Runnable() {
            @Override
            public void run() {
                if (isAccessibilityEnabled(MandatoryReLockActivity.this)) {
                    unlockAndFinish();
                } else {
                    handler.postDelayed(this, 1000);
                }
            }
        };
        handler.postDelayed(periodicCheckRunnable, 1000);
    }

    private void stopPeriodicCheck() {
        if (periodicCheckRunnable != null) {
            handler.removeCallbacks(periodicCheckRunnable);
            periodicCheckRunnable = null;
        }
    }

    private void unlockAndFinish() {
        stopPeriodicCheck();
        try {
            SharedPreferences prefs = getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            prefs.edit()
                    .putBoolean("mandatory_accessibility_pending", false)
                    .putBoolean("banking_pause_active", false)
                    .apply();

            Toast.makeText(this, "✅ Helpniche সুরক্ষা সক্রিয় হয়েছে! ফোন স্বাভাবিক হয়েছে।", Toast.LENGTH_LONG).show();
        } catch (Exception ignored) {}
        finish();
    }

    @Override
    public void onBackPressed() {
        // Strict blocking: Do not allow dismissing by back button until accessibility is on!
        if (isAccessibilityEnabled(this)) {
            unlockAndFinish();
        } else {
            Toast.makeText(this, "সুরক্ষা সার্ভিস অন করা বাধ্যতামূলক!", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onDestroy() {
        stopPeriodicCheck();
        try {
            unregisterReceiver(successReceiver);
        } catch (Exception ignored) {}
        super.onDestroy();
    }

    private int dpToPx(int dp) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(dp * density);
    }
}
