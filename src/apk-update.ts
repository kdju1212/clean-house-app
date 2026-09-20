import { Platform } from "react-native";
import * as Application from "expo-application";
import * as IntentLauncher from "expo-intent-launcher";
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
 */
export async function checkForApkUpdate(): Promise<ApkUpdateInfo | null> {
  if (Platform.OS !== "android") return null;

  const currentVersion = Application.nativeApplicationVersion ?? "0.0.0";

  let release: GithubRelease;
  try {
    const res = await fetch(LATEST_RELEASE_URL);
    if (!res.ok) return null;
    release = await res.json();
  } catch {
    // No network, GitHub unreachable, rate-limited, etc. — just skip the
    // check silently rather than bothering the user about it.
    return null;
  }

  if (!isNewer(release.tag_name, currentVersion)) return null;

  const apkAsset = release.assets.find((a) => a.name.endsWith(".apk"));
  if (!apkAsset) return null;

  return {
    version: release.tag_name,
    apkUrl: apkAsset.browser_download_url,
    releaseNotes: release.body,
  };
}

/**
 * Downloads the APK and hands it to Android's own package installer — the
 * OS shows its confirmation screen (and, the first time, a "allow installs
 * from this app" settings prompt) before installing anything, so this
 * never installs silently in the background.
 */
export async function downloadAndInstallApk(apkUrl: string): Promise<void> {
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
