import { Text } from "react-native";
// See app/(tabs)/_layout.tsx for why this comes from "expo-router/tabs"
// rather than the package root in this Expo Router version.
import { Tabs } from "expo-router/tabs";
import { colors, fontSize, fontWeight } from "../../src/theme";

const ICONS: Record<string, string> = {
  index: "🏢",
  reservations: "📋",
  profile: "👤",
};

/**
 * Bottom tab bar for a logged-in 업체(company) owner — same idea as the
 * customer-facing app/(tabs)/_layout.tsx, just scoped to everything under
 * /company instead of a route group, since these routes already live at
 * a real "/company" prefix (no need to move any files to add this).
 * 예약 관리 keeps its own nested stack (list -> detail) inside its tab,
 * same as before this existed.
 */
export default function CompanyTabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: { borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
        tabBarIcon: ({ color }) => (
          <Text style={{ fontSize: 20, color }}>{ICONS[route.name]}</Text>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: "업체 관리" }} />
      <Tabs.Screen name="reservations" options={{ title: "예약 관리" }} />
      <Tabs.Screen name="profile" options={{ title: "프로필 관리" }} />
    </Tabs>
  );
}
