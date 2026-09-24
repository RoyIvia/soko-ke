import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import {
  db,
  categoriesTable,
  productsTable,
} from "@workspace/db";
import {
  ListCategoriesResponse,
  CreateCategoryBody,
  UpdateCategoryParams,
  UpdateCategoryBody,
  DeleteCategoryParams,
} from "@workspace/api-zod";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

router.get(
  "/categories",
  async (_req, res): Promise<void> => {
    const categories = await db
      .select()
      .from(categoriesTable)
      .orderBy(categoriesTable.name);

    res.json(ListCategoriesResponse.parse(categories));
  },
);

router.post(
  "/categories",
  requireRole("platform_admin"),
  async (req, res): Promise<void> => {
    const parsed = CreateCategoryBody.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const name = parsed.data.name.trim();
    const slug = parsed.data.slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const imageUrl = parsed.data.imageUrl.trim();

    if (!name || !slug || !imageUrl) {
      res.status(400).json({
        error: "Name, slug, and image are required",
      });
      return;
    }

    const [existingCategory] = await db
      .select({ id: categoriesTable.id })
      .from(categoriesTable)
      .where(eq(categoriesTable.slug, slug))
      .limit(1);

    if (existingCategory) {
      res.status(409).json({
        error: "A category with this slug already exists",
      });
      return;
    }

    const [category] = await db
      .insert(categoriesTable)
      .values({
        name,
        slug,
        imageUrl,
        productCount: 0,
      })
      .returning();

    res.status(201).json(category);
  },
);

router.patch(
  "/categories/:id",
  requireRole("platform_admin"),
  async (req, res): Promise<void> => {
    const parsedParams = UpdateCategoryParams.safeParse(req.params);
    const parsedBody = UpdateCategoryBody.safeParse(req.body);

    if (!parsedParams.success) {
      res.status(400).json({
        error: parsedParams.error.message,
      });
      return;
    }

    if (!parsedBody.success) {
      res.status(400).json({
        error: parsedBody.error.message,
      });
      return;
    }

    const categoryId = parsedParams.data.id;

    const [existingCategory] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .limit(1);

    if (!existingCategory) {
      res.status(404).json({
        error: "Category not found",
      });
      return;
    }

    const updates: {
      name?: string;
      slug?: string;
      imageUrl?: string;
    } = {};

    if (parsedBody.data.name !== undefined) {
      const name = parsedBody.data.name.trim();

      if (!name) {
        res.status(400).json({
          error: "Category name cannot be empty",
        });
        return;
      }

      updates.name = name;
    }

    if (parsedBody.data.imageUrl !== undefined) {
      const imageUrl = parsedBody.data.imageUrl.trim();

      if (!imageUrl) {
        res.status(400).json({
          error: "Category image cannot be empty",
        });
        return;
      }

      updates.imageUrl = imageUrl;
    }

    if (parsedBody.data.slug !== undefined) {
      const slug = parsedBody.data.slug
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

      if (!slug) {
        res.status(400).json({
          error: "Category slug cannot be empty",
        });
        return;
      }

      if (slug !== existingCategory.slug) {
        const [slugConflict] = await db
          .select({ id: categoriesTable.id })
          .from(categoriesTable)
          .where(eq(categoriesTable.slug, slug))
          .limit(1);

        if (slugConflict) {
          res.status(409).json({
            error: "A category with this slug already exists",
          });
          return;
        }

        /*
         * Products currently store the category slug rather than
         * a category foreign key. Keep those product references
         * synchronized when an administrator changes the slug.
         */
        await db.transaction(async (tx) => {
          await tx
            .update(productsTable)
            .set({ category: slug })
            .where(
              eq(
                productsTable.category,
                existingCategory.slug,
              ),
            );

          await tx
            .update(categoriesTable)
            .set({
              ...updates,
              slug,
            })
            .where(eq(categoriesTable.id, categoryId));
        });

        const [updatedCategory] = await db
          .select()
          .from(categoriesTable)
          .where(eq(categoriesTable.id, categoryId))
          .limit(1);

        res.json(updatedCategory);
        return;
      }

      updates.slug = slug;
    }

    if (Object.keys(updates).length === 0) {
      res.json(existingCategory);
      return;
    }

    const [updatedCategory] = await db
      .update(categoriesTable)
      .set(updates)
      .where(eq(categoriesTable.id, categoryId))
      .returning();

    res.json(updatedCategory);
  },
);

router.delete(
  "/categories/:id",
  requireRole("platform_admin"),
  async (req, res): Promise<void> => {
    const parsed = DeleteCategoryParams.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({
        error: parsed.error.message,
      });
      return;
    }

    const categoryId = parsed.data.id;

    const [category] = await db
      .select()
      .from(categoriesTable)
      .where(eq(categoriesTable.id, categoryId))
      .limit(1);

    if (!category) {
      res.status(404).json({
        error: "Category not found",
      });
      return;
    }

    const [usage] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(productsTable)
      .where(eq(productsTable.category, category.slug));

    if (Number(usage?.count ?? 0) > 0) {
      res.status(409).json({
        error:
          "This category cannot be deleted because products are using it",
      });
      return;
    }

    await db
      .delete(categoriesTable)
      .where(eq(categoriesTable.id, categoryId));

    res.status(204).send();
  },
);

export default router;
