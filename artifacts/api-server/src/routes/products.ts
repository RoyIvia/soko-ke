import { Router, type IRouter } from "express";
import {
  and,
  eq,
  ilike,
  or,
  gte,
  lte,
  desc,
  asc,
  sql,
} from "drizzle-orm";
import {
  db,
  productsTable,
  reviewsTable,
} from "@workspace/db";
import {
  ListProductsQueryParams,
  ListProductsResponse,
  CreateProductBody,
  CreateProductResponse,
  GetFeaturedProductsResponse,
  GetProductParams,
  GetProductResponse,
  UpdateProductParams,
  UpdateProductBody,
  UpdateProductResponse,
  DeleteProductParams,
  GetProductReviewsParams,
  GetProductReviewsResponse,
  CreateReviewParams,
  CreateReviewBody,
  CreateReviewResponse,
} from "@workspace/api-zod";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

router.get(
  "/products",
  async (req, res): Promise<void> => {
    const parsed = ListProductsQueryParams.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const {
      category,
      search,
      sort,
      minPrice,
      maxPrice,
      limit = 20,
      offset = 0,
    } = parsed.data;

    /*
     * Public catalogue queries must only expose products
     * that have been approved by the platform.
     */
    const conditions = [
      eq(productsTable.listingStatus, "approved"),
    ];

    if (category) {
      conditions.push(
        eq(productsTable.category, category),
      );
    }

    /*
     * Search is case-insensitive and covers the fields
     * customers are most likely to search by.
     *
     * Examples:
     *   "iphone"  -> product name
     *   "phone"   -> description/category
     *   "nairobi" -> county
     *   "acme"    -> seller
     */
    const normalizedSearch = search?.trim();

    if (normalizedSearch) {
      const searchPattern = `%${normalizedSearch}%`;

      const searchCondition = or(
        ilike(productsTable.name, searchPattern),
        ilike(productsTable.description, searchPattern),
        ilike(productsTable.category, searchPattern),
        ilike(productsTable.sellerName, searchPattern),
        ilike(productsTable.county, searchPattern),
      );

      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    if (minPrice != null) {
      conditions.push(
        gte(
          productsTable.priceKes,
          String(minPrice),
        ),
      );
    }

    if (maxPrice != null) {
      conditions.push(
        lte(
          productsTable.priceKes,
          String(maxPrice),
        ),
      );
    }

    const whereCondition = and(...conditions);

    let query = db
      .select()
      .from(productsTable)
      .where(whereCondition)
      .$dynamic();

    if (sort === "price_asc") {
      query = query.orderBy(
        asc(productsTable.priceKes),
      );
    } else if (sort === "price_desc") {
      query = query.orderBy(
        desc(productsTable.priceKes),
      );
    } else if (sort === "popular") {
      query = query.orderBy(
        desc(productsTable.reviewCount),
      );
    } else {
      query = query.orderBy(
        desc(productsTable.createdAt),
      );
    }

    const [countResult] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(productsTable)
      .where(whereCondition);

    const products = await query
      .limit(Number(limit))
      .offset(Number(offset));

    res.json(
      ListProductsResponse.parse({
        products: products.map(formatProduct),
        total: Number(countResult?.count ?? 0),
      }),
    );
  },
);

router.post(
  "/products",
  requireRole("platform_admin"),
  async (req, res): Promise<void> => {
    const parsed = CreateProductBody.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const [product] = await db
      .insert(productsTable)
      .values({
        ...parsed.data,
        priceKes: String(parsed.data.priceKes),
        stock: Number(parsed.data.stock),
        featured: parsed.data.featured ?? false,
        ownerType: "soko",
        merchantId: null,
        listingStatus: "approved",
      })
      .returning();

    res
      .status(201)
      .json(
        CreateProductResponse.parse(
          formatProduct(product),
        ),
      );
  },
);

router.get(
  "/products/featured",
  async (_req, res): Promise<void> => {
    const products = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(
            productsTable.featured,
            true,
          ),
          eq(
            productsTable.listingStatus,
            "approved",
          ),
        ),
      )
      .orderBy(
        desc(productsTable.createdAt),
      )
      .limit(8);

    res.json(
      GetFeaturedProductsResponse.parse(
        products.map(formatProduct),
      ),
    );
  },
);

router.get(
  "/products/:id",
  async (req, res): Promise<void> => {
    const params = GetProductParams.safeParse(
      req.params,
    );

    if (!params.success) {
      res.status(400).json({
        error: params.error.message,
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
            params.data.id,
          ),
          eq(
            productsTable.listingStatus,
            "approved",
          ),
        ),
      );

    if (!product) {
      res.status(404).json({
        error: "Product not found",
      });
      return;
    }

    res.json(
      GetProductResponse.parse(
        formatProduct(product),
      ),
    );
  },
);

