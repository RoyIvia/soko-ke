
import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";

import {
  db,
  usersTable,
  supportTicketsTable,
  supportMessagesTable,
  notificationsTable,
} from "@workspace/db";

import { requireAuth, requireRole } from "../lib/auth";

const router: IRouter = Router();

const ticketCategories = [
  "general",
  "account",
  "orders",
  "payments",
  "products",
  "merchant",
  "technical",
  "other",
] as const;

const ticketStatuses = [
  "open",
  "in_progress",
  "resolved",
  "closed",
] as const;

type TicketCategory = (typeof ticketCategories)[number];
type TicketStatus = (typeof ticketStatuses)[number];

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function requiredText(
  value: unknown,
  maxLength: number,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed || trimmed.length > maxLength) {
    return null;
  }

  return trimmed;
}

function optionalText(
  value: unknown,
  maxLength: number,
): string | null | undefined {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    return undefined;
  }

  return trimmed || null;
}

function parseId(value: unknown): number | null {
  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0
    ? id
    : null;
}

function isCategory(
  value: unknown,
): value is TicketCategory {
  return (
    typeof value === "string" &&
    ticketCategories.some((category) => category === value)
  );
}

function isStatus(
  value: unknown,
): value is TicketStatus {
  return (
    typeof value === "string" &&
    ticketStatuses.some((status) => status === value)
  );
}

function currentUser(res: {
  locals: Record<string, any>;
}) {
  return res.locals.user as typeof usersTable.$inferSelect;
}

function canAccessTicket(
  user: typeof usersTable.$inferSelect,
  ownerClerkId: string,
): boolean {
  return (
    user.role === "platform_admin" ||
    user.clerkUserId === ownerClerkId
  );
}

async function notifyAdmins(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  ticketId: number,
  title: string,
  message: string,
  excludeClerkId?: string,
) {
  const admins = await tx
    .select({
      clerkUserId: usersTable.clerkUserId,
    })
    .from(usersTable)
    .where(eq(usersTable.role, "platform_admin"));

  const recipients = admins.filter(
    (admin) => admin.clerkUserId !== excludeClerkId,
  );

  if (recipients.length === 0) {
    return;
  }

  await tx.insert(notificationsTable).values(
    recipients.map((admin) => ({
      recipientClerkId: admin.clerkUserId,
      type: "support",
      title,
      message,
      ticketId,
    })),
  );
}

/**
 * POST /support/tickets
 *
 * Create a ticket and its initial message atomically.
 */
router.post(
  "/support/tickets",
  requireAuth,
  async (req, res): Promise<void> => {
    const user = currentUser(res);

    if (!isRecord(req.body)) {
      res.status(400).json({
        error: "Invalid request body",
      });
      return;
    }

    const subject = requiredText(req.body.subject, 160);
    const body = requiredText(req.body.description, 10000);
    const category = req.body.category;
    const orderReference = optionalText(
      req.body.orderReference,
      100,
    );

    if (!subject || !body || !isCategory(category)) {
      res.status(400).json({
        error:
          "A valid subject, category, and description are required",
      });
      return;
    }

    if (orderReference === undefined) {
      res.status(400).json({
        error: "Invalid order reference",
      });
      return;
    }

    const reference = `SK-${randomUUID()
      .replace(/-/g, "")
      .slice(0, 12)
      .toUpperCase()}`;

    const ticket = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(supportTicketsTable)
        .values({
          reference,
          ownerClerkId: user.clerkUserId,
          subject,
          category,
          status: "open",
          orderReference,
        })
        .returning();

      await tx.insert(supportMessagesTable).values({
        ticketId: created.id,
        authorClerkId: user.clerkUserId,
        body,
      });

      await notifyAdmins(
        tx,
        created.id,
        "New support ticket",
        `${reference}: ${subject}`,
      );

      return created;
    });

    res.status(201).json(ticket);
  },
);

/**
 * GET /support/tickets
 *
 * Return only tickets belonging to the signed-in user.
 */
router.get(
  "/support/tickets",
  requireAuth,
  async (_req, res): Promise<void> => {
    const user = currentUser(res);

    const tickets = await db
      .select()
      .from(supportTicketsTable)
      .where(
        eq(
          supportTicketsTable.ownerClerkId,
          user.clerkUserId,
        ),
      )
      .orderBy(desc(supportTicketsTable.updatedAt));

    res.json(tickets);
  },
);

/**
 * GET /support/tickets/:id
 *
 * The ticket owner and platform administrators may
 * read the conversation.
 */
router.get(
  "/support/tickets/:id",
  requireAuth,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);

    if (!id) {
      res.status(400).json({
        error: "Invalid ticket ID",
      });
      return;
    }

    const user = currentUser(res);

    const [ticket] = await db
      .select()
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.id, id))
      .limit(1);

    if (
      !ticket ||
      !canAccessTicket(user, ticket.ownerClerkId)
    ) {
      res.status(404).json({
        error: "Ticket not found",
      });
      return;
    }

    const messages = await db
      .select({
        id: supportMessagesTable.id,
        ticketId: supportMessagesTable.ticketId,
        authorClerkId: supportMessagesTable.authorClerkId,
        authorRole: usersTable.role,
        body: supportMessagesTable.body,
        createdAt: supportMessagesTable.createdAt,
      })
      .from(supportMessagesTable)
      .innerJoin(
        usersTable,
        eq(
          supportMessagesTable.authorClerkId,
          usersTable.clerkUserId,
        ),
      )
      .where(eq(supportMessagesTable.ticketId, id))
      .orderBy(supportMessagesTable.createdAt);

    res.json({
      ticket,
      messages,
    });
  },
);

