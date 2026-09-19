import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { registerPushToken } from "./api/push";

// Controls how a notification that arrives while the app is already open
// in the foreground is presented — without this, expo-notifications
// swallows foreground notifications silently on some platforms.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Requests notification permission and registers this device's Expo push
 * token with our backend. Safe to call every time the app starts (or right
 * after login) even if already registered — re-sending an unchanged token
 * is a harmless no-op server-side, and this is the only way to notice a
 * token Expo rotated since the last app start.
 */
export async function registerForPushNotifications(): Promise<void> {
  // Simulators/emulators can't be issued a real push token — Device.isDevice
  // is false there, so skip rather than let getExpoPushTokenAsync throw.
  if (!Device.isDevice) return;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== "string") return;

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerPushToken(token);
  } catch (err) {
    console.error("Failed to register push token:", err);
  }
}

/** Reservation/chat/review links from the backend are web paths (see
 * src/lib/notification.ts on the web repo) — the app's own routes match
 * most of them exactly, except the customer's bare reservation-detail link
 * (the app has no such screen), which is redirected to that reservation's
 * chat screen instead since that's the closest per-reservation view a
 * customer has. */
export function mapNotificationLinkToRoute(link: string): string {
  if (/^\/reservations\/[^/]+\/(chat|review)$/.test(link)) return link;
  if (/^\/company\/reservations\/[^/]+$/.test(link)) return link;

  const bareReservation = link.match(/^\/reservations\/([^/]+)$/);
  if (bareReservation) return `/reservations/${bareReservation[1]}/chat`;

  return "/";
}
