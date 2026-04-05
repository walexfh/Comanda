import { type Request, type Response, type NextFunction } from "express";
import { parseToken } from "../lib/auth";

export interface MasterRequest extends Request {
  masterId?: number;
}

export function requireMaster(req: MasterRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const parsed = parseToken(token);
  if (!parsed || parsed.role !== "master") {
    res.status(403).json({ error: "Master access required" });
    return;
  }

  req.masterId = parsed.userId;
  next();
}
