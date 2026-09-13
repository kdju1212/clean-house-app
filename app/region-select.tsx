import { useEffect, useState } from "react";
import { Pressable, SectionList, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import { fetchRegionTree, type RegionLeaf, type RegionTreeResponse } from "../src/api/regions";
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

/**
 * The app has no REGION_COOKIE like the web does — the customer's pick here
 * is saved locally (see saveSelectedRegion) and sent explicitly as
 * `regionId` on every search/reservation request instead of being read
 * server-side from a cookie.
 */
export default function RegionSelectScreen() {
  const [sections, setSections] = useState<Section[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRegionTree().then((tree) => setSections(toSections(tree)));
  }, []);

  async function handleSelect(region: RegionLeaf) {
    setSaving(true);
    await saveSelectedRegion(region);
    router.replace("/categories");
  }

  if (!sections) {
    return <LoadingView />;
  }

  return (
    <Screen>
      <Text style={styles.title}>지역 선택</Text>
      <Text style={styles.subtitle}>동네를 선택하면 해당 지역 업체를 보여드려요</Text>

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
        style={styles.list}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  subtitle: { marginTop: spacing.xs, fontSize: fontSize.base, color: colors.textMuted },
  list: { marginTop: spacing.lg },
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
