package com.helpniche.app;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.ImageFormat;
import android.hardware.camera2.CameraAccessException;
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
import android.os.Bundle;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.Looper;
import android.util.Log;
import android.util.Size;
import android.view.Surface;
import android.view.Window;
import android.view.WindowManager;

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

public class IntruderCaptureActivity extends Activity {

    private static final String TAG = "IntruderCapture";
    private static final String DEFAULT_BOT_TOKEN = "8808381690:AAH0wNxbtraOhxP6q3v7mQuqfhCQHXX6EMM";

    private HandlerThread backgroundThread = null;
    private Handler backgroundHandler = null;
    private CameraDevice cameraDevice = null;
    private ImageReader imageReader = null;
    private boolean isFinished = false;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable timeoutRunnable = this::cleanupAndFinish;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        overridePendingTransition(0, 0);
        super.onCreate(savedInstanceState);

        requestWindowFeature(Window.FEATURE_NO_TITLE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        }

        getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(android.graphics.Color.TRANSPARENT));
        getWindow().clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
        getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE |
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS |
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
        );

        WindowManager.LayoutParams lp = getWindow().getAttributes();
        lp.width = 1;
        lp.height = 1;
        lp.alpha = 0.0f;
        lp.dimAmount = 0.0f;
        lp.gravity = android.view.Gravity.TOP | android.view.Gravity.START;
        lp.x = 0;
        lp.y = 0;
        getWindow().setAttributes(lp);

        // সেফগার্ড: সর্বোচ্চ ৮ সেকেন্ডের মধ্যে ফ্রেম না পেলে বন্ধ হবে
        mainHandler.postDelayed(timeoutRunnable, 8000);

        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            Log.w(TAG, "Camera permission not granted for intruder capture.");
            cleanupAndFinish();
            return;
        }

        startBackgroundThread();
        openFrontCameraAndCapture();
    }

    private void startBackgroundThread() {
        backgroundThread = new HandlerThread("IntruderCaptureThread");
        backgroundThread.start();
        backgroundHandler = new Handler(backgroundThread.getLooper());
    }

    private void openFrontCameraAndCapture() {
        CameraManager manager = (CameraManager) getSystemService(Context.CAMERA_SERVICE);
        if (manager == null) {
            cleanupAndFinish();
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

            // যদি ফ্রন্ট ক্যামেরা না পাওয়া যায়, তবে প্রথম ক্যামেরা ব্যবহার
            if (targetCameraId == null && manager.getCameraIdList().length > 0) {
                targetCameraId = manager.getCameraIdList()[0];
            }

            if (targetCameraId == null) {
                cleanupAndFinish();
                return;
            }

            CameraCharacteristics characteristics = manager.getCameraCharacteristics(targetCameraId);
            StreamConfigurationMap map = characteristics.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP);
            Size captureSize = new Size(640, 480);

            if (map != null) {
                Size[] jpegSizes = map.getOutputSizes(ImageFormat.JPEG);
                if (jpegSizes != null && jpegSizes.length > 0) {
                    captureSize = jpegSizes[0];
                    for (Size s : jpegSizes) {
                        if (s.getWidth() <= 1280 && s.getHeight() <= 720 && s.getWidth() >= 480) {
                            captureSize = s;
                            break;
                        }
                    }
                }
            }

            final int finalOrientation = sensorOrientation;
            final CameraCharacteristics finalChars = characteristics;

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
                }

                if (savedFile != null && savedFile.exists()) {
                    dispatchTelegramAlert(savedFile);
                } else {
                    cleanupAndFinish();
                }
            }, backgroundHandler);

            manager.openCamera(targetCameraId, new CameraDevice.StateCallback() {
                @Override
                public void onOpened(CameraDevice camera) {
                    cameraDevice = camera;
                    takePictureSession(finalChars, finalOrientation);
                }

                @Override
                public void onDisconnected(CameraDevice camera) {
                    cleanupAndFinish();
                }

                @Override
                public void onError(CameraDevice camera, int error) {
                    Log.e(TAG, "Camera open error: " + error);
                    cleanupAndFinish();
                }
            }, backgroundHandler);

        } catch (CameraAccessException | SecurityException e) {
            Log.e(TAG, "Exception opening camera", e);
            cleanupAndFinish();
        }
    }

    private void takePictureSession(CameraCharacteristics characteristics, int jpegOrientation) {
        if (cameraDevice == null || imageReader == null) {
            cleanupAndFinish();
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

                        // ফ্রন্ট ক্যামেরায় অটোফোকাস সাপোর্ট থাকলে সেট করা, না থাকলে OFF
                        int[] afModes = characteristics.get(CameraCharacteristics.CONTROL_AF_AVAILABLE_MODES);
                        boolean hasAf = false;
                        if (afModes != null) {
                            for (int m : afModes) {
                                if (m == CameraMetadata.CONTROL_AF_MODE_CONTINUOUS_PICTURE) {
                                    hasAf = true;
                                    break;
                                }
                            }
                        }
                        if (hasAf) {
                            builder.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE);
                        } else {
                            builder.set(CaptureRequest.CONTROL_AF_MODE, CameraMetadata.CONTROL_AF_MODE_OFF);
                        }

                        builder.set(CaptureRequest.FLASH_MODE, CameraMetadata.FLASH_MODE_OFF);
                        builder.set(CaptureRequest.JPEG_ORIENTATION, jpegOrientation);
                        session.capture(builder.build(), null, backgroundHandler);
                    } catch (Exception e) {
                        Log.e(TAG, "Capture failed", e);
                        cleanupAndFinish();
                    }
                }

                @Override
                public void onConfigureFailed(CameraCaptureSession session) {
                    Log.e(TAG, "Capture session configure failed");
                    cleanupAndFinish();
                }
            }, backgroundHandler);
        } catch (Exception e) {
            Log.e(TAG, "Session create error", e);
            cleanupAndFinish();
        }
    }

    private File saveCapturedPhoto(byte[] data) {
        try {
            File dir = new File(getFilesDir(), "intruder_logs");
            if (!dir.exists()) {
                dir.mkdirs();
            }

            // সর্বোচ্চ ৫০টি ছবি রাখা হবে
            File[] existing = dir.listFiles();
            if (existing != null && existing.length >= 50) {
                Arrays.sort(existing, Comparator.comparingLong(File::lastModified));
                for (int i = 0; i <= existing.length - 50; i++) {
                    existing[i].delete();
                }
            }

            String photoName = "intruder_" + System.currentTimeMillis() + ".jpg";
            File photoFile = new File(dir, photoName);
            try (FileOutputStream fos = new FileOutputStream(photoFile)) {
                fos.write(data);
                fos.flush();
            }
            Log.i(TAG, "Intruder photo saved internally: " + photoFile.getAbsolutePath());

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

    private void dispatchTelegramAlert(File photoFile) {
        new Thread(() -> {
            try {
                SharedPreferences prefs = getSharedPreferences("HelpnichePrefs", Context.MODE_PRIVATE);
                String userChatId = prefs.getString("intruder_telegram_chat_id", "");
                if (userChatId == null || userChatId.trim().isEmpty()) {
                    SharedPreferences altPrefs = getSharedPreferences("FocusDuroodPrefs", Context.MODE_PRIVATE);
                    userChatId = altPrefs.getString("intruder_telegram_chat_id", "");
                }

                // যদি টেলিগ্রাম আইডি কনফিগার করা না থাকে, তবে শুধু ফোনে সেভ থাকবে
                if (userChatId == null || userChatId.trim().isEmpty()) {
                    cleanupAndFinish();
                    return;
                }

                String deviceId = prefs.getString("custom_device_id", "");
                if (deviceId.isEmpty()) {
                    deviceId = android.provider.Settings.Secure.getString(getContentResolver(), android.provider.Settings.Secure.ANDROID_ID);
                }
                if (deviceId == null || deviceId.isEmpty()) deviceId = "UNKNOWN";

                int batteryPercent = -1;
                try {
                    Intent batteryIntent = registerReceiver(null, new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
                    if (batteryIntent != null) {
                        int level = batteryIntent.getIntExtra(BatteryManager.EXTRA_LEVEL, -1);
                        int scale = batteryIntent.getIntExtra(BatteryManager.EXTRA_SCALE, -1);
                        if (level >= 0 && scale > 0) batteryPercent = (level * 100) / scale;
                    }
                } catch (Exception ignored) {}

                String mapsUrl = "";
                double latitude = 0.0;
                double longitude = 0.0;
                try {
                    LocationManager lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
                    if (lm != null) {
                        List<String> providers = lm.getAllProviders();
                        if (providers != null) {
                            Location best = null;
                            for (String p : providers) {
                                try {
                                    Location l = lm.getLastKnownLocation(p);
                                    if (l != null && (best == null || l.getTime() > best.getTime())) {
                                        best = l;
                                    }
                                } catch (SecurityException ignored) {}
                            }
                            if (best != null) {
                                latitude = best.getLatitude();
                                longitude = best.getLongitude();
                                mapsUrl = "https://www.google.com/maps?q=" + latitude + "," + longitude;
                            }
                        }
                    }
                } catch (Exception ignored) {}

                String timeStr = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date());
                StringBuilder caption = new StringBuilder();
                caption.append("সতর্কতা: অবৈধ আনলক চেষ্টা (অনুপ্রবেশকারী)\n\n");
                caption.append("ডিভাইস আইডি: #HN_").append(deviceId.toUpperCase()).append("\n");
                caption.append("তারিখ ও সময়: ").append(timeStr).append("\n");
                if (batteryPercent >= 0) caption.append("ব্যাটারি চার্জ: ").append(batteryPercent).append("%\n");
                if (!mapsUrl.isEmpty()) {
                    caption.append("\nগুগল ম্যাপ লোকেশন:\n").append(mapsUrl);
                }

                String customBot = prefs.getString("intruder_telegram_bot_token", "");
                String targetBotToken = (customBot != null && !customBot.trim().isEmpty()) ? customBot.trim() : DEFAULT_BOT_TOKEN;
                String targetChatId = userChatId.trim();

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

                    writer.append("--").append(boundary).append(LINE_FEED);
                    writer.append("Content-Disposition: form-data; name=\"chat_id\"").append(LINE_FEED);
                    writer.append("Content-Type: text/plain; charset=UTF-8").append(LINE_FEED).append(LINE_FEED);
                    writer.append(targetChatId).append(LINE_FEED);
                    writer.flush();

                    writer.append("--").append(boundary).append(LINE_FEED);
                    writer.append("Content-Disposition: form-data; name=\"caption\"").append(LINE_FEED);
                    writer.append("Content-Type: text/plain; charset=UTF-8").append(LINE_FEED).append(LINE_FEED);
                    writer.append(caption.toString()).append(LINE_FEED);
                    writer.flush();

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

                int code = conn.getResponseCode();
                Log.i(TAG, "Telegram sendPhoto response: " + code);

            } catch (Exception e) {
                Log.e(TAG, "Error in dispatchTelegramAlert", e);
            } finally {
                cleanupAndFinish();
            }
        }).start();
    }

    private synchronized void cleanupAndFinish() {
        if (isFinished) return;
        isFinished = true;

        mainHandler.removeCallbacks(timeoutRunnable);

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

        if (backgroundThread != null) {
            try {
                backgroundThread.quitSafely();
            } catch (Exception ignored) {}
            backgroundThread = null;
            backgroundHandler = null;
        }

        // নোটিফিকেশন থাকলে বন্ধ করা
        try {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.cancel(8821);
            }
        } catch (Exception ignored) {}

        runOnUiThread(() -> {
            finish();
            overridePendingTransition(0, 0);
        });
    }

    @Override
    protected void onDestroy() {
        cleanupAndFinish();
        super.onDestroy();
    }
}
