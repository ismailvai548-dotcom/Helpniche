package com.helpniche.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;

public class AlarmManagerHelper {

    private static final String TAG = "AlarmManagerHelper";
    public static final String PREFS_NAME = "HelpnicheAlarmPrefs";
    public static final String KEY_ALARM_LIST = "saved_alarms_json";

    public static class AlarmItem {
        public int id;
        public String title;
        public String timeStr;
        public int hour;
        public int minute;
        public boolean enabled;
        public String audioType;
        public String repeatMode; // "once", "everyday", "custom"
        public String repeatDays; // e.g. "[1,2,3,4,5,6,7]" (Sun=1, Mon=2 ... Sat=7)

        public JSONObject toJsonObject() {
            try {
                JSONObject obj = new JSONObject();
                obj.put("id", id);
                obj.put("title", title);
                obj.put("timeStr", timeStr);
                obj.put("hour", hour);
                obj.put("minute", minute);
                obj.put("enabled", enabled);
                obj.put("audioType", audioType);
                obj.put("repeatMode", repeatMode != null ? repeatMode : "everyday");
                obj.put("repeatDays", repeatDays != null ? repeatDays : "[1,2,3,4,5,6,7]");
                return obj;
            } catch (Exception e) {
                return new JSONObject();
            }
        }

        public static AlarmItem fromJsonObject(JSONObject obj) {
            if (obj == null) return null;
            AlarmItem item = new AlarmItem();
            item.id = obj.optInt("id", (int) System.currentTimeMillis());
            item.title = obj.optString("title", "Helpniche অ্যালার্ম");
            item.timeStr = obj.optString("timeStr", "05:30");
            item.hour = obj.optInt("hour", 5);
            item.minute = obj.optInt("minute", 30);
            item.enabled = obj.optBoolean("enabled", true);
            item.audioType = obj.optString("audioType", "alarm");
            item.repeatMode = obj.optString("repeatMode", "everyday");
            item.repeatDays = obj.optString("repeatDays", "[1,2,3,4,5,6,7]");
            return item;
        }
    }

    /**
     * Calculate next trigger time based on repeatMode and repeatDays
     */
    public static long calculateNextTriggerTime(AlarmItem alarm) {
        Calendar now = Calendar.getInstance();
        Calendar target = Calendar.getInstance();
        target.set(Calendar.HOUR_OF_DAY, alarm.hour);
        target.set(Calendar.MINUTE, alarm.minute);
        target.set(Calendar.SECOND, 0);
        target.set(Calendar.MILLISECOND, 0);

        String mode = alarm.repeatMode != null ? alarm.repeatMode.toLowerCase().trim() : "everyday";

        if ("once".equals(mode)) {
            if (target.getTimeInMillis() <= now.getTimeInMillis() - 10000L) {
                target.add(Calendar.DAY_OF_YEAR, 1);
            }
            return target.getTimeInMillis();
        } else if ("custom".equals(mode)) {
            Set<Integer> activeDays = parseDaysSet(alarm.repeatDays);
            if (activeDays.isEmpty()) {
                if (target.getTimeInMillis() <= now.getTimeInMillis() - 10000L) {
                    target.add(Calendar.DAY_OF_YEAR, 1);
                }
                return target.getTimeInMillis();
            }

            for (int i = 0; i < 8; i++) {
                int dayOfWeek = target.get(Calendar.DAY_OF_WEEK); // 1=Sun, 2=Mon ... 7=Sat
                if (activeDays.contains(dayOfWeek)) {
                    if (target.getTimeInMillis() > now.getTimeInMillis() - 10000L) {
                        return target.getTimeInMillis();
                    }
                }
                target.add(Calendar.DAY_OF_YEAR, 1);
            }
            return target.getTimeInMillis();
        } else { // "everyday"
            if (target.getTimeInMillis() <= now.getTimeInMillis() - 10000L) {
                target.add(Calendar.DAY_OF_YEAR, 1);
            }
            return target.getTimeInMillis();
        }
    }

