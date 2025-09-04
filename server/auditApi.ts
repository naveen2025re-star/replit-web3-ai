import { Request, Response, NextFunction } from "express";
import { ApiService, WebhookService } from "./apiService";
import { db } from "./db";
import { auditSessions, auditResults, users } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

// Request validation schemas
export const createAuditSchema = z.object({
  contractCode: z.string().min(10, "Contract code must be at least 10 characters"),
  contractLanguage: z.string().default("solidity"),
  publicTitle: z.string().optional(),
  publicDescription: z.string().optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

export const batchAuditSchema = z.object({
  contracts: z.array(z.object({
    contractCode: z.string().min(10),
    contractLanguage: z.string().default("solidity"),
    identifier: z.string(), // User-provided identifier for tracking
  })).min(1).max(10), // Limit batch size
  publicTitle: z.string().optional(),
  publicDescription: z.string().optional(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

// Rate limiting cache
const rateLimitCache = new Map<string, { count: number; resetTime: number }>();

// Middleware for API key authentication
export const authenticateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'API key required. Use: Authorization: Bearer your_api_key' 
    });
  }

  const apiKey = authHeader.substring(7);
  
  try {
    const keyInfo = await ApiService.verifyApiKey(apiKey);
    
    if (!keyInfo) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid or expired API key' 
      });
    }

    // Check rate limit
    const keyId = apiKey.split('.')[0];
    const now = Date.now();
    const windowMs = 60 * 60 * 1000; // 1 hour
    
    let rateLimitInfo = rateLimitCache.get(keyId);
    if (!rateLimitInfo || now > rateLimitInfo.resetTime) {
      rateLimitInfo = { count: 0, resetTime: now + windowMs };
      rateLimitCache.set(keyId, rateLimitInfo);
    }
    
    if (rateLimitInfo.count >= keyInfo.rateLimit) {
      return res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: `Rate limit of ${keyInfo.rateLimit} requests per hour exceeded`,
        retryAfter: Math.ceil((rateLimitInfo.resetTime - now) / 1000),
      });
    }
    
    rateLimitInfo.count++;

    // Add user info to request
    (req as any).apiUser = {
      userId: keyInfo.userId,
      permissions: keyInfo.permissions,
      rateLimit: keyInfo.rateLimit,
    };
    
    next();
  } catch (error) {
    console.error('API authentication error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: 'Authentication failed' 
    });
  }
};

