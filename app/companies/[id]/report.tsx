import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { reportCompany } from "../../../src/api/companies";
import { Screen } from "../../../src/components/Screen";
import { Button } from "../../../src/components/Button";
import { TextField } from "../../../src/components/TextField";
import { colors, fontSize, fontWeight, spacing } from "../../../src/theme";

/** Mirrors the web repo's /companies/[id]/report page — a customer reporting
 * a company itself (fraud, no-show, unfair charges, etc.), as opposed to
 * reporting one specific review. */
export default function ReportCompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (reason.trim().length === 0) {
      Alert.alert("알림", "신고 사유를 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      await reportCompany(id, reason);
      Alert.alert("신고가 접수됐어요", "확인 후 필요한 조치를 취할게요.", [
        { text: "확인", onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert("신고 실패", err instanceof Error ? err.message : "신고에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>업체 신고</Text>
      <Text style={styles.subtitle}>문제가 있다고 생각되면 신고해주세요.</Text>

      <TextField
        value={reason}
        onChangeText={setReason}
        placeholder="신고 사유를 알려주세요 (예: 예약 후 연락 두절, 부당한 요금 청구 등)"
        multiline
      />

      <Button title="신고하기" onPress={handleSubmit} loading={submitting} style={styles.submitButton} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  subtitle: { marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.textMuted },
  submitButton: { marginTop: spacing.xxl },
});
