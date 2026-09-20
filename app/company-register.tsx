import { useState } from "react";
import { Alert, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { registerCompany } from "../src/api/company";
import { updateStoredRole } from "../src/storage/auth-storage";
import { Screen } from "../src/components/Screen";
import { TextField } from "../src/components/TextField";
import { Button } from "../src/components/Button";
import { colors, fontSize, fontWeight, spacing } from "../src/theme";

/**
 * Standalone (not under app/company/_layout.tsx's Tabs) since the caller
 * is still a CUSTOMER at this point — no company tabs to show yet. Mirrors
 * clean_house's /company/register web page/register-form.tsx field for
 * field, hitting the same shared createCompanyForOwner validation via
 * /api/mobile/company/register.
 */
export default function CompanyRegisterScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [introText, setIntroText] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!name.trim()) {
      Alert.alert("알림", "업체명을 입력해주세요.");
      return;
    }
    if (!phone.trim()) {
      Alert.alert("알림", "연락처를 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      await registerCompany({
        name,
        phone,
        businessRegistrationNumber: businessRegistrationNumber || undefined,
        representativeName: representativeName || undefined,
        introText: introText || undefined,
        businessHours: businessHours || undefined,
      });
      await updateStoredRole("COMPANY");
      router.replace("/company");
    } catch (err) {
      Alert.alert("등록 실패", err instanceof Error ? err.message : "등록에 실패했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>업체 등록</Text>
      <Text style={styles.subtitle}>
        등록 후 관리자 승인이 나면 고객에게 노출돼요. 승인 전까지도 프로필/서비스/사진은
        자유롭게 준비할 수 있어요.
      </Text>

      <TextField label="업체명" value={name} onChangeText={setName} placeholder="업체명" />
      <TextField
        label="연락처"
        value={phone}
        onChangeText={setPhone}
        placeholder="010-0000-0000"
        keyboardType="phone-pad"
      />
      <TextField
        label="사업자등록번호 (선택)"
        value={businessRegistrationNumber}
        onChangeText={setBusinessRegistrationNumber}
        placeholder="000-00-00000"
        keyboardType="numeric"
      />
      <Text style={styles.helperText}>
        입력하면 “사업자등록” 배지가 붙고, 관리자가 확인하면 “인증” 배지로 올라가요. 대시(-)는
        있어도 없어도 괜찮아요.
      </Text>
      <TextField
        label="대표자명 (선택)"
        value={representativeName}
        onChangeText={setRepresentativeName}
        placeholder="대표자명"
      />
      <TextField
        label="업체 소개 (선택)"
        value={introText}
        onChangeText={setIntroText}
        placeholder="업체 소개"
        multiline
      />
      <TextField
        label="영업시간 (선택)"
        value={businessHours}
        onChangeText={setBusinessHours}
        placeholder="예: 09:00 - 18:00"
      />

      <Button
        title="등록하기"
        onPress={handleSubmit}
        loading={submitting}
        style={styles.submitButton}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  subtitle: { marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.textMuted },
  helperText: { marginTop: -spacing.sm, fontSize: fontSize.xs, color: colors.textFaint },
  submitButton: { marginTop: spacing.xl },
});
