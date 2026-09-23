import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import Stripe from "stripe";
import {
  db,
  merchantsTable,
  productsTable,
  promotionCampaignsTable,
  usersTable,
} from "@workspace/db";
import {
  requireAuth,
  requireRole,
  ensureUser,
} from "../lib/auth";

const router: IRouter = Router();

function getStripe(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured"
    );
  }

  return new Stripe(secretKey);
}

const promotionPackages = [
  {
    id: "boost",
    name: "Boost",
    durationDays: 7,
    priceKes: 1500,
    description:
      "Move your product higher in category results.",
  },
  {
    id: "spotlight",
    name: "Spotlight",
    durationDays: 14,
    priceKes: 3500,
    description:
      "Stand out with a sponsored badge and priority placement.",
  },
  {
    id: "homepage",
    name: "Homepage feature",
    durationDays: 30,
    priceKes: 8000,
    description:
      "Get premium placement in SokoKe's homepage featured collection.",
  },
] as const;

const merchantEditableFields = [
  "name",
  "email",
  "phone",
  "county",
  "description",
] as const;

function getMerchantProfileUpdate(body: unknown) {
  const source =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};

  const update: Partial<
    Pick<
      typeof merchantsTable.$inferInsert,
      | "name"
      | "email"
      | "phone"
      | "county"
      | "description"
    >
  > = {};

  for (const field of merchantEditableFields) {
    const value = source[field];

    if (value !== undefined) {
      if (
        typeof value !== "string" ||
        !value.trim()
      ) {
        return {
          error: `${field} must be a non-empty string`,
          update: null,
        };
      }

      update[field] = value.trim();
    }
  }

  if (Object.keys(update).length === 0) {
    return {
      error:
        "At least one merchant profile field is required",
      update: null,
    };
  }

  return {
    error: null,
    update,
  };
}

function getMerchantProductUpdate(body: unknown) {
  const source =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};

  const requiredTextFields = [
    "name",
    "description",
    "category",
    "imageUrl",
    "county",
  ] as const;

  for (const field of requiredTextFields) {
    const value = source[field];

    if (
      typeof value !== "string" ||
      !value.trim()
    ) {
      return {
        error: `${field} must be a non-empty string`,
        update: null,
      };
    }
  }

  const priceKes = Number(source.priceKes);
  const stock = Number(source.stock);

  if (
    !Number.isFinite(priceKes) ||
    priceKes < 0
  ) {
    return {
      error:
        "priceKes must be a non-negative number",
      update: null,
    };
  }

  if (
    !Number.isInteger(stock) ||
    stock < 0
  ) {
    return {
      error:
        "stock must be a non-negative whole number",
      update: null,
    };
  }

  return {
    error: null,
    update: {
      name: String(source.name).trim(),
      description: String(
        source.description
      ).trim(),
      priceKes: String(priceKes),
      category: String(source.category).trim(),
      imageUrl: String(source.imageUrl).trim(),
      stock,
      county: String(source.county).trim(),
    },
  };
}

router.get(
  "/me",
  async (req, res): Promise<void> => {
    const user = await ensureUser(req);

    if (!user) {
      res.json({
        signedIn: false,
        role: "customer",
        merchant: null,
      });
      return;
    }

    const merchant = user.merchantId
      ? (
          await db
            .select()
            .from(merchantsTable)
            .where(
              eq(
                merchantsTable.id,
                user.merchantId
              )
            )
        )[0]
      : null;

    res.json({
      signedIn: true,
      clerkUserId: user.clerkUserId,
      role: user.role,
      merchant: merchant
        ? formatMerchant(merchant)
        : null,
    });
  }
);

