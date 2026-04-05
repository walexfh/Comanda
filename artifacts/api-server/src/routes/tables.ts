import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tablesTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import {
  CreateTableBody,
  UpdateTableBody,
  UpdateTableParams,
  DeleteTableParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tables", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const tables = await db
    .select()
    .from(tablesTable)
    .where(eq(tablesTable.tenantId, req.tenantId!))
    .orderBy(tablesTable.number);
  res.json(tables);
});

router.post("/tables", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = CreateTableBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [table] = await db
    .insert(tablesTable)
    .values({
      tenantId: req.tenantId!,
      number: parsed.data.number,
      label: parsed.data.label ?? null,
    })
    .returning();

  res.status(201).json(table);
});

router.patch("/tables/:tableId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = UpdateTableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTableBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.number != null) updateData.number = parsed.data.number;
  if (parsed.data.label != null) updateData.label = parsed.data.label;
  if (parsed.data.active != null) updateData.active = parsed.data.active;

  const [table] = await db
    .update(tablesTable)
    .set(updateData)
    .where(eq(tablesTable.id, params.data.tableId))
    .returning();

  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }

  res.json(table);
});

router.delete("/tables/:tableId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = DeleteTableParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(tablesTable).where(eq(tablesTable.id, params.data.tableId));
  res.sendStatus(204);
});

export default router;
