import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export type StoredUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: "CUSTOMER" | "COMPANY" | "ADMIN";
};

/**
 * The app has no cookie jar like the web does, so the bearer token our
 * mobile API mints (see /api/mobile/auth/kakao on the backend) has to be
 * kept somewhere that survives an app restart — AsyncStorage is the
 * standard place for this in Expo/React Native. Not SecureStore: the token
 * is a 30-day access token scoped to this API only (no payment/PII secrets
 * riding on it), so plain AsyncStorage's durability is what we need, not
 * SecureStore's hardware-backed encryption for e.g. payment credentials.
 */
export async function saveSession(token: string, user: StoredUser): Promise<void> {
  await AsyncStorage.setMany({
    [TOKEN_KEY]: token,
    [USER_KEY]: JSON.stringify(user),
  });
}

export async function getStoredToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getStoredUser(): Promise<StoredUser | null> {
  const raw = await AsyncStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeMany([TOKEN_KEY, USER_KEY]);
}

const REGION_KEY = "selected_region";

export type StoredRegion = { id: string; name: string };

/**
 * Mirrors the web's REGION_COOKIE, but client-side — the app has no
 * cookie/session concept, so every API call that needs the customer's
 * region (search, reservation creation) reads it from here and sends it
 * explicitly as a parameter instead of relying on server-side state.
 */
export async function saveSelectedRegion(region: StoredRegion): Promise<void> {
  await AsyncStorage.setItem(REGION_KEY, JSON.stringify(region));
}

export async function getSelectedRegion(): Promise<StoredRegion | null> {
  const raw = await AsyncStorage.getItem(REGION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredRegion;
  } catch {
    return null;
  }
}
