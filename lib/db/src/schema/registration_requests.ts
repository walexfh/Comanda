import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";

export const registrationRequestsTable = pgTable("registration_requests", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  restaurantName: text("restaurant_name").notNull(),
  phone: text("phone"),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RegistrationRequest = typeof registrationRequestsTable.$inferSelect;
