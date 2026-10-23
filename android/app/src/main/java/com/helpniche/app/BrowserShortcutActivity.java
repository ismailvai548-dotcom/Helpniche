package com.helpniche.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.widget.Toast;

public class BrowserShortcutActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        try {
            boolean launched = UnlockPlugin.launchBrowserApp(this, false);
            if (!launched) {
                Toast.makeText(this, "ব্রাউজারটি প্রথমে Helpniche অ্যাপ থেকে ইনস্টল করুন", Toast.LENGTH_LONG).show();
                Intent mainIntent = new Intent(this, MainActivity.class);
                mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                startActivity(mainIntent);
            }
        } catch (Exception ignored) {
        } finally {
            finish();
            overridePendingTransition(0, 0);
        }
    }
}
