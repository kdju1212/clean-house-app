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
};

/**
 * Bottom tab bar for every logged-in account — 홈은 그대로 두고, 나머지 두
 * 탭(내 예약/마이페이지)의 내용과 이름을 계정 역할에 따라 통째로 바꾼다:
 * COMPANY 계정은 같은 자리에서 "예약관리"(자기 업체로 들어온 예약,
 * app/(tabs)/reservations.tsx 참고)와 "업체 프로필관리"
 * (app/(tabs)/mypage.tsx 참고)를 본다. 홈은 역할과 무관하게 그대로 둬서
 * 업체 사장님도 다른 업체를 둘러보거나 예약할 수 있다.
 */
export default function TabsLayout() {
  const [isCompany, setIsCompany] = useState(false);
  const pathname = usePathname();

  // This layout itself never unmounts while any of its tabs are open, so a
  // plain mount-only effect would miss a role flip that happens mid-session
  // — e.g. registering a company from the 마이페이지 link (a screen pushed
  // on top of this layout, not a remount of it) then getting replaced back
  // here. Re-checking on every route change catches that the moment
  // navigation actually lands back on a tab.
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
      <Tabs.Screen name="reservations" options={{ title: isCompany ? "예약관리" : "내 예약" }} />
      <Tabs.Screen name="mypage" options={{ title: isCompany ? "업체 프로필관리" : "마이페이지" }} />
    </Tabs>
  );
}
