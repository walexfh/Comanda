import { db, masterUsersTable } from "@workspace/db";
import { hashPassword } from "./auth";
import { logger } from "./logger";

export async function initDb(): Promise<void> {
  try {
    const existing = await db.select().from(masterUsersTable).limit(1);
    if (existing.length > 0) {
      logger.info("Master user already exists, skipping seed");
      return;
    }

    const email = process.env.MASTER_EMAIL ?? "walexferreiraegy@gmail.com";
    const password = process.env.MASTER_INITIAL_PASSWORD ?? "master123";

    await db.insert(masterUsersTable).values({
      name: "Master WFoods",
      email,
      passwordHash: hashPassword(password),
    });

    logger.info({ email }, "Master user created successfully. CHANGE THE PASSWORD after first login.");
  } catch (err) {
    logger.error({ err }, "Failed to seed master user");
  }
}
