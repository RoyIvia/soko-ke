import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { merchantsTable } from "./merchants";
import { productsTable } from "./products";

export const promotionCampaignsTable = pgTable("promotion_campaigns", {
  id: serial("id").primaryKey(),
  merchantId: integer("merchant_id").notNull().references(() => merchantsTable.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => productsTable.id, { onDelete: "cascade" }),
  tier: text("tier").notNull(),
  status: text("status").notNull().default("pending_payment"),
  amountKes: numeric("amount_kes", { precision: 10, scale: 2 }).notNull(),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  startsAt: timestamp("starts_at"),
  endsAt: timestamp("ends_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPromotionSchema = createInsertSchema(promotionCampaignsTable).omit({ id: true, createdAt: true, startsAt: true, endsAt: true });
export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type PromotionCampaign = typeof promotionCampaignsTable.$inferSelect;