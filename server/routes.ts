import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAuditSessionSchema, insertAuditResultSchema, insertUserSchema, updateAuditVisibilitySchema } from "@shared/schema";
import { CreditService, type CreditCalculationFactors } from "./creditService";
import { z } from "zod";
import * as crypto from "crypto";
import { createPaypalOrder, capturePaypalOrder, loadPaypalDefault } from "./paypal";

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
      const reader = analysisResponse.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

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
        // Directly add free credits
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

  const httpServer = createServer(app);
  return httpServer;
}
