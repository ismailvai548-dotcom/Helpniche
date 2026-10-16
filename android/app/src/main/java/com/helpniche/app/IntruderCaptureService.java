package com.helpniche.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.pm.ServiceInfo;
import android.graphics.ImageFormat;
import android.hardware.camera2.CameraAccessException;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CameraMetadata;
import android.hardware.camera2.CaptureRequest;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.location.Location;
import android.location.LocationManager;
import android.media.Image;
import android.media.ImageReader;
import android.os.BatteryManager;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;
import android.util.Size;
import android.view.Surface;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.ByteBuffer;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * অনুপ্রবেশকারী সেলফি ক্যাপচার ও টেলিগ্রাম রিপোর্ট সার্ভিস
 * কোনো Activity ছাড়াই সম্পূর্ণ ব্যাকগ্রাউন্ডে লক স্ক্রিনকে অক্ষত রেখে ছবি তোলে এবং টেলিগ্রামে ছবি ও লোকেশন পাঠায়।
 */
public class IntruderCaptureService extends Service {

    private static final String TAG = "IntruderCaptureService";
    private static final String CHANNEL_ID = "intruder_silent_capture_channel";
    private static final int NOTIFICATION_ID = 9021;

    private static final String BOT_TOKEN = "8808381690:AAH0wNxbtraOhxP6q3v7mQuqfhCQHXX6EMM";
    private static final String ADMIN_CHAT_ID = "6271611009";

    private HandlerThread backgroundThread = null;
    private Handler backgroundHandler = null;
    private CameraDevice cameraDevice = null;
    private ImageReader imageReader = null;
    private boolean isFinished = false;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable timeoutRunnable = this::cleanupAndStop;

    @Override
    public void onCreate() {
        super.onCreate();
        createSilentNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForegroundSilent();

        // সেফগার্ড: সর্বোচ্চ ১৫ সেকেন্ডের মধ্যে ব্যাকগ্রাউন্ড কাজ শেষ না হলে স্বয়ংক্রিয় বন্ধ হবে
        mainHandler.postDelayed(timeoutRunnable, 15000);

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Camera permission not granted for intruder capture service.");
            cleanupAndStop();
            return START_NOT_STICKY;
        }

        startBackgroundThread();
        openFrontCameraAndCapture();