// Middleware to check specific permissions
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiUser = (req as any).apiUser;
    
    if (!apiUser || !apiUser.permissions.includes(permission)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Permission '${permission}' required`,
      });
    }
    
    next();
  };
};

// Create audit endpoint
export const createAudit = async (req: Request, res: Response) => {
  try {
    const apiUser = (req as any).apiUser;
    const validatedData = createAuditSchema.parse(req.body);
    
    // Generate session key
    const sessionKey = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate credits needed (simplified calculation)
    const codeLength = validatedData.contractCode.length;
    const complexity = Math.min(Math.ceil(codeLength / 1000), 10); // 1-10 scale
    const creditsNeeded = complexity * 10; // 10 credits per complexity point
    
    // Check user credits
    const [user] = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, apiUser.userId));
    
    if (!user || user.credits < creditsNeeded) {
      return res.status(402).json({
        error: 'Insufficient Credits',
        message: `This audit requires ${creditsNeeded} credits. Current balance: ${user?.credits || 0}`,
        creditsNeeded,
        currentBalance: user?.credits || 0,
      });
    }
    
    // Create audit session
    const [auditSession] = await db
      .insert(auditSessions)
      .values({
        userId: apiUser.userId,
        sessionKey,
        contractCode: validatedData.contractCode,
        contractLanguage: validatedData.contractLanguage,
        contractSource: 'api',
        isPublic: validatedData.isPublic,
        publicTitle: validatedData.publicTitle,
        publicDescription: validatedData.publicDescription,
        tags: validatedData.tags,
        creditsUsed: creditsNeeded,
        codeComplexity: complexity,
        status: 'pending',
      })
      .returning();
    
    // Deduct credits
    await db
      .update(users)
      .set({ 
        credits: user.credits - creditsNeeded,
        totalCreditsUsed: user.credits - creditsNeeded,
      })
      .where(eq(users.id, apiUser.userId));
    
    // Start audit processing (async)
    processAudit(auditSession.id, sessionKey, validatedData.contractCode)
      .catch(error => console.error('Audit processing error:', error));
    
    // Send webhook notification
    await WebhookService.sendWebhook('audit.started', {
      auditId: auditSession.id,
      sessionKey,
      contractLanguage: validatedData.contractLanguage,
      creditsUsed: creditsNeeded,
      timestamp: new Date().toISOString(),
    }, apiUser.userId);
    
    res.status(201).json({
      success: true,
      audit: {
        id: auditSession.id,
        sessionKey,
        status: 'pending',
        creditsUsed: creditsNeeded,
        estimatedCompletionTime: '2-5 minutes',
        createdAt: auditSession.createdAt,
      },
    });
    
  } catch (error: any) {
    console.error('Create audit error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.errors,
      });
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create audit',
    });
  }
};

// Get audit result endpoint
export const getAudit = async (req: Request, res: Response) => {
  try {
    const apiUser = (req as any).apiUser;
    const { auditId } = req.params;
    
    // Get audit session with results
    const [audit] = await db
      .select({
        id: auditSessions.id,
        sessionKey: auditSessions.sessionKey,
        status: auditSessions.status,
        contractLanguage: auditSessions.contractLanguage,
        contractSource: auditSessions.contractSource,
        isPublic: auditSessions.isPublic,
        publicTitle: auditSessions.publicTitle,
        publicDescription: auditSessions.publicDescription,
        tags: auditSessions.tags,
        creditsUsed: auditSessions.creditsUsed,
        codeComplexity: auditSessions.codeComplexity,
        createdAt: auditSessions.createdAt,
        completedAt: auditSessions.completedAt,
        // Results
        formattedReport: auditResults.formattedReport,
        vulnerabilityCount: auditResults.vulnerabilityCount,
        securityScore: auditResults.securityScore,
      })
      .from(auditSessions)
      .leftJoin(auditResults, eq(auditResults.sessionId, auditSessions.id))
      .where(and(
        eq(auditSessions.id, auditId),
        eq(auditSessions.userId, apiUser.userId)
      ));
    
    if (!audit) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Audit not found or access denied',
      });
    }
    
    res.json({
      success: true,
      audit,
    });
    
  } catch (error) {
    console.error('Get audit error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to retrieve audit',
    });
  }
};

// Batch audit endpoint
export const createBatchAudit = async (req: Request, res: Response) => {
  try {
    const apiUser = (req as any).apiUser;
    const validatedData = batchAuditSchema.parse(req.body);
    
    const auditPromises = validatedData.contracts.map(async (contract, index) => {
      const sessionKey = `batch_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
      const complexity = Math.min(Math.ceil(contract.contractCode.length / 1000), 10);
      const creditsNeeded = complexity * 10;
      
      const [auditSession] = await db
        .insert(auditSessions)
        .values({
          userId: apiUser.userId,
          sessionKey,
          contractCode: contract.contractCode,
          contractLanguage: contract.contractLanguage,
          contractSource: 'api_batch',
          isPublic: validatedData.isPublic,
          publicTitle: validatedData.publicTitle,
          publicDescription: validatedData.publicDescription,
          tags: validatedData.tags,
          creditsUsed: creditsNeeded,
          codeComplexity: complexity,
          status: 'pending',
        })
        .returning();
      
      // Start processing
      processAudit(auditSession.id, sessionKey, contract.contractCode)
        .catch(error => console.error(`Batch audit ${index} error:`, error));
      
      return {
        id: auditSession.id,
        identifier: contract.identifier,
        sessionKey,
        status: 'pending',
        creditsUsed: creditsNeeded,
        createdAt: auditSession.createdAt,
      };
    });
    
    const audits = await Promise.all(auditPromises);
    const totalCredits = audits.reduce((sum, audit) => sum + audit.creditsUsed, 0);
    
    // Check and deduct total credits
    const [user] = await db
      .select({ credits: users.credits })
      .from(users)
      .where(eq(users.id, apiUser.userId));
    
    if (!user || user.credits < totalCredits) {
      return res.status(402).json({
        error: 'Insufficient Credits',
        message: `Batch audit requires ${totalCredits} credits. Current balance: ${user?.credits || 0}`,
        creditsNeeded: totalCredits,
        currentBalance: user?.credits || 0,
      });
    }
    
    await db
      .update(users)
      .set({ 
        credits: user.credits - totalCredits,
        totalCreditsUsed: user.credits - totalCredits,
      })
      .where(eq(users.id, apiUser.userId));
    
    // Send webhook notification
    await WebhookService.sendWebhook('batch_audit.started', {
      batchSize: audits.length,
      totalCreditsUsed: totalCredits,
      audits: audits.map(a => ({ id: a.id, identifier: a.identifier })),
      timestamp: new Date().toISOString(),
    }, apiUser.userId);
    
    res.status(201).json({
      success: true,
      batch: {
        audits,
        totalCredits,
        estimatedCompletionTime: '5-15 minutes',
      },
    });
    
  } catch (error: any) {
    console.error('Batch audit error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.errors,
      });
    }
    
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create batch audit',
    });
  }
};

