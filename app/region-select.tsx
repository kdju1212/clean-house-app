import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { fetchRegionTree, type RegionLeaf, type RegionTreeResponse } from "../src/api/regions";
import { saveSelectedRegion } from "../src/storage/auth-storage";

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
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>지역 선택</Text>
      <Text style={styles.subtitle}>동네를 선택하면 해당 지역 업체를 보여드려요</Text>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            style={styles.item}
            onPress={() => handleSelect(item)}
            disabled={saving}
          >
            <Text style={styles.itemText}>{item.name}</Text>
          </Pressable>
        )}
        style={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", paddingTop: 56, paddingHorizontal: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700" },
  subtitle: { marginTop: 4, fontSize: 13, color: "#737373" },
  list: { marginTop: 16 },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: "600",
    color: "#a3a3a3",
  },
  item: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  itemText: { fontSize: 14, fontWeight: "500" },
});
