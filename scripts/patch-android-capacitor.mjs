#!/usr/bin/env node
/**
 * Patches generated Capacitor Android project for:
 *  1. Landscape-locked orientation + VIBRATE permission in AndroidManifest.xml
 *  2. Edge-to-edge #090705 cutout-aware fullscreen theme in res/values/styles.xml
 *  3. Sticky Immersive Fullscreen + #090705 WebView background in MainActivity.java
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'android/app/src/main/AndroidManifest.xml');
const STYLES_PATH = path.join(ROOT, 'android/app/src/main/res/values/styles.xml');
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
  fs.writeFileSync(MANIFEST_PATH, xml, 'utf8');
  console.log('[patch-android] Patched AndroidManifest.xml');
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

function patchMainActivity() {
  fs.mkdirSync(path.dirname(MAIN_ACTIVITY_PATH), { recursive: true });
  const javaCode = `package com.boostedbycaffeine.klasik3d;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
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

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyImmersiveFullscreen();
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
  console.log('[patch-android] Wrote sticky immersive MainActivity.java');
}

patchManifest();
patchStyles();
patchMainActivity();
