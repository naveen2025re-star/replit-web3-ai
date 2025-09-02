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

  // Default route - redirect to frontend
  app.get("/", (req, res) => {
    res.redirect("/auditor");
  });

  // Create HTTP server and return it
  const httpServer = createServer(app);
  return httpServer;
}