import { apiFetch } from "./client";

export type SupportMessage = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
};

/** The caller's own 고객센터 문의 thread. */
export async function fetchMySupportMessages(): Promise<SupportMessage[]> {
  const { messages } = await apiFetch<{ messages: SupportMessage[] }>("/api/mobile/support/messages");
  return messages;
}

export async function sendMySupportMessage(content: string): Promise<SupportMessage> {
  const { message } = await apiFetch<{ message: SupportMessage }>("/api/mobile/support/messages", {
    method: "POST",
    body: { content },
  });
  return message;
}

export type SupportRoom = {
  userId: string;
  userName: string;
  userRole: "CUSTOMER" | "COMPANY" | "ADMIN";
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
};

/** Admin inbox — every user's 고객센터 문의 thread. */
export async function fetchAdminSupportRooms(): Promise<SupportRoom[]> {
  const { rooms } = await apiFetch<{ rooms: SupportRoom[] }>("/api/mobile/admin/support");
  return rooms;
}

export async function fetchAdminSupportMessages(userId: string): Promise<SupportMessage[]> {
  const { messages } = await apiFetch<{ messages: SupportMessage[] }>(
    `/api/mobile/admin/support/${userId}/messages`
  );
  return messages;
}

export async function sendAdminSupportMessage(userId: string, content: string): Promise<SupportMessage> {
  const { message } = await apiFetch<{ message: SupportMessage }>(
    `/api/mobile/admin/support/${userId}/messages`,
    { method: "POST", body: { content } }
  );
  return message;
}
