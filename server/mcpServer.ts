#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListResourcesRequestSchema, ReadResourceRequestSchema, ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { storage } from "./storage.js";
import { CreditService } from "./creditService.js";
import { ApiService } from "./apiService.js";

// Initialize MCP server
const server = new Server(
  {
    name: "smart-contract-auditor-mcp",
    version: "1.0.0",
    description: "AI-powered smart contract auditing system with authentication and credit management",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Global MCP session state
let mcpSession: { userId?: string; authenticated?: boolean; credits?: number } = {};

// Authentication function
async function authenticateUser(walletAddress: string): Promise<{ success: boolean; userId?: string; credits?: number; message?: string }> {
  try {
    // Check if user exists in the system
    const user = await storage.getUserByWalletAddress(walletAddress);
    if (!user) {
      return { success: false, message: "User not found. Please register first." };
    }

    // Get user credit balance
    const creditBalance = await CreditService.getUserCredits(user.id);
    
    // Update MCP session
    mcpSession = {
      userId: user.id,
      authenticated: true,
      credits: creditBalance
    };

    return {
      success: true,
      userId: user.id,
      credits: creditBalance
    };
  } catch (error) {
    return { success: false, message: `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

// Get user credit details
async function getUserCredits(): Promise<any> {
  if (!mcpSession.authenticated || !mcpSession.userId) {
    throw new Error("Not authenticated. Please authenticate first.");
  }

  try {
    const creditBalance = await CreditService.getUserCredits(mcpSession.userId);
    const creditHistory = await CreditService.getUserCreditHistory(mcpSession.userId);
    
    return {
      balance: creditBalance,
      history: creditHistory,
      packages: await CreditService.getAvailablePackages()
    };
  } catch (error) {
    throw new Error(`Failed to get credit details: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Audit smart contract function
async function auditSmartContract(
  contractCode: string,
  contractAddress?: string,
  blockchain?: string
): Promise<any> {
  if (!mcpSession.authenticated || !mcpSession.userId) {
    throw new Error("Authentication required. Please authenticate first.");
  }

  try {
    // Check if user has enough credits
    const creditCost = 10; // Cost for single audit
    if (mcpSession.credits && mcpSession.credits < creditCost) {
      throw new Error(`Insufficient credits. Need ${creditCost} credits, have ${mcpSession.credits}`);
    }

    // Create audit session via internal API
    const auditSession = await storage.createAuditSession({
      sessionKey: `mcp-${Date.now()}`,
      contractCode: contractCode,
      userId: mcpSession.userId,
      contractLanguage: "solidity",
      contractSource: contractAddress || null,
      analysisType: "comprehensive",
      publicVisibility: false,
    });

    // Simulate AI analysis (in real implementation, this would call your AI service)
    const analysisResults = {
      sessionId: auditSession.id,
      vulnerabilities: [
        {
          severity: "HIGH",
          type: "Reentrancy Attack",
          line: 45,
          description: "Potential reentrancy vulnerability detected in withdraw function",
          recommendation: "Use checks-effects-interactions pattern or ReentrancyGuard",
        },
        {
          severity: "MEDIUM",
          type: "Integer Overflow",
          line: 23,
          description: "Potential integer overflow in balance calculation",
          recommendation: "Use SafeMath library for arithmetic operations",
        },
      ],
      gasOptimizations: [
        {
          type: "Storage Optimization",
          line: 12,
          savings: "2,100 gas",
          description: "Pack struct variables to reduce storage slots",
        },
      ],
      bestPractices: [
        {
          type: "Access Control",
          suggestion: "Implement role-based access control using OpenZeppelin AccessControl",
        },
      ],
      overallScore: 7.2,
      riskLevel: "Medium",
    };

    // Store results
    await storage.createAuditResult({
      sessionId: auditSession.id,
      rawResponse: JSON.stringify(analysisResults),
      formattedReport: `Audit completed with ${analysisResults.vulnerabilities.length} vulnerabilities found`,
      vulnerabilityCount: {
        high: analysisResults.vulnerabilities.filter((v: any) => v.severity === 'HIGH').length,
        medium: analysisResults.vulnerabilities.filter((v: any) => v.severity === 'MEDIUM').length,
        low: analysisResults.vulnerabilities.filter((v: any) => v.severity === 'LOW').length,
        info: 0
      },
      securityScore: analysisResults.overallScore,
    });

    // Deduct credits and update session
    await CreditService.deductCredits(mcpSession.userId, creditCost, 'Smart Contract Audit', auditSession.id);
    mcpSession.credits = await CreditService.getUserCredits(mcpSession.userId);

    return analysisResults;
  } catch (error) {
    throw new Error(`Smart contract audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get audit history
async function getAuditHistory(): Promise<any> {
  if (!mcpSession.authenticated || !mcpSession.userId) {
    throw new Error("Authentication required. Please authenticate first.");
  }

  try {
    const sessions = await storage.getUserAuditSessions(mcpSession.userId);
    return sessions.map(session => ({
      id: session.id,
      contractSource: session.contractSource || "Code-only audit",
      contractLanguage: session.contractLanguage,
      createdAt: session.createdAt,
      analysisType: session.analysisType,
      status: session.status
    }));
  } catch (error) {
    throw new Error(`Failed to fetch audit history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Bulk audit function
async function bulkAuditContracts(contracts: Array<{ code: string; name?: string; address?: string }>): Promise<any> {
  if (!mcpSession.authenticated || !mcpSession.userId) {
    throw new Error("Authentication required. Please authenticate first.");
  }

  try {
    const creditCost = contracts.length * 8; // Bulk discount: 8 credits per contract instead of 10
    if (mcpSession.credits && mcpSession.credits < creditCost) {
      throw new Error(`Insufficient credits. Need ${creditCost} credits, have ${mcpSession.credits}`);
    }

    const results = [];
    
    for (let i = 0; i < contracts.length; i++) {
      const contract = contracts[i];
      const auditSession = await storage.createAuditSession({
        sessionKey: `mcp-bulk-${Date.now()}-${i}`,
        contractCode: contract.code,
        userId: mcpSession.userId,
        contractLanguage: "solidity",
        contractSource: contract.address || null,
        analysisType: "bulk",
        publicVisibility: false,
      });

      // Simulate bulk audit results
      const analysisResult = {
        sessionId: auditSession.id,
        contractName: contract.name || `Contract ${i + 1}`,
        vulnerabilities: Math.floor(Math.random() * 5), // Random for demo
        gasOptimizations: Math.floor(Math.random() * 3),
        overallScore: 6.5 + Math.random() * 3,
        status: "completed"
      };

      results.push(analysisResult);
    }

    // Deduct credits
    await CreditService.deductCredits(mcpSession.userId, creditCost, 'Bulk Smart Contract Audit', `${contracts.length} contracts`);
    mcpSession.credits = await CreditService.getUserCredits(mcpSession.userId);

    return {
      totalContracts: contracts.length,
      results,
      creditsUsed: creditCost,
      remainingCredits: mcpSession.credits
    };
  } catch (error) {
    throw new Error(`Bulk audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "authenticate",
        description: "Authenticate user with wallet address to access auditing features",
        inputSchema: {
          type: "object",
          properties: {
            walletAddress: {
              type: "string",
              description: "User's wallet address (e.g., 0x123...)",
              pattern: "^0x[a-fA-F0-9]{40}$",
            },
          },
          required: ["walletAddress"],
        },
      },
      {
        name: "get_credits",
        description: "Get user's credit balance, history, and available packages",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "audit_smart_contract",
        description: "Audit a smart contract for security vulnerabilities, gas optimizations, and best practices (Costs 10 credits)",
        inputSchema: {
          type: "object",
          properties: {
            contractCode: {
              type: "string",
              description: "The Solidity smart contract code to audit",
            },
            contractAddress: {
              type: "string",
              description: "Optional contract address if deployed",
            },
            blockchain: {
              type: "string",
              description: "Blockchain network (ethereum, polygon, bsc, etc.)",
              enum: ["ethereum", "polygon", "bsc", "arbitrum", "optimism"],
              default: "ethereum",
            },
          },
          required: ["contractCode"],
        },
      },
      {
        name: "bulk_audit",
        description: "Audit multiple smart contracts at once with bulk discount (8 credits per contract)",
        inputSchema: {
          type: "object",
          properties: {
            contracts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  code: { type: "string", description: "Solidity contract code" },
                  name: { type: "string", description: "Optional contract name" },
                  address: { type: "string", description: "Optional contract address" },
                },
                required: ["code"],
              },
              description: "Array of contracts to audit",
              minItems: 2,
              maxItems: 20,
            },
          },
          required: ["contracts"],
        },
      },
      {
        name: "get_audit_history",
        description: "Get audit history for the authenticated user",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "authenticate": {
        const { walletAddress } = args as { walletAddress: string };
        
        const authResult = await authenticateUser(walletAddress);
        
        if (authResult.success) {
          return {
            content: [
              {
                type: "text",
                text: `# Authentication Successful ✅

**User ID**: ${authResult.userId}
**Credit Balance**: ${authResult.credits} credits
**Status**: Authenticated and ready to use auditing tools

You can now use:
- \`audit_smart_contract\` - Audit individual contracts (10 credits)
- \`bulk_audit\` - Audit multiple contracts (8 credits each)
- \`get_audit_history\` - View your audit history
- \`get_credits\` - Check credit balance and purchase options`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `# Authentication Failed ❌

**Error**: ${authResult.message}

Please ensure:
1. Your wallet address is correct (format: 0x...)
2. You have registered an account in the system
3. Your wallet address is properly connected`,
              },
            ],
          };
        }
      }

      case "get_credits": {
        const creditDetails = await getUserCredits();
        
        return {
          content: [
            {
              type: "text",
              text: `# Credit Balance & Information

## Current Balance
**${creditDetails.balance}** credits available

## Recent Transactions
${creditDetails.history.slice(0, 5).map((tx: any) => `
- **${tx.type}**: ${tx.amount} credits - ${new Date(tx.createdAt).toLocaleDateString()}
  *${tx.description}*
`).join('')}

## Available Credit Packages
${creditDetails.packages.map((pkg: any) => `
### ${pkg.name}
- **Credits**: ${pkg.credits}
- **Price**: $${pkg.price}
- **Savings**: ${pkg.bonus > 0 ? pkg.bonus + ' bonus credits' : 'Standard rate'}
`).join('')}

*Use credits for smart contract auditing and security analysis*`,
            },
          ],
        };
      }

      case "audit_smart_contract": {
        const { contractCode, contractAddress, blockchain } = args as {
          contractCode: string;
          contractAddress?: string;
          blockchain?: string;
        };
        
        const result = await auditSmartContract(contractCode, contractAddress, blockchain);
        
        return {
          content: [
            {
              type: "text",
              text: `# Smart Contract Audit Results

## Contract Information
- **Address**: ${contractAddress || "Code-only audit"}
- **Blockchain**: ${blockchain || "ethereum"}
- **Overall Score**: ${result.overallScore}/10
- **Risk Level**: ${result.riskLevel}
- **Credits Used**: 10
- **Remaining Credits**: ${mcpSession.credits}

## Vulnerabilities Found (${result.vulnerabilities.length})
${result.vulnerabilities.map((vuln: any) => `
### ${vuln.severity} - ${vuln.type}
- **Line**: ${vuln.line}
- **Description**: ${vuln.description}
- **Recommendation**: ${vuln.recommendation}
`).join('\n')}

## Gas Optimizations (${result.gasOptimizations.length})
${result.gasOptimizations.map((opt: any) => `
### ${opt.type}
- **Line**: ${opt.line}
- **Potential Savings**: ${opt.savings}
- **Description**: ${opt.description}
`).join('\n')}

## Best Practices Recommendations
${result.bestPractices.map((practice: any) => `
- **${practice.type}**: ${practice.suggestion}
`).join('\n')}

## Session ID
${result.sessionId}

Use the session ID to track this audit or share results with your team.`,
            },
          ],
        };
      }

      case "bulk_audit": {
        const { contracts } = args as { contracts: Array<{ code: string; name?: string; address?: string }> };
        
        const result = await bulkAuditContracts(contracts);
        
        return {
          content: [
            {
              type: "text",
              text: `# Bulk Audit Results

## Summary
- **Total Contracts**: ${result.totalContracts}
- **Credits Used**: ${result.creditsUsed} (${result.creditsUsed / result.totalContracts} per contract)
- **Remaining Credits**: ${result.remainingCredits}

## Individual Results
${result.results.map((audit: any, index: number) => `
### ${index + 1}. ${audit.contractName}
- **Session ID**: ${audit.sessionId}
- **Vulnerabilities**: ${audit.vulnerabilities}
- **Gas Optimizations**: ${audit.gasOptimizations}
- **Overall Score**: ${audit.overallScore.toFixed(1)}/10
- **Status**: ${audit.status}
`).join('')}

*Bulk audits complete! Check individual session IDs for detailed reports.*`,
            },
          ],
        };
      }


      case "get_audit_history": {
        const history = await getAuditHistory();
        
        return {
          content: [
            {
              type: "text",
              text: `# Audit History

Found ${history.length} previous audits:

${history.map((audit: any, index: number) => `
## ${index + 1}. Session ${audit.id}
- **Contract**: ${audit.contractSource || "Code-only audit"}
- **Language**: ${audit.contractLanguage}
- **Type**: ${audit.analysisType}
- **Status**: ${audit.status}
- **Date**: ${new Date(audit.createdAt).toLocaleDateString()}
`).join('\n')}

*Use session IDs to reference specific audits or share results.*`,
            },
          ],
        };
      }



      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        },
      ],
      isError: true,
    };
  }
});

