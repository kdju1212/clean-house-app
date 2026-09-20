import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { fetchMyChats, type ChatRoomSummary } from "../../src/api/chats";
import { Screen } from "../../src/components/Screen";
import { LoadingView } from "../../src/components/LoadingView";
import { EmptyState } from "../../src/components/EmptyState";
import { Badge } from "../../src/components/Badge";
import { colors, fontSize, fontWeight, radius, spacing } from "../../src/theme";

/**
 * 내 채팅 tab — every chat thread the account is a party to (as a customer
 * who booked, or as a company being booked), regardless of which role's
 * screens the other two tabs currently show. Tapping a row goes into the
 * existing per-reservation chat screen; the 🔔 opens /notifications (see
 * that screen for why it isn't its own tab — one bell shared by every
 * notification type, not just chat, matches the web repo's header icon).
 */
export default function ChatsScreen() {
  const [rooms, setRooms] = useState<ChatRoomSummary[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => fetchMyChats().then(setRooms), []);

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

  if (!rooms) {
    return <LoadingView />;
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>내 채팅</Text>
        <Pressable onPress={() => router.push("/notifications")} hitSlop={8}>
          <Text style={styles.bell}>🔔</Text>
        </Pressable>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.reservationId}
        style={styles.list}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={<EmptyState text="아직 채팅 내역이 없어요." />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/reservations/[id]/chat",
                params: { id: item.reservationId, name: item.otherPartyName },
              })
            }
            style={styles.row}
          >
            <View style={styles.rowTop}>
              <Text style={styles.name} numberOfLines={1}>
                {item.otherPartyName}
              </Text>
              {item.unreadCount > 0 && <Badge label={String(item.unreadCount)} tone="warning" />}
            </View>
            <Text style={styles.category}>{item.categoryName}</Text>
            <Text style={styles.preview} numberOfLines={1}>
              {item.lastMessage ?? "아직 메시지가 없어요."}
            </Text>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.bold, color: colors.text },
  bell: { fontSize: 22 },
  list: { marginTop: spacing.lg },
  row: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
  },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  name: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  category: { marginTop: 2, fontSize: fontSize.xs, color: colors.textFaint },
  preview: { marginTop: spacing.xs, fontSize: fontSize.sm, color: colors.textMuted },
});
