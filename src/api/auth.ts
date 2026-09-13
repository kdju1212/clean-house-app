import { apiFetch } from "./client";
import { saveSession, clearSession, type StoredUser } from "../storage/auth-storage";

type KakaoAuthResponse = {
  token: string;
  user: StoredUser;
};

/**
 * Exchanges a Kakao access token (from @react-native-seoul/kakao-login's
 * native SDK call) for our own app-scoped session — mirrors
 * POST /api/mobile/auth/kakao on the backend, which independently verifies
 * that token against Kakao's own servers rather than trusting anything we
 * send besides the token itself.
 */
export async function loginWithKakao(kakaoAccessToken: string): Promise<StoredUser> {
  const { token, user } = await apiFetch<KakaoAuthResponse>("/api/mobile/auth/kakao", {
    method: "POST",
    body: { accessToken: kakaoAccessToken },
    auth: false,
  });
  await saveSession(token, user);
  return user;
}

export async function logout(): Promise<void> {
  await clearSession();
}