/**
 * POST /support/tickets/:id/messages
 *
 * Ticket owners and administrators can reply.
 * Closed tickets cannot receive additional messages.
 */
router.post(
  "/support/tickets/:id/messages",
  requireAuth,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);

    if (!id) {
      res.status(400).json({
        error: "Invalid ticket ID",
      });
      return;
    }

    const body = isRecord(req.body)
      ? requiredText(req.body.body, 10000)
      : null;

    if (!body) {
      res.status(400).json({
        error: "A message is required",
      });
      return;
    }

    const user = currentUser(res);

    const result = await db.transaction(async (tx) => {
      const [ticket] = await tx
        .select()
        .from(supportTicketsTable)
        .where(eq(supportTicketsTable.id, id))
        .for("update")
        .limit(1);

      if (
        !ticket ||
        !canAccessTicket(user, ticket.ownerClerkId)
      ) {
        return { error: "not_found" as const };
      }

      if (ticket.status === "closed") {
        return { error: "closed" as const };
      }

      const [message] = await tx
        .insert(supportMessagesTable)
        .values({
          ticketId: id,
          authorClerkId: user.clerkUserId,
          body,
        })
        .returning();

      await tx
        .update(supportTicketsTable)
        .set({ updatedAt: new Date() })
        .where(eq(supportTicketsTable.id, id));

      if (user.role === "platform_admin") {
        if (ticket.ownerClerkId !== user.clerkUserId) {
          await tx.insert(notificationsTable).values({
            recipientClerkId: ticket.ownerClerkId,
            type: "support_reply",
            title: "Support has replied",
            message: `You have a new reply on ${ticket.reference}.`,
            ticketId: id,
          });
        }
      } else {
        await notifyAdmins(
          tx,
          id,
          "Customer replied",
          `New reply on ${ticket.reference}.`,
          user.clerkUserId,
        );
      }

      return { message };
    });

    if ("error" in result) {
      res.status(result.error === "closed" ? 409 : 404).json({
        error:
          result.error === "closed"
            ? "This ticket is closed"
            : "Ticket not found",
      });
      return;
    }

    res.status(201).json(result.message);
  },
);

/**
 * GET /admin/support/tickets
 *
 * Platform administrator support queue.
 */
router.get(
  "/admin/support/tickets",
  requireRole("platform_admin"),
  async (req, res): Promise<void> => {
    const status = req.query.status;

    if (status !== undefined && !isStatus(status)) {
      res.status(400).json({
        error: "Invalid ticket status",
      });
      return;
    }

    const tickets = await db
      .select()
      .from(supportTicketsTable)
      .where(
        status
          ? eq(supportTicketsTable.status, status)
          : undefined,
      )
      .orderBy(desc(supportTicketsTable.updatedAt));

    res.json(tickets);
  },
);

/**
 * PATCH /admin/support/tickets/:id
 *
 * Update ticket status and notify the customer.
 */
router.patch(
  "/admin/support/tickets/:id",
  requireRole("platform_admin"),
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);

    if (!id) {
      res.status(400).json({
        error: "Invalid ticket ID",
      });
      return;
    }

    const status = isRecord(req.body)
      ? req.body.status
      : undefined;

    if (!isStatus(status)) {
      res.status(400).json({
        error: "Invalid ticket status",
      });
      return;
    }

    const user = currentUser(res);

    const result = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(supportTicketsTable)
        .where(eq(supportTicketsTable.id, id))
        .for("update")
        .limit(1);

      if (!existing) {
        return null;
      }

      if (existing.status === status) {
        return existing;
      }

      const [updated] = await tx
        .update(supportTicketsTable)
        .set({
          status,
          updatedAt: new Date(),
          resolvedAt:
            status === "resolved" || status === "closed"
              ? existing.resolvedAt ?? new Date()
              : null,
        })
        .where(eq(supportTicketsTable.id, id))
        .returning();

      if (existing.ownerClerkId !== user.clerkUserId) {
        await tx.insert(notificationsTable).values({
          recipientClerkId: existing.ownerClerkId,
          type: "support_status",
          title: "Ticket status updated",
          message: `${existing.reference} is now ${status.replace(
            "_",
            " ",
          )}.`,
          ticketId: id,
        });
      }

      return updated;
    });

    if (!result) {
      res.status(404).json({
        error: "Ticket not found",
      });
      return;
    }

    res.json(result);
  },
);

/**
 * GET /notifications
 *
 * Personal notification inbox.
 */
router.get(
  "/notifications",
  requireAuth,
  async (_req, res): Promise<void> => {
    const user = currentUser(res);

    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(
        eq(
          notificationsTable.recipientClerkId,
          user.clerkUserId,
        ),
      )
      .orderBy(desc(notificationsTable.createdAt))
      .limit(100);

    res.json(notifications);
  },
);

/**
 * PATCH /notifications/:id/read
 *
 * A user may mark only their own notification as read.
 */
router.patch(
  "/notifications/:id/read",
  requireAuth,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);

    if (!id) {
      res.status(400).json({
        error: "Invalid notification ID",
      });
      return;
    }

    const user = currentUser(res);

    const [notification] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(
            notificationsTable.recipientClerkId,
            user.clerkUserId,
          ),
        ),
      )
      .returning();

    if (!notification) {
      res.status(404).json({
        error: "Notification not found",
      });
      return;
    }

    res.json(notification);
  },
);

export default router;
