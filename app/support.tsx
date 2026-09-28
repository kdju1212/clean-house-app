import { fetchMySupportMessages, sendMySupportMessage } from "../src/api/support";
import { ChatThread } from "../src/components/ChatThread";

/** 고객센터 문의 — reachable from 마이페이지/업체 프로필 관리 for any role,
 * always the caller's own thread (see src/api/support.ts). */
export default function SupportScreen() {
  return (
    <ChatThread
      title="고객센터"
      emptyText="궁금한 점이나 불편한 점을 남겨주시면 확인 후 답변드릴게요."
      fetchMessages={fetchMySupportMessages}
      sendMessage={sendMySupportMessage}
    />
  );
}
