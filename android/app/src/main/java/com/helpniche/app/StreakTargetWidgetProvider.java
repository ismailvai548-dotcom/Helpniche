package com.helpniche.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.widget.RemoteViews;
import android.widget.Toast;

public class StreakTargetWidgetProvider extends AppWidgetProvider {

    public static final String ACTION_REFRESH_WIDGET = "com.helpniche.app.ACTION_REFRESH_WIDGET";
    public static final String ACTION_UPDATE_WIDGET = "com.helpniche.app.ACTION_UPDATE_WIDGET";

    // অ্যাপের আসল ডার্ক মোড কালার প্যালেট
    private static final int COLOR_CIRCLE_BAR = Color.parseColor("#00E676");
    private static final int COLOR_CIRCLE_BG = Color.parseColor("#1B2E24");
    private static final int COLOR_TEXT_MAIN = Color.parseColor("#FFFFFF");
    private static final int COLOR_TEXT_SUB = Color.parseColor("#94A3B8");

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_UPDATE_WIDGET.equals(action)) {
            updateAllWidgets(context);
        } else if (ACTION_REFRESH_WIDGET.equals(action)) {
            updateAllWidgets(context);
            try {
                Toast.makeText(context, "উইজেট রিফ্রেশ হয়েছে", Toast.LENGTH_SHORT).show();
            } catch (Exception ignored) {}
        }
    }

    public static void updateAllWidgets(Context context) {
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            ComponentName thisWidget = new ComponentName(context, StreakTargetWidgetProvider.class);
            int[] allIds = manager.getAppWidgetIds(thisWidget);
            if (allIds != null && allIds.length > 0) {
                for (int id : allIds) {
                    updateAppWidget(context, manager, id);
                }
            }
        } catch (Exception ignored) {}
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);

            boolean isTargetActive = prefs.getBoolean("target_is_active", false);
            String targetTitle = prefs.getString("target_title", "টার্গেট");
            long targetStartTime = prefs.getLong("target_start_time", 0L);
            long targetEndTime = prefs.getLong("target_end_time", 0L);
            int targetDays = prefs.getInt("target_days", 0);
            int streakDays = prefs.getInt("streak_days", 0);

            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.streak_target_widget_layout);

            long now = System.currentTimeMillis();

            if (isTargetActive && targetEndTime > 0) {
                String header = (targetTitle != null && !targetTitle.trim().isEmpty()) ? targetTitle.trim() : "টার্গেট";
                views.setTextViewText(R.id.widget_header_title, header);

                if (now >= targetEndTime) {
                    Bitmap circleBitmap = drawMinimalProgressCircle(100f, "সম্পন্ন", "টার্গেট পূরণ");
                    views.setImageViewBitmap(R.id.widget_circle_img, circleBitmap);
                } else {
                    long totalDuration = targetEndTime - targetStartTime;
                    if (totalDuration <= 0 && targetDays > 0) {
                        totalDuration = targetDays * 24L * 3600L * 1000L;
                    }
                    if (totalDuration <= 0) {
                        totalDuration = 24L * 3600L * 1000L;
                    }

                    long elapsed = now - targetStartTime;
                    if (elapsed < 0) elapsed = 0;

                    float progressPercent = (float) ((double) elapsed / (double) totalDuration * 100.0);
                    if (progressPercent > 100f) progressPercent = 100f;
                    if (progressPercent < 0f) progressPercent = 0f;

                    long remainingMs = targetEndTime - now;
                    long remDays = remainingMs / (24L * 3600L * 1000L);
                    long remHours = (remainingMs % (24L * 3600L * 1000L)) / (3600L * 1000L);
                    long remMins = (remainingMs % (3600L * 1000L)) / (60L * 1000L);

                    String mainText;
                    String subText;

                    if (remDays > 0) {
                        mainText = toBanglaDigits(String.valueOf(remDays)) + " দিন";
                        subText = toBanglaDigits(String.valueOf(remHours)) + " ঘণ্টা " + toBanglaDigits(String.valueOf(remMins)) + " মি. বাকি";
                    } else if (remHours > 0) {
                        mainText = toBanglaDigits(String.valueOf(remHours)) + " ঘণ্টা";
                        subText = toBanglaDigits(String.valueOf(remMins)) + " মিনিট বাকি";
                    } else {
                        mainText = toBanglaDigits(String.valueOf(Math.max(1, remMins))) + " মিনিট";
                        subText = "বাকি আছে";
                    }

                    Bitmap circleBitmap = drawMinimalProgressCircle(progressPercent, mainText, subText);
                    views.setImageViewBitmap(R.id.widget_circle_img, circleBitmap);
                }
            } else {
                views.setTextViewText(R.id.widget_header_title, "আয়রন উইল");

                String mainText = toBanglaDigits(String.valueOf(streakDays)) + " দিন";
                Bitmap circleBitmap = drawMinimalProgressCircle(100f, mainText, "ক্লিন স্ট্রিক");
                views.setImageViewBitmap(R.id.widget_circle_img, circleBitmap);
            }

            // ১. কার্ড বা সার্কেলে ট্যাপ করলে অ্যাপ ওপেন
            Intent appIntent = new Intent(context, MainActivity.class);
            PendingIntent appPendingIntent = PendingIntent.getActivity(
                context,
                0,
                appIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_root, appPendingIntent);
            views.setOnClickPendingIntent(R.id.widget_circle_img, appPendingIntent);

            // ২. রিফ্রেশ আইকনে ট্যাপ করলে রিয়েল-টাইম ইনস্ট্যান্ট রিফ্রেশ
            Intent refreshIntent = new Intent(context, StreakTargetWidgetProvider.class);
            refreshIntent.setAction(ACTION_REFRESH_WIDGET);
            refreshIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
            PendingIntent refreshPendingIntent = PendingIntent.getBroadcast(
                context,
                appWidgetId + 9000,
                refreshIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            views.setOnClickPendingIntent(R.id.widget_btn_refresh, refreshPendingIntent);

            appWidgetManager.updateAppWidget(appWidgetId, views);
        } catch (Exception ignored) {}
    }

    private static Bitmap drawMinimalProgressCircle(float progressPercent, String mainText, String subText) {
        int size = 400;
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);

        Paint paint = new Paint();
        paint.setAntiAlias(true);

        float strokeWidth = 26f;
        float padding = strokeWidth / 2f + 16f;
        RectF rectF = new RectF(padding, padding, size - padding, size - padding);

        // ১. হালকা ব্যাকগ্রাউন্ড গাঢ় সবুজ ট্র্যাক
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(strokeWidth);
        paint.setStrokeCap(Paint.Cap.ROUND);
        paint.setColor(COLOR_CIRCLE_BG);
        canvas.drawArc(rectF, 0, 360, false, paint);

        // ২. প্রগ্রেস উজ্জ্বল নিয়ন সবুজ আর্ক
        if (progressPercent > 0) {
            paint.setColor(COLOR_CIRCLE_BAR);
            float sweepAngle = Math.min(360f, (progressPercent / 100f) * 360f);
            canvas.drawArc(rectF, -90, sweepAngle, false, paint);
        }

        // ৩. কেন্দ্রের মূল লেখা (পরিষ্কার সাদা বোল্ড)
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(COLOR_TEXT_MAIN);
        paint.setTextSize(52f);
        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
        paint.setTextAlign(Paint.Align.CENTER);

        Paint.FontMetrics fm = paint.getFontMetrics();
        float centerY = size / 2f;
        float textY = centerY - ((fm.descent + fm.ascent) / 2f) - 16f;
        canvas.drawText(mainText, size / 2f, textY, paint);

        // ৪. কেন্দ্রের সাবটেক্সট (সফট গ্রে)
        paint.setColor(COLOR_TEXT_SUB);
        paint.setTextSize(24f);
        paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.NORMAL));
        float subTextY = textY + 42f;
        canvas.drawText(subText, size / 2f, subTextY, paint);

        return bitmap;
    }

    private static String toBanglaDigits(String input) {
        if (input == null) return "";
        StringBuilder sb = new StringBuilder();
        for (char c : input.toCharArray()) {
            if (c >= '0' && c <= '9') {
                sb.append((char) ('০' + (c - '0')));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }
}
