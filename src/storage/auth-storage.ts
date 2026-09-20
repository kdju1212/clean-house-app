import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export type StoredUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: "CUSTOMER" | "COMPANY" | "ADMIN";
  phone: string | null;
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

/**
 * The web app has a mypage screen to set your phone once and have it
 * pre-fill every reservation form after that; the app has no such screen
 * yet, so instead we save whatever phone number the customer types into a
 * reservation the first time and pre-fill it from here next time — see
 * app/companies/[id]/reserve.tsx.
 */
export async function updateStoredPhone(phone: string): Promise<void> {
  const user = await getStoredUser();
  if (!user || user.phone === phone) return;
  await AsyncStorage.setItem(USER_KEY, JSON.stringify({ ...user, phone }));
}

/**
 * Registering a company changes the account's role server-side (see
 * clean_house's createCompanyForOwner), but there's no re-login here to
 * refresh it from — the login screen's "COMPANY -> /company" branch (see
 * app/login.tsx) reads this cached copy, so it has to be patched locally
 * right after a successful registration or the app keeps routing the user
 * as a CUSTOMER until their next login.
 */
export async function updateStoredRole(role: StoredUser["role"]): Promise<void> {
  const user = await getStoredUser();
  if (!user || user.role === role) return;
  await AsyncStorage.setItem(USER_KEY, JSON.stringify({ ...user, role }));
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
