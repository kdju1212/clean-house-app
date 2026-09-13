import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  fetchCompanyReservations,
  transitionReservation,
  type CompanyReservation,
} from "../../../src/api/company";

const STATUS_LABEL: Record<CompanyReservation["status"], string> = {
  REQUESTED: "예약 신청",
  ACCEPTED: "예약 확정",
  REJECTED: "거절됨",
  CANCELLED: "취소됨",
  COMPLETED: "완료",
};

const STATUS_FILTERS = [
  { value: "", label: "전체" },
  { value: "REQUESTED", label: "신규" },
  { value: "ACCEPTED", label: "승인됨" },
  { value: "COMPLETED", label: "완료" },
] as const;

export default function CompanyReservationsScreen() {
  const [activeStatus, setActiveStatus] = useState<string>("");
  const [reservations, setReservations] = useState<CompanyReservation[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    fetchCompanyReservations(activeStatus || undefined).then(setReservations);
  }, [activeStatus]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleAction(id: string, action: "accept" | "reject" | "complete") {
    setBusyId(id);
    try {
      await transitionReservation(id, action);
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>예약 관리</Text>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f.value}
            style={[styles.filterChip, activeStatus === f.value && styles.filterChipActive]}
            onPress={() => setActiveStatus(f.value)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeStatus === f.value && styles.filterChipTextActive,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {!reservations ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id}
          style={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>아직 들어온 예약이 없어요.</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => router.push(`/company/reservations/${item.id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.customerName}>{item.customerName}</Text>
                <Text style={styles.statusBadge}>{STATUS_LABEL[item.status]}</Text>
              </View>
              <Text style={styles.meta}>
                {item.categoryName}
                {item.price ? ` · ${item.price.toLocaleString()}원` : ""}
              </Text>
              <Text style={styles.meta}>
                {new Date(item.desiredDate).toLocaleDateString("ko-KR")} {item.desiredTime}
              </Text>

              {item.status === "REQUESTED" && (
                <View style={styles.actions}>
                  <Pressable
                    style={styles.acceptButton}
                    onPress={() => handleAction(item.id, "accept")}
                    disabled={busyId === item.id}
                  >
                    <Text style={styles.acceptButtonText}>승인</Text>
                  </Pressable>
                  <Pressable
                    style={styles.rejectButton}
                    onPress={() => handleAction(item.id, "reject")}
                    disabled={busyId === item.id}
                  >
                    <Text style={styles.rejectButtonText}>거절</Text>
                  </Pressable>
                </View>
              )}
              {item.status === "ACCEPTED" && (
                <View style={styles.actions}>
                  <Pressable
                    style={styles.completeButton}
                    onPress={() => handleAction(item.id, "complete")}
                    disabled={busyId === item.id}
                  >
                    <Text style={styles.completeButtonText}>청소 완료 처리</Text>
                  </Pressable>
                </View>
              )}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", paddingTop: 56, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "700" },
  filterRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipActive: { backgroundColor: "#171717", borderColor: "#171717" },
  filterChipText: { fontSize: 12, fontWeight: "500", color: "#525252" },
  filterChipTextActive: { color: "#ffffff" },
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
  customerName: { fontSize: 15, fontWeight: "700" },
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
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  acceptButton: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "#171717" },
  acceptButtonText: { color: "#ffffff", fontSize: 12, fontWeight: "600" },
  rejectButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  rejectButtonText: { color: "#dc2626", fontSize: 12, fontWeight: "600" },
  completeButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#171717",
  },
  completeButtonText: { fontSize: 12, fontWeight: "600" },
});
