
import { Router, type IRouter } from "express";
import { db, merchantsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireRole } from "../lib/auth";
import {
  createMediaUploadUrl,
  isAllowedImageType,
  type MediaPurpose,
} from "../lib/media";

const router: IRouter = Router();

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const validPurposes = new Set<MediaPurpose>([
  "product",
  "category",
  "merchant-logo",
]);

router.post(
  "/media/upload-url",
  requireRole("merchant", "platform_admin"),
  async (req, res): Promise<void> => {
    try {
      const user =
        res.locals.user as typeof usersTable.$inferSelect;

      const {
        purpose,
        contentType,
        fileSize,
      } = req.body ?? {};

      // Validate upload purpose.
      if (
        typeof purpose !== "string" ||
        !validPurposes.has(purpose as MediaPurpose)
      ) {
        res.status(400).json({
          error: "Invalid media purpose",
        });
        return;
      }

      // Validate supported image formats.
      if (
        typeof contentType !== "string" ||
        !isAllowedImageType(contentType)
      ) {
        res.status(400).json({
          error:
            "Only JPEG, PNG, and WebP images are supported",
        });
        return;
      }

      // Maximum declared image size: 5 MiB.
      if (
        typeof fileSize !== "number" ||
        !Number.isSafeInteger(fileSize) ||
        fileSize <= 0 ||
        fileSize > MAX_IMAGE_SIZE_BYTES
      ) {
        res.status(400).json({
          error: "Image must be 5 MiB or smaller",
        });
        return;
      }

      const mediaPurpose = purpose as MediaPurpose;

      // Category images are managed by platform administrators.
      if (
        mediaPurpose === "category" &&
        user.role !== "platform_admin"
      ) {
        res.status(403).json({
          error:
            "Only platform administrators can upload category images",
        });
        return;
      }

      let ownerId: number | undefined;

      // Resolve merchant ownership from the authenticated user.
      if (user.role === "merchant") {
        if (!user.merchantId) {
          res.status(403).json({
            error:
              "No merchant account is associated with this user",
          });
          return;
        }

        const [merchant] = await db
          .select({
            id: merchantsTable.id,
            status: merchantsTable.status,
          })
          .from(merchantsTable)
          .where(
            eq(merchantsTable.id, user.merchantId)
          );

        if (
          !merchant ||
          merchant.status !== "approved"
        ) {
          res.status(403).json({
            error:
              "Only approved merchants can upload marketplace media",
          });
          return;
        }

        ownerId = merchant.id;
      }

      // Merchant logos must belong to the authenticated merchant.
      if (
        user.role === "platform_admin" &&
        mediaPurpose === "merchant-logo"
      ) {
        res.status(400).json({
          error:
            "Administrator merchant-logo uploads are not supported by this endpoint",
        });
        return;
      }

      // Reserve owner ID 0 for SokoKE-owned product images.
      if (
        user.role === "platform_admin" &&
        mediaPurpose === "product"
      ) {
        ownerId = 0;
      }

      // Generate the short-lived presigned S3 PUT URL.
      const result = await createMediaUploadUrl({
        purpose: mediaPurpose,
        contentType,
        ownerId,
      });

      res.json(result);
    } catch (error) {
      console.error(
        "Failed to create media upload URL",
        error
      );

      res.status(500).json({
        error: "Could not prepare image upload",
      });
    }
  }
);

export default router;
