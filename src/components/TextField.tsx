import { StyleSheet, Text, TextInput, TextInputProps, View } from "react-native";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

export function TextField({
  label,
  style,
  ...inputProps
}: { label?: string } & TextInputProps) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, inputProps.multiline && styles.multiline, style]}
        placeholderTextColor={colors.textFaint}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: spacing.md },
  label: {
    marginBottom: spacing.xs + 2,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  multiline: { minHeight: 90, textAlignVertical: "top" },
});
