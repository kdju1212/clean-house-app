import { apiFetch } from "./client";

export type MyPageData = {
  user: {
    name: string | null;
    email: string | null;
    phone: string | null;
    loginProvider: string | null;
  };
  reservationCounts: {
    total: number;
    requested: number;
    accepted: number;
    completed: number;
  };
  reviews: {
    id: string;
    companyId: string;
    companyName: string;
    rating: number;
    content: string;
  }[];
  favorites: {
    companyId: string;
    companyName: string;
    mainImageUrl: string | null;
  }[];
};

export async function fetchMyPage(): Promise<MyPageData> {
  return apiFetch<MyPageData>("/api/mobile/mypage");
}

export async function updateMyPhone(phone: string): Promise<void> {
  await apiFetch("/api/mobile/mypage/phone", { method: "PATCH", body: { phone } });
}

/** 회원 탈퇴 — the caller is responsible for clearing the stored session
 * right after this succeeds, same as a normal logout(). */
export async function deleteAccount(): Promise<void> {
  await apiFetch("/api/mobile/account/delete", { method: "POST" });
}
