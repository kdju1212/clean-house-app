import { useCallback, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  fetchCompanyDetail,
  toggleCompanyFavorite,
  type CompanyDetail,
} from "../../../src/api/companies";
import { getStoredToken } from "../../../src/storage/auth-storage";
import { Screen } from "../../../src/components/Screen";
import { LoadingView } from "../../../src/components/LoadingView";
import { Card } from "../../../src/components/Card";
import { colors, fontSize, fontWeight, radius, spacing } from "../../../src/theme";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function CompanyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [data, setData] = useState<CompanyDetail | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);

  const load = useCallback(() => {
    fetchCompanyDetail(id).then(setData);
    getStoredToken().then((token) => setLoggedIn(!!token));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
        price: String(service.price),
      },
    });
  }

  if (!data) {
    return <LoadingView />;
  }

  const { company, services, photos, regionNames, averageRating, reviewCount, reviews, isFavorited } =
    data;
  const mainPhoto = company.mainImageUrl;
  const galleryPhotos = mainPhoto
    ? [
        { id: "main", url: mainPhoto },
        ...photos.filter((p) => p.url !== mainPhoto),
      ]
    : photos;
  const workPhotos = photos.filter((p) => p.type === "WORK");
  const beforeAfterPhotos = photos.filter((p) => p.type === "BEFORE_AFTER");

  return (
    <Screen scroll style={styles.noPad}>
      {galleryPhotos.length > 0 ? (
        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
          {galleryPhotos.map((photo) => (
            <Image
              key={photo.id}
              source={{ uri: photo.url }}
              style={[styles.galleryImage, { width: SCREEN_WIDTH }]}
            />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.galleryPlaceholder}>
          <Text style={styles.galleryPlaceholderEmoji}>🧽</Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name}>{company.name}</Text>
          <Pressable onPress={handleToggleFavorite} disabled={togglingFavorite} hitSlop={8}>
            <Text style={styles.favoriteIcon}>{isFavorited ? "♥" : "♡"}</Text>
          </Pressable>
        </View>
        <Text style={styles.ratingLine}>
          {reviewCount > 0 ? `★ ${averageRating.toFixed(1)} 리뷰 ${reviewCount}개` : "아직 리뷰가 없어요"}
        </Text>
        {company.introText && <Text style={styles.intro}>{company.introText}</Text>}

        <Section title="서비스 · 가격">
          {services.map((service) => (
            <View key={service.id} style={styles.serviceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceName}>{service.categoryName}</Text>
                {service.description && (
                  <Text style={styles.serviceDescription}>{service.description}</Text>
                )}
                <Text style={styles.servicePrice}>{service.price.toLocaleString()}원</Text>
              </View>
              <Pressable style={styles.reserveButton} onPress={() => goToReserve(service)}>
                <Text style={styles.reserveButtonText}>예약하기</Text>
              </Pressable>
            </View>
          ))}
          {services.length === 0 && (
            <Text style={styles.emptyText}>등록된 서비스가 없어요.</Text>
          )}
        </Section>

        {workPhotos.length > 0 && (
          <Section title="작업 사진">
            <View style={styles.photoGrid}>
              {workPhotos.map((photo) => (
                <Image key={photo.id} source={{ uri: photo.url }} style={styles.gridPhoto} />
              ))}
            </View>
          </Section>
        )}

        {beforeAfterPhotos.length > 0 && (
          <Section title="전/후 비교">
            <View style={styles.photoGrid}>
              {beforeAfterPhotos.map((photo) => (
                <Image key={photo.id} source={{ uri: photo.url }} style={styles.gridPhoto} />
              ))}
            </View>
          </Section>
        )}

        <Card style={styles.infoCard}>
          <InfoRow label="서비스 지역" value={regionNames.join(", ") || "-"} />
          <InfoRow label="영업시간" value={company.businessHours ?? "-"} />
          <InfoRow label="예약 가능 여부" value={company.isAvailable ? "예약 가능" : "예약 마감"} />
          {company.phone && (
            <Pressable onPress={() => Linking.openURL(`tel:${company.phone}`)}>
              <InfoRow label="연락처" value={company.phone} valueStyle={styles.phoneLink} />
            </Pressable>
          )}
        </Card>

        <Section title={`리뷰${reviewCount > 0 ? ` (${reviewCount})` : ""}`}>
          {reviews.length === 0 ? (
            <Text style={styles.emptyText}>아직 작성된 리뷰가 없어요.</Text>
          ) : (
            reviews.map((review) => (
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
                {review.photoUrl && (
                  <Image source={{ uri: review.photoUrl }} style={styles.reviewPhoto} />
                )}
              </View>
            ))
          )}
        </Section>
      </View>
    </Screen>
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
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  noPad: { paddingHorizontal: 0, paddingTop: 0 },
  galleryImage: { height: SCREEN_WIDTH, backgroundColor: colors.surfaceMuted },
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
  name: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, color: colors.text, flexShrink: 1 },
  favoriteIcon: { fontSize: 26, color: colors.danger },
  ratingLine: { marginTop: spacing.xs, fontSize: fontSize.base, color: colors.textMuted },
  intro: { marginTop: spacing.sm, fontSize: fontSize.base, color: colors.text },
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
  serviceName: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  serviceDescription: { marginTop: 2, fontSize: fontSize.xs, color: colors.textMuted },
  servicePrice: { marginTop: 2, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  reserveButton: {
    marginLeft: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  reserveButtonText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.onPrimary },
  emptyText: { fontSize: fontSize.base, color: colors.textFaint },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  gridPhoto: { width: 100, height: 100, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  infoCard: { marginTop: spacing.xl, gap: spacing.sm + 2 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md },
  infoLabel: { fontSize: fontSize.base, color: colors.textMuted },
  infoValue: { fontSize: fontSize.base, color: colors.text, textAlign: "right", flexShrink: 1 },
  phoneLink: { textDecorationLine: "underline" },
  reviewCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewStars: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.star },
  reviewDate: { fontSize: fontSize.xs, color: colors.textFaint },
  reviewAuthor: { marginTop: 2, fontSize: fontSize.xs, color: colors.textMuted },
  reviewContent: { marginTop: spacing.xs, fontSize: fontSize.base, color: colors.text },
  reviewPhoto: { marginTop: spacing.sm, width: 96, height: 96, borderRadius: radius.md },
});