    private static Set<Integer> parseDaysSet(String repeatDaysStr) {
        Set<Integer> set = new HashSet<>();
        if (repeatDaysStr == null || repeatDaysStr.trim().isEmpty()) return set;
        try {
            JSONArray arr = new JSONArray(repeatDaysStr);
            for (int i = 0; i < arr.length(); i++) {
                int val = arr.optInt(i, -1);
                if (val >= 1 && val <= 7) {
                    set.add(val);
                }
            }
        } catch (Exception e) {
            String[] parts = repeatDaysStr.replace("[", "").replace("]", "").split(",");
            for (String p : parts) {
                try {
                    int val = Integer.parseInt(p.trim());
                    if (val >= 1 && val <= 7) set.add(val);
                } catch (Exception ignored) {}
            }
        }
        return set;
    }

    /**
     * Schedule an exact alarm
     */
    public static void scheduleDailyAlarm(Context context, AlarmItem alarm) {
        if (context == null || alarm == null || !alarm.enabled) return;

        long triggerAtMs = calculateNextTriggerTime(alarm);
        setExactAlarm(context, alarm.id, alarm.id, alarm.title, alarm.timeStr, alarm.audioType, triggerAtMs, false);

        saveOrUpdateAlarmInPrefs(context, alarm);
        Log.i(TAG, "Scheduled alarm id=" + alarm.id + " (mode=" + alarm.repeatMode + ") for " + new java.util.Date(triggerAtMs).toString());
    }

    /**
     * Schedule a 2-minute snooze follow-up alarm
     */
    public static void scheduleSnoozeAlarm(Context context, int originalAlarmId, String title, String timeStr, String audioType) {
        if (context == null) return;

        long triggerAtMs = System.currentTimeMillis() + (2 * 60 * 1000L); // Exactly 2 minutes
        int snoozeRequestCode = Math.abs(originalAlarmId) + 77000;

        setExactAlarm(context, snoozeRequestCode, originalAlarmId, title, timeStr, audioType, triggerAtMs, true);
        Log.i(TAG, "Scheduled 2-minute snooze alarm for originalId=" + originalAlarmId + " (snoozeCode=" + snoozeRequestCode + ")");
    }

    /**
     * Cancel any pending snooze alarm for the original alarm ID
     */
    public static void cancelSnoozeAlarm(Context context, int originalAlarmId) {
        if (context == null) return;
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            int snoozeCode = Math.abs(originalAlarmId) + 77000;
            Intent intent = new Intent(context, AlarmReceiver.class);
            PendingIntent piSnooze = PendingIntent.getBroadcast(
                context, snoozeCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            alarmManager.cancel(piSnooze);
            Log.i(TAG, "Cancelled pending snooze alarm for originalId=" + originalAlarmId);
        }
    }

    /**
     * Reschedule alarm for next occurrence upon user dismissal
     */
    public static void scheduleNextDayAlarm(Context context, int originalAlarmId) {
        if (context == null) return;

        cancelSnoozeAlarm(context, originalAlarmId);

        AlarmItem alarm = getAlarmById(context, originalAlarmId);
        if (alarm != null && alarm.enabled) {
            String mode = alarm.repeatMode != null ? alarm.repeatMode.toLowerCase().trim() : "everyday";
            if ("once".equals(mode)) {
                alarm.enabled = false;
                cancelAlarm(context, alarm.id);
                saveOrUpdateAlarmInPrefs(context, alarm);
                Log.i(TAG, "One-time alarm id=" + alarm.id + " completed and disabled.");
            } else {
                scheduleDailyAlarm(context, alarm);
            }
        }
    }

