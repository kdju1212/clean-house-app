import { apiFetch } from "./client";
import { toFormDataFilePart } from "./file-part";

export type CompanyService = {
  id: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  price: number;
  pricingUnit: "FLAT" | "PER_UNIT";
  description: string | null;
  // Missing key = no restriction for that select-type question (handles
  // every option) — see reservation-questions.ts and clean_house's
  // addServiceForOwner.
  supportedOptions: Record<string, string[]> | null;
};

export type CompanyPhoto = {
  id: string;
  url: string;
  type: "MAIN" | "WORK" | "BEFORE_AFTER";
  // Which category this photo belongs to (WORK/BEFORE_AFTER only) — null
  // means "shown for every category". See clean_house's CompanyPhoto model.
  categoryId: string | null;
};

export type CompanyMe = {
  company: {
    id: string;
    name: string;
    status: "PENDING" | "ACTIVE" | "SUSPENDED";
    isAvailable: boolean;
    phone: string | null;
    introText: string | null;
    businessHours: string | null;
    mainImageUrl: string | null;
    websiteUrl: string | null;
  };
  requestedCount: number;
  averageRating: number;
  reviewCount: number;
  services: CompanyService[];
  regionIds: string[];
  selectedRegions: { id: string; label: string }[];
  legacyRegions: { id: string; name: string }[];
  photos: CompanyPhoto[];
};

export async function fetchCompanyMe(): Promise<CompanyMe> {
  return apiFetch<CompanyMe>("/api/mobile/company/me");
}

export async function updateCompanyProfile(input: {
  name: string;
  phone: string;
  introText: string;
  businessHours: string;
  isAvailable: boolean;
  websiteUrl: string;
}): Promise<void> {
  await apiFetch("/api/mobile/company/profile", { method: "PATCH", body: input });
}

export async function saveService(input: {
  categoryId: string;
  price: number;
  description: string;
  pricingUnit?: "FLAT" | "PER_UNIT";
  supportedOptions?: Record<string, string[]>;
}): Promise<void> {
  await apiFetch("/api/mobile/company/services", { method: "POST", body: input });
}

export async function deleteCompanyService(id: string): Promise<void> {
  await apiFetch(`/api/mobile/company/services/${id}`, { method: "DELETE" });
}

export async function setCompanyRegions(regionIds: string[]): Promise<void> {
  await apiFetch("/api/mobile/company/regions", { method: "PUT", body: { regionIds } });
}

type SignedUploadParams = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
};

/** Mirrors uploadReviewPhoto's flow but against the company photo
 * endpoints — signed params from our server, upload straight to
 * Cloudinary, then confirm so the server can re-verify/re-encode it. */
export async function uploadCompanyPhoto(
  file: { uri: string; name: string; type: string; size: number },
  photoType: CompanyPhoto["type"],
  categoryId?: string | null
): Promise<void> {
  const signed = await apiFetch<SignedUploadParams>("/api/mobile/company/photos/upload-url", {
    method: "POST",
    body: { contentType: file.type, size: file.size },
  });

  const formData = new FormData();
  formData.append("file", await toFormDataFilePart(file));
  formData.append("public_id", signed.publicId);
  formData.append("timestamp", String(signed.timestamp));
  formData.append("api_key", signed.apiKey);
  formData.append("signature", signed.signature);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!uploadRes.ok) {
    throw new Error("사진 업로드에 실패했어요.");
  }

  await apiFetch("/api/mobile/company/photos", {
    method: "POST",
    body: { publicId: signed.publicId, type: photoType, categoryId },
  });
}

export async function deleteCompanyPhoto(id: string): Promise<void> {
  await apiFetch(`/api/mobile/company/photos/${id}`, { method: "DELETE" });
}

export type CompanyReservation = {
  id: string;
  status: "REQUESTED" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
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

export type CompanyReservationDetail = CompanyReservation & {
  requestNote: string | null;
  categorySlug: string;
  categoryAnswers: Record<string, string> | null;
};

export async function fetchCompanyReservationDetail(
  id: string
): Promise<CompanyReservationDetail> {
  const { reservation } = await apiFetch<{ reservation: CompanyReservationDetail }>(
    `/api/mobile/company/reservations/${id}`
  );
  return reservation;
}

export type ReservationAction = "accept" | "reject" | "complete" | "no_show";

export async function transitionReservation(
  id: string,
  action: ReservationAction,
  price?: number
): Promise<void> {
  await apiFetch(`/api/mobile/company/reservations/${id}/transition`, {
    method: "POST",
    body: { action, price },
  });
}
