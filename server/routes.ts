import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAuditSessionSchema, insertAuditResultSchema, insertUserSchema, updateAuditVisibilitySchema, creditTransactions, enterpriseContacts, insertEnterpriseContactSchema, liveScannedContracts, auditSessions } from "@shared/schema";
import { CreditService, type CreditCalculationFactors } from "./creditService";
import { BlockchainScanner } from "./blockchainScanner";
import { z } from "zod";
import * as crypto from "crypto";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";
import { db } from "./db";
import { eq, desc, and, isNull, sql, lte } from "drizzle-orm";

// Type definitions for global objects
interface GitHubConnection {
  accessToken: string;
  githubUserId: number;
  username: string;
  connectedAt: string;
}

declare global {
  var githubConnections: Map<string, GitHubConnection> | undefined;
  var cicdSetups: Map<string, any> | undefined;
  var gitHubWebhooks: Map<string, any> | undefined;
  var oauthStates: Map<string, { userId: string; timestamp: number }> | undefined;
}
// Simple authentication middleware for Web3 users
const isAuthenticated = (req: any, res: any, next: any) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ message: "Authentication required" });
  }
  req.user = { claims: { sub: userId } };
  next();
};

const SHIPABLE_API_BASE = "https://api.shipable.ai/v2";
const JWT_TOKEN = process.env.SHIPABLE_JWT_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcm9qZWN0SWQiOjQxMjcsImlhdCI6MTc1NTgzNTc0Mn0.D5xqjLJIm4BVUgx0UxtrzpaOtKur8r8rDX-YNIOM5UE";

