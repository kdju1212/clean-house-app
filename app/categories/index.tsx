import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { fetchCategories, type Category } from "../../src/api/categories";
import { searchAllCompanies, searchCompanies, type CompanyRow } from "../../src/api/companies";
import { getSelectedRegion, type StoredRegion } from "../../src/storage/auth-storage";
import { logout } from "../../src/api/auth";
import { Screen } from "../../src/components/Screen";
import { LoadingView } from "../../src/components/LoadingView";
import { EmptyState } from "../../src/components/EmptyState";
import { CategoryNavBar } from "../../src/components/CategoryNavBar";
import { CompanyListItem } from "../../src/components/CompanyListItem";
import { colors, fontSize, fontWeight, spacing } from "../../src/theme";

type Row = CompanyRow & { isAd?: boolean };

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [region, setRegion] = useState<StoredRegion | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const requestIdRef = useRef(0);

  // Tapping a category pill is a plain state change (activeSlug), never a
  // navigation — switching tabs used to router.replace() to a different
  // route, which remounted the screen and showed a full loading spinner on
  // every tap; this way the header/nav bar never disappear and only the
  // list itself refetches, which is what actually makes it feel instant.
  const loadRows = useCallback(async (regionId: string, slug: string | null) => {
    const requestId = ++requestIdRef.current;

    if (slug === null) {
      const result = await searchAllCompanies({ regionId });
      if (requestIdRef.current !== requestId) return; // a newer tap already superseded this one
      setActiveCategoryName(null);
      setRows(result.rows);
    } else {
      const result = await searchCompanies({ slug, regionId });
      if (requestIdRef.current !== requestId) return;
      setActiveCategoryName(result.category.name);
      setRows([...result.adRows.map((r) => ({ ...r, isAd: true })), ...result.rows]);
    }
  }, []);

  // useFocusEffect (not useEffect) so coming back from /region-select with a
  // newly saved region refreshes this screen instead of showing whatever
  // region was selected when the screen first mounted.
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

  const loadCategories = useCallback(() => fetchCategories().then(setCategories), []);

  useFocusEffect(
    useCallback(() => {
      if (categories) return;
      loadCategories();
    }, [categories, loadCategories])
  );

  useEffect(() => {
    if (!region) return;
    // Deliberately doesn't clear rows first — keeping the previous tab's
    // list visible until the new one arrives (fetches are quick) avoids a
    // flash of the inline spinner on every tap, which is what made
    // switching feel instant instead of a reload.
    loadRows(region.id, activeSlug);
  }, [region, activeSlug, loadRows]);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  async function handleRefresh() {
    if (!region) return;
    setRefreshing(true);
    try {
      await loadRows(region.id, activeSlug);
    } finally {
      setRefreshing(false);
    }
  }

  if (!region || !categories) {
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
        <CategoryNavBar categories={categories} activeSlug={activeSlug} onSelect={setActiveSlug} />
      </View>

      {rows === null ? (
        <ActivityIndicator style={styles.inlineLoading} color={colors.text} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) => `${item.isAd ? "ad" : "row"}-${item.id}-${index}`}
          style={styles.list}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            <EmptyState
              text={`아직 ${region.name}에 등록된 ${activeCategoryName ? `${activeCategoryName} ` : ""}업체가 없어요.`}
            />
          }
          renderItem={({ item }) => <CompanyListItem company={item} isAd={item.isAd} />}
        />
      )}
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
  inlineLoading: { marginTop: spacing.xxl },
});
