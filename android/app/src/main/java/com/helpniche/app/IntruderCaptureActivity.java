package com.helpniche.app;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.pm.PackageManager;
import android.graphics.ImageFormat;
import android.net.Uri;
import android.os.Environment;
import android.provider.MediaStore;
import android.hardware.camera2.CameraAccessException;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraCharacteristics;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CameraMetadata;
import android.hardware.camera2.CaptureRequest;
import android.hardware.camera2.params.StreamConfigurationMap;
import android.media.Image;
import android.media.ImageReader;
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
import java.io.FileOutputStream;
import java.nio.ByteBuffer;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class IntruderCaptureActivity extends Activity {

    private static final String TAG = "IntruderCapture";

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
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED);
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

        // সেফগার্ড: কোনো কারণে ক্যামেরা ব্যস্ত থাকলে সর্বোচ্চ ৩ সেকেন্ড পর অ্যাক্টিভিটি শেষ হবে
        mainHandler.postDelayed(timeoutRunnable, 3000);

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

            // যদি ফ্রন্ট ক্যামেরা না পাওয়া যায়, তবে ব্যাক ক্যামেরা ব্যবহার করা
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
                try {
                    image = reader.acquireLatestImage();
                    if (image != null) {
                        ByteBuffer buffer = image.getPlanes()[0].getBuffer();
                        byte[] bytes = new byte[buffer.remaining()];
                        buffer.get(bytes);
                        saveCapturedPhoto(bytes);
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error acquiring image", e);
                } finally {
                    if (image != null) {
                        try { image.close(); } catch (Exception ignored) {}
                    }
                    cleanupAndFinish();
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

    private void takePictureSession(int jpegOrientation) {
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
                        builder.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE);
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
                    cleanupAndFinish();
                }
            }, backgroundHandler);
        } catch (Exception e) {
            Log.e(TAG, "Session create error", e);
            cleanupAndFinish();
        }
    }

    private void saveCapturedPhoto(byte[] data) {
        try {
            File dir = new File(getFilesDir(), "intruder_logs");
            if (!dir.exists()) {
                dir.mkdirs();
            }

            // অটো-রিসাইকেল: সর্বোচ্চ ১০টি ছবি রাখা হবে, অতিরিক্ত ছবি থাকলে পুরনো ছবি মুছে যাবে
            File[] existing = dir.listFiles();
            if (existing != null && existing.length >= 10) {
                Arrays.sort(existing, Comparator.comparingLong(File::lastModified));
                for (int i = 0; i <= existing.length - 10; i++) {
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
        } catch (Exception e) {
            Log.e(TAG, "Failed to save intruder photo", e);
        }
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