router.post(
  "/merchants/apply",
  requireAuth,
  async (req, res): Promise<void> => {
    const user =
      res.locals
        .user as typeof usersTable.$inferSelect;

    const {
      name,
      email,
      phone,
      county,
      description,
    } = req.body ?? {};

    if (
      ![
        name,
        email,
        phone,
        county,
        description,
      ].every(
        (value) =>
          typeof value === "string" &&
          value.trim()
      )
    ) {
      res.status(400).json({
        error:
          "Name, email, phone, county, and description are required",
      });
      return;
    }

    const current = await db
      .select()
      .from(merchantsTable)
      .where(
        eq(
          merchantsTable.ownerClerkId,
          user.clerkUserId
        )
      );

    if (current[0]) {
      res.status(409).json({
        error:
          "You already have a merchant application",
        merchant: formatMerchant(current[0]),
      });
      return;
    }

    const slug = `${name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${Date.now().toString(
      36
    )}`;

    const [merchant] = await db
      .insert(merchantsTable)
      .values({
        name: name.trim(),
        slug,
        ownerClerkId: user.clerkUserId,
        email: email.trim(),
        phone: phone.trim(),
        county: county.trim(),
        description: description.trim(),
      })
      .returning();

    await db
      .update(usersTable)
      .set({
        merchantId: merchant.id,
      })
      .where(
        eq(
          usersTable.clerkUserId,
          user.clerkUserId
        )
      );

    res
      .status(201)
      .json(formatMerchant(merchant));
  }
);

router.patch(
  "/merchant/profile",
  requireAuth,
  async (req, res): Promise<void> => {
    const user =
      res.locals
        .user as typeof usersTable.$inferSelect;

    if (!user.merchantId) {
      res.status(404).json({
        error:
          "Merchant application not found",
      });
      return;
    }

    const [current] = await db
      .select()
      .from(merchantsTable)
      .where(
        and(
          eq(
            merchantsTable.id,
            user.merchantId
          ),
          eq(
            merchantsTable.ownerClerkId,
            user.clerkUserId
          )
        )
      );

    if (!current) {
      res.status(404).json({
        error:
          "Merchant application not found",
      });
      return;
    }

    const { update, error } =
      getMerchantProfileUpdate(req.body);

    if (!update) {
      res.status(400).json({ error });
      return;
    }

    const resubmitting =
      current.status === "rejected";

    const [merchant] = await db
      .update(merchantsTable)
      .set({
        ...update,
        ...(resubmitting
          ? {
              status: "pending",
              approvedAt: null,
            }
          : {}),
      })
      .where(
        eq(merchantsTable.id, current.id)
      )
      .returning();

    if (resubmitting) {
      await db
        .update(usersTable)
        .set({
          role: "customer",
        })
        .where(
          eq(
            usersTable.clerkUserId,
            user.clerkUserId
          )
        );
    }

    res.json(formatMerchant(merchant));
  }
);

router.get(
  "/merchants",
  requireRole("platform_admin"),
  async (_req, res): Promise<void> => {
    const merchants = await db
      .select()
      .from(merchantsTable)
      .orderBy(
        desc(merchantsTable.createdAt)
      );

    res.json(
      merchants.map(formatMerchant)
    );
  }
);

router.patch(
  "/merchants/:id",
  requireRole("platform_admin"),
  async (req, res): Promise<void> => {
    const id = Number(req.params.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      res.status(400).json({
        error:
          "A valid merchant ID is required",
      });
      return;
    }

    const { update, error } =
      getMerchantProfileUpdate(req.body);

    if (!update) {
      res.status(400).json({ error });
      return;
    }

    const [merchant] = await db
      .update(merchantsTable)
      .set(update)
      .where(
        eq(merchantsTable.id, id)
      )
      .returning();

    if (!merchant) {
      res.status(404).json({
        error:
          "Merchant application not found",
      });
      return;
    }

    res.json(formatMerchant(merchant));
  }
);

router.patch(
  "/merchants/:id/status",
  requireRole("platform_admin"),
  async (req, res): Promise<void> => {
    const status = req.body?.status;

    if (
      ![
        "approved",
        "rejected",
        "pending",
      ].includes(status)
    ) {
      res.status(400).json({
        error:
          "Status must be pending, approved, or rejected",
      });
      return;
    }

    const id = Number(req.params.id);

    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      res.status(400).json({
        error:
          "A valid merchant ID is required",
      });
      return;
    }

    const [merchant] = await db
      .update(merchantsTable)
      .set({
        status,
        approvedAt:
          status === "approved"
            ? new Date()
            : null,
      })
      .where(
        eq(merchantsTable.id, id)
      )
      .returning();

    if (!merchant) {
      res.status(404).json({
        error:
          "Merchant application not found",
      });
      return;
    }

    await db
      .update(usersTable)
      .set({
        role:
          status === "approved"
            ? "merchant"
            : "customer",
      })
      .where(
        eq(usersTable.merchantId, id)
      );

    res.json(formatMerchant(merchant));
  }
);

