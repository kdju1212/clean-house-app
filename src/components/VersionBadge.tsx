import { Text, StyleSheet } from "react-native";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Small always-on-top label so it's obvious at a glance whether an OTA
 * update actually applied — useful while we're still shipping fast and
 * debugging the update pipeline. Remove once that's no longer a question.
 */
export function VersionBadge() {
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? "?";
  const bundleLabel = Updates.isEmbeddedLaunch
    ? "내장"
    : (Updates.createdAt?.toLocaleString("ko-KR", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }) ?? "?");

  return (
    <Text pointerEvents="none" style={[styles.badge, { top: insets.top + 2 }]}>
      v{version} · {bundleLabel}
    </Text>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    left: 8,
    fontSize: 10,
    color: "rgba(0,0,0,0.35)",
    zIndex: 999,
  },
});
