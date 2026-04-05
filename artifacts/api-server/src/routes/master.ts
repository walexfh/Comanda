import { Router, type IRouter } from "express";
import { eq, sql, and, desc } from "drizzle-orm";
import { db, tenantsTable, masterUsersTable, ordersTable, usersTable, allowedEmailsTable, registrationRequestsTable } from "@workspace/db";
import { requireMaster, type MasterRequest } from "../middlewares/master";
import { hashPassword, verifyPassword, generateToken } from "../lib/auth";

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function isPast(date: Date): boolean {
  return date < new Date();
}

function differenceInDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

const router: IRouter = Router();

function getTenantStatus(tenant: typeof tenantsTable.$inferSelect): string {
  if (tenant.status === "blocked") return "blocked";

  if (tenant.trialEndsAt) {
    if (isPast(new Date(tenant.trialEndsAt))) return "trial_expired";
    return "trial";
  }

  if (tenant.subscriptionExpiresAt) {
    const expiry = new Date(tenant.subscriptionExpiresAt);
    const daysOverdue = differenceInDays(new Date(), expiry);
    if (daysOverdue > 3) return "overdue_blocked";
    if (daysOverdue > 0) return "overdue";
    const daysLeft = differenceInDays(expiry, new Date());
    if (daysLeft <= 7) return "expiring_soon";
  }

  return tenant.status;
}

router.post("/master/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email e senha são obrigatórios" });
    return;
  }

  const [master] = await db.select().from(masterUsersTable).where(eq(masterUsersTable.email, email));
  if (!master || !verifyPassword(password, master.passwordHash)) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const token = generateToken(master.id, 0, "master");
  res.json({ token, user: { id: master.id, name: master.name, email: master.email, role: "master" } });
});

router.get("/master/auth/me", requireMaster, async (req: MasterRequest, res): Promise<void> => {
  const [master] = await db.select().from(masterUsersTable).where(eq(masterUsersTable.id, req.masterId!));
  if (!master) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ id: master.id, name: master.name, email: master.email, role: "master" });
});

router.get("/master/dashboard", requireMaster, async (_req, res): Promise<void> => {
  const tenants = await db.select().from(tenantsTable);

  const stats = {
    total: tenants.length,
    active: 0,
    trial: 0,
    blocked: 0,
    expiringSoon: 0,
    overdue: 0,
  };

  for (const t of tenants) {
    const s = getTenantStatus(t);
    if (s === "blocked" || s === "overdue_blocked" || s === "trial_expired") stats.blocked++;
    else if (s === "trial") stats.trial++;
    else if (s === "overdue") stats.overdue++;
    else if (s === "expiring_soon") stats.expiringSoon++;
    else stats.active++;
  }

  res.json(stats);
});

router.get("/master/tenants", requireMaster, async (_req, res): Promise<void> => {
  const tenants = await db.select().from(tenantsTable).orderBy(tenantsTable.createdAt);

  const result = await Promise.all(tenants.map(async (t) => {
    const [orderCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(ordersTable)
      .where(eq(ordersTable.tenantId, t.id));

    const [revenue] = await db
      .select({ total: sql<string>`coalesce(sum(total), 0)` })
      .from(ordersTable)
      .where(and(eq(ordersTable.tenantId, t.id), eq(ordersTable.status, "finalizado")));

    const [adminUser] = await db.select().from(usersTable).where(eq(usersTable.tenantId, t.id));

    return {
      id: t.id,
      name: t.name,
      slug: t.slug,
      phone: t.phone,
      cnpj: t.cnpj,
      address: t.address,
      email: adminUser?.email ?? null,
      status: getTenantStatus(t),
      rawStatus: t.status,
      monthlyFee: parseFloat(String(t.monthlyFee ?? 0)),
      subscriptionExpiresAt: t.subscriptionExpiresAt,
      trialEndsAt: t.trialEndsAt,
      lastPaymentAt: t.lastPaymentAt,
      blockReason: t.blockReason,
      createdAt: t.createdAt,
      totalOrders: Number(orderCount?.count ?? 0),
      totalRevenue: parseFloat(String(revenue?.total ?? 0)),
    };
  }));

  res.json(result);
});

// Create restaurant directly from master panel
router.post("/master/tenants", requireMaster, async (req, res): Promise<void> => {
  const { name, slug, phone, cnpj, address, adminEmail, adminPassword } = req.body;

  if (!name || !slug || !phone || !cnpj || !address || !adminEmail || !adminPassword) {
    res.status(400).json({ error: "Todos os campos são obrigatórios." });
    return;
  }

  const normalizedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
  const [existingSlug] = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, normalizedSlug));
  if (existingSlug) {
    res.status(400).json({ error: "Este identificador (slug) já está em uso." });
    return;
  }

  const [tenant] = await db
    .insert(tenantsTable)
    .values({ name, slug: normalizedSlug, phone, cnpj, address })
    .returning();

  await db.insert(usersTable).values({
    tenantId: tenant.id,
    email: adminEmail.toLowerCase().trim(),
    passwordHash: hashPassword(adminPassword),
    name: "Admin",
    role: "admin",
  });

  res.status(201).json({ success: true, tenant });
});

