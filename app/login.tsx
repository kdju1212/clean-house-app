import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { login as kakaoLogin } from "@react-native-seoul/kakao-login";
import { loginWithKakao } from "../src/api/auth";

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
      await loginWithKakao(accessToken);
      router.replace("/home");
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

      <Pressable
        style={[styles.kakaoButton, loading && styles.disabled]}
        onPress={handleKakaoLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000000" />
        ) : (
          <Text style={styles.kakaoButtonText}>카카오로 로그인</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#737373",
    textAlign: "center",
  },
  kakaoButton: {
    marginTop: 40,
    width: "100%",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#FEE500",
  },
  disabled: {
    opacity: 0.6,
  },
  kakaoButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000000",
  },
});
