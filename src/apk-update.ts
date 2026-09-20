import { Platform } from "react-native";
import { Directory, File, Paths } from "expo-file-system";
import { getContentUriAsync } from "expo-file-system/legacy";

// Public repo, so this needs no auth token — see
// .github/workflows/release-apk.yml, which builds and attaches the APK to
// a GitHub Release whenever app.json's version is bumped and tagged.
const LATEST_RELEASE_URL = "https://api.github.com/repos/kdju1212/clean-house-app/releases/latest";

export type ApkUpdateInfo = {
  version: string;
  apkUrl: string;
  releaseNotes: string | null;
};

type GithubRelease = {
  tag_name: string;
  body: string | null;
  assets: { name: string; browser_download_url: string }[];
};

function parseVersion(v: string): number[] {
  return v
    .replace(/^v/, "")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
}

function isNewer(remote: string, current: string): boolean {
  const r = parseVersion(remote);
  const c = parseVersion(current);
  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    const rv = r[i] ?? 0;
    const cv = c[i] ?? 0;
    if (rv !== cv) return rv > cv;
  }
  return false;
}

/**
 * Checks this app's public GitHub repo for a newer release with an APK
 * attached. Android only — a sideloaded install prompt has no iOS
 * equivalent, and this app isn't distributed through the App Store.
 *
 * expo-application and expo-intent-launcher are imported dynamically
 * (inside the try/catch below) rather than at the top of this file: an OTA
 * update ships this JS to devices that installed an older native build
 * without those packages compiled in yet, and a static `import` of a
 * missing native module throws the moment this module is evaluated —
 * before this function even runs — which would take down app/_layout.tsx
 * (and with it, the whole app) for anyone not yet on the native build that
 * introduced this feature.
 */
export async function checkForApkUpdate(): Promise<ApkUpdateInfo | null> {
  if (Platform.OS !== "android") return null;

  try {
    const Application = await import("expo-application");
    const currentVersion = Application.nativeApplicationVersion ?? "0.0.0";

    const res = await fetch(LATEST_RELEASE_URL);
    if (!res.ok) return null;
    const release: GithubRelease = await res.json();

    if (!isNewer(release.tag_name, currentVersion)) return null;

    const apkAsset = release.assets.find((a) => a.name.endsWith(".apk"));
    if (!apkAsset) return null;

    return {
      version: release.tag_name,
      apkUrl: apkAsset.browser_download_url,
      releaseNotes: release.body,
    };
  } catch {
    // Missing native module (older build), no network, GitHub unreachable,
    // rate-limited, etc. — just skip the check silently rather than
    // bothering the user, and definitely never let this take the app down.
    return null;
  }
}

/**
 * Downloads the APK and hands it to Android's own package installer — the
 * OS shows its confirmation screen (and, the first time, a "allow installs
 * from this app" settings prompt) before installing anything, so this
 * never installs silently in the background.
 */
export async function downloadAndInstallApk(apkUrl: string): Promise<void> {
  const IntentLauncher = await import("expo-intent-launcher");
  const file = await File.downloadFileAsync(apkUrl, new Directory(Paths.cache), {
    idempotent: true,
  });
  const contentUri = await getContentUriAsync(file.uri);
  await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
    data: contentUri,
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION — installer needs read access to our cache file
    type: "application/vnd.android.package-archive",
  });
}
