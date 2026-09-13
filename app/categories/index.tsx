import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { fetchCategories, type Category } from "../../src/api/categories";
import { getSelectedRegion, type StoredRegion } from "../../src/storage/auth-storage";
import { logout } from "../../src/api/auth";

const EMOJI_BY_SLUG: Record<string, string> = {
  "move-in": "🏠",
  moving: "📦",
  residential: "🧹",
  office: "🏢",
  restaurant: "🍽️",
  store: "🏬",
  aircon: "❄️",
  washer: "🧺",
  etc: "✨",
};

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [region, setRegion] = useState<StoredRegion | null>(null);

  // useFocusEffect (not useEffect) so coming back from /region-select with a
  // newly saved region refreshes this screen's header instead of showing
  // whatever region was selected when the screen first mounted.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getSelectedRegion().then((r) => {
        if (cancelled) return;
        if (!r) {
          router.replace("/region-select");
          return;
        }
        setRegion(r);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (categories) return;
      fetchCategories().then(setCategories);
    }, [categories])
  );

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  if (!region || !categories) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>어떤 청소가 필요하세요?</Text>
          <Pressable onPress={() => router.push("/region-select")}>
            <Text style={styles.regionLink}>{region.name} · 지역 변경</Text>
          </Pressable>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => router.push("/reservations")}>
            <Text style={styles.myReservations}>내 예약</Text>
          </Pressable>
          <Pressable onPress={handleLogout}>
            <Text style={styles.logout}>로그아웃</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.grid}>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            style={styles.card}
            onPress={() => router.push(`/categories/${c.slug}`)}
          >
            <Text style={styles.emoji}>{EMOJI_BY_SLUG[c.slug] ?? "🧽"}</Text>
            <Text style={styles.cardText}>{c.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", paddingTop: 56, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  title: { fontSize: 18, fontWeight: "700" },
  regionLink: { marginTop: 6, fontSize: 13, color: "#525252", textDecorationLine: "underline" },
  headerActions: { alignItems: "flex-end", gap: 8 },
  myReservations: { fontSize: 12, fontWeight: "600", color: "#171717" },
  logout: { fontSize: 12, color: "#a3a3a3" },
  grid: {
    marginTop: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emoji: { fontSize: 24 },
  cardText: { fontSize: 13, fontWeight: "500" },
});
