/**
 * Single source of truth for colors/spacing/radius/type across every
 * screen — was previously duplicated ad hoc per-file (each screen picked
 * its own #171717/#737373/etc. and its own spacing numbers), which is why
 * things looked close-but-not-quite consistent everywhere.
 */
export const colors = {
  bg: "#ffffff",
  text: "#171717",
  textMuted: "#737373",
  textFaint: "#a3a3a3",
  border: "#e5e5e5",
  borderLight: "#f0f0f0",
  surfaceMuted: "#f5f5f5",
  primary: "#171717",
  onPrimary: "#ffffff",
  danger: "#dc2626",
  dangerBorder: "#fca5a5",
  dangerBg: "#fef2f2",
  warning: "#a16207",
  warningBg: "#fef3c7",
  info: "#1d4ed8",
  infoBg: "#dbeafe",
  star: "#f59e0b",
  // Danggeun-style orange accent (tags, badges, active highlights) and the
  // borderless gray fill its category pills/search bar use.
  accent: "#ff6f0f",
  accentBg: "#fff1e7",
  pillBg: "#f2f3f6",
  kakao: "#FEE500",
  onKakao: "#191919",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 10,
  lg: 14,
  xl: 16,
  pill: 999,
} as const;

export const fontSize = {
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 15,
  xl: 18,
  xxl: 22,
} as const;

export const fontWeight = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;
