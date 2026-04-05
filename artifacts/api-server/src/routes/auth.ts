import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, tenantsTable, usersTable, waitersTable } from "@workspace/db";
import { hashPassword, verifyPassword, generateToken } from "../lib/auth";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import {
  AdminLoginBody,
  WaiterLoginBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/admin/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, tenantSlug } = parsed.data;

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, tenantSlug));
  if (!tenant) {
    res.status(401).json({ error: "Restaurante não encontrado" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.email, email), eq(usersTable.tenantId, tenant.id)));

  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const token = generateToken(user.id, tenant.id, "admin");

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: "admin",
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
    },
  });
});

router.post("/auth/waiter/login", async (req, res): Promise<void> => {
  const parsed = WaiterLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, password, tenantSlug } = parsed.data;

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, tenantSlug));
  if (!tenant) {
    res.status(401).json({ error: "Restaurante não encontrado" });
    return;
  }

  const [waiter] = await db
    .select()
    .from(waitersTable)
    .where(and(eq(waitersTable.name, name), eq(waitersTable.tenantId, tenant.id)));

  if (!waiter || !verifyPassword(password, waiter.passwordHash)) {
    res.status(401).json({ error: "Credenciais inválidas" });
    return;
  }

  const token = generateToken(waiter.id, tenant.id, "waiter");

  res.json({
    token,
    user: {
      id: waiter.id,
      name: waiter.name,
      email: null,
      role: "waiter",
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
    },
  });
});

router.get("/auth/me", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const { userId, tenantId, role } = req;

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId!));
  if (!tenant) {
    res.status(401).json({ error: "Tenant not found" });
    return;
  }

  if (role === "admin") {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId!));
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: "admin",
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
    });
  } else {
    const [waiter] = await db.select().from(waitersTable).where(eq(waitersTable.id, userId!));
    if (!waiter) {
      res.status(401).json({ error: "Waiter not found" });
      return;
    }
    res.json({
      id: waiter.id,
      name: waiter.name,
      email: null,
      role: "waiter",
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
    });
  }
});

router.post("/auth/logout", (_req, res): void => {
  res.json({ success: true });
});

export default router;
