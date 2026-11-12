package com.helpniche.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.VpnService;
import android.util.Log;
import androidx.core.content.ContextCompat;

public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;

        String action = intent.getAction();
        Log.i(TAG, "BootReceiver triggered with action: " + action);

        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || 
            Intent.ACTION_MY_PACKAGE_REPLACED.equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            
            // Requirement 1: Reschedule all enabled daily alarms on device reboot
            try {
                AlarmManagerHelper.rescheduleAllAlarmsOnBoot(context);
            } catch (Exception e) {
                Log.e(TAG, "Error rescheduling alarms on boot", e);
            }

            // রিবুটের পর বাধ্যতামূলক অ্যাক্সেসিবিলিটি রি-লক চেক
            try {
                android.content.SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
                boolean mandatoryPending = prefs.getBoolean("mandatory_accessibility_pending", false);
                boolean bankingActive = prefs.getBoolean("banking_pause_active", false);
                long pauseEnd = prefs.getLong("banking_pause_end", 0);
                if (mandatoryPending || (bankingActive && System.currentTimeMillis() >= pauseEnd)) {
                    if (!MandatoryReLockActivity.isAccessibilityEnabled(context)) {
                        Intent lockIntent = new Intent(context, MandatoryReLockActivity.class);
                        lockIntent.addFlags(
                                Intent.FLAG_ACTIVITY_NEW_TASK |
                                Intent.FLAG_ACTIVITY_CLEAR_TOP |
                                Intent.FLAG_ACTIVITY_SINGLE_TOP |
                                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                        );
                        context.startActivity(lockIntent);
                    }
                }
            } catch (Exception e) {
                Log.e(TAG, "Error checking mandatory lock on boot", e);
            }

            // Check if Local VPN protection service needs restart for System-Wide Ad Blocking
            try {
                android.content.SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
                boolean isSystemWideEnabled = prefs.getBoolean("system_wide_adblock_enabled", true);
                if (isSystemWideEnabled && VpnService.prepare(context) == null && !BlockerAccessibilityService.isUnlocked(context)) {
                    LocalDnsVpnService.startVpn(context);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error starting VPN service on boot", e);
            }

            // Start Unlock Alert Service on boot if enabled
            try {
                android.content.SharedPreferences prefs = context.getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
                boolean enabled = prefs.getBoolean("unlock_reminder_enabled", false);
                if (!enabled) {
                    android.content.SharedPreferences altPrefs = context.getSharedPreferences("FocusDuroodPrefs", Context.MODE_PRIVATE);
                    enabled = altPrefs.getBoolean("unlock_reminder_enabled", false);
                }
                if (enabled) {
                    UnlockAlertService.startService(context);
                }
            } catch (Exception e) {
                Log.e(TAG, "Error starting UnlockAlertService on boot", e);
            }

            // Restore Auto Vibrate Mode on boot
            try {
                AutoVibrateHelper.applyCurrentVibrateState(context);
            } catch (Exception e) {
                Log.e(TAG, "Error applying Auto Vibrate state on boot", e);
            }
        }
    }
}
