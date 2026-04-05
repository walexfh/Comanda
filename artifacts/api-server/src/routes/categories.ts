import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import {
  CreateCategoryBody,
  UpdateCategoryBody,
  UpdateCategoryParams,
  DeleteCategoryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categories", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const categories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.tenantId, req.tenantId!))
    .orderBy(categoriesTable.sortOrder, categoriesTable.id);
  res.json(categories);
});

router.post("/categories", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = CreateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [category] = await db
    .insert(categoriesTable)
    .values({
      tenantId: req.tenantId!,
      name: parsed.data.name,
      sortOrder: parsed.data.sortOrder ?? 0,
    })
    .returning();

  res.status(201).json(category);
});

router.patch("/categories/:categoryId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = UpdateCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCategoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.sortOrder != null) updateData.sortOrder = parsed.data.sortOrder;

  const [category] = await db
    .update(categoriesTable)
    .set(updateData)
    .where(eq(categoriesTable.id, params.data.categoryId))
    .returning();

  if (!category) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  res.json(category);
});

router.delete("/categories/:categoryId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = DeleteCategoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(categoriesTable).where(eq(categoriesTable.id, params.data.categoryId));
  res.sendStatus(204);
});

export default router;
