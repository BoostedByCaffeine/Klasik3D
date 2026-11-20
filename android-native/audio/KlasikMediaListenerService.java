package com.boostedbycaffeine.klasik3d.audio;

import android.content.ComponentName;
import android.content.Context;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.MediaSessionManager;
import android.media.session.PlaybackState;
import android.os.Build;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import java.lang.ref.WeakReference;
import java.util.ArrayList;
import java.util.List;

/**
 * Tier-2 NotificationListenerService for Klasik 3D External Hologram Mode.
 * Tracks active external media sessions (Spotify, YouTube Music, Apple Music, SoundCloud, etc.)
 * and pushes lightweight metadata updates (title, artist, sourceApp, isPlaying) to KlasikNativeAudioBridge
 * without fetching or decoding album artwork.
 */
public class KlasikMediaListenerService extends NotificationListenerService {

    private static volatile WeakReference<KlasikNativeAudioBridge> bridgeRef = null;

    private MediaSessionManager mediaSessionManager = null;
    private final List<MediaController> trackedControllers = new ArrayList<>();

    private final MediaController.Callback controllerCallback = new MediaController.Callback() {
        @Override
        public void onMetadataChanged(MediaMetadata metadata) {
            notifyBridgeUpdate();
        }

        @Override
        public void onPlaybackStateChanged(PlaybackState state) {
            notifyBridgeUpdate();
        }
    };

    private final MediaSessionManager.OnActiveSessionsChangedListener activeSessionsListener =
        new MediaSessionManager.OnActiveSessionsChangedListener() {
            @Override
            public void onActiveSessionsChanged(List<MediaController> controllers) {
                rebindControllers(controllers != null ? controllers : new ArrayList<MediaController>());
                notifyBridgeUpdate();
            }
        };

    @Override
    public void onListenerConnected() {
        super.onListenerConnected();
        attachSessionWatcher();
    }

    @Override
    public void onListenerDisconnected() {
        detachSessionWatcher();
        super.onListenerDisconnected();
    }

    @Override
    public void onDestroy() {
        detachSessionWatcher();
        super.onDestroy();
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        // Lightweight pass-through; media updates are driven by MediaSessionManager callbacks
    }

    private void attachSessionWatcher() {
        try {
            MediaSessionManager manager =
                (MediaSessionManager) getSystemService(Context.MEDIA_SESSION_SERVICE);
            if (manager == null) {
                return;
            }
            mediaSessionManager = manager;
            ComponentName component = new ComponentName(this, KlasikMediaListenerService.class);
            manager.addOnActiveSessionsChangedListener(activeSessionsListener, component);
            List<MediaController> current = manager.getActiveSessions(component);
            rebindControllers(current != null ? current : new ArrayList<MediaController>());
            notifyBridgeUpdate();
        } catch (SecurityException ignored) {
            // Notification access not yet granted; Tier-1 AudioManager fallback remains active
        } catch (Exception ignored) {
            // Safe no-op on OEM ROMs with restricted session APIs
        }
    }

    private void detachSessionWatcher() {
        try {
            if (mediaSessionManager != null) {
                mediaSessionManager.removeOnActiveSessionsChangedListener(activeSessionsListener);
            }
        } catch (Exception ignored) {
        }
        clearControllerCallbacks();
        mediaSessionManager = null;
    }

    private void rebindControllers(List<MediaController> controllers) {
        clearControllerCallbacks();
        String selfPkg = getPackageName();
        for (MediaController controller : controllers) {
            if (controller == null) continue;
            if (selfPkg != null && selfPkg.equals(controller.getPackageName())) continue;
            try {
                controller.registerCallback(controllerCallback);
                trackedControllers.add(controller);
            } catch (Exception ignored) {
            }
        }
    }

    private void clearControllerCallbacks() {
        for (MediaController controller : trackedControllers) {
            try {
                controller.unregisterCallback(controllerCallback);
            } catch (Exception ignored) {
            }
        }
        trackedControllers.clear();
    }

    private void notifyBridgeUpdate() {
        WeakReference<KlasikNativeAudioBridge> ref = bridgeRef;
        KlasikNativeAudioBridge bridge = ref != null ? ref.get() : null;
        if (bridge != null) {
            bridge.pushMetadataToWebView();
        }
    }

    public static void registerBridge(KlasikNativeAudioBridge bridge) {
        bridgeRef = bridge != null ? new WeakReference<>(bridge) : null;
    }

    public static MediaController getActiveExternalController(Context context) {
        try {
            MediaSessionManager manager =
                (MediaSessionManager) context.getSystemService(Context.MEDIA_SESSION_SERVICE);
            if (manager == null) {
                return null;
            }
            ComponentName component = new ComponentName(context, KlasikMediaListenerService.class);
            List<MediaController> sessions = manager.getActiveSessions(component);
            if (sessions == null || sessions.isEmpty()) {
                return null;
            }
            String selfPkg = context.getPackageName();
            MediaController fallback = null;
            for (MediaController controller : sessions) {
                if (controller == null) continue;
                if (selfPkg != null && selfPkg.equals(controller.getPackageName())) continue;
                if (fallback == null) {
                    fallback = controller;
                }
                PlaybackState pb = controller.getPlaybackState();
                if (pb != null && pb.getState() == PlaybackState.STATE_PLAYING) {
                    return controller;
                }
            }
            return fallback;
        } catch (SecurityException ignored) {
            return null;
        } catch (Exception ignored) {
            return null;
        }
    }

    public static boolean isRunningOnSupportedApi() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP;
    }
}
