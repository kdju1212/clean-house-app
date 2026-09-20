import { apiFetch } from "./client";

export type AppNotification = {
  id: string;
  type:
    | "RESERVATION_REQUESTED"
    | "RESERVATION_ACCEPTED"
    | "RESERVATION_REJECTED"
    | "RESERVATION_CANCELLED"
    | "RESERVATION_COMPLETED"
    | "RESERVATION_NO_SHOW"
    | "CHAT_MESSAGE"
    | "REVIEW_REQUEST";
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

/** Mirrors the web /notifications page's data. */
export async function fetchNotifications(): Promise<AppNotification[]> {
  const { notifications } = await apiFetch<{ notifications: AppNotification[] }>(
    "/api/mobile/notifications"
  );
  return notifications;
}

/** Marks one read and hands back where it points (a reservation/chat/review
 * screen), so the caller can navigate there. */
export async function markNotificationRead(id: string): Promise<{ link: string | null }> {
  return apiFetch<{ link: string | null }>(`/api/mobile/notifications/${id}/read`, {
    method: "POST",
  });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiFetch("/api/mobile/notifications/read-all", { method: "POST" });
}
