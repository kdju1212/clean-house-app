import { apiFetch } from "./client";
import { toFormDataFilePart } from "./file-part";

type SignedUploadParams = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  publicId: string;
};

/**
 * Mirrors the web review form's upload flow: ask our server for signed
 * Cloudinary params (it re-verifies reservation eligibility before handing
 * them out), then upload the file straight to Cloudinary from the device —
 * the image bytes never pass through our API server.
 */
export async function uploadReviewPhoto(
  reservationId: string,
  file: { uri: string; name: string; type: string; size: number }
): Promise<string> {
  const signed = await apiFetch<SignedUploadParams>(
    `/api/mobile/reservations/${reservationId}/review/upload-url`,
    { method: "POST", body: { contentType: file.type, size: file.size } }
  );

  const formData = new FormData();
  formData.append("file", await toFormDataFilePart(file));
  formData.append("public_id", signed.publicId);
  formData.append("timestamp", String(signed.timestamp));
  formData.append("api_key", signed.apiKey);
  formData.append("signature", signed.signature);

  const uploadRes = await fetch(
    `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`,
    { method: "POST", body: formData }
  );
  if (!uploadRes.ok) {
    throw new Error("사진 업로드에 실패했어요.");
  }

  return signed.publicId;
}

export async function submitReview(input: {
  reservationId: string;
  rating: number;
  content: string;
  publicIds?: string[];
}): Promise<{ companyId: string }> {
  return apiFetch<{ companyId: string }>(
    `/api/mobile/reservations/${input.reservationId}/review`,
    {
      method: "POST",
      body: { rating: input.rating, content: input.content, publicIds: input.publicIds ?? [] },
    }
  );
}
