import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { fetchCompanyMe, type CompanyMe } from "../../src/api/company";
import { logout } from "../../src/api/auth";
import { ApiError } from "../../src/api/client";

const STATUS_LABEL: Record<CompanyMe["company"]["status"], string> = {
  PENDING: "심사중",
  ACTIVE: "활성 (고객에게 노출됨)",
  SUSPENDED: "비활성화됨",
};

export default function CompanyDashboardScreen() {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "no-company" }
    | { status: "ready"; data: CompanyMe }
  >({ status: "loading" });

  useFocusEffect(
    useCallback(() => {
      fetchCompanyMe()
        .then((data) => setState({ status: "ready", data }))
        .catch((err) => {
          if (err instanceof ApiError && err.status === 404) {
            setState({ status: "no-company" });
          }
        });
    }, [])
  );

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  if (state.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (state.status === "no-company") {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>업체 관리</Text>
        <Text style={styles.emptyText}>
          아직 등록된 업체가 없어요. 웹에서 먼저 업체를 등록해주세요.
        </Text>
        <Pressable onPress={handleLogout} style={{ marginTop: 24 }}>
          <Text style={styles.logout}>로그아웃</Text>
        </Pressable>
      </View>
    );
  }

  const { company, requestedCount, averageRating, reviewCount } = state.data;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{company.name}</Text>
        <Pressable onPress={handleLogout}>
          <Text style={styles.logout}>로그아웃</Text>
        </Pressable>
      </View>
      <Text style={styles.statusBadge}>{STATUS_LABEL[company.status]}</Text>

      <Text style={styles.ratingText}>
        {reviewCount > 0 ? `★ ${averageRating.toFixed(1)} · 리뷰 ${reviewCount}개` : "아직 리뷰가 없어요"}
      </Text>

      <Pressable style={styles.card} onPress={() => router.push("/company/reservations")}>
        <Text style={styles.cardTitle}>예약 관리</Text>
        {requestedCount > 0 && (
          <Text style={styles.cardBadge}>신규 {requestedCount}건</Text>
        )}
      </Pressable>

      <Pressable
        style={[styles.card, { marginTop: 10 }]}
        onPress={() => router.push("/company/profile")}
      >
        <Text style={styles.cardTitle}>프로필 관리</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", paddingTop: 56, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 18, fontWeight: "700" },
  logout: { fontSize: 12, color: "#a3a3a3" },
  statusBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    fontSize: 11,
    fontWeight: "600",
    color: "#525252",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  ratingText: { marginTop: 10, fontSize: 13, color: "#737373" },
  card: {
    marginTop: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    padding: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#a16207",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  emptyText: { marginTop: 12, fontSize: 13, color: "#737373" },
});
