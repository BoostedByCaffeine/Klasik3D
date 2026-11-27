import versionJson from '../../app-version.json';

export interface AppVersionInfo {
  readonly versionName: string;
  readonly versionCode: number;
  readonly applicationId: string;
  readonly releaseChannel: string;
  readonly swCacheName: string;
}

export const APP_VERSION: AppVersionInfo = {
  versionName: versionJson.versionName,
  versionCode: versionJson.versionCode,
  applicationId: versionJson.applicationId,
  releaseChannel: versionJson.releaseChannel,
  swCacheName: versionJson.swCacheName,
};

/** Compact display tag for Title Settings, HUD Menu, and Install Modal (e.g., "v2.5.0 · Build 250"). */
export function formatAppVersionBadge(info: Pick<AppVersionInfo, 'versionName' | 'versionCode'> = APP_VERSION): string {
  return `v${info.versionName} · Build ${info.versionCode}`;
}

/** Canonical release APK filename including semantic version (e.g., "Klasik3D-v2.5.0.apk"). */
export function formatApkFileName(versionName: string = APP_VERSION.versionName): string {
  return `Klasik3D-v${versionName}.apk`;
}

/**
 * Validates that a candidate Android APK upgrade can install in-place over an existing build
 * without uninstalling: package ID must match and versionCode must strictly increase.
 */
export function canUpgradeApkInPlace(
  installed: Pick<AppVersionInfo, 'applicationId' | 'versionCode'>,
  candidate: Pick<AppVersionInfo, 'applicationId' | 'versionCode'>
): boolean {
  return (
    installed.applicationId === candidate.applicationId &&
    Number.isInteger(candidate.versionCode) &&
    candidate.versionCode > installed.versionCode
  );
}
