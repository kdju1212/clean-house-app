import { useCallback, useState } from "react";
import { Alert, Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import * as Updates from "expo-updates";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMyPage, updateMyPhone, type MyPageData } from "../../src/api/mypage";
import { toggleCompanyFavorite } from "../../src/api/companies";
import { logout } from "../../src/api/auth";
import { getStoredUser, updateStoredPhone } from "../../src/storage/auth-storage";
import { API_BASE_URL } from "../../src/api/client";
import { formatPhoneNumber } from "../../src/utils/phone";
import { Screen } from "../../src/components/Screen";
import { LoadingView } from "../../src/components/LoadingView";
import { Card } from "../../src/components/Card";
import { Button } from "../../src/components/Button";
import { colors, fontSize, fontWeight, radius, spacing } from "../../src/theme";
import CompanyProfileScreen from "../company/profile";

const PROVIDER_LABEL: Record<string, string> = {
  google: "Google",
  kakao: "카카오",
  naver: "네이버",
};

const RESERVATION_SUMMARY = [
  { key: "requested", label: "예약 예정" },
  { key: "accepted", label: "진행 중" },
  { key: "completed", label: "완료" },
] as const;

/**
 * The 마이페이지/업체 프로필관리 tab — same slot as app/(tabs)/reservations.tsx's
 * role switch, and for the same reason: checked on every focus so a fresh
 * registration (done from a screen pushed on top of this tab, not a
 * remount of it) flips this over without needing a full app restart.
 */
export default function MyPageTabScreen() {
  const [isCompany, setIsCompany] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      getStoredUser().then((user) => setIsCompany(user?.role === "COMPANY"));
    }, [])
  );

  if (isCompany === null) {
    return <LoadingView />;
  }

  return (
    <View style={styles.flex}>
      {isCompany ? <CompanyProfileScreen /> : <CustomerMyPageView />}
      <ReloadButton />
    </View>
  );
}

/**
 * Full app reload (not a data refetch) — mainly so we don't have to
 * force-quit and reopen the app from the task switcher just to pick up a
 * newly published OTA update while testing.
 */
function ReloadButton() {
  const insets = useSafeAreaInsets();
  const [reloading, setReloading] = useState(false);

  async function handleReload() {
    setReloading(true);
    try {
      await Updates.reloadAsync();
    } catch {
      Alert.alert("새로고침 실패", "지금 환경에서는 지원되지 않아요.");
      setReloading(false);
    }
  }

  return (
    <Pressable
      onPress={handleReload}
      disabled={reloading}
      hitSlop={8}
      style={[styles.reloadButton, { top: insets.top + spacing.sm }]}
    >
      <Text style={styles.reloadButtonText}>{reloading ? "새로고침 중…" : "🔄 새로고침"}</Text>
    </Pressable>
  );
}

