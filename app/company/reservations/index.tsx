import { useCallback, useMemo, useState } from "react";
import { Dimensions, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
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
  NO_SHOW: "노쇼",
};

const STATUS_FILTERS = [
  { value: "", label: "전체" },
  { value: "REQUESTED", label: "신규" },
  { value: "ACCEPTED", label: "승인됨" },
  { value: "COMPLETED", label: "완료" },
  { value: "NO_SHOW", label: "노쇼" },
] as const;

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// A 100%/7 percentage width made every row wrap after 6 cells instead of
// 7 — RN rounds each cell's percentage to whole pixels before summing, and
// that rounding pushed the total just over the container's width. Sizing
// from the actual screen width sidesteps the rounding entirely, the same
// approach PhotoStack.tsx uses for its own width math.
const CALENDAR_CELL_SIZE = Math.floor((Dimensions.get("window").width - spacing.xl * 2) / 7);

/** "2026-09-27T00:00:00.000Z" -> "2026-09-27" — the API always sends
 * midnight-UTC for a date-only value, so slicing avoids any local-timezone
 * shift a Date-object round-trip could introduce. */
function dateKey(isoString: string): string {
  return isoString.slice(0, 10);
}

export default function CompanyReservationsScreen() {
  const [activeStatus, setActiveStatus] = useState<string>("");
  const [view, setView] = useState<"list" | "calendar">("list");
  const [reservations, setReservations] = useState<CompanyReservation[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    return fetchCompanyReservations(activeStatus || undefined).then(setReservations);
  }, [activeStatus]);

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

  async function handleAction(id: string, action: "accept" | "reject" | "complete" | "no_show") {
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

      <View style={styles.viewToggleRow}>
        <Pressable
          style={[styles.viewToggleChip, view === "list" && styles.viewToggleChipActive]}
          onPress={() => setView("list")}
        >
          <Text
            style={[styles.viewToggleText, view === "list" && styles.viewToggleTextActive]}
          >
            리스트
          </Text>
        </Pressable>
        <Pressable
          style={[styles.viewToggleChip, view === "calendar" && styles.viewToggleChipActive]}
          onPress={() => setView("calendar")}
        >
          <Text
            style={[styles.viewToggleText, view === "calendar" && styles.viewToggleTextActive]}
          >
            캘린더
          </Text>
        </Pressable>
      </View>

      {view === "list" ? (
        <FlatList
          data={reservations ?? []}
          keyExtractor={(item) => item.id}
          style={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            reservations ? <EmptyState text="아직 들어온 예약이 없어요." /> : null
          }
          renderItem={({ item }) => (
            <ReservationCard
              reservation={item}
              busy={busyId === item.id}
              onAction={(action) => handleAction(item.id, action)}
            />
          )}
        />
      ) : (
        <ReservationCalendar
          reservations={reservations ?? []}
          busyId={busyId}
          onAction={handleAction}
        />
      )}
    </Screen>
  );
}

function ReservationCard({
  reservation: item,
  busy,
  onAction,
}: {
  reservation: CompanyReservation;
  busy: boolean;
  onAction: (action: "accept" | "reject" | "complete" | "no_show") => void;
}) {
  return (
    <Card onPress={() => router.push(`/company/reservations/${item.id}`)} style={styles.card}>
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
            title="견적 확인 후 승인"
            size="sm"
            onPress={() => router.push(`/company/reservations/${item.id}`)}
          />
          <Button
            title="거절"
            size="sm"
            variant="danger"
            onPress={() => onAction("reject")}
            disabled={busy}
          />
        </View>
      )}
      {item.status === "ACCEPTED" && (
        <View style={styles.actions}>
          <Button
            title="청소 완료 처리"
            size="sm"
            variant="outline"
            onPress={() => onAction("complete")}
            loading={busy}
          />
          <Button
            title="노쇼 처리"
            size="sm"
            variant="danger"
            onPress={() => onAction("no_show")}
            disabled={busy}
          />
        </View>
      )}
    </Card>
  );
}

