import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, cartItemsTable, productsTable } from "@workspace/db";
import {
  GetCartQueryParams,
  GetCartResponse,
  AddToCartBody,
  AddToCartResponse,
  UpdateCartItemParams,
  UpdateCartItemBody,
  UpdateCartItemResponse,
  RemoveCartItemParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/cart", async (req, res): Promise<void> => {
  const parsed = GetCartQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { sessionId } = parsed.data;
  const items = await db
    .select()
    .from(cartItemsTable)
    .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .where(eq(cartItemsTable.sessionId, sessionId));

  const cartItems = items.map(({ cart_items, products }) => ({
    id: cart_items.id,
    sessionId: cart_items.sessionId,
    productId: cart_items.productId,
    quantity: cart_items.quantity,
    product: {
      ...products,
      priceKes: Number(products.priceKes),
      rating: Number(products.rating),
      createdAt: products.createdAt.toISOString(),
    },
  }));

  const subtotalKes = cartItems.reduce(
    (sum, item) => sum + item.product.priceKes * item.quantity,
    0
  );

  res.json(GetCartResponse.parse({ sessionId, items: cartItems, subtotalKes }));
});

router.post("/cart/items", async (req, res): Promise<void> => {
  const parsed = AddToCartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { sessionId, productId, quantity } = parsed.data;

  // Check if item already in cart — update quantity
  const [existing] = await db
    .select()
    .from(cartItemsTable)
    .where(and(eq(cartItemsTable.sessionId, sessionId), eq(cartItemsTable.productId, productId)));

  let cartItem;
  if (existing) {
    const [updated] = await db
      .update(cartItemsTable)
      .set({ quantity: existing.quantity + quantity })
      .where(eq(cartItemsTable.id, existing.id))
      .returning();
    cartItem = updated;
  } else {
    const [inserted] = await db
      .insert(cartItemsTable)
      .values({ sessionId, productId, quantity })
      .returning();
    cartItem = inserted;
  }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));

  res.status(201).json(AddToCartResponse.parse({
    ...cartItem,
    product: {
      ...product,
      priceKes: Number(product.priceKes),
      rating: Number(product.rating),
      createdAt: product.createdAt.toISOString(),
    },
  }));
});

router.patch("/cart/items/:id", async (req, res): Promise<void> => {
  const params = UpdateCartItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateCartItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.quantity === 0) {
    await db.delete(cartItemsTable).where(eq(cartItemsTable.id, params.data.id));
    res.sendStatus(204);
    return;
  }

  const [updated] = await db
    .update(cartItemsTable)
    .set({ quantity: parsed.data.quantity })
    .where(eq(cartItemsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Cart item not found" });
    return;
  }

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, updated.productId));

  res.json(UpdateCartItemResponse.parse({
    ...updated,
    product: {
      ...product,
      priceKes: Number(product.priceKes),
      rating: Number(product.rating),
      createdAt: product.createdAt.toISOString(),
    },
  }));
});

router.delete("/cart/items/:id", async (req, res): Promise<void> => {
  const params = RemoveCartItemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(cartItemsTable).where(eq(cartItemsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
