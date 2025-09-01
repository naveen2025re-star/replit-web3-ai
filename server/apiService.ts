import { db } from "./db";
import { apiKeys, webhooks, webhookDeliveries, auditSessions, auditResults } from "@shared/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import crypto from "crypto";
import bcrypt from "bcrypt";

export interface ApiKeyData {
  keyId: string;
  fullKey: string;
  hashedKey: string;
}

export class ApiService {
  // Generate a new API key
  static generateApiKey(): ApiKeyData {
    const keyId = `sa_${crypto.randomBytes(8).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');
    const fullKey = `${keyId}.${secret}`;
    const hashedKey = bcrypt.hashSync(fullKey, 12);
    
    return {
      keyId,
      fullKey,
      hashedKey,
    };
  }

  // Create a new API key for a user
  static async createApiKey(userId: string, name: string, permissions: string[] = ['audit:read', 'audit:write'], rateLimit: number = 1000) {
    const keyData = this.generateApiKey();
    
    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        userId,
        keyId: keyData.keyId,
        hashedKey: keyData.hashedKey,
        name,
        permissions,
        rateLimit,
      })
      .returning();

    return {
      ...apiKey,
      fullKey: keyData.fullKey, // Only return full key on creation
    };
  }

  // Verify an API key and return user info
  static async verifyApiKey(fullKey: string): Promise<{ userId: string; permissions: string[]; rateLimit: number } | null> {
    const [keyId] = fullKey.split('.');
    if (!keyId) return null;

    const [apiKey] = await db
      .select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.keyId, keyId),
        eq(apiKeys.active, true)
      ));

    if (!apiKey) return null;

    // Verify the full key matches
    const isValid = bcrypt.compareSync(fullKey, apiKey.hashedKey);
    if (!isValid) return null;

    // Check expiration
    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      return null;
    }

    // Update usage stats
    await db
      .update(apiKeys)
      .set({ 
        lastUsed: new Date(),
        usageCount: sql`${apiKeys.usageCount} + 1`
      })
      .where(eq(apiKeys.id, apiKey.id));

    return {
      userId: apiKey.userId,
      permissions: apiKey.permissions || [],
      rateLimit: apiKey.rateLimit,
    };
  }

  // Check rate limit for API key
  static async checkRateLimit(keyId: string, windowMinutes: number = 60): Promise<boolean> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    
    const [result] = await db
      .select({ 
        count: sql<number>`count(*)::int`,
        rateLimit: apiKeys.rateLimit 
      })
      .from(apiKeys)
      .where(and(
        eq(apiKeys.keyId, keyId),
        eq(apiKeys.active, true),
        gte(apiKeys.lastUsed, windowStart)
      ));

    if (!result) return false;
    
    return result.count < result.rateLimit;
  }

  // Get user's API keys
  static async getUserApiKeys(userId: string) {
    return await db
      .select({
        id: apiKeys.id,
        keyId: apiKeys.keyId,
        name: apiKeys.name,
        permissions: apiKeys.permissions,
        lastUsed: apiKeys.lastUsed,
        usageCount: apiKeys.usageCount,
        rateLimit: apiKeys.rateLimit,
        active: apiKeys.active,
        expiresAt: apiKeys.expiresAt,
        createdAt: apiKeys.createdAt,
      })
      .from(apiKeys)
      .where(eq(apiKeys.userId, userId))
      .orderBy(desc(apiKeys.createdAt));
  }

  // Delete API key
  static async deleteApiKey(userId: string, keyId: string) {
    const [deleted] = await db
      .delete(apiKeys)
      .where(and(
        eq(apiKeys.userId, userId),
        eq(apiKeys.keyId, keyId)
      ))
      .returning({ id: apiKeys.id });

    return !!deleted;
  }

  // Toggle API key status
  static async toggleApiKey(userId: string, keyId: string, active: boolean) {
    const [updated] = await db
      .update(apiKeys)
      .set({ active, updatedAt: new Date() })
      .where(and(
        eq(apiKeys.userId, userId),
        eq(apiKeys.keyId, keyId)
      ))
      .returning({ id: apiKeys.id });

    return !!updated;
  }
}

export class WebhookService {
  // Create webhook endpoint
  static async createWebhook(userId: string, url: string, events: string[] = ['audit.completed', 'audit.failed']) {
    const secret = crypto.randomBytes(32).toString('hex');
    
    const [webhook] = await db
      .insert(webhooks)
      .values({
        userId,
        url,
        secret,
        events,
      })
      .returning();

    return webhook;
  }

  // Get user webhooks
  static async getUserWebhooks(userId: string) {
    return await db
      .select()
      .from(webhooks)
      .where(eq(webhooks.userId, userId))
      .orderBy(desc(webhooks.createdAt));
  }

  // Update webhook
  static async updateWebhook(userId: string, webhookId: string, updates: { url?: string; events?: string[]; active?: boolean; retryCount?: number; timeoutSeconds?: number }) {
    const [updated] = await db
      .update(webhooks)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(
        eq(webhooks.id, webhookId),
        eq(webhooks.userId, userId)
      ))
      .returning();

    return updated;
  }

  // Delete webhook
  static async deleteWebhook(userId: string, webhookId: string) {
    const [deleted] = await db
      .delete(webhooks)
      .where(and(
        eq(webhooks.id, webhookId),
        eq(webhooks.userId, userId)
      ))
      .returning({ id: webhooks.id });

    return !!deleted;
  }

  // Send webhook notification
  static async sendWebhook(eventType: string, payload: any, userId?: string) {
    // Get webhooks subscribed to this event
    const relevantWebhooks = await db
      .select()
      .from(webhooks)
      .where(and(
        eq(webhooks.active, true),
        sql`${webhooks.events} @> ${JSON.stringify([eventType])}`,
        userId ? eq(webhooks.userId, userId) : sql`true`
      ));

    const promises = relevantWebhooks.map(webhook => 
      this.deliverWebhook(webhook, eventType, payload)
    );

    await Promise.allSettled(promises);
  }

  // Deliver individual webhook with retry logic
  static async deliverWebhook(webhook: any, eventType: string, payload: any, attemptNumber: number = 1) {
    const signature = this.generateSignature(webhook.secret, payload);
    
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SmartAudit-Signature': signature,
          'X-SmartAudit-Event': eventType,
          'User-Agent': 'SmartAudit-Webhook/1.0',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(webhook.timeoutSeconds * 1000),
      });

      const responseBody = await response.text();
      const success = response.ok;

      // Log delivery
      await db.insert(webhookDeliveries).values({
        webhookId: webhook.id,
        eventType,
        payload,
        httpStatus: response.status,
        responseBody: responseBody.slice(0, 1000), // Limit response body size
        responseHeaders: Object.fromEntries(response.headers.entries()),
        attemptNumber,
        success,
        deliveredAt: success ? new Date() : undefined,
        errorMessage: success ? undefined : `HTTP ${response.status}: ${responseBody}`,
      });

      // Update webhook stats
      if (success) {
        await db
          .update(webhooks)
          .set({ 
            successCount: sql`${webhooks.successCount} + 1`,
            lastTriggered: new Date()
          })
          .where(eq(webhooks.id, webhook.id));
      } else {
        await db
          .update(webhooks)
          .set({ failureCount: sql`${webhooks.failureCount} + 1` })
          .where(eq(webhooks.id, webhook.id));

        // Retry if not exceeded max attempts
        if (attemptNumber < webhook.retryCount) {
          setTimeout(() => {
            this.deliverWebhook(webhook, eventType, payload, attemptNumber + 1);
          }, Math.pow(2, attemptNumber) * 1000); // Exponential backoff
        }
      }

    } catch (error: any) {
      // Log failed delivery
      await db.insert(webhookDeliveries).values({
        webhookId: webhook.id,
        eventType,
        payload,
        attemptNumber,
        success: false,
        errorMessage: error.message,
      });

      await db
        .update(webhooks)
        .set({ failureCount: sql`${webhooks.failureCount} + 1` })
        .where(eq(webhooks.id, webhook.id));

      // Retry if not exceeded max attempts
      if (attemptNumber < webhook.retryCount) {
        setTimeout(() => {
          this.deliverWebhook(webhook, eventType, payload, attemptNumber + 1);
        }, Math.pow(2, attemptNumber) * 1000);
      }
    }
  }

  // Generate HMAC signature for webhook verification
  static generateSignature(secret: string, payload: any): string {
    const body = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body);
    return `sha256=${hmac.digest('hex')}`;
  }

  // Verify webhook signature
  static verifySignature(secret: string, payload: any, signature: string): boolean {
    const expectedSignature = this.generateSignature(secret, payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // Get webhook delivery logs
  static async getWebhookDeliveries(webhookId: string, limit: number = 50) {
    return await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.webhookId, webhookId))
      .orderBy(desc(webhookDeliveries.createdAt))
      .limit(limit);
  }
}