router.get("/master/tenants/:id", requireMaster, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const [t] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id));
  if (!t) { res.status(404).json({ error: "Not found" }); return; }

  const [adminUser] = await db.select().from(usersTable).where(eq(usersTable.tenantId, t.id));

  const orders = await db
    .select()
    .from(ordersTable)
    .where(and(eq(ordersTable.tenantId, t.id), eq(ordersTable.status, "finalizado")));

  const totalRevenue = orders.reduce((acc, o) => acc + parseFloat(String(o.total ?? 0)), 0);

  const monthlyRevenue: Record<string, number> = {};
  for (const o of orders) {
    const month = new Date(o.createdAt).toISOString().slice(0, 7);
    monthlyRevenue[month] = (monthlyRevenue[month] ?? 0) + parseFloat(String(o.total ?? 0));
  }

  res.json({
    id: t.id,
    name: t.name,
    slug: t.slug,
    phone: t.phone,
    cnpj: t.cnpj,
    address: t.address,
    email: adminUser?.email ?? null,
    status: getTenantStatus(t),
    rawStatus: t.status,
    monthlyFee: parseFloat(String(t.monthlyFee ?? 0)),
    subscriptionExpiresAt: t.subscriptionExpiresAt,
    trialEndsAt: t.trialEndsAt,
    lastPaymentAt: t.lastPaymentAt,
    blockReason: t.blockReason,
    createdAt: t.createdAt,
    totalOrders: orders.length,
    totalRevenue,
    monthlyRevenue,
  });
});

// Edit restaurant info
router.patch("/master/tenants/:id/info", requireMaster, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { name, slug, phone, cnpj, address } = req.body;

  if (!name || !slug || !phone || !cnpj || !address) {
    res.status(400).json({ error: "Todos os campos são obrigatórios." });
    return;
  }

  const normalizedSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");

  // Check slug uniqueness (excluding current tenant)
  const [existingSlug] = await db
    .select()
    .from(tenantsTable)
    .where(eq(tenantsTable.slug, normalizedSlug));

  if (existingSlug && existingSlug.id !== id) {
    res.status(400).json({ error: "Este identificador (slug) já está em uso." });
    return;
  }

  const [tenant] = await db
    .update(tenantsTable)
    .set({ name, slug: normalizedSlug, phone, cnpj, address, updatedAt: new Date() })
    .where(eq(tenantsTable.id, id))
    .returning();

  if (!tenant) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true, tenant });
});

router.patch("/master/tenants/:id/block", requireMaster, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { reason } = req.body;

  const [tenant] = await db
    .update(tenantsTable)
    .set({ status: "blocked", blockReason: reason ?? "Bloqueado pelo administrador", updatedAt: new Date() })
    .where(eq(tenantsTable.id, id))
    .returning();

  if (!tenant) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true, status: "blocked" });
});

