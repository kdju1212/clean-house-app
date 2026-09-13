import { useCallback, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { getInfoAsync } from "expo-file-system";
import {
  fetchCompanyMe,
  updateCompanyProfile,
  saveService,
  deleteCompanyService,
  setCompanyRegions,
  uploadCompanyPhoto,
  deleteCompanyPhoto,
  type CompanyMe,
} from "../../src/api/company";
import { fetchCategories, type Category } from "../../src/api/categories";
import { fetchRegionTree, type RegionSido, type RegionLeaf } from "../../src/api/regions";
import { Screen } from "../../src/components/Screen";
import { LoadingView } from "../../src/components/LoadingView";
import { Button } from "../../src/components/Button";
import { TextField } from "../../src/components/TextField";
import { colors, fontSize, fontWeight, radius, spacing } from "../../src/theme";

const PHOTO_TYPE_LABEL: Record<string, string> = {
  MAIN: "대표",
  WORK: "작업사진",
  BEFORE_AFTER: "전/후 비교",
};

export default function CompanyProfileScreen() {
  const [data, setData] = useState<CompanyMe | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [sidoTree, setSidoTree] = useState<RegionSido[] | null>(null);
  const [legacyRegions, setLegacyRegions] = useState<RegionLeaf[] | null>(null);

  const load = useCallback(() => {
    fetchCompanyMe().then(setData);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      if (!categories) fetchCategories().then(setCategories);
      if (!sidoTree) {
        fetchRegionTree().then((tree) => {
          setSidoTree(tree.sido);
          setLegacyRegions(tree.legacyRegions);
        });
      }
    }, [load, categories, sidoTree])
  );

  if (!data || !categories || !sidoTree || !legacyRegions) {
    return <LoadingView />;
  }

  return (
    <Screen scroll>
      <Text style={styles.title}>업체 프로필 관리</Text>

      <ProfileSection company={data.company} onSaved={load} />
      <ServicesSection services={data.services} categories={categories} onChanged={load} />
      <RegionsSection
        sidoTree={sidoTree}
        legacyRegions={legacyRegions}
        selectedIds={data.regionIds}
        onSaved={load}
      />
      <PhotosSection photos={data.photos} mainImageUrl={data.company.mainImageUrl} onChanged={load} />
    </Screen>
  );
}

function ProfileSection({
  company,
  onSaved,
}: {
  company: CompanyMe["company"];
  onSaved: () => void;
}) {
  const [name, setName] = useState(company.name);
  const [phone, setPhone] = useState(company.phone ?? "");
  const [introText, setIntroText] = useState(company.introText ?? "");
  const [businessHours, setBusinessHours] = useState(company.businessHours ?? "");
  const [isAvailable, setIsAvailable] = useState(company.isAvailable);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateCompanyProfile({ name, phone, introText, businessHours, isAvailable });
      onSaved();
      Alert.alert("저장 완료", "기본 정보가 저장됐어요.");
    } catch (err) {
      Alert.alert("저장 실패", err instanceof Error ? err.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="기본 정보">
      <TextField label="업체명" value={name} onChangeText={setName} />
      <TextField label="연락처" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label="업체 소개" value={introText} onChangeText={setIntroText} multiline />
      <TextField
        label="영업시간"
        value={businessHours}
        onChangeText={setBusinessHours}
        placeholder="예: 09:00-18:00"
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>예약 받기</Text>
        <Switch value={isAvailable} onValueChange={setIsAvailable} />
      </View>

      <Button title="저장" onPress={handleSave} loading={saving} style={styles.saveButton} />
    </Section>
  );
}

