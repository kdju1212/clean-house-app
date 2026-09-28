import { useState } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { login as kakaoLogin } from "@react-native-seoul/kakao-login";
import { loginWithKakao, loginWithTestAccount, type LoginConsents } from "../src/api/auth";
import { API_BASE_URL } from "../src/api/client";
import { getSelectedRegion } from "../src/storage/auth-storage";
import { Button } from "../src/components/Button";
import { colors, fontSize, fontWeight, radius, spacing } from "../src/theme";

const CONSENTS: { key: keyof LoginConsents; label: string; path?: string }[] = [
  { key: "agreeAge", label: "만 14세 이상입니다" },
  { key: "agreeTerms", label: "이용약관 동의", path: "/terms" },
  { key: "agreePrivacy", label: "개인정보 수집·이용 동의", path: "/privacy" },
];

const TEST_ROLES: { role: "CUSTOMER" | "COMPANY" | "ADMIN"; label: string }[] = [
  { role: "CUSTOMER", label: "고객으로 로그인" },
  { role: "COMPANY", label: "업체로 로그인" },
  { role: "ADMIN", label: "관리자로 로그인" },
];

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [showTestLogin, setShowTestLogin] = useState(false);
  const [testSecret, setTestSecret] = useState("");
  const [testRoleLoading, setTestRoleLoading] = useState<string | null>(null);
  // Same login either way — this only changes where a CUSTOMER-role
  // account lands afterward (an account already COMPANY always goes to
  // 예약관리 regardless, since it has a company either way — see
  // app/(tabs)/reservations.tsx for how that tab renders its business view).
  const [asCompany, setAsCompany] = useState(false);
  const [consents, setConsents] = useState<LoginConsents>({
    agreeAge: false,
    agreeTerms: false,
    agreePrivacy: false,
  });
  const allAgreed = CONSENTS.every((c) => consents[c.key]);

  // Always lands on a real screen with something behind it in the nav
  // stack — company-register used to be reached via a bare replace(), so
  // there was nothing to pop back to and the Android back button just
  // exited the app instead of taking the customer anywhere. Now it's
  // pushed on top of the normal customer destination, so backing out of
  // it just drops them into the app as a customer.
  async function navigateAfterLogin(role: "CUSTOMER" | "COMPANY" | "ADMIN") {
    if (role === "COMPANY") {
      router.replace("/reservations");
      return;
    }
    const region = await getSelectedRegion();
    router.replace(region ? "/categories" : "/region-select");
    if (asCompany) {
      router.push("/company-register");
    }
  }

  async function handleKakaoLogin() {
    setLoading(true);
    try {
      // Native Kakao SDK login — requires a real Kakao native app key (see
      // app.json's kakaoAppKey placeholder + README) and a development
      // build; this call throws in plain Expo Go since the SDK is a custom
      // native module.
      const { accessToken } = await kakaoLogin();
      const user = await loginWithKakao(accessToken, consents);
      await navigateAfterLogin(user.role);
    } catch (err) {
      Alert.alert(
        "로그인 실패",
        err instanceof Error ? err.message : "카카오 로그인에 실패했어요."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleTestLogin(role: "CUSTOMER" | "COMPANY" | "ADMIN") {
    setTestRoleLoading(role);
    try {
      const user = await loginWithTestAccount(testSecret, role);
      await navigateAfterLogin(user.role);
    } catch (err) {
      Alert.alert(
        "테스트 로그인 실패",
        err instanceof Error ? err.message : "테스트 로그인에 실패했어요."
      );
    } finally {
      setTestRoleLoading(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{asCompany ? "사장님 로그인" : "우리동네 청소업체"}</Text>
      <Text style={styles.subtitle}>
        {asCompany ? "로그인 후 업체 등록을 진행할게요" : "지역 청소업체를 찾고 바로 예약해보세요"}
      </Text>

      <View style={styles.consentBox}>
        <Pressable
          style={styles.consentRow}
          onPress={() =>
            setConsents({ agreeAge: !allAgreed, agreeTerms: !allAgreed, agreePrivacy: !allAgreed })
          }
        >
          <View style={[styles.checkbox, allAgreed && styles.checkboxChecked]}>
            {allAgreed && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.consentAllText}>전체 동의</Text>
        </Pressable>
        <View style={styles.consentDivider} />
        {CONSENTS.map((c) => (
          <View key={c.key} style={styles.consentItem}>
            <Pressable
              style={styles.consentRow}
              onPress={() => setConsents((prev) => ({ ...prev, [c.key]: !prev[c.key] }))}
            >
              <View style={[styles.checkbox, consents[c.key] && styles.checkboxChecked]}>
                {consents[c.key] && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.consentText}>
                <Text style={styles.required}>[필수]</Text> {c.label}
              </Text>
            </Pressable>
            {c.path && (
              <Pressable onPress={() => Linking.openURL(`${API_BASE_URL}${c.path}`)} hitSlop={8}>
                <Text style={styles.consentView}>보기</Text>
              </Pressable>
            )}
          </View>
        ))}
      </View>

      <Button
        title="카카오로 로그인"
        onPress={handleKakaoLogin}
        loading={loading}
        disabled={!allAgreed}
        variant="kakao"
        style={styles.kakaoButton}
      />

      <Pressable onPress={() => setAsCompany((v) => !v)} style={styles.companyToggle}>
        <Text style={styles.companyToggleText}>
          {asCompany ? "고객으로 로그인할게요" : "사장님이신가요? 업체 등록하기"}
        </Text>
      </Pressable>

      <Pressable onPress={() => setShowTestLogin((v) => !v)} style={styles.testToggle}>
        <Text style={styles.testToggleText}>테스트 계정으로 로그인</Text>
      </Pressable>

      {showTestLogin && (
        <View style={styles.testPanel}>
          <TextInput
            style={styles.testInput}
            value={testSecret}
            onChangeText={setTestSecret}
            placeholder="TEST_LOGIN_SECRET"
            placeholderTextColor={colors.textFaint}
            secureTextEntry
            autoCapitalize="none"
          />
          {TEST_ROLES.map(({ role, label }) => (
            <Pressable
              key={role}
              style={styles.testRoleButton}
              onPress={() => handleTestLogin(role)}
              disabled={testRoleLoading !== null}
            >
              <Text style={styles.testRoleButtonText}>
                {testRoleLoading === role ? "로그인 중..." : label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    backgroundColor: colors.bg,
  },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: "center",
  },
  consentBox: {
    marginTop: spacing.xxxl,
    width: "100%",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  consentItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  consentRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 },
  consentDivider: { height: 1, backgroundColor: colors.borderLight, marginTop: spacing.md },
  consentAllText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  consentText: { fontSize: fontSize.base, color: colors.text, flexShrink: 1 },
  required: { color: colors.accent },
  consentView: { fontSize: fontSize.xs, color: colors.textFaint, textDecorationLine: "underline" },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: colors.onPrimary, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  kakaoButton: { marginTop: spacing.lg, width: "100%" },
  companyToggle: { marginTop: spacing.lg, padding: spacing.xs },
  companyToggleText: {
    fontSize: fontSize.xs,
    color: colors.textFaint,
    textDecorationLine: "underline",
  },
  testToggle: { marginTop: spacing.xl, padding: spacing.xs },
  testToggleText: { fontSize: fontSize.xs, color: colors.textFaint },
  testPanel: { marginTop: spacing.sm, width: "100%", gap: spacing.sm },
  testInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  testRoleButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 1,
    alignItems: "center",
  },
  testRoleButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
});
