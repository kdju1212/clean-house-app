import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  fetchCompanyReservations,
  transitionReservation,
  type CompanyReservation,
} from "../../../src/api/company";
import { Screen } from "../../../src/components/Screen";
import { Card } from "../../../src/components/Card";
import { Badge } from "../../../src/components/Badge";
import { Button } from "../../../src/components/Button";
import { EmptyState } from "../../../src/components/EmptyState";
import { colors, fontSize, fontWeight, radius, spacing } from "../../../src/theme";

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
    <Screen>
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

      <FlatList
        data={reservations ?? []}
        keyExtractor={(item) => item.id}
        style={styles.list}
        ListEmptyComponent={
          reservations ? <EmptyState text="아직 들어온 예약이 없어요." /> : null
        }
        renderItem={({ item }) => (
          <Card
            onPress={() => router.push(`/company/reservations/${item.id}`)}
            style={styles.card}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.customerName}>{item.customerName}</Text>
              <Badge label={STATUS_LABEL[item.status]} />
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
                <Button
                  title="승인"
                  size="sm"
                  onPress={() => handleAction(item.id, "accept")}
                  loading={busyId === item.id}
                />
                <Button
                  title="거절"
                  size="sm"
                  variant="danger"
                  onPress={() => handleAction(item.id, "reject")}
                  disabled={busyId === item.id}
                />
              </View>
            )}
            {item.status === "ACCEPTED" && (
              <View style={styles.actions}>
                <Button
                  title="청소 완료 처리"
                  size="sm"
                  variant="outline"
                  onPress={() => handleAction(item.id, "complete")}
                  loading={busyId === item.id}
                />
              </View>
            )}
          </Card>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  filterRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  filterChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: "#525252" },
  filterChipTextActive: { color: colors.onPrimary },
  list: { marginTop: spacing.lg },
  card: { marginBottom: spacing.sm + 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  customerName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  meta: { marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.textMuted },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
});
