import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  fetchCompanyReservationDetail,
  transitionReservation,
  type CompanyReservationDetail,
} from "../../../src/api/company";

const STATUS_LABEL: Record<CompanyReservationDetail["status"], string> = {
  REQUESTED: "예약 신청",
  ACCEPTED: "예약 확정",
  REJECTED: "거절됨",
  CANCELLED: "취소됨",
  COMPLETED: "완료",
};

export default function CompanyReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reservation, setReservation] = useState<CompanyReservationDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetchCompanyReservationDetail(id).then(setReservation);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleAction(action: "accept" | "reject" | "complete") {
    setBusy(true);
    try {
      await transitionReservation(id, action);
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!reservation) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>예약 상세</Text>
        <Text style={styles.statusBadge}>{STATUS_LABEL[reservation.status]}</Text>
      </View>

      <View style={styles.card}>
        <Row label="고객" value={reservation.customerName} />
        <Row label="연락처" value={reservation.customerPhone} />
        <Row label="서비스" value={reservation.categoryName} />
        {reservation.price != null && (
          <Row label="가격" value={`${reservation.price.toLocaleString()}원`} />
        )}
        <Row
          label="날짜/시간"
          value={`${new Date(reservation.desiredDate).toLocaleDateString("ko-KR")} ${reservation.desiredTime}`}
        />
        <Row
          label="주소"
          value={`${reservation.address}${reservation.addressDetail ? ` ${reservation.addressDetail}` : ""}`}
        />
        {reservation.requestNote && (
          <View style={styles.noteBlock}>
            <Text style={styles.rowLabel}>요청사항</Text>
            <Text style={styles.noteText}>{reservation.requestNote}</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.chatButton}
          onPress={() => router.push(`/reservations/${reservation.id}/chat`)}
        >
          <Text style={styles.chatButtonText}>채팅하기</Text>
        </Pressable>

        {reservation.status === "REQUESTED" && (
          <>
            <Pressable
              style={styles.acceptButton}
              onPress={() => handleAction("accept")}
              disabled={busy}
            >
              <Text style={styles.acceptButtonText}>승인</Text>
            </Pressable>
            <Pressable
              style={styles.rejectButton}
              onPress={() => handleAction("reject")}
              disabled={busy}
            >
              <Text style={styles.rejectButtonText}>거절</Text>
            </Pressable>
          </>
        )}
        {reservation.status === "ACCEPTED" && (
          <Pressable
            style={styles.rejectButton}
            onPress={() => handleAction("complete")}
            disabled={busy}
          >
            <Text style={styles.rejectButtonText}>청소 완료 처리</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", paddingTop: 56, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 18, fontWeight: "700" },
  statusBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#525252",
    backgroundColor: "#f5f5f5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  card: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    padding: 16,
    gap: 10,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  rowLabel: { fontSize: 13, color: "#737373" },
  rowValue: { fontSize: 13, fontWeight: "500", textAlign: "right", flexShrink: 1 },
  noteBlock: { borderTopWidth: 1, borderTopColor: "#f5f5f5", paddingTop: 10, gap: 4 },
  noteText: { fontSize: 13 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  chatButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#171717",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chatButtonText: { fontSize: 13, fontWeight: "600" },
  acceptButton: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#171717" },
  acceptButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  rejectButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fca5a5",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  rejectButtonText: { color: "#dc2626", fontSize: 13, fontWeight: "600" },
});
