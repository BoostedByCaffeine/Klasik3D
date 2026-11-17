import { AppRuntimeVersion, pwaManager } from '../pwa/pwaManager';

export type BaristaHapticEvent =
  | 'grind'
  | 'tamp'
  | 'pull_espresso'
  | 'steep_tea'
  | 'steam_milk'
  | 'add_ice'
  | 'add_syrup'
  | 'whisk_matcha'
  | 'rinse_cup'
  | 'serve_success'
  | 'blocked_or_error';

// Physically calibrated millisecond pulse waveforms for the Android Vibration API
export const BARISTA_VIBRATION_PATTERNS: Record<BaristaHapticEvent, number | number[]> = {
  grind: [32, 26, 36, 24, 42, 24, 38],
  tamp: [65, 22, 28],
  pull_espresso: [38, 42, 48, 42, 62],
  steep_tea: [22, 38, 24],
  steam_milk: [20, 22, 22, 22, 26, 22, 28],
  add_ice: [18, 34, 20],
  add_syrup: [24, 28, 16],
  whisk_matcha: [16, 20, 16, 20, 18, 20, 18],
  rinse_cup: [48, 28, 22],
  serve_success: [30, 38, 65],
  blocked_or_error: [75, 45, 75],
};

export function getHapticPatternForTool(event: BaristaHapticEvent): number | number[] {
  return BARISTA_VIBRATION_PATTERNS[event];
}

export function shouldTriggerApkVibration(
  appVersion: AppRuntimeVersion,
  hasVibrateApi: boolean
): boolean {
  return appVersion === 'apk' && hasVibrateApi;
}

export function triggerBaristaHaptic(
  event: BaristaHapticEvent,
  appVersion: AppRuntimeVersion = pwaManager.getStatus().appVersion
): boolean {
  const hasVibrateApi =
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

  if (!shouldTriggerApkVibration(appVersion, hasVibrateApi)) {
    return false;
  }

  try {
    const pattern = getHapticPatternForTool(event);
    return navigator.vibrate(pattern);
  } catch {
    return false;
  }
}
