import { apiFetch } from "./client";

export type CompanyRow = {
  id: string;
  name: string;
  mainImageUrl: string | null;
  isAvailable: boolean;
  isVerified: boolean;
  // Self-declared (entered a business registration number, unchecked) —
  // a lighter trust signal than isVerified, shown only when not verified.
  hasBusinessRegistration: boolean;
  introText: string | null;
  price: number;
  pricingUnit: "FLAT" | "PER_UNIT";
  // price * the customer's saved CategoryProfile quantity, when both a
  // PER_UNIT price and a saved profile exist — see searchCompaniesInCategory
  // on the web repo.
  estimatedPrice: number | null;
  rating: number;
  reviewCount: number;
  // Count of this company's COMPLETED reservations — see
  // searchCompaniesInCategory on the web repo.
  completedCount: number;
  regionNames: string[];
};

export type CompanySearchResponse = {
  category: { id: string; slug: string; name: string };
  region: { id: string; name: string };
  adRows: CompanyRow[];
  rows: CompanyRow[];
};

/**
 * No auth required to browse, but the request still carries the bearer
 * token when one is stored (apiFetch's default) so a logged-in customer's
 * saved CategoryProfile is used to compute a PER_UNIT service's
 * estimatedPrice, same reasoning as fetchCompanyDetail's isFavorited below.
 */
export async function searchCompanies(params: {
  slug: string;
  regionId: string;
  maxPrice?: number;
  query?: string;
}): Promise<CompanySearchResponse> {
  const query = new URLSearchParams({ regionId: params.regionId });
  if (params.maxPrice) query.set("maxPrice", String(params.maxPrice));
  if (params.query) query.set("q", params.query);

  return apiFetch<CompanySearchResponse>(
    `/api/mobile/categories/${params.slug}/companies?${query.toString()}`
  );
}

export type CompanyDetailService = {
  id: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  price: number;
  pricingUnit: "FLAT" | "PER_UNIT";
  description: string | null;
};

export type CompanyDetailPhoto = {
  id: string;
  url: string;
  type: "MAIN" | "WORK" | "BEFORE_AFTER" | "TEMPLATE";
  categoryId: string | null;
  caption: string | null;
};

export type CompanyReview = {
  id: string;
  rating: number;
  content: string;
  photoUrls: string[];
  customerName: string;
  createdAt: string;
};

export type CompanyDetail = {
  company: {
    id: string;
    name: string;
    phone: string | null;
    introText: string | null;
    businessHours: string | null;
    isAvailable: boolean;
    isVerified: boolean;
    hasBusinessRegistration: boolean;
    mainImageUrl: string | null;
    // The company's own site — set means "예약하기" should open this
    // instead of navigating into our own reserve screen (see the detail
    // screen's handleReserveFromBar). Mirrors clean_house's Company.websiteUrl.
    websiteUrl: string | null;
    detailPageMode: "CUSTOM_IMAGE" | "SITE_TEMPLATE";
  };
  services: CompanyDetailService[];
  photos: CompanyDetailPhoto[];
  // "YYYY-MM-DD" strings, today or later — see company/schedule on the web
  // repo. The reserve screen uses this to warn before submitting; the
  // server re-checks it regardless.
  blockedDates: string[];
  // This company's own bookable hours (from its 영업시간/예약 텀 — see
  // generateTimeSlots on the web repo), never a fixed list every company
  // used to share. The reserve screen renders these as its time chips.
  timeSlots: string[];
  regionNames: string[];
  averageRating: number;
  reviewCount: number;
  reviews: CompanyReview[];
  isFavorited: boolean;
};

/**
 * No auth required to view a company, but the request still carries the
 * bearer token when one is stored (apiFetch's default) so a logged-in
 * customer's isFavorited comes back correctly — only omit it (`auth: false`)
 * for calls that must work identically for signed-out users.
 */
export async function fetchCompanyDetail(id: string): Promise<CompanyDetail> {
  return apiFetch<CompanyDetail>(`/api/mobile/companies/${id}`);
}

/** Which TIME_SLOTS are already taken on `dateStr` — expanded by the
 * company's own 예약 텀, so the picker can gray them out before the
 * customer even tries. createReservation re-checks this server-side
 * regardless. */
export async function fetchBlockedTimes(companyId: string, dateStr: string): Promise<string[]> {
  const { times } = await apiFetch<{ times: string[] }>(
    `/api/mobile/companies/${companyId}/blocked-times?date=${dateStr}`
  );
  return times;
}

export async function toggleCompanyFavorite(id: string): Promise<{ isFavorited: boolean }> {
  return apiFetch<{ isFavorited: boolean }>(`/api/mobile/companies/${id}/favorite`, {
    method: "POST",
  });
}
