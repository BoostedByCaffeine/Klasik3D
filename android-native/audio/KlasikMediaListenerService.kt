package com.boostedbycaffeine.klasik3d.audio

import android.content.ComponentName
import android.content.Context
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import java.lang.ref.WeakReference

/**
 * Tier-2 NotificationListenerService for Klasik 3D External Hologram Mode.
 * Tracks active external media sessions (Spotify, YouTube Music, Apple Music, SoundCloud, etc.)
 * and pushes lightweight metadata updates (title, artist, sourceApp, isPlaying) to KlasikNativeAudioBridge
 * without fetching or decoding album artwork.
 */
class KlasikMediaListenerService : NotificationListenerService() {

    private var mediaSessionManager: MediaSessionManager? = null
    private val trackedControllers = mutableListOf<MediaController>()

    private val controllerCallback = object : MediaController.Callback() {
        override fun onMetadataChanged(metadata: MediaMetadata?) {
            notifyBridgeUpdate()
        }

        override fun onPlaybackStateChanged(state: PlaybackState?) {
            notifyBridgeUpdate()
        }
    }

    private val activeSessionsListener =
        MediaSessionManager.OnActiveSessionsChangedListener { controllers ->
            rebindControllers(controllers ?: emptyList())
            notifyBridgeUpdate()
        }

    override fun onListenerConnected() {
        super.onListenerConnected()
        attachSessionWatcher()
    }

    override fun onListenerDisconnected() {
        detachSessionWatcher()
        super.onListenerDisconnected()
    }

    override fun onDestroy() {
        detachSessionWatcher()
        super.onDestroy()
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        // Lightweight pass-through; media updates are driven by MediaSessionManager callbacks
    }

    private fun attachSessionWatcher() {
        try {
            val manager = getSystemService(Context.MEDIA_SESSION_SERVICE) as? MediaSessionManager
                ?: return
            mediaSessionManager = manager
            val component = ComponentName(this, KlasikMediaListenerService::class.java)
            manager.addOnActiveSessionsChangedListener(activeSessionsListener, component)
            val current = manager.getActiveSessions(component)
            rebindControllers(current)
            notifyBridgeUpdate()
        } catch (_: SecurityException) {
            // Notification access not yet granted; Tier-1 AudioManager fallback remains active
        } catch (_: Exception) {
            // Safe no-op on OEM ROMs with restricted session APIs
        }
    }

    private fun detachSessionWatcher() {
        try {
            mediaSessionManager?.removeOnActiveSessionsChangedListener(activeSessionsListener)
        } catch (_: Exception) {
        }
        clearControllerCallbacks()
        mediaSessionManager = null
    }

    private fun rebindControllers(controllers: List<MediaController>) {
        clearControllerCallbacks()
        for (controller in controllers) {
            if (controller.packageName == packageName) continue
            try {
                controller.registerCallback(controllerCallback)
                trackedControllers.add(controller)
            } catch (_: Exception) {
            }
        }
    }

    private fun clearControllerCallbacks() {
        for (controller in trackedControllers) {
            try {
                controller.unregisterCallback(controllerCallback)
            } catch (_: Exception) {
            }
        }
        trackedControllers.clear()
    }

    private fun notifyBridgeUpdate() {
        bridgeRef?.get()?.pushMetadataToWebView()
    }

    companion object {
        @Volatile
        private var bridgeRef: WeakReference<KlasikNativeAudioBridge>? = null

        @JvmStatic
        fun registerBridge(bridge: KlasikNativeAudioBridge?) {
            bridgeRef = if (bridge != null) WeakReference(bridge) else null
        }

        @JvmStatic
        fun getActiveExternalController(context: Context): MediaController? {
            return try {
                val manager =
                    context.getSystemService(Context.MEDIA_SESSION_SERVICE) as? MediaSessionManager
                        ?: return null
                val component = ComponentName(context, KlasikMediaListenerService::class.java)
                val sessions = manager.getActiveSessions(component)
                    .filter { it.packageName != context.packageName }
                sessions.firstOrNull {
                    it.playbackState?.state == PlaybackState.STATE_PLAYING
                } ?: sessions.firstOrNull()
            } catch (_: SecurityException) {
                null
            } catch (_: Exception) {
                null
            }
        }

        @JvmStatic
        fun isRunningOnSupportedApi(): Boolean = Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP
    }
}
