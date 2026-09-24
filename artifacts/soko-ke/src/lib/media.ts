
export type MediaPurpose =
  | "product"
  | "category"
  | "merchant-logo";

export type MediaUploadResult = {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  expiresIn: number;
};

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function uploadImage(
  file: File,
  purpose: MediaPurpose
): Promise<MediaUploadResult> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(
      "Only JPEG, PNG, and WebP images are supported"
    );
  }

  if (
    file.size <= 0 ||
    file.size > MAX_IMAGE_SIZE_BYTES
  ) {
    throw new Error(
      "Image must be 5 MiB or smaller"
    );
  }

  // Request a presigned upload URL from the SokoKE API.
  const presignResponse = await fetch(
    "/api/media/upload-url",
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        purpose,
        contentType: file.type,
        fileSize: file.size,
      }),
    }
  );

  const presignBody = await presignResponse
    .json()
    .catch(() => ({}));

  if (!presignResponse.ok) {
    throw new Error(
      presignBody.error ??
        "Could not prepare image upload"
    );
  }

  const upload =
    presignBody as MediaUploadResult;

  // Upload the file directly to S3.
  // Do not send Clerk cookies or application credentials.
  const uploadResponse = await fetch(
    upload.uploadUrl,
    {
      method: "PUT",
      headers: {
        "Content-Type": file.type,
      },
      body: file,
    }
  );

  if (!uploadResponse.ok) {
    throw new Error(
      `Image upload failed (${uploadResponse.status})`
    );
  }

  return upload;
}
