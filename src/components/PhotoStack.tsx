import { ReactNode, useEffect, useState } from "react";
import { Dimensions, Image as RNImage, Pressable, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
// Coupang-style "더 보기" fold height — enough to show a couple of photos'
// worth before the customer has to opt into the rest.
const COLLAPSED_HEIGHT = 1000;

export type PhotoItem = { id: string; url: string };

/**
 * Coupang-style detail images: full-width, each at its own natural aspect
 * ratio (never cropped to a square) and stacked with zero gap — mirrors
 * the web app's src/components/company-detail/photo-stack.tsx. RN doesn't
 * know an image's intrinsic size until it's fetched, so each photo's
 * aspect ratio is looked up via the core Image.getSize and applied as a
 * style (RN's `aspectRatio` behaves like the CSS property once width is
 * set). Rendering itself uses expo-image rather than core RN Image —
 * core Image decodes a remote bitmap at whatever size its view happened
 * to be laid out to at load time, which for a full-width, aspect-ratio-only
 * box came out blurry (especially on Android); expo-image's own pipeline
 * decodes at the actual target size instead.
 *
 * Collapses behind a "더 보기" button once total rendered height would
 * exceed the fold — decided from the known aspect ratios rather than a
 * DOM measurement, so it correctly folds a single very tall photo just as
 * well as several stacked ones (photo count alone says nothing about
 * height). extraTile (an owner's "+" upload button, when used editably)
 * always stays outside the fold.
 */
export function PhotoStack({
  title,
  photos,
  extraTile,
  photoOverlay,
}: {
  title: string;
  photos: PhotoItem[];
  extraTile?: ReactNode;
  photoOverlay?: (photo: PhotoItem) => ReactNode;
}) {
  const [ratios, setRatios] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    photos.forEach((photo) => {
      if (ratios[photo.id] != null) return;
      RNImage.getSize(
        photo.url,
        (w, h) => setRatios((prev) => ({ ...prev, [photo.id]: h > 0 ? w / h : 1 })),
        () => setRatios((prev) => ({ ...prev, [photo.id]: 1 }))
      );
    });
    // Only re-run when the photo list itself changes — `ratios` is read but
    // deliberately excluded so this doesn't loop on every measurement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos]);

  if (photos.length === 0 && !extraTile) return null;

  const allLoaded = photos.every((p) => ratios[p.id] != null);
  const totalHeight = photos.reduce((sum, p) => {
    const ratio = ratios[p.id];
    return ratio ? sum + SCREEN_WIDTH / ratio : sum;
  }, 0);
  const overflowing = allLoaded && totalHeight > COLLAPSED_HEIGHT;
  const collapsible = overflowing && !expanded;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.stack, collapsible && styles.collapsed]}>
        {photos.map((photo) => {
          const ratio = ratios[photo.id];
          return (
            <View key={photo.id} style={styles.photoWrap}>
              {ratio ? (
                <ExpoImage
                  source={{ uri: photo.url }}
                  style={[styles.photo, { aspectRatio: ratio }]}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.photo, styles.photoLoading]} />
              )}
              {photoOverlay?.(photo)}
            </View>
          );
        })}
      </View>
      {collapsible && (
        <Pressable onPress={() => setExpanded(true)} style={styles.moreButton}>
          <Text style={styles.moreButtonText}>이미지 더 보기 ⌄</Text>
        </Pressable>
      )}
      {extraTile}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  sectionTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  stack: { marginTop: spacing.sm },
  collapsed: { maxHeight: COLLAPSED_HEIGHT, overflow: "hidden" },
  photoWrap: { width: "100%", backgroundColor: colors.surfaceMuted },
  photo: { width: "100%" },
  photoLoading: { aspectRatio: 1 },
  moreButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm + 2,
    alignItems: "center",
  },
  moreButtonText: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.textMuted },
});
