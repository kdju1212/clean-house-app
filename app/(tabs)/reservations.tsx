import { useCallback, useState } from "react";
import { FlatList, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { fetchMyReservations, type MyReservation } from "../../src/api/reservations";
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

      <Pressable onPress={() => router.push("/notifications")} style={styles.adminNotifLink}>
        <Text style={styles.adminNotifLinkText}>알림 보기</Text>
      </Pressable>
    </Screen>
  );
}

function CustomerReservationsView() {
  const [reservations, setReservations] = useState<MyReservation[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
  adminNotifLink: { marginTop: spacing.xl, alignSelf: "flex-start" },
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
});
