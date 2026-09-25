import { useCallback, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  fetchCompanyReservationDetail,
  transitionReservation,
  type CompanyReservationDetail,
} from "../../../src/api/company";
import { getReservationQuestions } from "../../../src/utils/reservation-questions";
import { Screen } from "../../../src/components/Screen";
import { LoadingView } from "../../../src/components/LoadingView";
import { Card } from "../../../src/components/Card";
import { Badge } from "../../../src/components/Badge";
import { Button } from "../../../src/components/Button";
import { colors, fontSize, fontWeight, radius, spacing } from "../../../src/theme";

const STATUS_LABEL: Record<CompanyReservationDetail["status"], string> = {
  REQUESTED: "예약 신청",
  ACCEPTED: "예약 확정",
  REJECTED: "거절됨",
  CANCELLED: "취소됨",
  COMPLETED: "완료",
  NO_SHOW: "노쇼",
};

export default function CompanyReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reservation, setReservation] = useState<CompanyReservationDetail | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    return fetchCompanyReservationDetail(id).then((data) => {
      setReservation(data);
      setPriceInput(data.price != null ? String(data.price) : "");
    });
  }, [id]);

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

  async function handleAction(action: "accept" | "reject" | "complete" | "no_show") {
    setBusy(true);
    try {
      const price = action === "accept" && priceInput.trim() ? Number(priceInput) : undefined;
      await transitionReservation(id, action, price);
      load();
    } finally {
      setBusy(false);
    }
  }

  if (!reservation) {
    return <LoadingView />;
  }

  return (
    <Screen scroll refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={styles.header}>
        <Text style={styles.title}>예약 상세</Text>
        <Badge label={STATUS_LABEL[reservation.status]} />
      </View>

      <Card style={styles.card}>
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
        {reservation.items.some((item) => item.categoryAnswers) && (
          <View style={styles.noteBlock}>
            <Text style={styles.rowLabel}>견적 정보</Text>
            {reservation.items.map((item) =>
              item.categoryAnswers ? (
                <View key={item.categorySlug}>
                  {reservation.items.length > 1 && (
                    <Text style={styles.itemTitle}>{item.categoryName}</Text>
                  )}
                  {getReservationQuestions(item.categorySlug).map((q) => {
                    const value = item.categoryAnswers?.[q.key];
                    return value ? (
                      <Row key={q.key} label={q.label} value={value.split(",").join(", ")} />
                    ) : null;
                  })}
                </View>
              ) : null
            )}
          </View>
        )}
        {reservation.requestNote && (
          <View style={styles.noteBlock}>
            <Text style={styles.rowLabel}>요청사항</Text>
            <Text style={styles.noteText}>{reservation.requestNote}</Text>
          </View>
        )}
      </Card>

      {reservation.status === "REQUESTED" && (
        <>
          <Text style={styles.hint}>견적 정보를 확인하고 실제 가격에 맞게 조정한 다음 승인해주세요.</Text>
          <TextInput
            value={priceInput}
            onChangeText={setPriceInput}
            placeholder="가격"
            keyboardType="number-pad"
            style={styles.priceInput}
          />
        </>
      )}

      <View style={styles.actions}>
        <Button
          title="채팅하기"
          variant="outline"
          onPress={() => router.push(`/reservations/${reservation.id}/chat`)}
        />

        {reservation.status === "REQUESTED" && (
          <>
            <Button title="승인" onPress={() => handleAction("accept")} loading={busy} />
            <Button
              title="거절"
              variant="danger"
              onPress={() => handleAction("reject")}
              disabled={busy}
            />
          </>
        )}
        {reservation.status === "ACCEPTED" && (
          <>
            <Button
              title="청소 완료 처리"
              variant="outline"
              onPress={() => handleAction("complete")}
              disabled={busy}
            />
            <Button
              title="노쇼 처리"
              variant="danger"
              onPress={() => handleAction("no_show")}
              disabled={busy}
            />
          </>
        )}
      </View>
    </Screen>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  card: { marginTop: spacing.lg, gap: spacing.sm + 2 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  rowLabel: { fontSize: fontSize.base, color: colors.textMuted },
  rowValue: { fontSize: fontSize.base, fontWeight: fontWeight.medium, textAlign: "right", flexShrink: 1, color: colors.text },
  noteBlock: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.sm + 2, gap: spacing.xs },
  noteText: { fontSize: fontSize.base, color: colors.text },
  itemTitle: { marginTop: spacing.xs, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  hint: { marginTop: spacing.lg, fontSize: fontSize.sm, color: colors.textMuted },
  priceInput: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
});
