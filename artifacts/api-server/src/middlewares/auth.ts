import { type Request, type Response, type NextFunction } from "express";
import { parseToken } from "../lib/auth";

export interface AuthenticatedRequest extends Request {
  userId?: number;
  tenantId?: number;
  role?: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
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
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    if (req.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}
