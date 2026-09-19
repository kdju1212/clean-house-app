import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { searchCompanies, type CompanyRow } from "../../src/api/companies";
import { fetchCategories, type Category } from "../../src/api/categories";
import { getSelectedRegion } from "../../src/storage/auth-storage";
import { Screen } from "../../src/components/Screen";
import { LoadingView } from "../../src/components/LoadingView";
import { EmptyState } from "../../src/components/EmptyState";
import { CategoryNavBar } from "../../src/components/CategoryNavBar";
import { CompanyListItem } from "../../src/components/CompanyListItem";
import { colors, fontSize, fontWeight, spacing } from "../../src/theme";

type Row = CompanyRow & { isAd?: boolean };

export default function CategoryCompaniesScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [regionName, setRegionName] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const region = await getSelectedRegion();
    if (!region) {
      router.replace("/region-select");
      return;
    }
    const [result, categoryList] = await Promise.all([
      searchCompanies({ slug, regionId: region.id }),
      fetchCategories(),
    ]);
    setCategoryName(result.category.name);
    setRegionName(result.region.name);
    setCategories(categoryList);
    setRows([
      ...result.adRows.map((r) => ({ ...r, isAd: true })),
      ...result.rows,
    ]);
  }, [slug]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  if (!rows || !categories) {
    return <LoadingView />;
  }

  return (
    <Screen>
      <Text style={styles.breadcrumb}>
        {regionName} &gt; {categoryName}
      </Text>
      <Text style={styles.title}>{categoryName} 업체</Text>

      <View style={styles.navBar}>
        <CategoryNavBar categories={categories} activeSlug={slug} />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item, index) => `${item.isAd ? "ad" : "row"}-${item.id}-${index}`}
        style={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <EmptyState text={`아직 ${regionName}에 등록된 ${categoryName} 업체가 없어요.`} />
        }
        renderItem={({ item }) => <CompanyListItem company={item} isAd={item.isAd} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  breadcrumb: { fontSize: fontSize.sm, color: colors.textFaint },
  title: { marginTop: spacing.xs, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  navBar: { marginTop: spacing.md },
  list: { marginTop: spacing.md },
});
