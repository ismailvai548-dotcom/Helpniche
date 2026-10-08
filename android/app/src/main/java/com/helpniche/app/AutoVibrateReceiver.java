package com.helpniche.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class AutoVibrateReceiver extends BroadcastReceiver {

    private static final String TAG = "AutoVibrateReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) return;
        Log.i(TAG, "AutoVibrateReceiver triggered with action: " + (intent != null ? intent.getAction() : "null"));
        try {
            AutoVibrateHelper.applyCurrentVibrateState(context);
        } catch (Exception e) {
            Log.e(TAG, "Error applying Auto Vibrate state in receiver", e);
        }
    }
}
