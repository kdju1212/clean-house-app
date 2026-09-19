import { apiFetch } from "./client";

/** Mirrors the web "정보입력" panel's read/write — a customer's saved
 * answers for one category (평수, 브랜드/형태/대수, ...), reused across
 * every company's listing in that category and to pre-fill the
 * reservation form. */
export async function fetchCategoryProfile(
  categorySlug: string
): Promise<Record<string, string> | null> {
  const { answers } = await apiFetch<{ answers: Record<string, string> | null }>(
    `/api/mobile/category-profile/${categorySlug}`
  );
  return answers;
}

export async function fetchAllCategoryProfiles(): Promise<
  Record<string, Record<string, string>>
> {
  const { profiles } = await apiFetch<{ profiles: Record<string, Record<string, string>> }>(
    "/api/mobile/category-profile"
  );
  return profiles;
}

export async function saveCategoryProfile(
  categorySlug: string,
  answers: Record<string, string>
): Promise<Record<string, string>> {
  const result = await apiFetch<{ answers: Record<string, string> }>(
    `/api/mobile/category-profile/${categorySlug}`,
    { method: "POST", body: answers }
  );
  return result.answers;
}
