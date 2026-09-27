import { apiFetch } from "./client";
import type { ChatMessage } from "./chat";

/** 관리자 문의 — the company owner's side of a chat with our admins, not
 * tied to any one reservation. Always "my own company"; there's no admin
 * UI on the app, so no companyId param like the web repo's version needs. */
export async function fetchAdminChatMessages(): Promise<ChatMessage[]> {
  const { messages } = await apiFetch<{ messages: ChatMessage[] }>(
    "/api/mobile/company/chat/messages"
  );
  return messages;
}

export async function sendAdminChatMessage(content: string): Promise<ChatMessage> {
  const { message } = await apiFetch<{ message: ChatMessage }>(
    "/api/mobile/company/chat/messages",
    { method: "POST", body: { content } }
  );
  return message;
}
