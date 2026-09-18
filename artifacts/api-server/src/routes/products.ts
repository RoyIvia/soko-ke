import { Router, type IRouter } from "express";
import { eq, like, gte, lte, desc, asc, sql } from "drizzle-orm";
import { db, productsTable, reviewsTable } from "@workspace/db";
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
import { ensureUser, requireRole } from "../lib/auth";

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  const parsed = ListProductsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { category, search, sort, minPrice, maxPrice, limit = 20, offset = 0 } = parsed.data;
  const viewer = await ensureUser(req);

  let query = db.select().from(productsTable).$dynamic();

  const conditions = [];
  if (viewer?.role !== "platform_admin") conditions.push(eq(productsTable.listingStatus, "approved"));
  if (category) conditions.push(eq(productsTable.category, category));
  if (search) conditions.push(like(productsTable.name, `%${search}%`));
  if (minPrice != null) conditions.push(gte(productsTable.priceKes, String(minPrice)));
  if (maxPrice != null) conditions.push(lte(productsTable.priceKes, String(maxPrice)));

  if (conditions.length > 0) {
    const { and } = await import("drizzle-orm");
    query = query.where(and(...conditions));
  }

  if (sort === "price_asc") query = query.orderBy(asc(productsTable.priceKes));
  else if (sort === "price_desc") query = query.orderBy(desc(productsTable.priceKes));
  else if (sort === "popular") query = query.orderBy(desc(productsTable.reviewCount));
  else query = query.orderBy(desc(productsTable.createdAt));

  const total = await db.select({ count: sql<number>`count(*)` }).from(productsTable)
    .then(r => Number(r[0].count));

  const products = await query.limit(Number(limit)).offset(Number(offset));

  res.json(ListProductsResponse.parse({ products: products.map(formatProduct), total }));
});

router.post("/products", requireRole("platform_admin"), async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db.insert(productsTable).values({
    ...parsed.data,
    priceKes: String(parsed.data.priceKes),
    stock: Number(parsed.data.stock),
    featured: parsed.data.featured ?? false,
    ownerType: "soko",
    merchantId: null,
    listingStatus: "approved",
  }).returning();
  res.status(201).json(CreateProductResponse.parse(formatProduct(product)));
});

router.get("/products/featured", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable)
    .where(eq(productsTable.featured, true))
    .orderBy(desc(productsTable.createdAt))
    .limit(8);
  res.json(GetFeaturedProductsResponse.parse(products.map(formatProduct)));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, params.data.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(GetProductResponse.parse(formatProduct(product)));
});

router.patch("/products/:id", requireRole("platform_admin"), async (req, res): Promise<void> => {
  const params = UpdateProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.priceKes != null) updateData.priceKes = String(parsed.data.priceKes);
  const [product] = await db.update(productsTable).set(updateData).where(eq(productsTable.id, params.data.id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(UpdateProductResponse.parse(formatProduct(product)));
});

router.delete("/products/:id", requireRole("platform_admin"), async (req, res): Promise<void> => {
  const params = DeleteProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [deleted] = await db.delete(productsTable).where(eq(productsTable.id, params.data.id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.sendStatus(204);
});

// Reviews
router.get("/products/:id/reviews", async (req, res): Promise<void> => {
  const params = GetProductReviewsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const reviews = await db.select().from(reviewsTable)
    .where(eq(reviewsTable.productId, params.data.id))
    .orderBy(desc(reviewsTable.createdAt));
  res.json(GetProductReviewsResponse.parse(reviews.map(formatReview)));
});

router.post("/products/:id/reviews", async (req, res): Promise<void> => {
  const params = CreateReviewParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [review] = await db.insert(reviewsTable).values({
    productId: params.data.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
    authorName: parsed.data.authorName,
  }).returning();

  // Update product rating & review count
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.productId, params.data.id));
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await db.update(productsTable).set({
    rating: String(avgRating.toFixed(2)),
    reviewCount: reviews.length,
  }).where(eq(productsTable.id, params.data.id));

  res.status(201).json(CreateReviewResponse.parse(formatReview(review)));
});

function formatProduct(p: typeof productsTable.$inferSelect) {
  return {
    ...p,
    priceKes: Number(p.priceKes),
    rating: Number(p.rating),
    createdAt: p.createdAt.toISOString(),
  };
}

function formatReview(r: typeof reviewsTable.$inferSelect) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
  };
}

export default router;
