import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type MediaPurpose =
  | "product"
  | "category"
  | "merchant-logo";

type CreateUploadUrlInput = {
  purpose: MediaPurpose;
  contentType: string;
  ownerId?: number;
};

function getMediaConfig() {
  const region =
    process.env.AWS_REGION ??
    process.env.AWS_DEFAULT_REGION;

  const bucket =
    process.env.MEDIA_BUCKET_NAME;

  const publicBaseUrl =
    process.env.MEDIA_PUBLIC_BASE_URL;

  if (!region) {
    throw new Error(
      "AWS_REGION is not configured"
    );
  }

  if (!bucket) {
    throw new Error(
      "MEDIA_BUCKET_NAME is not configured"
    );
  }

  if (!publicBaseUrl) {
    throw new Error(
      "MEDIA_PUBLIC_BASE_URL is not configured"
    );
  }

  return {
    region,
    bucket,
    publicBaseUrl:
      publicBaseUrl.replace(/\/+$/, ""),
  };
}

function extensionForContentType(
  contentType: string
) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      throw new Error(
        "Unsupported image content type"
      );
  }
}

function createObjectKey({
  purpose,
  contentType,
  ownerId,
}: CreateUploadUrlInput) {
  const extension =
    extensionForContentType(contentType);

  const id = randomUUID();

  switch (purpose) {
    case "product":
      if (ownerId === undefined ) {
        throw new Error(
          "Product uploads require an owner ID"
        );
      }

      return `products/${ownerId}/${id}.${extension}`;

    case "merchant-logo":
      if (ownerId === undefined ) {
        throw new Error(
          "Merchant logo uploads require an owner ID"
        );
      }

      return `merchants/${ownerId}/${id}.${extension}`;

    case "category":
      return `categories/${id}.${extension}`;
  }
}

export function isAllowedImageType(
  contentType: string
) {
  return ALLOWED_IMAGE_TYPES.has(contentType);
}

export async function createMediaUploadUrl(
  input: CreateUploadUrlInput
) {
  const {
    region,
    bucket,
    publicBaseUrl,
  } = getMediaConfig();

  const key = createObjectKey(input);

  const client = new S3Client({
    region,
  });

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: input.contentType,
  });

  const uploadUrl = await getSignedUrl(
    client,
    command,
    {
      expiresIn: 300,
    }
  );

  return {
    uploadUrl,
    key,
    publicUrl:
      `${publicBaseUrl}/${key}`,
    expiresIn: 300,
  };
}
