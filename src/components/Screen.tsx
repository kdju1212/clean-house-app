import { ReactNode } from "react";
import { RefreshControl, ScrollView, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "../theme";

/**
 * Every screen previously hardcoded `paddingTop: 56` as a stand-in for the
 * status bar / notch — that number is a guess and is wrong on plenty of
 * devices (Dynamic Island, older Androids with a taller status bar, etc).
 * This reads the real inset from SafeAreaProvider (already mounted in
 * app/_layout.tsx) so every screen sits correctly regardless of device.
 *
 * `scroll` picks a ScrollView instead of a plain View for screens with a
 * form or long content (profile edit, reservation form) — screens that are
 * already scrollable via their own FlatList/SectionList should leave it off
 * and let that list be the scroll container instead of nesting one inside
 * another.
 */
export function Screen({
  children,
  scroll = false,
  style,
  refreshing,
  onRefresh,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  /** Pull-to-refresh — only wired up when `scroll` is on; screens with
   * their own FlatList/SectionList should pass refreshing/onRefresh to
   * that list directly instead (it already has its own scroll container). */
  refreshing?: boolean;
  onRefresh?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const basePadding = { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom };

  if (scroll) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.scrollContent, basePadding, style]}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
          ) : undefined
        }
      >
        {children}
      </ScrollView>
    );
  }

  return <View style={[styles.container, styles.padded, basePadding, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  padded: {
    paddingHorizontal: spacing.xl,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
});
