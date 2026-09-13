import { getStoredToken } from "../storage/auth-storage";

// Expo inlines any EXPO_PUBLIC_* env var into the JS bundle at build time —
// see .env.example. Falls back to the local web dev server so `npm start`
// works out of the box against `npm run dev` in the clean_house web repo.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Thin fetch wrapper for the clean_house web repo's /api/mobile/* routes.
 * Attaches the stored bearer token automatically (when present) so callers
 * don't have to thread it through every request by hand — mirrors how the
 * web app's browser just always carries its session cookie.
 */
export async function apiFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = await getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, json?.error ?? "요청에 실패했어요.");
  }
  return json as T;
}
