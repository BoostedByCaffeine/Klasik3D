package com.boostedbycaffeine.klasik3d.audio

import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.PlaybackState
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONObject

/**
 * Two-Tier Android WebView JavaScript Bridge ("KlasikNativeAudio") for External Hologram Mode.
 * - Tier 1 (Zero Permissions): AudioManager.isMusicActive() detects active external playback on boot/resume.
 * - Tier 2 (Optional Notification Access): Reads track title, artist, source app, and playback state
 *   via MediaSessionManager and exposes transport controls without requesting exclusive AUDIOFOCUS_GAIN.
 */
class KlasikNativeAudioBridge(
    private val context: Context,
    private val webView: WebView
) {
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    init {
        KlasikMediaListenerService.registerBridge(this)
    }

    @JavascriptInterface
    fun isExternalMusicActive(): Boolean {
        val controller = getActiveMediaController()
        if (controller?.playbackState?.state == PlaybackState.STATE_PLAYING) {
            return true
        }
        return try {
            audioManager.isMusicActive
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun hasNotificationAccess(): Boolean {
        return try {
            val flat = Settings.Secure.getString(
                context.contentResolver,
                "enabled_notification_listeners"
            ) ?: return false
            flat.contains(context.packageName)
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun hasNotificationPermission(): Boolean = hasNotificationAccess()

    @JavascriptInterface
    fun hasNotificationListenerPermission(): Boolean = hasNotificationAccess()

    @JavascriptInterface
    fun openNotificationAccessSettings() {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
        } catch (_: Exception) {
            // Graceful fallback if Settings intent is unavailable on a custom ROM
        }
    }

    @JavascriptInterface
    fun openNotificationPermission() = openNotificationAccessSettings()

    @JavascriptInterface
    fun openNotificationListenerSettings() = openNotificationAccessSettings()

    @JavascriptInterface
    fun refreshExternalMediaState() {
        pushMetadataToWebView()
    }

    @JavascriptInterface
    fun getCurrentMediaMetadata(): String {
        return buildMetadataJson().toString()
    }

    @JavascriptInterface
    fun sendMediaKey(action: String) {
        val normalized = when (action) {
            "play_pause", "playPause" -> "playPause"
            "next" -> "next"
            "prev", "previous" -> "previous"
            else -> return
        }
        sendMediaAction(normalized)
    }

    @JavascriptInterface
    fun sendMediaAction(action: String) {
        val controller = getActiveMediaController() ?: return
        try {
            when (action) {
                "playPause", "play_pause" -> {
                    val state = controller.playbackState?.state
                    if (state == PlaybackState.STATE_PLAYING) {
                        controller.transportControls.pause()
                    } else {
                        controller.transportControls.play()
                    }
                }
                "next" -> controller.transportControls.skipToNext()
                "previous", "prev" -> controller.transportControls.skipToPrevious()
            }
            webView.postDelayed({ pushMetadataToWebView() }, 220L)
        } catch (_: Exception) {
        }
    }

    fun pushMetadataToWebView() {
        val payload = buildMetadataJson()
        val js = "window.dispatchEvent(new CustomEvent('klasik-external-media-update', { detail: $payload }));"
        webView.post {
            try {
                webView.evaluateJavascript(js, null)
            } catch (_: Exception) {
            }
        }
    }

    fun release() {
        KlasikMediaListenerService.registerBridge(null)
    }

    private fun buildMetadataJson(): JSONObject {
        val hasPerm = hasNotificationAccess()
        val controller = if (hasPerm) getActiveMediaController() else null
        val meta = controller?.metadata
        val playing = controller?.playbackState?.state == PlaybackState.STATE_PLAYING ||
            isExternalMusicActive()

        val title = meta?.getString(MediaMetadata.METADATA_KEY_TITLE)?.takeIf { it.isNotBlank() }
            ?: if (playing) "External Audio Detected (Active)" else "External Audio Standby"
        val artist = meta?.getString(MediaMetadata.METADATA_KEY_ARTIST)?.takeIf { it.isNotBlank() }
            ?: if (!hasPerm && playing) "Tap Enable Now-Playing Detection" else ""
        val sourceApp = if (controller != null) {
            mapPackageName(controller.packageName)
        } else {
            "External App"
        }

        return JSONObject().apply {
            put("title", title)
            put("artist", artist)
            put("sourceApp", sourceApp)
            put("isPlaying", playing)
            put("hasPermission", hasPerm)
        }
    }

    private fun getActiveMediaController(): MediaController? {
        if (!hasNotificationAccess()) return null
        return KlasikMediaListenerService.getActiveExternalController(context)
    }

    private fun mapPackageName(pkg: String): String {
        val lower = pkg.lowercase()
        return when {
            lower.contains("spotify") -> "Spotify"
            lower.contains("youtube.music") || lower.contains("apps.youtube.music") -> "YouTube Music"
            lower.contains("youtube") -> "YouTube"
            lower.contains("apple.android.music") -> "Apple Music"
            lower.contains("soundcloud") -> "SoundCloud"
            lower.contains("deezer") -> "Deezer"
            lower.contains("tidal") -> "TIDAL"
            lower.contains("amazon.mp3") -> "Amazon Music"
            lower.contains("pandora") -> "Pandora"
            else -> "External App"
        }
    }
}
