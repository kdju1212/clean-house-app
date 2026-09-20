import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "../src/api/notifications";
import { mapNotificationLinkToRoute } from "../src/notifications";
import { Screen } from "../src/components/Screen";
import { LoadingView } from "../src/components/LoadingView";
import { EmptyState } from "../src/components/EmptyState";
import { colors, fontSize, fontWeight, radius, spacing } from "../src/theme";

const TYPE_ICON: Record<AppNotification["type"], string> = {
  RESERVATION_REQUESTED: "📥",
  RESERVATION_ACCEPTED: "✅",
  RESERVATION_REJECTED: "❌",
  RESERVATION_CANCELLED: "🚫",
  RESERVATION_COMPLETED: "🧹",
  RESERVATION_NO_SHOW: "🚷",
  CHAT_MESSAGE: "💬",
  REVIEW_REQUEST: "⭐",
};

/** Standalone (outside the tabs group), reached from the 내 채팅 tab's bell
 * icon — mirrors the web repo's /notifications page: same list, same
 * mark-one/mark-all-read actions. */
export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(() => fetchNotifications().then(setNotifications), []);

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

  async function handleOpen(notification: AppNotification) {
    // Optimistic — the row shouldn't sit unread while the request is in
    // flight, and a failure here isn't worth blocking navigation over.
    setNotifications(
      (prev) => prev?.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)) ?? null
    );
    try {
      const { link } = await markNotificationRead(notification.id);
      router.push(mapNotificationLinkToRoute(link ?? notification.link ?? "/"));
    } catch {
      router.push(mapNotificationLinkToRoute(notification.link ?? "/"));
    }
  }

  async function handleMarkAll() {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev?.map((n) => ({ ...n, isRead: true })) ?? null);
    } finally {
      setMarkingAll(false);
    }
  }

  if (!notifications) {
    return <LoadingView />;
  }

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>알림</Text>
        {hasUnread && (
          <Pressable onPress={handleMarkAll} disabled={markingAll}>
            <Text style={styles.markAllText}>{markingAll ? "처리 중..." : "모두 읽음 처리"}</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        style={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={<EmptyState text="아직 알림이 없어요." />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleOpen(item)}
            style={[styles.row, !item.isRead && styles.rowUnread]}
          >
            <Text style={styles.icon}>{TYPE_ICON[item.type]}</Text>
            <View style={styles.rowBody}>
              <View style={styles.rowTitleLine}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                {!item.isRead && <View style={styles.dot} />}
              </View>
              {item.body && (
                <Text style={styles.rowText} numberOfLines={2}>
                  {item.body}
                </Text>
              )}
              <Text style={styles.rowDate}>
                {new Date(item.createdAt).toLocaleString("ko-KR")}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  markAllText: { fontSize: fontSize.xs, color: colors.textMuted, textDecorationLine: "underline" },
  list: { marginTop: spacing.lg },
  row: {
    flexDirection: "row",
    gap: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowUnread: { borderColor: colors.text, backgroundColor: colors.surfaceMuted },
  icon: { fontSize: fontSize.lg },
  rowBody: { flex: 1 },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  rowTitle: { fontSize: fontSize.base, fontWeight: fontWeight.semibold, color: colors.text },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#f59e0b" },
  rowText: { marginTop: 2, fontSize: fontSize.sm, color: colors.textMuted },
  rowDate: { marginTop: spacing.xs, fontSize: fontSize.xs, color: colors.textFaint },
});
