import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, cartItemsTable, productsTable } from "@workspace/db";
import {
  ListOrdersQueryParams,
  ListOrdersResponse,
  CreateOrderBody,
  CreateOrderResponse,
  GetOrderParams,
  GetOrderResponse,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
  UpdateOrderStatusResponse,
} from "@workspace/api-zod";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

async function getOrderWithItems(orderId: number) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;
  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));
  return {
    ...order,
    totalKes: Number(order.totalKes),
    createdAt: order.createdAt.toISOString(),
    items: items.map(i => ({ ...i, priceKes: Number(i.priceKes) })),
  };
}

router.get("/orders", requireRole("platform_admin"), async (req, res): Promise<void> => {
  const parsed = ListOrdersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { limit = 20, offset = 0 } = parsed.data;
  const orders = await db.select().from(ordersTable)
    .orderBy(desc(ordersTable.createdAt))
    .limit(Number(limit))
    .offset(Number(offset));

  const result = await Promise.all(orders.map(o => getOrderWithItems(o.id)));
  res.json(ListOrdersResponse.parse(result.filter(Boolean)));
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { sessionId, phone, county, town, address, customerName } = parsed.data;

  // Get cart items
  const cartItems = await db
    .select()
    .from(cartItemsTable)
    .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .where(eq(cartItemsTable.sessionId, sessionId));

  if (cartItems.length === 0) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  const totalKes = cartItems.reduce(
    (sum, { cart_items, products }) => sum + Number(products.priceKes) * cart_items.quantity,
    0
  );

  const [order] = await db.insert(ordersTable).values({
    sessionId,
    phone,
    county,
    town,
    address,
    customerName,
    totalKes: String(totalKes),
    status: "pending",
  }).returning();

  // Insert order items
  await db.insert(orderItemsTable).values(
    cartItems.map(({ cart_items, products }) => ({
      orderId: order.id,
      productId: products.id,
      quantity: cart_items.quantity,
      priceKes: products.priceKes,
      productName: products.name,
      productImageUrl: products.imageUrl,
    }))
  );

  // Clear cart
  await db.delete(cartItemsTable).where(eq(cartItemsTable.sessionId, sessionId));

  const fullOrder = await getOrderWithItems(order.id);
  res.status(201).json(CreateOrderResponse.parse(fullOrder));
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const order = await getOrderWithItems(params.data.id);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  res.json(GetOrderResponse.parse(order));
});

router.patch("/orders/:id/status", requireRole("platform_admin"), async (req, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(ordersTable)
    .set({ status: parsed.data.status })
    .where(eq(ordersTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Order not found" });
    return;
  }
  const fullOrder = await getOrderWithItems(updated.id);
  res.json(UpdateOrderStatusResponse.parse(fullOrder));
});

export default router;
