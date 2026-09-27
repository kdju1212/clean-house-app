import { apiFetch } from "./client";

export type CompanyOwnReview = {
  id: string;
  rating: number;
  content: string;
  customerName: string | null;
  createdAt: string;
  hidden: boolean;
  photoUrls: string[];
  ownerReply: string | null;
};

/** Mirrors the web repo's /company/reviews management page. */
export async function fetchCompanyReviews(): Promise<CompanyOwnReview[]> {
  const { reviews } = await apiFetch<{ reviews: CompanyOwnReview[] }>("/api/mobile/company/reviews");
  return reviews;
}

export async function replyToReview(reviewId: string, reply: string): Promise<void> {
  await apiFetch(`/api/mobile/company/reviews/${reviewId}/reply`, {
    method: "PATCH",
    body: { reply },
  });
}

export async function deleteReviewReply(reviewId: string): Promise<void> {
  await apiFetch(`/api/mobile/company/reviews/${reviewId}/reply`, { method: "DELETE" });
}
