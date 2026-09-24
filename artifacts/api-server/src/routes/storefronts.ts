
import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";

import {
  db,
  merchantsTable,
  productsTable,
} from "@workspace/db";

const router: IRouter = Router();

/**
 * Public merchant storefront.
 *
 * Only approved merchants and approved products
 * are visible to customers.
 */
router.get(
  "/storefronts/:slug",
  async (req, res): Promise<void> => {
    const slug = req.params.slug?.trim();

    if (!slug) {
      res.status(400).json({
        error: "Merchant slug is required",
      });
      return;
    }

    const [merchant] = await db
      .select({
        id: merchantsTable.id,
        name: merchantsTable.name,
        slug: merchantsTable.slug,
        email: merchantsTable.email,
        phone: merchantsTable.phone,
        county: merchantsTable.county,
        description: merchantsTable.description,
        logoUrl: merchantsTable.logoUrl,
        approvedAt: merchantsTable.approvedAt,
      })
      .from(merchantsTable)
      .where(
        and(
          eq(merchantsTable.slug, slug),
          eq(merchantsTable.status, "approved"),
        ),
      )
      .limit(1);

    if (!merchant) {
      res.status(404).json({
        error: "Merchant storefront not found",
      });
      return;
    }

    const products = await db
      .select({
        id: productsTable.id,
        name: productsTable.name,
        description: productsTable.description,
        priceKes: productsTable.priceKes,
        category: productsTable.category,
        imageUrl: productsTable.imageUrl,
        stock: productsTable.stock,
        rating: productsTable.rating,
        reviewCount: productsTable.reviewCount,
        county: productsTable.county,
        featured: productsTable.featured,
        isSponsored: productsTable.isSponsored,
        createdAt: productsTable.createdAt,
      })
      .from(productsTable)
      .where(
        and(
          eq(productsTable.merchantId, merchant.id),
          eq(productsTable.listingStatus, "approved"),
        ),
      )
      .orderBy(desc(productsTable.createdAt));

    res.json({
      merchant: {
        ...merchant,
        verified: true,
      },

      products: products.map((product) => ({
        ...product,
        priceKes: Number(product.priceKes),
        rating: Number(product.rating),
      })),

      totalProducts: products.length,
    });
  },
);

export default router;
