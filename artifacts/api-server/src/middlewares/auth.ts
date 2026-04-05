import { type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { parseToken } from "../lib/auth";
import { db, tenantsTable } from "@workspace/db";

export interface AuthenticatedRequest extends Request {
  userId?: number;
  tenantId?: number;
  role?: string;
}

function isOverdue(expiresAt: Date | null | undefined, graceDays = 3): boolean {
  if (!expiresAt) return false;
  const msOverdue = Date.now() - new Date(expiresAt).getTime();
  return msOverdue > graceDays * 24 * 60 * 60 * 1000;
}

function isPast(date: Date | null | undefined): boolean {
  if (!date) return false;
  return new Date(date) < new Date();
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const parsed = parseToken(token);
  if (!parsed) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  req.userId = parsed.userId;
  req.tenantId = parsed.tenantId;
  req.role = parsed.role;

  if (parsed.role === "master") {
    next();
    return;
  }

  const [tenant] = await db.select().from(tenantsTable).where(eq(tenantsTable.id, parsed.tenantId));

  if (!tenant) {
    res.status(401).json({ error: "Restaurante não encontrado" });
    return;
  }

  if (tenant.status === "blocked") {
    res.status(403).json({
      error: "blocked",
      message: "Acesso bloqueado. Entre em contato com o suporte.",
      blockReason: tenant.blockReason,
    });
    return;
  }

  if (tenant.trialEndsAt && isPast(tenant.trialEndsAt)) {
    res.status(403).json({
      error: "trial_expired",
      message: "Período de teste encerrado. Entre em contato para assinar.",
    });
    return;
  }

  if (tenant.subscriptionExpiresAt && isOverdue(tenant.subscriptionExpiresAt)) {
    await db.update(tenantsTable).set({
      status: "blocked",
      blockReason: "Assinatura vencida há mais de 3 dias",
      updatedAt: new Date(),
    }).where(eq(tenantsTable.id, tenant.id));

    res.status(403).json({
      error: "subscription_expired",
      message: "Assinatura vencida. Realize o pagamento para continuar.",
    });
    return;
  }

  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const parsed = parseToken(token);
  if (!parsed || parsed.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  req.userId = parsed.userId;
  req.tenantId = parsed.tenantId;
  req.role = parsed.role;
  next();
}
