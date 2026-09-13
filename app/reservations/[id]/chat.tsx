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
import { fetchMessages, sendMessage, type ChatMessage } from "../../../src/api/chat";
import { getStoredUser } from "../../../src/storage/auth-storage";

// Simple polling instead of a websocket/SSE connection — fine for the MVP's
// traffic level, and keeps the app from needing a persistent connection or
// a separate realtime backend.
const POLL_INTERVAL_MS = 4000;

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="메시지를 입력하세요"
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
  container: { flex: 1, backgroundColor: "#ffffff", paddingTop: 56 },
  list: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  bubbleRow: { flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubble: { maxWidth: "75%", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { backgroundColor: "#171717" },
  bubbleTheirs: { backgroundColor: "#f5f5f5" },
  bubbleTextMine: { color: "#ffffff", fontSize: 14 },
  bubbleTextTheirs: { color: "#171717", fontSize: 14 },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#171717",
  },
  sendButtonText: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
});
