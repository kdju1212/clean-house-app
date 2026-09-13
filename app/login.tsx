import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { login as kakaoLogin } from "@react-native-seoul/kakao-login";
import { loginWithKakao } from "../src/api/auth";
import { Button } from "../src/components/Button";
import { colors, fontSize, fontWeight, spacing } from "../src/theme";

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  async function handleKakaoLogin() {
    setLoading(true);
    try {
      // Native Kakao SDK login — requires a real Kakao native app key (see
      // app.json's kakaoAppKey placeholder + README) and a development
      // build; this call throws in plain Expo Go since the SDK is a custom
      // native module.
      const { accessToken } = await kakaoLogin();
      const user = await loginWithKakao(accessToken);
      router.replace(user.role === "COMPANY" ? "/company" : "/region-select");
    } catch (err) {
      Alert.alert(
        "로그인 실패",
        err instanceof Error ? err.message : "카카오 로그인에 실패했어요."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>우리동네 청소업체</Text>
      <Text style={styles.subtitle}>지역 청소업체를 찾고 바로 예약해보세요</Text>

      <Button
        title="카카오로 로그인"
        onPress={handleKakaoLogin}
        loading={loading}
        variant="kakao"
        style={styles.kakaoButton}
      />
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
  kakaoButton: { marginTop: spacing.xxxl + spacing.sm, width: "100%" },
});
