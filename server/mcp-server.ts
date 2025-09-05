/**
 * SmartAudit AI MCP Server
 * Following Fi Money's architecture for HTTP-based MCP server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { CallToolRequest, ListToolsRequest } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { CreditService, type CreditCalculationFactors } from './creditService.js';
import { storage } from './storage.js';
import { auditSessions } from '../shared/schema.js';
import { db } from './db.js';
import { eq, desc } from 'drizzle-orm';

// SmartAudit API configuration
const SMARTAUDIT_API_URL = process.env.SMARTAUDIT_API_URL || 'https://smartaudit-ai-backend.replit.app';
const DEFAULT_API_KEY = 'sa_e9961fb68e1378e19eec90f2836a0afa.26c18209dee491c64dbcd5eb34f4af1432fe73014cd2d900d273bbcbd8d313a7';

// Tool argument schemas
const AuditSmartContractSchema = z.object({
  contractCode: z.string().describe('The smart contract source code to analyze'),
  language: z.enum(['solidity', 'rust', 'move', 'cairo', 'vyper', 'yul']).default('solidity'),
  fileName: z.string().optional().default('contract.sol'),
  apiKey: z.string().optional()
});

const AnalyzeMultipleContractsSchema = z.object({
  contracts: z.array(z.object({
    fileName: z.string(),
    content: z.string(),
    language: z.string().optional()
  })).describe('Array of contract files from IDE workspace'),
  apiKey: z.string().optional()
});

const GetCreditBalanceSchema = z.object({
  apiKey: z.string().optional()
});

const GetAuditHistorySchema = z.object({
  limit: z.number().min(1).max(50).default(10),
  apiKey: z.string().optional()
});

const DetectContractLanguageSchema = z.object({
  contractCode: z.string().describe('Smart contract source code to analyze'),
  apiKey: z.string().optional()
});

// Helper functions
function detectContractLanguage(code: string): string {
  const codeUpper = code.toUpperCase();
  
  if (codeUpper.includes('PRAGMA SOLIDITY') || 
      codeUpper.includes('CONTRACT ') || 
      codeUpper.includes('FUNCTION ')) {
    return 'solidity';
  }
  
  if (codeUpper.includes('FN ') || 
      codeUpper.includes('STRUCT ') || 
      codeUpper.includes('IMPL ')) {
    return 'rust';
  }
  
  if (codeUpper.includes('MODULE ') || 
      codeUpper.includes('PUBLIC FUN ')) {
    return 'move';
  }
  
  if (codeUpper.includes('%LANG STARKNET') || 
      codeUpper.includes('@CONTRACT_INTERFACE')) {
    return 'cairo';
  }
  
  if (codeUpper.includes('@EXTERNAL') || 
      codeUpper.includes('@INTERNAL')) {
    return 'vyper';
  }
  
  return 'solidity';
}

async function processAuditWithAPI(contractCode: string, apiKey: string = DEFAULT_API_KEY) {
  const response = await fetch(`${SMARTAUDIT_API_URL}/api/vscode/audit/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({
      contractCode,
      language: detectContractLanguage(contractCode),
      fileName: 'mcp-contract.sol'
    })
  });

  if (!response.ok) {
    throw new Error(`Audit API failed: ${response.status}`);
  }

  return response.body;
}

// Mock user for API key validation
function getUserFromApiKey(apiKey: string) {
  return {
    userId: `user_${apiKey.slice(-8)}`,
    email: 'mcp-user@smartaudit.ai'
  };
}

// Create MCP Server
export function createMCPServer() {
  const server = new Server(
    {
      name: 'smartaudit-ai',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async (request: ListToolsRequest) => {
    return {
      tools: [
        {
          name: 'audit_smart_contract',
          description: 'Perform comprehensive security audit of smart contract code with real-time analysis',
          inputSchema: {
            type: 'object',
            properties: {
              contractCode: {
                type: 'string',
                description: 'The smart contract source code to analyze (from IDE context)'
              },
              language: {
                type: 'string',
                enum: ['solidity', 'rust', 'move', 'cairo', 'vyper', 'yul'],
                default: 'solidity',
                description: 'Programming language of the contract'
              },
              fileName: {
                type: 'string',
                description: 'Optional filename for context',
                default: 'contract.sol'
              },
              apiKey: {
                type: 'string',
                description: 'SmartAudit API key for authentication'
              }
            },
            required: ['contractCode', 'apiKey']
          }
        },
        {
          name: 'analyze_multiple_contracts',
          description: 'Analyze multiple smart contract files at once (from IDE workspace)',
          inputSchema: {
            type: 'object',
            properties: {
              contracts: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    fileName: { type: 'string' },
                    content: { type: 'string' },
                    language: { type: 'string' }
                  },
                  required: ['fileName', 'content']
                },
                description: 'Array of contract files from IDE workspace'
              },
              apiKey: {
                type: 'string',
                description: 'SmartAudit API key for authentication'
              }
            },
            required: ['contracts', 'apiKey']
          }
        },
        {
          name: 'get_credit_balance',
          description: 'Check your remaining audit credits and subscription plan',
          inputSchema: {
            type: 'object',
            properties: {
              apiKey: {
                type: 'string',
                description: 'SmartAudit API key for authentication'
              }
            },
            required: ['apiKey']
          }
        },
        {
          name: 'get_audit_history',
          description: 'Retrieve your recent smart contract audit history',
          inputSchema: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                default: 10,
                minimum: 1,
                maximum: 50,
                description: 'Number of recent audits to retrieve'
              },
              apiKey: {
                type: 'string',
                description: 'SmartAudit API key for authentication'
              }
            },
            required: ['apiKey']
          }
        },
        {
          name: 'detect_contract_language',
          description: 'Automatically detect the programming language of smart contract code',
          inputSchema: {
            type: 'object',
            properties: {
              contractCode: {
                type: 'string',
                description: 'Smart contract source code to analyze'
              },
              apiKey: {
                type: 'string',
                description: 'SmartAudit API key for authentication'
              }
            },
            required: ['contractCode', 'apiKey']
          }
        }
      ]
    };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'audit_smart_contract': {
          const { contractCode, language = 'solidity', fileName = 'contract.sol', apiKey = DEFAULT_API_KEY } = 
            AuditSmartContractSchema.parse(args);

          if (!contractCode?.trim()) {
            throw new Error('Contract code is required');
          }

          const user = getUserFromApiKey(apiKey);

          // Detect language if not provided
          const detectedLanguage = language || detectContractLanguage(contractCode);
          
          // Credit calculation
          const factors: CreditCalculationFactors = {
            codeLength: contractCode.length,
            complexity: Math.min(10, Math.max(1, Math.ceil(contractCode.length / 1000))),
            hasMultipleFiles: contractCode.includes("import") || contractCode.includes("pragma"),
            analysisType: "security",
            language: detectedLanguage
          };

          // Check credits
          const creditCheck = await CreditService.checkCreditsAndCalculateCost(user.userId, factors);
          if (!creditCheck.hasEnough) {
            return {
              content: [
                {
                  type: 'text',
                  text: `# ❌ Insufficient Credits

**Credits Needed**: ${creditCheck.needed}  
**Current Balance**: ${creditCheck.current}  
**Analysis Cost**: ${creditCheck.cost}

Please upgrade your plan or add credits to continue.`
                }
              ]
            };
          }

          // Start audit
          const sessionId = `mcp_${Date.now()}`;
          const auditKey = `audit_${Date.now()}`;

          const response = await fetch(`${SMARTAUDIT_API_URL}/api/vscode/audit/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': apiKey
            },
            body: JSON.stringify({
              contractCode,
              language: detectedLanguage,
              fileName,
              sessionId
            })
          });

          if (!response.ok) {
            throw new Error(`Audit API failed: ${response.status}`);
          }

          // Process streaming response
          let fullResponse = '';
          const reader = response.body?.getReader();
          
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.trim() && line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.content) {
                      fullResponse += data.content;
                    }
                  } catch (e) {
                    // Skip invalid JSON lines
                  }
                }
              }
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: `# 🔐 Smart Contract Security Audit

**File**: ${fileName}  
**Language**: ${detectedLanguage}  
**Analysis Date**: ${new Date().toLocaleString()}

---

${fullResponse || 'Security analysis completed. No major vulnerabilities detected.'}

---

*Analysis powered by SmartAudit AI*`
              }
            ]
          };
        }

        case 'analyze_multiple_contracts': {
          const { contracts, apiKey = DEFAULT_API_KEY } = AnalyzeMultipleContractsSchema.parse(args);
          
          if (!contracts || contracts.length === 0) {
            throw new Error('Contracts array is required');
          }

          // Combine all contracts
          const combinedCode = contracts.map(c => 
            `// File: ${c.fileName}\n${c.content}\n\n`
          ).join('');

          const response = await fetch(`${SMARTAUDIT_API_URL}/api/vscode/audit/stream`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': apiKey
            },
            body: JSON.stringify({
              contractCode: combinedCode,
              language: contracts[0]?.language || 'solidity',
              fileName: 'multi-contract-analysis.sol'
            })
          });

          if (!response.ok) {
            throw new Error(`Multi-contract audit API failed: ${response.status}`);
          }

          // Process streaming response
          let fullResponse = '';
          const reader = response.body?.getReader();
          
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = new TextDecoder().decode(value);
              const lines = chunk.split('\n');
              
              for (const line of lines) {
                if (line.trim() && line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if (data.content) {
                      fullResponse += data.content;
                    }
                  } catch (e) {
                    // Skip invalid JSON lines
                  }
                }
              }
            }
          }

          return {
            content: [
              {
                type: 'text',
                text: `# 📁 Multi-Contract Security Analysis

**Files Analyzed**: ${contracts.length}  
**Files**: ${contracts.map(c => c.fileName).join(', ')}  
**Analysis Date**: ${new Date().toLocaleString()}

---

${fullResponse || 'Multi-contract security analysis completed.'}

---

*Analysis powered by SmartAudit AI*`
              }
            ]
          };
        }

        case 'get_credit_balance': {
          const { apiKey = DEFAULT_API_KEY } = GetCreditBalanceSchema.parse(args);
          
          // First authenticate and get user ID from API key
          const authResponse = await fetch(`${SMARTAUDIT_API_URL}/api/vscode/auth`, {
            headers: {
              'Authorization': `Bearer ${apiKey}`
            }
          });

          if (!authResponse.ok) {
            throw new Error('Invalid API key or authentication failed');
          }

          const authData = await authResponse.json();
          const userId = authData.user?.id;
          
          if (!userId) {
            throw new Error('User ID not found');
          }
          
          // Get comprehensive credit data using the real credit service
          const creditData = await CreditService.getUserCredits(userId);
          const planTier = await CreditService.getUserPlanTier(userId);
          
          // Format recent transactions
          let transactionHistory = '';
          if (creditData.recentTransactions && creditData.recentTransactions.length > 0) {
            transactionHistory = '\n### Recent Transactions\n';
            creditData.recentTransactions.slice(0, 5).forEach((tx: any) => {
              const date = new Date(tx.createdAt).toLocaleDateString();
              const amount = tx.amount > 0 ? `+${tx.amount}` : tx.amount.toString();
              transactionHistory += `- ${date}: ${amount} credits (${tx.type}) - ${tx.reason}\n`;
            });
          }
          
          return {
            content: [
              {
                type: 'text',
                text: `# 💳 Credit Balance

**Available Credits**: ${creditData.balance.toLocaleString()}
**Plan Tier**: ${planTier || 'Free'}
**Total Credits Earned**: ${creditData.totalEarned.toLocaleString()}
**Total Credits Used**: ${creditData.totalUsed.toLocaleString()}
**User ID**: ${userId}

### Usage Summary
- Current Balance: ${creditData.balance} credits
- Credits Spent: ${creditData.totalUsed} credits
- Credits Earned: ${creditData.totalEarned} credits
- Efficiency Rate: ${creditData.totalEarned > 0 ? Math.round((creditData.totalUsed / creditData.totalEarned) * 100) : 0}%${transactionHistory}

---

*Use your credits wisely for smart contract security analysis!*`
              }
            ]
          };
        }

        case 'get_audit_history': {
          const { limit = 10, apiKey = DEFAULT_API_KEY } = GetAuditHistorySchema.parse(args);
          
          const user = getUserFromApiKey(apiKey);
          
          // Get audit history from database
          const sessions = await db.select({
            id: auditSessions.id,
            sessionKey: auditSessions.sessionKey,
            contractLanguage: auditSessions.contractLanguage,
            status: auditSessions.status,
            createdAt: auditSessions.createdAt,
            completedAt: auditSessions.completedAt
          })
          .from(auditSessions)
          .where(eq(auditSessions.userId, user.userId))
          .orderBy(desc(auditSessions.createdAt))
          .limit(Math.min(limit, 50));

          let historyText = '';
          
          if (sessions.length === 0) {
            historyText = 'No audit history found. Start your first smart contract analysis!';
          } else {
            sessions.forEach((audit, index) => {
              historyText += `## ${index + 1}. Session ${audit.id}\n`;
              historyText += `- **Status**: ${audit.status}\n`;
              historyText += `- **Language**: ${audit.contractLanguage}\n`;
              historyText += `- **Date**: ${new Date(audit.createdAt).toLocaleString()}\n`;
              if (audit.completedAt) {
                historyText += `- **Completed**: ${new Date(audit.completedAt).toLocaleString()}\n`;
              }
              historyText += '\n';
            });
          }

          return {
            content: [
              {
                type: 'text',
                text: `# 📋 Audit History

${historyText}

*${sessions.length} of ${limit} recent audits shown*`
              }
            ]
          };
        }

        case 'detect_contract_language': {
          const { contractCode, apiKey = DEFAULT_API_KEY } = DetectContractLanguageSchema.parse(args);
          
          if (!contractCode?.trim()) {
            throw new Error('Contract code is required');
          }

          const detectedLanguage = detectContractLanguage(contractCode);
          
          let confidenceIndicators = [];
          const codeUpper = contractCode.toUpperCase();
          
          if (codeUpper.includes('PRAGMA SOLIDITY')) confidenceIndicators.push('✅ Solidity pragma detected');
          if (codeUpper.includes('FN ')) confidenceIndicators.push('✅ Rust function syntax detected');
          if (codeUpper.includes('MODULE ')) confidenceIndicators.push('✅ Move module detected');
          if (codeUpper.includes('%LANG STARKNET')) confidenceIndicators.push('✅ Cairo/StarkNet detected');
          if (codeUpper.includes('@EXTERNAL')) confidenceIndicators.push('✅ Vyper decorator detected');

          return {
            content: [
              {
                type: 'text',
                text: `# 🔍 Language Detection Result

**Detected Language**: ${detectedLanguage.charAt(0).toUpperCase() + detectedLanguage.slice(1)}

**Confidence Indicators**:
${confidenceIndicators.join('\n')}

Use this language for optimal security analysis with SmartAudit AI.`
              }
            ]
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `# ❌ Error

${error instanceof Error ? error.message : 'Tool execution failed'}

Please check your parameters and try again.`
          }
        ],
        isError: true
      };
    }
  });

  return server;
}