import { apiFetch } from "./client";

export type CompanyRow = {
  id: string;
  name: string;
  mainImageUrl: string | null;
  isAvailable: boolean;
  introText: string | null;
  price: number;
  rating: number;
  reviewCount: number;
  regionNames: string[];
};

export type CompanySearchResponse = {
  category: { id: string; slug: string; name: string };
  region: { id: string; name: string };
  adRows: CompanyRow[];
  rows: CompanyRow[];
};

export async function searchCompanies(params: {
  slug: string;
  regionId: string;
  maxPrice?: number;
}): Promise<CompanySearchResponse> {
  const query = new URLSearchParams({ regionId: params.regionId });
  if (params.maxPrice) query.set("maxPrice", String(params.maxPrice));

  return apiFetch<CompanySearchResponse>(
    `/api/mobile/categories/${params.slug}/companies?${query.toString()}`,
    { auth: false }
  );
}

export type CompanyDetailService = {
  id: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  price: number;
  description: string | null;
};

export type CompanyDetailPhoto = {
  id: string;
  url: string;
  type: "MAIN" | "WORK" | "BEFORE_AFTER";
};

export type CompanyReview = {
  id: string;
  rating: number;
  content: string;
  photoUrl: string | null;
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
    mainImageUrl: string | null;
  };
  services: CompanyDetailService[];
  photos: CompanyDetailPhoto[];
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

export async function toggleCompanyFavorite(id: string): Promise<{ isFavorited: boolean }> {
  return apiFetch<{ isFavorited: boolean }>(`/api/mobile/companies/${id}/favorite`, {
    method: "POST",
  });
}
