import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { fetchAdminSupportRooms, type SupportRoom } from "../../../src/api/support";
import { Screen } from "../../../src/components/Screen";
import { Card } from "../../../src/components/Card";
import { Badge } from "../../../src/components/Badge";
import { EmptyState } from "../../../src/components/EmptyState";
import { LoadingView } from "../../../src/components/LoadingView";
import { colors, fontSize, fontWeight, spacing } from "../../../src/theme";

const ROLE_LABEL: Record<SupportRoom["userRole"], string> = {
  CUSTOMER: "고객",
  COMPANY: "업체",
  ADMIN: "관리자",
};

/** Mirrors the web repo's /admin/support inbox — every user's 고객센터
 * 문의 thread, most recent activity first. */
export default function AdminSupportInboxScreen() {
  const [rooms, setRooms] = useState<SupportRoom[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => fetchAdminSupportRooms().then(setRooms), []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Screen scroll refreshing={refreshing} onRefresh={handleRefresh}>
      <Text style={styles.title}>고객센터 문의</Text>

      {!rooms ? (
        <LoadingView />
      ) : rooms.length === 0 ? (
        <EmptyState text="아직 들어온 문의가 없어요." />
      ) : (
        <View style={styles.list}>
          {rooms.map((room) => (
            <Pressable key={room.userId} onPress={() => router.push(`/admin/support/${room.userId}`)}>
              <Card style={styles.card}>
                <View style={styles.rowBetween}>
                  <View style={styles.nameRow}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {room.userName}
                    </Text>
                    <Badge label={ROLE_LABEL[room.userRole]} />
                  </View>
                  {room.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadBadgeText}>{room.unreadCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {room.lastMessage ?? "대화가 없어요."}
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  list: { marginTop: spacing.lg, gap: spacing.sm + 2 },
  card: {},
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  nameRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xs, minWidth: 0 },
  userName: { flexShrink: 1, fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  lastMessage: { marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.textMuted },
  unreadBadge: {
    minWidth: 20,
    paddingHorizontal: 6,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: colors.onPrimary },
});
