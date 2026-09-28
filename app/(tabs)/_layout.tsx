import { useEffect, useState } from "react";
// This Expo Router version (SDK 57) no longer re-exports Tabs from the
// package root — it must come from the "expo-router/tabs" subpath (see
// node_modules/expo-router/index.d.ts, which only re-exports router/Stack/
// Link/color; Tabs lives in build/layouts/Tabs via the tabs.js entry file).
import { Tabs } from "expo-router/tabs";
import { usePathname } from "expo-router";
import { getStoredUser } from "../../src/storage/auth-storage";
import { fetchMyChats } from "../../src/api/chats";
import { Icon, type IconName } from "../../src/components/Icon";
import { colors, fontSize, fontWeight } from "../../src/theme";

const ICONS: Record<string, IconName> = {
  categories: "tabHome",
  chats: "tabChat",
  reservations: "tabCalendar",
  mypage: "tabPerson",
};

/**
 * Bottom tab bar for every logged-in account — 홈/내 채팅은 그대로 두고,
 * 나머지 두 탭(내 예약/마이페이지)의 내용과 이름을 계정 역할에 따라
 * 통째로 바꾼다: COMPANY 계정은 같은 자리에서 "예약관리"(자기 업체로
 * 들어온 예약, app/(tabs)/reservations.tsx 참고)와 "업체 프로필관리"
 * (app/(tabs)/mypage.tsx 참고)를 본다. ADMIN 계정은 그 자리에서 "관리자"
 * (웹 관리자 페이지로 연결)와 "내 정보"(계정 정보 + 로그아웃)를 본다 —
 * 그 전까지는 로그인만 다르고 나머지는 CUSTOMER와 완전히 똑같이 보였다.
 * 홈/내 채팅은 역할과 무관하게 그대로 둬서 업체 사장님/관리자도 다른
 * 업체를 둘러보거나 예약할 수 있다.
 */
export default function TabsLayout() {
  const [isCompany, setIsCompany] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const pathname = usePathname();

  // This layout itself never unmounts while any of its tabs are open, so a
  // plain mount-only effect would miss a role flip that happens mid-session
  // — e.g. registering a company from the 마이페이지 link (a screen pushed
  // on top of this layout, not a remount of it) then getting replaced back
  // here. Re-checking on every route change catches that the moment
  // navigation actually lands back on a tab, and doubles as a cheap way to
  // refresh the 내 채팅 badge whenever the user moves around. The badge is
  // unread chat messages (same numbers as the chat list itself) — the
  // overall notification count lives on the home screen's bell instead.
  useEffect(() => {
    getStoredUser().then((user) => {
      setIsCompany(user?.role === "COMPANY");
      setIsAdmin(user?.role === "ADMIN");
    });
    fetchMyChats()
      .then((rooms) => setUnreadChatCount(rooms.reduce((sum, r) => sum + r.unreadCount, 0)))
      .catch(() => {});
  }, [pathname]);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: "#b0b3ba",
        tabBarStyle: { borderTopColor: colors.borderLight },
        tabBarLabelStyle: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
        tabBarBadgeStyle: { backgroundColor: colors.accent, fontSize: 10, fontWeight: fontWeight.bold },
        tabBarIcon: ({ color }) => <Icon name={ICONS[route.name]} size={25} color={color} />,
      })}
    >
      <Tabs.Screen name="categories" options={{ title: "홈" }} />
      <Tabs.Screen
        name="chats"
        options={{
          title: "내 채팅",
          tabBarBadge:
            unreadChatCount > 0 ? (unreadChatCount > 99 ? "99+" : unreadChatCount) : undefined,
        }}
      />
      <Tabs.Screen
        name="reservations"
        options={{ title: isAdmin ? "관리자" : isCompany ? "예약관리" : "내 예약" }}
      />
      <Tabs.Screen
        name="mypage"
        options={{ title: isAdmin ? "내 정보" : isCompany ? "업체 프로필관리" : "마이페이지" }}
      />
    </Tabs>
  );
}
