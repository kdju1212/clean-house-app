import { Text } from "react-native";
// This Expo Router version (SDK 57) no longer re-exports Tabs from the
// package root — it must come from the "expo-router/tabs" subpath (see
// node_modules/expo-router/index.d.ts, which only re-exports router/Stack/
// Link/color; Tabs lives in build/layouts/Tabs via the tabs.js entry file).
import { Tabs } from "expo-router/tabs";
import { colors, fontSize, fontWeight } from "../../src/theme";

const ICONS: Record<string, string> = {
  categories: "🏠",
  reservations: "📋",
  mypage: "👤",
};

/** Bottom tab bar for the customer-facing screens (홈/내 예약/마이페이지) —
 * these previously lived as separate top-level routes reached via text
 * links in the categories screen's header. 업체(company) side keeps its
 * own separate dashboard flow outside this group. */
export default function TabsLayout() {
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
      <Tabs.Screen name="categories" options={{ title: "홈" }} />
      <Tabs.Screen name="reservations" options={{ title: "내 예약" }} />
      <Tabs.Screen name="mypage" options={{ title: "마이페이지" }} />
    </Tabs>
  );
}
