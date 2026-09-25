import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Badge } from "./Badge";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";
import type { CompanyRow } from "../api/companies";

/** Shared by the categories screen's "전체" tab and each category's own
 * list — same card, since a customer browsing either sees the same kind
 * of row (see src/components/company-list-card.tsx on the web repo). Flat,
 * divider-separated row (no per-item border/box) — the list itself draws
 * the dividers between rows, this component just renders one row's content. */
export function CompanyListItem({
  company,
  isAd,
  unitLabel,
  categoryId,
}: {
  company: CompanyRow;
  isAd?: boolean;
  /** "평" / "대" — only meaningful when company.pricingUnit is PER_UNIT. */
  unitLabel?: string;
  /** Which category this row was listed under — carried into the detail
   * screen so it opens already showing that category's own 소개/사진
   * instead of the company's general ones. Omitted on the "전체" tab. */
  categoryId?: string;
}) {
  return (
    <Pressable
      style={styles.card}
      onPress={() =>
        router.push({
          pathname: "/companies/[id]",
          params: categoryId ? { id: company.id, categoryId } : { id: company.id },
        })
      }
    >
      {company.mainImageUrl ? (
        <Image source={{ uri: company.mainImageUrl }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          <Text style={styles.thumbPlaceholderEmoji}>🧽</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          {isAd && <Badge label="광고" tone="warning" />}
          <Text style={styles.cardName} numberOfLines={1}>
            {company.name}
          </Text>
          {company.isVerified ? (
            <Badge label="인증" tone="info" />
          ) : (
            company.hasBusinessRegistration && <Badge label="사업자등록" tone="neutral" />
          )}
        </View>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {company.regionNames.join(", ")}
          {company.reviewCount > 0 && ` · ★ ${company.rating.toFixed(1)} (${company.reviewCount})`}
        </Text>
        <Text style={styles.cardPrice}>
          {company.estimatedPrice != null
            ? `예상 ${company.estimatedPrice.toLocaleString()}원`
            : company.pricingUnit === "PER_UNIT"
              ? `${unitLabel}당 ${company.price.toLocaleString()}원~`
              : `${company.price.toLocaleString()}원~`}
        </Text>
        {!company.isAvailable && (
          <View style={styles.unavailableTag}>
            <Text style={styles.unavailableTagText}>예약 마감</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  thumb: { width: 96, height: 96, borderRadius: radius.lg },
  thumbPlaceholder: { backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  thumbPlaceholderEmoji: { fontSize: 28 },
  cardBody: { flex: 1, justifyContent: "center", gap: 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm - 2 },
  cardName: { flexShrink: 1, fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text },
  cardMeta: { fontSize: fontSize.sm, color: colors.textMuted },
  cardPrice: { marginTop: 2, fontSize: fontSize.xl - 2, fontWeight: fontWeight.bold, color: colors.text },
  unavailableTag: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: spacing.sm - 2,
    paddingVertical: 2,
  },
  unavailableTagText: { fontSize: fontSize.xs, color: colors.textMuted },
});
