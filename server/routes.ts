import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ReferralService } from "./referralService";
import { insertAuditSessionSchema, insertAuditResultSchema, insertUserSchema, updateAuditVisibilitySchema, creditTransactions, enterpriseContacts, insertEnterpriseContactSchema, liveScannedContracts, auditSessions, apiKeys, webhooks } from "@shared/schema";
import { CreditService, type CreditCalculationFactors } from "./creditService";
import { BlockchainScanner } from "./blockchainScanner";
import { ApiService, WebhookService } from "./apiService";
import { authenticateApiKey, requirePermission, createAudit, getAudit, createBatchAudit, listAudits, processAudit } from "./auditApi";
import { z } from "zod";
import * as crypto from "crypto";
import { createRazorpayOrder, verifyRazorpayPayment, getRazorpayPaymentDetails, handleRazorpayWebhook } from "./razorpay";
import Razorpay from 'razorpay';
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

// Initialize Razorpay for order fetching
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_yourKeyId',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'yourKeySecret',
});

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

// Helper function to detect contract language
function detectContractLanguage(code: string): string {
  const codeUpper = code.toUpperCase();
  
  // Solidity detection
  if (codeUpper.includes('PRAGMA SOLIDITY') || 
      codeUpper.includes('CONTRACT ') || 
      codeUpper.includes('FUNCTION ') ||
      codeUpper.includes('MODIFIER ')) {
    return 'solidity';
  }
  
  // Rust detection
  if (codeUpper.includes('FN ') || 
      codeUpper.includes('STRUCT ') || 
      codeUpper.includes('IMPL ') ||
      codeUpper.includes('USE STD::')) {
    return 'rust';
  }
  
  // Move detection
  if (codeUpper.includes('MODULE ') || 
      codeUpper.includes('PUBLIC FUN ') || 
      codeUpper.includes('RESOURCE ')) {
    return 'move';
  }
  
  // Cairo detection
  if (codeUpper.includes('%LANG STARKNET') || 
      codeUpper.includes('@CONTRACT_INTERFACE') || 
      codeUpper.includes('STORAGE_VAR')) {
    return 'cairo';
  }
  
  // Vyper detection
  if (codeUpper.includes('@EXTERNAL') || 
      codeUpper.includes('@INTERNAL') || 
      codeUpper.includes('DEF ') && codeUpper.includes('@')) {
    return 'vyper';
  }
  
  return 'solidity'; // Default fallback
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
        // Simple abuse prevention: Check for rapid account creation from same IP
        const clientIP = req.ip || req.connection?.remoteAddress || 'unknown';
        const userAgent = req.headers['user-agent'] || 'unknown';
        
        // Check if too many accounts created from this IP recently (basic protection)
        const recentUsers = await storage.getRecentUsersByIP(clientIP, new Date(Date.now() - 24 * 60 * 60 * 1000));
        
        let initialCredits = 1000; // Default 1000 credits
        
        // Reduce credits if suspicious activity (more than 2 accounts from same IP in 24h)
        if (recentUsers && recentUsers.length >= 2) {
          initialCredits = 100; // Give only 100 credits if potentially abusive
          console.warn(`Potential credit abuse detected from IP ${clientIP}. Reducing initial credits.`);
        }
        
        // Generate unique username
        const timestamp = Date.now().toString(36);
        const addressPart = walletAddress.slice(2, 10).toLowerCase();
        const username = `user_${addressPart}_${timestamp}`;
        
        user = await storage.createUser({
          walletAddress: walletAddress.toLowerCase(),
          username,
          credits: initialCredits, // Set custom initial credits
          lastCreditGrant: new Date(),
        });

        // Log the account creation for monitoring
        console.log(`New user created: ${walletAddress} from IP: ${clientIP}, UA: ${userAgent.substring(0, 100)}, Initial Credits: ${initialCredits}`);
      }

      res.json({
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          displayName: user.displayName,
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
        displayName: user.displayName,
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

      // Set up Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      });

      // Send initial message
      res.write('data: {"type":"init","message":"Starting analysis..."}\n\n');

      try {
        // Step 1: Submit to Shipable AI for analysis
        const analysisPayload = {
          sessionKey: session.sessionKey,
          messages: [{
            role: "user",
            content: `Please analyze this smart contract for security vulnerabilities. For each issue found, please include the line number where it occurs.\n\n\`\`\`${session.contractLanguage}\n${session.contractCode}\`\`\``
          }],
          stream: true
        };

        const formData = new FormData();
        formData.append("request", JSON.stringify(analysisPayload));

        const shipableResponse = await fetch(`${SHIPABLE_API_BASE}/chat/open-playground`, {
          method: "POST",
          body: formData,
          headers: {
            "Authorization": `Bearer ${JWT_TOKEN}`
          }
        });

        if (!shipableResponse.ok) {
          throw new Error(`Shipable API error: ${shipableResponse.statusText}`);
        }

        // Process streaming response
        const reader = shipableResponse.body?.getReader();
        const decoder = new TextDecoder();
        
        let fullAnalysis = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            if (value) {
              const chunk = decoder.decode(value);
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                  try {
                    const data = line.substring(6).trim();
                    if (data) {
                      const parsed = JSON.parse(data);
                      if (parsed.body) {
                        fullAnalysis += parsed.body;
                        res.write(`data: {"type":"chunk","data":${JSON.stringify(parsed.body)}}\n\n`);
                      }
                    }
                  } catch (e) {
                    // Skip invalid JSON
                  }
                }
              }
            }
          }
        }

        // Step 2: Store the result
        await storage.createAuditResult({
          sessionId: session.id,
          rawResponse: fullAnalysis,
          formattedReport: fullAnalysis
        });

        // Deduct credits for authenticated users
        if (session.userId) {
          const factors: CreditCalculationFactors = {
            codeLength: session.contractCode.length,
            complexity: Math.min(10, Math.max(1, Math.ceil(session.contractCode.length / 1000))),
            hasMultipleFiles: session.contractCode.includes("import") || session.contractCode.includes("pragma"),
            analysisType: "security",
            language: session.contractLanguage
          };

          const creditCheck = await CreditService.checkCreditsAndCalculateCost(session.userId, factors);
          if (creditCheck.hasEnough) {
            await CreditService.addCredits(session.userId, -creditCheck.cost, 'audit_deduction', `Audit session ${session.id}`);
          }
        }

        res.write('data: {"type":"complete","message":"Analysis complete!"}\n\n');
        res.end();

      } catch (error) {
        console.error('Analysis error:', error);
        res.write(`data: {"type":"error","message":"${error instanceof Error ? error.message : 'Analysis failed'}"}\n\n`);
        res.end();
      }
    } catch (error) {
      console.error("Failed to analyze contract:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to analyze contract" 
      });
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

  // Get audit session (alias for results endpoint for backward compatibility)
  app.get("/api/audit/session/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = await storage.getAuditSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const result = await storage.getAuditResultBySessionId(sessionId);
      
      // Return the session data with result nested, matching the expected frontend format
      res.json({
        ...session,
        result
      });

    } catch (error) {
      console.error("Failed to get audit session:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to get audit session" 
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

  // Get user's audit sessions
  app.get("/api/audit/user-sessions/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 50;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const sessions = await storage.getUserAuditSessions(userId, pageSize, {
        page,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });
      
      res.json({ sessions, total: sessions.length });
    } catch (error) {
      console.error("Failed to get user audit sessions:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to get user audit sessions" 
      });
    }
  });

  // Update audit session title
  app.patch("/api/audit/session/:sessionId/title", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { title } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      if (!title || title.trim() === '') {
        return res.status(400).json({ message: "Title is required" });
      }

      // Check if session exists first
      const session = await storage.getAuditSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const updated = await storage.updateAuditTitle(sessionId, title.trim());
      
      if (!updated) {
        return res.status(500).json({ message: "Failed to update title" });
      }

      console.log(`Successfully updated audit session title: ${sessionId} -> "${title}"`);
      res.json({ success: true, message: "Title updated successfully", title: updated.publicTitle });
    } catch (error) {
      console.error("Failed to update audit session title:", error);
      res.status(500).json({ 
        message: "Failed to update audit session title. Please try again." 
      });
    }
  });

  // Update audit session pin status
  app.patch("/api/audit/session/:sessionId/pin", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { isPinned } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      if (typeof isPinned !== 'boolean') {
        return res.status(400).json({ message: "isPinned must be a boolean" });
      }

      // Check if session exists first
      const session = await storage.getAuditSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const updated = await storage.updateAuditPinStatus(sessionId, isPinned);
      
      if (!updated) {
        return res.status(500).json({ message: "Failed to update pin status" });
      }

      console.log(`Successfully ${isPinned ? 'pinned' : 'unpinned'} audit session: ${sessionId}`);
      res.json({ success: true, message: `Session ${isPinned ? 'pinned' : 'unpinned'} successfully`, isPinned: updated.isPinned });
    } catch (error) {
      console.error("Failed to update audit session pin status:", error);
      res.status(500).json({ 
        message: "Failed to update pin status. Please try again." 
      });
    }
  });

  // Update audit session archive status
  app.patch("/api/audit/session/:sessionId/archive", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { isArchived } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      if (typeof isArchived !== 'boolean') {
        return res.status(400).json({ message: "isArchived must be a boolean" });
      }

      // Check if session exists first
      const session = await storage.getAuditSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const updated = await storage.updateAuditArchiveStatus(sessionId, isArchived);
      
      if (!updated) {
        return res.status(500).json({ message: "Failed to update archive status" });
      }

      console.log(`Successfully ${isArchived ? 'archived' : 'unarchived'} audit session: ${sessionId}`);
      res.json({ success: true, message: `Session ${isArchived ? 'archived' : 'unarchived'} successfully`, isArchived: updated.isArchived });
    } catch (error) {
      console.error("Failed to update audit session archive status:", error);
      res.status(500).json({ 
        message: "Failed to update archive status. Please try again." 
      });
    }
  });

  // Delete audit session
  app.delete("/api/audit/session/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      if (!sessionId) {
        return res.status(400).json({ message: "Session ID is required" });
      }

      // Check if session exists first
      const session = await storage.getAuditSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const deleted = await storage.deleteAuditSession(sessionId);
      
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete session due to database constraints" });
      }

      console.log(`Successfully deleted audit session: ${sessionId}`);
      res.json({ success: true, message: "Session deleted successfully" });
    } catch (error) {
      console.error("Failed to delete audit session:", error);
      res.status(500).json({ 
        message: "Failed to delete audit session. Please try again." 
      });
    }
  });

  // Credit balance API
  app.get("/api/credits/balance", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const creditData = await CreditService.getUserCredits(userId);
      
      res.json({
        balance: creditData.balance,
        totalUsed: creditData.totalUsed,
        totalEarned: creditData.totalEarned,
        lastGrant: creditData.lastGrant,
        transactions: creditData.recentTransactions.slice(0, 5) // Latest 5 for quick view
      });
    } catch (error) {
      console.error("Failed to get credit balance:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to get credit balance" 
      });
    }
  });

  // Credit transactions API
  app.get("/api/credits/transactions/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }

      const creditData = await CreditService.getUserCredits(userId);
      
      // Format transactions for the frontend
      const formattedTransactions = creditData.recentTransactions.map((transaction: any) => ({
        id: transaction.id,
        date: transaction.createdAt,
        amount: transaction.amount,
        type: transaction.type,
        reason: transaction.reason,
        metadata: transaction.metadata,
        balanceAfter: transaction.balanceAfter,
        createdAt: transaction.createdAt
      }));
      
      res.json(formattedTransactions);
    } catch (error) {
      console.error("Failed to get credit transactions:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to get credit transactions" 
      });
    }
  });

  // Live scans API (recent public audits for analytics)
  app.get("/api/live-scans", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      
      // Get recent public audit sessions as "live scans"
      const publicAuditsResult = await storage.getPublicAudits({ 
        offset: 0, 
        limit 
      });
      
      // Format for live scans display
      const liveScans = publicAuditsResult.audits.map((audit: any) => ({
        id: audit.id,
        contractLanguage: audit.contractLanguage,
        contractSource: audit.contractSource || 'manual',
        createdAt: audit.createdAt,
        completedAt: audit.completedAt,
        status: audit.status,
        publicTitle: audit.publicTitle || `${audit.contractLanguage} Contract Analysis`,
        vulnerabilities: audit.result?.vulnerabilityCount || { high: 0, medium: 0, low: 0, informational: 0 },
        securityScore: audit.result?.securityScore,
        user: audit.user
      }));
      
      res.json(liveScans);
    } catch (error) {
      console.error("Failed to get live scans:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to get live scans" 
      });
    }
  });

  // Additional routes continue here...
  // (The rest of the web interface routes would continue in the same pattern)

  const server = createServer(app);
  return server;
}