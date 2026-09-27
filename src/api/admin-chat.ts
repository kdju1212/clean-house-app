import { apiFetch } from "./client";
import type { ChatMessage } from "./chat";

/** 관리자 문의 — the company owner's side of a chat with our admins, not
 * tied to any one reservation. Always "my own company" — see
 * fetchAdminCompanyChatMessages/sendAdminCompanyChatMessage below for the
 * admin's own side, which takes an arbitrary companyId instead. */
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

/** The admin's side of the same 관리자 문의 room, for an arbitrary company
 * — mirrors the web repo's /admin/companies/[id]/chat. */
export async function fetchAdminCompanyChatMessages(companyId: string): Promise<ChatMessage[]> {
  const { messages } = await apiFetch<{ messages: ChatMessage[] }>(
    `/api/mobile/admin/companies/${companyId}/chat/messages`
  );
  return messages;
}

export async function sendAdminCompanyChatMessage(
  companyId: string,
  content: string
): Promise<ChatMessage> {
  const { message } = await apiFetch<{ message: ChatMessage }>(
    `/api/mobile/admin/companies/${companyId}/chat/messages`,
    { method: "POST", body: { content } }
  );
  return message;
}
