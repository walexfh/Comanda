import { Router, type IRouter } from "express";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, productsTable, tablesTable, waitersTable, tenantsTable, paymentsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { broadcast } from "../lib/ws";
import {
  CreateOrderBody,
  ListOrdersQueryParams,
  GetOrderParams,
  UpdateOrderStatusParams,
  UpdateOrderStatusBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function getOrderWithItems(orderId: number) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return null;

  const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, orderId));

  let tableNumber: number | null = null;
  if (order.tableId) {
    const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, order.tableId));
    tableNumber = table?.number ?? null;
  }

  let waiterName: string | null = null;
  if (order.waiterId) {
    const [waiter] = await db.select().from(waitersTable).where(eq(waitersTable.id, order.waiterId));
    waiterName = waiter?.name ?? null;
  }

  return {
    ...order,
    total: parseFloat(order.total as unknown as string),
    tableNumber,
    waiterName,
    items: items.map((item) => ({
      ...item,
      unitPrice: parseFloat(item.unitPrice as unknown as string),
    })),
  };
}

router.get("/orders", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const qp = ListOrdersQueryParams.safeParse(req.query);
  const status = qp.success ? qp.data.status ?? null : null;
  const tableId = qp.success ? qp.data.tableId ?? null : null;

  const conditions: ReturnType<typeof eq>[] = [eq(ordersTable.tenantId, req.tenantId!)];
  if (status) conditions.push(eq(ordersTable.status, status));
  if (tableId) conditions.push(eq(ordersTable.tableId, tableId));

  const orders = await db
    .select()
    .from(ordersTable)
    .where(and(...conditions))
    .orderBy(sql`${ordersTable.createdAt} DESC`);

  const ordersWithItems = await Promise.all(orders.map((o) => getOrderWithItems(o.id)));
  res.json(ordersWithItems.filter(Boolean));
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { tenantSlug, tableId, waiterId, customerName, items } = parsed.data;

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, tenantSlug));
  if (!tenant) {
    res.status(404).json({ error: "Restaurant not found" });
    return;
  }

  // Fetch products
  const productIds = items.map((i) => i.productId);
  const products = await db
    .select()
    .from(productsTable)
    .where(and(eq(productsTable.tenantId, tenant.id)));

  const productMap = new Map(products.map((p) => [p.id, p]));

  let total = 0;
  const itemValues: {
    orderId: number;
    productId: number;
    productName: string;
    quantity: number;
    unitPrice: string;
    notes: string | null;
    printSector: string | null;
  }[] = [];

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      res.status(400).json({ error: `Product ${item.productId} not found` });
      return;
    }
    const unitPrice = parseFloat(product.price as unknown as string);
    total += unitPrice * item.quantity;
    itemValues.push({
      orderId: 0,
      productId: item.productId,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: String(unitPrice),
      notes: item.notes ?? null,
      printSector: product.printSector ?? null,
    });
  }

  const [order] = await db
    .insert(ordersTable)
    .values({
      tenantId: tenant.id,
      tableId: tableId ?? null,
      waiterId: waiterId ?? null,
      customerName: customerName ?? null,
      status: "novo",
      total: String(total),
    })
    .returning();

  await db.insert(orderItemsTable).values(itemValues.map((v) => ({ ...v, orderId: order.id })));

  const fullOrder = await getOrderWithItems(order.id);

  // Broadcast to WebSocket clients
  broadcast(tenant.id, { type: "order:new", order: fullOrder });

  res.status(201).json(fullOrder);
});

router.get("/orders/:orderId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const order = await getOrderWithItems(params.data.orderId);
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(order);
});

router.patch("/orders/:orderId/status", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = UpdateOrderStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [order] = await db
    .update(ordersTable)
    .set({ status: parsed.data.status, updatedAt: new Date() })
    .where(eq(ordersTable.id, params.data.orderId))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const fullOrder = await getOrderWithItems(order.id);

  // Broadcast status update
  broadcast(req.tenantId!, { type: "order:updated", order: fullOrder });

  res.json(fullOrder);
});

router.post("/orders/:orderId/ring", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const orderId = parseInt(req.params.orderId as string);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  const order = await getOrderWithItems(orderId);
  if (!order || order.tenantId !== req.tenantId) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  broadcast(req.tenantId!, { type: "order:bell", order });
  res.json({ success: true });
});

router.delete("/orders/all", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const orders = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(eq(ordersTable.tenantId, req.tenantId!), eq(ordersTable.status, "finalizado")));

  const orderIds = orders.map(o => o.id);

  if (orderIds.length > 0) {
    await db.delete(paymentsTable).where(inArray(paymentsTable.orderId, orderIds));
    await db.delete(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds));
    await db.delete(ordersTable).where(inArray(ordersTable.id, orderIds));
  }

  broadcast(req.tenantId!, { type: "orders:cleared" });
  res.json({ success: true, deleted: orderIds.length });
});

router.post("/caixa/fechamento/print", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { fechamento } = req.body;
  if (!fechamento) {
    res.status(400).json({ error: "fechamento data required" });
    return;
  }

  // Delete all finalized orders and their associated payments/items
  const finalizedOrders = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(and(eq(ordersTable.tenantId, req.tenantId!), eq(ordersTable.status, "finalizado")));

  const finalizedIds = finalizedOrders.map(o => o.id);

  if (finalizedIds.length > 0) {
    await db.delete(paymentsTable).where(inArray(paymentsTable.orderId, finalizedIds));
    await db.delete(orderItemsTable).where(inArray(orderItemsTable.orderId, finalizedIds));
    await db.delete(ordersTable).where(inArray(ordersTable.id, finalizedIds));
  }

  broadcast(req.tenantId!, { type: "caixa:fechamento", fechamento });
  if (finalizedIds.length > 0) {
    broadcast(req.tenantId!, { type: "orders:cleared" });
  }
  res.json({ success: true, clearedOrders: finalizedIds.length });
});

router.delete("/orders/:orderId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const orderId = parseInt(req.params.orderId as string);
  if (isNaN(orderId)) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  const [order] = await db
    .update(ordersTable)
    .set({ status: "cancelado", updatedAt: new Date() })
    .where(and(eq(ordersTable.id, orderId), eq(ordersTable.tenantId, req.tenantId!)))
    .returning();

  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  const fullOrder = await getOrderWithItems(order.id);
  broadcast(req.tenantId!, { type: "order:updated", order: fullOrder });
  res.json(fullOrder);
});

export default router;
