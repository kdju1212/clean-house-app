import { Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../theme";

/**
 * Small floating circle, bottom-right, that jumps a screen back to its top
 * — the screen itself tracks scroll offset (via Screen's onScroll) and
 * passes `visible`/`onPress` down, since only it holds the ScrollView ref.
 *
 * `bottomOffset`, when given, is the *exact* distance from the screen
 * bottom to this button's own bottom edge — pass it as
 * `<bar's measured height> + <desired gap>` to sit that gap above a sticky
 * bar (see app/companies/[id]/index.tsx), since the bar's height already
 * includes its own safe-area padding. Omit it for the plain default
 * position (bottom safe-area inset + standard spacing).
 */
export function ScrollToTopButton({
  visible,
  onPress,
  bottomOffset,
}: {
  visible: boolean;
  onPress: () => void;
  bottomOffset?: number;
}) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const bottom = bottomOffset ?? insets.bottom + spacing.xxl;

  return (
    <Pressable onPress={onPress} hitSlop={8} style={[styles.button, { bottom }]}>
      <Text style={styles.icon}>↑</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: spacing.xl,
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  icon: { color: colors.onPrimary, fontSize: 20, fontWeight: "700" },
});
