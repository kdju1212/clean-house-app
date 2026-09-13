import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { fetchMyReservations, type MyReservation } from "../../src/api/reservations";

const STATUS_LABEL: Record<MyReservation["status"], string> = {
  REQUESTED: "예약 예정",
  ACCEPTED: "진행 중",
  REJECTED: "거절됨",
  CANCELLED: "취소됨",
  COMPLETED: "완료",
};

export default function MyReservationsScreen() {
  const [reservations, setReservations] = useState<MyReservation[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchMyReservations().then(setReservations);
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>내 예약</Text>

      <FlatList
        data={reservations ?? []}
        keyExtractor={(item) => item.id}
        style={styles.list}
        ListEmptyComponent={
          reservations ? <Text style={styles.empty}>아직 예약 내역이 없어요.</Text> : null
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.companyName}>{item.companyName}</Text>
              <Text style={styles.statusBadge}>{STATUS_LABEL[item.status]}</Text>
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
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", paddingTop: 56, paddingHorizontal: 20 },
  title: { fontSize: 18, fontWeight: "700" },
  list: { marginTop: 16 },
  empty: { marginTop: 40, textAlign: "center", fontSize: 13, color: "#a3a3a3" },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  companyName: { fontSize: 15, fontWeight: "700" },
  statusBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#525252",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  meta: { marginTop: 4, fontSize: 12, color: "#737373" },
  actions: { flexDirection: "row", gap: 16, marginTop: 10 },
  actionLink: { fontSize: 12, fontWeight: "600", color: "#171717", textDecorationLine: "underline" },
  actionDone: { fontSize: 12, color: "#a3a3a3" },
});
