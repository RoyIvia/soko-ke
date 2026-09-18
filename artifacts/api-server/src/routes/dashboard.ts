import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import { db, ordersTable, productsTable, categoriesTable, orderItemsTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetRecentOrdersResponse,
  GetTopProductsResponse,
} from "@workspace/api-zod";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireRole("platform_admin"), async (_req, res): Promise<void> => {
  const [ordersCount] = await db.select({ count: sql<number>`count(*)` }).from(ordersTable);
  const [revenue] = await db.select({ total: sql<string>`coalesce(sum(total_kes), 0)` }).from(ordersTable);
  const [productsCount] = await db.select({ count: sql<number>`count(*)` }).from(productsTable);
  const [categoriesCount] = await db.select({ count: sql<number>`count(*)` }).from(categoriesTable);
  const [pendingCount] = await db.select({ count: sql<number>`count(*)` }).from(ordersTable)
    .where(sql`status = 'pending'`);

  const statusBreakdown = await db
    .select({ status: ordersTable.status, count: sql<number>`count(*)` })
    .from(ordersTable)
    .groupBy(ordersTable.status);

  res.json(GetDashboardSummaryResponse.parse({
    totalOrders: Number(ordersCount.count),
    totalRevenueKes: Number(revenue.total),
    totalProducts: Number(productsCount.count),
    totalCategories: Number(categoriesCount.count),
    pendingOrders: Number(pendingCount.count),
    ordersByStatus: statusBreakdown.map(s => ({ status: s.status, count: Number(s.count) })),
  }));
});

router.get("/dashboard/recent-orders", requireRole("platform_admin"), async (_req, res): Promise<void> => {
  const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(10);
  const result = await Promise.all(orders.map(async (order) => {
    const items = await db.select().from(orderItemsTable).where(sql`order_id = ${order.id}`);
    return {
      ...order,
      totalKes: Number(order.totalKes),
      createdAt: order.createdAt.toISOString(),
      items: items.map(i => ({ ...i, priceKes: Number(i.priceKes) })),
    };
  }));
  res.json(GetRecentOrdersResponse.parse(result));
});

router.get("/dashboard/top-products", requireRole("platform_admin"), async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable)
    .orderBy(desc(productsTable.reviewCount))
    .limit(8);
  res.json(GetTopProductsResponse.parse(products.map(p => ({
    ...p,
    priceKes: Number(p.priceKes),
    rating: Number(p.rating),
    createdAt: p.createdAt.toISOString(),
  }))));
});

export default router;