router.get(
  "/admin/products",
  requireRole("platform_admin"),
  async (_req, res): Promise<void> => {
    const products = await db
      .select()
      .from(productsTable)
      .orderBy(
        desc(productsTable.createdAt)
      );

    res.json(
      products.map(formatProduct)
    );
  }
);

router.patch(
  "/admin/products/:id/status",
  requireRole("platform_admin"),
  async (req, res): Promise<void> => {
    const status = req.body?.status;
    const productId = Number(
      req.params.id
    );

    if (
      ![
        "pending",
        "approved",
        "rejected",
      ].includes(status)
    ) {
      res.status(400).json({
        error:
          "Status must be pending, approved, or rejected",
      });
      return;
    }

    if (
      !Number.isInteger(productId) ||
      productId <= 0
    ) {
      res.status(400).json({
        error:
          "A valid product ID is required",
      });
      return;
    }

    const [product] = await db
      .update(productsTable)
      .set({
        listingStatus: status,
      })
      .where(
        eq(productsTable.id, productId)
      )
      .returning();

    if (!product) {
      res.status(404).json({
        error: "Product not found",
      });
      return;
    }

    res.json(formatProduct(product));
  }
);

router.get(
  "/merchant/products",
  requireRole("merchant"),
  async (_req, res): Promise<void> => {
    const user =
      res.locals
        .user as typeof usersTable.$inferSelect;

    const products = await db
      .select()
      .from(productsTable)
      .where(
        eq(
          productsTable.merchantId,
          user.merchantId!
        )
      )
      .orderBy(
        desc(productsTable.createdAt)
      );

    res.json(
      products.map(formatProduct)
    );
  }
);

router.post(
  "/merchant/products",
  requireRole("merchant"),
  async (req, res): Promise<void> => {
    const user =
      res.locals
        .user as typeof usersTable.$inferSelect;

    const {
      name,
      description,
      priceKes,
      category,
      imageUrl,
      stock,
      county,
    } = req.body ?? {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof description !== "string" ||
      !description.trim() ||
      typeof category !== "string" ||
      !category.trim() ||
      typeof imageUrl !== "string" ||
      !imageUrl.trim()
    ) {
      res.status(400).json({
        error:
          "Name, description, category, and image URL are required",
      });
      return;
    }

    const numericPrice = Number(priceKes);
    const numericStock = Number(stock);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      res.status(400).json({
        error:
          "Price must be a non-negative number",
      });
      return;
    }

    if (
      !Number.isInteger(numericStock) ||
      numericStock < 0
    ) {
      res.status(400).json({
        error:
          "Stock must be a non-negative whole number",
      });
      return;
    }

    const [merchant] = await db
      .select()
      .from(merchantsTable)
      .where(
        eq(
          merchantsTable.id,
          user.merchantId!
        )
      );

    if (
      !merchant ||
      merchant.status !== "approved"
    ) {
      res.status(403).json({
        error:
          "Only approved merchants can create products",
      });
      return;
    }

    const [product] = await db
      .insert(productsTable)
      .values({
        name: name.trim(),
        description: description.trim(),
        priceKes: String(numericPrice),
        category: category.trim(),
        imageUrl: imageUrl.trim(),
        stock: numericStock,
        sellerName: merchant.name,
        county:
          typeof county === "string" &&
          county.trim()
            ? county.trim()
            : merchant.county,
        ownerType: "merchant",
        merchantId: user.merchantId!,
        listingStatus: "pending",
      })
      .returning();

    await db
      .update(merchantsTable)
      .set({
        productCount: sql`
          ${merchantsTable.productCount} + 1
        `,
      })
      .where(
        eq(
          merchantsTable.id,
          user.merchantId!
        )
      );

    res
      .status(201)
      .json(formatProduct(product));
  }
);

