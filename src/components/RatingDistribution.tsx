import { StyleSheet, Text, View } from "react-native";
import { colors, fontSize, fontWeight, spacing } from "../theme";

/**
 * Coupang-style rating summary: big average + stars on the left, a 5→1
 * star horizontal bar breakdown on the right. Computed from the full
 * `reviews` list (the API already returns every non-hidden review, no
 * pagination) rather than needing a separate distribution endpoint.
 */
export function RatingDistribution({
  averageRating,
  reviews,
}: {
  averageRating: number;
  reviews: { rating: number }[];
}) {
  const reviewCount = reviews.length;

  if (reviewCount === 0) {
    return <Text style={styles.emptyText}>아직 작성된 리뷰가 없어요.</Text>;
  }

  const roundedStars = Math.round(averageRating);
  const counts = [5, 4, 3, 2, 1].map(
    (star) => reviews.filter((r) => r.rating === star).length
  );

  return (
    <View style={styles.row}>
      <View style={styles.summary}>
        <Text style={styles.average}>{averageRating.toFixed(1)}</Text>
        <Text style={styles.stars}>
          {"★".repeat(roundedStars)}
          {"☆".repeat(5 - roundedStars)}
        </Text>
        <Text style={styles.count}>리뷰 {reviewCount}개</Text>
      </View>
      <View style={styles.bars}>
        {[5, 4, 3, 2, 1].map((star, i) => {
          const count = counts[i];
          const pct = (count / reviewCount) * 100;
          return (
            <View key={star} style={styles.barRow}>
              <Text style={styles.barLabel}>{star}점</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.barCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginTop: spacing.sm },
  summary: { alignItems: "center" },
  average: { fontSize: 28, fontWeight: fontWeight.bold, color: colors.text },
  stars: { marginTop: 2, fontSize: fontSize.base, color: colors.star },
  count: { marginTop: 2, fontSize: fontSize.xs, color: colors.textFaint },
  bars: { flex: 1, gap: 4 },
  barRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  barLabel: { width: 24, fontSize: fontSize.xs, color: colors.textMuted },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceMuted,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: colors.star, borderRadius: 3 },
  barCount: { width: 20, textAlign: "right", fontSize: fontSize.xs, color: colors.textMuted },
  emptyText: { marginTop: spacing.sm, fontSize: fontSize.base, color: colors.textFaint },
});
