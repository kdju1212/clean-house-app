import { useCallback, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { searchCompanies, type CompanyRow } from "../../src/api/companies";
import { getSelectedRegion } from "../../src/storage/auth-storage";
import { Screen } from "../../src/components/Screen";
import { LoadingView } from "../../src/components/LoadingView";
import { EmptyState } from "../../src/components/EmptyState";
import { Badge } from "../../src/components/Badge";
import { colors, fontSize, fontWeight, radius, spacing } from "../../src/theme";

type Row = CompanyRow & { isAd?: boolean };

export default function CategoryCompaniesScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [regionName, setRegionName] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const region = await getSelectedRegion();
    if (!region) {
      router.replace("/region-select");
      return;
    }
    const result = await searchCompanies({ slug, regionId: region.id });
    setCategoryName(result.category.name);
    setRegionName(result.region.name);
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

  function goToDetail(company: Row) {
    router.push({ pathname: "/companies/[id]", params: { id: company.id } });
  }

  if (!rows) {
    return <LoadingView />;
  }

  return (
    <Screen>
      <Text style={styles.breadcrumb}>
        {regionName} &gt; {categoryName}
      </Text>
      <Text style={styles.title}>{categoryName} 업체</Text>

      <FlatList
        data={rows}
        keyExtractor={(item, index) => `${item.isAd ? "ad" : "row"}-${item.id}-${index}`}
        style={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <EmptyState text={`아직 ${regionName}에 등록된 ${categoryName} 업체가 없어요.`} />
        }
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => goToDetail(item)}>
            {item.mainImageUrl ? (
              <Image source={{ uri: item.mainImageUrl }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, styles.thumbPlaceholder]} />
            )}
            <View style={styles.cardBody}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{item.name}</Text>
                {item.isAd && <Badge label="광고" tone="warning" />}
              </View>
              <Text style={styles.cardIntro} numberOfLines={1}>
                {item.introText ?? ""}
              </Text>
              <Text style={styles.cardMeta}>
                {item.price.toLocaleString()}원
                {item.reviewCount > 0
                  ? ` · ★ ${item.rating.toFixed(1)} (${item.reviewCount})`
                  : " · 리뷰 없음"}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  breadcrumb: { fontSize: fontSize.sm, color: colors.textFaint },
  title: { marginTop: spacing.xs, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  list: { marginTop: spacing.lg },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  thumbPlaceholder: { backgroundColor: colors.surfaceMuted },
  cardBody: { flex: 1, justifyContent: "center" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm - 2 },
  cardName: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.text },
  cardIntro: { marginTop: 2, fontSize: fontSize.sm, color: colors.textMuted },
  cardMeta: { marginTop: spacing.xs, fontSize: fontSize.sm, color: "#525252" },
});