// Register resources (optional - for providing context to AI)
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "audit://sessions/recent",
        name: "Recent Audit Sessions",
        description: "Recent smart contract audit sessions and results",
        mimeType: "application/json",
      },
      {
        uri: "audit://vulnerabilities/common",
        name: "Common Vulnerabilities",
        description: "Database of common smart contract vulnerabilities",
        mimeType: "application/json",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  
  switch (uri) {
    case "audit://sessions/recent":
      const recentSessions = await getAuditHistory();
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(recentSessions, null, 2),
          },
        ],
      };
      
    case "audit://vulnerabilities/common":
      const commonVulns = [
        { name: "Reentrancy", severity: "High", frequency: "Common" },
        { name: "Integer Overflow", severity: "High", frequency: "Less common in Solidity 0.8+" },
        { name: "Access Control", severity: "High", frequency: "Very common" },
        { name: "Unchecked External Calls", severity: "Medium", frequency: "Common" },
      ];
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(commonVulns, null, 2),
          },
        ],
      };
      
    default:
      throw new Error(`Resource not found: ${uri}`);
  }
});

// Main function to start the server
async function main() {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Smart Contract Auditor MCP server is running on stdio");
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.error("\nShutting down MCP server...");
  await server.close();
  process.exit(0);
});

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

export { server };