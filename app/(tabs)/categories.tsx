import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { fetchCategories, type Category } from "../../src/api/categories";
import { searchCompanies, type CompanyRow } from "../../src/api/companies";
import { fetchCategoryProfile, fetchAllCategoryProfiles } from "../../src/api/category-profile";
import { getSelectedRegion, type StoredRegion } from "../../src/storage/auth-storage";
import { fetchNotifications } from "../../src/api/notifications";
import { getPricingQuantityKey, PRICING_UNIT_LABEL } from "../../src/utils/reservation-questions";
import { Screen } from "../../src/components/Screen";
import { LoadingView } from "../../src/components/LoadingView";
import { EmptyState } from "../../src/components/EmptyState";
import { CategoryNavBar } from "../../src/components/CategoryNavBar";
import { CategoryProfileButton } from "../../src/components/CategoryProfileButton";
import { CompanyListItem } from "../../src/components/CompanyListItem";
import { Icon } from "../../src/components/Icon";
import { colors, fontSize, fontWeight, radius, spacing } from "../../src/theme";

type Row = CompanyRow & { isAd?: boolean };

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [region, setRegion] = useState<StoredRegion | null>(null);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeCategoryName, setActiveCategoryName] = useState<string | null>(null);
  const [categoryProfile, setCategoryProfile] = useState<Record<string, string> | null>(null);
  const [allProfiles, setAllProfiles] = useState<Record<string, Record<string, string>>>({});
  const [rows, setRows] = useState<Row[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [queryInput, setQueryInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  // Search lives behind the header's 🔍 icon, Danggeun-style, instead of
  // an always-visible input — it stays open while there's a query.
  const [searchOpen, setSearchOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const requestIdRef = useRef(0);

  // Same 250ms debounce as the region search on the company profile
  // screen — avoids firing a request on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(queryInput.trim()), 250);
    return () => clearTimeout(timer);
  }, [queryInput]);

  const loadAllProfiles = useCallback(() => {
    fetchAllCategoryProfiles()
      .then(setAllProfiles)
      .catch(() => {});
  }, []);

  // Tapping a category pill is a plain state change (activeSlug), never a
  // navigation — switching tabs used to router.replace() to a different
  // route, which remounted the screen and showed a full loading spinner on
  // every tap; this way the header/nav bar never disappear and only the
  // list itself refetches, which is what actually makes it feel instant.
  const loadRows = useCallback(async (regionId: string, slug: string, query: string) => {
    const requestId = ++requestIdRef.current;

    const [result, profile] = await Promise.all([
      searchCompanies({ slug, regionId, query: query || undefined }),
      fetchCategoryProfile(slug).catch(() => null),
    ]);
    if (requestIdRef.current !== requestId) return; // a newer tap already superseded this one
    setActiveCategoryId(result.category.id);
    setActiveCategoryName(result.category.name);
    setCategoryProfile(profile);
    setRows([...result.adRows.map((r) => ({ ...r, isAd: true })), ...result.rows]);
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

  // No more "전체" pill to land on by default — the first category (by
  // `order`) fills that role instead, same as / on the web repo. Setting
  // it here (right alongside the fetch that produced it) rather than in a
  // separate effect keyed on `categories` avoids deriving state from state.
  const loadCategories = useCallback(() => {
    return fetchCategories().then((cats) => {
      setCategories(cats);
      setActiveSlug((prev) => prev ?? cats[0]?.slug ?? null);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (categories) return;
      loadCategories();
    }, [categories, loadCategories])
  );

  useFocusEffect(loadAllProfiles);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications()
        .then((list) => setHasUnread(list.some((n) => !n.isRead)))
        .catch(() => {});
    }, [])
  );

  useEffect(() => {
    if (!region || !activeSlug) return;
    // Deliberately doesn't clear rows first — keeping the previous tab's
    // list visible until the new one arrives (fetches are quick) avoids a
    // flash of the inline spinner on every tap, which is what made
    // switching feel instant instead of a reload.
    loadRows(region.id, activeSlug, debouncedQuery);
  }, [region, activeSlug, debouncedQuery, loadRows]);

  async function handleRefresh() {
    if (!region || !activeSlug) return;
    setRefreshing(true);
    try {
      await loadRows(region.id, activeSlug, debouncedQuery);
    } finally {
      setRefreshing(false);
    }
  }

  if (!region || !categories) {
    return <LoadingView />;
  }

  const quantityKey = activeSlug ? getPricingQuantityKey(activeSlug) : undefined;
  const unitLabel = quantityKey ? PRICING_UNIT_LABEL[quantityKey] : undefined;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push("/region-select")}
          style={styles.regionButton}
          hitSlop={8}
        >
          <Icon name="pin" size={22} color={colors.text} />
          <Text style={styles.regionName} numberOfLines={1}>
            {region.name.split(" ").pop()}
          </Text>
          <Icon name="chevronDown" size={18} color={colors.text} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => {
              if (searchOpen && !queryInput) setSearchOpen(false);
              else setSearchOpen(true);
            }}
            hitSlop={8}
          >
            <Icon name="search" size={26} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => router.push("/notifications")} hitSlop={8}>
            <Icon name="bell" size={26} color={colors.text} />
            {hasUnread && <View style={styles.unreadDot} />}
          </Pressable>
        </View>
      </View>

      {(searchOpen || queryInput.length > 0) && (
        <View style={styles.searchBar}>
          <Icon name="search" size={18} color="#868b94" />
          <TextInput
            value={queryInput}
            onChangeText={setQueryInput}
            placeholder={activeCategoryName ? `${activeCategoryName} 업체 검색` : "업체 이름으로 검색"}
            placeholderTextColor="#868b94"
            style={styles.searchInput}
            autoFocus
            returnKeyType="search"
          />
          {queryInput.length > 0 && (
            <Pressable onPress={() => setQueryInput("")} hitSlop={8}>
              <Text style={styles.searchClear}>×</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.navBar}>
        <CategoryNavBar categories={categories} activeSlug={activeSlug} onSelect={setActiveSlug} />
      </View>

      {activeSlug && (
        <View style={styles.categoryRow}>
          <CategoryProfileButton
            categorySlug={activeSlug}
            initialAnswers={categoryProfile}
            otherProfiles={allProfiles}
            categories={categories}
            onSaved={() => {
              loadRows(region.id, activeSlug, debouncedQuery);
              loadAllProfiles();
            }}
          />
        </View>
      )}

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
          renderItem={({ item }) => (
            <CompanyListItem
              company={item}
              isAd={item.isAd}
              unitLabel={unitLabel}
              categoryId={activeCategoryId ?? undefined}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 40,
  },
  regionButton: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
  regionName: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, flexShrink: 1 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.xl },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  searchBar: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.pillBg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.text,
  },
  searchClear: { fontSize: 20, color: "#868b94", lineHeight: 22 },
  navBar: { marginTop: spacing.lg },
  categoryRow: { marginTop: spacing.sm, alignItems: "flex-end" },
  list: { marginTop: spacing.xs },
  inlineLoading: { marginTop: spacing.xxl },
});
