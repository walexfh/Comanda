import { pgTable, text, serial, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const tablesTable = pgTable("tables", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenantsTable.id),
  number: integer("number").notNull(),
  label: text("label"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTableSchema = createInsertSchema(tablesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTable = z.infer<typeof insertTableSchema>;
export type Table = typeof tablesTable.$inferSelect;
