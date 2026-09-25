import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Today as a local "YYYY-MM-DD" (never UTC — a plain toISOString() slice
 * would roll over at midnight UTC, which is 9am in Korea). */
export function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDateStr(year: number, month0: number, day: number) {
  return `${year}-${pad(month0 + 1)}-${pad(day)}`;
}

function formatDisplay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${y}년 ${m}월 ${d}일 (${weekday})`;
}

/**
 * A month-grid calendar in a bottom sheet — replaces a free-text
 * "YYYY-MM-DD" field the customer had to type by hand. Pure RN (View/Text/
 * Pressable/Modal, same as the app's other sheets, e.g.
 * CategoryProfileButton) rather than @react-native-community/datetimepicker:
 * that package needs a native module, which can't reach an already-installed
 * build over an OTA update (see PhotoStack/Icon for the same reasoning).
 */
export function CalendarDatePicker({
  label,
  value,
  onChange,
  minDateStr,
  blockedDates = [],
}: {
  label?: string;
  value: string;
  onChange: (dateStr: string) => void;
  minDateStr: string;
  /** "YYYY-MM-DD" dates the company doesn't take reservations on — shown
   * with a dot, still selectable so the "휴무일" hint below the field can
   * explain why (the server re-checks regardless). */
  blockedDates?: string[];
}) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(0);
  const [viewMonth, setViewMonth] = useState(0);

  function openPicker() {
    const [y, m] = (value || minDateStr).split("-").map(Number);
    setViewYear(y);
    setViewMonth(m - 1);
    setOpen(true);
  }

  function changeMonth(delta: number) {
    let y = viewYear;
    let m = viewMonth + delta;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewYear(y);
    setViewMonth(m);
  }

  const [minYear, minMonth] = minDateStr.split("-").map(Number);
  const canGoPrevMonth = viewYear > minYear || (viewYear === minYear && viewMonth > minMonth - 1);

  const blockedSet = new Set(blockedDates);
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable style={styles.field} onPress={openPicker}>
        <Text style={value ? styles.fieldText : styles.fieldPlaceholder}>
          {value ? formatDisplay(value) : "날짜를 선택해주세요"}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.header}>
              <Pressable onPress={() => changeMonth(-1)} disabled={!canGoPrevMonth} hitSlop={10}>
                <Text style={[styles.navArrow, !canGoPrevMonth && styles.navArrowDisabled]}>‹</Text>
              </Pressable>
              <Text style={styles.monthTitle}>
                {viewYear}년 {viewMonth + 1}월
              </Text>
              <Pressable onPress={() => changeMonth(1)} hitSlop={10}>
                <Text style={styles.navArrow}>›</Text>
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((w) => (
                <Text key={w} style={styles.weekdayText}>
                  {w}
                </Text>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((day, i) => {
                if (day == null) return <View key={i} style={styles.cell} />;
                const dateStr = toDateStr(viewYear, viewMonth, day);
                const disabled = dateStr < minDateStr;
                const blocked = blockedSet.has(dateStr);
                const selected = dateStr === value;
                return (
                  <Pressable
                    key={i}
                    style={styles.cell}
                    disabled={disabled}
                    onPress={() => {
                      onChange(dateStr);
                      setOpen(false);
                    }}
                  >
                    <View style={[styles.dayCircle, selected && styles.dayCircleSelected]}>
                      <Text
                        style={[
                          styles.dayText,
                          disabled && styles.dayTextDisabled,
                          selected && styles.dayTextSelected,
                        ]}
                      >
                        {day}
                      </Text>
                    </View>
                    {blocked && !disabled && !selected && <View style={styles.blockedDot} />}
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  label: {
    marginTop: spacing.md,
    marginBottom: spacing.xs + 2,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textMuted,
  },
  field: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
  },
  fieldText: { fontSize: fontSize.md, color: colors.text },
  fieldPlaceholder: { fontSize: fontSize.md, color: colors.textFaint },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  navArrow: {
    width: 36,
    textAlign: "center",
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  navArrowDisabled: { color: colors.textFaint },
  monthTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  weekRow: { flexDirection: "row", marginTop: spacing.lg },
  weekdayText: {
    width: CELL_SIZE,
    textAlign: "center",
    fontSize: fontSize.sm,
    color: colors.textFaint,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.xs },
  cell: { width: CELL_SIZE, height: CELL_SIZE, alignItems: "center", justifyContent: "center" },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleSelected: { backgroundColor: colors.primary },
  dayText: { fontSize: fontSize.md, color: colors.text },
  dayTextDisabled: { color: colors.textFaint },
  dayTextSelected: { color: colors.onPrimary, fontWeight: fontWeight.semibold },
  blockedDot: {
    position: "absolute",
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.danger,
  },
});
