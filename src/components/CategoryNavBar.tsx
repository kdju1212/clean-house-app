import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

const EMOJI_BY_SLUG: Record<string, string> = {
  "move-in": "🏠",
  moving: "📦",
  residential: "🧹",
  office: "🏢",
  restaurant: "🍽️",
  store: "🏬",
  aircon: "❄️",
  washer: "🧺",
  etc: "✨",
};

type Layout = { x: number; width: number };

/**
 * Danggeun-style horizontal category bar — mirrors the web home page's
 * CategoryNavBar. Unlike the web version, this doesn't navigate to a
 * different route: switching categories here is a plain state update the
 * parent screen owns (onSelect), so the list refetches in place instead of
 * the screen unmounting/remounting through expo-router — that remount was
 * what made switching categories feel like a full reload.
 *
 * RN's ScrollView has no DOM scrollIntoView, so the active pill's own
 * onLayout position is tracked and scrolled to manually once both the
 * container width and that pill's layout are known.
 */
export function CategoryNavBar({
  categories,
  activeSlug,
  onSelect,
}: {
  categories: { slug: string; name: string }[];
  activeSlug: string | null;
  onSelect: (slug: string | null) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [itemLayouts, setItemLayouts] = useState<Record<string, Layout>>({});

  useEffect(() => {
    const key = activeSlug ?? "all";
    const layout = itemLayouts[key];
    if (!layout || containerWidth === 0) return;
    const x = Math.max(0, layout.x - containerWidth / 2 + layout.width / 2);
    scrollRef.current?.scrollTo({ x, animated: true });
  }, [activeSlug, itemLayouts, containerWidth]);

  function handleItemLayout(key: string, layout: Layout) {
    setItemLayouts((prev) => ({ ...prev, [key]: layout }));
  }

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      contentContainerStyle={styles.container}
    >
      <Pill
        label="전체"
        active={activeSlug === null}
        onPress={() => onSelect(null)}
        onLayout={(layout) => handleItemLayout("all", layout)}
      />
      {categories.map((c) => (
        <Pill
          key={c.slug}
          label={`${EMOJI_BY_SLUG[c.slug] ?? "🧽"} ${c.name}`}
          active={activeSlug === c.slug}
          onPress={() => onSelect(c.slug)}
          onLayout={(layout) => handleItemLayout(c.slug, layout)}
        />
      ))}
    </ScrollView>
  );
}

function Pill({
  label,
  active,
  onPress,
  onLayout,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  onLayout: (layout: Layout) => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      onLayout={(e) => onLayout({ x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width })}
      style={[styles.pill, active && styles.pillActive]}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", gap: spacing.sm, paddingVertical: spacing.xs },
  pill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 1,
  },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: fontSize.base, fontWeight: fontWeight.medium, color: colors.text },
  pillTextActive: { color: colors.onPrimary },
});
