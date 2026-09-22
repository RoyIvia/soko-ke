import type { NextFunction, Request, Response } from "express";
import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

export type AppRole = "customer" | "merchant" | "platform_admin";
export type RequestUser = typeof usersTable.$inferSelect;

/**
 * Resolve the authenticated Clerk identity to a SokoKE application user.
 *
 * Clerk is responsible for authentication.
 * PostgreSQL is the source of truth for application authorization.
 *
 * Every newly authenticated user starts with the "customer" role.
 * Elevated roles must be granted through an explicit application workflow
 * or administrative operation.
 */
export async function ensureUser(
  req: Request
): Promise<RequestUser | null> {
  const userId = getAuth(req).userId;

  if (!userId) {
    return null;
  }

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, userId));

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(usersTable)
    .values({
      clerkUserId: userId,
      role: "customer",
    })
    .returning();

  return created;
}

/**
 * Require an authenticated SokoKE user.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const user = await ensureUser(req);

  if (!user) {
    res.status(401).json({
      error: "Sign in required",
    });
    return;
  }

  res.locals.user = user;
  next();
}

/**
 * Require an authenticated user with one of the permitted application roles.
 *
 * Authentication is established by Clerk.
 * Authorization is determined from the role stored in PostgreSQL.
 */
export function requireRole(...roles: AppRole[]) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const user = await ensureUser(req);

    if (!user) {
      res.status(401).json({
        error: "Sign in required",
      });
      return;
    }

    if (!roles.includes(user.role as AppRole)) {
      res.status(403).json({
        error: "You do not have permission to perform this action",
      });
      return;
    }

    res.locals.user = user;
    next();
  };
}
