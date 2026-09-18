import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const merchantsTable = pgTable("merchants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerClerkId: text("owner_clerk_id").notNull().unique(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  county: text("county").notNull(),
  description: text("description").notNull(),
  logoUrl: text("logo_url"),
  status: text("status").notNull().default("pending"),
  productCount: integer("product_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
});

export const insertMerchantSchema = createInsertSchema(merchantsTable).omit({ id: true, createdAt: true, approvedAt: true });
export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Merchant = typeof merchantsTable.$inferSelect;

export const usersTable = pgTable("users", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  role: text("role").notNull().default("customer"),
  merchantId: integer("merchant_id").references(() => merchantsTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;