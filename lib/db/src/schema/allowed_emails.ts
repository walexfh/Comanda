import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const allowedEmailsTable = pgTable("allowed_emails", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AllowedEmail = typeof allowedEmailsTable.$inferSelect;
