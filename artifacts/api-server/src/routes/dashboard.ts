import { Router, type IRouter } from "express";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { db, ordersTable, paymentsTable, orderItemsTable, productsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";

const router: IRouter = Router();

function getTodayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

router.get("/dashboard/summary", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { start, end } = getTodayRange();
  const tenantId = req.tenantId!;

  const [todayOrders, todayPayments, activeOrders, byStatus] = await Promise.all([
    db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.tenantId, tenantId), gte(ordersTable.createdAt, start), lt(ordersTable.createdAt, end))),
    db
      .select()
      .from(paymentsTable)
      .where(and(eq(paymentsTable.tenantId, tenantId), gte(paymentsTable.createdAt, start), lt(paymentsTable.createdAt, end))),
    db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.tenantId, tenantId), sql`${ordersTable.status} != 'finalizado'`)),
    db
      .select()
      .from(ordersTable)
      .where(and(eq(ordersTable.tenantId, tenantId), gte(ordersTable.createdAt, start), lt(ordersTable.createdAt, end))),
  ]);

  const totalRevenue = todayPayments.reduce((sum, p) => sum + parseFloat(p.amount as unknown as string), 0);

  const revenueByMethod = { dinheiro: 0, pix: 0, cartao: 0 };
  for (const payment of todayPayments) {
    const amount = parseFloat(payment.amount as unknown as string);
    if (payment.method === "dinheiro") revenueByMethod.dinheiro += amount;
    else if (payment.method === "pix") revenueByMethod.pix += amount;
    else if (payment.method === "cartao") revenueByMethod.cartao += amount;
  }

  const statusCounts = { novo: 0, preparando: 0, pronto: 0, finalizado: 0 };
  for (const o of byStatus) {
    if (o.status === "novo") statusCounts.novo++;
    else if (o.status === "preparando") statusCounts.preparando++;
    else if (o.status === "pronto") statusCounts.pronto++;
    else if (o.status === "finalizado") statusCounts.finalizado++;
  }

  res.json({
    totalOrdersToday: todayOrders.length,
    totalRevenueToday: totalRevenue,
    activeOrders: activeOrders.length,
    ordersByStatus: statusCounts,
    revenueByMethod,
  });
});

router.get("/dashboard/top-products", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const tenantId = req.tenantId!;
  const limit = parseInt(req.query.limit as string || "10", 10);

  const { start, end } = getTodayRange();

  const items = await db
    .select({
      productId: orderItemsTable.productId,
      productName: orderItemsTable.productName,
      quantity: orderItemsTable.quantity,
      unitPrice: orderItemsTable.unitPrice,
    })
    .from(orderItemsTable)
    .innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id))
    .where(and(eq(ordersTable.tenantId, tenantId), gte(ordersTable.createdAt, start), lt(ordersTable.createdAt, end)));

  const productStats = new Map<number, { productId: number; productName: string; totalSold: number; totalRevenue: number }>();

  for (const item of items) {
    const existing = productStats.get(item.productId) ?? {
      productId: item.productId,
      productName: item.productName,
      totalSold: 0,
      totalRevenue: 0,
    };
    existing.totalSold += item.quantity;
    existing.totalRevenue += parseFloat(item.unitPrice as unknown as string) * item.quantity;
    productStats.set(item.productId, existing);
  }

  const sorted = Array.from(productStats.values())
    .sort((a, b) => b.totalSold - a.totalSold)
    .slice(0, limit);

  res.json(sorted);
});

router.get("/dashboard/orders-by-status", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const tenantId = req.tenantId!;

  const orders = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.tenantId, tenantId), sql`${ordersTable.status} != 'finalizado'`));

  const statusCounts = { novo: 0, preparando: 0, pronto: 0, finalizado: 0 };
  for (const o of orders) {
    if (o.status === "novo") statusCounts.novo++;
    else if (o.status === "preparando") statusCounts.preparando++;
    else if (o.status === "pronto") statusCounts.pronto++;
    else if (o.status === "finalizado") statusCounts.finalizado++;
  }

  res.json(statusCounts);
});

export default router;
