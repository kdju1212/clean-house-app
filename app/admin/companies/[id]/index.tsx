import { useCallback, useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  fetchAdminCompanyDetail,
  performAdminCompanyAction,
  type AdminCompanyDetail,
} from "../../../../src/api/admin";
import { Screen } from "../../../../src/components/Screen";
import { Card } from "../../../../src/components/Card";
import { Badge } from "../../../../src/components/Badge";
import { Button } from "../../../../src/components/Button";
import { LoadingView } from "../../../../src/components/LoadingView";
import { colors, fontSize, fontWeight, radius, spacing } from "../../../../src/theme";

const STATUS_LABEL: Record<AdminCompanyDetail["status"], string> = {
  PENDING: "승인 대기",
  ACTIVE: "활성",
  SUSPENDED: "정지",
};

/** Mirrors the web repo's /admin/companies/[id] detail page — same info
 * plus approve/suspend/reactivate/verify actions, a tel: call link, and a
 * "채팅하기" button into the shared 관리자 문의 room (see
 * app/admin/companies/[id]/chat.tsx). */
export default function AdminCompanyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [company, setCompany] = useState<AdminCompanyDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(() => fetchAdminCompanyDetail(id).then(setCompany), [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleAction(action: "approve" | "reactivate" | "verify" | "unverify") {
    setBusy(true);
    try {
      await performAdminCompanyAction(id, action);
      await load();
    } catch (err) {
      Alert.alert("처리 실패", err instanceof Error ? err.message : "처리에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSuspendConfirm() {
    if (reason.trim().length === 0) {
      Alert.alert("알림", "정지 사유를 입력해주세요.");
      return;
    }
    setBusy(true);
    try {
      await performAdminCompanyAction(id, "suspend", reason.trim());
      setSuspendOpen(false);
      setReason("");
      await load();
    } catch (err) {
      Alert.alert("처리 실패", err instanceof Error ? err.message : "처리에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  if (!company) {
    return <LoadingView />;
  }

  return (
    <Screen scroll>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {company.name}
        </Text>
        <Badge
          label={STATUS_LABEL[company.status]}
          tone={company.status === "PENDING" ? "warning" : "neutral"}
        />
      </View>

      <Card style={styles.card}>
        <InfoRow label="소유자" value={`${company.ownerName ?? "-"} (${company.ownerEmail ?? "이메일 없음"})`} />
        <InfoRow
          label="사업자등록번호"
          value={
            company.businessRegistrationNumber
              ? company.businessRegistrationNumber.replace(/^(\d{3})(\d{2})(\d{5})$/, "$1-$2-$3")
              : "미입력"
          }
        />
        {company.representativeName && <InfoRow label="대표자명" value={company.representativeName} />}
        {company.phone ? (
          <Pressable onPress={() => Linking.openURL(`tel:${company.phone}`)}>
            <InfoRow label="연락처" value={company.phone} valueStyle={styles.phoneLink} />
          </Pressable>
        ) : (
          <InfoRow label="연락처" value="-" />
        )}
        <InfoRow label="등록일" value={new Date(company.createdAt).toLocaleDateString("ko-KR")} />
        <InfoRow label="영업시간" value={company.businessHours ?? "-"} />
        <InfoRow label="예약 가능 여부" value={company.isAvailable ? "예약 가능" : "예약 마감"} />
        <InfoRow
          label="평점"
          value={company.reviewCount > 0 ? `★ ${company.averageRating.toFixed(1)} (리뷰 ${company.reviewCount}개)` : "리뷰 없음"}
        />
        {company.introText && (
          <View style={styles.introBlock}>
            <Text style={styles.introLabel}>소개</Text>
            <Text style={styles.introText}>{company.introText}</Text>
          </View>
        )}
        {company.status === "SUSPENDED" && company.suspendedReason && (
          <View style={styles.introBlock}>
            <Text style={styles.suspendedLabel}>정지 사유</Text>
            <Text style={styles.introText}>{company.suspendedReason}</Text>
          </View>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>예약 현황</Text>
        <View style={styles.countGrid}>
          <CountTile label="신청" value={company.reservationCounts.requested} />
          <CountTile label="확정" value={company.reservationCounts.accepted} />
          <CountTile label="완료" value={company.reservationCounts.completed} />
          <CountTile label="거절/취소" value={company.reservationCounts.rejectedOrCancelled} />
          <CountTile label="노쇼" value={company.reservationCounts.noShow} />
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>서비스 · 가격</Text>
        {company.services.length === 0 ? (
          <Text style={styles.emptyText}>등록된 서비스가 없어요.</Text>
        ) : (
          company.services.map((s) => (
            <View key={s.categoryName} style={styles.serviceRow}>
              <Text style={styles.serviceName}>{s.categoryName}</Text>
              <Text style={styles.servicePrice}>{s.price.toLocaleString()}원</Text>
            </View>
          ))
        )}
        <Text style={[styles.introLabel, styles.regionLabel]}>서비스 지역</Text>
        <Text style={styles.introText}>{company.regionNames.join(", ") || "-"}</Text>
      </Card>

      <View style={styles.actionsRow}>
        {company.status === "PENDING" && (
          <Button title="승인" size="sm" loading={busy} onPress={() => handleAction("approve")} />
        )}
        {company.status === "ACTIVE" && !suspendOpen && (
          <Pressable
            style={[styles.outlineButton, styles.dangerButton]}
            onPress={() => setSuspendOpen(true)}
          >
            <Text style={styles.dangerButtonText}>정지</Text>
          </Pressable>
        )}
        {company.status === "SUSPENDED" && (
          <Pressable style={styles.outlineButton} onPress={() => handleAction("reactivate")}>
            <Text style={styles.outlineButtonText}>정지 해제</Text>
          </Pressable>
        )}
        {company.isVerified ? (
          <Pressable style={styles.outlineButton} onPress={() => handleAction("unverify")}>
            <Text style={styles.outlineButtonText}>인증 해제</Text>
          </Pressable>
        ) : (
          <Button title="인증하기" size="sm" loading={busy} onPress={() => handleAction("verify")} />
        )}
        <Pressable
          style={styles.outlineButton}
          onPress={() => router.push(`/admin/companies/${id}/chat`)}
        >
          <Text style={styles.outlineButtonText}>채팅하기</Text>
        </Pressable>
      </View>

      {suspendOpen && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>정지 사유</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="정지 사유를 입력해주세요 (업체에 그대로 전달돼요)"
            placeholderTextColor={colors.textFaint}
            multiline
            style={styles.reasonInput}
          />
          <View style={styles.actionsRow}>
            <Button title="정지 확정" size="sm" loading={busy} onPress={handleSuspendConfirm} />
            <Pressable style={styles.outlineButton} onPress={() => setSuspendOpen(false)}>
              <Text style={styles.outlineButtonText}>취소</Text>
            </Pressable>
          </View>
        </Card>
      )}
    </Screen>
  );
}

function InfoRow({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
    </View>
  );
}

function CountTile({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.countTile}>
      <Text style={styles.countValue}>{value}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { flex: 1, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  card: { marginTop: spacing.lg },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.xs + 1,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  infoValue: { flexShrink: 1, textAlign: "right", fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  phoneLink: { color: colors.primary, textDecorationLine: "underline" },
  introBlock: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.sm },
  introLabel: { fontSize: fontSize.sm, color: colors.textMuted },
  suspendedLabel: { fontSize: fontSize.sm, color: colors.danger },
  introText: { marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.text },
  regionLabel: { marginTop: spacing.md },
  sectionTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  countGrid: { marginTop: spacing.sm, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  countTile: {
    flexGrow: 1,
    minWidth: "28%",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  countValue: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  countLabel: { marginTop: 2, fontSize: fontSize.xs, color: colors.textMuted },
  serviceRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
  serviceName: { fontSize: fontSize.sm, color: colors.text },
  servicePrice: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  emptyText: { marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.textFaint },
  actionsRow: { marginTop: spacing.lg, flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  outlineButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
  },
  outlineButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  dangerButton: { borderColor: colors.dangerBorder },
  dangerButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.danger },
  reasonInput: {
    marginTop: spacing.sm,
    minHeight: 70,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.text,
  },
});