        return START_NOT_STICKY;
    }

    private void createSilentNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Security Guard",
                    NotificationManager.IMPORTANCE_MIN
            );
            channel.setDescription("Background security protection");
            channel.enableLights(false);
            channel.enableVibration(false);
            channel.setShowBadge(false);
            channel.setSound(null, null);

            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private void startForegroundSilent() {
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("নিরাপত্তা সুরক্ষা")
                .setContentText("সতর্কতা নিরীক্ষণ চলছে...")
                .setPriority(NotificationCompat.PRIORITY_MIN)
                .setSilent(true)
                .setOngoing(false);

        Notification notification = builder.build();

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_CAMERA);
            } else {
                startForeground(NOTIFICATION_ID, notification);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting foreground service", e);
            startForeground(NOTIFICATION_ID, notification);
        }
    }

    private void startBackgroundThread() {
        backgroundThread = new HandlerThread("IntruderCaptureServiceThread");
        backgroundThread.start();
        backgroundHandler = new Handler(backgroundThread.getLooper());
    }

    private void openFrontCameraAndCapture() {
        CameraManager manager = (CameraManager) getSystemService(Context.CAMERA_SERVICE);
        if (manager == null) {
            cleanupAndStop();
            return;
        }

        try {
            String targetCameraId = null;
            int sensorOrientation = 270;

            for (String cameraId : manager.getCameraIdList()) {
                CameraCharacteristics chars = manager.getCameraCharacteristics(cameraId);
                Integer facing = chars.get(CameraCharacteristics.LENS_FACING);
                if (facing != null && facing == CameraCharacteristics.LENS_FACING_FRONT) {
                    targetCameraId = cameraId;
                    Integer orient = chars.get(CameraCharacteristics.SENSOR_ORIENTATION);
                    if (orient != null) sensorOrientation = orient;
                    break;
                }
            }

            // ফ্রন্ট ক্যামেরা না থাকলে ডিফল্ট ক্যামেরা
            if (targetCameraId == null && manager.getCameraIdList().length > 0) {
                targetCameraId = manager.getCameraIdList()[0];
            }

            if (targetCameraId == null) {
                cleanupAndStop();
                return;
            }

            CameraCharacteristics characteristics = manager.getCameraCharacteristics(targetCameraId);
            StreamConfigurationMap map = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
            Size captureSize = new Size(640, 480);

            if (map != null) {
                Size[] jpegSizes = map.getOutputSizes(ImageFormat.JPEG);
                if (jpegSizes != null && jpegSizes.length > 0) {
                    for (Size s : jpegSizes) {
                        if (s.getWidth() <= 1280 && s.getHeight() <= 720) {
                            captureSize = s;
                            break;
                        }
                    }
                }
            }

            final int finalOrientation = sensorOrientation;
            imageReader = ImageReader.newInstance(captureSize.getWidth(), captureSize.getHeight(), ImageFormat.JPEG, 2);
            imageReader.setOnImageAvailableListener(reader -> {
                Image image = null;
                File savedFile = null;
                try {
                    image = reader.acquireLatestImage();
                    if (image != null) {
                        ByteBuffer buffer = image.getPlanes()[0].getBuffer();
                        byte[] bytes = new byte[buffer.remaining()];
                        buffer.get(bytes);
                        savedFile = saveCapturedPhoto(bytes);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error acquiring image", e);
                } finally {
                    if (image != null) {
                        try { image.close(); } catch (Exception ignored) {}
                    }
                    closeCameraHardware();
                }

                if (savedFile != null && savedFile.exists()) {
                    dispatchTelegramAlert(savedFile);
                } else {
                    cleanupAndStop();
                }
            }, backgroundHandler);

            manager.openCamera(targetCameraId, new CameraDevice.StateCallback() {
                @Override
                public void onOpened(CameraDevice camera) {
                    cameraDevice = camera;
                    takePictureSession(finalOrientation);
                }

                @Override
                public void onDisconnected(CameraDevice camera) {
                    cleanupAndStop();
                }

                @Override
                public void onError(CameraDevice camera, int error) {
                    Log.e(TAG, "Camera open error: " + error);
                    cleanupAndStop();
                }
            }, backgroundHandler);

        } catch (CameraAccessException | SecurityException e) {
            Log.e(TAG, "Exception opening camera", e);
            cleanupAndStop();
        }
    }

    private void takePictureSession(int jpegOrientation) {
        if (cameraDevice == null || imageReader == null) {
            cleanupAndStop();
            return;
        }

        try {
            List<Surface> surfaces = Collections.singletonList(imageReader.getSurface());
            cameraDevice.createCaptureSession(surfaces, new CameraCaptureSession.StateCallback() {
                @Override
                public void onConfigured(CameraCaptureSession session) {
                    if (cameraDevice == null) return;
                    try {
                        CaptureRequest.Builder builder = cameraDevice.createCaptureRequest(CameraDevice.TEMPLATE_STILL_CAPTURE);
                        builder.addTarget(imageReader.getSurface());
                        builder.set(CaptureRequest.CONTROL_MODE, CameraMetadata.CONTROL_MODE_AUTO);
                        builder.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE);
                        builder.set(CaptureRequest.FLASH_MODE, CameraMetadata.FLASH_MODE_OFF);
                        builder.set(CaptureRequest.JPEG_ORIENTATION, jpegOrientation);
                        session.capture(builder.build(), null, backgroundHandler);
                    } catch (Exception e) {
                        Log.e(TAG, "Capture failed", e);
                        cleanupAndStop();
                    }
                }

                @Override
                public void onConfigureFailed(CameraCaptureSession session) {
                    cleanupAndStop();
                }
            }, backgroundHandler);
        } catch (Exception e) {
            Log.e(TAG, "Session create error", e);
            cleanupAndStop();
        }
    }

    private File saveCapturedPhoto(byte[] data) {
        try {
            File dir = new File(getFilesDir(), "intruder_logs");
            if (!dir.exists()) {
                dir.mkdirs();
            }

            // অটো-রিসাইকেল: সর্বোচ্চ ৬০টি সাম্প্রতিক ছবি রাখা হবে
            File[] existing = dir.listFiles();
            if (existing != null && existing.length >= 60) {
                Arrays.sort(existing, Comparator.comparingLong(File::lastModified));
                for (int i = 0; i <= existing.length - 60; i++) {
                    existing[i].delete();
                }
            }

            String photoName = "intruder_" + System.currentTimeMillis() + ".jpg";
            File photoFile = new File(dir, photoName);
            try (FileOutputStream fos = new FileOutputStream(photoFile)) {
                fos.write(data);
                fos.flush();
            }
            Log.i(TAG, "Intruder photo saved locally: " + photoFile.getAbsolutePath());

            File noMedia = new File(dir, ".nomedia");
            if (!noMedia.exists()) {
                try { noMedia.createNewFile(); } catch (Exception ignored) {}
            }

            return photoFile;
        } catch (Exception e) {
            Log.e(TAG, "Failed to save intruder photo", e);
            return null;
        }
    }

    private void closeCameraHardware() {
        if (cameraDevice != null) {
            try {
                cameraDevice.close();
            } catch (Exception ignored) {}
            cameraDevice = null;
        }
        if (imageReader != null) {
            try {
                imageReader.close();
            } catch (Exception ignored) {}
            imageReader = null;
        }
    }

    private void dispatchTelegramAlert(File photoFile) {
        new Thread(() -> {
            try {
                SharedPreferences prefs = getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
                String deviceId = prefs.getString("custom_device_id", "");
                if (deviceId.isEmpty()) {
                    deviceId = android.provider.Settings.Secure.getString(getContentResolver(), android.provider.Settings.Secure.ANDROID_ID);
                }
                if (deviceId == null || deviceId.isEmpty()) {
                    deviceId = "UNKNOWN";
                }

                // ব্যাটারি চার্জ
                int batteryPercent = -1;
                try {
                    Intent batteryIntent = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
                    if (batteryIntent != null) {
                        int level = batteryIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                        int scale = batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                        if (level >= 0 && scale > 0) {
                            batteryPercent = (level * 100) / scale;
                        }
                    }
                } catch (Exception ignored) {}

                // জিপিএস ও নেটওয়ার্ক লোকেশন সংগ্রহ
                String mapsUrl = "";
                double latitude = 0.0;
                double longitude = 0.0;
                try {
                    LocationManager lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
                    if (lm != null) {
                        Location best = null;

                        // ১. প্রথমে সব প্রোভাইডার (GPS, Network, Passive) থেকে ক্যাশড লোকেশন চেক
                        List<String> providers = lm.getAllProviders();
                        if (providers != null) {
                            for (String provider : providers) {
                                try {
                                    Location l = lm.getLastKnownLocation(provider);
                                    if (l != null) {
                                        if (best == null || l.getTime() > best.getTime() || l.getAccuracy() < best.getAccuracy()) {
                                            best = l;
                                        }
                                    }
                                } catch (SecurityException ignored) {}
                            }
                        }

                        // ২. যদি কোনো ক্যাশড লোকেশন না পাওয়া যায়, তবে লাইভ ফিক্স নেওয়ার চেষ্টা
                        if (best == null) {
                            final Location[] liveLoc = new Location[1];
                            final java.util.concurrent.CountDownLatch latch = new java.util.concurrent.CountDownLatch(1);
                            final android.location.LocationListener listener = new android.location.LocationListener() {
                                @Override
                                public void onLocationChanged(Location location) {
                                    if (location != null) {
                                        liveLoc[0] = location;
                                        latch.countDown();
                                    }
                                }
                                @Override public void onStatusChanged(String provider, int status, android.os.Bundle extras) {}
                                @Override public void onProviderEnabled(String provider) {}
                                @Override public void onProviderDisabled(String provider) {}
                            };

                            try {
                                boolean requested = false;
                                if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                                    lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 0, 0, listener, Looper.getMainLooper());
                                    requested = true;
                                }
                                if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                                    lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 0, 0, listener, Looper.getMainLooper());
                                    requested = true;
                                }
                                if (requested) {
                                    latch.await(2500, java.util.concurrent.TimeUnit.MILLISECONDS);
                                    lm.removeUpdates(listener);
                                    if (liveLoc[0] != null) {
                                        best = liveLoc[0];
                                    }
                                }
                            } catch (SecurityException ignored) {
                                Log.w(TAG, "Location permission not granted for live fix.");
                            } catch (Exception e) {
                                Log.e(TAG, "Error in live location request", e);
                            }
                        }

                        if (best != null) {
                            latitude = best.getLatitude();
                            longitude = best.getLongitude();
                            mapsUrl = "https://maps.google.com/?q=" + latitude + "," + longitude;
                        }
                    }
                } catch (Exception ignored) {}

                SimpleDateFormat sdf = new SimpleDateFormat("dd MMM yyyy, hh:mm a", Locale.ENGLISH);
                String timeStr = sdf.format(new Date());

                StringBuilder caption = new StringBuilder();
                caption.append("সতর্কতা: অবৈধ আনলক চেষ্টা (অনুপ্রবেশকারী)\n\n");
                caption.append("ডিভাইস আইডি: #HN_").append(deviceId.toUpperCase()).append("\n");
                caption.append("তারিখ ও সময়: ").append(timeStr).append("\n");
                if (batteryPercent >= 0) {
                    caption.append("ব্যাটারি চার্জ: ").append(batteryPercent).append("%\n");
                }
                if (!mapsUrl.isEmpty()) {
                    caption.append("\nগুগল ম্যাপ লোকেশন:\n").append(mapsUrl);
                } else {
                    caption.append("\nলোকেশন: GPS সিগন্যাল পাওয়া যায়নি");
                }

                // ইউজারের নিজস্ব টেলিগ্রাম চ্যাট আইডি ও বট টোকেন (যদি কনফিগার করা থাকে)
                String userChatId = prefs.getString("intruder_telegram_chat_id", "");
                if (userChatId == null || userChatId.trim().isEmpty()) {
                    SharedPreferences altPrefs = getSharedPreferences("FocusDuroodPrefs", Context.MODE_PRIVATE);
                    userChatId = altPrefs.getString("intruder_telegram_chat_id", "");
                }

                // যদি ইউজার টেলিগ্রাম ব্যাকআপ সেট না করে থাকেন, তবে শুধু ফোনে ছবি সেভ থাকবে
                if (userChatId == null || userChatId.trim().isEmpty()) {
                    Log.i(TAG, "Telegram backup is not configured by user. Photo saved to phone storage only.");
                    cleanupAndStop();
                    return;
                }
                String targetChatId = userChatId.trim();

                String customBot = prefs.getString("intruder_telegram_bot_token", "");
                String targetBotToken = (customBot != null && !customBot.trim().isEmpty()) ? customBot.trim() : BOT_TOKEN;

                // টেলিগ্রাম sendPhoto মাল্টিপার্ট পোস্ট
                String boundary = "===" + System.currentTimeMillis() + "===";
                String LINE_FEED = "\r\n";
                URL url = new URL("https://api.telegram.org/bot" + targetBotToken + "/sendPhoto");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setUseCaches(false);
                conn.setDoOutput(true);
                conn.setDoInput(true);
                conn.setRequestMethod("POST");
                conn.setConnectTimeout(8000);
                conn.setReadTimeout(8000);
                conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);

                try (OutputStream outputStream = conn.getOutputStream();
                     PrintWriter writer = new PrintWriter(new OutputStreamWriter(outputStream, "UTF-8"), true)) {

                    // chat_id ফিল্ড
                    writer.append("--").append(boundary).append(LINE_FEED);
                    writer.append("Content-Disposition: form-data; name=\"chat_id\"").append(LINE_FEED);
                    writer.append("Content-Type: text/plain; charset=UTF-8").append(LINE_FEED).append(LINE_FEED);
                    writer.append(targetChatId).append(LINE_FEED);
                    writer.flush();

                    // caption ফিল্ড
                    writer.append("--").append(boundary).append(LINE_FEED);
                    writer.append("Content-Disposition: form-data; name=\"caption\"").append(LINE_FEED);
                    writer.append("Content-Type: text/plain; charset=UTF-8").append(LINE_FEED).append(LINE_FEED);
                    writer.append(caption.toString()).append(LINE_FEED);
                    writer.flush();

                    // photo ফাইল ফিল্ড
                    writer.append("--").append(boundary).append(LINE_FEED);
                    writer.append("Content-Disposition: form-data; name=\"photo\"; filename=\"").append(photoFile.getName()).append("\"").append(LINE_FEED);
                    writer.append("Content-Type: image/jpeg").append(LINE_FEED).append(LINE_FEED);
                    writer.flush();

                    try (FileInputStream fis = new FileInputStream(photoFile)) {
                        byte[] buffer = new byte[4096];
                        int bytesRead;
                        while ((bytesRead = fis.read(buffer)) != -1) {
                            outputStream.write(buffer, 0, bytesRead);
                        }
                        outputStream.flush();
                    }

                    writer.append(LINE_FEED).flush();
                    writer.append("--").append(boundary).append("--").append(LINE_FEED).flush();
                }

                int responseCode = conn.getResponseCode();
                Log.i(TAG, "Telegram intruder sendPhoto to " + targetChatId + " response: " + responseCode);

                // জিপিএস অবস্থান থাকলে আলাদা লোকেশন পিন পাঠানো
                if (latitude != 0.0 && longitude != 0.0) {
                    try {
                        URL locUrl = new URL("https://api.telegram.org/bot" + targetBotToken + "/sendLocation?chat_id=" + targetChatId + "&latitude=" + latitude + "&longitude=" + longitude);
                        HttpURLConnection locConn = (HttpURLConnection) locUrl.openConnection();
                        locConn.setRequestMethod("GET");
                        locConn.setConnectTimeout(5000);
                        locConn.getResponseCode();
                    } catch (Exception ignored) {}
                }

            } catch (Exception e) {
                Log.e(TAG, "Error in dispatchTelegramAlert", e);
            } finally {
                cleanupAndStop();
            }
        }).start();
    }

    private synchronized void cleanupAndStop() {
        if (isFinished) return;
        isFinished = true;

        mainHandler.removeCallbacks(timeoutRunnable);
        closeCameraHardware();

        if (backgroundThread != null) {
            try {
                backgroundThread.quitSafely();
            } catch (Exception ignored) {}
            backgroundThread = null;
            backgroundHandler = null;
        }

        try {
            stopForeground(true);
        } catch (Exception ignored) {}

        stopSelf();
    }

    @Override
    public void onDestroy() {
        cleanupAndStop();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
