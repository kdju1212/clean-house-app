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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getStoredUser } from "../storage/auth-storage";
import { colors, fontSize, fontWeight, radius, spacing } from "../theme";

const POLL_INTERVAL_MS = 4000;

type ThreadMessage = { id: string; senderId: string; content: string; createdAt: string };

/**
 * Shared polling-chat UI — same bubble layout and 4s-poll shape every chat
 * screen in this app already used (reservations/[id]/chat, company/chat,
 * admin/companies/[id]/chat), pulled out once so 고객센터 문의 doesn't
 * become a fourth near-identical copy. fetchMessages/sendMessage don't need
 * to be memoized by the caller — they're always called through a ref, so a
 * fresh closure on every render (e.g. one capturing a route param) is fine.
 */
export function ChatThread({
  title,
  emptyText,
  fetchMessages,
  sendMessage,
}: {
  title: string;
  emptyText?: string;
  fetchMessages: () => Promise<ThreadMessage[]>;
  sendMessage: (content: string) => Promise<ThreadMessage>;
}) {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);

  const fetchRef = useRef(fetchMessages);
  const sendRef = useRef(sendMessage);
  useEffect(() => {
    fetchRef.current = fetchMessages;
    sendRef.current = sendMessage;
  });

  useEffect(() => {
    let cancelled = false;

    getStoredUser().then((u) => {
      if (!cancelled) setMyUserId(u?.id ?? null);
    });

    async function poll() {
      try {
        const msgs = await fetchRef.current();
        if (!cancelled) setMessages(msgs);
      } catch {
        // Silently retry on the next tick.
      }
    }
    void poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleSend() {
    const content = draft.trim();
    if (content.length === 0 || sending) return;

    setSending(true);
    try {
      const message = await sendRef.current(content);
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
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          emptyText ? <Text style={styles.emptyText}>{emptyText}</Text> : null
        }
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.sm, flexGrow: 1 },
  emptyText: {
    marginTop: spacing.xl,
    textAlign: "center",
    fontSize: fontSize.base,
    color: colors.textFaint,
  },
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
