import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tenantsTable, usersTable, allowedEmailsTable, registrationRequestsTable } from "@workspace/db";
import { hashPassword } from "../lib/auth";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/auth";
import { sendEmailNotification, sendWhatsAppNotification } from "../lib/notifications";
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

// Check if email is allowed to register
router.get("/tenants/check-email", async (req, res): Promise<void> => {
  const email = req.query.email as string;
  if (!email) {
    res.status(400).json({ error: "Email is required" });
    return;
  }
  const [allowed] = await db
    .select()
    .from(allowedEmailsTable)
    .where(eq(allowedEmailsTable.email, email.toLowerCase().trim()));

  res.json({ allowed: !!allowed });
});

// Submit a registration request
router.post("/tenants/request-access", async (req, res): Promise<void> => {
  const { name, email, restaurantName, phone, message } = req.body;

  if (!name || !email || !restaurantName) {
    res.status(400).json({ error: "name, email and restaurantName are required" });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if already in allowed list
  const [alreadyAllowed] = await db
    .select()
    .from(allowedEmailsTable)
    .where(eq(allowedEmailsTable.email, normalizedEmail));

  if (alreadyAllowed) {
    res.json({ alreadyAllowed: true });
    return;
  }

  // Check for duplicate pending request
  const [existing] = await db
    .select()
    .from(registrationRequestsTable)
    .where(eq(registrationRequestsTable.email, normalizedEmail));

  if (existing) {
    res.json({ duplicate: true, requestId: existing.id });
    return;
  }

  const [request] = await db
    .insert(registrationRequestsTable)
    .values({
      name,
      email: normalizedEmail,
      restaurantName,
      phone: phone || null,
      message: message || null,
    })
    .returning();

  // Send notifications (fire-and-forget)
  sendEmailNotification(request).catch(() => {});
  sendWhatsAppNotification(request).catch(() => {});

  res.status(201).json({ success: true, requestId: request.id });
});

router.post("/tenants", async (req, res): Promise<void> => {
  const parsed = CreateTenantBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, slug, phone, address, adminEmail, adminPassword } = parsed.data;

  // Check if email is in the allowed list
  const [allowed] = await db
    .select()
    .from(allowedEmailsTable)
    .where(eq(allowedEmailsTable.email, adminEmail.toLowerCase().trim()));

  if (!allowed) {
    res.status(403).json({ error: "Email not authorized. Please request access first." });
    return;
  }

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