// List user's audits endpoint
export const listAudits = async (req: Request, res: Response) => {
  try {
    const apiUser = (req as any).apiUser;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    
    const audits = await db
      .select({
        id: auditSessions.id,
        sessionKey: auditSessions.sessionKey,
        status: auditSessions.status,
        contractLanguage: auditSessions.contractLanguage,
        contractSource: auditSessions.contractSource,
        creditsUsed: auditSessions.creditsUsed,
        codeComplexity: auditSessions.codeComplexity,
        createdAt: auditSessions.createdAt,
        completedAt: auditSessions.completedAt,
        vulnerabilityCount: auditResults.vulnerabilityCount,
        securityScore: auditResults.securityScore,
      })
      .from(auditSessions)
      .leftJoin(auditResults, eq(auditResults.sessionId, auditSessions.id))
      .where(eq(auditSessions.userId, apiUser.userId))
      .orderBy(desc(auditSessions.createdAt))
      .limit(limit)
      .offset(offset);
    
    res.json({
      success: true,
      audits,
      pagination: {
        page,
        limit,
        hasMore: audits.length === limit,
      },
    });
    
  } catch (error) {
    console.error('List audits error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to list audits',
    });
  }
};

// Real AI audit processing using Shipable AI integration
export async function processAuditStreaming(auditId: string, sessionKey: string, contractCode: string, res: any) {
  try {
    console.log(`[PROCESS_AUDIT_STREAMING] Starting streaming audit for ${auditId}`);
    
    // Update session status to analyzing
    await db
      .update(auditSessions)
      .set({ status: 'analyzing' })
      .where(eq(auditSessions.id, auditId));

    res.write(`data: ${JSON.stringify({ type: 'status', status: 'analyzing' })}\n\n`);

    // Call Shipable AI analysis endpoint with streaming
    const SHIPABLE_API_BASE = "https://api.shipable.ai/v2";
    const formData = new FormData();
    const requestPayload = {
      sessionKey: sessionKey,
      messages: [{
        role: "user",
        content: `Please perform a comprehensive security audit of this smart contract code. Analyze for vulnerabilities, security issues, gas optimization opportunities, and best practices. Provide a detailed report with severity levels and recommendations.\n\n${contractCode}`
      }],
      token: process.env.SHIPABLE_JWT_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcm9qZWN0SWQiOjQxMjcsImlhdCI6MTc1NTgzNTc0Mn0.D5xqjLJIm4BVUgx0UxtrzpaOtKur8r8rDX-YNIOM5UE",
      stream: true
    };
    
    formData.append("request", JSON.stringify(requestPayload));

    const analysisResponse = await fetch(`${SHIPABLE_API_BASE}/chat/open-playground`, {
      method: "POST",
      body: formData
    });

    if (!analysisResponse.ok) {
      throw new Error(`Analysis failed: ${analysisResponse.statusText}`);
    }

    let fullResponse = "";
    const reader = analysisResponse.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          console.log(`[PROCESS_AUDIT_STREAMING] Received chunk:`, chunk);
          const lines = chunk.split('\n');

          for (const line of lines) {
            console.log(`[PROCESS_AUDIT_STREAMING] Processing line:`, line);
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              if (data.trim() && data !== '[DONE]') {
                console.log(`[PROCESS_AUDIT_STREAMING] Raw data:`, data);
                try {
                  // Parse the JSON chunk to extract body text
                  const parsed = JSON.parse(data);
                  console.log(`[PROCESS_AUDIT_STREAMING] Parsed data:`, parsed);
                  if (parsed.body) {
                    fullResponse += parsed.body;
                    // Stream clean text to VS Code
                    const chunkMessage = { type: 'chunk', data: parsed.body };
                    console.log(`[PROCESS_AUDIT_STREAMING] Sending chunk to VS Code:`, chunkMessage);
                    res.write(`data: ${JSON.stringify(chunkMessage)}\n\n`);
                  } else {
                    // Fallback for non-JSON data
                    fullResponse += data;
                    const chunkMessage = { type: 'chunk', data: data };
                    console.log(`[PROCESS_AUDIT_STREAMING] Sending raw data to VS Code:`, chunkMessage);
                    res.write(`data: ${JSON.stringify(chunkMessage)}\n\n`);
                  }
                } catch (parseError) {
                  console.log(`[PROCESS_AUDIT_STREAMING] Parse error:`, parseError);
                  // Fallback for non-JSON data
                  fullResponse += data;
                  const chunkMessage = { type: 'chunk', data: data };
                  console.log(`[PROCESS_AUDIT_STREAMING] Sending fallback data to VS Code:`, chunkMessage);
                  res.write(`data: ${JSON.stringify(chunkMessage)}\n\n`);
                }
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }

    console.log(`[PROCESS_AUDIT_STREAMING] Full response length:`, fullResponse.length);
    console.log(`[PROCESS_AUDIT_STREAMING] Full response sample:`, fullResponse.substring(0, 500));

    // Save results to database
    const auditResult = await (await import('./storage')).storage.createAuditResult({
      sessionId: auditId,
      rawResponse: fullResponse,
      formattedReport: fullResponse,
      vulnerabilityCount: null,
      securityScore: null
    });

    // Update session status
    await db
      .update(auditSessions)
      .set({ 
        status: 'completed',
        completedAt: new Date()
      })
      .where(eq(auditSessions.id, auditId));

    const completeMessage = { type: 'analysis_complete', result: auditResult };
    console.log(`[PROCESS_AUDIT_STREAMING] Sending completion message:`, completeMessage);
    res.write(`data: ${JSON.stringify(completeMessage)}\n\n`);

  } catch (error: any) {
    console.error(`[PROCESS_AUDIT_STREAMING] Error:`, error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    
    // Mark as failed
    await db
      .update(auditSessions)
      .set({ status: 'failed' })
      .where(eq(auditSessions.id, auditId));
  }
}

export async function processAudit(auditId: string, sessionKey: string, contractCode: string) {
  console.log(`[PROCESS_AUDIT] Starting real AI analysis for audit ${auditId}`);
  
  try {
    // Update status to analyzing
    await db
      .update(auditSessions)
      .set({ status: 'analyzing' })
      .where(eq(auditSessions.id, auditId));

    console.log(`[PROCESS_AUDIT] Calling Shipable AI API for session ${sessionKey}`);
    
    // Create FormData for the request (same as manual upload)
    const formData = new FormData();
    const requestPayload = {
      sessionKey: sessionKey,
      messages: [{
        role: "user",
        content: `Please perform a comprehensive security audit of this smart contract code. Analyze for vulnerabilities, security issues, gas optimization opportunities, and best practices. Provide a detailed report with severity levels and recommendations.\n\n${contractCode}`
      }],
      token: process.env.SHIPABLE_JWT_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcm9qZWN0SWQiOjQxMjcsImlhdCI6MTc1NTgzNTc0Mn0.D5xqjLJIm4BVUgx0UxtrzpaOtKur8r8rDX-YNIOM5UE",
      stream: true
    };
    
    formData.append("request", JSON.stringify(requestPayload));

    // Call Shipable AI analysis endpoint (same as manual upload)
    const SHIPABLE_API_BASE = "https://api.shipable.ai/v2";
    const analysisResponse = await fetch(`${SHIPABLE_API_BASE}/chat/open-playground`, {
      method: "POST",
      body: formData
    });

    console.log(`[PROCESS_AUDIT] Shipable API response status: ${analysisResponse.status}`);
    
    if (!analysisResponse.ok) {
      const errorText = await analysisResponse.text();
      console.error(`[PROCESS_AUDIT] Shipable API Error: ${errorText}`);
      throw new Error(`Analysis failed: ${analysisResponse.statusText}`);
    }

    let fullResponse = "";
    let lastActivity = Date.now();
    const TIMEOUT_MS = 300000; // 5 minutes timeout
    
    const reader = analysisResponse.body?.getReader();
    const decoder = new TextDecoder();

    if (reader) {
      try {
        while (true) {
          // Check for timeout
          if (Date.now() - lastActivity > TIMEOUT_MS) {
            console.log(`[PROCESS_AUDIT] Timeout reached for audit ${auditId}`);
            break;
          }

          const { done, value } = await reader.read();
          if (done) {
            console.log(`[PROCESS_AUDIT] Stream ended naturally for audit ${auditId}`);
            break;
          }

          lastActivity = Date.now(); // Reset timeout on activity
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('event: processing')) {
              console.log(`[PROCESS_AUDIT] Processing event`);
              continue;
            }
            
            if (line.startsWith('event: content')) {
              continue;
            }
            
            if (line.startsWith('data: ')) {
              try {
                const jsonData = JSON.parse(line.slice(6));
                if (jsonData.body) {
                  fullResponse += jsonData.body;
                  console.log(`[PROCESS_AUDIT] Received chunk: ${jsonData.body.substring(0, 30)}...`);
                } else if (jsonData.status) {
                  console.log(`[PROCESS_AUDIT] Status: ${jsonData.status}`);
                  
                  // Check if analysis is complete based on status
                  if (jsonData.status === 'complete' || jsonData.status === 'completed') {
                    console.log(`[PROCESS_AUDIT] Analysis marked complete by status`);
                    break;
                  }
                }
              } catch (e) {
                console.log(`[PROCESS_AUDIT] Invalid JSON in line: ${line}`);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    }
    
    console.log(`[PROCESS_AUDIT] Analysis completed for audit ${auditId}. Response length: ${fullResponse.length}`);

    // Save the complete result
    await db.insert(auditResults).values({
      sessionId: auditId,
      formattedReport: fullResponse,
      rawResponse: fullResponse,
      vulnerabilityCount: null,
      securityScore: null,
    });
    
    // Update session status to completed
    await db
      .update(auditSessions)
      .set({ 
        status: 'completed',
        completedAt: new Date(),
      })
      .where(eq(auditSessions.id, auditId));
    
    // Get user ID for webhook
    const [session] = await db
      .select({ userId: auditSessions.userId })
      .from(auditSessions)
      .where(eq(auditSessions.id, auditId));
    
    if (session) {
      // Send webhook notification
      await WebhookService.sendWebhook('audit.completed', {
        auditId,
        sessionKey,
        status: 'completed',
        timestamp: new Date().toISOString(),
      }, session.userId);
    }
    
  } catch (error) {
    console.error(`[PROCESS_AUDIT] Failed for ${auditId}:`, error);
    
    // Mark as failed
    await db
      .update(auditSessions)
      .set({ 
        status: 'failed',
        completedAt: new Date(),
      })
      .where(eq(auditSessions.id, auditId));
    
    // Get user ID for webhook
    const [session] = await db
      .select({ userId: auditSessions.userId })
      .from(auditSessions)
      .where(eq(auditSessions.id, auditId));
    
    if (session) {
      // Send failure webhook
      await WebhookService.sendWebhook('audit.failed', {
        auditId,
        sessionKey,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }, session.userId);
    }
  }
}