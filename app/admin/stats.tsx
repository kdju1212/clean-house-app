import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import { fetchAdminStats, type AdminRevenueStats } from "../../src/api/admin";
import { Screen } from "../../src/components/Screen";
import { LoadingView } from "../../src/components/LoadingView";
import { colors, fontSize, fontWeight, radius, spacing } from "../../src/theme";

function formatWon(n: number): string {
  return `${n.toLocaleString()}원`;
}

function formatCompactWon(n: number): string {
  if (n >= 100_000_000) {
    const eok = n / 100_000_000;
    return `${Number.isInteger(eok) ? eok : eok.toFixed(1)}억원`;
  }
  if (n >= 10_000) return `${Math.round(n / 10_000)}만원`;
  return `${n.toLocaleString()}원`;
}

const CHART_HEIGHT = 120;
const PERIOD_OPTIONS = [6, 12] as const;

/**
 * Mirrors the web repo's /admin/stats — same six KPI numbers, plus a
 * monthly 거래액 trend. The web version draws an SVG line chart with a
 * hover tooltip; there's no SVG library in this app (adding one is a
 * native-module change that would need a full EAS rebuild instead of just
 * an OTA update), so this is a plain-View column chart instead — same data,
 * tap a column to see its exact value, same as RatingDistribution's
 * dependency-free bars elsewhere in the app.
 */
export default function AdminStatsScreen() {
  const [months, setMonths] = useState<(typeof PERIOD_OPTIONS)[number]>(6);
  const [stats, setStats] = useState<AdminRevenueStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const load = useCallback(() => {
    return fetchAdminStats(months).then((s) => {
      setStats(s);
      setSelectedIndex(null);
    });
  }, [months]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  if (!stats) {
    return <LoadingView />;
  }

  const cards = [
    { label: "오늘 거래액", value: formatWon(stats.today.revenue), sub: `완료 ${stats.today.count}건` },
    { label: "이번 달 거래액", value: formatWon(stats.thisMonth.revenue), sub: `완료 ${stats.thisMonth.count}건` },
    { label: "누적 거래액", value: formatWon(stats.allTime.revenue), sub: `완료 ${stats.allTime.count}건` },
    { label: "이번 달 신규 고객", value: `${stats.newCustomersThisMonth}명`, sub: null },
    { label: "이번 달 신규 업체", value: `${stats.newCompaniesThisMonth}개`, sub: null },
    { label: "활성 업체", value: `${stats.activeCompanies}개`, sub: null },
  ];

  const maxValue = Math.max(...stats.monthly.map((m) => m.revenue), 1);
  const hasData = stats.monthly.some((m) => m.revenue > 0);
  const lastIndex = stats.monthly.length - 1;
  const shown = selectedIndex ?? lastIndex;
  const shownPoint = stats.monthly[shown];

  return (
    <Screen scroll refreshing={refreshing} onRefresh={handleRefresh}>
      <Text style={styles.title}>매출 통계</Text>
      <Text style={styles.subtitle}>
        완료된 예약 기준 거래액이에요. 직접 결제는 처리하지 않아서, 업체가 실제로 받은 금액과 다를 수 있어요.
      </Text>

      <View style={styles.grid}>
        {cards.map((card) => (
          <View key={card.label} style={styles.card}>
            <Text style={styles.cardValue}>{card.value}</Text>
            <Text style={styles.cardLabel}>{card.label}</Text>
            {card.sub && <Text style={styles.cardSub}>{card.sub}</Text>}
          </View>
        ))}
      </View>

      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.sectionTitle}>월별 거래액</Text>
          <View style={styles.periodRow}>
            {PERIOD_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setMonths(opt)}
                style={[styles.periodChip, months === opt && styles.periodChipActive]}
              >
                <Text style={[styles.periodChipText, months === opt && styles.periodChipTextActive]}>
                  {opt}개월
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {!hasData ? (
          <Text style={styles.emptyText}>아직 완료된 예약이 없어요.</Text>
        ) : (
          <>
            {shownPoint && (
              <Text style={styles.selectedInfo}>
                {shownPoint.label} · {formatWon(shownPoint.revenue)} (완료 {shownPoint.count}건)
              </Text>
            )}
            <View style={styles.chartArea}>
              {stats.monthly.map((point, i) => {
                const heightPct = Math.max((point.revenue / maxValue) * 100, point.revenue > 0 ? 4 : 0);
                const isShown = i === shown;
                return (
                  <Pressable
                    key={point.label}
                    style={styles.column}
                    onPress={() => setSelectedIndex(i)}
                  >
                    <View style={styles.barTrack}>
                      <View style={[styles.bar, { height: `${heightPct}%` }]} />
                    </View>
                    <Text style={[styles.columnLabel, isShown && styles.columnLabelHighlighted]}>
                      {point.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.maxLabel}>최고 {formatCompactWon(maxValue)}</Text>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  subtitle: { marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.textMuted },
  grid: { marginTop: spacing.lg, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm + 2 },
  card: {
    width: "47%",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  cardLabel: { marginTop: spacing.xs, fontSize: fontSize.xs, color: colors.textMuted },
  cardSub: { marginTop: 2, fontSize: fontSize.xs, color: colors.textFaint },
  chartCard: {
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  chartHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  periodRow: { flexDirection: "row", gap: spacing.xs },
  periodChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
  },
  periodChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  periodChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: "#525252" },
  periodChipTextActive: { color: colors.onPrimary },
  emptyText: { marginTop: spacing.md, fontSize: fontSize.sm, color: colors.textFaint },
  selectedInfo: { marginTop: spacing.sm + 2, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  chartArea: {
    marginTop: spacing.sm + 2,
    height: CHART_HEIGHT,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 4,
  },
  column: { flex: 1, alignItems: "center" },
  barTrack: { width: "100%", height: CHART_HEIGHT - 20, justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: 4, backgroundColor: colors.primary, minHeight: 2 },
  columnLabel: { marginTop: 4, fontSize: 9, color: colors.textFaint },
  columnLabelHighlighted: { color: colors.text, fontWeight: fontWeight.semibold },
  maxLabel: { marginTop: spacing.xs, fontSize: fontSize.xs, color: colors.textFaint, textAlign: "right" },
});
