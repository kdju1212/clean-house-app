import { Image, type ColorValue, type ImageStyle, type StyleProp } from "react-native";

// Plain PNGs tinted at runtime rather than an icon font/SVG library: both of
// those need native modules, which can't ship over an OTA update to an
// already-installed build. Single-color black PNGs + Image's tintColor are
// core React Native, so these work on every build.
const SOURCES = {
  search: require("../../assets/icons/search.png"),
  bell: require("../../assets/icons/bell.png"),
  pin: require("../../assets/icons/pin.png"),
  chevronDown: require("../../assets/icons/chevronDown.png"),
  tabHome: require("../../assets/icons/tabHome.png"),
  tabChat: require("../../assets/icons/tabChat.png"),
  tabCalendar: require("../../assets/icons/tabCalendar.png"),
  tabPerson: require("../../assets/icons/tabPerson.png"),
  chatSmall: require("../../assets/icons/chatSmall.png"),
  chevronLeft: require("../../assets/icons/chevronLeft.png"),
  chevronRight: require("../../assets/icons/chevronRight.png"),
  heart: require("../../assets/icons/heart.png"),
  heartFilled: require("../../assets/icons/heartFilled.png"),
  sparkle: require("../../assets/icons/sparkle.png"),
} as const;

export type IconName = keyof typeof SOURCES;

export function Icon({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconName;
  size?: number;
  color: ColorValue;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={SOURCES[name]}
      style={[{ width: size, height: size, tintColor: color }, style]}
      resizeMode="contain"
    />
  );
}
