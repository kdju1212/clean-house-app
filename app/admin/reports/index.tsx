import { useCallback, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  fetchAdminReports,
  resolveAdminReport,
  type AdminReport,
  type AdminReportStatus,
} from "../../../src/api/admin";
import { Screen } from "../../../src/components/Screen";
import { Card } from "../../../src/components/Card";
import { Badge } from "../../../src/components/Badge";
import { Button } from "../../../src/components/Button";
import { EmptyState } from "../../../src/components/EmptyState";
import { LoadingView } from "../../../src/components/LoadingView";
import { colors, fontSize, fontWeight, radius, spacing } from "../../../src/theme";

const STATUS_FILTERS: { value: AdminReportStatus; label: string }[] = [
  { value: "PENDING", label: "처리 대기" },
  { value: "RESOLVED", label: "처리 완료" },
];

/** Mirrors the web repo's /admin/reports — 리뷰 신고 처리(숨기기/반려) and
 * 업체 신고 처리(정지/반려) in one list. */
export default function AdminReportsScreen() {
  const [activeStatus, setActiveStatus] = useState<AdminReportStatus>("PENDING");
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    return fetchAdminReports(activeStatus).then(setReports);
  }, [activeStatus]);

  useFocusEffect(
    useCallback(() => {
      setReports(null);
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

  async function handleResolve(report: AdminReport, action: "hide" | "dismiss" | "suspend") {
    setBusyId(report.id);
    try {
      await resolveAdminReport(report.id, action);
      await load();
    } catch (err) {
      Alert.alert("처리 실패", err instanceof Error ? err.message : "처리에 실패했어요.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen scroll refreshing={refreshing} onRefresh={handleRefresh}>
      <Text style={styles.title}>신고 관리</Text>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((f) => (
          <Pressable
            key={f.value}
            style={[styles.filterChip, activeStatus === f.value && styles.filterChipActive]}
            onPress={() => setActiveStatus(f.value)}
          >
            <Text
              style={[styles.filterChipText, activeStatus === f.value && styles.filterChipTextActive]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {!reports ? (
        <LoadingView />
      ) : reports.length === 0 ? (
        <EmptyState
          text={activeStatus === "PENDING" ? "처리 대기 중인 신고가 없어요." : "처리 완료된 신고가 없어요."}
        />
      ) : (
        <View style={styles.list}>
          {reports.map((report) => (
            <Card key={report.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.reporterName} numberOfLines={1}>
                  {report.reporterName ?? "익명"}님의 신고
                </Text>
                <Text style={styles.date}>{new Date(report.createdAt).toLocaleDateString("ko-KR")}</Text>
              </View>
              <Text style={styles.reasonLabel}>신고 사유</Text>
              <Text style={styles.reasonText}>{report.reason}</Text>

              {report.reviewPreview && (
                <View style={styles.previewBox}>
                  <View style={styles.previewHeader}>
                    <Text style={styles.previewTitle} numberOfLines={1}>
                      {report.reviewPreview.companyName} · {report.reviewPreview.customerName ?? "익명"}
                    </Text>
                    <Text style={styles.stars}>
                      {"★".repeat(report.reviewPreview.rating)}
                      {"☆".repeat(5 - report.reviewPreview.rating)}
                    </Text>
                  </View>
                  <Text style={styles.previewBody}>{report.reviewPreview.content}</Text>
                  {report.reviewPreview.hidden && <Text style={styles.hiddenNote}>숨김 처리된 리뷰예요.</Text>}
                </View>
              )}
              {report.companyPreview && (
                <Pressable
                  style={styles.previewBox}
                  onPress={() => router.push(`/admin/companies/${report.companyPreview!.id}`)}
                >
                  <View style={styles.previewHeader}>
                    <Text style={styles.previewTitle} numberOfLines={1}>
                      {report.companyPreview.name}
                    </Text>
                    <Badge
                      label={COMPANY_STATUS_LABEL[report.companyPreview.status]}
                      tone={report.companyPreview.status === "PENDING" ? "warning" : "neutral"}
                    />
                  </View>
                </Pressable>
              )}
              {!report.reviewPreview && !report.companyPreview && (
                <Text style={styles.hiddenNote}>신고 대상을 찾을 수 없어요 (삭제됨).</Text>
              )}

              {activeStatus === "PENDING" && (
                <View style={styles.actionsRow}>
                  {report.reviewPreview && (
                    <Button
                      title="리뷰 숨기기"
                      size="sm"
                      loading={busyId === report.id}
                      onPress={() => handleResolve(report, "hide")}
                    />
                  )}
                  {report.companyPreview && report.companyPreview.status === "ACTIVE" && (
                    <Button
                      title="업체 정지"
                      size="sm"
                      loading={busyId === report.id}
                      onPress={() => handleResolve(report, "suspend")}
                    />
                  )}
                  {(report.reviewPreview || report.companyPreview) && (
                    <Pressable
                      style={styles.outlineButton}
                      onPress={() => handleResolve(report, "dismiss")}
                    >
                      <Text style={styles.outlineButtonText}>반려</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </Card>
          ))}
        </View>
      )}
    </Screen>
  );
}

const COMPANY_STATUS_LABEL: Record<"PENDING" | "ACTIVE" | "SUSPENDED", string> = {
  PENDING: "승인 대기",
  ACTIVE: "활성",
  SUSPENDED: "정지",
};

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  filterRow: { marginTop: spacing.md, flexDirection: "row", gap: spacing.xs },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: "#525252" },
  filterChipTextActive: { color: colors.onPrimary },
  list: { marginTop: spacing.lg, gap: spacing.sm + 2 },
  card: {},
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  reporterName: { flex: 1, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  date: { fontSize: fontSize.xs, color: colors.textFaint },
  reasonLabel: { marginTop: spacing.sm, fontSize: fontSize.xs, color: colors.textMuted },
  reasonText: { marginTop: 2, fontSize: fontSize.sm, color: colors.text },
  previewBox: {
    marginTop: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm + 2,
  },
  previewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  previewTitle: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  stars: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.star },
  previewBody: { marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.text },
  hiddenNote: { marginTop: spacing.xs, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.danger },
  actionsRow: { marginTop: spacing.sm + 2, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
  },
  outlineButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
});
