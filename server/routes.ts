import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAuditSessionSchema, insertAuditResultSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";

const SHIPABLE_API_BASE = "https://api.shipable.ai/v2";
const JWT_TOKEN = process.env.SHIPABLE_JWT_TOKEN || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcm9qZWN0SWQiOjQxMjcsImlhdCI6MTc1NTgzNTc0Mn0.D5xqjLJIm4BVUgx0UxtrzpaOtKur8r8rDX-YNIOM5UE";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Web3 Authentication
  app.post("/api/auth/web3", async (req, res) => {
    try {
      const { walletAddress, signature, message } = z.object({
        walletAddress: z.string(),
        signature: z.string(),
        message: z.string()
      }).parse(req.body);

      // For now, skip signature verification and trust the frontend
      // In production, you would verify the signature using ethers.js
      // TODO: Add proper signature verification

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
      const { contractCode, contractLanguage, userId } = z.object({
        contractCode: z.string().min(1),
        contractLanguage: z.string().default("solidity"),
        userId: z.string().optional()
      }).parse(req.body);

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

  // Get user audit sessions
  app.get("/api/audit/user-sessions/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const sessions = await storage.getUserAuditSessions(userId, 50);
      res.json(sessions);
    } catch (error) {
      console.error("Failed to get user audit sessions:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to get user audit sessions" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
