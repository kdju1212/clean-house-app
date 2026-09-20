import { useCallback, useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { fetchCompanyDetail, type CompanyDetail } from "../../../src/api/companies";
import { Screen } from "../../../src/components/Screen";
import { LoadingView } from "../../../src/components/LoadingView";
import { RatingDistribution } from "../../../src/components/RatingDistribution";
import { colors, fontSize, fontWeight, radius, spacing } from "../../../src/theme";

/**
 * Coupang-style dedicated review list: tapping the ★ rating line on the
 * company detail screen lands here instead of scrolling within the same
 * page — see companies/[id]/index.tsx's rating Pressable.
 */
export default function CompanyReviewsScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const [data, setData] = useState<CompanyDetail | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchCompanyDetail(id).then(setData);
    }, [id])
  );

  if (!data) {
    return <LoadingView />;
  }

  const { averageRating, reviewCount, reviews } = data;
  const reviewPhotos = reviews.flatMap((r) =>
    r.photoUrls.map((url) => ({ key: `${r.id}-${url}`, url }))
  );

  return (
    <Screen scroll>
      <Text style={styles.title}>
        {name ?? data.company.name} 리뷰{reviewCount > 0 ? ` (${reviewCount})` : ""}
      </Text>

      <RatingDistribution averageRating={averageRating} reviews={reviews} />

      {reviewPhotos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
          {reviewPhotos.map((photo) => (
            <Pressable key={photo.key} onPress={() => setZoomedPhoto(photo.url)}>
              <Image source={{ uri: photo.url }} style={styles.photoThumb} />
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
          <Pressable style={styles.zoomCloseButton} onPress={() => setZoomedPhoto(null)} hitSlop={8}>
            <Text style={styles.zoomCloseText}>×</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  photoStrip: { marginTop: spacing.sm },
  photoThumb: {
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
