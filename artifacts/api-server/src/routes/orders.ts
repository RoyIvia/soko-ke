import { Router, type IRouter } from "express";
import {
  and,
  desc,
  eq,
  gte,
  sql,
} from "drizzle-orm";
import {
  db,
  ordersTable,
  orderItemsTable,
  cartItemsTable,
  productsTable,
} from "@workspace/db";
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

async function getOrderWithItems(
  orderId: number
) {
  const [order] = await db
    .select()
    .from(ordersTable)
    .where(
      eq(ordersTable.id, orderId)
    );

  if (!order) {
    return null;
  }

  const items = await db
    .select()
    .from(orderItemsTable)
    .where(
      eq(
        orderItemsTable.orderId,
        orderId
      )
    );

  return {
    ...order,
    totalKes: Number(order.totalKes),
    createdAt:
      order.createdAt.toISOString(),
    items: items.map((item) => ({
      ...item,
      priceKes: Number(
        item.priceKes
      ),
    })),
  };
}

router.get(
  "/orders",
  requireRole("platform_admin"),
  async (req, res): Promise<void> => {
    const parsed =
      ListOrdersQueryParams.safeParse(
        req.query
      );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const {
      limit = 20,
      offset = 0,
    } = parsed.data;

    const orders = await db
      .select()
      .from(ordersTable)
      .orderBy(
        desc(ordersTable.createdAt)
      )
      .limit(Number(limit))
      .offset(Number(offset));

    const result =
      await Promise.all(
        orders.map((order) =>
          getOrderWithItems(order.id)
        )
      );

    res.json(
      ListOrdersResponse.parse(
        result.filter(Boolean)
      )
    );
  }
);

router.post(
  "/orders",
  async (req, res): Promise<void> => {
    const parsed =
      CreateOrderBody.safeParse(
        req.body
      );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const {
      sessionId,
      phone,
      county,
      town,
      address,
      customerName,
    } = parsed.data;

    try {
      const orderId =
        await db.transaction(
          async (tx) => {
            /*
             * The cart is loaded again inside the
             * transaction. Never trust a previous
             * cart response from the client.
             */
            const cartItems =
              await tx
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
                  eq(
                    cartItemsTable.sessionId,
                    sessionId
                  )
                );

            if (
              cartItems.length === 0
            ) {
              throw new OrderError(
                400,
                "Cart is empty"
              );
            }

            /*
             * Validate every item before creating
             * any order records.
             */
            for (const {
              cart_items,
              products,
            } of cartItems) {
              if (
                products.listingStatus !==
                "approved"
              ) {
                throw new OrderError(
                  409,
                  `${products.name} is no longer available for purchase`
                );
              }

              if (
                cart_items.quantity <= 0
              ) {
                throw new OrderError(
                  400,
                  `Invalid quantity for ${products.name}`
                );
              }

              if (
                products.stock <
                cart_items.quantity
              ) {
                throw new OrderError(
                  409,
                  `Not enough stock is available for ${products.name}`
                );
              }
            }

            /*
             * Prices come exclusively from the
             * current database records.
             */
            const totalKes =
              cartItems.reduce(
                (
                  sum,
                  {
                    cart_items,
                    products,
                  }
                ) =>
                  sum +
                  Number(
                    products.priceKes
                  ) *
                    cart_items.quantity,
                0
              );

            /*
             * Atomically reserve/decrement stock.
             *
             * The WHERE clause ensures the update
             * succeeds only if enough stock still
             * exists at the instant PostgreSQL
             * performs the update.
             *
             * This protects against concurrent
             * checkouts attempting to buy the
             * same remaining inventory.
             */
            for (const {
              cart_items,
              products,
            } of cartItems) {
              const [updatedProduct] =
                await tx
                  .update(productsTable)
                  .set({
                    stock: sql<number>`
                      ${productsTable.stock}
                      - ${cart_items.quantity}
                    `,
                  })
                  .where(
                    and(
                      eq(
                        productsTable.id,
                        products.id
                      ),
                      eq(
                        productsTable.listingStatus,
                        "approved"
                      ),
                      gte(
                        productsTable.stock,
                        cart_items.quantity
                      )
                    )
                  )
                  .returning({
                    id: productsTable.id,
                  });

              if (!updatedProduct) {
                throw new OrderError(
                  409,
                  `${products.name} is no longer available in the requested quantity`
                );
              }
            }

            const [order] =
              await tx
                .insert(ordersTable)
                .values({
                  sessionId,
                  phone,
                  county,
                  town,
                  address,
                  customerName,
                  totalKes:
                    String(totalKes),
                  status: "pending",
                })
                .returning({
                  id: ordersTable.id,
                });

            /*
             * Snapshot product name, image,
             * quantity and price into order_items.
             *
             * Future product edits therefore do
             * not alter the historical order.
             */
            await tx
              .insert(orderItemsTable)
              .values(
                cartItems.map(
                  ({
                    cart_items,
                    products,
                  }) => ({
                    orderId: order.id,
                    productId:
                      products.id,
                    quantity:
                      cart_items.quantity,
                    priceKes:
                      products.priceKes,
                    productName:
                      products.name,
                    productImageUrl:
                      products.imageUrl,
                  })
                )
              );

            /*
             * Clear the cart only after the
             * order and order items have been
             * created successfully.
             */
            await tx
              .delete(cartItemsTable)
              .where(
                eq(
                  cartItemsTable.sessionId,
                  sessionId
                )
              );

            return order.id;
          }
        );

      const fullOrder =
        await getOrderWithItems(
          orderId
        );

      if (!fullOrder) {
        /*
         * This should not occur after a successful
         * committed transaction, but avoid passing
         * null into the response schema.
         */
        res.status(500).json({
          error:
            "Order was created but could not be retrieved",
        });
        return;
      }

      res
        .status(201)
        .json(
          CreateOrderResponse.parse(
            fullOrder
          )
        );
    } catch (error) {
      if (
        error instanceof OrderError
      ) {
        res
          .status(error.statusCode)
          .json({
            error: error.message,
          });
        return;
      }

      console.error(
        "Order creation failed:",
        error
      );

      res.status(500).json({
        error:
          "Unable to create order",
      });
    }
  }
);

router.get(
  "/orders/:id",
  async (req, res): Promise<void> => {
    const params =
      GetOrderParams.safeParse(
        req.params
      );

    if (!params.success) {
      res.status(400).json({
        error: params.error.message,
      });
      return;
    }

    const order =
      await getOrderWithItems(
        params.data.id
      );

    if (!order) {
      res.status(404).json({
        error: "Order not found",
      });
      return;
    }

    res.json(
      GetOrderResponse.parse(order)
    );
  }
);

router.patch(
  "/orders/:id/status",
  requireRole("platform_admin"),
  async (req, res): Promise<void> => {
    const params =
      UpdateOrderStatusParams.safeParse(
        req.params
      );

    if (!params.success) {
      res.status(400).json({
        error: params.error.message,
      });
      return;
    }

    const parsed =
      UpdateOrderStatusBody.safeParse(
        req.body
      );

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const [updated] = await db
      .update(ordersTable)
      .set({
        status:
          parsed.data.status,
      })
      .where(
        eq(
          ordersTable.id,
          params.data.id
        )
      )
      .returning();

    if (!updated) {
      res.status(404).json({
        error: "Order not found",
      });
      return;
    }

    const fullOrder =
      await getOrderWithItems(
        updated.id
      );

    res.json(
      UpdateOrderStatusResponse.parse(
        fullOrder
      )
    );
  }
);

class OrderError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "OrderError";
  }
}

export default router;
