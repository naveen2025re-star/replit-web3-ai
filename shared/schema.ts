import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").unique(),
  ensName: text("ens_name"),
  username: text("username"),
  displayName: text("display_name"), // User-friendly display name that users can set
  email: text("email"),
  githubId: text("github_id").unique(),
  githubUsername: text("github_username"),
  githubAccessToken: text("github_access_token"),
  profileImageUrl: text("profile_image_url"),
  credits: integer("credits").default(1000).notNull(), // Start with 1000 free credits
  totalCreditsUsed: integer("total_credits_used").default(0).notNull(),
  totalCreditsEarned: integer("total_credits_earned").default(1000).notNull(), // Track total earned including initial
  lastCreditGrant: timestamp("last_credit_grant").defaultNow(), // Track when last credits were granted
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const githubRepositories = pgTable("github_repositories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  repoId: integer("repo_id").notNull(),
  name: text("name").notNull(),
  fullName: text("full_name").notNull(),
  description: text("description"),
  private: boolean("private").notNull().default(false),
  htmlUrl: text("html_url").notNull(),
  defaultBranch: text("default_branch").notNull().default("main"),
  language: text("language"),
  stargazersCount: integer("stargazers_count").notNull().default(0),
  forksCount: integer("forks_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const auditSessions = pgTable("audit_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  sessionKey: text("session_key").notNull(),
  contractCode: text("contract_code").notNull(),
  contractLanguage: text("contract_language").notNull().default("solidity"),
  contractSource: text("contract_source").default("manual"), // manual, github
  githubRepoId: varchar("github_repo_id").references(() => githubRepositories.id),
  githubFilePath: text("github_file_path"),
  status: text("status").notNull().default("pending"), // pending, analyzing, completed, failed
  isPublic: boolean("is_public").notNull().default(false),
  publicTitle: text("public_title"),
  publicDescription: text("public_description"),
  tags: jsonb("tags").$type<string[]>().default([]),
  creditsUsed: integer("credits_used").default(0).notNull(), // Track credits spent on this audit
  codeComplexity: integer("code_complexity").default(1).notNull(), // 1-10 scale for credit calculation
  isPinned: boolean("is_pinned").notNull().default(false), // Pin important chats
  isArchived: boolean("is_archived").notNull().default(false), // Archive old chats
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

// Authentication nonces for secure wallet signing
export const authNonces = pgTable("auth_nonces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  walletAddress: text("wallet_address").notNull(),
  nonce: text("nonce").notNull().unique(),
  message: text("message").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Credit transactions table for detailed tracking
export const creditTransactions = pgTable("credit_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["deduction", "purchase", "bonus", "refund", "initial"] }).notNull(),
  amount: integer("amount").notNull(), // Positive for additions, negative for deductions
  reason: text("reason").notNull(), // Description of transaction
  sessionId: varchar("session_id").references(() => auditSessions.id), // Link to audit session if applicable
  metadata: jsonb("metadata").$type<{
    codeLength?: number;
    complexity?: number;
    packageId?: string;
    paypalOrderId?: string;
    originalAmount?: number;
  }>(), // Additional data
  balanceAfter: integer("balance_after").notNull(), // User's credit balance after this transaction
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Credit packages for purchase
export const creditPackages = pgTable("credit_packages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  credits: integer("credits").notNull(),
  bonusCredits: integer("bonus_credits").default(0).notNull(), // Extra credits for bulk purchases
  totalCredits: integer("total_credits").notNull(), // credits + bonusCredits
  price: integer("price").notNull(), // Price in cents
  popular: boolean("popular").default(false).notNull(),
  savings: integer("savings").default(0).notNull(), // Percentage savings vs individual purchase
  active: boolean("active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  auditSessions: many(auditSessions),
  githubRepositories: many(githubRepositories),
  creditTransactions: many(creditTransactions),
}));

export const githubRepositoriesRelations = relations(githubRepositories, ({ one, many }) => ({
  user: one(users, {
    fields: [githubRepositories.userId],
    references: [users.id],
  }),
  auditSessions: many(auditSessions),
}));

export const auditSessionsRelations = relations(auditSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [auditSessions.userId],
    references: [users.id],
  }),
  githubRepository: one(githubRepositories, {
    fields: [auditSessions.githubRepoId],
    references: [githubRepositories.id],
  }),
  results: many(auditResults),
  creditTransactions: many(creditTransactions),
}));

export const auditResultsRelations = relations(auditResults, ({ one }) => ({
  session: one(auditSessions, {
    fields: [auditResults.sessionId],
    references: [auditSessions.id],
  }),
}));

export const authNoncesRelations = relations(authNonces, ({ one }) => ({
  user: one(users, {
    fields: [authNonces.walletAddress],
    references: [users.walletAddress],
  }),
}));

export const creditTransactionsRelations = relations(creditTransactions, ({ one }) => ({
  user: one(users, {
    fields: [creditTransactions.userId],
    references: [users.id],
  }),
  session: one(auditSessions, {
    fields: [creditTransactions.sessionId],
    references: [auditSessions.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  walletAddress: true,
  ensName: true,
  username: true,
  displayName: true,
  email: true,
  githubId: true,
  githubUsername: true,
  githubAccessToken: true,
  profileImageUrl: true,
});

export const insertGithubRepositorySchema = createInsertSchema(githubRepositories).pick({
  userId: true,
  repoId: true,
  name: true,
  fullName: true,
  description: true,
  private: true,
  htmlUrl: true,
  defaultBranch: true,
  language: true,
  stargazersCount: true,
  forksCount: true,
});

export const insertAuditSessionSchema = createInsertSchema(auditSessions).pick({
  userId: true,
  sessionKey: true,
  contractCode: true,
  contractLanguage: true,
  contractSource: true,
  githubRepoId: true,
  githubFilePath: true,
  isPublic: true,
  publicTitle: true,
  publicDescription: true,
  tags: true,
});

export const updateAuditVisibilitySchema = createInsertSchema(auditSessions).pick({
  isPublic: true,
  publicTitle: true,
  publicDescription: true,
  tags: true,
});

export const insertAuditResultSchema = createInsertSchema(auditResults).pick({
  sessionId: true,
  rawResponse: true,
  formattedReport: true,
  vulnerabilityCount: true,
  securityScore: true,
});

export const insertAuthNonceSchema = createInsertSchema(authNonces).pick({
  walletAddress: true,
  nonce: true,
  message: true,
  expiresAt: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).pick({
  userId: true,
  type: true,
  amount: true,
  reason: true,
  sessionId: true,
  metadata: true,
  balanceAfter: true,
});

export const insertCreditPackageSchema = createInsertSchema(creditPackages).pick({
  name: true,
  credits: true,
  bonusCredits: true,
  totalCredits: true,
  price: true,
  popular: true,
  savings: true,
  active: true,
  sortOrder: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertGithubRepository = z.infer<typeof insertGithubRepositorySchema>;
export type GithubRepository = typeof githubRepositories.$inferSelect;
export type InsertAuditSession = z.infer<typeof insertAuditSessionSchema>;
export type AuditSession = typeof auditSessions.$inferSelect;
export type UpdateAuditVisibility = z.infer<typeof updateAuditVisibilitySchema>;
export type InsertAuditResult = z.infer<typeof insertAuditResultSchema>;
export type AuditResult = typeof auditResults.$inferSelect;
export type InsertAuthNonce = z.infer<typeof insertAuthNonceSchema>;
export type AuthNonce = typeof authNonces.$inferSelect;
export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditPackage = z.infer<typeof insertCreditPackageSchema>;
export type CreditPackage = typeof creditPackages.$inferSelect;
