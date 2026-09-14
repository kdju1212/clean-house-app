import { apiFetch } from "./client";

export type RegionLeaf = { id: string; name: string };
export type RegionSigungu = { id: string; name: string; children: RegionLeaf[] };
export type RegionSido = { id: string; name: string; children: RegionSigungu[] };

export type RegionTreeResponse = {
  sido: RegionSido[];
  legacyRegions: RegionLeaf[];
};

export async function fetchRegionTree(): Promise<RegionTreeResponse> {
  return apiFetch<RegionTreeResponse>("/api/mobile/regions", { auth: false });
}

export type RegionByCoords = RegionLeaf & { path: string };

export async function fetchRegionByCoords(lat: number, lng: number): Promise<RegionByCoords> {
  return apiFetch<RegionByCoords>(
    `/api/mobile/regions/reverse-geocode?lat=${lat}&lng=${lng}`,
    { auth: false }
  );
}

export type RegionGroupHit = { id: string; name: string; children: RegionLeaf[] };

/**
 * 시/군/구 search for the company service-area picker: each hit carries its
 * *entire* 동 list (not just what matched) so "전체" bulk-toggle works —
 * see the same-named searchRegionGroups() in the web repo's src/lib/region.ts.
 */
export async function searchRegionGroups(query: string): Promise<RegionGroupHit[]> {
  const { groups } = await apiFetch<{ groups: RegionGroupHit[] }>(
    `/api/mobile/regions/search-groups?q=${encodeURIComponent(query)}`,
    { auth: false }
  );
  return groups;
}
