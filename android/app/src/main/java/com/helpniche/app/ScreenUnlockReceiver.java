package com.helpniche.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.util.Log;
import android.widget.Toast;
import java.io.File;
import java.util.Locale;

import android.app.KeyguardManager;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.NetworkInfo;
import android.os.Build;
import android.os.PowerManager;

public class ScreenUnlockReceiver extends BroadcastReceiver {

    private static final String TAG = "ScreenUnlockReceiver";
    private static TextToSpeech tts = null;
    private static MediaPlayer mediaPlayer = null;
    private static long lastUnlockTimeMs = 0;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_USER_PRESENT.equals(action)) {
            triggerUnlockReminder(context);
            handleScreenUnlocked(context);
        } else if (Intent.ACTION_SCREEN_OFF.equals(action)) {
            handleScreenLocked(context);
        } else if (ConnectivityManager.CONNECTIVITY_ACTION.equals(action)) {
            if (isScreenInteractiveAndUnlocked(context) && isNetworkAvailable(context)) {
                handleScreenUnlocked(context);
            } else {
                handleScreenLocked(context);
            }
        }
    }

    public static void handleScreenLocked(Context context) {
        if (context == null) return;
        try {
            if (LocalDnsVpnService.isVpnRunning()) {
                Log.i(TAG, "Screen locked/off or network down: Stopping VPN to save battery and data.");
                LocalDnsVpnService.stopVpn(context);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error handling screen locked event", e);
        }
    }

    public static void handleScreenUnlocked(Context context) {
        if (context == null) return;
        try {
            SharedPreferences prefs = context.getApplicationContext().getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
            boolean isSystemWide = prefs.getBoolean("system_wide_adblock_enabled", true);
            if (!isSystemWide) return;

            if (BlockerAccessibilityService.isUnlocked(context) && !LocalDnsVpnService.hasActiveNetworkBlocks(context)) {
                return;
            }

            if (!isScreenInteractiveAndUnlocked(context)) {
                Log.i(TAG, "Screen not interactive or still locked. Keeping VPN off.");
                return;
            }

            if (isNetworkAvailable(context)) {
                if (!LocalDnsVpnService.isVpnRunning()) {
                    Log.i(TAG, "Screen unlocked and internet available: Resuming VPN for ad-blocking.");
                    LocalDnsVpnService.startVpn(context);
                }
            } else {
                Log.i(TAG, "Screen unlocked but no active internet: Keeping VPN off to save battery.");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error handling screen unlocked event", e);
        }
    }

    public static boolean isScreenInteractiveAndUnlocked(Context context) {
        if (context == null) return false;
        try {
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null && !pm.isInteractive()) {
                return false;
            }
            KeyguardManager km = (KeyguardManager) context.getSystemService(Context.KEYGUARD_SERVICE);
            if (km != null && km.isKeyguardLocked()) {
                return false;
            }
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public static boolean isNetworkAvailable(Context context) {
        if (context == null) return false;
        try {
            ConnectivityManager cm = (ConnectivityManager) context.getSystemService(Context.CONNECTIVITY_SERVICE);
            if (cm == null) return false;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Network activeNet = cm.getActiveNetwork();
                if (activeNet != null) {
                    NetworkCapabilities caps = cm.getNetworkCapabilities(activeNet);
                    if (caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
                        if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                                caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                                caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                            return true;
                        }
                    }
                }

                Network[] allNetworks = cm.getAllNetworks();
                if (allNetworks != null && allNetworks.length > 0) {
                    for (Network net : allNetworks) {
                        NetworkCapabilities caps = cm.getNetworkCapabilities(net);
                        if (caps != null && caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
                            if (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
                                    caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
                                    caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)) {
                                return true;
                            }
                        }
                    }
                }
                return false;
            } else {
                NetworkInfo info = cm.getActiveNetworkInfo();
                return info != null && info.isConnected() &&
                        (info.getType() == ConnectivityManager.TYPE_WIFI || info.getType() == ConnectivityManager.TYPE_MOBILE);
            }
        } catch (Exception e) {
            return false;
        }
    }

    public static synchronized void triggerUnlockReminder(Context context) {
        if (context == null) return;
        long now = System.currentTimeMillis();
        if (now - lastUnlockTimeMs < 3500) {
            return;
        }
        lastUnlockTimeMs = now;

        SharedPreferences prefs = context.getApplicationContext().getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
        boolean enabled = prefs.getBoolean("unlock_reminder_enabled", false);
        if (!enabled) {
            SharedPreferences altPrefs = context.getApplicationContext().getSharedPreferences("FocusDuroodPrefs", Context.MODE_PRIVATE);
            enabled = altPrefs.getBoolean("unlock_reminder_enabled", false);
            if (enabled) {
                prefs = altPrefs;
            }
        }

        // যদি টগল OFF থাকে, তবে কিছুই বাজবে না
        if (!enabled) return;

        String unlockText = prefs.getString("unlock_reminder_text", "").trim();
        String audioType = prefs.getString("unlock_reminder_audio_type", "durood_sharif").trim();

        // ১. কাস্টম টেক্সট মেসেজ থাকলে স্ক্রিনে Toast দেখানো
        if (!unlockText.isEmpty()) {
            final String toastMsg = unlockText;
            new Handler(Looper.getMainLooper()).post(() -> {
                Toast.makeText(context.getApplicationContext(), toastMsg, Toast.LENGTH_LONG).show();
            });
        }

        // ২. নির্বাচিত অডিও (কাস্টম অডিও বা ডিফল্ট দরূদ) প্লে করা
        playUnlockAudioTrack(context.getApplicationContext(), unlockText, audioType);
    }

    private static void playUnlockAudioTrack(Context context, String text, String audioType) {
        try {
            // অপশন ১: ইউজার যদি নিজের পছন্দের কাস্টম অডিও ফাইল সিলেক্ট করে থাকে
            if ("custom".equalsIgnoreCase(audioType)) {
                File customAudioFile = new File(context.getApplicationContext().getFilesDir(), "custom_unlock_audio.mp3");
                if (customAudioFile.exists()) {
                    playFileSound(context, customAudioFile);
                    return;
                } else {
                    Log.w(TAG, "Custom audio file not found, falling back to Durood Sharif.");
                }
            }

            // অপশন ২: ডিফল্ট দরূদ শরীফ বা প্রি-সেট সাউন্ড
            if ("durood_sharif".equalsIgnoreCase(audioType) || "durood".equalsIgnoreCase(audioType)) {
                int resId = context.getResources().getIdentifier("durood_sharif", "raw", context.getPackageName());
                if (resId == 0) resId = context.getResources().getIdentifier("durood", "raw", context.getPackageName());

                if (resId != 0) {
                    playRawResourceSound(context, resId);
                    return;
                }
            }

            // অপশন ৩: নোটিফিকেশন বা অ্যালার্ম টোন
            if ("notification_alert".equalsIgnoreCase(audioType) || "notification".equalsIgnoreCase(audioType)) {
                playSystemSound(context, RingtoneManager.TYPE_NOTIFICATION);
                return;
            } else if ("alarm_tone".equalsIgnoreCase(audioType) || "alarm".equalsIgnoreCase(audioType)) {
                playSystemSound(context, RingtoneManager.TYPE_ALARM);
                return;
            }

            // অপশন ৪: TTS (ভয়েস রিডার)
            if ("tts".equalsIgnoreCase(audioType) && !text.isEmpty()) {
                speakUserTextOnce(context, text);
            } else {
                // ডিফল্ট কোনো সাউন্ড পাওয়া না গেলে সাধারণ নোটিফিকেশন সাউন্ড
                playSystemSound(context, RingtoneManager.TYPE_NOTIFICATION);
            }

        } catch (Exception e) {
            Log.e(TAG, "Error playing unlock audio track", e);
            if (!text.isEmpty()) {
                speakUserTextOnce(context, text);
            }
        }
    }

    // কাস্টম অডিও ফাইল প্লে করার মেথড
    private static void playFileSound(Context context, File file) {
        try {
            stopAndReleaseMediaPlayer();
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(file.getAbsolutePath());
            mediaPlayer.setAudioAttributes(
                    new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .build()
            );
            mediaPlayer.setVolume(1.0f, 1.0f);
            mediaPlayer.prepare();
            mediaPlayer.start();
            mediaPlayer.setOnCompletionListener(mp -> stopAndReleaseMediaPlayer());
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                stopAndReleaseMediaPlayer();
                return true;
            });
        } catch (Exception e) {
            Log.e(TAG, "Error playing custom audio file", e);
            stopAndReleaseMediaPlayer();
        }
    }

    // res/raw ফোল্ডারের দরূদ অডিও প্লে করার মেথড
    private static void playRawResourceSound(Context context, int resId) {
        try {
            stopAndReleaseMediaPlayer();
            mediaPlayer = MediaPlayer.create(context.getApplicationContext(), resId);
            if (mediaPlayer != null) {
                mediaPlayer.setAudioAttributes(
                        new AudioAttributes.Builder()
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                                .build()
                );
                mediaPlayer.setVolume(1.0f, 1.0f);
                mediaPlayer.start();
                mediaPlayer.setOnCompletionListener(mp -> stopAndReleaseMediaPlayer());
                mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                    stopAndReleaseMediaPlayer();
                    return true;
                });
            }
        } catch (Exception e) {
            Log.e(TAG, "Error playing raw resource sound", e);
            stopAndReleaseMediaPlayer();
        }
    }

    private static void playSystemSound(Context context, int ringtoneType) {
        try {
            Uri soundUri = RingtoneManager.getDefaultUri(ringtoneType);
            if (soundUri != null) {
                playCustomUriSound(context, soundUri);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error playing system sound", e);
        }
    }

    private static void playCustomUriSound(Context context, Uri uri) {
        try {
            stopAndReleaseMediaPlayer();
            mediaPlayer = new MediaPlayer();
            mediaPlayer.setDataSource(context.getApplicationContext(), uri);
            mediaPlayer.setAudioAttributes(
                    new AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                            .build()
            );
            mediaPlayer.prepare();
            mediaPlayer.start();
            mediaPlayer.setOnCompletionListener(mp -> stopAndReleaseMediaPlayer());
            mediaPlayer.setOnErrorListener((mp, what, extra) -> {
                stopAndReleaseMediaPlayer();
                return true;
            });
        } catch (Exception e) {
            Log.e(TAG, "Error playing Uri sound", e);
            stopAndReleaseMediaPlayer();
        }
    }

    private static synchronized void stopAndReleaseMediaPlayer() {
        if (mediaPlayer != null) {
            try {
                if (mediaPlayer.isPlaying()) mediaPlayer.stop();
                mediaPlayer.release();
            } catch (Exception ignored) {}
            mediaPlayer = null;
        }
    }

    private static boolean isTtsInitialized = false;

    private static void speakUserTextOnce(Context context, String text) {
        if (text == null || text.trim().isEmpty()) return;
        final String speechText = text.trim();
        try {
            if (tts == null) {
                tts = new TextToSpeech(context.getApplicationContext(), status -> {
                    if (status == TextToSpeech.SUCCESS) {
                        isTtsInitialized = true;
                        int langResult = tts.setLanguage(new Locale("bn", "BD"));
                        if (langResult == TextToSpeech.LANG_MISSING_DATA || langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                            tts.setLanguage(Locale.getDefault());
                        }
                        tts.speak(speechText, TextToSpeech.QUEUE_FLUSH, null, "unlock_user_msg_id");
                    } else {
                        isTtsInitialized = false;
                    }
                });
            } else if (isTtsInitialized) {
                tts.speak(speechText, TextToSpeech.QUEUE_FLUSH, null, "unlock_dhikr_id");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error playing TTS on unlock", e);
        }
    }
}