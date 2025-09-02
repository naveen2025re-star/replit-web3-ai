import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ReferralService } from "./referralService";
import { insertAuditSessionSchema, insertAuditResultSchema, insertUserSchema, updateAuditVisibilitySchema, creditTransactions, enterpriseContacts, insertEnterpriseContactSchema, liveScannedContracts, auditSessions, apiKeys, webhooks } from "@shared/schema";
import { CreditService, type CreditCalculationFactors } from "./creditService";
import { BlockchainScanner } from "./blockchainScanner";
import { ApiService, WebhookService } from "./apiService";
import { authenticateApiKey, requirePermission, createAudit, getAudit, createBatchAudit, listAudits } from "./auditApi";
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

export function registerRoutes(app: Express): Server {
  // Initialize global objects if they don't exist
  if (!global.githubConnections) {
    global.githubConnections = new Map();
  }
  if (!global.cicdSetups) {
    global.cicdSetups = new Map();
  }
  if (!global.gitHubWebhooks) {
    global.gitHubWebhooks = new Map();
  }
  if (!global.oauthStates) {
    global.oauthStates = new Map();
  }

  // Initialize global storage objects
  global.githubConnections = global.githubConnections || new Map();
  global.cicdSetups = global.cicdSetups || new Map();
  global.gitHubWebhooks = global.gitHubWebhooks || new Map();
  global.oauthStates = global.oauthStates || new Map();

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "healthy", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // ============================================================================
  // GITHUB INTEGRATION ENDPOINTS
  // ============================================================================

  // GitHub OAuth initiate
  app.get("/api/integrations/github/install", (req, res) => {
    try {
      const state = generateSecureNonce();
      const userId = req.headers['x-user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Store state for validation
      global.oauthStates?.set(state, {
        userId,
        timestamp: Date.now()
      });

      const githubClientId = process.env.GITHUB_CLIENT_ID;
      if (!githubClientId) {
        return res.status(503).json({ message: "GitHub OAuth integration not configured" });
      }

      const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${githubClientId}&redirect_uri=${encodeURIComponent(process.env.GITHUB_REDIRECT_URI || 'https://your-domain.com/api/auth/github/callback')}&scope=repo,read:user&state=${state}`;
      
      res.json({ redirectUrl });
    } catch (error) {
      console.error('GitHub OAuth initiate error:', error);
      res.status(500).json({ message: "Failed to initiate GitHub OAuth" });
    }
  });

  // GitHub OAuth callback
  app.get("/api/auth/github/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      
      if (!code || !state) {
        return res.status(400).json({ message: "Missing OAuth parameters" });
      }

      // Validate state
      const stateData = global.oauthStates?.get(state as string);
      if (!stateData || Date.now() - stateData.timestamp > 600000) { // 10 minutes expiry
        return res.status(400).json({ message: "Invalid or expired state" });
      }

      // Clean up state
      global.oauthStates?.delete(state as string);

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
      
      if (tokenData.error) {
        return res.status(400).json({ message: `GitHub OAuth error: ${tokenData.error_description}` });
      }

      // Get user info from GitHub
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${tokenData.access_token}`,
          'User-Agent': 'SmartAudit-AI'
        }
      });

      const userData = await userResponse.json();

      // Store connection
      global.githubConnections?.set(stateData.userId, {
        accessToken: tokenData.access_token,
        githubUserId: userData.id,
        username: userData.login,
        connectedAt: new Date().toISOString()
      });

      // Redirect to integrations page
      res.redirect('/integrations?github=connected');
    } catch (error) {
      console.error('GitHub OAuth callback error:', error);
      res.status(500).json({ message: "Failed to complete GitHub OAuth" });
    }
  });

  // GitHub connection status
  app.get("/api/integrations/github/status", isAuthenticated, (req, res) => {
    const userId = req.user.claims.sub;
    const connection = global.githubConnections?.get(userId);
    
    res.json({
      connected: !!connection,
      username: connection?.username || null,
      connectedAt: connection?.connectedAt || null
    });
  });

  // List GitHub repositories
  app.get("/api/integrations/github/repositories", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const connection = global.githubConnections?.get(userId);
      
      if (!connection) {
        return res.status(400).json({ message: "GitHub not connected" });
      }

      const { GitHubService } = await import('./github');
      const github = new GitHubService(connection.accessToken);
      
      // Fetch user's repositories
      const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
        headers: {
          'Authorization': `token ${connection.accessToken}`,
          'User-Agent': 'SmartAudit-AI'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const repos = await response.json();
      
      // Filter and format repositories
      const formattedRepos = repos
        .filter((repo: any) => !repo.fork && !repo.archived)
        .map((repo: any) => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          language: repo.language,
          private: repo.private,
          updatedAt: repo.updated_at,
          starCount: repo.stargazers_count
        }))
        .slice(0, 50); // Limit to 50 repos

      res.json({ repositories: formattedRepos });
    } catch (error) {
      console.error('Repository fetch error:', error);
      res.status(500).json({ message: "Failed to fetch repositories" });
    }
  });

  // Scan GitHub repository for contracts
  app.post("/api/integrations/github/scan", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const connection = global.githubConnections?.get(userId);
      
      if (!connection) {
        return res.status(400).json({ message: "GitHub not connected" });
      }

      const { repository, branch = 'main' } = req.body;
      
      if (!repository) {
        return res.status(400).json({ message: "Repository is required" });
      }

      const [owner, repo] = repository.split('/');
      if (!owner || !repo) {
        return res.status(400).json({ message: "Invalid repository format. Use 'owner/repo'" });
      }

      const { GitHubService } = await import('./github');
      const github = new GitHubService(connection.accessToken);
      
      const scanResult = await github.scanRepository(owner, repo, branch);
      res.json(scanResult);
    } catch (error) {
      console.error('Repository scan error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to scan repository" 
      });
    }
  });

  // Fetch contract content from GitHub
  app.post("/api/integrations/github/fetch-contract", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const connection = global.githubConnections?.get(userId);
      
      if (!connection) {
        return res.status(400).json({ message: "GitHub not connected" });
      }

      const { repository, filePath, branch = 'main' } = req.body;
      
      if (!repository || !filePath) {
        return res.status(400).json({ message: "Repository and filePath are required" });
      }

      const [owner, repo] = repository.split('/');
      const { GitHubService } = await import('./github');
      const github = new GitHubService(connection.accessToken);
      
      const content = await github.getFileContent(owner, repo, filePath, branch);
      res.json({ content, filePath, repository });
    } catch (error) {
      console.error('Contract fetch error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch contract" 
      });
    }
  });

  // ============================================================================
  // BLOCKCHAIN CONTRACT FETCHING
  // ============================================================================

  // Fetch verified contract from blockchain explorer
  app.post("/api/fetch-contract", async (req, res) => {
    try {
      const { address, network = 'ethereum' } = req.body;
      
      if (!address) {
        return res.status(400).json({ message: "Contract address is required" });
      }

      // Validate Ethereum address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ message: "Invalid Ethereum address format" });
      }

      const { BlockchainScanner } = await import('./blockchainScanner');
      const contract = await BlockchainScanner.fetchContractFromExplorer(address, network);
      
      if (!contract) {
        return res.status(404).json({ 
          message: "Contract not found or not verified on the blockchain explorer" 
        });
      }

      res.json(contract);
    } catch (error) {
      console.error('Contract fetch error:', error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch contract" 
      });
    }
  });

  // Get interesting verified contracts for exploration
  app.get("/api/sample-contracts", async (req, res) => {
    try {
      const { BlockchainScanner } = await import('./blockchainScanner');
      const contracts = await BlockchainScanner.getInterestingContracts();
      res.json({ contracts });
    } catch (error) {
      console.error('Sample contracts error:', error);
      res.status(500).json({ message: "Failed to fetch sample contracts" });
    }
  });

  // Get supported blockchain networks
  app.get("/api/networks", async (req, res) => {
    try {
      const { BlockchainScanner } = await import('./blockchainScanner');
      const networks = BlockchainScanner.getSupportedNetworks();
      res.json({ networks });
    } catch (error) {
      console.error('Networks fetch error:', error);
      res.status(500).json({ message: "Failed to fetch supported networks" });
    }
  });

  // Validate contract address on specific network  
  app.post("/api/validate-contract", async (req, res) => {
    try {
      const { address, network } = req.body;
      
      if (!address || !network) {
        return res.status(400).json({ message: "Address and network are required" });
      }

      const { BlockchainScanner } = await import('./blockchainScanner');
      const isValid = await BlockchainScanner.validateContractAddress(address, network);
      
      res.json({ 
        valid: isValid,
        address: address.toLowerCase(),
        network 
      });
    } catch (error) {
      console.error('Contract validation error:', error);
      res.status(500).json({ message: "Failed to validate contract" });
    }
  });

  // ============================================================================
  // CI/CD INTEGRATION
  // ============================================================================

  // CI/CD status check
  app.get("/api/integrations/cicd/status", isAuthenticated, (req, res) => {
    const userId = req.user.claims.sub;
    const setup = global.cicdSetups?.get(userId);
    
    res.json({
      configured: !!setup,
      provider: setup?.provider || null,
      repository: setup?.repository || null,
      configuredAt: setup?.configuredAt || null
    });
  });

  // Generate CI/CD configuration
  app.post("/api/integrations/cicd/generate", isAuthenticated, async (req, res) => {
    try {
      const { projectType = 'hardhat', repository } = req.body;
      
      if (!['hardhat', 'truffle', 'foundry'].includes(projectType)) {
        return res.status(400).json({ message: "Invalid project type" });
      }

      const { CICDService } = await import('./github');
      const config = CICDService.generateYAMLConfig(projectType as any);
      
      res.json({ 
        config, 
        filename: '.github/workflows/smartaudit.yml',
        projectType 
      });
    } catch (error) {
      console.error('CI/CD generation error:', error);
      res.status(500).json({ message: "Failed to generate CI/CD configuration" });
    }
  });

  // Disconnect GitHub
  app.delete("/api/integrations/github/disconnect", isAuthenticated, (req, res) => {
    const userId = req.user.claims.sub;
    global.githubConnections?.delete(userId);
    global.cicdSetups?.delete(userId);
    
    res.json({ message: "GitHub integration disconnected successfully" });
  });

  // ============================================================================
  // WEB3 AUTHENTICATION ENDPOINTS  
  // ============================================================================

  // Web3 nonce generation
  app.post("/api/auth/nonce", (req, res) => {
    try {
      const { address } = req.body;
      
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ message: "Valid Ethereum address is required" });
      }

      const nonce = generateSecureNonce();
      const message = `Welcome to SmartAudit AI!\n\nPlease sign this message to authenticate:\n\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
      
      res.json({ message, nonce });
    } catch (error) {
      console.error('Nonce generation error:', error);
      res.status(500).json({ message: "Failed to generate authentication nonce" });
    }
  });

  // Web3 signature verification
  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { message, signature, address } = req.body;
      
      if (!message || !signature || !address) {
        return res.status(400).json({ message: "Message, signature, and address are required" });
      }

      // In production, implement proper signature verification with ethers.js
      const recoveredAddress = recoverAddressFromSignature(message, signature);
      
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        return res.status(401).json({ message: "Invalid signature" });
      }

      // Check if user exists, create if not
      const user = await storage.createOrUpdateUser({
        address: address.toLowerCase(),
        lastLogin: new Date().toISOString()
      });

      res.json({ 
        success: true, 
        user: {
          id: user.id,
          address: user.address,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      console.error('Signature verification error:', error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Get user profile
  app.get("/api/auth/user/:address", async (req, res) => {
    try {
      const { address } = req.params;
      
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ message: "Valid Ethereum address is required" });
      }

      const user = await storage.getUserByAddress(address.toLowerCase());
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        address: user.address,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      });
    } catch (error) {
      console.error('User fetch error:', error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ============================================================================
  // AUDIT SYSTEM ENDPOINTS
  // ============================================================================

  // Create audit session
  app.post("/api/audit/create", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { contractCode, source = 'manual', metadata = {} } = req.body;
      
      if (!contractCode || contractCode.trim().length === 0) {
        return res.status(400).json({ message: "Contract code is required" });
      }

      // Create audit session in database
      const auditSession = await storage.createAuditSession({
        userId,
        contractCode,
        source,
        metadata: JSON.stringify(metadata)
      });

      res.json(auditSession);
    } catch (error) {
      console.error('Audit creation error:', error);
      res.status(500).json({ message: "Failed to create audit session" });
    }
  });

  // Start audit analysis with Shipable AI
  app.post("/api/audit/analyze/:sessionId", isAuthenticated, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user.claims.sub;
      
      // Verify session belongs to user
      const session = await storage.getAuditSession(sessionId);
      if (!session || session.userId !== userId) {
        return res.status(404).json({ message: "Audit session not found" });
      }

      // Set up Server-Sent Events for real-time streaming
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Create Shipable AI chat session
      const chatResponse = await fetch(`${SHIPABLE_API_BASE}/chat/sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          websiteSource: session.contractCode,
          chatInput: "Please perform a comprehensive security audit of this smart contract code. Analyze for vulnerabilities, gas optimization opportunities, and best practices compliance."
        })
      });

      if (!chatResponse.ok) {
        throw new Error(`Shipable AI API error: ${chatResponse.status}`);
      }

      const chatData = await chatResponse.json();
      const sessionUrl = chatData.url;

      // Stream the response
      const streamResponse = await fetch(sessionUrl, {
        headers: {
          'Authorization': `Bearer ${JWT_TOKEN}`,
          'Accept': 'text/event-stream'
        }
      });

      if (!streamResponse.ok) {
        throw new Error(`Stream error: ${streamResponse.status}`);
      }

      let fullResponse = '';

      // Pipe the stream to client
      streamResponse.body?.on('data', (chunk) => {
        const data = chunk.toString();
        fullResponse += data;
        res.write(`data: ${JSON.stringify({ chunk: data })}\n\n`);
      });

      streamResponse.body?.on('end', async () => {
        // Save complete result to database
        await storage.createAuditResult({
          sessionId,
          result: fullResponse,
          status: 'completed'
        });
        
        res.write(`data: ${JSON.stringify({ status: 'completed' })}\n\n`);
        res.end();
      });

      streamResponse.body?.on('error', (error) => {
        console.error('Stream error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Stream error occurred' })}\n\n`);
        res.end();
      });

    } catch (error) {
      console.error('Audit analysis error:', error);
      res.status(500).json({ message: "Failed to start audit analysis" });
    }
  });

  // Get user's audit sessions
  app.get("/api/audit/user-sessions/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const sessions = await storage.getUserAuditSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error('Sessions fetch error:', error);
      res.status(500).json({ message: "Failed to fetch audit sessions" });
    }
  });

  // ============================================================================  
  // CREDIT SYSTEM ENDPOINTS
  // ============================================================================

  // Get user credit balance
  app.get("/api/credits/balance", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const balance = await CreditService.getUserBalance(userId);
      res.json(balance);
    } catch (error) {
      console.error('Credit balance error:', error);
      res.status(500).json({ message: "Failed to fetch credit balance" });
    }
  });

  // Purchase credits with Razorpay
  app.post("/api/credits/purchase", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { amount, currency = 'INR' } = req.body;
      
      if (!amount || amount < 100) {
        return res.status(400).json({ message: "Minimum amount is ₹100" });
      }

      const order = await createRazorpayOrder(amount, currency, {
        userId,
        type: 'credit_purchase'
      });

      res.json(order);
    } catch (error) {
      console.error('Credit purchase error:', error);
      res.status(500).json({ message: "Failed to create payment order" });
    }
  });

  // ============================================================================
  // COMMUNITY & AUDIT SHARING
  // ============================================================================

  // Get public audit sessions
  app.get("/api/community/audits", async (req, res) => {
    try {
      const { limit = 20, offset = 0 } = req.query;
      const audits = await storage.getPublicAudits(Number(limit), Number(offset));
      res.json({ audits });
    } catch (error) {
      console.error('Community audits error:', error);
      res.status(500).json({ message: "Failed to fetch community audits" });
    }
  });

  // Default route - redirect to frontend
  app.get("/", (req, res) => {
    res.redirect("/auditor");
  });

  // Create HTTP server and return it
  const httpServer = createServer(app);
  return httpServer;
}