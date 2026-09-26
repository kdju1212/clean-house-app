import { ReactNode, useEffect, useState } from "react";
import { Dimensions, Image as RNImage, Pressable, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
// Coupang-style "더 보기" fold height — enough to show a couple of photos'
// worth before the customer has to opt into the rest.
const COLLAPSED_HEIGHT = 1500;

export type PhotoItem = {
  id: string;
  url: string;
  // Shown under the photo only in the "template" variant.
  caption?: string | null;
};

const TEMPLATE_GAP = spacing.xl;

// Rough per-photo allowance added to the height estimate below when a
// caption is present — RN has no ResizeObserver equivalent to measure real
// rendered height, so unlike the web version this can only ever be an
// estimate (a couple of text lines' worth), just enough to keep the
// overflow decision in the right ballpark.
const CAPTION_HEIGHT_ESTIMATE = 60;

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
 * In SITE_TEMPLATE mode each photo can carry its own caption, shown as a
 * text block right under it — assembling several ordinary photos into
 * something that still reads as one continuous long page.
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
  captionSlot,
  variant = "custom",
}: {
  /** Omit when this stack is nested under a heading the caller already
   * renders itself (e.g. the profile screen's mode-toggle wrapper). */
  title?: string;
  photos: PhotoItem[];
  extraTile?: ReactNode;
  photoOverlay?: (photo: PhotoItem) => ReactNode;
  /** Replaces the plain caption <Text> — the profile screen's
   * SITE_TEMPLATE editor uses this to render an editable input instead. */
  captionSlot?: (photo: PhotoItem) => ReactNode;
  /** "custom" (CUSTOM_IMAGE): edge-to-edge, no gap, no captions.
   * "template" (SITE_TEMPLATE): spaced, rounded photos each followed by a
   * centered caption block. Mirrors the web PhotoStack's variant. */
  variant?: "custom" | "template";
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

  const isTemplate = variant === "template";
  const allLoaded = photos.every((p) => ratios[p.id] != null);
  const totalHeight = photos.reduce((sum, p) => {
    const ratio = ratios[p.id];
    const photoHeight = ratio ? SCREEN_WIDTH / ratio : 0;
    const captionHeight = isTemplate && (p.caption || captionSlot) ? CAPTION_HEIGHT_ESTIMATE : 0;
    const gap = isTemplate ? TEMPLATE_GAP : 0;
    return sum + photoHeight + captionHeight + gap;
  }, 0);
  const overflowing = allLoaded && totalHeight > COLLAPSED_HEIGHT;
  const collapsible = overflowing && !expanded;

  return (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={[styles.stack, isTemplate && styles.templateStack, collapsible && styles.collapsed]}>
        {photos.map((photo) => {
          const ratio = ratios[photo.id];
          return (
            <View key={photo.id}>
              <View style={[styles.photoWrap, isTemplate && styles.templatePhotoWrap]}>
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
              {isTemplate &&
                (captionSlot
                  ? captionSlot(photo)
                  : photo.caption && <Text style={styles.caption}>{photo.caption}</Text>)}
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
  templateStack: { gap: TEMPLATE_GAP },
  photoWrap: { width: "100%", backgroundColor: colors.surfaceMuted },
  templatePhotoWrap: { borderRadius: radius.lg, overflow: "hidden" },
  caption: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.md,
    fontWeight: fontWeight.medium,
    lineHeight: fontSize.md + 8,
    color: colors.text,
    textAlign: "center",
  },
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
