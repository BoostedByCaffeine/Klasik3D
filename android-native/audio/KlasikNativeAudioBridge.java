package com.boostedbycaffeine.klasik3d.audio;

import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaController;
import android.media.session.PlaybackState;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import java.util.Locale;
import org.json.JSONObject;

/**
 * Two-Tier Android WebView JavaScript Bridge ("KlasikNativeAudio") for External Hologram Mode.
 * - Tier 1 (Zero Permissions): AudioManager.isMusicActive() detects active external playback on boot/resume.
 * - Tier 2 (Optional Notification Access): Reads track title, artist, source app, and playback state
 *   via MediaSessionManager and exposes transport controls without requesting exclusive AUDIOFOCUS_GAIN.
 */
public class KlasikNativeAudioBridge {

    private final Context context;
    private final WebView webView;
    private final AudioManager audioManager;

    public KlasikNativeAudioBridge(Context context, WebView webView) {
        this.context = context.getApplicationContext();
        this.webView = webView;
        this.audioManager = (AudioManager) this.context.getSystemService(Context.AUDIO_SERVICE);
        KlasikMediaListenerService.registerBridge(this);
    }

    @JavascriptInterface
    public boolean isExternalMusicActive() {
        MediaController controller = getActiveMediaController();
        if (controller != null) {
            PlaybackState state = controller.getPlaybackState();
            if (state != null && state.getState() == PlaybackState.STATE_PLAYING) {
                return true;
            }
        }
        try {
            return audioManager != null && audioManager.isMusicActive();
        } catch (Exception ignored) {
            return false;
        }
    }

    @JavascriptInterface
    public boolean hasNotificationAccess() {
        try {
            String flat = Settings.Secure.getString(
                context.getContentResolver(),
                "enabled_notification_listeners"
            );
            return flat != null && flat.contains(context.getPackageName());
        } catch (Exception ignored) {
            return false;
        }
    }

    @JavascriptInterface
    public boolean hasNotificationPermission() {
        return hasNotificationAccess();
    }

    @JavascriptInterface
    public void openNotificationAccessSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        } catch (Exception ignored) {
            // Graceful fallback if Settings intent is unavailable on a custom ROM
        }
    }

    @JavascriptInterface
    public void openNotificationPermission() {
        openNotificationAccessSettings();
    }

    @JavascriptInterface
    public String getCurrentMediaMetadata() {
        return buildMetadataJson().toString();
    }

    @JavascriptInterface
    public void sendMediaKey(String action) {
        if (action == null) return;
        String normalized;
        if ("play_pause".equals(action) || "playPause".equals(action)) {
            normalized = "playPause";
        } else if ("next".equals(action)) {
            normalized = "next";
        } else if ("prev".equals(action) || "previous".equals(action)) {
            normalized = "previous";
        } else {
            return;
        }
        sendMediaAction(normalized);
    }

    @JavascriptInterface
    public void sendMediaAction(String action) {
        MediaController controller = getActiveMediaController();
        if (controller == null || action == null) return;
        try {
            if ("playPause".equals(action) || "play_pause".equals(action)) {
                PlaybackState state = controller.getPlaybackState();
                if (state != null && state.getState() == PlaybackState.STATE_PLAYING) {
                    controller.getTransportControls().pause();
                } else {
                    controller.getTransportControls().play();
                }
            } else if ("next".equals(action)) {
                controller.getTransportControls().skipToNext();
            } else if ("previous".equals(action) || "prev".equals(action)) {
                controller.getTransportControls().skipToPrevious();
            }
            webView.postDelayed(new Runnable() {
                @Override
                public void run() {
                    pushMetadataToWebView();
                }
            }, 220L);
        } catch (Exception ignored) {
        }
    }

    public void pushMetadataToWebView() {
        final String payload = buildMetadataJson().toString();
        final String js =
            "window.dispatchEvent(new CustomEvent('klasik-external-media-update', { detail: "
                + payload
                + " }));";
        webView.post(new Runnable() {
            @Override
            public void run() {
                try {
                    webView.evaluateJavascript(js, null);
                } catch (Exception ignored) {
                }
            }
        });
    }

    public void release() {
        KlasikMediaListenerService.registerBridge(null);
    }

    private JSONObject buildMetadataJson() {
        boolean hasPerm = hasNotificationAccess();
        MediaController controller = hasPerm ? getActiveMediaController() : null;
        MediaMetadata meta = controller != null ? controller.getMetadata() : null;
        PlaybackState state = controller != null ? controller.getPlaybackState() : null;
        boolean playing =
            (state != null && state.getState() == PlaybackState.STATE_PLAYING)
                || (!hasPerm && isExternalMusicActive());

        String rawTitle = meta != null ? meta.getString(MediaMetadata.METADATA_KEY_TITLE) : null;
        String rawArtist = meta != null ? meta.getString(MediaMetadata.METADATA_KEY_ARTIST) : null;

        String title =
            (rawTitle != null && !rawTitle.trim().isEmpty())
                ? rawTitle.trim()
                : (playing ? "EXTERNAL AUDIO ACTIVE" : "External Audio Standby");
        String artist =
            (rawArtist != null && !rawArtist.trim().isEmpty())
                ? rawArtist.trim()
                : (!hasPerm && playing ? "Tap Enable Song Title Display" : "");
        String sourceApp =
            controller != null ? mapPackageName(controller.getPackageName()) : "External App";

        JSONObject obj = new JSONObject();
        try {
            obj.put("title", title);
            obj.put("artist", artist);
            obj.put("sourceApp", sourceApp);
            obj.put("isPlaying", playing);
            obj.put("hasPermission", hasPerm);
        } catch (Exception ignored) {
        }
        return obj;
    }

    private MediaController getActiveMediaController() {
        if (!hasNotificationAccess()) return null;
        return KlasikMediaListenerService.getActiveExternalController(context);
    }

    private String mapPackageName(String pkg) {
        if (pkg == null) return "External App";
        String lower = pkg.toLowerCase(Locale.US);
        if (lower.contains("spotify")) return "Spotify";
        if (lower.contains("youtube.music") || lower.contains("apps.youtube.music")) {
            return "YouTube Music";
        }
        if (lower.contains("apple.android.music")) return "Apple Music";
        if (lower.contains("soundcloud")) return "SoundCloud";
        if (lower.contains("deezer")) return "Deezer";
        if (lower.contains("tidal")) return "TIDAL";
        return "External App";
    }
}
