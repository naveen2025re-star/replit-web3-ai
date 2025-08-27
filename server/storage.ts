import { 
  users, 
  auditSessions, 
  auditResults,
  type User, 
  type InsertUser,
  type AuditSession,
  type InsertAuditSession,
  type AuditResult,
  type InsertAuditResult
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createAuditSession(session: InsertAuditSession): Promise<AuditSession>;
  getAuditSession(id: string): Promise<AuditSession | undefined>;
  updateAuditSessionStatus(id: string, status: string, completedAt?: Date): Promise<void>;
  getRecentAuditSessions(limit?: number): Promise<AuditSession[]>;
  
  createAuditResult(result: InsertAuditResult): Promise<AuditResult>;
  getAuditResultBySessionId(sessionId: string): Promise<AuditResult | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createAuditSession(insertSession: InsertAuditSession): Promise<AuditSession> {
    const [session] = await db
      .insert(auditSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getAuditSession(id: string): Promise<AuditSession | undefined> {
    const [session] = await db.select().from(auditSessions).where(eq(auditSessions.id, id));
    return session || undefined;
  }

  async updateAuditSessionStatus(id: string, status: string, completedAt?: Date): Promise<void> {
    await db
      .update(auditSessions)
      .set({ 
        status,
        ...(completedAt && { completedAt })
      })
      .where(eq(auditSessions.id, id));
  }

  async getRecentAuditSessions(limit = 10): Promise<AuditSession[]> {
    return await db
      .select()
      .from(auditSessions)
      .orderBy(desc(auditSessions.createdAt))
      .limit(limit);
  }

  async createAuditResult(insertResult: InsertAuditResult): Promise<AuditResult> {
    const [result] = await db
      .insert(auditResults)
      .values(insertResult)
      .returning();
    return result;
  }

  async getAuditResultBySessionId(sessionId: string): Promise<AuditResult | undefined> {
    const [result] = await db.select().from(auditResults).where(eq(auditResults.sessionId, sessionId));
    return result || undefined;
  }
}

export const storage = new DatabaseStorage();
