import { StyleSheet, Text, TextStyle } from "react-native";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

type Tone = "neutral" | "warning" | "info";

export function Badge({
  label,
  tone = "neutral",
  style,
}: {
  label: string;
  tone?: Tone;
  style?: TextStyle;
}) {
  return <Text style={[styles.base, toneStyles[tone], style]}>{label}</Text>;
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
});

const toneStyles = StyleSheet.create({
  neutral: { color: colors.textMuted, backgroundColor: colors.surfaceMuted },
  warning: { color: colors.warning, backgroundColor: colors.warningBg },
  info: { color: colors.info, backgroundColor: colors.infoBg },
});
