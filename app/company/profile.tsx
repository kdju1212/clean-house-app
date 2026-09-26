import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import {
  fetchCompanyMe,
  updateCompanyProfile,
  saveService,
  deleteCompanyService,
  setCompanyRegions,
  uploadCompanyPhoto,
  deleteCompanyPhoto,
  updateCompanyPhotoCaption,
  updateDetailPageMode,
  type CompanyMe,
  type CompanyPhoto,
  type DetailPageMode,
} from "../../src/api/company";
import { logout } from "../../src/api/auth";
import { fetchCategories, type Category } from "../../src/api/categories";
import { searchRegionGroups, type RegionGroupHit } from "../../src/api/regions";
import {
  getPricingQuantityKey,
  getReservationQuestions,
  PRICING_UNIT_LABEL,
} from "../../src/utils/reservation-questions";
import { Screen } from "../../src/components/Screen";
import { LoadingView } from "../../src/components/LoadingView";
import { Button } from "../../src/components/Button";
import { TextField } from "../../src/components/TextField";
import { PhotoStack } from "../../src/components/PhotoStack";
import { formatPhoneNumber } from "../../src/utils/phone";
import { colors, fontSize, fontWeight, radius, spacing } from "../../src/theme";

export default function CompanyProfileScreen() {
  const [data, setData] = useState<CompanyMe | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // "기본 정보" (이름/연락처/소개글/영업시간/예약가능/홈페이지) is the one
  // section here still gated behind its own "저장" button — everything
  // else (사진, 상세페이지 모드, 설명글) already saves immediately. Tracked
  // here, not inside InfoSection, so 로그아웃 can check it before wiping
  // out whatever's half-typed there.
  const [infoDirty, setInfoDirty] = useState(false);
  const infoSectionRef = useRef<InfoSectionHandle>(null);

  const load = useCallback(() => {
    return fetchCompanyMe().then(setData);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      if (!categories) fetchCategories().then(setCategories);
    }, [load, categories])
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function doLogout() {
    await logout();
    router.replace("/login");
  }

  function handleLogout() {
    if (!infoDirty) {
      doLogout();
      return;
    }
    Alert.alert("변경된 사항이 있어요", "저장하지 않고 나가면 수정한 내용이 사라져요.", [
      { text: "취소", style: "cancel" },
      {
        text: "저장하고 나가기",
        onPress: async () => {
          if (await infoSectionRef.current?.save()) doLogout();
        },
      },
      { text: "저장하지 않고 나가기", style: "destructive", onPress: doLogout },
    ]);
  }

  if (!data || !categories) {
    return <LoadingView />;
  }

  const workPhotos = data.photos.filter((p) => p.type === "WORK");
  const templatePhotos = data.photos.filter((p) => p.type === "TEMPLATE");

  return (
    <Screen scroll refreshing={refreshing} onRefresh={handleRefresh}>
      <Text style={styles.title}>업체 프로필 관리</Text>
      <Text style={styles.subtitle}>
        실제 상세페이지와 똑같은 모습이에요. 사진은 탭해서 바로 등록/변경할 수 있어요.
      </Text>

      <MainPhotoSlot
        mainImageUrl={data.company.mainImageUrl}
        companyName={data.company.name}
        onChanged={load}
      />

      <ProfileHeaderSection
        company={data.company}
        averageRating={data.averageRating}
        reviewCount={data.reviewCount}
      />

      <ServicesSection services={data.services} categories={categories} onChanged={load} />

      <DetailPageSection
        workPhotos={workPhotos}
        templatePhotos={templatePhotos}
        services={data.services}
        detailPageMode={data.company.detailPageMode}
        onChanged={load}
      />

      <RegionsSection
        legacyRegions={data.legacyRegions}
        selectedRegions={data.selectedRegions}
        onSaved={load}
      />

      <InfoSection
        ref={infoSectionRef}
        company={data.company}
        onSaved={load}
        onDirtyChange={setInfoDirty}
      />

      <Pressable onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logout}>로그아웃</Text>
      </Pressable>
    </Screen>
  );
}

/** Falls back to Image.getSize when the picker doesn't hand back dimensions
 * itself (its own docs note width/height "can be 0 if the system did not
 * provide" them). */
function getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error instanceof Error ? error : new Error(String(error)))
    );
  });
}

