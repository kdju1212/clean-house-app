import { apiFetch } from "./client";

export type ChatRoomSummary = {
  reservationId: string;
  otherPartyName: string;
  categoryName: string;
  lastMessage: string | null;
  lastMessageAt: string;
  unreadCount: number;
};

/** Backs the 내 채팅 tab — every chat thread the account is a party to,
 * whether as the customer who booked or (if it also owns a company) the
 * company being booked. */
export async function fetchMyChats(): Promise<ChatRoomSummary[]> {
  const { rooms } = await apiFetch<{ rooms: ChatRoomSummary[] }>("/api/mobile/chats");
  return rooms;
}
