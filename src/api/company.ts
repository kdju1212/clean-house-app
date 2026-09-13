import { apiFetch } from "./client";

export type CompanyMe = {
  company: {
    id: string;
    name: string;
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
    isAvailable: boolean;
    phone: string | null;
    introText: string | null;
    businessHours: string | null;
  };
  requestedCount: number;
  averageRating: number;
  reviewCount: number;
};

export async function fetchCompanyMe(): Promise<CompanyMe> {
  return apiFetch<CompanyMe>("/api/mobile/company/me");
}

export type CompanyReservation = {
  id: string;
  status: "REQUESTED" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED";
  customerName: string;
  customerPhone: string;
  categoryName: string;
  price: number | null;
  desiredDate: string;
  desiredTime: string;
  address: string;
  addressDetail: string | null;
};

export async function fetchCompanyReservations(status?: string): Promise<CompanyReservation[]> {
  const query = status ? `?status=${status}` : "";
  const { reservations } = await apiFetch<{ reservations: CompanyReservation[] }>(
    `/api/mobile/company/reservations${query}`
  );
  return reservations;
}

export type CompanyReservationDetail = CompanyReservation & { requestNote: string | null };

export async function fetchCompanyReservationDetail(
  id: string
): Promise<CompanyReservationDetail> {
  const { reservation } = await apiFetch<{ reservation: CompanyReservationDetail }>(
    `/api/mobile/company/reservations/${id}`
  );
  return reservation;
}

export type ReservationAction = "accept" | "reject" | "complete";

export async function transitionReservation(
  id: string,
  action: ReservationAction
): Promise<void> {
  await apiFetch(`/api/mobile/company/reservations/${id}/transition`, {
    method: "POST",
    body: { action },
  });
}
