import { useCallback, useState } from "react";
import { Alert, FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { cancelReservation, fetchMyReservations, type MyReservation } from "../../src/api/reservations";
import { fetchAdminDashboard, type AdminDashboard } from "../../src/api/admin";
import { getStoredUser } from "../../src/storage/auth-storage";
import { API_BASE_URL } from "../../src/api/client";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/Card";
import { Badge } from "../../src/components/Badge";
import { EmptyState } from "../../src/components/EmptyState";
import { LoadingView } from "../../src/components/LoadingView";
import { colors, fontSize, fontWeight, radius, spacing } from "../../src/theme";
import CompanyReservationsScreen from "../company/reservations/index";

const STATUS_LABEL: Record<MyReservation["status"], string> = {
  REQUESTED: "예약 예정",
  ACCEPTED: "진행 중",
  REJECTED: "거절됨",
  CANCELLED: "취소됨",
  COMPLETED: "완료",
  NO_SHOW: "노쇼",
};

// A reservation can't be cancelled once it's this close — "당일과 전날은
// 취소 불가", same rule as the web repo's CANCELLATION_CUTOFF_DAYS
// (src/lib/reservation.ts) — the server re-checks this regardless.
const CANCELLATION_CUTOFF_DAYS = 2;

/** Today as "YYYY-MM-DD" in the device's own timezone (customers are all
 * in Korea) — mirrors company/reservations/index.tsx's localTodayKey. */
function localTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function isCancellable(desiredDateIso: string): boolean {
  const desiredDateStr = desiredDateIso.slice(0, 10);
  const daysUntil = Math.round(
    (Date.parse(`${desiredDateStr}T00:00:00Z`) - Date.parse(`${localTodayKey()}T00:00:00Z`)) /
      86_400_000
  );
  return daysUntil >= CANCELLATION_CUTOFF_DAYS;
}

type Role = "CUSTOMER" | "COMPANY" | "ADMIN";

/**
 * The 내 예약/예약관리/관리자 tab — same slot, different screen depending on
 * the account's role (checked on every focus, not just mount, since this
 * tab can also be reached right after registering a company from elsewhere
 * in the app without this component remounting). A COMPANY account sees the
 * incoming-reservations list it manages (CompanyReservationsScreen, still
 * living at app/company/reservations so /company/reservations/[id] keeps
 * working as a pushed detail screen); an ADMIN account sees AdminHomeView,
 * a dashboard of stat cards (mirrors the web repo's /admin) that push into
 * app/admin/companies and app/admin/reports — this used to fall through to
 * the customer view below, showing an admin login as if it were an
 * ordinary customer; anyone else sees their own bookings.
 */
export default function ReservationsTabScreen() {
  const [role, setRole] = useState<Role | null>(null);

  useFocusEffect(
    useCallback(() => {
      getStoredUser().then((user) => setRole((user?.role as Role) ?? "CUSTOMER"));
    }, [])
  );

  if (role === null) {
    return <LoadingView />;
  }
  if (role === "COMPANY") {
    return <CompanyReservationsScreen />;
  }
  if (role === "ADMIN") {
    return <AdminHomeView />;
  }
  return <CustomerReservationsView />;
}

// 업체/신고는 앱 안에서 바로 처리하고(내부 화면으로 이동), 예약/사용자
// 목록은 아직 앱에 화면이 없어서 웹 관리자 페이지를 열어 보여준다.
const ADMIN_CARDS: {
  key: keyof AdminDashboard;
  label: string;
  open: () => void;
}[] = [
  {
    key: "pendingCompanies",
    label: "승인 대기 업체",
    open: () => router.push({ pathname: "/admin/companies", params: { status: "PENDING" } }),
  },
  { key: "pendingReports", label: "처리 대기 신고", open: () => router.push("/admin/reports") },
  {
    key: "requestedReservations",
    label: "신청 중인 예약",
    open: () => Linking.openURL(`${API_BASE_URL}/admin/reservations?status=REQUESTED`),
  },
  {
    key: "totalUsers",
    label: "전체 사용자",
    open: () => Linking.openURL(`${API_BASE_URL}/admin/users`),
  },
];

function AdminHomeView() {
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => fetchAdminDashboard().then(setDashboard), []);

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

  if (!dashboard) {
    return <LoadingView />;
  }

  return (
    <Screen scroll refreshing={refreshing} onRefresh={handleRefresh}>
      <Text style={styles.title}>관리자 대시보드</Text>
      <Text style={styles.adminHint}>업체 승인, 신고 리뷰를 한곳에서 처리하세요.</Text>

      <View style={styles.adminGrid}>
        {ADMIN_CARDS.map((card) => (
          <Pressable key={card.key} style={styles.adminCard} onPress={card.open}>
            <Text
              style={[
                styles.adminCardValue,
                dashboard[card.key] > 0 && card.key !== "totalUsers" && styles.adminCardValueHighlight,
              ]}
            >
              {dashboard[card.key]}
            </Text>
            <Text style={styles.adminCardLabel}>{card.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable onPress={() => router.push("/admin/stats")} style={styles.adminStatsButton}>
        <Text style={styles.adminStatsButtonText}>매출 통계 보기</Text>
      </Pressable>

      <Pressable onPress={() => router.push("/notifications")} style={styles.adminNotifLink}>
        <Text style={styles.adminNotifLinkText}>알림 보기</Text>
      </Pressable>
    </Screen>
  );
}

function CustomerReservationsView() {
  const [reservations, setReservations] = useState<MyReservation[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(() => fetchMyReservations().then(setReservations), []);

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

  function confirmCancel(id: string) {
    Alert.alert("예약을 취소할까요?", "취소하면 되돌릴 수 없어요.", [
      { text: "아니요", style: "cancel" },
      { text: "취소하기", style: "destructive", onPress: () => handleCancel(id) },
    ]);
  }

  async function handleCancel(id: string) {
    setCancellingId(id);
    try {
      await cancelReservation(id);
      await load();
    } catch (err) {
      Alert.alert("취소 실패", err instanceof Error ? err.message : "예약 취소에 실패했어요.");
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <Screen>
      <Text style={styles.title}>내 예약</Text>

      <FlatList
        data={reservations ?? []}
        keyExtractor={(item) => item.id}
        style={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          reservations ? <EmptyState text="아직 예약 내역이 없어요." /> : null
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.companyName}>{item.companyName}</Text>
              <Badge label={STATUS_LABEL[item.status]} />
            </View>
            <Text style={styles.meta}>
              {item.categoryName}
              {item.price ? ` · ${item.price.toLocaleString()}원` : ""}
            </Text>
            <Text style={styles.meta}>
              {new Date(item.desiredDate).toLocaleDateString("ko-KR")} {item.desiredTime}
            </Text>

            <View style={styles.actions}>
              <Pressable onPress={() => router.push(`/reservations/${item.id}/chat`)}>
                <Text style={styles.actionLink}>채팅하기</Text>
              </Pressable>
              {(item.status === "REQUESTED" || item.status === "ACCEPTED") &&
                (isCancellable(item.desiredDate) ? (
                  <Pressable onPress={() => confirmCancel(item.id)} disabled={cancellingId === item.id}>
                    <Text style={styles.actionCancel}>
                      {cancellingId === item.id ? "취소 중..." : "예약 취소"}
                    </Text>
                  </Pressable>
                ) : (
                  <Text style={styles.actionDone}>취소 기한 지남</Text>
                ))}
              {item.status === "COMPLETED" &&
                (item.hasReview ? (
                  <Text style={styles.actionDone}>리뷰 작성 완료</Text>
                ) : (
                  <Pressable onPress={() => router.push(`/reservations/${item.id}/review`)}>
                    <Text style={styles.actionLink}>리뷰 작성</Text>
                  </Pressable>
                ))}
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  adminHint: { marginTop: spacing.md, fontSize: fontSize.sm, color: colors.textMuted },
  adminGrid: { marginTop: spacing.lg, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm + 2 },
  adminCard: {
    width: "47%",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  adminCardValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  adminCardValueHighlight: { color: colors.accent },
  adminCardLabel: { marginTop: spacing.xs, fontSize: fontSize.xs, color: colors.textMuted },
  adminStatsButton: {
    marginTop: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  adminStatsButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  adminNotifLink: { marginTop: spacing.lg, alignSelf: "flex-start" },
  adminNotifLinkText: {
    fontSize: fontSize.base,
    color: colors.textFaint,
    textDecorationLine: "underline",
  },
  list: { marginTop: spacing.lg },
  card: { marginBottom: spacing.sm + 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  companyName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  meta: { marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.textMuted },
  actions: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.md },
  actionLink: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.text,
    textDecorationLine: "underline",
  },
  actionDone: { fontSize: fontSize.sm, color: colors.textFaint },
  actionCancel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.danger,
    textDecorationLine: "underline",
  },
});
