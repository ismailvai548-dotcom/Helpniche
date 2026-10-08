package com.helpniche.app;

import android.app.AlarmManager;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioManager;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.List;

public class AutoVibrateHelper {

    private static final String TAG = "AutoVibrateHelper";
    public static final String PREFS_NAME = "HelpnichePrefs";
    public static final String KEY_AUTO_VIBRATE_CONFIG = "auto_vibrate_config";
    public static final String KEY_CURRENTLY_VIBRATING = "auto_vibrate_currently_active";
    public static final String KEY_ORIGINAL_RINGER_MODE = "auto_vibrate_original_ringer_mode";

    public static final String ACTION_VIBRATE_TRANSITION = "com.helpniche.app.ACTION_VIBRATE_TRANSITION";
    private static final int REQUEST_CODE_VIBRATE_ALARM = 8801;

    public static class VibrateSlot {
        public String id;
        public String name;
        public String startTime; // "HH:mm" (24h)
        public String endTime;   // "HH:mm" (24h)
        public boolean enabled;

        public VibrateSlot(String id, String name, String startTime, String endTime, boolean enabled) {
            this.id = id;
            this.name = name;
            this.startTime = startTime;
            this.endTime = endTime;
            this.enabled = enabled;
        }

        public int getStartMinutes() {
            return parseMinutes(startTime);
        }

        public int getEndMinutes() {
            return parseMinutes(endTime);
        }

        private static int parseMinutes(String timeStr) {
            if (timeStr == null || !timeStr.contains(":")) return -1;
            try {
                String[] parts = timeStr.trim().split(":");
                int h = Integer.parseInt(parts[0]);
                int m = Integer.parseInt(parts[1]);
                if (h < 0 || h > 23 || m < 0 || m > 59) return -1;
                return h * 60 + m;
            } catch (Exception e) {
                return -1;
            }
        }
    }