    private static void setExactAlarm(Context context, int requestCode, int originalAlarmId, String title, String timeStr, String audioType, long triggerAtMs, boolean isSnooze) {
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) return;

        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.setAction("ACTION_FIRE_ALARM");
        intent.putExtra("id", requestCode);
        intent.putExtra("originalAlarmId", originalAlarmId);
        intent.putExtra("title", title);
        intent.putExtra("time", timeStr);
        intent.putExtra("audioType", audioType);
        intent.putExtra("isSnooze", isSnooze);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Intent showIntent = new Intent(context, MainActivity.class);
        PendingIntent showPendingIntent = PendingIntent.getActivity(
            context,
            requestCode,
            showIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AlarmManager.AlarmClockInfo clockInfo = new AlarmManager.AlarmClockInfo(triggerAtMs, showPendingIntent);
                alarmManager.setAlarmClock(clockInfo, pendingIntent);
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
            }
        } catch (SecurityException e) {
            Log.e(TAG, "Exact alarm permission missing, fallback to setAndAllowWhileIdle()", e);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
            } else {
                alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMs, pendingIntent);
            }
        }
    }

    /**
     * Cancel an alarm and its pending snooze
     */
    public static void cancelAlarm(Context context, int alarmId) {
        if (context == null) return;

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            Intent intent = new Intent(context, AlarmReceiver.class);
            PendingIntent pi = PendingIntent.getBroadcast(
                context, alarmId, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            alarmManager.cancel(pi);

            int snoozeCode = Math.abs(alarmId) + 77000;
            PendingIntent piSnooze = PendingIntent.getBroadcast(
                context, snoozeCode, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
            alarmManager.cancel(piSnooze);
        }

        removeAlarmFromPrefs(context, alarmId);
    }

    /**
     * Reschedule all enabled alarms on device reboot (BOOT_COMPLETED)
     */
    public static void rescheduleAllAlarmsOnBoot(Context context) {
        if (context == null) return;

        JSONArray arr = getAllAlarmsJson(context);
        Log.i(TAG, "Rescheduling " + arr.length() + " alarms on device boot...");

        for (int i = 0; i < arr.length(); i++) {
            try {
                AlarmItem item = AlarmItem.fromJsonObject(arr.getJSONObject(i));
                if (item != null && item.enabled) {
                    scheduleDailyAlarm(context, item);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error rescheduling alarm on boot", e);
            }
        }
    }

    // --- Preferences Persistence Helpers ---

    public static JSONArray getAllAlarmsJson(Context context) {
        if (context == null) return new JSONArray();
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String jsonStr = prefs.getString(KEY_ALARM_LIST, "[]");
        try {
            return new JSONArray(jsonStr);
        } catch (Exception e) {
            return new JSONArray();
        }
    }

    public static AlarmItem getAlarmById(Context context, int alarmId) {
        JSONArray arr = getAllAlarmsJson(context);
        for (int i = 0; i < arr.length(); i++) {
            try {
                AlarmItem item = AlarmItem.fromJsonObject(arr.getJSONObject(i));
                if (item != null && item.id == alarmId) {
                    return item;
                }
            } catch (Exception ignored) {}
        }
        return null;
    }

    public static void saveOrUpdateAlarmInPrefs(Context context, AlarmItem alarm) {
        if (context == null || alarm == null) return;
        JSONArray arr = getAllAlarmsJson(context);
        JSONArray newArr = new JSONArray();
        boolean updated = false;

        for (int i = 0; i < arr.length(); i++) {
            try {
                JSONObject obj = arr.getJSONObject(i);
                if (obj.optInt("id") == alarm.id) {
                    newArr.put(alarm.toJsonObject());
                    updated = true;
                } else {
                    newArr.put(obj);
                }
            } catch (Exception ignored) {}
        }

        if (!updated) {
            newArr.put(alarm.toJsonObject());
        }

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_ALARM_LIST, newArr.toString()).apply();
    }

    public static void removeAlarmFromPrefs(Context context, int alarmId) {
        if (context == null) return;
        JSONArray arr = getAllAlarmsJson(context);
        JSONArray newArr = new JSONArray();

        for (int i = 0; i < arr.length(); i++) {
            try {
                JSONObject obj = arr.getJSONObject(i);
                if (obj.optInt("id") != alarmId) {
                    newArr.put(obj);
                }
            } catch (Exception ignored) {}
        }

        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().putString(KEY_ALARM_LIST, newArr.toString()).apply();
    }
}
