import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { getStoredUser, type StoredUser } from "../src/storage/auth-storage";
import { logout } from "../src/api/auth";

/**
 * Placeholder landing screen right after login — proves the auth round trip
 * end to end (Kakao SDK -> /api/mobile/auth/kakao -> stored session). Region
 * selection and the company search list are the next screens to build on
 * top of this same session.
 */
export default function HomeScreen() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoredUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>환영합니다{user?.name ? `, ${user.name}님` : ""}!</Text>
      <Text style={styles.subtitle}>로그인이 정상적으로 연결됐어요.</Text>

      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>로그아웃</Text>
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
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#737373",
  },
  logoutButton: {
    marginTop: 32,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: "#d4d4d4",
  },
  logoutButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#404040",
  },
});
