import { ReactNode } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

const SCREEN_WIDTH = Dimensions.get("window").width;
const GAP = spacing.sm;
// Two columns, minus the screen's own side padding (handled by the parent
// Screen) and the gap between the two tiles.
const TILE_SIZE = (SCREEN_WIDTH - spacing.xl * 2 - GAP) / 2;

export type GridPhotoItem = { id: string; url: string; caption: string | null };

/**
 * "내 사이트 템플릿" layout for the 상세페이지 section — mirrors the web
 * repo's src/components/company-detail/photo-grid.tsx: a 2-column grid of
 * square thumbnails with each photo's own caption underneath, for a
 * company that just has ordinary work photos rather than a pre-made tall
 * banner image (see PhotoStack.tsx for that alternative, CUSTOM_IMAGE
 * mode). Used read-only on the public detail screen; the owner's profile
 * screen wraps each tile with its own edit controls via photoOverlay/
 * captionSlot.
 */
export function PhotoGrid({
  title,
  photos,
  extraTile,
  photoOverlay,
  captionSlot,
}: {
  title?: string;
  photos: GridPhotoItem[];
  extraTile?: ReactNode;
  photoOverlay?: (photo: GridPhotoItem) => ReactNode;
  /** Replaces the plain caption <Text> — the profile screen uses this to
   * render an editable input instead. */
  captionSlot?: (photo: GridPhotoItem) => ReactNode;
}) {
  if (photos.length === 0 && !extraTile) return null;

  return (
    <View style={styles.section}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.grid}>
        {photos.map((photo) => (
          <View key={photo.id} style={styles.tile}>
            <View style={styles.photoWrap}>
              <ExpoImage source={{ uri: photo.url }} style={styles.photo} contentFit="cover" />
              {photoOverlay?.(photo)}
            </View>
            {captionSlot ? (
              captionSlot(photo)
            ) : photo.caption ? (
              <Text style={styles.caption}>{photo.caption}</Text>
            ) : null}
          </View>
        ))}
      </View>
      {extraTile}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  sectionTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  grid: {
    marginTop: spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  tile: { width: TILE_SIZE },
  photoWrap: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surfaceMuted,
  },
  photo: { width: "100%", height: "100%" },
  caption: { marginTop: spacing.xs, fontSize: fontSize.base, color: colors.textMuted },
});
