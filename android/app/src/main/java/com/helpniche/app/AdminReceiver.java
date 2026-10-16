package com.helpniche.app;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

public class AdminReceiver extends DeviceAdminReceiver {

    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
        Toast.makeText(context, "ডিভাইস অ্যাডমিন সুরক্ষা চালু হয়েছে!", Toast.LENGTH_SHORT).show();
    }

    @Override
    public CharSequence onDisableRequested(Context context, Intent intent) {
        // কেউ সেটিংস থেকে ডিভাইস অ্যাডমিন অফ করার চেষ্টা করলে সতর্কবার্তা দেবে
        return "সতর্কতা: এই সুরক্ষা বন্ধ করতে অ্যাডমিনের টেলিগ্রাম পারমিশন কোড প্রয়োজন!";
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
        Toast.makeText(context, "ডিভাইস অ্যাডমিন সুরক্ষা বন্ধ করা হয়েছে।", Toast.LENGTH_SHORT).show();
    }
}
