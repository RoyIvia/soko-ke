import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { count, eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

export type AppRole = "customer" | "merchant" | "platform_admin";
export type RequestUser = typeof usersTable.$inferSelect;

export async function ensureUser(req: Request): Promise<RequestUser | null> {
  const userId = getAuth(req).userId;
  if (!userId) return null;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, userId));
  if (existing) return existing;

  // Bootstrap the first signed-in account as the platform owner. Later accounts
  // start as customers and must earn merchant access through approval.
  const [{ value: userCount }] = await db.select({ value: count() }).from(usersTable);
  const [created] = await db.insert(usersTable).values({
    clerkUserId: userId,
    role: Number(userCount) === 0 ? "platform_admin" : "customer",
  }).returning();
  return created;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await ensureUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in required" });
    return;
  }
  res.locals.user = user;
  next();
}

export function requireRole(...roles: AppRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await ensureUser(req);
    if (!user) {
      res.status(401).json({ error: "Sign in required" });
      return;
    }
    if (!roles.includes(user.role as AppRole)) {
      res.status(403).json({ error: "You do not have permission to perform this action" });
      return;
    }
    res.locals.user = user;
    next();
  };
}