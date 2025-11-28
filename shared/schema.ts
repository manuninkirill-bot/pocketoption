import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Trading enums
export const directionEnum = pgEnum("direction", ["call", "put"]);
export const resultEnum = pgEnum("result", ["win", "loss", "pending"]);

// Trades table
export const trades = pgTable("trades", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  direction: directionEnum("direction").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  asset: text("asset").notNull(),
  durationSeconds: integer("duration_seconds").notNull(),
  entryPrice: numeric("entry_price", { precision: 10, scale: 2 }),
  exitPrice: numeric("exit_price", { precision: 10, scale: 2 }),
  result: resultEnum("result").default("pending"),
  sarSignal: text("sar_signal"),
});

export const insertTradeSchema = createInsertSchema(trades).omit({
  id: true,
  occurredAt: true,
});

export const selectTradeSchema = createSelectSchema(trades);

export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