function useCompanyPhotoUpload(
  type: CompanyPhoto["type"],
  categoryId: string | null,
  onChanged: () => void,
  options?: { requireSquare?: boolean }
) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("사진을 업로드하려면 앨범 접근 권한이 필요해요.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];

    if (options?.requireSquare) {
      try {
        const { width, height } =
          asset.width && asset.height
            ? { width: asset.width, height: asset.height }
            : await getImageDimensions(asset.uri);
        if (width !== height) {
          setError("대표사진은 1:1(정사각형) 비율의 이미지만 등록할 수 있어요.");
          return;
        }
      } catch {
        setError("이미지를 불러올 수 없어요. 다른 사진으로 다시 시도해주세요.");
        return;
      }
    }

    setUploading(true);
    try {
      const size = new File(asset.uri).size;
      await uploadCompanyPhoto(
        { uri: asset.uri, name: "photo.jpg", type: "image/jpeg", size },
        type,
        categoryId
      );
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "사진 업로드에 실패했어요.");
    } finally {
      setUploading(false);
    }
  }

  return { uploading, error, pick };
}

function MainPhotoSlot({
  mainImageUrl,
  companyName,
  onChanged,
}: {
  mainImageUrl: string | null;
  companyName: string;
  onChanged: () => void;
}) {
  const { uploading, error, pick } = useCompanyPhotoUpload("MAIN", null, onChanged, {
    requireSquare: true,
  });

  return (
    <View style={styles.mainSlotWrap}>
      <Pressable onPress={pick} disabled={uploading} style={styles.mainSlot}>
        {mainImageUrl ? (
          <Image source={{ uri: mainImageUrl }} style={styles.mainSlotImage} />
        ) : (
          <Text style={styles.mainSlotEmoji}>🧽</Text>
        )}
        <View style={styles.mainSlotOverlay}>
          <Text style={styles.mainSlotOverlayText}>
            {uploading ? "업로드 중..." : "탭해서 대표사진 등록/변경"}
          </Text>
        </View>
      </Pressable>
      {error && <Text style={styles.errorText}>{error}</Text>}
      <Text style={styles.mainSlotCaption}>{companyName}</Text>
    </View>
  );
}

