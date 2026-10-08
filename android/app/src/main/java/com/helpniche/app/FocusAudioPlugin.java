package com.helpniche.app;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.OpenableColumns;
import android.util.Log;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "FocusAudioPlugin",
    permissions = {
        @Permission(
            alias = "media_audio",
            strings = { Manifest.permission.READ_MEDIA_AUDIO }
        ),
        @Permission(
            alias = "storage",
            strings = { Manifest.permission.READ_EXTERNAL_STORAGE }
        )
    }
)
public class FocusAudioPlugin extends Plugin {

    private static final String TAG = "FocusAudioPlugin";
    private static final String PREFS_NAME = "HelpnichePrefs";
    private static final String KEY_AUDIO_TYPE = "focus_audio_type"; // "library", "device"
    private static final String KEY_AUDIO_URI = "focus_audio_uri";
    private static final String KEY_AUDIO_NAME = "focus_audio_name";

    @PluginMethod
    public void selectDeviceAudio(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (getPermissionState("media_audio") != com.getcapacitor.PermissionState.GRANTED) {
                requestPermissionForAlias("media_audio", call, "onPermissionResult");
                return;
            }
        } else {
            if (getPermissionState("storage") != com.getcapacitor.PermissionState.GRANTED) {
                requestPermissionForAlias("storage", call, "onPermissionResult");
                return;
            }
        }

        launchAudioPicker(call);
    }

    @PermissionCallback
    private void onPermissionResult(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (getPermissionState("media_audio") == com.getcapacitor.PermissionState.GRANTED) {
                launchAudioPicker(call);
            } else {
                call.reject("READ_MEDIA_AUDIO permission denied");
            }
        } else {
            if (getPermissionState("storage") == com.getcapacitor.PermissionState.GRANTED) {
                launchAudioPicker(call);
            } else {
                call.reject("READ_EXTERNAL_STORAGE permission denied");
            }
        }
    }

    private void launchAudioPicker(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        intent.setType("audio/*");
        startActivityForResult(call, intent, "handleAudioPickerResult");
    }

    @ActivityCallback
    private void handleAudioPickerResult(PluginCall call, ActivityResult result) {
        if (call == null) return;

        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null) {
            Intent data = result.getData();
            Uri uri = data.getData();
            if (uri != null) {
                try {
                    // Take persistent read permission for SAF Content URI
                    int takeFlags = Intent.FLAG_GRANT_READ_URI_PERMISSION;
                    getContext().getContentResolver().takePersistableUriPermission(uri, takeFlags);
                } catch (Exception e) {
                    Log.w(TAG, "Failed taking persistable URI permission", e);
                }

                String fileName = getFileNameFromUri(uri);
                if (fileName == null || fileName.trim().isEmpty()) {
                    fileName = "Custom Local Audio";
                }

                SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                prefs.edit()
                    .putString(KEY_AUDIO_TYPE, "device")
                    .putString(KEY_AUDIO_URI, uri.toString())
                    .putString(KEY_AUDIO_NAME, fileName)
                    .apply();

                JSObject ret = new JSObject();
                ret.put("success", true);
                ret.put("uri", uri.toString());
                ret.put("fileName", fileName);
                ret.put("audioType", "device");
                call.resolve(ret);
                return;
            }
        }

        call.reject("User cancelled audio selection");
    }

    private String getFileNameFromUri(Uri uri) {
        String result = null;
        if ("content".equals(uri.getScheme())) {
            try (Cursor cursor = getContext().getContentResolver().query(uri, null, null, null, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    int index = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                    if (index != -1) {
                        result = cursor.getString(index);
                    }
                }
            } catch (Exception ignored) {}
        }
        if (result == null) {
            result = uri.getPath();
            if (result != null) {
                int cut = result.lastIndexOf('/');
                if (cut != -1) {
                    result = result.substring(cut + 1);
                }
            }
        }
        return result;
    }

    @PluginMethod
    public void getSelectedAudio(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String type = prefs.getString(KEY_AUDIO_TYPE, "library");
        String uri = prefs.getString(KEY_AUDIO_URI, "");
        String name = prefs.getString(KEY_AUDIO_NAME, "দুরূদ শরীফ (Durood Sharif)");

        JSObject ret = new JSObject();
        ret.put("audioType", type);
        ret.put("audioUri", uri);
        ret.put("audioName", name);
        call.resolve(ret);
    }

    @PluginMethod
    public void setSelectedAudio(PluginCall call) {
        String type = call.getString("audioType", "library");
        String uri = call.getString("audioUri", "");
        String name = call.getString("audioName", "প্রিসেট সাউন্ড");

        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit()
            .putString(KEY_AUDIO_TYPE, type)
            .putString(KEY_AUDIO_URI, uri)
            .putString(KEY_AUDIO_NAME, name)
            .apply();

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void playAudio(PluginCall call) {
        String uri = call.getString("audioUri", "");
        String type = call.getString("audioType", "library");
        String name = call.getString("audioName", "Focus Audio");

        try {
            Intent serviceIntent = new Intent(getContext(), FocusAudioService.class);
            serviceIntent.setAction(FocusAudioService.ACTION_PLAY);
            serviceIntent.putExtra(FocusAudioService.EXTRA_AUDIO_URI, uri);
            serviceIntent.putExtra(FocusAudioService.EXTRA_AUDIO_TYPE, type);
            serviceIntent.putExtra(FocusAudioService.EXTRA_AUDIO_NAME, name);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(serviceIntent);
            } else {
                getContext().startService(serviceIntent);
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to start audio playback service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopAudio(PluginCall call) {
        try {
            Intent serviceIntent = new Intent(getContext(), FocusAudioService.class);
            serviceIntent.setAction(FocusAudioService.ACTION_STOP);
            getContext().startService(serviceIntent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to stop audio service: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setMuted(PluginCall call) {
        Boolean muted = call.getBoolean("muted", false);
        try {
            Intent serviceIntent = new Intent(getContext(), FocusAudioService.class);
            serviceIntent.setAction(FocusAudioService.ACTION_SET_MUTED);
            serviceIntent.putExtra("is_muted", Boolean.TRUE.equals(muted));
            getContext().startService(serviceIntent);

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("isMuted", Boolean.TRUE.equals(muted));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to set muted: " + e.getMessage());
        }
    }
}
