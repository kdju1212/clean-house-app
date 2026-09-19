import { apiFetch } from "./client";
import { clearPushToken } from "./push";
import { saveSession, clearSession, type StoredUser } from "../storage/auth-storage";
import { registerForPushNotifications } from "../notifications";

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
  // Not awaited — this triggers the OS permission dialog, which shouldn't
  // block navigation away from the login screen. app/_layout.tsx's own
  // mount effect would eventually catch this too, but only on the next
  // cold start, so this registers it immediately on a fresh login instead.
  void registerForPushNotifications();
  return user;
}

export async function logout(): Promise<void> {
  try {
    await clearPushToken();
  } catch {
    // Best-effort — a stale token left on the server just means this
    // now-signed-out device could get one more notification before the
    // next login overwrites it. Not worth blocking logout for.
  }
  await clearSession();
}

type TestLoginResponse = {
  token: string;
  user: StoredUser;
};

/**
 * Internal QA login — exchanges a shared TEST_LOGIN_SECRET (never a real
 * OAuth token) for a session as a fixed CUSTOMER/COMPANY/ADMIN test
 * persona. Mirrors POST /api/mobile/auth/test-login, which 404s unless the
 * server has TEST_LOGIN_SECRET configured.
 */
export async function loginWithTestAccount(
  secret: string,
  role: "CUSTOMER" | "COMPANY" | "ADMIN"
): Promise<StoredUser> {
  const { token, user } = await apiFetch<TestLoginResponse>("/api/mobile/auth/test-login", {
    method: "POST",
    body: { secret, role },
    auth: false,
  });
  await saveSession(token, user);
  void registerForPushNotifications();
  return user;
}
