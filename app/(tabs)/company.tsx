import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { fetchCompanyMe, type CompanyMe } from "../../src/api/company";
import { ApiError } from "../../src/api/client";
import { Screen } from "../../src/components/Screen";
import { LoadingView } from "../../src/components/LoadingView";
import { Card } from "../../src/components/Card";
import { Badge } from "../../src/components/Badge";
import { colors, fontSize, fontWeight, spacing } from "../../src/theme";

const STATUS_LABEL: Record<CompanyMe["company"]["status"], string> = {
  PENDING: "심사중",
  ACTIVE: "활성 (고객에게 노출됨)",
  SUSPENDED: "비활성화됨",
};

/**
 * The 업체 관리 tab (see app/(tabs)/_layout.tsx) — a hub linking into
 * /company/reservations and /company/profile, which stay plain pushed
 * stack screens (no tab bar of their own anymore) rather than tabs
 * themselves, same pattern as the customer 내 예약 tab pushing into
 * /reservations/[id]. Login/logout live on the 마이페이지 tab, shared by
 * every account regardless of role.
 */
export default function CompanyDashboardScreen() {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "no-company" }
    | { status: "ready"; data: CompanyMe }
  >({ status: "loading" });

  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    return fetchCompanyMe()
      .then((data) => setState({ status: "ready", data }))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setState({ status: "no-company" });
        }
      });
  }, []);

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

  if (state.status === "loading") {
    return <LoadingView />;
  }

  // Only reachable if the tab itself is somehow still visible right after
  // a company gets deleted from under this account — the tab bar's own
  // isCompany check normally keeps a non-owner from ever landing here.
  if (state.status === "no-company") {
    return (
      <Screen scroll refreshing={refreshing} onRefresh={handleRefresh}>
        <Text style={styles.title}>업체 관리</Text>
        <Text style={styles.emptyText}>등록된 업체를 찾을 수 없어요.</Text>
      </Screen>
    );
  }

  const { company, requestedCount, averageRating, reviewCount } = state.data;

  return (
    <Screen scroll refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={styles.header}>
        <Text style={styles.title}>{company.name}</Text>
      </View>
      <Badge label={STATUS_LABEL[company.status]} style={styles.statusBadge} />

      <Text style={styles.ratingText}>
        {reviewCount > 0 ? `★ ${averageRating.toFixed(1)} · 리뷰 ${reviewCount}개` : "아직 리뷰가 없어요"}
      </Text>

      <Card onPress={() => router.push("/company/reservations")} style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.cardTitle}>예약 관리</Text>
          {requestedCount > 0 && <Badge label={`신규 ${requestedCount}건`} tone="warning" />}
        </View>
      </Card>

      <Card onPress={() => router.push("/company/profile")} style={styles.card}>
        <Text style={styles.cardTitle}>프로필 관리</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  statusBadge: { marginTop: spacing.sm - 2 },
  ratingText: { marginTop: spacing.md, fontSize: fontSize.base, color: colors.textMuted },
  card: { marginTop: spacing.lg },
  cardRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  emptyText: { marginTop: spacing.md, fontSize: fontSize.base, color: colors.textMuted },
});
