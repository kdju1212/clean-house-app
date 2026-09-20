import { useEffect } from "react";
import { Alert } from "react-native";
import { Stack, router, useRootNavigationState } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { getStoredToken } from "../src/storage/auth-storage";
import { registerForPushNotifications, mapNotificationLinkToRoute } from "../src/notifications";
import { checkForApkUpdate, downloadAndInstallApk } from "../src/apk-update";

export default function RootLayout() {
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    getStoredToken().then((token) => {
      if (token) registerForPushNotifications();
    });

    // Sideloaded APK, no Play Store auto-update — see src/apk-update.ts and
    // .github/workflows/release-apk.yml for how a new release gets built
    // and how this check finds it.
    checkForApkUpdate().then((update) => {
      if (!update) return;
      Alert.alert(
        "새 버전이 있어요",
        `${update.version} 버전으로 업데이트할까요?${
          update.releaseNotes ? `\n\n${update.releaseNotes}` : ""
        }`,
        [
          { text: "나중에", style: "cancel" },
          {
            text: "업데이트",
            onPress: () => {
              downloadAndInstallApk(update.apkUrl).catch(() => {
                Alert.alert("업데이트 실패", "다운로드 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.");
              });
            },
          },
        ]
      );
    });

    // Fires when the user taps a notification while the app is running
    // (foreground or backgrounded) — the navigator is already mounted by
    // then, so pushing straight away is safe.
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = response.notification.request.content.data?.link;
      if (typeof link === "string") {
        router.push(mapNotificationLinkToRoute(link));
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Cold start (app was fully closed) from tapping a notification: the
    // navigator isn't ready on the very first render, so this waits for
    // useRootNavigationState to report a key before pushing — pushing any
    // earlier is silently dropped.
    if (!rootNavigationState?.key) return;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      const link = response?.notification.request.content.data?.link;
      if (typeof link === "string") {
        router.push(mapNotificationLinkToRoute(link));
      }
    });
  }, [rootNavigationState?.key]);

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaProvider>
  );
}
