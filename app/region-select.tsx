import { useEffect, useMemo, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as Location from "expo-location";
import {
  fetchRegionByCoords,
  fetchRegionTree,
  type RegionLeaf,
  type RegionTreeResponse,
} from "../src/api/regions";
import { saveSelectedRegion } from "../src/storage/auth-storage";
import { Screen } from "../src/components/Screen";
import { LoadingView } from "../src/components/LoadingView";
import { colors, fontSize, fontWeight, radius, spacing } from "../src/theme";

type Section = { title: string; data: RegionLeaf[] };

function toSections(tree: RegionTreeResponse): Section[] {
  const sections: Section[] = [];
  for (const sido of tree.sido) {
    for (const sigungu of sido.children) {
      sections.push({ title: `${sido.name} ${sigungu.name}`, data: sigungu.children });
    }
  }
  if (tree.legacyRegions.length > 0) {
    sections.push({ title: "기타", data: tree.legacyRegions });
  }
  return sections;
}

const normalize = (text: string) => text.trim().replace(/\s+/g, "");

/**
 * Full 시/도 시/군/구 동 path per leaf, for matching *and* for labelling
 * search hits (a bare "청운동" is ambiguous nationwide — plenty of dong
 * share a name across different cities) without changing what actually
 * gets saved, which stays the plain dong name (see handleSelect).
 */
function toSearchIndex(tree: RegionTreeResponse): { region: RegionLeaf; path: string }[] {
  const index: { region: RegionLeaf; path: string }[] = [];
  for (const sido of tree.sido) {
    for (const sigungu of sido.children) {
      for (const dong of sigungu.children) {
        index.push({ region: dong, path: `${sido.name} ${sigungu.name} ${dong.name}` });
      }
    }
  }
  for (const region of tree.legacyRegions) {
    index.push({ region, path: region.name });
  }
  return index;
}

/**
 * The app has no REGION_COOKIE like the web does — the customer's pick here
 * is saved locally (see saveSelectedRegion) and sent explicitly as
 * `regionId` on every search/reservation request instead of being read
 * server-side from a cookie.
 */
export default function RegionSelectScreen() {
  const [tree, setTree] = useState<RegionTreeResponse | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    fetchRegionTree().then(setTree);
  }, []);

  const searchIndex = useMemo(() => (tree ? toSearchIndex(tree) : []), [tree]);
  const normalizedQuery = normalize(query);

  const sections: Section[] | null = useMemo(() => {
    if (!tree) return null;
    if (!normalizedQuery) return toSections(tree);
    const matches = searchIndex
      .filter((entry) => normalize(entry.path).includes(normalizedQuery))
      .map((entry) => ({ ...entry.region, name: entry.path }));
    return matches.length > 0 ? [{ title: `검색 결과 ${matches.length}건`, data: matches }] : [];
  }, [tree, normalizedQuery, searchIndex]);

  async function handleSelect(region: RegionLeaf) {
    setSaving(true);
    // Search results carry the full path as `name` for display — save the
    // plain leaf name instead, matching what the rest of the app expects.
    const leafName = region.name.split(" ").pop() ?? region.name;
    await saveSelectedRegion({ id: region.id, name: leafName });
    router.replace("/categories");
  }

  async function handleLocate() {
    setLocateError(null);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocateError("위치 권한을 허용해주세요.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const region = await fetchRegionByCoords(position.coords.latitude, position.coords.longitude);
      await handleSelect(region);
    } catch (err) {
      setLocateError(err instanceof Error ? err.message : "위치로 지역을 찾지 못했어요.");
    } finally {
      setLocating(false);
    }
  }

  if (!sections) {
    return <LoadingView />;
  }

  return (
    <Screen>
      <Text style={styles.title}>지역 선택</Text>
      <Text style={styles.subtitle}>동네를 선택하면 해당 지역 업체를 보여드려요</Text>

      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, styles.searchInputFlex]}
          value={query}
          onChangeText={setQuery}
          placeholder="동네 이름으로 검색 (예: 영통동)"
          placeholderTextColor={colors.textFaint}
          autoCorrect={false}
          autoCapitalize="none"
        />
        <Pressable style={styles.locateButton} onPress={handleLocate} disabled={locating}>
          <Text style={styles.locateButtonText}>{locating ? "찾는 중..." : "내 위치로 찾기"}</Text>
        </Pressable>
      </View>
      {locateError && <Text style={styles.errorText}>{locateError}</Text>}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <Pressable style={styles.item} onPress={() => handleSelect(item)} disabled={saving}>
            <Text style={styles.itemText}>{item.name}</Text>
          </Pressable>
        )}
        ListEmptyComponent={
          normalizedQuery ? <Text style={styles.emptyText}>검색 결과가 없어요.</Text> : null
        }
        keyboardShouldPersistTaps="handled"
        style={styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  subtitle: { marginTop: spacing.xs, fontSize: fontSize.base, color: colors.textMuted },
  searchRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  searchInput: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md + 2,
    fontSize: fontSize.base,
    color: colors.text,
  },
  searchInputFlex: { flex: 1 },
  locateButton: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  locateButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text },
  errorText: { marginTop: spacing.xs, fontSize: fontSize.sm, color: "#dc2626" },
  list: { marginTop: spacing.lg },
  emptyText: {
    marginTop: spacing.lg,
    fontSize: fontSize.base,
    color: colors.textMuted,
    textAlign: "center",
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.xs + 2,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.textFaint,
  },
  item: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    marginBottom: spacing.sm,
  },
  itemText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
});