    public static boolean isDndPermissionGranted(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && context != null) {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            return nm != null && nm.isNotificationPolicyAccessGranted();
        }
        return true;
    }

    public static void openDndSettings(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && context != null) {
            try {
                Intent intent = new Intent(Settings.ACTION_NOTIFICATION_POLICY_ACCESS_SETTINGS);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } catch (Exception e) {
                Log.e(TAG, "Error opening DND settings", e);
            }
        }
    }

    public static List<VibrateSlot> parseSlots(String configJson) {
        List<VibrateSlot> list = new ArrayList<>();
        if (configJson == null || configJson.trim().isEmpty()) {
            return getDefaultSlots();
        }
        try {
            JSONObject obj = new JSONObject(configJson);
            JSONArray arr = obj.optJSONArray("slots");
            if (arr != null) {
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject s = arr.getJSONObject(i);
                    list.add(new VibrateSlot(
                            s.optString("id", "slot_" + i),
                            s.optString("name", "স্লট"),
                            s.optString("startTime", "13:15"),
                            s.optString("endTime", "13:45"),
                            s.optBoolean("enabled", true)
                    ));
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error parsing slots json", e);
            return getDefaultSlots();
        }
        return list;
    }

    public static List<VibrateSlot> getDefaultSlots() {
        List<VibrateSlot> defaults = new ArrayList<>();
        defaults.add(new VibrateSlot("fajr", "ফজর (Fajr)", "05:15", "05:45", true));
        defaults.add(new VibrateSlot("zohr", "জোহর (Zohr)", "13:15", "13:45", true));
        defaults.add(new VibrateSlot("asr", "আসর (Asr)", "16:30", "17:00", true));
        defaults.add(new VibrateSlot("maghrib", "মাগরিব (Maghrib)", "18:05", "18:35", true));
        defaults.add(new VibrateSlot("isha", "এশা (Isha)", "20:00", "20:30", true));
        return defaults;
    }

    public static boolean isAutoVibrateEnabled(Context context) {
        if (context == null) return false;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String configStr = prefs.getString(KEY_AUTO_VIBRATE_CONFIG, null);
        if (configStr == null) return false;
        try {
            JSONObject obj = new JSONObject(configStr);
            return obj.optBoolean("enabled", false);
        } catch (Exception e) {
            return false;
        }
    }

    public static synchronized void applyCurrentVibrateState(Context context) {
        if (context == null) return;

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String configStr = prefs.getString(KEY_AUTO_VIBRATE_CONFIG, null);
        boolean isMasterEnabled = false;
        List<VibrateSlot> slots = null;

        if (configStr != null) {
            try {
                JSONObject obj = new JSONObject(configStr);
                isMasterEnabled = obj.optBoolean("enabled", false);
                slots = parseSlots(configStr);
            } catch (Exception e) {
                Log.e(TAG, "Error parsing config in applyCurrentVibrateState", e);
            }
        }

        AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        boolean isCurrentlyActive = prefs.getBoolean(KEY_CURRENTLY_VIBRATING, false);

        if (!isMasterEnabled || slots == null || slots.isEmpty()) {
            // Master toggle is OFF
            if (isCurrentlyActive && am != null) {
                int originalMode = prefs.getInt(KEY_ORIGINAL_RINGER_MODE, AudioManager.RINGER_MODE_NORMAL);
                setRingerModeSafe(context, originalMode);
                prefs.edit().putBoolean(KEY_CURRENTLY_VIBRATING, false).apply();
                Log.i(TAG, "Auto Vibrate disabled: restored ringer mode.");
            }
            cancelNextAlarm(context);
            return;
        }

        // Master toggle is ON: calculate if current time is inside any enabled slot
        Calendar now = Calendar.getInstance();
        int nowMinutes = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);

        boolean shouldVibrateNow = false;
        for (VibrateSlot slot : slots) {
            if (!slot.enabled) continue;
            int start = slot.getStartMinutes();
            int end = slot.getEndMinutes();
            if (start < 0 || end < 0 || start == end) continue;

            if (start < end) {
                if (nowMinutes >= start && nowMinutes < end) {
                    shouldVibrateNow = true;
                    break;
                }
            } else {
                // Overnight slot (e.g. 23:00 to 01:00)
                if (nowMinutes >= start || nowMinutes < end) {
                    shouldVibrateNow = true;
                    break;
                }
            }
        }

        if (am != null) {
            if (shouldVibrateNow) {
                if (!isCurrentlyActive) {
                    int curMode = am.getRingerMode();
                    prefs.edit()
                            .putInt(KEY_ORIGINAL_RINGER_MODE, curMode)
                            .putBoolean(KEY_CURRENTLY_VIBRATING, true)
                            .apply();
                }
                setRingerModeSafe(context, AudioManager.RINGER_MODE_VIBRATE);
                Log.i(TAG, "Inside Auto Vibrate slot: Phone set to VIBRATE mode.");
            } else {
                if (isCurrentlyActive) {
                    int originalMode = prefs.getInt(KEY_ORIGINAL_RINGER_MODE, AudioManager.RINGER_MODE_NORMAL);
                    setRingerModeSafe(context, originalMode);
                    prefs.edit().putBoolean(KEY_CURRENTLY_VIBRATING, false).apply();
                    Log.i(TAG, "Outside Auto Vibrate slot: Phone restored to NORMAL mode.");
                }
            }
        }

        scheduleNextTransition(context, slots);
    }

    private static void setRingerModeSafe(Context context, int ringerMode) {
        try {
            AudioManager am = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
            if (am != null) {
                am.setRingerMode(ringerMode);
                Log.i(TAG, "setRingerModeSafe applied ringerMode: " + ringerMode);
            }
        } catch (SecurityException se) {
            Log.w(TAG, "SecurityException changing ringer mode. DND permission might be needed.", se);
        } catch (Exception e) {
            Log.e(TAG, "Error in setRingerModeSafe", e);
        }
    }

    private static void scheduleNextTransition(Context context, List<VibrateSlot> slots) {
        if (context == null || slots == null || slots.isEmpty()) return;

        long nowWall = System.currentTimeMillis();
        List<Long> futureTimestamps = new ArrayList<>();

        // Generate timestamps across 3-day cycle (today, tomorrow, day after) for start and end
        for (int dayOffset = 0; dayOffset <= 2; dayOffset++) {
            for (VibrateSlot slot : slots) {
                if (!slot.enabled) continue;
                int start = slot.getStartMinutes();
                int end = slot.getEndMinutes();
                if (start < 0 || end < 0 || start == end) continue;

                long startTs = getTimestampForMinutes(start, dayOffset);
                if (startTs > nowWall + 1000) {
                    futureTimestamps.add(startTs);
                }

                int endDayOffset = (end < start) ? dayOffset + 1 : dayOffset;
                long endTs = getTimestampForMinutes(end, endDayOffset);
                if (endTs > nowWall + 1000) {
                    futureTimestamps.add(endTs);
                }
            }
        }

        if (futureTimestamps.isEmpty()) {
            Log.i(TAG, "No future transitions found to schedule.");
            return;
        }

        Collections.sort(futureTimestamps);
        long nextTrigger = futureTimestamps.get(0);

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(context, AutoVibrateReceiver.class);
        intent.setAction(ACTION_VIBRATE_TRANSITION);

        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            flags |= PendingIntent.FLAG_IMMUTABLE;
        }

        PendingIntent pi = PendingIntent.getBroadcast(context, REQUEST_CODE_VIBRATE_ALARM, intent, flags);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTrigger, pi);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, nextTrigger, pi);
            }
            long diffSec = (nextTrigger - nowWall) / 1000;
            Log.i(TAG, "Next Auto Vibrate transition scheduled in " + diffSec + " seconds (at " + nextTrigger + ").");
        } catch (SecurityException se) {
            Log.w(TAG, "Cannot schedule exact alarm for Auto Vibrate. Using set(): " + se.getMessage());
            alarmManager.set(AlarmManager.RTC_WAKEUP, nextTrigger, pi);
        } catch (Exception e) {
            Log.e(TAG, "Failed to schedule Auto Vibrate alarm", e);
        }
    }

    private static long getTimestampForMinutes(int minutesOfDay, int dayOffset) {
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DAY_OF_YEAR, dayOffset);
        cal.set(Calendar.HOUR_OF_DAY, minutesOfDay / 60);
        cal.set(Calendar.MINUTE, minutesOfDay % 60);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        return cal.getTimeInMillis();
    }

    private static void cancelNextAlarm(Context context) {
        try {
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am != null) {
                Intent intent = new Intent(context, AutoVibrateReceiver.class);
                intent.setAction(ACTION_VIBRATE_TRANSITION);
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                PendingIntent pi = PendingIntent.getBroadcast(context, REQUEST_CODE_VIBRATE_ALARM, intent, flags);
                am.cancel(pi);
                Log.i(TAG, "Auto Vibrate alarm cancelled.");
            }
        } catch (Exception ignored) {}
    }
}