// Helper function to generate secure nonce
function generateSecureNonce(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Helper function to recover address from signature (simplified version)
function recoverAddressFromSignature(message: string, signature: string): string {
  try {
    // This is a simplified implementation
    // In production, use ethers.js for proper signature verification
    return signature.slice(0, 42).toLowerCase(); // Mock implementation
  } catch (error) {
    console.error('Signature recovery failed:', error);
    throw new Error('Invalid signature');
  }
}

// Helper function to verify GitHub webhook signatures
function verifyWebhookSignature(payload: any, signature: string, secret: string): boolean {
  try {
    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return false;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Generate nonce for wallet authentication
  app.post("/api/auth/generate-nonce", async (req, res) => {
    try {
      const { walletAddress } = z.object({
        walletAddress: z.string()
      }).parse(req.body);

      // Clean up expired nonces first
      await storage.cleanupExpiredNonces();

      // Generate secure nonce
      const nonce = generateSecureNonce();
      const timestamp = Date.now();
      const expiresAt = new Date(timestamp + 5 * 60 * 1000); // 5 minutes
      
      // Create message with nonce
      const message = `Welcome to SmartAudit AI!

Please sign this message to authenticate your wallet and access your personalized audit dashboard.

Wallet: ${walletAddress.toLowerCase()}
Timestamp: ${timestamp}
Nonce: ${nonce}

This request will not trigger any blockchain transaction or cost any gas fees.`;

      // Store nonce in database
      await storage.createAuthNonce({
        walletAddress: walletAddress.toLowerCase(),
        nonce,
        message,
        expiresAt
      });

      res.json({ nonce, message, expiresAt });
    } catch (error) {
      console.error("Generate nonce failed:", error);
      res.status(500).json({ message: "Failed to generate nonce" });
    }
  });

  // Web3 Authentication with nonce verification  
  app.post("/api/auth/web3", async (req, res) => {
    try {
      const { walletAddress, signature, message } = z.object({
        walletAddress: z.string(),
        signature: z.string(),
        message: z.string()
      }).parse(req.body);

      // Extract nonce from message
      const nonceMatch = message.match(/Nonce: ([a-f0-9]+)/);
      if (!nonceMatch) {
        return res.status(400).json({ message: "Invalid message format - nonce not found" });
      }
      
      const nonce = nonceMatch[1];
      
      // Verify nonce exists and is valid
      const storedNonce = await storage.getAuthNonce(nonce);
      if (!storedNonce) {
        return res.status(400).json({ message: "Invalid or expired nonce" });
      }
      
      // Check if nonce is expired
      if (new Date() > storedNonce.expiresAt) {
        return res.status(400).json({ message: "Nonce has expired" });
      }
      
      // Verify message matches stored message
      if (message !== storedNonce.message) {
        return res.status(400).json({ message: "Message does not match stored nonce" });
      }
      
      // Verify wallet address matches
      if (walletAddress.toLowerCase() !== storedNonce.walletAddress) {
        return res.status(400).json({ message: "Wallet address mismatch" });
      }

      // Verify signature (simplified version - in production use ethers.js)
      try {
        const recoveredAddress = recoverAddressFromSignature(message, signature);
        // For now, skip strict verification and trust the client-side verification
        // TODO: Implement proper ECDSA signature verification
      } catch (error) {
        console.warn("Signature verification warning:", error);
      }
      
      // Mark nonce as used to prevent replay attacks
      await storage.markNonceAsUsed(nonce);

      // Check if user exists or create new one
      let user = await storage.getUserByWallet(walletAddress.toLowerCase());
      
      if (!user) {
        // Generate unique username
        const timestamp = Date.now().toString(36);
        const addressPart = walletAddress.slice(2, 10).toLowerCase();
        const username = `user_${addressPart}_${timestamp}`;
        
        user = await storage.createUser({
          walletAddress: walletAddress.toLowerCase(),
          username,
        });
      }

      res.json({
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          ensName: user.ensName,
          profileImageUrl: user.profileImageUrl,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error("Web3 auth failed:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Authentication failed" 
      });
    }
  });

  // Get authenticated user by address
  app.get("/api/auth/user/:address", async (req, res) => {
    const { address } = req.params;
    
    if (!address) {
      return res.status(400).json({ message: "No wallet address provided" });
    }

    try {
      const user = await storage.getUserByWallet(address.toLowerCase());
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        ensName: user.ensName,
        profileImageUrl: user.profileImageUrl,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error("Get user failed:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Update user profile
  app.patch("/api/auth/user/:address", async (req, res) => {
    try {
      const { address } = req.params;
      const { displayName } = req.body;

      // Get the user first
      const user = await storage.getUserByWallet(address.toLowerCase());
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate displayName
      if (displayName !== undefined && displayName !== null) {
        if (typeof displayName !== 'string') {
          return res.status(400).json({ message: "Display name must be a string" });
        }
        if (displayName.length > 50) {
          return res.status(400).json({ message: "Display name must be 50 characters or less" });
        }
      }

      const updatedUser = await storage.updateUser(user.id, { displayName });
      res.json({
        id: updatedUser.id,
        walletAddress: updatedUser.walletAddress,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        ensName: updatedUser.ensName,
        githubUsername: updatedUser.githubUsername,
        profileImageUrl: updatedUser.profileImageUrl,
        createdAt: updatedUser.createdAt
      });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user profile" });
    }
  });

  // Update user display name (simplified endpoint)
  app.patch("/api/user/display-name", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user.claims.sub;
      const { displayName } = z.object({
        displayName: z.string().max(50, "Display name must be 50 characters or less").optional()
      }).parse(req.body);

      if (!displayName || displayName.trim() === '') {
        return res.status(400).json({ message: "Display name cannot be empty" });
      }

      const updatedUser = await storage.updateUserDisplayName(userId, displayName.trim());
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: updatedUser.id,
        displayName: updatedUser.displayName,
        username: updatedUser.username,
        walletAddress: updatedUser.walletAddress,
        ensName: updatedUser.ensName,
        githubUsername: updatedUser.githubUsername,
        profileImageUrl: updatedUser.profileImageUrl
      });
    } catch (error) {
      console.error("Error updating display name:", error);
      res.status(500).json({ message: "Failed to update display name" });
    }
  });

  // Logout route - clear session and redirect to home
  app.get("/api/logout", (req: any, res) => {
    try {
      // If session exists, destroy it
      if (req.session && req.session.destroy) {
        req.session.destroy((err: any) => {
          if (err) {
            console.error("Error destroying session:", err);
          }
          // Clear the session cookie
          res.clearCookie('connect.sid');
          // Redirect to home page
          res.redirect('/');
        });
      } else {
        // No session to destroy, just redirect
        res.clearCookie('connect.sid');
        res.redirect('/');
      }
    } catch (error) {
      console.error("Logout error:", error);
      res.redirect('/');
    }
  });
  
  // Create new audit session
  app.post("/api/audit/sessions", async (req, res) => {
    try {
      const { contractCode, contractLanguage, userId, isPublic, title, description, tags } = z.object({
        contractCode: z.string().min(1),
        contractLanguage: z.string().default("solidity"),
        userId: z.string().optional(),
        isPublic: z.boolean().default(false),
        title: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).default([])
      }).parse(req.body);

      // Check credit requirements and plan restrictions for authenticated users
      if (userId) {
        // Check plan restrictions for private audits
        if (!isPublic) {
          const canCreatePrivate = await CreditService.canCreatePrivateAudits(userId);
          if (!canCreatePrivate) {
            return res.status(400).json({ 
              message: "Private audits require Pro or Pro+ plan",
              error: "plan_restriction",
              planRequired: "Pro"
            });
          }
        }

        const factors: CreditCalculationFactors = {
          codeLength: contractCode.length,
          complexity: Math.min(10, Math.max(1, Math.ceil(contractCode.length / 1000))),
          hasMultipleFiles: contractCode.includes("import") || contractCode.includes("pragma"),
          analysisType: "security",
          language: contractLanguage
        };

        const creditCheck = await CreditService.checkCreditsAndCalculateCost(userId, factors);
        if (!creditCheck.hasEnough) {
          return res.status(400).json({ 
            message: "Insufficient credits",
            needed: creditCheck.needed,
            current: creditCheck.current,
            cost: creditCheck.cost,
            error: "insufficient_credits"
          });
        }
      }

      // Step 1: Create session with Shipable AI
      const sessionResponse = await fetch(`${SHIPABLE_API_BASE}/chat/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: "website" })
      });

      if (!sessionResponse.ok) {
        throw new Error(`Failed to create session: ${sessionResponse.statusText}`);
      }

      const sessionData = await sessionResponse.json();
      const sessionKey = sessionData.data.key;

      // Step 2: Save to database
      const auditSession = await storage.createAuditSession({
        sessionKey,
        contractCode,
        contractLanguage,
        userId,
        isPublic,
        publicTitle: title,
        publicDescription: description,
        tags,
      });

      res.json({
        sessionId: auditSession.id,
        sessionKey: auditSession.sessionKey,
        status: auditSession.status
      });

    } catch (error) {
      console.error("Failed to create audit session:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create audit session" 
      });
    }
  });

  // Start contract analysis
  app.get("/api/audit/analyze/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = await storage.getAuditSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Deduct credits for authenticated users at the start of analysis
      if (session.userId) {
        const factors: CreditCalculationFactors = {
          codeLength: session.contractCode.length,
          complexity: Math.min(10, Math.max(1, Math.ceil(session.contractCode.length / 1000))),
          hasMultipleFiles: session.contractCode.includes("import") || session.contractCode.includes("pragma"),
          analysisType: "security",
          language: session.contractLanguage
        };

        const deductionResult = await CreditService.deductCreditsForAudit(
          session.userId,
          sessionId,
          factors
        );

        if (!deductionResult.success) {
          return res.status(400).json({ 
            message: deductionResult.error || "Credit deduction failed",
            error: "credit_deduction_failed"
          });
        }

        console.log(`[CREDITS] Deducted ${deductionResult.creditsDeducted} credits for session ${sessionId}`);
      }

      // Update session status to analyzing
      await storage.updateAuditSessionStatus(sessionId, "analyzing");

      // Set headers for SSE
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control"
      });

      console.log(`[ANALYSIS] Starting analysis for session ${sessionId}`);
      console.log(`[ANALYSIS] Session key: ${session.sessionKey}`);
      console.log(`[ANALYSIS] Contract language: ${session.contractLanguage}`);
      
      // Create FormData for the request
      const formData = new FormData();
      const requestPayload = {
        sessionKey: session.sessionKey,
        messages: [{
          role: "user",
          content: `Please perform a comprehensive security audit of this smart contract code. Analyze for vulnerabilities, security issues, gas optimization opportunities, and best practices. Provide a detailed report with severity levels and recommendations.\n\n${session.contractCode}`
        }],
        token: JWT_TOKEN,
        stream: true
      };
      
      formData.append("request", JSON.stringify(requestPayload));
      console.log(`[ANALYSIS] Request payload prepared`);

      // Call Shipable AI analysis endpoint
      console.log(`[ANALYSIS] Calling Shipable API...`);
      const analysisResponse = await fetch(`${SHIPABLE_API_BASE}/chat/open-playground`, {
        method: "POST",
        body: formData
      });

      console.log(`[ANALYSIS] API Response status: ${analysisResponse.status}`);
      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        console.error(`[ANALYSIS] API Error: ${errorText}`);
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
              console.log(`[STREAM] Timeout reached for session ${sessionId}`);
              break;
            }

            const { done, value } = await reader.read();
            if (done) {
              console.log(`[STREAM] Stream ended naturally for session ${sessionId}`);
              break;
            }

            lastActivity = Date.now(); // Reset timeout on activity
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('event: processing')) {
                console.log(`[STREAM] Processing event`);
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
                    console.log(`[STREAM] Sending chunk: ${jsonData.body.substring(0, 50)}...`);
                    
                    // Send to client
                    res.write(`event: content\n`);
                    res.write(`data: ${JSON.stringify({ body: jsonData.body })}\n\n`);
                  } else if (jsonData.status) {
                    console.log(`[STREAM] Status: ${jsonData.status}`);
                    res.write(`event: status\n`);
                    res.write(`data: ${JSON.stringify(jsonData)}\n\n`);
                    
                    // Check if analysis is complete based on status
                    if (jsonData.status === 'complete' || jsonData.status === 'completed') {
                      console.log(`[STREAM] Analysis marked complete by status`);
                      break;
                    }
                  }
                } catch (e) {
                  console.log(`[STREAM] Invalid JSON in line: ${line}`);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
      
      console.log(`[ANALYSIS] Stream processing completed for session ${sessionId}`);

      // Analysis complete
      await storage.updateAuditSessionStatus(sessionId, "completed", new Date());
      
      // Save the complete result
      await storage.createAuditResult({
        sessionId,
        rawResponse: fullResponse,
        formattedReport: fullResponse,
        vulnerabilityCount: null,
        securityScore: null
      });

      res.write(`event: complete\n`);
      res.write(`data: ${JSON.stringify({ status: "completed" })}\n\n`);
      res.end();

    } catch (error) {
      console.error("Analysis failed:", error);
      
      // Update session status to failed
      const { sessionId } = req.params;
      await storage.updateAuditSessionStatus(sessionId, "failed");
      
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ 
        message: error instanceof Error ? error.message : "Analysis failed" 
      })}\n\n`);
      res.end();
    }
  });

  // Get audit result
  app.get("/api/audit/results/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = await storage.getAuditSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const result = await storage.getAuditResultBySessionId(sessionId);
      
      res.json({
        session,
        result
      });

    } catch (error) {
      console.error("Failed to get audit result:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to get audit result" 
      });
    }
  });

  // Get recent audit sessions
  app.get("/api/audit/sessions", async (req, res) => {
    try {
      const sessions = await storage.getRecentAuditSessions(20);
      res.json(sessions);
    } catch (error) {
      console.error("Failed to get audit sessions:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to get audit sessions" 
      });
    }
  });

  // Get user audit sessions with search and filtering
  app.get("/api/audit/user-sessions/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { 
        search, 
        status, 
        visibility, 
        language, 
        dateFrom, 
        dateTo, 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        page = '1',
        pageSize = '50'
      } = req.query;

      const sessions = await storage.getUserAuditSessions(userId, parseInt(pageSize as string), {
        search: search as string,
        status: status as string,
        visibility: visibility as string,
        language: language as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        page: parseInt(page as string)
      });
      
      res.json({ sessions, total: sessions.length });
    } catch (error) {
      console.error("Failed to get user audit sessions:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to get user audit sessions" 
      });
    }
  });

  // File upload for smart contracts
  app.post("/api/contracts/upload", async (req, res) => {
    try {
      const { files } = z.object({
        files: z.array(z.object({
          name: z.string(),
          content: z.string(),
          size: z.number()
        }))
      }).parse(req.body);

      if (files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      // Combine all file contents
      const combinedContent = files.map(file => 
        `// File: ${file.name}\n${file.content}`
      ).join('\n\n');

      // Detect contract language from file extensions
      const extensions = files.map(f => f.name.split('.').pop()?.toLowerCase());
      let contractLanguage = 'solidity'; // default
      
      if (extensions.includes('rs')) contractLanguage = 'rust';
      else if (extensions.includes('go')) contractLanguage = 'go';
      else if (extensions.includes('js') || extensions.includes('ts')) contractLanguage = 'javascript';
      else if (extensions.includes('py')) contractLanguage = 'python';
      else if (extensions.includes('sol')) contractLanguage = 'solidity';
      else if (extensions.includes('vy')) contractLanguage = 'vyper';

      res.json({
        combinedContent,
        contractLanguage,
        fileCount: files.length,
        totalSize: files.reduce((sum, f) => sum + f.size, 0)
      });
    } catch (error) {
      console.error("File upload failed:", error);
      res.status(500).json({ message: "Failed to process uploaded files" });
    }
  });

  // Community API endpoints
  
  // Get all public audits for community page
  app.get("/api/community/audits", async (req, res) => {
    try {
      const { page = "1", limit = "20", tags, search } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;
      
      const publicAudits = await storage.getPublicAudits({
        offset,
        limit: limitNum,
        tags: tags as string,
        search: search as string
      });
      
      res.json(publicAudits);
    } catch (error) {
      console.error("Failed to get public audits:", error);
      res.status(500).json({ message: "Failed to fetch public audits" });
    }
  });

  // Get detailed public audit by ID
  app.get("/api/community/audits/:auditId", async (req, res) => {
    try {
      const { auditId } = req.params;
      
      const audit = await storage.getPublicAuditById(auditId);
      
      if (!audit) {
        return res.status(404).json({ message: "Public audit not found" });
      }
      
      res.json(audit);
    } catch (error) {
      console.error("Failed to get public audit:", error);
      res.status(500).json({ message: "Failed to fetch public audit" });
    }
  });

  // Update audit visibility (make public/private)
  app.patch("/api/audits/:auditId/visibility", async (req, res) => {
    try {
      const { auditId } = req.params;
      const updateData = updateAuditVisibilitySchema.parse(req.body);
      
      // Get the audit to verify ownership
      const audit = await storage.getAuditSession(auditId);
      if (!audit) {
        return res.status(404).json({ message: "Audit not found" });
      }

      // Verify user owns this audit (in a real app, check session/auth)
      // For now, we'll allow any update for demo purposes
      
      await storage.updateAuditVisibility(auditId, updateData);
      
      res.json({ message: "Audit visibility updated successfully" });
    } catch (error) {
      console.error("Failed to update audit visibility:", error);
      res.status(500).json({ message: "Failed to update audit visibility" });
    }
  });

  // Get trending tags for community filters
  app.get("/api/community/trending-tags", async (req, res) => {
    try {
      const trendingTags = await storage.getTrendingTags();
      res.json(trendingTags);
    } catch (error) {
      console.error("Failed to get trending tags:", error);
      res.status(500).json({ message: "Failed to fetch trending tags" });
    }
  });

  // Live scanning endpoints
  app.get("/api/live-scans", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const liveScans = await BlockchainScanner.getRecentLiveScans(limit);
      res.json(liveScans);
    } catch (error) {
      console.error("Failed to get live scans:", error);
      res.status(500).json({ message: "Failed to fetch live scans" });
    }
  });

  app.post("/api/live-scans/trigger", async (req, res) => {
    try {
      const result = await BlockchainScanner.scanRandomContract();
      if (result) {
        res.json({ message: "Live scan initiated successfully", success: true });
      } else {
        res.status(400).json({ message: "Could not initiate live scan", success: false });
      }
    } catch (error) {
      console.error("Failed to trigger live scan:", error);
      res.status(500).json({ message: "Failed to trigger live scan" });
    }
  });

  // Manual contract fetching by address
  app.post("/api/fetch-contract", isAuthenticated, async (req, res) => {
    try {
      const { contractAddress, network } = z.object({
        contractAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid contract address"),
        network: z.string().optional().default("ethereum")
      }).parse(req.body);

      // Fetch contract data from blockchain explorer
      const contractData = await BlockchainScanner.fetchContractFromExplorer(contractAddress, network);
      
      if (!contractData) {
        return res.status(404).json({ message: "Contract not found or not verified" });
      }

      // Create audit session with the fetched contract
      const sessionId = await BlockchainScanner.createAuditSession(contractData);
      
      if (!sessionId) {
        return res.status(500).json({ message: "Failed to create audit session" });
      }

      res.json({ 
        message: "Contract fetched successfully",
        sessionId,
        contractData: {
          name: contractData.name,
          address: contractData.address,
          network: contractData.network,
          compiler: contractData.compiler,
          sourceCode: contractData.sourceCode
        }
      });
    } catch (error) {
      console.error("Contract fetch error:", error);
      res.status(500).json({ message: "Failed to fetch contract" });
    }
  });

  // Recovery endpoint to fix stuck analyses
  app.post("/api/live-scans/recover", async (req, res) => {
    try {
      // Find sessions stuck in analyzing state for more than 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const stuckSessions = await db
        .select()
        .from(auditSessions)
        .where(
          and(
            eq(auditSessions.contractSource, "live-scan"),
            eq(auditSessions.status, "analyzing"),
            lte(auditSessions.createdAt, tenMinutesAgo)
          )
        );

      console.log(`Found ${stuckSessions.length} stuck analyzing sessions`);

      let recovered = 0;
      for (const session of stuckSessions) {
        console.log(`Recovering stuck session: ${session.id}`);
        
        // Mark as failed if no response for 10+ minutes
        await storage.updateAuditSessionStatus(session.id, "failed");
        recovered++;
      }

      res.json({ 
        message: `Recovered ${recovered} stuck sessions`,
        recovered 
      });
    } catch (error) {
      console.error("Error recovering stuck sessions:", error);
      res.status(500).json({ message: "Failed to recover stuck sessions" });
    }
  });

  // Update audit title
  app.patch("/api/audit/session/:sessionId/title", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { title } = z.object({ title: z.string().min(1).max(100) }).parse(req.body);
      
      const auditSession = await storage.updateAuditTitle(sessionId, title);
      
      if (!auditSession) {
        return res.status(404).json({ message: "Audit session not found" });
      }
      
      res.json(auditSession);
    } catch (error) {
      console.error("Error updating audit title:", error);
      res.status(500).json({ message: "Failed to update audit title" });
    }
  });

  // Toggle audit pin status
  app.patch("/api/audit/session/:sessionId/pin", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { isPinned } = z.object({ isPinned: z.boolean() }).parse(req.body);
      
      const auditSession = await storage.updateAuditPinStatus(sessionId, isPinned);
      
      if (!auditSession) {
        return res.status(404).json({ message: "Audit session not found" });
      }
      
      res.json(auditSession);
    } catch (error) {
      console.error("Error updating audit pin status:", error);
      res.status(500).json({ message: "Failed to update audit pin status" });
    }
  });

  // Toggle audit archive status
  app.patch("/api/audit/session/:sessionId/archive", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { isArchived } = z.object({ isArchived: z.boolean() }).parse(req.body);
      
      const auditSession = await storage.updateAuditArchiveStatus(sessionId, isArchived);
      
      if (!auditSession) {
        return res.status(404).json({ message: "Audit session not found" });
      }
      
      res.json(auditSession);
    } catch (error) {
      console.error("Error updating audit archive status:", error);
      res.status(500).json({ message: "Failed to update audit archive status" });
    }
  });

  // Delete audit session
  app.delete("/api/audit/session/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const deleted = await storage.deleteAuditSession(sessionId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Audit session not found" });
      }
      
      res.json({ message: "Audit session deleted successfully" });
    } catch (error) {
      console.error("Error deleting audit session:", error);
      res.status(500).json({ message: "Failed to delete audit session" });
    }
  });

  // Get audit session details (for viewing in audit history)
  app.get("/api/audit/session/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = await storage.getAuditSessionDetails(sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Audit session not found" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error getting audit session details:", error);
      res.status(500).json({ message: "Failed to get audit session details" });
    }
  });

  // Credit system endpoints
  
  // Get user credit balance and transactions
  app.get("/api/credits/balance", async (req, res) => {
    try {
      // Get userId from query parameter for Web3 auth compatibility
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const credits = await CreditService.getUserCredits(userId);
      const planTier = await CreditService.getUserPlanTier(userId);
      const canCreatePrivate = await CreditService.canCreatePrivateAudits(userId);
      
      res.json({
        ...credits,
        planTier,
        canCreatePrivateAudits: canCreatePrivate
      });
    } catch (error) {
      console.error("Get credits balance failed:", error);
      res.status(500).json({ message: "Failed to fetch credits" });
    }
  });

  // Get available credit packages
  app.get("/api/credits/packages", async (req, res) => {
    try {
      const packages = await CreditService.getCreditPackages();
      res.json(packages);
    } catch (error) {
      console.error("Get credit packages failed:", error);
      res.status(500).json({ message: "Failed to fetch credit packages" });
    }
  });

  // Get user credit transactions/history
  app.get("/api/credits/transactions/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get transactions from database
      const transactions = await db
        .select()
        .from(creditTransactions)
        .where(eq(creditTransactions.userId, userId))
        .orderBy(desc(creditTransactions.createdAt))
        .limit(50);

      res.json(transactions);
    } catch (error) {
      console.error("Get credit transactions failed:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Calculate credits needed for an audit (preview)
  app.post("/api/credits/calculate", async (req, res) => {
    try {
      const { contractCode, language = "solidity", analysisType = "security", userId } = z.object({
        contractCode: z.string(),
        language: z.string().optional(),
        analysisType: z.enum(["security", "optimization", "full"]).optional(),
        userId: z.string()
      }).parse(req.body);

      const factors: CreditCalculationFactors = {
        codeLength: contractCode.length,
        complexity: Math.min(10, Math.max(1, Math.ceil(contractCode.length / 1000))), // Simple complexity estimate
        hasMultipleFiles: contractCode.includes("import") || contractCode.includes("pragma"),
        analysisType: analysisType as any,
        language
      };

      const calculation = await CreditService.checkCreditsAndCalculateCost(userId, factors);
      res.json(calculation);
    } catch (error) {
      console.error("Credit calculation failed:", error);
      res.status(500).json({ message: "Failed to calculate credits" });
    }
  });

  // PayPal Routes (following blueprint pattern)
  app.get("/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/paypal/order", async (req, res) => {
    // Request body should contain: { intent, amount, currency }
    await createPaypalOrder(req, res);
  });

  app.post("/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  // Keep legacy API routes for backward compatibility
  app.get("/api/paypal/setup", async (req, res) => {
    await loadPaypalDefault(req, res);
  });

  app.post("/api/paypal/order", async (req, res) => {
    await createPaypalOrder(req, res);
  });

  app.post("/api/paypal/order/:orderID/capture", async (req, res) => {
    await capturePaypalOrder(req, res);
  });

  // GitHub OAuth Routes
  app.get("/api/integrations/github/install", isAuthenticated, async (req, res) => {
    try {
      // Check if GitHub OAuth is properly configured
      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        return res.status(503).json({ 
          message: "GitHub OAuth integration is not configured yet",
          error: "GITHUB_OAUTH_NOT_CONFIGURED"
        });
      }
      
      const state = crypto.randomBytes(32).toString('hex');
      const userId = (req as any).user?.claims?.sub;
      
      // Store state in memory for verification (expires in 10 minutes)
      globalThis.oauthStates = globalThis.oauthStates || new Map();
      globalThis.oauthStates.set(state, {
        userId: userId,
        timestamp: Date.now()
      });
      
      // GitHub OAuth authorization URL
      const authUrl = new URL('https://github.com/login/oauth/authorize');
      authUrl.searchParams.set('client_id', clientId);
      // Force HTTPS for Replit environment - Replit always uses HTTPS for external requests
      const redirectUri = `https://${req.get('host')}/api/auth/github/callback`;
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', 'repo read:user user:email');
      authUrl.searchParams.set('state', state);
      
      res.json({ 
        installUrl: authUrl.toString(),
        message: "Click to connect your GitHub account"
      });
    } catch (error: any) {
      console.error("GitHub OAuth URL generation failed:", error);
      res.status(500).json({ message: "Failed to generate OAuth URL" });
    }
  });

  app.get("/api/auth/github/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        return res.redirect(`https://${req.get('host')}/integrations?github=error&reason=${error}`);
      }
      
      // Initialize and clean up expired states
      globalThis.oauthStates = globalThis.oauthStates || new Map();
      const now = Date.now();
      const tenMinutes = 10 * 60 * 1000;
      
      // Clean up expired states (older than 10 minutes)
      Array.from(globalThis.oauthStates.entries()).forEach(([stateKey, stateData]) => {
        if (now - stateData.timestamp > tenMinutes) {
          globalThis.oauthStates!.delete(stateKey);
        }
      });
      
      // Verify state parameter
      const storedState = globalThis.oauthStates.get(state as string);
      if (!storedState) {
        return res.redirect(`https://${req.get('host')}/integrations?github=error&reason=invalid_state`);
      }
      
      const userId = storedState.userId;
      
      // Clean up used state
      globalThis.oauthStates.delete(state as string);
      
      if (code && userId) {
        try {
          // Exchange code for access token
          const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              client_id: process.env.GITHUB_CLIENT_ID,
              client_secret: process.env.GITHUB_CLIENT_SECRET,
              code: code,
            }),
          });
          
          const tokenData = await tokenResponse.json();
          
          if (tokenData.access_token) {
            // Get user info from GitHub
            const userResponse = await fetch('https://api.github.com/user', {
              headers: {
                'Authorization': `Bearer ${tokenData.access_token}`,
                'User-Agent': 'SmartAudit-AI',
              },
            });
            
            const githubUser = await userResponse.json();
            
            // Store GitHub connection in memory (in production, use database)
            globalThis.githubConnections = globalThis.githubConnections || new Map();
            globalThis.githubConnections.set(userId, {
              accessToken: tokenData.access_token,
              githubUserId: githubUser.id,
              username: githubUser.login,
              connectedAt: new Date().toISOString()
            });
            
            res.redirect(`https://${req.get('host')}/integrations?github=connected`);
          } else {
            console.error("Failed to get access token:", tokenData);
            res.redirect(`https://${req.get('host')}/integrations?github=error&reason=token_exchange_failed`);
          }
        } catch (error) {
          console.error("Failed to process GitHub OAuth:", error);
          res.redirect(`https://${req.get('host')}/integrations?github=error&reason=oauth_processing_failed`);
        }
      } else {
        res.redirect(`https://${req.get('host')}/integrations?github=cancelled`);
      }
    } catch (error: any) {
      console.error("GitHub callback failed:", error);
      res.redirect(`https://${req.get('host')}/integrations?github=error&reason=callback_failed`);
    }
  });

  app.get("/api/integrations/github/status", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      globalThis.githubConnections = globalThis.githubConnections || new Map();
      
      const connection = globalThis.githubConnections.get(userId);
      
      if (connection) {
        res.json({
          connected: true,
          username: connection.username,
          githubUserId: connection.githubUserId,
          connectedAt: connection.connectedAt
        });
      } else {
        res.json({ connected: false });
      }
    } catch (error: any) {
      console.error("Failed to check GitHub status:", error);
      res.status(500).json({ message: "Failed to check GitHub status" });
    }
  });

  app.get("/api/integrations/github/repositories", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      globalThis.githubConnections = globalThis.githubConnections || new Map();
      
      const connection = globalThis.githubConnections.get(userId);
      
      if (!connection) {
        return res.status(400).json({ 
          message: "GitHub not connected. Please connect your GitHub account first." 
        });
      }

      // Fetch repositories using GitHub API
      try {
        const reposResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
          headers: {
            'Authorization': `Bearer ${connection.accessToken}`,
            'User-Agent': 'SmartAudit-AI',
          },
        });
        
        if (!reposResponse.ok) {
          throw new Error(`GitHub API error: ${reposResponse.status}`);
        }
        
        const repositories = await reposResponse.json();
        
        // Filter and format repositories
        const formattedRepos = repositories.map((repo: any) => ({
          name: repo.name,
          full_name: repo.full_name,
          private: repo.private,
          description: repo.description,
          default_branch: repo.default_branch,
          language: repo.language,
          updated_at: repo.updated_at
        }));
        
        res.json({ repositories: formattedRepos });
      } catch (apiError: any) {
        console.error("GitHub API error:", apiError);
        res.status(500).json({ message: "Failed to fetch repositories from GitHub" });
      }
    } catch (error: any) {
      console.error("Failed to fetch repositories:", error);
      res.status(500).json({ message: "Failed to fetch repositories" });
    }
  });

  // Helper function to detect blockchain programming language from file extension
  function detectBlockchainLanguage(filename: string): { language: string; category: string } | null {
    const extension = filename.toLowerCase().split('.').pop();
    
    const languageMap: Record<string, { language: string; category: string }> = {
      // Solidity - Ethereum
      'sol': { language: 'Solidity', category: 'Smart Contract' },
      
      // Rust - Solana, Near, Polkadot
      'rs': { language: 'Rust', category: 'Smart Contract' },
      
      // Move - Aptos, Sui
      'move': { language: 'Move', category: 'Smart Contract' },
      
      // Cairo - StarkNet
      'cairo': { language: 'Cairo', category: 'Smart Contract' },
      
      // Go - Various blockchain projects
      'go': { language: 'Go', category: 'Blockchain' },
      
      // TypeScript/JavaScript - Web3 applications
      'ts': { language: 'TypeScript', category: 'Web3 Application' },
      'js': { language: 'JavaScript', category: 'Web3 Application' },
      
      // Python - Web3 scripts and applications
      'py': { language: 'Python', category: 'Web3 Application' },
      
      // Vyper - Ethereum alternative to Solidity
      'vy': { language: 'Vyper', category: 'Smart Contract' },
      
      // Yul - Ethereum assembly
      'yul': { language: 'Yul', category: 'Smart Contract' },
      
      // Clarity - Stacks blockchain
      'clar': { language: 'Clarity', category: 'Smart Contract' },
      
      // Cadence - Flow blockchain
      'cdc': { language: 'Cadence', category: 'Smart Contract' },
      
      // Plutus - Cardano
      'hs': { language: 'Haskell/Plutus', category: 'Smart Contract' },
      
      // AssemblyScript - Near, others
      'as': { language: 'AssemblyScript', category: 'Smart Contract' },
      
      // C++ - EOS, others
      'cpp': { language: 'C++', category: 'Smart Contract' },
      'cc': { language: 'C++', category: 'Smart Contract' },
      'cxx': { language: 'C++', category: 'Smart Contract' },
      
      // Michelson - Tezos
      'tz': { language: 'Michelson', category: 'Smart Contract' },
      
      // WASM files
      'wasm': { language: 'WebAssembly', category: 'Smart Contract' },
      'wat': { language: 'WebAssembly Text', category: 'Smart Contract' }
    };
    
    return languageMap[extension || ''] || null;
  }

  // Helper function to recursively find blockchain files in GitHub repositories
  async function findBlockchainFilesRecursive(
    repositoryFullName: string,
    branch: string,
    accessToken: string,
    path: string = '',
    depth: number = 0
  ): Promise<any[]> {
    // Prevent infinite recursion and limit depth to 10 levels
    if (depth > 10) {
      console.warn(`Maximum directory depth reached for ${repositoryFullName} at ${path}`);
      return [];
    }

    const excludedDirs = ['node_modules', '.git', 'build', 'dist', 'artifacts', 'cache', 'coverage', '.next', 'out', 'target', 'deps'];

    try {
      const url = path 
        ? `https://api.github.com/repos/${repositoryFullName}/contents/${path}?ref=${branch}`
        : `https://api.github.com/repos/${repositoryFullName}/contents?ref=${branch}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'User-Agent': 'SmartAudit-AI',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          console.warn(`GitHub API rate limit or access denied for ${repositoryFullName}/${path}`);
          return [];
        }
        throw new Error(`Failed to fetch ${path}: ${response.status}`);
      }

      const contents = await response.json();
      const items = Array.isArray(contents) ? contents : [contents];
      const files: any[] = [];

      for (const item of items) {
        if (item.type === 'file') {
          const langInfo = detectBlockchainLanguage(item.name);
          if (langInfo) {
            // Found a blockchain programming file
            files.push({
              path: item.path,
              size: item.size,
              sha: item.sha,
              language: langInfo.language,
              category: langInfo.category,
              filename: item.name
            });
          }
        } else if (item.type === 'dir' && !excludedDirs.includes(item.name)) {
          // Recursively scan directories (exclude common build/dependency directories)
          try {
            const subFiles = await findBlockchainFilesRecursive(
              repositoryFullName,
              branch,
              accessToken,
              item.path,
              depth + 1
            );
            files.push(...subFiles);
          } catch (dirError: any) {
            console.warn(`Error scanning directory ${item.path}:`, dirError.message);
            // Continue scanning other directories even if one fails
          }
        }
      }

      return files;
    } catch (error: any) {
      if (error.message.includes('rate limit')) {
        console.error(`GitHub API rate limit exceeded for ${repositoryFullName}`);
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }
      console.error(`Error scanning ${path}:`, error.message);
      return [];
    }
  }

  app.post("/api/integrations/github/scan", isAuthenticated, async (req, res) => {
    try {
      const { repositoryFullName, branch = 'main' } = req.body;
      
      if (!repositoryFullName) {
        return res.status(400).json({ 
          message: "Missing required field: repositoryFullName" 
        });
      }

      const userId = (req as any).user?.claims?.sub;
      globalThis.githubConnections = globalThis.githubConnections || new Map();
      
      const connection = globalThis.githubConnections.get(userId);
      
      if (!connection) {
        return res.status(400).json({ 
          message: "GitHub not connected. Please connect your GitHub account first." 
        });
      }

      const [owner, repo] = repositoryFullName.split('/');
      
      try {
        // Recursively find blockchain files in all directories
        const blockchainFiles = await findBlockchainFilesRecursive(
          repositoryFullName,
          branch,
          connection.accessToken,
          '',
          0
        );
        
        if (blockchainFiles.length === 0) {
          return res.json({
            scan: {
              scanId: `github_${owner}_${repo}_${Date.now()}`,
              repository: { owner, repo, fullName: repositoryFullName, branch },
              contracts: [],
              totalFiles: 0,
              estimatedCredits: 0,
              status: "empty"
            },
            message: "No blockchain programming files found in this repository. Supported languages include Solidity (.sol), Rust (.rs), Move (.move), Cairo (.cairo), Go (.go), TypeScript (.ts), Python (.py), and many others."
          });
        }

        // Group files by language for better organization
        const languageGroups = blockchainFiles.reduce((groups: any, file: any) => {
          if (!groups[file.language]) {
            groups[file.language] = [];
          }
          groups[file.language].push(file);
          return groups;
        }, {});

        const scanResult = {
          scanId: `github_${owner}_${repo}_${Date.now()}`,
          repository: { owner, repo, fullName: repositoryFullName, branch },
          contracts: blockchainFiles.map((file: any) => ({
            path: file.path,
            size: file.size,
            language: file.language,
            category: file.category,
            filename: file.filename
          })),
          totalFiles: blockchainFiles.length,
          languageBreakdown: languageGroups,
          estimatedCredits: Math.max(5, blockchainFiles.length * 5),
          status: "ready"
        };

        const uniqueLanguages = Array.from(new Set(blockchainFiles.map((f: any) => f.language)));
        const languageList = uniqueLanguages.length > 3 
          ? `${uniqueLanguages.slice(0, 3).join(', ')} and ${uniqueLanguages.length - 3} others`
          : uniqueLanguages.join(', ');

        res.json({
          scan: scanResult,
          message: `Repository scan completed successfully. Found ${blockchainFiles.length} blockchain file${blockchainFiles.length === 1 ? '' : 's'} in ${uniqueLanguages.length} language${uniqueLanguages.length === 1 ? '' : 's'}: ${languageList}.`
        });
      } catch (apiError: any) {
        console.error("GitHub API error during scan:", apiError);
        
        // Handle different error types with specific messages
        if (apiError.message?.includes('rate limit')) {
          return res.status(429).json({ 
            message: "GitHub API rate limit exceeded. Please wait a few minutes before scanning again." 
          });
        }
        
        if (apiError.message?.includes('404') || apiError.message?.includes('Not Found')) {
          return res.status(404).json({ 
            message: "Repository not found or you don't have access to it. Please check the repository name and your permissions." 
          });
        }
        
        if (apiError.message?.includes('403') || apiError.message?.includes('Forbidden')) {
          return res.status(403).json({ 
            message: "Access denied. Please ensure the GitHub App has proper permissions to access this repository." 
          });
        }
        
        res.status(500).json({ 
          message: "Failed to scan repository. Please try again or contact support if the issue persists.",
          error: apiError.message || "Unknown error occurred"
        });
      }
    } catch (error: any) {
      console.error("GitHub scan failed:", error);
      res.status(500).json({ message: error.message || "GitHub scan failed" });
    }
  });

  app.post("/api/integrations/github/analyze", isAuthenticated, async (req, res) => {
    try {
      const { repositoryFullName, selectedFiles, branch = 'main' } = req.body;
      
      if (!repositoryFullName || repositoryFullName.trim() === '') {
        return res.status(400).json({ 
          message: "Missing required field: repositoryFullName" 
        });
      }

      if (!selectedFiles || selectedFiles.length === 0) {
        return res.status(400).json({ 
          message: "No files selected for analysis" 
        });
      }

      const userId = (req as any).user?.claims?.sub;
      globalThis.githubConnections = globalThis.githubConnections || new Map();
      
      const connection = globalThis.githubConnections.get(userId);
      
      if (!connection) {
        return res.status(400).json({ 
          message: "GitHub not connected. Please connect your GitHub account first." 
        });
      }

      // Fetch file contents from GitHub
      let combinedContractCode = '';
      const fileContents: { path: string; content: string }[] = [];
      
      for (const filePath of selectedFiles) {
        try {
          const fileResponse = await fetch(`https://api.github.com/repos/${repositoryFullName}/contents/${filePath}?ref=${branch}`, {
            headers: {
              'Authorization': `Bearer ${connection.accessToken}`,
              'User-Agent': 'SmartAudit-AI',
            },
          });
          
          if (!fileResponse.ok) {
            throw new Error(`Failed to fetch ${filePath}: ${fileResponse.status}`);
          }
          
          const fileData = await fileResponse.json();
          if (fileData.content) {
            const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
            fileContents.push({ path: filePath, content });
            combinedContractCode += `\n// File: ${filePath}\n${content}\n\n`;
          }
        } catch (fileError: any) {
          console.error(`Error fetching file ${filePath}:`, fileError);
          return res.status(500).json({ 
            message: `Failed to fetch file: ${filePath}`,
            error: fileError.message 
          });
        }
      }

      if (!combinedContractCode.trim()) {
        return res.status(400).json({ 
          message: "No valid contract content found in selected files" 
        });
      }

      // Determine the primary language from the selected files
      const languageCounts = selectedFiles.reduce((acc: Record<string, number>, filePath: string) => {
        const extension = filePath.toLowerCase().split('.').pop();
        const langInfo = detectBlockchainLanguage(`file.${extension}`);
        if (langInfo) {
          acc[langInfo.language] = (acc[langInfo.language] || 0) + 1;
        }
        return acc;
      }, {});
      
      const primaryLanguage = Object.keys(languageCounts).length > 0 
        ? Object.entries(languageCounts).sort(([,a], [,b]) => (b as number) - (a as number))[0][0].toLowerCase()
        : "solidity";

      // Check credit requirements for authenticated users
      const factors: CreditCalculationFactors = {
        codeLength: combinedContractCode.length,
        complexity: Math.min(10, Math.max(1, Math.ceil(combinedContractCode.length / 1000))),
        hasMultipleFiles: selectedFiles.length > 1,
        analysisType: "security",
        language: primaryLanguage
      };

      const creditCheck = await CreditService.checkCreditsAndCalculateCost(userId, factors);
      if (!creditCheck.hasEnough) {
        return res.status(400).json({ 
          message: "Insufficient credits for analysis",
          needed: creditCheck.needed,
          current: creditCheck.current,
          cost: creditCheck.cost,
          error: "insufficient_credits"
        });
      }

      // Create session with Shipable AI
      const sessionResponse = await fetch(`${SHIPABLE_API_BASE}/chat/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source: "website" })
      });

      if (!sessionResponse.ok) {
        throw new Error(`Failed to create analysis session: ${sessionResponse.statusText}`);
      }

      const sessionData = await sessionResponse.json();
      const sessionKey = sessionData.data.key;

      // Create audit session in database
      const auditSession = await storage.createAuditSession({
        sessionKey,
        contractCode: combinedContractCode,
        contractLanguage: primaryLanguage,
        userId,
        isPublic: false,
        tags: ["github", "repository", repositoryFullName.split('/')[1]]
      });

      res.json({
        sessionId: auditSession.id,
        message: `Analysis session created for ${selectedFiles.length} files from ${repositoryFullName}`,
        estimatedCredits: creditCheck.cost,
        filesAnalyzed: selectedFiles.length,
        repository: repositoryFullName
      });
    } catch (error: any) {
      console.error("GitHub analysis failed:", error);
      res.status(500).json({ 
        message: error.message || "Failed to start GitHub analysis",
        error: "github_analysis_failed"
      });
    }
  });

  app.post("/api/integrations/github/webhook", async (req, res) => {
    try {
      // Verify webhook signature if secret is set
      if (process.env.GITHUB_WEBHOOK_SECRET) {
        const signature = req.headers['x-hub-signature-256'] as string;
        if (!signature || !verifyWebhookSignature(req.body, signature, process.env.GITHUB_WEBHOOK_SECRET)) {
          return res.status(401).json({ message: "Invalid webhook signature" });
        }
      }

      const { action, repository, pull_request, commits } = req.body;
      
      // Validate required webhook data
      if (!repository || !repository.id) {
        return res.status(400).json({ message: "Invalid webhook payload" });
      }
      
      // Handle different webhook events
      if ((action === "opened" || action === "synchronize") && pull_request) {
        // New PR or updated PR - trigger scan
        const scanId = `pr_${repository.id}_${pull_request.number}_${Date.now()}`;
        
        // Here you would trigger actual contract scanning
        // For now, we'll just acknowledge the webhook
        
        res.json({ 
          message: "Webhook received", 
          scanId,
          action: "scan_initiated",
          repository: repository.full_name,
          pullRequest: pull_request.number
        });
      } else {
        res.json({ message: "Webhook received", action: "no_action" });
      }
    } catch (error: any) {
      console.error("GitHub webhook error:", error);
      res.status(500).json({ message: "Webhook processing failed" });
    }
  });


  // Easy CI/CD Setup Routes
  app.post("/api/integrations/cicd/setup", isAuthenticated, async (req, res) => {
    try {
      const { repositoryUrl, platform = 'github-actions', triggerEvents = ['push', 'pull_request'] } = req.body;
      
      if (!repositoryUrl) {
        return res.status(400).json({ 
          message: "Repository URL is required" 
        });
      }

      const userId = (req as any).user?.claims?.sub;
      
      // Generate API key for this CI/CD setup
      const apiKey = crypto.randomBytes(32).toString('hex');
      
      // Store CI/CD setup (in production, use database)
      globalThis.cicdSetups = globalThis.cicdSetups || new Map();
      globalThis.cicdSetups.set(userId, {
        repositoryUrl,
        platform,
        apiKey,
        triggerEvents,
        createdAt: new Date().toISOString(),
        active: true
      });
      
      const { CICDService } = await import("./github");
      const config = CICDService.generateYAMLConfig('hardhat');

      res.json({
        setup: {
          platform,
          repositoryUrl,
          apiKey,
          triggerEvents,
          status: "configured"
        },
        config,
        instructions: [
          "1. Copy the generated YAML configuration",
          "2. Create .github/workflows/smart-audit.yml in your repository", 
          "3. Paste the configuration and commit",
          "4. Add your API key as SMART_AUDIT_API_KEY secret in repository settings"
        ],
        message: `CI/CD setup completed for ${platform}`
      });
    } catch (error: any) {
      console.error("CI/CD setup failed:", error);
      res.status(500).json({ message: error.message || "CI/CD setup failed" });
    }
  });

  app.get("/api/integrations/cicd/status", isAuthenticated, async (req, res) => {
    try {
      const userId = (req as any).user?.claims?.sub;
      globalThis.cicdSetups = globalThis.cicdSetups || new Map();
      
      const setup = globalThis.cicdSetups.get(userId);
      
      if (setup) {
        res.json({
          configured: true,
          platform: setup.platform,
          repositoryUrl: setup.repositoryUrl,
          triggerEvents: setup.triggerEvents,
          active: setup.active,
          createdAt: setup.createdAt
        });
      } else {
        res.json({ configured: false });
      }
    } catch (error: any) {
      console.error("Failed to check CI/CD status:", error);
      res.status(500).json({ message: "Failed to check CI/CD status" });
    }
  });

  app.get("/api/integrations/cicd/config/:type", async (req, res) => {
    try {
      const { type } = req.params;
      const { CICDService } = await import("./github");
      
      let config: string;
      
      switch (type) {
        case 'github-actions':
          const projectType = req.query.project as 'hardhat' | 'truffle' | 'foundry' || 'hardhat';
          config = CICDService.generateYAMLConfig(projectType);
          break;
        case 'jenkins':
          config = CICDService.generateJenkinsfile();
          break;
        default:
          return res.status(400).json({ message: "Unsupported CI/CD type" });
      }
      
      res.json({ config, type });
    } catch (error: any) {
      console.error("Config generation failed:", error);
      res.status(500).json({ message: "Failed to generate CI/CD config" });
    }
  });

  // API validation endpoint for browser extension
  app.post("/api/auth/validate", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Missing API key" });
      }

      const apiKey = authHeader.split(' ')[1];
      
      // Here you would validate the API key against your user database
      // For now, we'll do a simple format validation
      if (!apiKey || apiKey.length < 20) {
        return res.status(401).json({ message: "Invalid API key format" });
      }

      // Return success with user info
      res.json({ 
        valid: true, 
        user: { 
          id: "extension_user", 
          credits: 100 
        } 
      });
    } catch (error: any) {
      console.error("API validation failed:", error);
      res.status(500).json({ message: "Validation failed" });
    }
  });

  // Browser extension audit endpoint
  app.post("/api/audit/extension", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Missing API key" });
      }

      const { contractAddress, sourceCode, blockExplorer, url } = req.body;
      
      if (!contractAddress || !sourceCode) {
        return res.status(400).json({ 
          message: "Missing required fields: contractAddress, sourceCode" 
        });
      }

      // Validate contract address format
      const addressPattern = /^0x[a-fA-F0-9]{40}$/;
      if (!addressPattern.test(contractAddress)) {
        return res.status(400).json({ 
          message: "Invalid contract address format" 
        });
      }

      // Here you would call your audit API with the source code
      // For now, we'll return a mock response
      const mockResult = {
        id: `ext_${Date.now()}`,
        status: 'completed',
        findings: Math.floor(Math.random() * 10) + 1,
        severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        summary: 'Mock audit completed successfully. This would contain real vulnerability analysis.',
        reportUrl: `${req.protocol}://${req.get('host')}/auditor?session=ext_${Date.now()}`
      };

      res.json(mockResult);
    } catch (error: any) {
      console.error("Extension audit failed:", error);
      res.status(500).json({ message: error.message || "Audit failed" });
    }
  });

  // Check if user has claimed free credits
  app.get("/api/credits/check-free-claim", async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const existingFreeClaim = await db.select()
        .from(creditTransactions)
        .where(and(
          eq(creditTransactions.userId, userId as string),
          eq(creditTransactions.type, "purchase"),
          sql`${creditTransactions.reason} LIKE '%Free package%'`
        ))
        .limit(1);

      res.json({ hasClaimed: existingFreeClaim.length > 0 });
    } catch (error) {
      console.error("Check free claim failed:", error);
      res.status(500).json({ message: "Failed to check claim status" });
    }
  });

  // Purchase credits (PayPal integration)
  app.post("/api/credits/purchase", async (req, res) => {
    try {
      const { userId, packageId } = z.object({
        userId: z.string(),
        packageId: z.string()
      }).parse(req.body);
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get package details
      const packages = await CreditService.getCreditPackages();
      const selectedPackage = packages.find(p => p.id === packageId);
      
      if (!selectedPackage) {
        return res.status(404).json({ message: "Package not found" });
      }

      // Handle Free package (no payment required)
      if (selectedPackage.price === 0 && selectedPackage.name === 'Free') {
        // Check if user has already claimed free credits
        const existingFreeClaim = await db.select()
          .from(creditTransactions)
          .where(and(
            eq(creditTransactions.userId, userId),
            eq(creditTransactions.type, "purchase"),
            sql`${creditTransactions.reason} LIKE '%Free package%'`
          ))
          .limit(1);

        if (existingFreeClaim.length > 0) {
          return res.status(400).json({ 
            message: "Free credits already claimed",
            error: "already_claimed",
            hint: "Free credits can only be claimed once per account. Upgrade to Pro for more credits!"
          });
        }

        // Directly add free credits (first time only)
        const result = await CreditService.addCredits(
          userId,
          selectedPackage.totalCredits,
          "purchase",
          `Claimed ${selectedPackage.name} package credits`,
          { packageId }
        );

        if (result.success) {
          return res.json({ 
            success: true, 
            creditsAdded: selectedPackage.totalCredits,
            newBalance: result.newBalance,
            requiresPayment: false
          });
        } else {
          return res.status(400).json({ message: result.error });
        }
      }

      // Handle Enterprise package (contact sales)
      if (selectedPackage.name === 'Enterprise') {
        return res.json({
          packageId,
          requiresContact: true,
          contactEmail: 'enterprise@yourapp.com',
          message: 'Please contact our sales team for enterprise pricing'
        });
      }

      // Return payment details for PayPal integration (Pro/Pro+ plans)
      res.json({ 
        packageId,
        amount: (selectedPackage.price / 100).toFixed(2), // Convert cents to dollars
        currency: "USD",
        credits: selectedPackage.totalCredits,
        requiresPayment: true
      });
    } catch (error) {
      console.error("Credit purchase failed:", error);
      res.status(500).json({ message: "Failed to process purchase" });
    }
  });

  // Complete credit purchase after PayPal payment
  app.post("/api/credits/purchase/complete", async (req, res) => {
    try {
      const { userId, packageId, paypalOrderId } = z.object({
        userId: z.string(),
        packageId: z.string(),
        paypalOrderId: z.string()
      }).parse(req.body);
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Get package details
      const packages = await CreditService.getCreditPackages();
      const selectedPackage = packages.find(p => p.id === packageId);
      
      if (!selectedPackage) {
        return res.status(404).json({ message: "Package not found" });
      }

      // Add credits to user account
      const result = await CreditService.addCredits(
        userId,
        selectedPackage.totalCredits,
        "purchase",
        `Purchased ${selectedPackage.name} package via PayPal`,
        { packageId, paypalOrderId }
      );

      if (result.success) {
        res.json({ 
          success: true, 
          creditsAdded: selectedPackage.totalCredits,
          newBalance: result.newBalance 
        });
      } else {
        res.status(400).json({ message: result.error });
      }
    } catch (error) {
      console.error("Credit purchase completion failed:", error);
      res.status(500).json({ message: "Failed to complete purchase" });
    }
  });

  // Submit enterprise contact form
  app.post("/api/enterprise/contact", async (req, res) => {
    try {
      const contactData = insertEnterpriseContactSchema.parse(req.body);
      
      // Insert contact request into database
      const [contact] = await db.insert(enterpriseContacts)
        .values(contactData)
        .returning();
      
      res.json({ 
        success: true, 
        message: "Thank you for your interest! Our enterprise team will contact you within 24 hours.",
        contactId: contact.id
      });
    } catch (error) {
      console.error("Enterprise contact submission failed:", error);
      res.status(500).json({ message: "Failed to submit contact form" });
    }
  });

  // Initialize default credit packages (admin endpoint)
  app.post("/api/credits/init-packages", async (req, res) => {
    try {
      await CreditService.initializeDefaultPackages();
      res.json({ success: true, message: "Credit packages initialized" });
    } catch (error) {
      console.error("Failed to initialize credit packages:", error);
      res.status(500).json({ message: "Failed to initialize credit packages" });
    }
  });
  app.post("/api/admin/init-packages", async (req, res) => {
    try {
      await CreditService.initializeDefaultPackages();
      res.json({ message: "Default packages initialized" });
    } catch (error) {
      console.error("Package initialization failed:", error);
      res.status(500).json({ message: "Failed to initialize packages" });
    }
  });

  // PayPal return URLs for proper redirect handling
  app.get("/payment/success", (req, res) => {
    res.redirect("/?payment=success");
  });

  app.get("/payment/cancel", (req, res) => {
    res.redirect("/?payment=cancelled");
  });

  const httpServer = createServer(app);
  return httpServer;
}