router.patch(
  "/products/:id",
  requireRole("platform_admin"),
  async (req, res): Promise<void> => {
    const params = UpdateProductParams.safeParse(
      req.params,
    );

    if (!params.success) {
      res.status(400).json({
        error: params.error.message,
      });
      return;
    }

    const parsed = UpdateProductBody.safeParse(
      req.body,
    );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const updateData: Record<
      string,
      unknown
    > = {
      ...parsed.data,
    };

    if (parsed.data.priceKes != null) {
      updateData.priceKes = String(
        parsed.data.priceKes,
      );
    }

    const [product] = await db
      .update(productsTable)
      .set(updateData)
      .where(
        eq(
          productsTable.id,
          params.data.id,
        ),
      )
      .returning();

    if (!product) {
      res.status(404).json({
        error: "Product not found",
      });
      return;
    }

    res.json(
      UpdateProductResponse.parse(
        formatProduct(product),
      ),
    );
  },
);

router.delete(
  "/products/:id",
  requireRole("platform_admin"),
  async (req, res): Promise<void> => {
    const params = DeleteProductParams.safeParse(
      req.params,
    );

    if (!params.success) {
      res.status(400).json({
        error: params.error.message,
      });
      return;
    }

    const [deleted] = await db
      .delete(productsTable)
      .where(
        eq(
          productsTable.id,
          params.data.id,
        ),
      )
      .returning();

    if (!deleted) {
      res.status(404).json({
        error: "Product not found",
      });
      return;
    }

    res.sendStatus(204);
  },
);

// Reviews
router.get(
  "/products/:id/reviews",
  async (req, res): Promise<void> => {
    const params =
      GetProductReviewsParams.safeParse(
        req.params,
      );

    if (!params.success) {
      res.status(400).json({
        error: params.error.message,
      });
      return;
    }

    /*
     * Do not expose reviews for products
     * that are not publicly available.
     */
    const [product] = await db
      .select({
        id: productsTable.id,
      })
      .from(productsTable)
      .where(
        and(
          eq(
            productsTable.id,
            params.data.id,
          ),
          eq(
            productsTable.listingStatus,
            "approved",
          ),
        ),
      );

    if (!product) {
      res.status(404).json({
        error: "Product not found",
      });
      return;
    }

    const reviews = await db
      .select()
      .from(reviewsTable)
      .where(
        eq(
          reviewsTable.productId,
          params.data.id,
        ),
      )
      .orderBy(
        desc(reviewsTable.createdAt),
      );

    res.json(
      GetProductReviewsResponse.parse(
        reviews.map(formatReview),
      ),
    );
  },
);

router.post(
  "/products/:id/reviews",
  async (req, res): Promise<void> => {
    const params =
      CreateReviewParams.safeParse(
        req.params,
      );

    if (!params.success) {
      res.status(400).json({
        error: params.error.message,
      });
      return;
    }

    /*
     * A rejected or pending product must
     * not receive public reviews.
     */
    const [product] = await db
      .select({
        id: productsTable.id,
      })
      .from(productsTable)
      .where(
        and(
          eq(
            productsTable.id,
            params.data.id,
          ),
          eq(
            productsTable.listingStatus,
            "approved",
          ),
        ),
      );

    if (!product) {
      res.status(404).json({
        error: "Product not found",
      });
      return;
    }

    const parsed =
      CreateReviewBody.safeParse(
        req.body,
      );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const [review] = await db
      .insert(reviewsTable)
      .values({
        productId: params.data.id,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
        authorName:
          parsed.data.authorName,
      })
      .returning();

    const reviews = await db
      .select()
      .from(reviewsTable)
      .where(
        eq(
          reviewsTable.productId,
          params.data.id,
        ),
      );

    const avgRating =
      reviews.reduce(
        (sum, item) =>
          sum + item.rating,
        0,
      ) / reviews.length;

    await db
      .update(productsTable)
      .set({
        rating: String(
          avgRating.toFixed(2),
        ),
        reviewCount: reviews.length,
      })
      .where(
        eq(
          productsTable.id,
          params.data.id,
        ),
      );

    res
      .status(201)
      .json(
        CreateReviewResponse.parse(
          formatReview(review),
        ),
      );
  },
);

function formatProduct(
  p: typeof productsTable.$inferSelect,
) {
  return {
    ...p,
    priceKes: Number(p.priceKes),
    rating: Number(p.rating),
    createdAt:
      p.createdAt.toISOString(),
  };
}

function formatReview(
  r: typeof reviewsTable.$inferSelect,
) {
  return {
    ...r,
    createdAt:
      r.createdAt.toISOString(),
  };
}

export default router;