router.patch(
  "/merchant/products/:id",
  requireRole("merchant"),
  async (req, res): Promise<void> => {
    const user =
      res.locals
        .user as typeof usersTable.$inferSelect;

    const productId = Number(
      req.params.id
    );

    if (
      !Number.isInteger(productId) ||
      productId <= 0
    ) {
      res.status(400).json({
        error:
          "A valid product ID is required",
      });
      return;
    }

    const [owned] = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(
            productsTable.id,
            productId
          ),
          eq(
            productsTable.merchantId,
            user.merchantId!
          )
        )
      );

    if (!owned) {
      res.status(404).json({
        error: "Product not found",
      });
      return;
    }

    const { update, error } =
      getMerchantProductUpdate(req.body);

    if (!update) {
      res.status(400).json({ error });
      return;
    }
    const [product] = await db
     .update(productsTable)
     .set({
       ...update,
       listingStatus: "pending",
   })
   .where(
     and(
        eq(productsTable.id, productId),
        eq(productsTable.merchantId, user.merchantId!),
    ),
  )
  .returning();

res.json(formatProduct(product));
  }
);

router.delete(
  "/merchant/products/:id",
  requireRole("merchant"),
  async (req, res): Promise<void> => {
    const user =
      res.locals
        .user as typeof usersTable.$inferSelect;

    const productId = Number(
      req.params.id
    );

    if (
      !Number.isInteger(productId) ||
      productId <= 0
    ) {
      res.status(400).json({
        error:
          "A valid product ID is required",
      });
      return;
    }

    const [deleted] = await db
      .delete(productsTable)
      .where(
        and(
          eq(
            productsTable.id,
            productId
          ),
          eq(
            productsTable.merchantId,
            user.merchantId!
          )
        )
      )
      .returning();

    if (!deleted) {
      res.status(404).json({
        error: "Product not found",
      });
      return;
    }

    await db
      .update(merchantsTable)
      .set({
        productCount: sql`
          greatest(
            ${merchantsTable.productCount} - 1,
            0
          )
        `,
      })
      .where(
        eq(
          merchantsTable.id,
          user.merchantId!
        )
      );

    res.sendStatus(204);
  }
);

router.get(
  "/promotions/packages",
  (_req, res) => {
    res.json(promotionPackages);
  }
);

router.get(
  "/promotions",
  requireAuth,
  async (_req, res): Promise<void> => {
    const user =
      res.locals
        .user as typeof usersTable.$inferSelect;

    const conditions =
      user.role === "platform_admin"
        ? undefined
        : eq(
            promotionCampaignsTable.merchantId,
            user.merchantId!
          );

    const campaigns = await db
      .select()
      .from(promotionCampaignsTable)
      .where(conditions)
      .orderBy(
        desc(
          promotionCampaignsTable.createdAt
        )
      );

    res.json(
      campaigns.map(formatPromotion)
    );
  }
);

