import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Icon } from "./Icon";
import { colors, fontSize, fontWeight, spacing } from "../theme";
import type { CompanyRow } from "../api/companies";

/** Shared by every category's list on the 홈 tab — one flat, Danggeun-style
 * row (see src/components/company-list-card.tsx on the web repo for the
 * same layout). The row draws its own bottom divider. */
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
   * instead of the company's general ones. */
  categoryId?: string;
}) {
  const meta = [
    isAd ? "광고" : null,
    company.reviewCount > 0 ? `★ ${company.rating.toFixed(1)}` : null,
    company.regionNames.join(", ") || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      style={styles.row}
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

      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {company.name}
        </Text>
        {meta.length > 0 && (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        )}
        <Text style={styles.price}>
          {company.estimatedPrice != null
            ? `예상 ${company.estimatedPrice.toLocaleString()}원`
            : company.pricingUnit === "PER_UNIT"
              ? `${unitLabel}당 ${company.price.toLocaleString()}원~`
              : `${company.price.toLocaleString()}원~`}
        </Text>

        <View style={styles.tags}>
          {company.isVerified ? (
            <View style={[styles.tag, styles.tagAccent]}>
              <Text style={[styles.tagText, styles.tagTextAccent]}>✓ 인증업체</Text>
            </View>
          ) : (
            company.hasBusinessRegistration && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>사업자등록</Text>
              </View>
            )
          )}
          {!company.isAvailable && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>예약마감</Text>
            </View>
          )}
        </View>

        {company.reviewCount > 0 && (
          <View style={styles.counts}>
            <Icon name="chatSmall" size={15} color="#b0b3ba" />
            <Text style={styles.countText}>{company.reviewCount}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const THUMB = 110;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.08)",
  },
  thumbPlaceholder: {
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbPlaceholderEmoji: { fontSize: 32 },
  body: { flex: 1, minHeight: THUMB },
  name: { fontSize: 16, lineHeight: 22, color: colors.text },
  meta: { marginTop: 3, fontSize: fontSize.base, color: "#868b94" },
  price: { marginTop: 4, fontSize: 16, fontWeight: fontWeight.bold, color: colors.text },
  tags: { marginTop: 6, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  tag: {
    borderRadius: 4,
    backgroundColor: colors.pillBg,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagAccent: { backgroundColor: colors.accentBg },
  tagText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: "#4d5159" },
  tagTextAccent: { color: colors.accent },
  counts: {
    marginTop: "auto",
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  countText: { fontSize: fontSize.base, color: "#868b94" },
});
