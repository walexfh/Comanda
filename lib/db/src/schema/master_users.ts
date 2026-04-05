import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const masterUsersTable = pgTable("master_users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMasterUserSchema = createInsertSchema(masterUsersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertMasterUser = z.infer<typeof insertMasterUserSchema>;
export type MasterUser = typeof masterUsersTable.$inferSelect;
