#!/usr/bin/env node
/**
 * Unified Klasik 3D Icon Generator (Web Favicons, PWA Icons, Maskable Icon & Android Mipmaps)
 * Source of truth: public/favicon.svg (Yin-Yang Botanical Leaf & Cappuccino Rosetta Emblem)
 *
 * Usage:
 *   node scripts/generate-icons.mjs
 *   node scripts/generate-icons.mjs --android-res android/app/src/main/res
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const SVG_PATH = path.join(PUBLIC_DIR, 'favicon.svg');

const ESPRESSO_BG = { r: 9, g: 7, b: 5, alpha: 1 }; // #090705

// Extract transparent emblem SVG (strips the rounded outer rect so we can frame it cleanly per target)
function buildUnboxedEmblemSvg(rawSvg) {
  return rawSvg.replace(
    /<rect width="200" height="200" rx="44" fill="url\(#kgl_bg\)"\s*\/>/,
    ''
  );
}

/**
 * Renders the Yin-Yang emblem centered inside a `size x size` PNG canvas.
 * @param {Buffer} emblemSvgBuf
 * @param {number} size
 * @param {number} emblemScale Fraction of canvas width occupied by emblem (e.g. 0.92, 0.86, 0.72, 0.66)
 * @param {{ bg?: {r:number,g:number,b:number,alpha:number}, rounded?: boolean }} opts
 */
async function renderIconPng(emblemSvgBuf, size, emblemScale, opts = {}) {
  const { bg = ESPRESSO_BG, rounded = false } = opts;
  const innerSize = Math.max(8, Math.round(size * emblemScale));
  const offset = Math.round((size - innerSize) / 2);

  const emblemPng = await sharp(emblemSvgBuf, { density: Math.max(192, Math.ceil((innerSize / 200) * 144)) })
    .resize(innerSize, innerSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  let base = sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg,
    },
  }).composite([{ input: emblemPng, top: offset, left: offset }]);

  if (rounded) {
    const circleMask = Buffer.from(
      `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#ffffff"/></svg>`
    );
    const compositedBuf = await base.png().toBuffer();
    return sharp(compositedBuf)
      .composite([{ input: circleMask, blend: 'dest-in' }])
      .png()
      .toBuffer();
  }

  return base.png().toBuffer();
}

/**
 * Builds a multi-resolution Windows/Browser .ico file wrapping PNG images (16, 32, 48).
 * @param {Array<{ size: number, data: Buffer }>} frames
 */
function buildIcoBuffer(frames) {
  const headerSize = 6;
  const dirEntrySize = 16;
  const count = frames.length;
  let offset = headerSize + dirEntrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(count, 4);

  const entries = [];
  for (const frame of frames) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(frame.size >= 256 ? 0 : frame.size, 0);
    entry.writeUInt8(frame.size >= 256 ? 0 : frame.size, 1);
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(frame.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += frame.data.length;
    entries.push(entry);
  }

  return Buffer.concat([header, ...entries, ...frames.map((f) => f.data)]);
}

async function generateWebAndPwaIcons(emblemSvgBuf) {
  const png16 = await renderIconPng(emblemSvgBuf, 16, 0.96, { rounded: true });
  const png32 = await renderIconPng(emblemSvgBuf, 32, 0.96, { rounded: true });
  const png48 = await renderIconPng(emblemSvgBuf, 48, 0.96, { rounded: true });
  const apple180 = await renderIconPng(emblemSvgBuf, 180, 0.86, { bg: ESPRESSO_BG });
  const pwa192 = await renderIconPng(emblemSvgBuf, 192, 0.88, { bg: ESPRESSO_BG });
  const pwa512 = await renderIconPng(emblemSvgBuf, 512, 0.88, { bg: ESPRESSO_BG });
  const maskable512 = await renderIconPng(emblemSvgBuf, 512, 0.72, { bg: ESPRESSO_BG });

  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-16x16.png'), png16);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon-32x32.png'), png32);
  fs.writeFileSync(
    path.join(PUBLIC_DIR, 'favicon.ico'),
    buildIcoBuffer([
      { size: 16, data: png16 },
      { size: 32, data: png32 },
      { size: 48, data: png48 },
    ])
  );
  fs.writeFileSync(path.join(PUBLIC_DIR, 'apple-touch-icon.png'), apple180);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-192x192.png'), pwa192);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-512x512.png'), pwa512);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'pwa-maskable-512x512.png'), maskable512);

  console.log('[generate-icons] Generated web & PWA icons in public/.');
}

