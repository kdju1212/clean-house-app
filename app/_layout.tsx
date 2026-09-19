import { useEffect } from "react";
import { Stack, router, useRootNavigationState } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import { getStoredToken } from "../src/storage/auth-storage";
import { registerForPushNotifications, mapNotificationLinkToRoute } from "../src/notifications";

export default function RootLayout() {
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    getStoredToken().then((token) => {
      if (token) registerForPushNotifications();
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
