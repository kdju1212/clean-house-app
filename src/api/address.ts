import { apiFetch } from "./client";

/**
 * Precise street address from a GPS coordinate — distinct from
 * fetchRegionByCoords() in regions.ts, which only resolves down to the
 * 법정동 (too coarse for "where do I send the cleaner").
 */
export async function fetchAddressByCoords(lat: number, lng: number): Promise<{ address: string }> {
  return apiFetch<{ address: string }>(
    `/api/mobile/address/reverse-geocode?lat=${lat}&lng=${lng}`,
    { auth: false }
  );
}