function ServicesSection({
  services,
  categories,
  onChanged,
}: {
  services: CompanyMe["services"];
  categories: Category[];
  onChanged: () => void;
}) {
  const usedCategoryIds = new Set(services.map((s) => s.categoryId));
  const availableCategories = categories.filter((c) => !usedCategoryIds.has(c.id));

  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!categoryId) {
      Alert.alert("알림", "청소 종류를 선택해주세요.");
      return;
    }
    setSaving(true);
    try {
      await saveService({ categoryId, price: Number(price), description });
      setCategoryId(null);
      setPrice("");
      setDescription("");
      onChanged();
    } catch (err) {
      Alert.alert("저장 실패", err instanceof Error ? err.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteCompanyService(id);
    onChanged();
  }

  return (
    <Section title="서비스 · 가격">
      {services.map((s) => (
        <View key={s.id} style={styles.listRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.listRowTitle}>{s.categoryName}</Text>
            <Text style={styles.listRowMeta}>
              {s.price.toLocaleString()}원{s.description ? ` · ${s.description}` : ""}
            </Text>
          </View>
          <Pressable onPress={() => handleDelete(s.id)}>
            <Text style={styles.deleteLink}>삭제</Text>
          </Pressable>
        </View>
      ))}

      {availableCategories.length > 0 && (
        <View style={styles.addForm}>
          <View style={styles.chipRow}>
            {availableCategories.map((c) => (
              <Pressable
                key={c.id}
                style={[styles.chip, categoryId === c.id && styles.chipActive]}
                onPress={() => setCategoryId(c.id)}
              >
                <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextField
            value={price}
            onChangeText={setPrice}
            placeholder="가격 (원)"
            keyboardType="number-pad"
          />
          <TextField value={description} onChangeText={setDescription} placeholder="설명 (선택)" />
          <Button title="서비스 추가" onPress={handleAdd} loading={saving} style={styles.saveButton} />
        </View>
      )}
    </Section>
  );
}

function RegionsSection({
  sidoTree,
  legacyRegions,
  selectedIds,
  onSaved,
}: {
  sidoTree: RegionSido[];
  legacyRegions: RegionLeaf[];
  selectedIds: string[];
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(selectedIds));
  const [saving, setSaving] = useState(false);

  function toggleLeaf(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleGroup(childIds: string[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of childIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await setCompanyRegions([...selected]);
      onSaved();
      Alert.alert("저장 완료", "서비스 지역이 저장됐어요.");
    } catch (err) {
      Alert.alert("저장 실패", err instanceof Error ? err.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section title="서비스 지역">
      <Text style={styles.helperText}>
        차량으로 이동 가능한 지역을 모두 선택해주세요. 구 전체를 선택하면 소속된 동 전체가 포함돼요.
      </Text>

      {sidoTree.map((sido) =>
        sido.children.map((sigungu) => {
          const childIds = sigungu.children.map((c) => c.id);
          const checkedCount = childIds.filter((id) => selected.has(id)).length;
          const allChecked = childIds.length > 0 && checkedCount === childIds.length;
          const someChecked = !allChecked && checkedCount > 0;

          return (
            <View key={sigungu.id} style={styles.regionGroup}>
              <Pressable
                style={styles.regionGroupHeader}
                onPress={() => toggleGroup(childIds, !allChecked)}
              >
                <Text style={styles.regionGroupTitle}>
                  {sido.name} {sigungu.name}
                  {allChecked ? " (전체)" : someChecked ? " (일부 지역)" : ""}
                </Text>
              </Pressable>
              <View style={styles.chipRow}>
                {sigungu.children.map((dong) => (
                  <Pressable
                    key={dong.id}
                    style={[styles.chip, selected.has(dong.id) && styles.chipActive]}
                    onPress={() => toggleLeaf(dong.id)}
                  >
                    <Text style={[styles.chipText, selected.has(dong.id) && styles.chipTextActive]}>
                      {dong.name}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })
      )}

      {legacyRegions.length > 0 && (
        <View style={styles.regionGroup}>
          <Text style={styles.regionGroupTitle}>기타</Text>
          <View style={styles.chipRow}>
            {legacyRegions.map((r) => (
              <Pressable
                key={r.id}
                style={[styles.chip, selected.has(r.id) && styles.chipActive]}
                onPress={() => toggleLeaf(r.id)}
              >
                <Text style={[styles.chipText, selected.has(r.id) && styles.chipTextActive]}>
                  {r.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Button title="저장" onPress={handleSave} loading={saving} style={styles.saveButton} />
    </Section>
  );
}

function PhotosSection({
  photos,
  mainImageUrl,
  onChanged,
}: {
  photos: CompanyMe["photos"];
  mainImageUrl: string | null;
  onChanged: () => void;
}) {
  const [photoType, setPhotoType] = useState<"MAIN" | "WORK" | "BEFORE_AFTER">("WORK");
  const [uploading, setUploading] = useState(false);

  async function handlePick() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("권한 필요", "사진을 업로드하려면 앨범 접근 권한이 필요해요.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const asset = result.assets[0];
      const info = await getInfoAsync(asset.uri);
      const size = info.exists ? (info as { size: number }).size : 0;
      await uploadCompanyPhoto(
        { uri: asset.uri, name: "photo.jpg", type: "image/jpeg", size },
        photoType
      );
      onChanged();
    } catch (err) {
      Alert.alert("업로드 실패", err instanceof Error ? err.message : "사진 업로드에 실패했어요.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteCompanyPhoto(id);
    onChanged();
  }

  return (
    <Section title="사진">
      <View style={styles.photoGrid}>
        {photos.map((photo) => (
          <View key={photo.id} style={styles.photoCell}>
            <Image source={{ uri: photo.url }} style={styles.photoImage} />
            {mainImageUrl === photo.url && (
              <View style={styles.mainBadge}>
                <Text style={styles.mainBadgeText}>★ 대표</Text>
              </View>
            )}
            <Text style={styles.photoTypeLabel}>{PHOTO_TYPE_LABEL[photo.type]}</Text>
            <Pressable onPress={() => handleDelete(photo.id)}>
              <Text style={styles.deleteLink}>삭제</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.chipRow}>
        {(["MAIN", "WORK", "BEFORE_AFTER"] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.chip, photoType === t && styles.chipActive]}
            onPress={() => setPhotoType(t)}
          >
            <Text style={[styles.chipText, photoType === t && styles.chipTextActive]}>
              {PHOTO_TYPE_LABEL[t]}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.helperText}>
        대표: 목록에 보이는 사진 · 작업사진: 상세페이지 하단 · 전/후 비교: 별도 섹션
      </Text>

      <Button title="사진 추가" onPress={handlePick} loading={uploading} style={styles.saveButton} />
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  section: {
    marginTop: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
  switchRow: {
    marginTop: spacing.md + 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  switchLabel: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  saveButton: { marginTop: spacing.lg },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
    marginTop: spacing.sm,
  },
  listRowTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  listRowMeta: { marginTop: 2, fontSize: fontSize.sm, color: colors.textMuted },
  deleteLink: { fontSize: fontSize.sm, color: colors.textFaint, textDecorationLine: "underline" },
  addForm: { marginTop: spacing.md + 2, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.md + 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs + 2, marginTop: spacing.xs + 2 },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: "#404040" },
  chipTextActive: { color: colors.onPrimary },
  helperText: { marginTop: spacing.xs + 2, fontSize: fontSize.xs, color: colors.textFaint },
  regionGroup: { marginTop: spacing.md },
  regionGroupHeader: { paddingVertical: spacing.xs },
  regionGroupTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm + 2 },
  photoCell: { width: 90 },
  photoImage: { width: 90, height: 90, borderRadius: radius.md },
  mainBadge: {
    position: "absolute",
    left: 4,
    top: 4,
    backgroundColor: "rgba(23,23,23,0.8)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
  },
  mainBadgeText: { color: colors.onPrimary, fontSize: 9, fontWeight: fontWeight.semibold },
  photoTypeLabel: { marginTop: spacing.xs, fontSize: 10, textAlign: "center", color: colors.textMuted },
});
