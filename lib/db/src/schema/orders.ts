import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  status: text("status").notNull().default("pending"),
  totalKes: numeric("total_kes", { precision: 10, scale: 2 }).notNull(),
  phone: text("phone").notNull(),
  county: text("county").notNull(),
  town: text("town").notNull(),
  address: text("address").notNull(),
  customerName: text("customer_name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull(),
  quantity: integer("quantity").notNull(),
  priceKes: numeric("price_kes", { precision: 10, scale: 2 }).notNull(),
  productName: text("product_name").notNull(),
  productImageUrl: text("product_image_url"),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
