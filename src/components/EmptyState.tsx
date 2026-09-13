import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize, spacing } from "../theme";

export function EmptyState({ text }: { text: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.xxxl * 1.5,
    alignItems: "center",
  },
  text: {
    fontSize: fontSize.base,
    color: colors.textFaint,
    textAlign: "center",
  },
});
