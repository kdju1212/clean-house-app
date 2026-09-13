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
