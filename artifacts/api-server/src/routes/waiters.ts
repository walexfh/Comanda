import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, waitersTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { hashPassword } from "../lib/auth";
import {
  CreateWaiterBody,
  DeleteWaiterParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/waiters", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const waiters = await db
    .select({ id: waitersTable.id, tenantId: waitersTable.tenantId, name: waitersTable.name, createdAt: waitersTable.createdAt })
    .from(waitersTable)
    .where(eq(waitersTable.tenantId, req.tenantId!))
    .orderBy(waitersTable.name);

  res.json(waiters);
});

router.post("/waiters", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = CreateWaiterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [waiter] = await db
    .insert(waitersTable)
    .values({
      tenantId: req.tenantId!,
      name: parsed.data.name,
      passwordHash: hashPassword(parsed.data.password),
    })
    .returning();

  res.status(201).json({ id: waiter.id, tenantId: waiter.tenantId, name: waiter.name, createdAt: waiter.createdAt });
});

router.delete("/waiters/:waiterId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = DeleteWaiterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(waitersTable).where(eq(waitersTable.id, params.data.waiterId));
  res.sendStatus(204);
});

export default router;
