import { pgTable, serial, text, numeric, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { merchantsTable } from "./merchants";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  priceKes: numeric("price_kes", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url").notNull(),
  stock: integer("stock").notNull().default(0),
  sellerName: text("seller_name"),
  county: text("county"),
  rating: numeric("rating", { precision: 3, scale: 2 }).notNull().default("0"),
  reviewCount: integer("review_count").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  ownerType: text("owner_type").notNull().default("soko"),
  merchantId: integer("merchant_id").references(() => merchantsTable.id, { onDelete: "set null" }),
  listingStatus: text("listing_status").notNull().default("approved"),
  isSponsored: boolean("is_sponsored").notNull().default(false),
  sponsoredUntil: timestamp("sponsored_until"),
  promotionTier: text("promotion_tier"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
