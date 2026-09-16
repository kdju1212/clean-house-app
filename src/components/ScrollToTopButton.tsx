import { Pressable, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "../theme";

/**
 * Small floating circle, bottom-right, that jumps a screen back to its top
 * — the screen itself tracks scroll offset (via Screen's onScroll) and
 * passes `visible`/`onPress` down, since only it holds the ScrollView ref.
 */
export function ScrollToTopButton({
  visible,
  onPress,
}: {
  visible: boolean;
  onPress: () => void;
}) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[styles.button, { bottom: insets.bottom + spacing.xxl }]}
    >
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
