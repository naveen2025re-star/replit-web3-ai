import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const auditSessions = pgTable("audit_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionKey: text("session_key").notNull(),
  contractCode: text("contract_code").notNull(),
  contractLanguage: text("contract_language").notNull().default("solidity"),
  status: text("status").notNull().default("pending"), // pending, analyzing, completed, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const auditResults = pgTable("audit_results", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => auditSessions.id),
  rawResponse: text("raw_response"),
  formattedReport: text("formatted_report"),
  vulnerabilityCount: jsonb("vulnerability_count").$type<{
    high: number;
    medium: number;
    low: number;
    info: number;
  }>(),
  securityScore: integer("security_score"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAuditSessionSchema = createInsertSchema(auditSessions).pick({
  sessionKey: true,
  contractCode: true,
  contractLanguage: true,
});

export const insertAuditResultSchema = createInsertSchema(auditResults).pick({
  sessionId: true,
  rawResponse: true,
  formattedReport: true,
  vulnerabilityCount: true,
  securityScore: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAuditSession = z.infer<typeof insertAuditSessionSchema>;
export type AuditSession = typeof auditSessions.$inferSelect;
export type InsertAuditResult = z.infer<typeof insertAuditResultSchema>;
export type AuditResult = typeof auditResults.$inferSelect;
