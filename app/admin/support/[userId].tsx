import { useLocalSearchParams } from "expo-router";
import { fetchAdminSupportMessages, sendAdminSupportMessage } from "../../../src/api/support";
import { ChatThread } from "../../../src/components/ChatThread";

/** Admin side of one user's 고객센터 문의 room — see app/support.tsx for
 * that user's own side of the same thread. */
export default function AdminSupportRoomScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();

  return (
    <ChatThread
      title="고객센터 문의"
      fetchMessages={() => fetchAdminSupportMessages(userId)}
      sendMessage={(content) => sendAdminSupportMessage(userId, content)}
    />
  );
}
