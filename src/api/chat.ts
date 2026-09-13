import { apiFetch } from "./client";

export type ChatMessage = {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
};

export async function fetchMessages(reservationId: string): Promise<ChatMessage[]> {
  const { messages } = await apiFetch<{ messages: ChatMessage[] }>(
    `/api/mobile/reservations/${reservationId}/messages`
  );
  return messages;
}

export async function sendMessage(
  reservationId: string,
  content: string
): Promise<ChatMessage> {
  const { message } = await apiFetch<{ message: ChatMessage }>(
    `/api/mobile/reservations/${reservationId}/messages`,
    { method: "POST", body: { content } }
  );
  return message;
}
