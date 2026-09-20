import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fetchMessages, sendMessage, type ChatMessage } from "../../../src/api/chat";
import { getStoredUser } from "../../../src/storage/auth-storage";
import { colors, fontSize, fontWeight, radius, spacing } from "../../../src/theme";

// Simple polling instead of a websocket/SSE connection — fine for the MVP's
// traffic level, and keeps the app from needing a persistent connection or
// a separate realtime backend.
const POLL_INTERVAL_MS = 4000;

export default function ChatScreen() {
  // name is optional — only set when navigated here from the 내 채팅 list
  // (see app/(tabs)/chats.tsx); a link that goes straight to a reservation's
  // chat (from its detail page, a notification, ...) just shows no header.
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    let cancelled = false;

    getStoredUser().then((u) => {
      if (!cancelled) setMyUserId(u?.id ?? null);
    });

    async function poll() {
      const msgs = await fetchMessages(id);
      if (!cancelled) setMessages(msgs);
    }
    void poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id]);

  async function handleSend() {
    const content = draft.trim();
    if (content.length === 0 || sending) return;

    setSending(true);
    try {
      const message = await sendMessage(id, content);
      setMessages((prev) => [...prev, message]);
      setDraft("");
    } catch {
      // Silently ignore — next poll will reconcile state, and the draft
      // stays in the input so the user can just retry sending.
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + spacing.lg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {name && (
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{name}</Text>
        </View>
      )}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const isMine = item.senderId === myUserId;
          return (
            <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
              <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs}>
                  {item.content}
                </Text>
              </View>
            </View>
          );
        }}
      />

      <View style={[styles.inputRow, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="메시지를 입력하세요"
          placeholderTextColor={colors.textFaint}
          multiline
        />
        <Pressable style={styles.sendButton} onPress={handleSend} disabled={sending}>
          <Text style={styles.sendButtonText}>전송</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm },
  bubbleRow: { flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubble: {
    maxWidth: "75%",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleMine: { backgroundColor: colors.primary },
  bubbleTheirs: { backgroundColor: colors.surfaceMuted },
  bubbleTextMine: { color: colors.onPrimary, fontSize: fontSize.md },
  bubbleTextTheirs: { color: colors.text, fontSize: fontSize.md },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md + 2,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    fontSize: fontSize.md,
    color: colors.text,
  },
  sendButton: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.primary,
  },
  sendButtonText: { color: colors.onPrimary, fontSize: fontSize.base, fontWeight: fontWeight.semibold },
});