function CustomerMyPageView() {
  const [data, setData] = useState<MyPageData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    return fetchMyPage().then((result) => {
      setData(result);
      setPhone(result.user.phone ? formatPhoneNumber(result.user.phone) : "");
    });
  }, []);

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

  async function handleSavePhone() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await updateMyPhone(phone);
      await updateStoredPhone(phone);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "저장에 실패했어요.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUnfavorite(companyId: string) {
    if (!data) return;
    // The item disappearing IS the confirmation — a refetch round trip
    // here would just flash the whole screen for no extra information.
    setData({ ...data, favorites: data.favorites.filter((f) => f.companyId !== companyId) });
    try {
      await toggleCompanyFavorite(companyId);
    } catch {
      load();
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  if (!data) {
    return <LoadingView />;
  }

  const { user, reservationCounts, reviews, favorites } = data;

  return (
    <Screen scroll refreshing={refreshing} onRefresh={handleRefresh}>
      <Text style={styles.title}>마이페이지</Text>

      <Card style={styles.card}>
        <Text style={styles.label}>이름</Text>
        <Text style={styles.value}>{user.name ?? "-"}</Text>
        <Text style={[styles.label, styles.labelSpaced]}>이메일</Text>
        <Text style={styles.value}>{user.email ?? "-"}</Text>
        <Text style={[styles.label, styles.labelSpaced]}>로그인 계정</Text>
        <Text style={styles.value}>
          {user.loginProvider ? PROVIDER_LABEL[user.loginProvider] ?? user.loginProvider : "-"}
        </Text>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>연락처</Text>
        <Text style={styles.hint}>예약 시 업체에 전달되는 연락처예요.</Text>
        <View style={styles.phoneRow}>
          <TextInput
            value={phone}
            onChangeText={(text) => setPhone(formatPhoneNumber(text))}
            placeholder="010-0000-0000"
            placeholderTextColor={colors.textFaint}
            keyboardType="number-pad"
            maxLength={13}
            style={styles.phoneInput}
          />
          <Button title="저장" size="sm" loading={saving} onPress={handleSavePhone} />
        </View>
        {saveError && <Text style={styles.errorText}>{saveError}</Text>}
        {saved && <Text style={styles.savedText}>저장됐어요.</Text>}
      </Card>

      <Pressable onPress={() => router.push("/reservations")}>
        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>
              내 예약{reservationCounts.total > 0 ? ` (${reservationCounts.total})` : ""}
            </Text>
            <Text style={styles.chevron}>→</Text>
          </View>
          <View style={styles.summaryGrid}>
            {RESERVATION_SUMMARY.map((s) => (
              <View key={s.key} style={styles.summaryTile}>
                <Text style={styles.summaryCount}>{reservationCounts[s.key]}</Text>
                <Text style={styles.summaryLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Card>
      </Pressable>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>
          내가 작성한 리뷰{reviews.length > 0 ? ` (${reviews.length})` : ""}
        </Text>
        {reviews.length === 0 ? (
          <Text style={styles.emptyText}>아직 작성한 리뷰가 없어요.</Text>
        ) : (
          reviews.map((review) => (
            <Pressable
              key={review.id}
              onPress={() => router.push(`/companies/${review.companyId}`)}
              style={styles.listItem}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.listItemTitle}>{review.companyName}</Text>
                <Text style={styles.stars}>
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </Text>
              </View>
              <Text style={styles.listItemSub} numberOfLines={1}>
                {review.content}
              </Text>
            </Pressable>
          ))
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>
          관심 업체{favorites.length > 0 ? ` (${favorites.length})` : ""}
        </Text>
        {favorites.length === 0 ? (
          <Text style={styles.emptyText}>
            찜한 업체가 없어요. 업체 상세페이지에서 ♡를 눌러 담아보세요.
          </Text>
        ) : (
          favorites.map((favorite) => (
            <View key={favorite.companyId} style={styles.favoriteRow}>
              {favorite.mainImageUrl ? (
                <Image source={{ uri: favorite.mainImageUrl }} style={styles.favoriteThumb} />
              ) : (
                <View style={[styles.favoriteThumb, styles.favoriteThumbEmpty]}>
                  <Text style={styles.favoriteThumbEmoji}>🧽</Text>
                </View>
              )}
              <Pressable
                onPress={() => router.push(`/companies/${favorite.companyId}`)}
                style={styles.favoriteInfo}
              >
                <Text style={styles.listItemTitle} numberOfLines={1}>
                  {favorite.companyName}
                </Text>
              </Pressable>
              <Pressable onPress={() => handleUnfavorite(favorite.companyId)} hitSlop={8}>
                <Text style={styles.favoriteRemove}>♥</Text>
              </Pressable>
            </View>
          ))
        )}
      </Card>

      <Pressable onPress={() => router.push("/company-register")} style={styles.companyLink}>
        <Text style={styles.companyLinkText}>사장님이신가요? 업체 등록하기</Text>
      </Pressable>

      <Pressable onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logout}>로그아웃</Text>
      </Pressable>

      <View style={styles.footerLinks}>
        <Pressable onPress={() => Linking.openURL(`${API_BASE_URL}/terms`)}>
          <Text style={styles.footerLink}>이용약관</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(`${API_BASE_URL}/privacy`)}>
          <Text style={styles.footerLink}>개인정보처리방침</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  reloadButton: {
    position: "absolute",
    right: spacing.xl,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  reloadButtonText: { fontSize: fontSize.xs, color: colors.textMuted },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  card: { marginTop: spacing.lg },
  label: { fontSize: fontSize.sm, color: colors.textMuted },
  labelSpaced: { marginTop: spacing.md },
  value: { marginTop: 2, fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text },
  sectionTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  hint: { marginTop: 4, fontSize: fontSize.xs, color: colors.textFaint },
  phoneRow: { marginTop: spacing.sm, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  phoneInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
    fontSize: fontSize.md,
    color: colors.text,
  },
  errorText: { marginTop: spacing.xs, fontSize: fontSize.xs, color: colors.danger },
  savedText: { marginTop: spacing.xs, fontSize: fontSize.xs, color: "#059669" },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chevron: { color: colors.textFaint },
  summaryGrid: { marginTop: spacing.md, flexDirection: "row", gap: spacing.sm },
  summaryTile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  summaryCount: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  summaryLabel: { marginTop: 2, fontSize: fontSize.xs, color: colors.textMuted },
  emptyText: { marginTop: spacing.sm, fontSize: fontSize.base, color: colors.textFaint },
  listItem: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 1,
  },
  listItemTitle: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  listItemSub: { marginTop: 2, fontSize: fontSize.xs, color: colors.textMuted },
  stars: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.star },
  favoriteRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  favoriteThumb: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
  favoriteThumbEmpty: { alignItems: "center", justifyContent: "center" },
  favoriteThumbEmoji: { fontSize: fontSize.md },
  favoriteInfo: { flex: 1 },
  favoriteRemove: { fontSize: fontSize.lg, color: colors.danger },
  companyLink: { marginTop: spacing.xxl, alignSelf: "flex-start" },
  companyLinkText: { fontSize: fontSize.sm, color: colors.textFaint },
  logoutButton: { marginTop: spacing.lg, alignSelf: "flex-start" },
  logout: { fontSize: fontSize.base, color: colors.textFaint, textDecorationLine: "underline" },
  footerLinks: { marginTop: spacing.md, flexDirection: "row", gap: spacing.lg },
  footerLink: { fontSize: fontSize.xs, color: colors.textFaint, textDecorationLine: "underline" },
});
