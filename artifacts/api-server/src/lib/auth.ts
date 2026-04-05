import crypto from "crypto";

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "wfoods_salt_2024").digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

export function generateToken(userId: number, tenantId: number, role: string): string {
  const payload = `${userId}:${tenantId}:${role}:${Date.now()}`;
  return Buffer.from(payload).toString("base64");
}

export function parseToken(token: string): { userId: number; tenantId: number; role: string } | null {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 3) return null;
    return {
      userId: parseInt(parts[0], 10),
      tenantId: parseInt(parts[1], 10),
      role: parts[2],
    };
  } catch {
    return null;
  }
}
