import { 
  users, 
  auditSessions, 
  auditResults,
  githubRepositories,
  authNonces,
  creditTransactions,
  creditPackages,
  type User, 
  type InsertUser,
  type AuditSession,
  type InsertAuditSession,
  type AuditResult,
  type InsertAuditResult,
  type GithubRepository,
  type InsertGithubRepository,
  type AuthNonce,
  type InsertAuthNonce,
  type UpdateAuditVisibility,
  type CreditTransaction,
  type CreditPackage
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, lt, gt, gte, lte, and, or, sql, like, arrayContains } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByWallet(walletAddress: string): Promise<User | undefined>;
  getUserByGithubId(githubId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;
  updateUserDisplayName(id: string, displayName: string): Promise<User | undefined>;
  
  // GitHub repository operations
  createGithubRepository(repo: InsertGithubRepository): Promise<GithubRepository>;
  getUserGithubRepositories(userId: string): Promise<GithubRepository[]>;
  getGithubRepository(id: string): Promise<GithubRepository | undefined>;
  updateGithubRepositories(userId: string, repos: InsertGithubRepository[]): Promise<GithubRepository[]>;
  
  // Audit session operations
  createAuditSession(session: InsertAuditSession): Promise<AuditSession>;
  getAuditSession(id: string): Promise<AuditSession | undefined>;
  updateAuditSessionStatus(id: string, status: string, completedAt?: Date): Promise<void>;
  getRecentAuditSessions(limit?: number): Promise<AuditSession[]>;
  // Audit CRUD operations
  updateAuditTitle(sessionId: string, title: string): Promise<AuditSession | undefined>;
  updateAuditPinStatus(sessionId: string, isPinned: boolean): Promise<AuditSession | undefined>;
  updateAuditArchiveStatus(sessionId: string, isArchived: boolean): Promise<AuditSession | undefined>;
  deleteAuditSession(sessionId: string): Promise<boolean>;
  getAuditSessionDetails(sessionId: string): Promise<any>;
  
  getUserAuditSessions(userId: string, limit?: number, filters?: {
    search?: string;
    status?: string;
    visibility?: string;
    language?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
  }): Promise<AuditSession[]>;
  
  // Audit result operations
  createAuditResult(result: InsertAuditResult): Promise<AuditResult>;
  getAuditResultBySessionId(sessionId: string): Promise<AuditResult | undefined>;
  
  // Auth nonce operations  
  createAuthNonce(nonce: InsertAuthNonce): Promise<AuthNonce>;
  getAuthNonce(nonce: string): Promise<AuthNonce | undefined>;
  markNonceAsUsed(nonce: string): Promise<void>;
  cleanupExpiredNonces(): Promise<void>;
  
  // Community operations
  getPublicAudits(options: {
    offset: number;
    limit: number;
    tags?: string;
    search?: string;
  }): Promise<{
    audits: (AuditSession & { user: Pick<User, 'username' | 'walletAddress'> | null; result: Pick<AuditResult, 'vulnerabilityCount' | 'securityScore'> | null })[];
    total: number;
  }>;
  getPublicAuditById(auditId: string): Promise<(AuditSession & { user: Pick<User, 'username' | 'walletAddress'> | null; result: AuditResult | null }) | null>;
  updateAuditVisibility(auditId: string, updates: UpdateAuditVisibility): Promise<void>;
  getTrendingTags(): Promise<{ tag: string; count: number }[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByWallet(walletAddress: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, walletAddress));
    return user || undefined;
  }

  async getUserByGithubId(githubId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.githubId, githubId));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserDisplayName(id: string, displayName: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        displayName: displayName,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // GitHub repository operations
  async createGithubRepository(insertRepo: InsertGithubRepository): Promise<GithubRepository> {
    const [repo] = await db
      .insert(githubRepositories)
      .values(insertRepo)
      .returning();
    return repo;
  }

  async getUserGithubRepositories(userId: string): Promise<GithubRepository[]> {
    return await db
      .select()
      .from(githubRepositories)
      .where(eq(githubRepositories.userId, userId))
      .orderBy(desc(githubRepositories.updatedAt));
  }

  async getGithubRepository(id: string): Promise<GithubRepository | undefined> {
    const [repo] = await db.select().from(githubRepositories).where(eq(githubRepositories.id, id));
    return repo || undefined;
  }

  async updateGithubRepositories(userId: string, repos: InsertGithubRepository[]): Promise<GithubRepository[]> {
    // Delete existing repos for user
    await db.delete(githubRepositories).where(eq(githubRepositories.userId, userId));
    
    // Insert new repos
    if (repos.length > 0) {
      return await db.insert(githubRepositories).values(repos).returning();
    }
    return [];
  }

  // Audit session operations
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

  // Audit CRUD operations implementation
  async updateAuditTitle(sessionId: string, title: string): Promise<AuditSession | undefined> {
    const [updated] = await db
      .update(auditSessions)
      .set({ publicTitle: title })
      .where(eq(auditSessions.id, sessionId))
      .returning();
    return updated;
  }

  async updateAuditPinStatus(sessionId: string, isPinned: boolean): Promise<AuditSession | undefined> {
    const [updated] = await db
      .update(auditSessions)
      .set({ isPinned })
      .where(eq(auditSessions.id, sessionId))
      .returning();
    return updated;
  }

  async updateAuditArchiveStatus(sessionId: string, isArchived: boolean): Promise<AuditSession | undefined> {
    const [updated] = await db
      .update(auditSessions)
      .set({ isArchived })
      .where(eq(auditSessions.id, sessionId))
      .returning();
    return updated;
  }

  async deleteAuditSession(sessionId: string): Promise<boolean> {
    // First delete related audit results
    await db.delete(auditResults).where(eq(auditResults.sessionId, sessionId));
    
    // Then delete the audit session
    const [deleted] = await db
      .delete(auditSessions)
      .where(eq(auditSessions.id, sessionId))
      .returning();
    
    return !!deleted;
  }

  async getAuditSessionDetails(sessionId: string): Promise<any> {
    // Get session with results
    const session = await db
      .select()
      .from(auditSessions)
      .leftJoin(auditResults, eq(auditSessions.id, auditResults.sessionId))
      .leftJoin(users, eq(auditSessions.userId, users.id))
      .where(eq(auditSessions.id, sessionId));
    
    if (!session.length) {
      return null;
    }

    const audit = session[0];
    return {
      ...audit.audit_sessions,
      result: audit.audit_results,
      user: audit.users ? { 
        username: audit.users.username, 
        walletAddress: audit.users.walletAddress,
        displayName: audit.users.displayName,
        ensName: audit.users.ensName,
        githubUsername: audit.users.githubUsername
      } : null
    };
  }

  async getUserAuditSessions(userId: string, limit = 50, filters?: {
    search?: string;
    status?: string;
    visibility?: string;
    language?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
  }): Promise<AuditSession[]> {
    let query = db
      .select()
      .from(auditSessions)
      .where(eq(auditSessions.userId, userId));

    // Apply filters
    if (filters) {
      // Search filter
      if (filters.search && filters.search !== '') {
        const searchTerm = `%${filters.search.toLowerCase()}%`;
        query = query.where(or(
          sql`LOWER(${auditSessions.publicTitle}) LIKE ${searchTerm}`,
          sql`LOWER(${auditSessions.contractLanguage}) LIKE ${searchTerm}`
        ));
      }

      // Status filter
      if (filters.status && filters.status !== 'all') {
        query = query.where(eq(auditSessions.status, filters.status));
      }

      // Visibility filter
      if (filters.visibility === 'public') {
        query = query.where(eq(auditSessions.isPublic, true));
      } else if (filters.visibility === 'private') {
        query = query.where(eq(auditSessions.isPublic, false));
      }

      // Language filter
      if (filters.language && filters.language !== 'all') {
        query = query.where(eq(auditSessions.contractLanguage, filters.language));
      }

      // Date range filters
      if (filters.dateFrom) {
        query = query.where(gte(auditSessions.createdAt, new Date(filters.dateFrom)));
      }
      if (filters.dateTo) {
        query = query.where(lte(auditSessions.createdAt, new Date(filters.dateTo)));
      }

      // Sorting
      const sortColumn = filters.sortBy === 'title' ? auditSessions.publicTitle
        : filters.sortBy === 'status' ? auditSessions.status
        : auditSessions.createdAt;
      
      if (filters.sortOrder === 'asc') {
        query = query.orderBy(asc(sortColumn));
      } else {
        query = query.orderBy(desc(sortColumn));
      }
    } else {
      query = query.orderBy(desc(auditSessions.createdAt));
    }

    return await query.limit(limit);
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

  // Auth nonce operations
  async createAuthNonce(insertNonce: InsertAuthNonce): Promise<AuthNonce> {
    const [nonce] = await db
      .insert(authNonces)
      .values(insertNonce)
      .returning();
    return nonce;
  }

  async getAuthNonce(nonceValue: string): Promise<AuthNonce | undefined> {
    const [nonce] = await db
      .select()
      .from(authNonces)
      .where(and(
        eq(authNonces.nonce, nonceValue),
        eq(authNonces.used, false),
        gt(authNonces.expiresAt, new Date())
      ))
      .orderBy(desc(authNonces.expiresAt))
      .limit(1);
    return nonce || undefined;
  }

  async markNonceAsUsed(nonceValue: string): Promise<void> {
    await db
      .update(authNonces)
      .set({ used: true })
      .where(eq(authNonces.nonce, nonceValue));
  }

  async cleanupExpiredNonces(): Promise<void> {
    await db
      .delete(authNonces)
      .where(lt(authNonces.expiresAt, new Date()));
  }

  // Community operations
  async getPublicAudits(options: {
    offset: number;
    limit: number;
    tags?: string;
    search?: string;
  }): Promise<{
    audits: (AuditSession & { user: Pick<User, 'username' | 'walletAddress' | 'displayName' | 'ensName' | 'githubUsername'> | null; result: Pick<AuditResult, 'vulnerabilityCount' | 'securityScore'> | null })[];
    total: number;
  }> {
    let baseQuery = db
      .select({
        id: auditSessions.id,
        userId: auditSessions.userId,
        sessionKey: auditSessions.sessionKey,
        contractCode: auditSessions.contractCode,
        contractLanguage: auditSessions.contractLanguage,
        contractSource: auditSessions.contractSource,
        githubRepoId: auditSessions.githubRepoId,
        githubFilePath: auditSessions.githubFilePath,
        status: auditSessions.status,
        isPublic: auditSessions.isPublic,
        publicTitle: auditSessions.publicTitle,
        publicDescription: auditSessions.publicDescription,
        tags: auditSessions.tags,
        createdAt: auditSessions.createdAt,
        completedAt: auditSessions.completedAt,
        user: {
          username: users.username,
          walletAddress: users.walletAddress,
          displayName: users.displayName,
          ensName: users.ensName,
          githubUsername: users.githubUsername,
        },
        result: {
          vulnerabilityCount: auditResults.vulnerabilityCount,
          securityScore: auditResults.securityScore,
        },
      })
      .from(auditSessions)
      .leftJoin(users, eq(auditSessions.userId, users.id))
      .leftJoin(auditResults, eq(auditSessions.id, auditResults.sessionId))
      .where(and(
        eq(auditSessions.isPublic, true),
        eq(auditSessions.status, 'completed')
      ));

    if (options.search) {
      baseQuery = baseQuery.where(and(
        eq(auditSessions.isPublic, true),
        eq(auditSessions.status, 'completed'),
        like(auditSessions.publicTitle, `%${options.search}%`)
      ));
    }

    if (options.tags) {
      const tagArray = options.tags.split(',');
      for (const tag of tagArray) {
        baseQuery = baseQuery.where(and(
          eq(auditSessions.isPublic, true),
          eq(auditSessions.status, 'completed'),
          sql`${auditSessions.tags} @> ${JSON.stringify([tag.trim()])}`
        ));
      }
    }

    const audits = await baseQuery
      .orderBy(desc(auditSessions.createdAt))
      .limit(options.limit)
      .offset(options.offset);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditSessions)
      .where(and(
        eq(auditSessions.isPublic, true),
        eq(auditSessions.status, 'completed')
      ));

    return {
      audits: audits as any,
      total: totalResult[0]?.count || 0,
    };
  }

  async getPublicAuditById(auditId: string): Promise<(AuditSession & { user: Pick<User, 'username' | 'walletAddress'> | null; result: AuditResult | null }) | null> {
    const [audit] = await db
      .select({
        id: auditSessions.id,
        userId: auditSessions.userId,
        sessionKey: auditSessions.sessionKey,
        contractCode: auditSessions.contractCode,
        contractLanguage: auditSessions.contractLanguage,
        contractSource: auditSessions.contractSource,
        githubRepoId: auditSessions.githubRepoId,
        githubFilePath: auditSessions.githubFilePath,
        status: auditSessions.status,
        isPublic: auditSessions.isPublic,
        publicTitle: auditSessions.publicTitle,
        publicDescription: auditSessions.publicDescription,
        tags: auditSessions.tags,
        createdAt: auditSessions.createdAt,
        completedAt: auditSessions.completedAt,
        user: {
          username: users.username,
          walletAddress: users.walletAddress,
        },
        result: auditResults,
      })
      .from(auditSessions)
      .leftJoin(users, eq(auditSessions.userId, users.id))
      .leftJoin(auditResults, eq(auditSessions.id, auditResults.sessionId))
      .where(and(
        eq(auditSessions.id, auditId),
        eq(auditSessions.isPublic, true),
        eq(auditSessions.status, 'completed')
      ));

    return audit as any || null;
  }

  async updateAuditVisibility(auditId: string, updates: UpdateAuditVisibility): Promise<void> {
    await db
      .update(auditSessions)
      .set(updates)
      .where(eq(auditSessions.id, auditId));
  }

  async getTrendingTags(): Promise<{ tag: string; count: number }[]> {
    const result = await db
      .select({
        tags: auditSessions.tags,
      })
      .from(auditSessions)
      .where(and(
        eq(auditSessions.isPublic, true),
        eq(auditSessions.status, 'completed')
      ));

    // Process tags and count occurrences
    const tagCounts: Record<string, number> = {};
    
    result.forEach(row => {
      if (row.tags && Array.isArray(row.tags)) {
        row.tags.forEach(tag => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    return Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }
}

export const storage = new DatabaseStorage();
