import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { fetchCategories, type Category } from "../../src/api/categories";
import { getSelectedRegion, type StoredRegion } from "../../src/storage/auth-storage";
import { logout } from "../../src/api/auth";
import { Screen } from "../../src/components/Screen";
import { LoadingView } from "../../src/components/LoadingView";
import { colors, fontSize, fontWeight, radius, spacing } from "../../src/theme";

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

  const [refreshing, setRefreshing] = useState(false);
  const loadCategories = useCallback(() => fetchCategories().then(setCategories), []);

  useFocusEffect(
    useCallback(() => {
      if (categories) return;
      loadCategories();
    }, [categories, loadCategories])
  );

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadCategories();
    } finally {
      setRefreshing(false);
    }
  }

  if (!region || !categories) {
    return <LoadingView />;
  }

  return (
    <Screen scroll refreshing={refreshing} onRefresh={handleRefresh}>
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  regionLink: {
    marginTop: spacing.xs + 2,
    fontSize: fontSize.base,
    color: "#525252",
    textDecorationLine: "underline",
  },
  headerActions: { alignItems: "flex-end", gap: spacing.sm },
  myReservations: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
  logout: { fontSize: fontSize.sm, color: colors.textFaint },
  grid: {
    marginTop: spacing.xl,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  card: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  emoji: { fontSize: 24 },
  cardText: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
});
