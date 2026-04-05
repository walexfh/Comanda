import { Router, type IRouter } from "express";
import { eq, and, gte, lt } from "drizzle-orm";
import { db, paymentsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import {
  CreatePaymentBody,
  ListPaymentsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/payments", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const qp = ListPaymentsQueryParams.safeParse(req.query);
  const dateStr = qp.success ? qp.data.date ?? null : null;

  const conditions: ReturnType<typeof eq>[] = [eq(paymentsTable.tenantId, req.tenantId!)];

  if (dateStr) {
    const date = new Date(dateStr);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    conditions.push(gte(paymentsTable.createdAt, date));
    conditions.push(lt(paymentsTable.createdAt, nextDay));
  }

  const payments = await db
    .select()
    .from(paymentsTable)
    .where(and(...conditions))
    .orderBy(paymentsTable.id);

  res.json(payments.map((p) => ({ ...p, amount: parseFloat(p.amount as unknown as string) })));
});

router.post("/payments", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      tenantId: req.tenantId!,
      orderId: parsed.data.orderId,
      amount: String(parsed.data.amount),
      method: parsed.data.method,
    })
    .returning();

  res.status(201).json({ ...payment, amount: parseFloat(payment.amount as unknown as string) });
});

export default router;
