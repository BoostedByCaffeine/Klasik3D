#!/usr/bin/env node
/**
 * Patches generated Capacitor Android project for:
 *  1. Landscape-locked orientation + VIBRATE permission + KlasikMediaListenerService in AndroidManifest.xml
 *  2. Edge-to-edge #090705 cutout-aware fullscreen theme in res/values/styles.xml
 *  3. Phase 6 Native External Audio Bridge (KlasikMediaListenerService.kt + KlasikNativeAudioBridge.kt)
 *  4. Sticky Immersive Fullscreen + #090705 WebView + KlasikNativeAudio JS bridge & Audio Focus Coexistence in MainActivity.java
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'android/app/src/main/AndroidManifest.xml');
const STYLES_PATH = path.join(ROOT, 'android/app/src/main/res/values/styles.xml');
const APP_BUILD_GRADLE_PATH = path.join(ROOT, 'android/app/build.gradle');
const ROOT_BUILD_GRADLE_PATH = path.join(ROOT, 'android/build.gradle');
const AUDIO_SRC_DIR = path.join(ROOT, 'android-native/audio');
const AUDIO_DEST_DIR = path.join(
  ROOT,
  'android/app/src/main/java/com/boostedbycaffeine/klasik3d/audio'
);
const MAIN_ACTIVITY_PATH = path.join(
  ROOT,
  'android/app/src/main/java/com/boostedbycaffeine/klasik3d/MainActivity.java'
);

function patchManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Missing AndroidManifest.xml at ${MANIFEST_PATH}`);
  }
  let xml = fs.readFileSync(MANIFEST_PATH, 'utf8');
  if (!/\bandroid:screenOrientation=/.test(xml)) {
    xml = xml.replace(
      /(<activity\b[^>]*?)(>)/,
      '$1\n            android:screenOrientation="sensorLandscape"$2'
    );
  }
  if (!/\bandroid:configChanges=/.test(xml)) {
    xml = xml.replace(
      /(<activity\b[^>]*?)(>)/,
      '$1\n            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"$2'
    );
  }
  if (!xml.includes('android.permission.VIBRATE')) {
    xml = xml.replace(
      '</manifest>',
      '    <uses-permission android:name="android.permission.VIBRATE" />\n</manifest>'
    );
  }
  if (!xml.includes('KlasikMediaListenerService')) {
    const serviceBlock = `
        <service
            android:name=".audio.KlasikMediaListenerService"
            android:label="Klasik 3D Hologram Player"
            android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.service.notification.NotificationListenerService" />
            </intent-filter>
        </service>
    </application>`;
    xml = xml.replace('</application>', serviceBlock);
  }
  fs.writeFileSync(MANIFEST_PATH, xml, 'utf8');
  console.log('[patch-android] Patched AndroidManifest.xml (orientation, vibrate, KlasikMediaListenerService)');
}

function patchStyles() {
  fs.mkdirSync(path.dirname(STYLES_PATH), { recursive: true });
  const stylesXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="colorPrimary">#090705</item>
        <item name="colorPrimaryDark">#090705</item>
        <item name="colorAccent">#E59A3C</item>
        <item name="android:windowBackground">#090705</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
        <item name="android:enforceNavigationBarContrast">false</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:windowBackground">#090705</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
        <item name="android:statusBarColor">@android:color/transparent</item>
        <item name="android:navigationBarColor">@android:color/transparent</item>
        <item name="android:enforceNavigationBarContrast">false</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">#090705</item>
        <item name="android:windowBackground">#090705</item>
        <item name="android:windowFullscreen">true</item>
        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>
    </style>
</resources>
`;
  fs.writeFileSync(STYLES_PATH, stylesXml, 'utf8');
  console.log('[patch-android] Wrote cutout-aware fullscreen res/values/styles.xml');
}

function copyKotlinAudioBridge() {
  if (!fs.existsSync(AUDIO_SRC_DIR)) {
    throw new Error(`Missing android-native audio sources at ${AUDIO_SRC_DIR}`);
  }
  fs.mkdirSync(AUDIO_DEST_DIR, { recursive: true });
  for (const fileName of ['KlasikMediaListenerService.kt', 'KlasikNativeAudioBridge.kt']) {
    const src = path.join(AUDIO_SRC_DIR, fileName);
    const dest = path.join(AUDIO_DEST_DIR, fileName);
    fs.copyFileSync(src, dest);
  }
  console.log('[patch-android] Copied Kotlin external audio bridge sources into Android project');
}

function ensureKotlinGradleSupport() {
  if (fs.existsSync(ROOT_BUILD_GRADLE_PATH)) {
    let rootGradle = fs.readFileSync(ROOT_BUILD_GRADLE_PATH, 'utf8');
    if (!rootGradle.includes('kotlin-gradle-plugin')) {
      rootGradle = rootGradle.replace(
        /dependencies\s*\{/,
        `dependencies {\n        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.24"`
      );
      fs.writeFileSync(ROOT_BUILD_GRADLE_PATH, rootGradle, 'utf8');
      console.log('[patch-android] Added kotlin-gradle-plugin to android/build.gradle');
    }
  }
  if (fs.existsSync(APP_BUILD_GRADLE_PATH)) {
    let appGradle = fs.readFileSync(APP_BUILD_GRADLE_PATH, 'utf8');
    if (!appGradle.includes('kotlin-android') && !appGradle.includes('org.jetbrains.kotlin.android')) {
      appGradle = appGradle.replace(
        /apply plugin:\s*['"]com\.android\.application['"]/,
        `apply plugin: 'com.android.application'\napply plugin: 'kotlin-android'`
      );
      fs.writeFileSync(APP_BUILD_GRADLE_PATH, appGradle, 'utf8');
      console.log('[patch-android] Enabled kotlin-android plugin in android/app/build.gradle');
    }
  }
}

function patchMainActivity() {
  fs.mkdirSync(path.dirname(MAIN_ACTIVITY_PATH), { recursive: true });
  const javaCode = `package com.boostedbycaffeine.klasik3d;

import android.graphics.Color;
import android.media.AudioManager;
import android.os.Bundle;
import android.view.Window;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.boostedbycaffeine.klasik3d.audio.KlasikNativeAudioBridge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private KlasikNativeAudioBridge nativeAudioBridge;

    private void applyImmersiveFullscreen() {
        Window window = getWindow();
        if (window == null) return;
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);
        window.getDecorView().setBackgroundColor(Color.parseColor("#090705"));

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(window, window.getDecorView());
        if (controller != null) {
            controller.hide(WindowInsetsCompat.Type.systemBars());
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
        }

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().setBackgroundColor(Color.parseColor("#090705"));
        }
    }

    private void attachExternalAudioBridge() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        // Allow smooth Web Audio SFX & background music playback without stealing exclusive AUDIOFOCUS_GAIN
        settings.setMediaPlaybackRequiresUserGesture(false);
        setVolumeControlStream(AudioManager.STREAM_MUSIC);

        if (nativeAudioBridge == null) {
            nativeAudioBridge = new KlasikNativeAudioBridge(this, webView);
            webView.addJavascriptInterface(nativeAudioBridge, "KlasikNativeAudio");
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyImmersiveFullscreen();
        attachExternalAudioBridge();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyImmersiveFullscreen();
        attachExternalAudioBridge();
        if (nativeAudioBridge != null) {
            nativeAudioBridge.pushMetadataToWebView();
        }
    }

    @Override
    public void onDestroy() {
        if (nativeAudioBridge != null) {
            nativeAudioBridge.release();
            nativeAudioBridge = null;
        }
        super.onDestroy();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            applyImmersiveFullscreen();
        }
    }
}
`;
  fs.writeFileSync(MAIN_ACTIVITY_PATH, javaCode, 'utf8');
  console.log('[patch-android] Wrote sticky immersive MainActivity.java with KlasikNativeAudio bridge & audio focus coexistence');
}

patchManifest();
patchStyles();
copyKotlinAudioBridge();
ensureKotlinGradleSupport();
patchMainActivity();

