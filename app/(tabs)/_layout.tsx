import { useEffect, useState } from "react";
import { Text } from "react-native";
// This Expo Router version (SDK 57) no longer re-exports Tabs from the
// package root — it must come from the "expo-router/tabs" subpath (see
// node_modules/expo-router/index.d.ts, which only re-exports router/Stack/
// Link/color; Tabs lives in build/layouts/Tabs via the tabs.js entry file).
import { Tabs } from "expo-router/tabs";
import { usePathname } from "expo-router";
import { getStoredUser } from "../../src/storage/auth-storage";
import { colors, fontSize, fontWeight } from "../../src/theme";

const ICONS: Record<string, string> = {
  categories: "🏠",
  reservations: "📋",
  mypage: "👤",
  company: "🏢",
};

/**
 * Bottom tab bar for every logged-in account — 홈/내 예약/마이페이지 for
 * everyone, plus a 4th 업체 관리 tab that only a COMPANY-role account sees
 * (an account can be both: nothing here stops a company owner from also
 * browsing/booking like any other customer). Replaces the earlier design
 * where a COMPANY login was routed into a totally separate app/company/
 * Tabs layout with no way back into the customer screens.
 *
 * `href: null` (rather than leaving the screen out of the JSX entirely) is
 * the documented way to register a route without giving it a tab bar item
 * — needed here since the role is only known after an async AsyncStorage
 * read, so the tab has to be able to toggle visibility after first mount
 * rather than being decided once at JSX-authoring time.
 */
export default function TabsLayout() {
  const [isCompany, setIsCompany] = useState(false);
  const pathname = usePathname();

  // This layout itself never unmounts while any of its tabs are open, so a
  // plain mount-only effect would miss a role flip that happens mid-session
  // — e.g. registering a company from the 마이페이지 link (a screen pushed
  // on top of this layout, not a remount of it) then getting replaced back
  // to /company. Re-checking on every route change catches that the moment
  // navigation actually lands here.
  useEffect(() => {
    getStoredUser().then((user) => setIsCompany(user?.role === "COMPANY"));
  }, [pathname]);

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
      <Tabs.Screen
        name="company"
        options={{ title: "업체 관리", href: isCompany ? undefined : null }}
      />
    </Tabs>
  );
}