function ReservationCalendar({
  reservations,
  busyId,
  onAction,
}: {
  reservations: CompanyReservation[];
  busyId: string | null;
  onAction: (id: string, action: "accept" | "reject" | "complete" | "no_show") => void;
}) {
  const todayKey = useMemo(() => dateKey(new Date().toISOString()), []);
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const byDate = useMemo(() => {
    const map = new Map<string, CompanyReservation[]>();
    for (const r of reservations) {
      const key = dateKey(r.desiredDate);
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    return map;
  }, [reservations]);

  const { year, month } = monthCursor;
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(startWeekday).fill(null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`
    ),
  ];

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setMonthCursor({ year: d.getFullYear(), month: d.getMonth() });
  }

  const selectedReservations = (byDate.get(selectedDate) ?? []).sort((a, b) =>
    a.desiredTime.localeCompare(b.desiredTime)
  );

  return (
    <View style={styles.calendar}>
      <View style={styles.calendarHeader}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={8}>
          <Text style={styles.calendarNav}>‹</Text>
        </Pressable>
        <Text style={styles.calendarMonth}>
          {year}년 {month + 1}월
        </Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={8}>
          <Text style={styles.calendarNav}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((w) => (
          <Text key={w} style={styles.weekdayLabel}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {cells.map((day, i) => {
          if (!day) return <View key={`empty-${i}`} style={styles.calendarCell} />;
          const dayReservations = byDate.get(day) ?? [];
          const needsAction = dayReservations.some((r) => r.status === "REQUESTED");
          const isSelected = day === selectedDate;
          const isToday = day === todayKey;
          return (
            <Pressable
              key={day}
              onPress={() => setSelectedDate(day)}
              style={[
                styles.calendarCell,
                isSelected && styles.calendarCellSelected,
                !isSelected && isToday && styles.calendarCellToday,
              ]}
            >
              <Text
                style={[
                  styles.calendarCellText,
                  isSelected && styles.calendarCellTextSelected,
                  !isSelected && isToday && styles.calendarCellTextToday,
                ]}
              >
                {Number(day.slice(-2))}
              </Text>
              {dayReservations.length > 0 && (
                <View
                  style={[
                    styles.calendarDot,
                    { backgroundColor: isSelected ? colors.onPrimary : needsAction ? colors.warning : colors.textMuted },
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.calendarSelectedHeader}>
        <Text style={styles.calendarSelectedLabel}>
          {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("ko-KR", {
            month: "long",
            day: "numeric",
            weekday: "short",
          })}
          {selectedReservations.length > 0 ? ` · ${selectedReservations.length}건` : ""}
        </Text>
      </View>
      {selectedReservations.length === 0 ? (
        <EmptyState text="이 날짜엔 예약이 없어요." />
      ) : (
        <View style={styles.list}>
          {selectedReservations.map((item) => (
            <ReservationCard
              key={item.id}
              reservation={item}
              busy={busyId === item.id}
              onAction={(action) => onAction(item.id, action)}
            />
          ))}
        </View>
      )}
    </View>
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
  viewToggleRow: { flexDirection: "row", gap: spacing.xs + 2, marginTop: spacing.sm + 2 },
  viewToggleChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  viewToggleChipActive: { backgroundColor: colors.text, borderColor: colors.text },
  viewToggleText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: "#525252" },
  viewToggleTextActive: { color: colors.onPrimary },
  list: { marginTop: spacing.lg },
  card: { marginBottom: spacing.sm + 2 },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  customerName: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  meta: { marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.textMuted },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  calendar: { marginTop: spacing.lg },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calendarNav: { fontSize: fontSize.xl, color: colors.textMuted, paddingHorizontal: spacing.sm },
  calendarMonth: { fontSize: fontSize.base, fontWeight: fontWeight.bold, color: colors.text },
  weekdayRow: { flexDirection: "row", marginTop: spacing.sm },
  weekdayLabel: {
    width: CALENDAR_CELL_SIZE,
    textAlign: "center",
    fontSize: fontSize.xs,
    color: colors.textFaint,
    paddingVertical: spacing.xs,
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  calendarCell: {
    width: CALENDAR_CELL_SIZE,
    height: CALENDAR_CELL_SIZE,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  calendarCellSelected: { backgroundColor: colors.text, borderRadius: radius.md },
  calendarCellToday: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md },
  calendarCellText: { fontSize: fontSize.sm, color: colors.text },
  calendarCellTextSelected: { color: colors.onPrimary, fontWeight: fontWeight.semibold },
  calendarCellTextToday: { fontWeight: fontWeight.semibold },
  calendarDot: { width: 5, height: 5, borderRadius: 3 },
  calendarSelectedHeader: { marginTop: spacing.md + 2 },
  calendarSelectedLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.textMuted },
});