router.post(
  "/promotions/checkout",
  requireRole("merchant"),
  async (req, res): Promise<void> => {
    const user =
      res.locals
        .user as typeof usersTable.$inferSelect;

    const {
      productId,
      packageId,
    } = req.body ?? {};

    const pkg =
      promotionPackages.find(
        (item) =>
          item.id === packageId
      );

    if (
      !pkg ||
      !Number.isInteger(
        Number(productId)
      )
    ) {
      res.status(400).json({
        error:
          "A valid product and promotion package are required",
      });
      return;
    }

    const [product] = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(
            productsTable.id,
            Number(productId)
          ),
          eq(
            productsTable.merchantId,
            user.merchantId!
          ),
          eq(
            productsTable.listingStatus,
            "approved"
          )
        )
      );

    if (!product) {
      res.status(404).json({
        error:
          "Only your approved products can be promoted",
      });
      return;
    }

    const stripe = getStripe();

    const baseUrl =
      process.env.PUBLIC_APP_URL ??
      `${req.protocol}://${req.get("host")}`;

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "kes",
              unit_amount:
                pkg.priceKes * 100,
              product_data: {
                name: `SokoKE ${pkg.name}`,
                description:
                  pkg.description,
              },
            },
          },
        ],
        success_url:
          `${baseUrl}/merchant?promotion=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url:
          `${baseUrl}/merchant?promotion=cancelled`,
        metadata: {
          merchantId: String(
            user.merchantId!
          ),
          productId: String(
            product.id
          ),
          packageId: pkg.id,
        },
      });

    if (!session.url) {
      res.status(502).json({
        error:
          "Stripe did not return a checkout URL",
      });
      return;
    }

    const [campaign] = await db
      .insert(promotionCampaignsTable)
      .values({
        merchantId: user.merchantId!,
        productId: product.id,
        tier: pkg.id,
        status: "pending_payment",
        amountKes: String(
          pkg.priceKes
        ),
        stripeCheckoutSessionId:
          session.id,
      })
      .returning();

    res.status(201).json({
      checkoutUrl: session.url,
      campaign:
        formatPromotion(campaign),
    });
  }
);

router.get(
  "/promotions/confirm",
  requireAuth,
  async (req, res): Promise<void> => {
    const sessionId = String(
      req.query.session_id ?? ""
    );

    if (!sessionId) {
      res.status(400).json({
        error:
          "Missing checkout session",
      });
      return;
    }

    const stripe = getStripe();

    const session =
      await stripe.checkout.sessions.retrieve(
        sessionId
      );

    if (
      session.id !== sessionId ||
      session.payment_status !== "paid"
    ) {
      res.status(402).json({
        error:
          "Payment has not been confirmed",
      });
      return;
    }

    const user =
      res.locals
        .user as typeof usersTable.$inferSelect;

    const [campaign] = await db
      .select()
      .from(promotionCampaignsTable)
      .where(
        eq(
          promotionCampaignsTable
            .stripeCheckoutSessionId,
          sessionId
        )
      );

    if (
      !campaign ||
      (user.role !== "platform_admin" &&
        campaign.merchantId !==
          user.merchantId)
    ) {
      res.status(404).json({
        error:
          "Promotion campaign not found",
      });
      return;
    }

    if (campaign.status === "active") {
      res.json(
        formatPromotion(campaign)
      );
      return;
    }

    const pkg =
      promotionPackages.find(
        (item) =>
          item.id === campaign.tier
      );

    if (!pkg) {
      res.status(400).json({
        error:
          "Promotion package no longer exists",
      });
      return;
    }

    const [product] = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(
            productsTable.id,
            campaign.productId
          ),
          eq(
            productsTable.merchantId,
            campaign.merchantId
          ),
          eq(
            productsTable.listingStatus,
            "approved"
          )
        )
      );

    if (!product) {
      res.status(409).json({
        error:
          "The product is no longer approved for promotion",
      });
      return;
    }

    const startsAt = new Date();

    const endsAt = new Date(
      startsAt.getTime() +
        pkg.durationDays *
          24 *
          60 *
          60 *
          1000
    );

    const [updated] = await db
      .update(promotionCampaignsTable)
      .set({
        status: "active",
        startsAt,
        endsAt,
      })
      .where(
        eq(
          promotionCampaignsTable.id,
          campaign.id
        )
      )
      .returning();

    await db
      .update(productsTable)
      .set({
        isSponsored: true,
        featured: true,
        sponsoredUntil: endsAt,
        promotionTier: pkg.id,
      })
      .where(
        eq(
          productsTable.id,
          campaign.productId
        )
      );

    res.json(
      formatPromotion(updated)
    );
  }
);

function formatMerchant(
  merchant:
    typeof merchantsTable.$inferSelect
) {
  return {
    ...merchant,
    createdAt:
      merchant.createdAt.toISOString(),
    approvedAt:
      merchant.approvedAt?.toISOString() ??
      null,
  };
}

function formatProduct(
  product:
    typeof productsTable.$inferSelect
) {
  return {
    ...product,
    priceKes:
      Number(product.priceKes),
    rating:
      Number(product.rating),
    createdAt:
      product.createdAt.toISOString(),
    sponsoredUntil:
      product.sponsoredUntil?.toISOString() ??
      null,
  };
}

function formatPromotion(
  campaign:
    typeof promotionCampaignsTable.$inferSelect
) {
  return {
    ...campaign,
    amountKes:
      Number(campaign.amountKes),
    createdAt:
      campaign.createdAt.toISOString(),
    startsAt:
      campaign.startsAt?.toISOString() ??
      null,
    endsAt:
      campaign.endsAt?.toISOString() ??
      null,
  };
}

export default router;
