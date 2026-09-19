import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { fetchMyReservations, type MyReservation } from "../../src/api/reservations";
import { Screen } from "../../src/components/Screen";
import { Card } from "../../src/components/Card";
import { Badge } from "../../src/components/Badge";
import { EmptyState } from "../../src/components/EmptyState";
import { colors, fontSize, fontWeight, spacing } from "../../src/theme";

const STATUS_LABEL: Record<MyReservation["status"], string> = {
  REQUESTED: "예약 예정",
  ACCEPTED: "진행 중",
  REJECTED: "거절됨",
  CANCELLED: "취소됨",
  COMPLETED: "완료",
  NO_SHOW: "노쇼",
};

export default function MyReservationsScreen() {
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
