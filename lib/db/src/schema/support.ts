
import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { usersTable } from "./merchants";

export const supportTicketsTable = pgTable(
  "support_tickets",
  {
    id: serial("id").primaryKey(),

    reference: text("reference").notNull().unique(),

    ownerClerkId: text("owner_clerk_id")
      .notNull()
      .references(() => usersTable.clerkUserId),

    subject: text("subject").notNull(),

    category: text("category").notNull(),

    status: text("status")
      .notNull()
      .default("open"),

    orderReference: text("order_reference"),

    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow(),

    resolvedAt: timestamp("resolved_at"),
  },
  (table) => [
    index("support_tickets_owner_idx").on(
      table.ownerClerkId,
    ),

    index("support_tickets_status_idx").on(
      table.status,
    ),
  ],
);

export const supportMessagesTable = pgTable(
  "support_messages",
  {
    id: serial("id").primaryKey(),

    ticketId: integer("ticket_id")
      .notNull()
      .references(() => supportTicketsTable.id, {
        onDelete: "cascade",
      }),

    authorClerkId: text("author_clerk_id")
      .notNull()
      .references(() => usersTable.clerkUserId),

    body: text("body").notNull(),

    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("support_messages_ticket_idx").on(
      table.ticketId,
    ),
  ],
);

export const notificationsTable = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),

    recipientClerkId: text("recipient_clerk_id")
      .notNull()
      .references(() => usersTable.clerkUserId),

    type: text("type").notNull(),

    title: text("title").notNull(),

    message: text("message").notNull(),

    ticketId: integer("ticket_id").references(
      () => supportTicketsTable.id,
      { onDelete: "cascade" },
    ),

    isRead: boolean("is_read")
      .notNull()
      .default(false),

    createdAt: timestamp("created_at")
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("notifications_recipient_idx").on(
      table.recipientClerkId,
    ),

    index("notifications_recipient_read_idx").on(
      table.recipientClerkId,
      table.isRead,
    ),
  ],
);

export type SupportTicket =
  typeof supportTicketsTable.$inferSelect;

export type SupportMessage =
  typeof supportMessagesTable.$inferSelect;

export type Notification =
  typeof notificationsTable.$inferSelect;
