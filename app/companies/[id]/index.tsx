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
import { PhotoStack } from "../../../src/components/PhotoStack";
import { RatingDistribution } from "../../../src/components/RatingDistribution";
import { ScrollToTopButton } from "../../../src/components/ScrollToTopButton";
import { Icon } from "../../../src/components/Icon";
import { getPricingQuantityKey, PRICING_UNIT_LABEL } from "../../../src/utils/reservation-questions";
import { todayDateStr } from "../../../src/components/CalendarDatePicker";
import { colors, fontSize, fontWeight, radius, spacing } from "../../../src/theme";

const WEEKDAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];

/** "오늘 15:00부터 예약 가능" / "내일 09:00부터 예약 가능" / "9월 30일(수)
 * 10:00부터 예약 가능" — mirrors the web detail page's formatter. */
function formatNextAvailableLabel(slot: { date: string; time: string }): string {
  const todayStr = todayDateStr();
  const tomorrowStr = new Date(new Date(`${todayStr}T00:00:00`).getTime() + 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  if (slot.date === todayStr) return `오늘 ${slot.time}부터 예약 가능`;
  if (slot.date === tomorrowStr) return `내일 ${slot.time}부터 예약 가능`;

  const [, month, day] = slot.date.split("-").map(Number);
  const weekday = WEEKDAY_NAMES[new Date(`${slot.date}T00:00:00`).getDay()];
  return `${month}월 ${day}일(${weekday}) ${slot.time}부터 예약 가능`;
}

// Coupang's palette for this screen specifically: blue actions, red price,
// orange stars — see the web repo's companies/[id] page for the same look.
const BLUE = "#346aff";
const RED = "#e52528";
const STAR = "#ff9600";
const SEPARATOR = "#f2f3f6";

// Coupang shows a few reviews inline and sends the rest to the dedicated
// review screen (companies/[id]/reviews) instead of one endless scroll.
const PREVIEW_REVIEW_COUNT = 3;

type Service = CompanyDetail["services"][number];

function formatServicePrice(service: Service): string {
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
  // One shared full-screen viewer for every photo on this screen (hero,
  // review strip, per-review photos) — tap opens it, tap again closes it.
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initialCategoryId ?? null
  );
  const [optionSheetOpen, setOptionSheetOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [barHeight, setBarHeight] = useState(0);
  const [detailY, setDetailY] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  // Slides the reserve bar out of view while the customer is actively
  // reading down the page, back in when they scroll back up — restores
  // behavior lost when this screen was rewritten for the Coupang layout
  // (see 6c3b7e4, 1770957, a657ebd, ea196e3, before that rewrite).
  const lastScrollY = useRef(0);
  const barHidden = useRef(false);
  const [barTranslateY] = useState(() => new Animated.Value(0));
  // How far the reserve bar has to travel to be fully off-screen.
  const maxBarHide = barHeight + insets.bottom + spacing.xxl;
  // Button's bottom edge when the bar is fully shown: exactly 7px above
  // the bar's top edge (barHeight already includes the bar's own
  // safe-area padding, so this is the bar's true top, not an approximation).
  const buttonRestingBottom = barHeight + 7;
  // Where the button belongs once the bar is fully hidden — the same spot
  // it would sit at if there were no bar at all.
  const buttonNoBarBottom = insets.bottom + spacing.xxl;
  // Ties the button's position to the same Animated.Value the bar uses, so
  // it drops down right along with the bar instead of floating in empty
  // space above a hidden one.
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

  function goToReserve(service: Service) {
    if (!data) return;
    router.push({
      pathname: "/companies/[id]/reserve",
      params: {
        id,
        name: data.company.name,
        categoryId: service.categoryId,
      },
    });
  }

  function handleReserve() {
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
    // pick it first just to confirm the obvious choice.
    const selected =
      data.services.find((s) => s.categoryId === selectedCategoryId) ??
      (data.services.length === 1 ? data.services[0] : null);
    if (selected) {
      goToReserve(selected);
      return;
    }
    // Nothing picked yet — the reservation screen has no category picker
    // of its own, so open the option sheet instead of guessing.
    setOptionSheetOpen(true);
  }

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/categories");
  }

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    // Only touch state when the threshold is actually crossed — re-rendering
    // this screen on every scroll frame is what used to make it stutter.
    const shouldShow = y > 400;
    if (shouldShow !== showScrollTop) setShowScrollTop(shouldShow);

    const diff = y - lastScrollY.current;
    // Ignore tiny jitters (rubber-banding, a light finger twitch) so the
    // bar doesn't flicker — only react to an actual, deliberate scroll.
    if (Math.abs(diff) > 10) {
      const hide = diff > 0 && y > 80;
      // Only start a new animation when the target actually flips —
      // continuing to scroll in the same direction would otherwise keep
      // re-triggering .start() every ~10px, restarting the in-flight
      // animation from wherever it currently was and making it look
      // stuttery instead of one clean slide.
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

  if (!data) {
    return <LoadingView />;
  }

  const {
    company,
    services,
    photos,
    regionNames,
    averageRating,
    reviewCount,
    reviews,
    isFavorited,
    nextAvailable,
  } = data;
  const cheapest = services.reduce<Service | null>(
    (min, s) => (!min || s.price < min.price ? s : min),
    null
  );
  const selectedService =
    services.find((s) => s.categoryId === selectedCategoryId) ??
    (services.length === 1 ? services[0] : null);
  const priceService = selectedService ?? cheapest;

  // Untagged photos (categoryId null) show for every category — a
  // company that never bothers tagging anything keeps working exactly
  // like before this feature existed.
  const matchesSelected = (photo: CompanyDetail["photos"][number]) =>
    photo.categoryId === null || photo.categoryId === selectedService?.categoryId;
  const isTemplate = company.detailPageMode === "SITE_TEMPLATE";
  const detailPhotoType = isTemplate ? "TEMPLATE" : "WORK";
  const workPhotos = photos.filter((p) => p.type === detailPhotoType && matchesSelected(p));
  const hasDetailPhotos = workPhotos.length > 0;
  const reviewPhotos = reviews.flatMap((r) =>
    r.photoUrls.map((url) => ({ key: `${r.id}-${url}`, url }))
  );
  const introText = selectedService?.description || company.introText;
  const roundedStars = Math.round(averageRating);
  const regionText = regionNames.join(", ");
  const openReviews = () =>
    router.push({ pathname: "/companies/[id]/reviews", params: { id, name: company.name } });

  return (
    <View style={styles.flex}>
      <Screen
        ref={scrollRef}
        scroll
        style={{ ...styles.noPad, paddingBottom: barHeight + spacing.xl }}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onScroll={handleScroll}
      >
        {/* Hero — full-bleed main photo with Coupang's overlaid controls */}
        <View>
          {company.mainImageUrl ? (
            <Pressable onPress={() => setZoomedPhoto(company.mainImageUrl)}>
              <Image source={{ uri: company.mainImageUrl }} style={styles.hero} />
            </Pressable>
          ) : (
            <View style={[styles.hero, styles.heroPlaceholder]}>
              <Text style={styles.heroPlaceholderEmoji}>🧽</Text>
            </View>
          )}
          <Pressable
            onPress={handleBack}
            hitSlop={8}
            style={[styles.backButton, { top: insets.top + spacing.sm }]}
          >
            <Icon name="chevronLeft" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.heroActions}>
            <Pressable
              onPress={handleToggleFavorite}
              disabled={togglingFavorite}
              style={styles.heartButton}
            >
              <Icon
                name={isFavorited ? "heartFilled" : "heart"}
                size={28}
                color={isFavorited ? RED : colors.text}
              />
            </Pressable>
            {hasDetailPhotos && (
              <Pressable
                onPress={() => scrollRef.current?.scrollTo({ y: detailY, animated: true })}
                style={styles.detailPill}
              >
                <Text style={styles.detailPillText}>상세정보</Text>
                <Icon name="chevronRight" size={16} color={colors.text} />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.trustRow}>
            <View style={styles.titleWrap}>
              {company.isVerified ? (
                <View style={styles.trustLine}>
                  <View style={styles.trustCheck}>
                    <Text style={styles.trustCheckText}>✓</Text>
                  </View>
                  <Text style={styles.trustText}>
                    관리자가 <Text style={{ color: colors.accent }}>인증</Text>한 업체예요
                  </Text>
                </View>
              ) : company.hasBusinessRegistration ? (
                <Text style={styles.trustText}>사업자등록을 마친 업체예요</Text>
              ) : null}
              <Text style={styles.name}>{company.name}</Text>
              <View style={styles.statusTag}>
                <Text style={styles.statusTagText}>
                  {company.isAvailable ? "예약 가능" : "예약 마감"}
                </Text>
              </View>
              {nextAvailable && (
                <Text style={styles.nextAvailableText}>
                  {formatNextAvailableLabel(nextAvailable)}
                </Text>
              )}
            </View>
            <Pressable onPress={openReviews} style={styles.ratingBlock}>
              {reviewCount > 0 ? (
                <>
                  <Text style={styles.stars}>
                    <Text style={{ color: STAR }}>{"★".repeat(roundedStars)}</Text>
                    <Text style={{ color: "#d4d4d4" }}>{"★".repeat(5 - roundedStars)}</Text>
                  </Text>
                  <Text style={styles.ratingCount}>({reviewCount.toLocaleString()})</Text>
                </>
              ) : (
                <Text style={styles.noReviews}>아직 리뷰가 없어요</Text>
              )}
            </Pressable>
          </View>

          {introText && (
            <View style={styles.introChip}>
              <Icon name="sparkle" size={16} color={BLUE} style={styles.introChipIcon} />
              <Text style={styles.introChipText}>{introText}</Text>
            </View>
          )}

          {(regionText || company.businessHours) && (
            <View style={styles.attributes}>
              {regionText ? <Attribute label="서비스지역" value={regionText} /> : null}
              {company.businessHours ? <Attribute label="영업시간" value={company.businessHours} /> : null}
            </View>
          )}

          {services.length > 0 ? (
            <>
              <Pressable style={styles.optionBox} onPress={() => setOptionSheetOpen(true)}>
                <View style={styles.flexShrink}>
                  <Text style={styles.optionLabel}>옵션선택</Text>
                  <Text style={styles.optionValue} numberOfLines={1}>
                    {selectedService ? selectedService.categoryName : "서비스를 선택해주세요"}
                  </Text>
                </View>
                <Icon name="chevronRight" size={24} color={colors.text} />
              </Pressable>

              {priceService && (
                <View style={styles.priceRow}>
                  {!selectedService && <Text style={styles.priceFrom}>최저</Text>}
                  <Text style={styles.price}>{formatServicePrice(priceService)}</Text>
                  {!selectedService && <Text style={styles.priceTilde}>~</Text>}
                </View>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>등록된 서비스가 없어요.</Text>
          )}
        </View>

        {hasDetailPhotos && (
          <View onLayout={(e) => setDetailY(e.nativeEvent.layout.y)}>
            <View style={styles.separator} />
            <View style={styles.photoSection}>
              <PhotoStack
                title="상세페이지"
                photos={workPhotos}
                variant={isTemplate ? "template" : "custom"}
              />
            </View>
          </View>
        )}

        <View style={styles.separator} />
        <View style={styles.sectionPad}>
          <Text style={styles.sectionTitle}>이용 안내</Text>
          <View style={styles.infoTable}>
            <InfoRow label="서비스 지역" value={regionText || "-"} />
            <InfoRow label="영업시간" value={company.businessHours ?? "-"} />
            <InfoRow label="예약 가능 여부" value={company.isAvailable ? "예약 가능" : "예약 마감"} />
            {company.phone && (
              <Pressable onPress={() => Linking.openURL(`tel:${company.phone}`)}>
                <InfoRow label="연락처" value={company.phone} valueStyle={styles.phoneLink} last />
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.separator} />
        <View style={styles.sectionPad}>
          <View style={styles.reviewHeaderRow}>
            <Text style={styles.sectionTitle}>
              리뷰 {reviewCount > 0 && <Text style={{ color: BLUE }}>{reviewCount.toLocaleString()}</Text>}
            </Text>
            {reviewCount > 0 && (
              <Pressable onPress={openReviews} style={styles.seeAll} hitSlop={8}>
                <Text style={styles.seeAllText}>전체보기</Text>
                <Icon name="chevronRight" size={16} color={colors.textMuted} />
              </Pressable>
            )}
          </View>
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
          {reviews.slice(0, PREVIEW_REVIEW_COUNT).map((review) => (
            <View key={review.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewStars}>
                  {"★".repeat(review.rating)}
                  <Text style={{ color: "#d4d4d4" }}>{"★".repeat(5 - review.rating)}</Text>
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
          {reviews.length > PREVIEW_REVIEW_COUNT && (
            <Pressable onPress={openReviews} style={styles.allReviewsButton}>
              <Text style={styles.allReviewsButtonText}>
                리뷰 {reviewCount.toLocaleString()}개 전체보기
              </Text>
            </Pressable>
          )}
        </View>
      </Screen>

      {services.length > 0 && (
        <Animated.View
          onLayout={(e) => setBarHeight(e.nativeEvent.layout.height)}
          style={[
            styles.bottomBar,
            { paddingBottom: insets.bottom + spacing.md },
            { transform: [{ translateY: barTranslateY }] },
          ]}
        >
          {company.phone && (
            <Pressable
              style={[styles.barButton, styles.barButtonOutline]}
              onPress={() => Linking.openURL(`tel:${company.phone}`)}
            >
              <Text style={[styles.barButtonText, { color: BLUE }]}>전화문의</Text>
            </Pressable>
          )}
          <Pressable style={[styles.barButton, styles.barButtonSolid]} onPress={handleReserve}>
            <Text style={[styles.barButtonText, { color: colors.onPrimary }]}>
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

      {/* 옵션선택 bottom sheet */}
      <Modal
        visible={optionSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setOptionSheetOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setOptionSheetOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>옵션선택</Text>
              <Pressable onPress={() => setOptionSheetOpen(false)} hitSlop={8}>
                <Text style={styles.sheetClose}>×</Text>
              </Pressable>
            </View>
            <ScrollView style={styles.sheetList}>
              {services.map((service) => {
                const isSelected = service.categoryId === selectedService?.categoryId;
                return (
                  <Pressable
                    key={service.id}
                    style={[styles.sheetRow, isSelected && styles.sheetRowSelected]}
                    onPress={() => {
                      setSelectedCategoryId(service.categoryId);
                      setOptionSheetOpen(false);
                    }}
                  >
                    <View style={styles.flexShrink}>
                      <Text style={[styles.sheetRowName, isSelected && styles.sheetRowNameSelected]}>
                        {service.categoryName}
                      </Text>
                      {service.description && (
                        <Text style={styles.sheetRowDesc} numberOfLines={1}>
                          {service.description}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.sheetRowPrice}>{formatServicePrice(service)}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

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

function Attribute({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.attributeRow}>
      <Text style={styles.attributeLabel}>{label}</Text>
      <Text style={styles.attributeValue}>{value}</Text>
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
  flexShrink: { flexShrink: 1 },
  noPad: { paddingHorizontal: 0, paddingTop: 0 },

  hero: { width: SCREEN_WIDTH, height: SCREEN_WIDTH, backgroundColor: colors.surfaceMuted },
  heroPlaceholder: { alignItems: "center", justifyContent: "center" },
  heroPlaceholderEmoji: { fontSize: 56 },
  backButton: {
    position: "absolute",
    left: spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroActions: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  heartButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  detailPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm + 2,
    paddingVertical: spacing.sm,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  detailPillText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },

  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  trustRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  titleWrap: { flex: 1 },
  trustLine: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  trustCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#18a058",
    alignItems: "center",
    justifyContent: "center",
  },
  trustCheckText: { color: colors.onPrimary, fontSize: 11, fontWeight: fontWeight.bold },
  trustText: { marginBottom: 4, fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  ratingBlock: { alignItems: "flex-end", paddingTop: 2 },
  stars: { fontSize: 22, letterSpacing: -1 },
  ratingCount: { marginTop: 2, fontSize: fontSize.lg, color: BLUE },
  noReviews: { fontSize: fontSize.sm, color: colors.textFaint },
  name: { fontSize: 19, lineHeight: 26, color: colors.text },

  statusTag: {
    alignSelf: "flex-start",
    marginTop: spacing.sm - 2,
    backgroundColor: "#6b7684",
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusTagText: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.onPrimary },
  nextAvailableText: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: "#18a058",
  },

  introChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    marginTop: spacing.md,
    backgroundColor: "#f5f6f8",
    borderRadius: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
    maxWidth: "100%",
  },
  introChipIcon: { marginTop: 2, marginRight: 6 },
  introChipText: { flexShrink: 1, fontSize: fontSize.lg, color: "#404040" },

  attributes: { marginTop: spacing.lg, gap: 6 },
  attributeRow: { flexDirection: "row", gap: spacing.md },
  attributeLabel: { width: 76, fontSize: fontSize.lg, color: colors.textFaint },
  attributeValue: { flex: 1, fontSize: fontSize.lg, color: "#262626" },

  optionBox: {
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#d4d4d4",
    borderRadius: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionLabel: { fontSize: fontSize.md, color: colors.textMuted },
  optionValue: { marginTop: 2, fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  priceRow: { marginTop: spacing.xl, flexDirection: "row", alignItems: "baseline", gap: 6 },
  priceFrom: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: colors.textMuted },
  price: { fontSize: 28, fontWeight: fontWeight.bold, color: RED },
  priceTilde: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: RED },
  emptyText: { marginTop: spacing.xl, fontSize: fontSize.base, color: colors.textFaint },

  separator: { height: 8, backgroundColor: SEPARATOR },
  sectionPad: { paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  // PhotoStack brings its own top margin per section.
  photoSection: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },

  infoTable: {
    marginTop: spacing.md,
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

  reviewHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  seeAll: { flexDirection: "row", alignItems: "center" },
  seeAllText: { fontSize: fontSize.md, color: colors.textMuted },
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
  reviewStars: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: STAR },
  reviewDate: { fontSize: fontSize.xs, color: colors.textFaint },
  reviewAuthor: { marginTop: 2, fontSize: fontSize.xs, color: colors.textMuted },
  reviewContent: { marginTop: spacing.xs, fontSize: fontSize.base, color: colors.text },
  reviewCardPhotoRow: { marginTop: spacing.sm },
  reviewPhoto: { width: 96, height: 96, borderRadius: radius.md, marginRight: spacing.sm },
  allReviewsButton: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: "#d4d4d4",
    borderRadius: 6,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  allReviewsButtonText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, color: "#262626" },

  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  barButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    paddingVertical: spacing.md + 2,
  },
  barButtonOutline: { borderWidth: 1, borderColor: BLUE, backgroundColor: colors.bg },
  barButtonSolid: { backgroundColor: BLUE },
  barButtonText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },

  sheetBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sheetTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  sheetClose: { fontSize: 26, color: colors.textFaint, lineHeight: 28 },
  sheetList: { maxHeight: 420 },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sheetRowSelected: { backgroundColor: "#f0f4ff" },
  sheetRowName: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text },
  sheetRowNameSelected: { fontWeight: fontWeight.bold, color: BLUE },
  sheetRowDesc: { marginTop: 2, fontSize: fontSize.sm, color: colors.textMuted },
  sheetRowPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },

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
