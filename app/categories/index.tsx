import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { fetchCategories, type Category } from "../../src/api/categories";
import { searchAllCompanies, type CompanyRow } from "../../src/api/companies";
import { getSelectedRegion, type StoredRegion } from "../../src/storage/auth-storage";
import { logout } from "../../src/api/auth";
import { Screen } from "../../src/components/Screen";
import { LoadingView } from "../../src/components/LoadingView";
import { EmptyState } from "../../src/components/EmptyState";
import { CategoryNavBar } from "../../src/components/CategoryNavBar";
import { CompanyListItem } from "../../src/components/CompanyListItem";
import { colors, fontSize, fontWeight, spacing } from "../../src/theme";

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [region, setRegion] = useState<StoredRegion | null>(null);
  const [rows, setRows] = useState<CompanyRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const r = await getSelectedRegion();
    if (!r) {
      router.replace("/region-select");
      return;
    }
    setRegion(r);
    const result = await searchAllCompanies({ regionId: r.id });
    setRows(result.rows);
  }, []);

  // useFocusEffect (not useEffect) so coming back from /region-select with a
  // newly saved region refreshes this screen instead of showing whatever
  // region was selected when the screen first mounted.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  if (!region || !categories || !rows) {
    return <LoadingView />;
  }

  return (
    <Screen>
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
          <Pressable onPress={() => router.push("/mypage")}>
            <Text style={styles.myReservations}>마이페이지</Text>
          </Pressable>
          <Pressable onPress={handleLogout}>
            <Text style={styles.logout}>로그아웃</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.navBar}>
        <CategoryNavBar categories={categories} activeSlug={null} />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        style={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={<EmptyState text={`아직 ${region.name}에 등록된 업체가 없어요.`} />}
        renderItem={({ item }) => <CompanyListItem company={item} />}
      />
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
  navBar: { marginTop: spacing.lg },
  list: { marginTop: spacing.md },
});
