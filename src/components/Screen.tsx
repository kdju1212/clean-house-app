import { ReactNode, Ref, forwardRef } from "react";
import {
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
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
export const Screen = forwardRef(function Screen(
  {
    children,
    scroll = false,
    style,
    refreshing,
    onRefresh,
    onScroll,
  }: {
    children: ReactNode;
    scroll?: boolean;
    style?: ViewStyle;
    /** Pull-to-refresh — only wired up when `scroll` is on; screens with
     * their own FlatList/SectionList should pass refreshing/onRefresh to
     * that list directly instead (it already has its own scroll container). */
    refreshing?: boolean;
    onRefresh?: () => void;
    /** Only wired up when `scroll` is on — e.g. for a scroll-to-top button
     * that needs to know how far down the screen is. */
    onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  },
  ref: Ref<ScrollView>
) {
  const insets = useSafeAreaInsets();
  const basePadding = { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom };

  if (scroll) {
    return (
      // Without this, a TextInput near the bottom of a form got covered by
      // the keyboard instead of the screen making room for it. Android's own
      // windowSoftInputMode resize no longer happens on its own here — SDK
      // 57's edge-to-edge display (required on Android, can't be turned off)
      // breaks that automatic resize — so both platforms need
      // KeyboardAvoidingView to actually shrink the container.
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={ref}
          style={styles.container}
          contentContainerStyle={[styles.scrollContent, basePadding, style]}
          refreshControl={
            onRefresh ? (
              <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} />
            ) : undefined
          }
          onScroll={onScroll}
          scrollEventThrottle={onScroll ? 16 : undefined}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return <View style={[styles.container, styles.padded, basePadding, style]}>{children}</View>;
});

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