function ProfileHeaderSection({
  company,
  averageRating,
  reviewCount,
}: {
  company: CompanyMe["company"];
  averageRating: number;
  reviewCount: number;
}) {
  return (
    <View style={styles.headerSection}>
      <Text style={styles.ratingLine}>
        {reviewCount > 0 ? `★ ${averageRating.toFixed(1)} 리뷰 ${reviewCount}개` : "아직 리뷰가 없어요"}
      </Text>
      {company.introText && <Text style={styles.introPreview}>{company.introText}</Text>}
    </View>
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
  const [pricingUnit, setPricingUnit] = useState<"FLAT" | "PER_UNIT">("FLAT");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [supportedOptions, setSupportedOptions] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  const selectedSlug = availableCategories.find((c) => c.id === categoryId)?.slug;
  const quantityKey = selectedSlug ? getPricingQuantityKey(selectedSlug) : undefined;
  const unitLabel = quantityKey ? PRICING_UNIT_LABEL[quantityKey] : null;
  const selectQuestions = selectedSlug
    ? getReservationQuestions(selectedSlug).filter((q) => q.type === "select" && q.options)
    : [];

  function selectCategory(id: string, slug: string) {
    setCategoryId(id);
    // Every option starts checked — "이 업체가 다 청소할 수 있다"는 게
    // 기본값이고, 특정 형태를 못 하는 업체만 체크를 해제하면 됨.
    const defaults: Record<string, string[]> = {};
    for (const q of getReservationQuestions(slug).filter((q) => q.type === "select" && q.options)) {
      defaults[q.key] = [...(q.options ?? [])];
    }
    setSupportedOptions(defaults);
  }

  function toggleOption(key: string, option: string) {
    setSupportedOptions((prev) => {
      const current = prev[key] ?? [];
      const next = current.includes(option)
        ? current.filter((v) => v !== option)
        : [...current, option];
      return { ...prev, [key]: next };
    });
  }

  async function handleAdd() {
    if (!categoryId) {
      Alert.alert("알림", "청소 종류를 선택해주세요.");
      return;
    }
    const missing = selectQuestions.find((q) => (supportedOptions[q.key] ?? []).length === 0);
    if (missing) {
      Alert.alert("알림", `처리 가능한 ${missing.label}을(를) 최소 1개는 선택해주세요.`);
      return;
    }
    setSaving(true);
    try {
      await saveService({
        categoryId,
        price: Number(price),
        description,
        pricingUnit: unitLabel ? pricingUnit : "FLAT",
        supportedOptions,
      });
      setCategoryId(null);
      setPricingUnit("FLAT");
      setPrice("");
      setDescription("");
      setSupportedOptions({});
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
              {s.pricingUnit === "PER_UNIT"
                ? `${PRICING_UNIT_LABEL[getPricingQuantityKey(s.categorySlug) ?? ""] ?? ""}당 `
                : ""}
              {s.price.toLocaleString()}원
              {s.description ? ` · ${s.description}` : ""}
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
                onPress={() => selectCategory(c.id, c.slug)}
              >
                <Text style={[styles.chipText, categoryId === c.id && styles.chipTextActive]}>
                  {c.name}
                </Text>
              </Pressable>
            ))}
          </View>
          {selectQuestions.map((q) => (
            <View key={q.key} style={styles.selectQuestionBlock}>
              <Text style={styles.selectQuestionLabel}>처리 가능한 {q.label}</Text>
              <View style={styles.chipRow}>
                {q.options?.map((option) => {
                  const active = (supportedOptions[q.key] ?? []).includes(option);
                  return (
                    <Pressable
                      key={option}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => toggleOption(q.key, option)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          {unitLabel && (
            <View style={styles.chipRow}>
              <Pressable
                style={[styles.chip, pricingUnit === "FLAT" && styles.chipActive]}
                onPress={() => setPricingUnit("FLAT")}
              >
                <Text style={[styles.chipText, pricingUnit === "FLAT" && styles.chipTextActive]}>
                  고정가
                </Text>
              </Pressable>
              <Pressable
                style={[styles.chip, pricingUnit === "PER_UNIT" && styles.chipActive]}
                onPress={() => setPricingUnit("PER_UNIT")}
              >
                <Text
                  style={[styles.chipText, pricingUnit === "PER_UNIT" && styles.chipTextActive]}
                >
                  {unitLabel}당 단가
                </Text>
              </Pressable>
            </View>
          )}
          <TextField
            value={price}
            onChangeText={setPrice}
            placeholder={unitLabel ? `가격 (원) — 고정가 또는 ${unitLabel}당 단가` : "가격 (원)"}
            keyboardType="number-pad"
          />
          <TextField value={description} onChangeText={setDescription} placeholder="설명 (선택)" />
          <Button title="서비스 추가" onPress={handleAdd} loading={saving} style={styles.saveButton} />
        </View>
      )}
    </Section>
  );
}

/** "상세페이지" section — a mode toggle (직접 올리기/내 사이트 템플릿) on
 * top of whichever editor matches the company's current detailPageMode.
 * Mode switches optimistically, same pattern as the web dashboard. */
function DetailPageSection({
  workPhotos,
  templatePhotos,
  services,
  detailPageMode,
  onChanged,
}: {
  workPhotos: CompanyPhoto[];
  templatePhotos: CompanyPhoto[];
  services: CompanyMe["services"];
  detailPageMode: DetailPageMode;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<DetailPageMode>(detailPageMode);
  const [modeError, setModeError] = useState<string | null>(null);

  async function handleModeChange(next: DetailPageMode) {
    if (next === mode) return;
    const previous = mode;
    setMode(next);
    setModeError(null);
    try {
      await updateDetailPageMode(next);
    } catch (err) {
      setMode(previous);
      setModeError(err instanceof Error ? err.message : "저장에 실패했어요.");
    }
  }

  return (
    <Section title="상세페이지">
      <View style={styles.modeRow}>
        <Pressable
          onPress={() => handleModeChange("CUSTOM_IMAGE")}
          style={[styles.modeCard, mode === "CUSTOM_IMAGE" && styles.modeCardActive]}
        >
          <Text style={styles.modeCardTitle}>직접 올리기</Text>
          <Text style={styles.modeCardDesc}>준비한 세로로 긴 이미지를 그대로</Text>
        </Pressable>
        <Pressable
          onPress={() => handleModeChange("SITE_TEMPLATE")}
          style={[styles.modeCard, mode === "SITE_TEMPLATE" && styles.modeCardActive]}
        >
          <Text style={styles.modeCardTitle}>내 사이트 템플릿</Text>
          <Text style={styles.modeCardDesc}>사진 여러 장을 올리면 자동으로 꾸며드려요</Text>
        </Pressable>
      </View>
      {modeError && <Text style={styles.errorText}>{modeError}</Text>}
      <Text style={styles.modeHint}>
        두 방식의 사진은 따로 저장되고, 선택한 방식만 고객에게 보여요.
      </Text>

      <PhotoStackSection
        photos={mode === "SITE_TEMPLATE" ? templatePhotos : workPhotos}
        services={services}
        onChanged={onChanged}
        mode={mode}
      />
    </Section>
  );
}

/** One tab per registered service — the editor then shows exactly what a
 * customer sees with that service picked (its own photos plus untagged
 * "공통" ones), and new uploads are tagged to it. Hidden with 0–1 services. */
function CategoryTabs({
  value,
  onChange,
  services,
}: {
  value: string | null;
  onChange: (categoryId: string) => void;
  services: CompanyMe["services"];
}) {
  if (services.length <= 1) return null;
  return (
    <View style={styles.chipRow}>
      {services.map((s) => (
        <Pressable
          key={s.categoryId}
          style={[styles.chip, value === s.categoryId && styles.chipActive]}
          onPress={() => onChange(s.categoryId)}
        >
          <Text style={[styles.chipText, value === s.categoryId && styles.chipTextActive]}>
            {s.categoryName}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function PhotoStackSection({
  photos,
  services,
  onChanged,
  mode,
}: {
  photos: CompanyPhoto[];
  services: CompanyMe["services"];
  onChanged: () => void;
  mode: DetailPageMode;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    services[0]?.categoryId ?? null
  );
  const { uploading, error, pick } = useCompanyPhotoUpload(
    mode === "SITE_TEMPLATE" ? "TEMPLATE" : "WORK",
    selectedCategoryId,
    onChanged
  );
  const hasTabs = services.length > 1;
  const visiblePhotos = hasTabs
    ? photos.filter((p) => p.categoryId === null || p.categoryId === selectedCategoryId)
    : photos;
  const selectedName = services.find((s) => s.categoryId === selectedCategoryId)?.categoryName;

  return (
    <View style={styles.photoStackSection}>
      <CategoryTabs value={selectedCategoryId} onChange={setSelectedCategoryId} services={services} />
      <PhotoStack
        photos={visiblePhotos}
        variant={mode === "SITE_TEMPLATE" ? "template" : "custom"}
        photoOverlay={(photo) => (
          <>
            {hasTabs && (photo as CompanyPhoto).categoryId === null && (
              <View style={styles.photoTag}>
                <Text style={styles.photoTagText}>모든 서비스 공통</Text>
              </View>
            )}
            <Pressable
              onPress={() => {
                deleteCompanyPhoto(photo.id).then(onChanged);
              }}
              style={styles.photoDeleteButton}
            >
              <Text style={styles.photoDeleteButtonText}>×</Text>
            </Pressable>
          </>
        )}
        captionSlot={(photo) => (
          <CaptionInput photoId={photo.id} initialCaption={(photo as CompanyPhoto).caption} />
        )}
        extraTile={
          <Pressable onPress={pick} disabled={uploading} style={styles.addPhotoTile}>
            <Text style={styles.addPhotoTileText}>
              {uploading
                ? "업로드중"
                : `+ ${hasTabs && selectedName ? `${selectedName} ` : ""}${
                    mode === "SITE_TEMPLATE" ? "사진 추가" : "상세 이미지 추가"
                  }`}
            </Text>
          </Pressable>
        }
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

/** Saves on blur rather than per-keystroke — a caption per grid tile, so
 * typing shouldn't fire a request on every character. */
function CaptionInput({
  photoId,
  initialCaption,
}: {
  photoId: string;
  initialCaption: string | null;
}) {
  const [value, setValue] = useState(initialCaption ?? "");
  const [error, setError] = useState<string | null>(null);

  async function handleBlur() {
    setError(null);
    try {
      await updateCompanyPhotoCaption(photoId, value);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했어요.");
    }
  }

  return (
    <View>
      <TextInput
        value={value}
        onChangeText={setValue}
        onBlur={handleBlur}
        placeholder="이 사진 아래에 들어갈 설명을 적어주세요"
        placeholderTextColor={colors.textFaint}
        maxLength={60}
        style={styles.captionInput}
      />
      {error && <Text style={styles.captionErrorText}>{error}</Text>}
    </View>
  );
}

function RegionsSection({
  legacyRegions,
  selectedRegions,
  onSaved,
}: {
  legacyRegions: { id: string; name: string }[];
  selectedRegions: { id: string; label: string }[];
  onSaved: () => void;
}) {
  // Map (not Set) so a label is always on hand for the "선택된 지역" chips
  // below, even once the search that originally surfaced a pick has been
  // cleared or replaced by another one.
  const [selected, setSelected] = useState<Map<string, string>>(
    () => new Map(selectedRegions.map((r) => [r.id, r.label]))
  );
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<RegionGroupHit[] | null>(null);
  const [searching, setSearching] = useState(false);

  const normalizedQuery = query.trim();

  // Server-side search (see /api/mobile/regions/search-groups) instead of
  // fetching all ~256 시/군/구 with all ~5,000 동 up front — that full tree
  // fetched eagerly on every screen focus was what made this screen slow.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!normalizedQuery) {
        setGroups(null);
        setSearching(false);
        return;
      }
      setSearching(true);
      searchRegionGroups(query)
        .then((results) => {
          if (!cancelled) setGroups(results);
        })
        .catch(() => {
          if (!cancelled) setGroups([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, normalizedQuery]);

  function toggleLeaf(id: string, label: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(id)) next.delete(id);
      else next.set(id, label);
      return next;
    });
  }

  function toggleGroup(group: RegionGroupHit, checked: boolean) {
    setSelected((prev) => {
      const next = new Map(prev);
      for (const child of group.children) {
        if (checked) next.set(child.id, `${group.name} ${child.name}`);
        else next.delete(child.id);
      }
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await setCompanyRegions([...selected.keys()]);
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

      {selected.size > 0 && (
        <View style={styles.regionGroup}>
          <Text style={styles.regionGroupTitle}>선택된 지역 ({selected.size})</Text>
          <View style={styles.chipRow}>
            {[...selected.entries()].map(([id, label]) => (
              <Pressable
                key={id}
                style={[styles.chip, styles.chipActive]}
                onPress={() => toggleLeaf(id, label)}
              >
                <Text style={styles.chipTextActive}>{label} ×</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <TextInput
        style={styles.searchInput}
        value={query}
        onChangeText={setQuery}
        placeholder="지역 이름으로 검색 (예: 영통구)"
        placeholderTextColor={colors.textFaint}
        autoCorrect={false}
        autoCapitalize="none"
      />

      {normalizedQuery ? (
        <>
          {searching && <Text style={styles.helperText}>검색 중...</Text>}
          {!searching && groups?.length === 0 && (
            <Text style={styles.helperText}>검색 결과가 없어요.</Text>
          )}
          {groups?.map((group) => {
            const childIds = group.children.map((c) => c.id);
            const checkedCount = childIds.filter((id) => selected.has(id)).length;
            const allChecked = childIds.length > 0 && checkedCount === childIds.length;
            const someChecked = !allChecked && checkedCount > 0;

            return (
              <View key={group.id} style={styles.regionGroup}>
                <Pressable
                  style={styles.regionGroupHeader}
                  onPress={() => toggleGroup(group, !allChecked)}
                >
                  <Text style={styles.regionGroupTitle}>
                    {group.name}
                    {allChecked ? " (전체)" : someChecked ? " (일부 지역)" : ""}
                  </Text>
                </Pressable>
                <View style={styles.chipRow}>
                  {group.children.map((dong) => (
                    <Pressable
                      key={dong.id}
                      style={[styles.chip, selected.has(dong.id) && styles.chipActive]}
                      onPress={() => toggleLeaf(dong.id, `${group.name} ${dong.name}`)}
                    >
                      <Text style={[styles.chipText, selected.has(dong.id) && styles.chipTextActive]}>
                        {dong.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            );
          })}
        </>
      ) : (
        legacyRegions.length > 0 && (
          <View style={styles.regionGroup}>
            <Text style={styles.regionGroupTitle}>기타</Text>
            <View style={styles.chipRow}>
              {legacyRegions.map((r) => (
                <Pressable
                  key={r.id}
                  style={[styles.chip, selected.has(r.id) && styles.chipActive]}
                  onPress={() => toggleLeaf(r.id, r.name)}
                >
                  <Text style={[styles.chipText, selected.has(r.id) && styles.chipTextActive]}>
                    {r.name}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )
      )}

      <Button title="저장" onPress={handleSave} loading={saving} style={styles.saveButton} />
    </Section>
  );
}

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);
const HOURS_PATTERN = /^\d{2}:\d{2}-\d{2}:\d{2}$/;

function parseBusinessHours(value: string): [string, string] {
  if (HOURS_PATTERN.test(value)) {
    const [start, end] = value.split("-");
    return [start, end];
  }
  return ["09:00", "18:00"];
}

/** Tap-to-pick 시작/종료 시간 instead of free-text — no more typing "09:00-18:00" by hand. */
function BusinessHoursPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [start, end] = parseBusinessHours(value);
  const [openField, setOpenField] = useState<"start" | "end" | null>(null);

  function select(hour: string) {
    onChange(openField === "start" ? `${hour}-${end}` : `${start}-${hour}`);
    setOpenField(null);
  }

  return (
    <View>
      <View style={styles.hoursRow}>
        <Pressable
          onPress={() => setOpenField(openField === "start" ? null : "start")}
          style={[styles.hoursButton, openField === "start" && styles.hoursButtonActive]}
        >
          <Text style={styles.hoursButtonText}>{start}</Text>
        </Pressable>
        <Text style={styles.hoursSeparator}>~</Text>
        <Pressable
          onPress={() => setOpenField(openField === "end" ? null : "end")}
          style={[styles.hoursButton, openField === "end" && styles.hoursButtonActive]}
        >
          <Text style={styles.hoursButtonText}>{end}</Text>
        </Pressable>
      </View>

      {openField && (
        <View style={styles.hoursChipGrid}>
          {HOURS.map((h) => {
            const active = h === (openField === "start" ? start : end);
            return (
              <Pressable
                key={h}
                onPress={() => select(h)}
                style={[styles.hoursChip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{h}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export type InfoSectionHandle = { save: () => Promise<boolean> };

const InfoSection = forwardRef<
  InfoSectionHandle,
  {
    company: CompanyMe["company"];
    onSaved: () => void;
    // Only the logout button needs to know — everything else here already
    // saves immediately, so this is the one place unsaved edits can be
    // silently lost.
    onDirtyChange: (dirty: boolean) => void;
  }
>(function InfoSection({ company, onSaved, onDirtyChange }, ref) {
  const [name, setName] = useState(company.name);
  const [introText, setIntroText] = useState(company.introText ?? "");
  const [phone, setPhone] = useState(company.phone ? formatPhoneNumber(company.phone) : "");
  const [businessHours, setBusinessHours] = useState(company.businessHours ?? "");
  const [isAvailable, setIsAvailable] = useState(company.isAvailable);
  const [websiteUrl, setWebsiteUrl] = useState(company.websiteUrl ?? "");
  const [saving, setSaving] = useState(false);

  const [savedFields, setSavedFields] = useState({
    name: company.name,
    introText: company.introText ?? "",
    phone: company.phone ? formatPhoneNumber(company.phone) : "",
    businessHours: company.businessHours ?? "",
    isAvailable: company.isAvailable,
    websiteUrl: company.websiteUrl ?? "",
  });
  const isDirty =
    name !== savedFields.name ||
    introText !== savedFields.introText ||
    phone !== savedFields.phone ||
    businessHours !== savedFields.businessHours ||
    isAvailable !== savedFields.isAvailable ||
    websiteUrl !== savedFields.websiteUrl;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  /** Returns whether it actually saved — the logout guard needs to know
   * before it's safe to log out. `silent` skips the "저장됐어요" alert,
   * since that flow immediately logs out right after. */
  async function handleSave(silent = false): Promise<boolean> {
    setSaving(true);
    try {
      await updateCompanyProfile({ name, phone, introText, businessHours, isAvailable, websiteUrl });
      setSavedFields({ name, introText, phone, businessHours, isAvailable, websiteUrl });
      onSaved();
      if (!silent) Alert.alert("저장 완료", "저장됐어요.");
      return true;
    } catch (err) {
      Alert.alert("저장 실패", err instanceof Error ? err.message : "저장에 실패했어요.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  useImperativeHandle(ref, () => ({ save: () => handleSave(true) }));

  return (
    <Section title="기본 정보">
      <TextField label="업체명" value={name} onChangeText={setName} />
      <TextField label="업체 소개" value={introText} onChangeText={setIntroText} multiline />

      <Text style={[styles.infoLabel, styles.hoursLabel]}>영업시간</Text>
      <BusinessHoursPicker value={businessHours} onChange={setBusinessHours} />

      <TextField
        label="홈페이지 주소 (선택)"
        value={websiteUrl}
        onChangeText={setWebsiteUrl}
        placeholder="https://example.com"
        keyboardType="url"
        autoCapitalize="none"
      />
      <Text style={styles.helperText}>
        입력하면 고객이 예약 버튼을 눌렀을 때 우리 앱 대신 이 주소로 이동해요.
        홈페이지로 연결하면 그 예약은 우리 앱에 기록되지 않아서, 리뷰나 예약
        건수에는 반영되지 않아요.
      </Text>

      <View style={styles.infoTable}>
        <View style={[styles.infoRow, styles.infoRowDivider]}>
          <Text style={styles.infoLabel}>예약 가능 여부</Text>
          <Switch value={isAvailable} onValueChange={setIsAvailable} />
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>연락처</Text>
          <TextInput
            value={phone}
            onChangeText={(text) => setPhone(formatPhoneNumber(text))}
            placeholder="010-0000-0000"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            maxLength={13}
            style={styles.infoInput}
          />
        </View>
      </View>

      <Button title="저장" onPress={() => handleSave()} loading={saving} style={styles.saveButton} />
    </Section>
  );
});

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
  subtitle: { marginTop: spacing.xs, fontSize: fontSize.xs, color: colors.textFaint },
  logoutButton: { marginTop: spacing.xxl, alignSelf: "flex-start" },
  logout: { fontSize: fontSize.base, color: colors.textFaint, textDecorationLine: "underline" },
  mainSlotWrap: { marginTop: spacing.lg },
  mainSlot: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.xl,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mainSlotImage: { width: "100%", height: "100%" },
  mainSlotEmoji: { fontSize: 48 },
  mainSlotOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: spacing.sm - 2,
  },
  mainSlotOverlayText: {
    textAlign: "center",
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    color: colors.onPrimary,
  },
  mainSlotCaption: { marginTop: spacing.sm, fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  headerSection: { marginTop: spacing.xs },
  ratingLine: { fontSize: fontSize.base, color: colors.textMuted },
  introPreview: { marginTop: spacing.sm, fontSize: fontSize.base, color: colors.text },
  errorText: { marginTop: spacing.xs, fontSize: fontSize.xs, color: colors.danger },
  section: {
    marginTop: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text },
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
  selectQuestionBlock: { marginTop: spacing.sm + 2 },
  selectQuestionLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.textMuted },
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
  searchInput: {
    marginTop: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.base,
    color: colors.text,
  },
  regionGroup: { marginTop: spacing.md },
  regionGroupHeader: { paddingVertical: spacing.xs },
  regionGroupTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  photoStackSection: { marginTop: spacing.md },
  photoTag: {
    position: "absolute",
    left: spacing.sm,
    bottom: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  photoTagText: { fontSize: fontSize.xs, color: colors.onPrimary },
  photoDeleteButton: {
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  modeRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  modeCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm + 2,
  },
  modeCardActive: { borderColor: colors.primary, backgroundColor: colors.surfaceMuted },
  modeCardTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  modeCardDesc: { marginTop: 2, fontSize: fontSize.xs, color: colors.textMuted },
  modeHint: { marginTop: spacing.xs + 2, fontSize: fontSize.xs, color: colors.textFaint },
  captionInput: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    color: colors.text,
    textAlign: "center",
  },
  captionErrorText: { marginTop: 2, fontSize: fontSize.xs, color: colors.danger },
  photoDeleteButtonText: { color: colors.onPrimary, fontSize: fontSize.md, lineHeight: fontSize.md },
  addPhotoTile: {
    marginTop: spacing.sm,
    height: 64,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoTileText: { fontSize: fontSize.base, color: colors.textMuted },
  infoTable: {
    marginTop: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    gap: spacing.md,
  },
  infoRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  infoLabel: { fontSize: fontSize.base, color: colors.textMuted, flexShrink: 0 },
  infoInput: {
    flex: 1,
    textAlign: "right",
    fontSize: fontSize.base,
    color: colors.text,
  },
  hoursLabel: { marginTop: spacing.md + 2 },
  hoursRow: {
    marginTop: spacing.xs + 2,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  hoursButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
  },
  hoursButtonActive: { borderColor: colors.primary },
  hoursButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  hoursSeparator: { fontSize: fontSize.base, color: colors.textFaint },
  hoursChipGrid: {
    marginTop: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs + 2,
  },
  hoursChip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
  },
});