async function generateAndroidMipmaps(emblemSvgBuf, androidResDir) {
  const densities = [
    { name: 'mipmap-mdpi', launcher: 48, foreground: 108 },
    { name: 'mipmap-hdpi', launcher: 72, foreground: 162 },
    { name: 'mipmap-xhdpi', launcher: 96, foreground: 216 },
    { name: 'mipmap-xxhdpi', launcher: 144, foreground: 324 },
    { name: 'mipmap-xxxhdpi', launcher: 192, foreground: 432 },
  ];

  for (const d of densities) {
    const dir = path.join(androidResDir, d.name);
    fs.mkdirSync(dir, { recursive: true });

    const squareIcon = await renderIconPng(emblemSvgBuf, d.launcher, 0.84, { bg: ESPRESSO_BG });
    const roundIcon = await renderIconPng(emblemSvgBuf, d.launcher, 0.88, {
      bg: ESPRESSO_BG,
      rounded: true,
    });
    const foregroundIcon = await renderIconPng(emblemSvgBuf, d.foreground, 0.66, {
      bg: { r: 0, g: 0, b: 0, alpha: 0 },
    });

    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), squareIcon);
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), roundIcon);
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), foregroundIcon);
  }

  // Adaptive icon background color (#090705)
  const valuesDir = path.join(androidResDir, 'values');
  fs.mkdirSync(valuesDir, { recursive: true });
  const bgXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#090705</color>
</resources>
`;
  fs.writeFileSync(path.join(valuesDir, 'ic_launcher_background.xml'), bgXml);

  // Adaptive icon XML definitions for Android 8+ (API 26+)
  const anyDpiDir = path.join(androidResDir, 'mipmap-anydpi-v26');
  fs.mkdirSync(anyDpiDir, { recursive: true });
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
</adaptive-icon>
`;
  fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher.xml'), adaptiveXml);
  fs.writeFileSync(path.join(anyDpiDir, 'ic_launcher_round.xml'), adaptiveXml);

  // Remove any legacy drawable-v24 / drawable ic_launcher_foreground.xml that could shadow mipmap
  for (const legacyDir of ['drawable', 'drawable-v24']) {
    const legacyFg = path.join(androidResDir, legacyDir, 'ic_launcher_foreground.xml');
    if (fs.existsSync(legacyFg)) {
      fs.unlinkSync(legacyFg);
    }
  }

  console.log(`[generate-icons] Generated Android adaptive mipmaps in ${androidResDir}.`);
}

async function main() {
  if (!fs.existsSync(SVG_PATH)) {
    throw new Error(`Missing source SVG at ${SVG_PATH}`);
  }
  const rawSvg = fs.readFileSync(SVG_PATH, 'utf8');
  const emblemSvgBuf = Buffer.from(buildUnboxedEmblemSvg(rawSvg), 'utf8');

  await generateWebAndPwaIcons(emblemSvgBuf);

  const args = process.argv.slice(2);
  const resIdx = args.indexOf('--android-res');
  if (resIdx !== -1 && args[resIdx + 1]) {
    const targetRes = path.resolve(ROOT_DIR, args[resIdx + 1]);
    await generateAndroidMipmaps(emblemSvgBuf, targetRes);
  }
}

main().catch((err) => {
  console.error('[generate-icons] Failed:', err);
  process.exit(1);
});
