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
