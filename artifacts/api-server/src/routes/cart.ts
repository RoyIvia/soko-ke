import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db,
  cartItemsTable,
  productsTable,
} from "@workspace/db";
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

router.get(
  "/cart",
  async (req, res): Promise<void> => {
    const parsed =
      GetCartQueryParams.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const { sessionId } = parsed.data;

    /*
     * A cart may contain a product that was approved
     * when it was added but has since been rejected.
     *
     * Only currently approved products are returned
     * as purchasable cart items.
     */
    const items = await db
      .select()
      .from(cartItemsTable)
      .innerJoin(
        productsTable,
        eq(
          cartItemsTable.productId,
          productsTable.id
        )
      )
      .where(
        and(
          eq(
            cartItemsTable.sessionId,
            sessionId
          ),
          eq(
            productsTable.listingStatus,
            "approved"
          )
        )
      );

    const cartItems = items.map(
      ({ cart_items, products }) => ({
        id: cart_items.id,
        sessionId:
          cart_items.sessionId,
        productId:
          cart_items.productId,
        quantity:
          cart_items.quantity,
        product: {
          ...products,
          priceKes: Number(
            products.priceKes
          ),
          rating: Number(
            products.rating
          ),
          createdAt:
            products.createdAt.toISOString(),
        },
      })
    );

    const subtotalKes =
      cartItems.reduce(
        (sum, item) =>
          sum +
          item.product.priceKes *
            item.quantity,
        0
      );

    res.json(
      GetCartResponse.parse({
        sessionId,
        items: cartItems,
        subtotalKes,
      })
    );
  }
);

router.post(
  "/cart/items",
  async (req, res): Promise<void> => {
    const parsed =
      AddToCartBody.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const {
      sessionId,
      productId,
      quantity,
    } = parsed.data;

    /*
     * Never trust the fact that the client was able
     * to see the product earlier. Re-check the
     * current product state when adding to cart.
     */
    const [product] = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(
            productsTable.id,
            productId
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
          "Product is not available for purchase",
      });
      return;
    }

    const [existing] = await db
      .select()
      .from(cartItemsTable)
      .where(
        and(
          eq(
            cartItemsTable.sessionId,
            sessionId
          ),
          eq(
            cartItemsTable.productId,
            productId
          )
        )
      );

    const requestedQuantity =
      existing
        ? existing.quantity + quantity
        : quantity;

    if (
      requestedQuantity >
      product.stock
    ) {
      res.status(409).json({
        error:
          "Requested quantity exceeds available stock",
      });
      return;
    }

    let cartItem;

    if (existing) {
      const [updated] = await db
        .update(cartItemsTable)
        .set({
          quantity:
            requestedQuantity,
        })
        .where(
          eq(
            cartItemsTable.id,
            existing.id
          )
        )
        .returning();

      cartItem = updated;
    } else {
      const [inserted] = await db
        .insert(cartItemsTable)
        .values({
          sessionId,
          productId,
          quantity,
        })
        .returning();

      cartItem = inserted;
    }

    res.status(201).json(
      AddToCartResponse.parse({
        ...cartItem,
        product: {
          ...product,
          priceKes: Number(
            product.priceKes
          ),
          rating: Number(
            product.rating
          ),
          createdAt:
            product.createdAt.toISOString(),
        },
      })
    );
  }
);

router.patch(
  "/cart/items/:id",
  async (req, res): Promise<void> => {
    const params =
      UpdateCartItemParams.safeParse(
        req.params
      );

    if (!params.success) {
      res.status(400).json({
        error: params.error.message,
      });
      return;
    }

    const parsed =
      UpdateCartItemBody.safeParse(
        req.body
      );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    if (parsed.data.quantity === 0) {
      await db
        .delete(cartItemsTable)
        .where(
          eq(
            cartItemsTable.id,
            params.data.id
          )
        );

      res.sendStatus(204);
      return;
    }

    /*
     * Fetch the cart item before modifying it so
     * that the associated product can be
     * revalidated.
     */
    const [existing] = await db
      .select()
      .from(cartItemsTable)
      .where(
        eq(
          cartItemsTable.id,
          params.data.id
        )
      );

    if (!existing) {
      res.status(404).json({
        error: "Cart item not found",
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
            existing.productId
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
          "This product is no longer available for purchase",
      });
      return;
    }

    if (
      parsed.data.quantity >
      product.stock
    ) {
      res.status(409).json({
        error:
          "Requested quantity exceeds available stock",
      });
      return;
    }

    const [updated] = await db
      .update(cartItemsTable)
      .set({
        quantity:
          parsed.data.quantity,
      })
      .where(
        eq(
          cartItemsTable.id,
          params.data.id
        )
      )
      .returning();

    res.json(
      UpdateCartItemResponse.parse({
        ...updated,
        product: {
          ...product,
          priceKes: Number(
            product.priceKes
          ),
          rating: Number(
            product.rating
          ),
          createdAt:
            product.createdAt.toISOString(),
        },
      })
    );
  }
);

router.delete(
  "/cart/items/:id",
  async (req, res): Promise<void> => {
    const params =
      RemoveCartItemParams.safeParse(
        req.params
      );

    if (!params.success) {
      res.status(400).json({
        error: params.error.message,
      });
      return;
    }

    await db
      .delete(cartItemsTable)
      .where(
        eq(
          cartItemsTable.id,
          params.data.id
        )
      );

    res.sendStatus(204);
  }
);

export default router;
