import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tenantsTable, usersTable } from "@workspace/db";
import { hashPassword } from "../lib/auth";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import {
  CreateTenantBody,
  UpdateTenantBody,
  GetTenantParams,
  UpdateTenantParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/tenants", requireAuth, async (_req, res): Promise<void> => {
  const tenants = await db.select().from(tenantsTable).orderBy(tenantsTable.id);
  res.json(tenants);
});

router.post("/tenants", async (req, res): Promise<void> => {
  const parsed = CreateTenantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, slug, phone, address, adminEmail, adminPassword } = parsed.data;

  const existing = await db.select().from(tenantsTable).where(eq(tenantsTable.slug, slug));
  if (existing.length > 0) {
    res.status(400).json({ error: "Slug already in use" });
    return;
  }

  const [tenant] = await db.insert(tenantsTable).values({ name, slug, phone, address }).returning();

  await db.insert(usersTable).values({
    tenantId: tenant.id,
    email: adminEmail,
    passwordHash: hashPassword(adminPassword),
    name: "Admin",
    role: "admin",
  });

  res.status(201).json(tenant);
});

router.get("/tenants/:tenantId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = GetTenantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, params.data.tenantId));
  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  res.json(tenant);
});

router.patch("/tenants/:tenantId", requireAuth, async (req: AuthenticatedRequest, res): Promise<void> => {
  const params = UpdateTenantParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTenantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.phone != null) updateData.phone = parsed.data.phone;
  if (parsed.data.address != null) updateData.address = parsed.data.address;
  if (parsed.data.active != null) updateData.active = parsed.data.active;

  const [tenant] = await db
    .update(tenantsTable)
    .set(updateData)
    .where(eq(tenantsTable.id, params.data.tenantId))
    .returning();

  if (!tenant) {
    res.status(404).json({ error: "Tenant not found" });
    return;
  }

  res.json(tenant);
});

export default router;