router.patch("/master/tenants/:id/unblock", requireMaster, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);

  const [tenant] = await db
    .update(tenantsTable)
    .set({ status: "active", blockReason: null, updatedAt: new Date() })
    .where(eq(tenantsTable.id, id))
    .returning();

  if (!tenant) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true, status: "active" });
});

router.post("/master/tenants/:id/payment", requireMaster, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { months = 1 } = req.body;

  const [current] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, id));
  if (!current) { res.status(404).json({ error: "Not found" }); return; }

  const baseDate = current.subscriptionExpiresAt && !isPast(new Date(current.subscriptionExpiresAt))
    ? new Date(current.subscriptionExpiresAt)
    : new Date();

  const newExpiry = addDays(baseDate, months * 30);

  const [tenant] = await db
    .update(tenantsTable)
    .set({
      status: "active",
      subscriptionExpiresAt: newExpiry,
      trialEndsAt: null,
      lastPaymentAt: new Date(),
      blockReason: null,
      updatedAt: new Date(),
    })
    .where(eq(tenantsTable.id, id))
    .returning();

  res.json({ success: true, subscriptionExpiresAt: tenant.subscriptionExpiresAt });
});

router.post("/master/tenants/:id/trial", requireMaster, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { days = 14 } = req.body;

  const trialEnd = addDays(new Date(), days);

  const [tenant] = await db
    .update(tenantsTable)
    .set({
      status: "active",
      trialEndsAt: trialEnd,
      subscriptionExpiresAt: null,
      blockReason: null,
      updatedAt: new Date(),
    })
    .where(eq(tenantsTable.id, id))
    .returning();

  if (!tenant) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true, trialEndsAt: tenant.trialEndsAt });
});

router.patch("/master/tenants/:id/fee", requireMaster, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  const { monthlyFee } = req.body;

  const [tenant] = await db
    .update(tenantsTable)
    .set({ monthlyFee: String(monthlyFee), updatedAt: new Date() })
    .where(eq(tenantsTable.id, id))
    .returning();

  if (!tenant) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

// ── Allowed Emails ──────────────────────────────────────────────────────────

router.get("/master/allowed-emails", requireMaster, async (_req, res): Promise<void> => {
  const emails = await db
    .select()
    .from(allowedEmailsTable)
    .orderBy(desc(allowedEmailsTable.createdAt));
  res.json(emails);
});

router.post("/master/allowed-emails", requireMaster, async (req, res): Promise<void> => {
  const { email, note } = req.body;
  if (!email) { res.status(400).json({ error: "Email required" }); return; }

  const [existing] = await db
    .select()
    .from(allowedEmailsTable)
    .where(eq(allowedEmailsTable.email, email.toLowerCase().trim()));
  if (existing) { res.status(400).json({ error: "Email already allowed" }); return; }

  const [row] = await db
    .insert(allowedEmailsTable)
    .values({ email: email.toLowerCase().trim(), note: note || null })
    .returning();
  res.status(201).json(row);
});

router.delete("/master/allowed-emails/:id", requireMaster, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(allowedEmailsTable).where(eq(allowedEmailsTable.id, id));
  res.json({ success: true });
});

// ── Registration Requests ────────────────────────────────────────────────────

router.get("/master/registration-requests", requireMaster, async (_req, res): Promise<void> => {
  const requests = await db
    .select()
    .from(registrationRequestsTable)
    .orderBy(desc(registrationRequestsTable.createdAt));
  res.json(requests);
});

router.patch("/master/registration-requests/:id/approve", requireMaster, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [request] = await db
    .select()
    .from(registrationRequestsTable)
    .where(eq(registrationRequestsTable.id, id));
  if (!request) { res.status(404).json({ error: "Request not found" }); return; }

  await db
    .update(registrationRequestsTable)
    .set({ status: "approved" })
    .where(eq(registrationRequestsTable.id, id));

  res.json({ success: true, request });
});

router.patch("/master/registration-requests/:id/reject", requireMaster, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db
    .update(registrationRequestsTable)
    .set({ status: "rejected" })
    .where(eq(registrationRequestsTable.id, id));

  res.json({ success: true });
});

export default router;
