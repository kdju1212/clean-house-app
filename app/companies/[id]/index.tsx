import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchCompanyDetail,
  toggleCompanyFavorite,
  type CompanyDetail,
} from "../../../src/api/companies";
import { getStoredToken } from "../../../src/storage/auth-storage";
import { Screen } from "../../../src/components/Screen";
import { LoadingView } from "../../../src/components/LoadingView";
import { Badge } from "../../../src/components/Badge";
import { PhotoStack } from "../../../src/components/PhotoStack";
import { RatingDistribution } from "../../../src/components/RatingDistribution";
import { ScrollToTopButton } from "../../../src/components/ScrollToTopButton";
import { getPricingQuantityKey, PRICING_UNIT_LABEL } from "../../../src/utils/reservation-questions";
import { colors, fontSize, fontWeight, radius, spacing } from "../../../src/theme";

function formatServicePrice(service: CompanyDetail["services"][number]): string {
  const unitLabel =
    service.pricingUnit === "PER_UNIT"
      ? PRICING_UNIT_LABEL[getPricingQuantityKey(service.categorySlug) ?? ""]
      : null;
  return unitLabel
    ? `${unitLabel}당 ${service.price.toLocaleString()}원`
    : `${service.price.toLocaleString()}원`;
}

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function CompanyDetailScreen() {
  const { id, categoryId: initialCategoryId } = useLocalSearchParams<{
    id: string;
    // Set by CompanyListItem's link when arriving from a specific
    // category, so this screen opens already showing that category's own
    // 소개/사진 instead of the company's general ones.
    categoryId?: string;
  }>();
  const [data, setData] = useState<CompanyDetail | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  // One shared full-screen viewer for every photo on this screen (hero,
  // review strip, per-review photos) — tap opens it, tap again closes it.
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initialCategoryId ?? null
  );
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [barHeight, setBarHeight] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const galleryScrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const barHidden = useRef(false);
  const [barTranslateY] = useState(() => new Animated.Value(0));
  // How far the reserve bar has to travel to be fully off-screen.
  const maxBarHide = barHeight + insets.bottom + spacing.xxl;
  // Button's bottom edge when the bar is fully shown: exactly 7px above
  // the bar's top edge (barHeight already includes the bar's own
  // safe-area padding, so this is the bar's true top, not an approximation).
  const buttonRestingBottom = barHeight + 7;
  // Where the button belongs once the bar is fully hidden — the same
  // spot it would sit at if there were no bar at all.
  const buttonNoBarBottom = insets.bottom + spacing.xxl;
  const buttonTranslateY = barTranslateY.interpolate({
    inputRange: [0, maxBarHide],
    outputRange: [0, buttonRestingBottom - buttonNoBarBottom],
    extrapolate: "clamp",
  });

  const load = useCallback(() => {
    return Promise.all([
      fetchCompanyDetail(id).then(setData),
      getStoredToken().then((token) => setLoggedIn(!!token)),
    ]);
  }, [id]);

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

  async function handleToggleFavorite() {
    if (!loggedIn) {
      Alert.alert("로그인이 필요해요", "찜하려면 먼저 로그인해주세요.", [
        { text: "취소", style: "cancel" },
        { text: "로그인", onPress: () => router.push("/login") },
      ]);
      return;
    }
    if (!data) return;
    setTogglingFavorite(true);
    try {
      const { isFavorited } = await toggleCompanyFavorite(id);
      setData({ ...data, isFavorited });
    } catch (err) {
      Alert.alert("실패", err instanceof Error ? err.message : "찜하기에 실패했어요.");
    } finally {
      setTogglingFavorite(false);
    }
  }

  function goToReserve(service: CompanyDetail["services"][number]) {
    if (!data) return;
    router.push({
      pathname: "/companies/[id]/reserve",
      params: {
        id,
        name: data.company.name,
        categoryId: service.categoryId,
        categorySlug: service.categorySlug,
        price: String(service.price),
      },
    });
  }

  function handleReserveFromBar() {
    if (!data) return;

    // A company with its own site handles booking (and payment) there —
    // we're a directory/matching app, so send the customer off to it
    // instead of into our own reserve screen. See clean_house's
    // Company.websiteUrl / ServiceBar for the same behavior on the web.
    if (data.company.websiteUrl) {
      Linking.openURL(data.company.websiteUrl);
      return;
    }

    // A single service is never ambiguous — no need to make the customer
    // tap it first just to confirm the obvious choice.
    const selected =
      data.services.find((s) => s.categoryId === selectedCategoryId) ??
      (data.services.length === 1 ? data.services[0] : null);
    if (selected) {
      goToReserve(selected);
      return;
    }
    // Nothing picked yet — the reservation screen has no category picker
    // of its own (unlike the web form's dropdown), so a service has to be
    // chosen here first rather than guessing which one they meant.
    Alert.alert("알림", "예약할 서비스를 먼저 선택해주세요.");
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    // Re-rendering this whole (fairly heavy) screen on every single scroll
    // frame — which setScrollY(y) did — was what actually caused the
    // animation to stutter, not the animation itself: the JS thread was
    // busy re-rendering the screen instead of keeping up with the gesture.
    // Only touching state when the visibility threshold is actually
    // crossed means this re-renders twice per scroll, not sixty times.
    const shouldShow = y > 400;
    if (shouldShow !== showScrollTop) {
      setShowScrollTop(shouldShow);
    }

    const diff = y - lastScrollY.current;
    // Ignore tiny jitters (rubber-banding, a light finger twitch) so the
    // bar doesn't flicker — only react to an actual, deliberate scroll.
    if (Math.abs(diff) > 10) {
      const hide = diff > 0 && y > 80;
      // Only start a new animation when the target actually flips —
      // continuing to scroll in the same direction kept re-triggering
      // .start() every ~10px, restarting the in-flight animation from
      // wherever it currently was and making it look stuttery instead of
      // one clean slide.
      if (hide !== barHidden.current) {
        barHidden.current = hide;
        Animated.timing(barTranslateY, {
          toValue: hide ? maxBarHide : 0,
          duration: 60,
          useNativeDriver: true,
        }).start();
      }
      lastScrollY.current = y;
    }
  }

  function handleGalleryScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setGalleryIndex(idx);
  }

  function scrollGalleryTo(idx: number) {
    galleryScrollRef.current?.scrollTo({ x: idx * SCREEN_WIDTH, animated: true });
    setGalleryIndex(idx);
  }

  if (!data) {
    return <LoadingView />;
  }

  const { company, services, photos, regionNames, averageRating, reviewCount, reviews, isFavorited } =
    data;
  const mainPhoto = company.mainImageUrl;
  // Just the current main image — work/전후 photos already get their own
  // PhotoStack sections further down, so the hero no longer needs to
  // double as a full gallery with a thumbnail strip (mirrors the web
  // repo's companies/[id]/gallery.tsx).
  const galleryPhotos = mainPhoto ? [{ id: "main", url: mainPhoto }] : [];
  const cheapest = services.reduce<CompanyDetail["services"][number] | null>(
    (min, s) => (!min || s.price < min.price ? s : min),
    null
  );
  const selectedService =
    services.find((s) => s.categoryId === selectedCategoryId) ??
    (services.length === 1 ? services[0] : null);
  const barService = selectedService ?? cheapest;

  // Untagged photos (categoryId null) show for every category — a
  // company that never bothers tagging anything keeps working exactly
  // like before this feature existed.
  const matchesSelected = (photo: CompanyDetail["photos"][number]) =>
    photo.categoryId === null || photo.categoryId === selectedService?.categoryId;
  const workPhotos = photos.filter((p) => p.type === "WORK" && matchesSelected(p));
  const beforeAfterPhotos = photos.filter((p) => p.type === "BEFORE_AFTER" && matchesSelected(p));
  const reviewPhotos = reviews.flatMap((r) =>
    r.photoUrls.map((url) => ({ key: `${r.id}-${url}`, url }))
  );
  const introText = selectedService?.description || company.introText;

  return (
    <View style={styles.flex}>
      <Screen
        ref={scrollRef}
        scroll
        style={{ ...styles.noPad, paddingBottom: 100 + insets.bottom }}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onScroll={handleScroll}
      >
        {galleryPhotos.length > 0 ? (
          <View>
            <ScrollView
              ref={galleryScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleGalleryScroll}
            >
              {galleryPhotos.map((photo) => (
                <Pressable key={photo.id} onPress={() => setZoomedPhoto(photo.url)}>
                  <Image
                    source={{ uri: photo.url }}
                    style={[styles.galleryImage, { width: SCREEN_WIDTH }]}
                  />
                </Pressable>
              ))}
            </ScrollView>
            {galleryPhotos.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbRow}>
                {galleryPhotos.map((photo, i) => (
                  <Pressable key={photo.id} onPress={() => scrollGalleryTo(i)}>
                    <Image
                      source={{ uri: photo.url }}
                      style={[styles.thumb, i === galleryIndex && styles.thumbActive]}
                    />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        ) : (
          <View style={styles.galleryPlaceholder}>
            <Text style={styles.galleryPlaceholderEmoji}>🧽</Text>
          </View>
        )}

        <View style={styles.body}>
          <View style={styles.headerRow}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{company.name}</Text>
              {company.isVerified ? (
                <Badge label="인증" tone="info" />
              ) : (
                company.hasBusinessRegistration && <Badge label="사업자등록" tone="neutral" />
              )}
            </View>
            <Pressable onPress={handleToggleFavorite} disabled={togglingFavorite} hitSlop={8}>
              <Text style={styles.favoriteIcon}>{isFavorited ? "♥" : "♡"}</Text>
            </Pressable>
          </View>
          <View style={styles.introRatingRow}>
            {introText && <Text style={styles.intro}>{introText}</Text>}
            <Pressable
              style={styles.ratingBlock}
              onPress={() =>
                router.push({
                  pathname: "/companies/[id]/reviews",
                  params: { id, name: company.name },
                })
              }
            >
              {reviewCount > 0 ? (
                <>
                  <Text style={styles.ratingStars}>
                    {"★".repeat(Math.round(averageRating))}
                    {"☆".repeat(5 - Math.round(averageRating))}
                  </Text>
                  <Text style={styles.ratingCount}>{reviewCount.toLocaleString()}</Text>
                </>
              ) : (
                <Text style={styles.ratingCount}>아직 리뷰가 없어요</Text>
              )}
            </Pressable>
          </View>

          <Section title="서비스 · 가격">
            {services.map((service) => {
              const isSelected = service.categoryId === (selectedService?.categoryId ?? null);
              return (
                <Pressable
                  key={service.id}
                  style={[styles.serviceRow, isSelected && styles.serviceRowSelected]}
                  onPress={() => setSelectedCategoryId(service.categoryId)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.serviceName}>{service.categoryName}</Text>
                    {service.description && (
                      <Text style={styles.serviceDescription}>{service.description}</Text>
                    )}
                  </View>
                  <Text style={styles.servicePrice}>{formatServicePrice(service)}</Text>
                </Pressable>
              );
            })}
            {services.length === 0 && (
              <Text style={styles.emptyText}>등록된 서비스가 없어요.</Text>
            )}
          </Section>

          <PhotoStack title="작업 사진" photos={workPhotos} />
          <PhotoStack title="전/후 비교" photos={beforeAfterPhotos} />

          <Section title="이용 안내">
            <View style={styles.infoTable}>
              <InfoRow label="서비스 지역" value={regionNames.join(", ") || "-"} />
              <InfoRow label="영업시간" value={company.businessHours ?? "-"} />
              <InfoRow
                label="예약 가능 여부"
                value={company.isAvailable ? "예약 가능" : "예약 마감"}
              />
              {company.phone && (
                <Pressable onPress={() => Linking.openURL(`tel:${company.phone}`)}>
                  <InfoRow label="연락처" value={company.phone} valueStyle={styles.phoneLink} last />
                </Pressable>
              )}
            </View>
          </Section>

          <Section title={`리뷰${reviewCount > 0 ? ` (${reviewCount})` : ""}`}>
            <RatingDistribution averageRating={averageRating} reviews={reviews} />
            {reviewPhotos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewPhotoStrip}>
                {reviewPhotos.map((photo) => (
                  <Pressable key={photo.key} onPress={() => setZoomedPhoto(photo.url)}>
                    <Image source={{ uri: photo.url }} style={styles.reviewPhotoThumb} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
            {reviews.map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewStars}>
                    {"★".repeat(review.rating)}
                    {"☆".repeat(5 - review.rating)}
                  </Text>
                  <Text style={styles.reviewDate}>
                    {new Date(review.createdAt).toLocaleDateString("ko-KR")}
                  </Text>
                </View>
                <Text style={styles.reviewAuthor}>{review.customerName}</Text>
                <Text style={styles.reviewContent}>{review.content}</Text>
                {review.photoUrls.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewCardPhotoRow}>
                    {review.photoUrls.map((url) => (
                      <Pressable key={url} onPress={() => setZoomedPhoto(url)}>
                        <Image source={{ uri: url }} style={styles.reviewPhoto} />
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
            ))}
          </Section>
        </View>
      </Screen>

      {services.length > 0 && (
        <Animated.View
          onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
          style={[
            styles.stickyBar,
            { paddingBottom: insets.bottom + spacing.md },
            { transform: [{ translateY: barTranslateY }] },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.stickyBarLabel}>{selectedService ? "선택한 서비스" : "시작가"}</Text>
            <Text style={styles.stickyBarPrice}>
              {barService ? formatServicePrice(barService) : null}
              {!selectedService && "~"}
            </Text>
          </View>
          <Pressable style={styles.stickyBarButton} onPress={handleReserveFromBar}>
            <Text style={styles.stickyBarButtonText}>
              {company.websiteUrl ? "홈페이지에서 예약하기" : "예약하기"}
            </Text>
          </Pressable>
        </Animated.View>
      )}

      {services.length > 0 ? (
        <Animated.View style={{ transform: [{ translateY: buttonTranslateY }] }}>
          <ScrollToTopButton
            visible={showScrollTop}
            bottomOffset={buttonRestingBottom}
            onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
          />
        </Animated.View>
      ) : (
        <ScrollToTopButton
          visible={showScrollTop}
          onPress={() => scrollRef.current?.scrollTo({ y: 0, animated: true })}
        />
      )}

      <Modal
        visible={!!zoomedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setZoomedPhoto(null)}
      >
        <Pressable style={styles.zoomOverlay} onPress={() => setZoomedPhoto(null)}>
          {zoomedPhoto && (
            <Image source={{ uri: zoomedPhoto }} style={styles.zoomImage} resizeMode="contain" />
          )}
          <Pressable
            style={styles.zoomCloseButton}
            onPress={() => setZoomedPhoto(null)}
            hitSlop={8}
          >
            <Text style={styles.zoomCloseText}>×</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  valueStyle,
  last,
}: {
  label: string;
  value: string;
  valueStyle?: object;
  last?: boolean;
}) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowDivider]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  noPad: { paddingHorizontal: 0, paddingTop: 0 },
  galleryImage: { height: SCREEN_WIDTH, backgroundColor: colors.surfaceMuted },
  thumbRow: { marginTop: spacing.sm, paddingHorizontal: spacing.xl },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    marginRight: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    opacity: 0.6,
  },
  thumbActive: { opacity: 1, borderWidth: 2, borderColor: colors.primary },
  galleryPlaceholder: {
    width: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  galleryPlaceholderEmoji: { fontSize: 48 },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nameRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm - 2, flexShrink: 1 },
  name: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, flexShrink: 1 },
  favoriteIcon: { fontSize: 26, color: colors.danger },
  introRatingRow: { flexDirection: "row", alignItems: "flex-start", marginTop: spacing.sm },
  intro: { flex: 1, marginRight: spacing.md, fontSize: fontSize.base, color: colors.text },
  ratingBlock: { alignItems: "flex-end", marginLeft: "auto" },
  ratingStars: { fontSize: fontSize.xl, letterSpacing: 1, color: colors.star },
  ratingCount: { marginTop: 2, fontSize: fontSize.xs, color: colors.textMuted },
  section: { marginTop: spacing.xl },
  sectionTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  sectionBody: { marginTop: spacing.sm },
  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  serviceRowSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceMuted },
  serviceName: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  serviceDescription: { marginTop: 2, fontSize: fontSize.xs, color: colors.textMuted },
  servicePrice: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  emptyText: { fontSize: fontSize.base, color: colors.textFaint },
  infoTable: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  infoRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  infoLabel: { fontSize: fontSize.base, color: colors.textMuted },
  infoValue: { fontSize: fontSize.base, color: colors.text, textAlign: "right", flexShrink: 1 },
  phoneLink: { textDecorationLine: "underline" },
  reviewPhotoStrip: { marginTop: spacing.sm },
  reviewPhotoThumb: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    marginRight: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm + 2,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewStars: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.star },
  reviewDate: { fontSize: fontSize.xs, color: colors.textFaint },
  reviewAuthor: { marginTop: 2, fontSize: fontSize.xs, color: colors.textMuted },
  reviewContent: { marginTop: spacing.xs, fontSize: fontSize.base, color: colors.text },
  reviewCardPhotoRow: { marginTop: spacing.sm },
  reviewPhoto: { width: 96, height: 96, borderRadius: radius.md, marginRight: spacing.sm },
  stickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm + 2,
  },
  stickyBarLabel: { fontSize: fontSize.xs, color: colors.textFaint },
  stickyBarPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  stickyBarButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  stickyBarButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.onPrimary },
  zoomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomImage: { width: "100%", height: "100%" },
  zoomCloseButton: {
    position: "absolute",
    top: spacing.xxl,
    right: spacing.xl,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  zoomCloseText: { fontSize: 22, color: "#fff", lineHeight: 24 },
});
