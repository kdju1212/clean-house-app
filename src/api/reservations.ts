import { apiFetch } from "./client";

export type MyReservation = {
  id: string;
  status: "REQUESTED" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED";
  companyId: string;
  companyName: string;
  categoryName: string;
  price: number | null;
  desiredDate: string;
  desiredTime: string;
  address: string;
  addressDetail: string | null;
  hasReview: boolean;
};

export async function fetchMyReservations(): Promise<MyReservation[]> {
  const { reservations } = await apiFetch<{ reservations: MyReservation[] }>(
    "/api/mobile/reservations"
  );
  return reservations;
}

export type CreateReservationInput = {
  regionId: string;
  companyId: string;
  categoryId: string;
  name: string;
  phone: string;
  address: string;
  addressDetail?: string;
  desiredDate: string; // YYYY-MM-DD
  desiredTime: string; // one of TIME_SLOTS, e.g. "09:00"
  requestNote?: string;
};

/**
 * Same validation and server-side region-eligibility re-check as the web
 * reservation flow (see reservation-service.ts on the backend) — this call
 * can fail with a Korean error message for any of those reasons, which the
 * screen should just show as-is.
 */
export async function createReservation(
  input: CreateReservationInput
): Promise<{ reservationId: string }> {
  return apiFetch<{ reservationId: string }>("/api/mobile/reservations", {
    method: "POST",
    body: input,
  });
}
