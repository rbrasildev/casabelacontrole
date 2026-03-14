import { pgTable, serial, text, numeric, timestamp, date, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  goalAmount: numeric("goal_amount", { precision: 10, scale: 2 }).notNull(),
  currentAmount: numeric("current_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("active"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  pixKey: text("pix_key"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contributionsTable = pgTable("contributions", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull(),
  contributorName: text("contributor_name").notNull(),
  contributorContact: text("contributor_contact"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({ id: true, createdAt: true, currentAmount: true });
export const insertContributionSchema = createInsertSchema(contributionsTable).omit({ id: true, createdAt: true });

export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
export type InsertContribution = z.infer<typeof insertContributionSchema>;
export type Contribution = typeof contributionsTable.$inferSelect;
