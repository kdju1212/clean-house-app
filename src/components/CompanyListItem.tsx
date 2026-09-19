import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Badge } from "./Badge";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";
import type { CompanyRow } from "../api/companies";

/** Shared by the categories screen's "전체" tab and each category's own
 * list — same card, since a customer browsing either sees the same kind
 * of row (see src/components/company-list-card.tsx on the web repo). */
export function CompanyListItem({ company, isAd }: { company: CompanyRow; isAd?: boolean }) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: "/companies/[id]", params: { id: company.id } })}
    >
      {company.mainImageUrl ? (
        <Image source={{ uri: company.mainImageUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{company.name}</Text>
          {isAd && <Badge label="광고" tone="warning" />}
        </View>
        <Text style={styles.cardIntro} numberOfLines={1}>
          {company.introText ?? ""}
        </Text>
        <Text style={styles.cardMeta}>
          {company.price.toLocaleString()}원~
          {company.reviewCount > 0
            ? ` · ★ ${company.rating.toFixed(1)} (${company.reviewCount})`
            : " · 리뷰 없음"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  thumbPlaceholder: { backgroundColor: colors.surfaceMuted },
  cardBody: { flex: 1, justifyContent: "center" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm - 2 },
  cardName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  cardIntro: { marginTop: 2, fontSize: fontSize.sm, color: colors.textMuted },
  cardMeta: { marginTop: spacing.xs, fontSize: fontSize.sm, color: "#525252" },
});
