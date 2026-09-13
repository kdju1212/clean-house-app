import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { searchCompanies, type CompanyRow } from "../../src/api/companies";
import { getSelectedRegion } from "../../src/storage/auth-storage";

type Row = CompanyRow & { isAd?: boolean };

export default function CategoryCompaniesScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [regionName, setRegionName] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const region = await getSelectedRegion();
      if (!region) {
        router.replace("/region-select");
        return;
      }
      const result = await searchCompanies({ slug, regionId: region.id });
      if (cancelled) return;
      setCategoryName(result.category.name);
      setCategoryId(result.category.id);
      setRegionName(result.region.name);
      setRows([
        ...result.adRows.map((r) => ({ ...r, isAd: true })),
        ...result.rows,
      ]);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  function goToReserve(company: Row) {
    if (!categoryId) return;
    router.push({
      pathname: "/companies/[id]/reserve",
      params: {
        id: company.id,
        name: company.name,
        categoryId,
        price: String(company.price),
      },
    });
  }

  if (!rows) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.breadcrumb}>
        {regionName} &gt; {categoryName}
      </Text>
      <Text style={styles.title}>{categoryName} 업체</Text>

      {rows.length === 0 ? (
        <Text style={styles.empty}>
          아직 {regionName}에 등록된 {categoryName} 업체가 없어요.
        </Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, index) => `${item.isAd ? "ad" : "row"}-${item.id}-${index}`}
          style={styles.list}
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => goToReserve(item)}>
              {item.mainImageUrl ? (
                <Image source={{ uri: item.mainImageUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} />
              )}
              <View style={styles.cardBody}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  {item.isAd && <Text style={styles.adBadge}>광고</Text>}
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
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", paddingTop: 56, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  breadcrumb: { fontSize: 12, color: "#a3a3a3" },
  title: { marginTop: 4, fontSize: 18, fontWeight: "700" },
  empty: { marginTop: 40, textAlign: "center", fontSize: 13, color: "#a3a3a3" },
  list: { marginTop: 16 },
  card: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    padding: 12,
    marginBottom: 10,
  },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  thumbPlaceholder: { backgroundColor: "#f5f5f5" },
  cardBody: { flex: 1, justifyContent: "center" },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardName: { fontSize: 14, fontWeight: "600" },
  adBadge: {
    fontSize: 10,
    fontWeight: "600",
    color: "#a16207",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardIntro: { marginTop: 2, fontSize: 12, color: "#737373" },
  cardMeta: { marginTop: 4, fontSize: 12, color: "#525252" },
});
