import { pgTable, serial, text, numeric, timestamp, date, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const financesTable = pgTable("finances", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  date: date("date").notNull(),
  residentId: integer("resident_id"),
  paymentMethod: text("payment_method"),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertFinanceSchema = createInsertSchema(financesTable).omit({ id: true, createdAt: true });
export type InsertFinance = z.infer<typeof insertFinanceSchema>;
export type Finance = typeof financesTable.$inferSelect;
