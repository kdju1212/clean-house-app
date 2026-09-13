import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Variant = "primary" | "outline" | "danger" | "kakao";
type Size = "md" | "sm";

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        size === "sm" ? styles.sizeSm : styles.sizeMd,
        variantStyles[variant].container,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyles[variant].text.color as string} />
      ) : (
        <Text style={[styles.text, size === "sm" && styles.textSm, variantStyles[variant].text]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  sizeMd: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  sizeSm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  text: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold },
  textSm: { fontSize: fontSize.base },
  disabled: { opacity: 0.5 },
});

const variantStyles: Record<Variant, { container: ViewStyle; text: { color: string } }> = {
  primary: {
    container: { backgroundColor: colors.primary },
    text: { color: colors.onPrimary },
  },
  outline: {
    container: { borderWidth: 1, borderColor: colors.primary, backgroundColor: "transparent" },
    text: { color: colors.primary },
  },
  danger: {
    container: { borderWidth: 1, borderColor: colors.dangerBorder, backgroundColor: "transparent" },
    text: { color: colors.danger },
  },
  kakao: {
    container: { backgroundColor: colors.kakao },
    text: { color: colors.onKakao },
  },
};
