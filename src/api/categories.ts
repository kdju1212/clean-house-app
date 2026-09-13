import { apiFetch } from "./client";

export type Category = { id: string; slug: string; name: string };

export async function fetchCategories(): Promise<Category[]> {
  const { categories } = await apiFetch<{ categories: Category[] }>(
    "/api/mobile/categories",
    { auth: false }
  );
  return categories;
}
