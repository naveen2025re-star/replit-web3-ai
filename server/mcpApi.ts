#!/usr/bin/env node

/**
 * Standard MCP HTTP API Implementation
 * 
 * Follows Anthropic's MCP Streamable HTTP Transport specification (2025-03-26)
 * - Single /mcp endpoint for all communication
 * - JSON-RPC 2.0 message format
 * - Session management with Mcp-Session-Id headers
 * - Optional SSE streaming for real-time responses
 * - Compatible with all AI assistants and MCP clients
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { CreditService, CreditCalculationFactors } from './creditService.js';
import { processAuditStreaming } from './auditApi.js';

// JSON-RPC 2.0 Types
interface JSONRPCRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface JSONRPCResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface JSONRPCNotification {
  jsonrpc: '2.0';
  method: string;
  params?: any;
}

// MCP Tool Definitions
const MCP_TOOLS = [
  {
    name: 'audit_smart_contract',
    description: 'Perform comprehensive security audit of smart contract code with real-time AI analysis. Detects vulnerabilities, gas optimization issues, and provides detailed security recommendations for Solidity, Rust, Move, Cairo, and Vyper contracts.',
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
          description: 'Optional filename for context (e.g., "MyContract.sol")'
        }
      },
      required: ['contractCode']
    }
  },
  {
    name: 'analyze_multiple_contracts',
    description: 'Analyze multiple smart contract files at once from your IDE workspace. Perfect for auditing entire DeFi protocols, NFT collections, or multi-contract systems with cross-contract vulnerability detection.',
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
        }
      },
      required: ['contracts']
    }
  },
  {
    name: 'get_credit_balance',
    description: 'Check your remaining audit credits and subscription plan details. Shows current balance, plan type, and usage statistics.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'get_audit_history',
    description: 'Retrieve your recent smart contract audit history with detailed results, vulnerability counts, and timestamps.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          default: 10,
          minimum: 1,
          maximum: 50,
          description: 'Number of recent audits to retrieve (max 50)'
        }
      },
      required: []
    }
  },
  {
    name: 'detect_contract_language',
    description: 'Automatically detect the programming language of smart contract code with confidence indicators. Supports Solidity, Rust, Move, Cairo, Vyper, and Yul.',
    inputSchema: {
      type: 'object',
      properties: {
        contractCode: {
          type: 'string',
          description: 'Smart contract source code to analyze'
        }
      },
      required: ['contractCode']
    }
  }
];

// Language Detection Utility
function detectContractLanguage(code: string): string {
  const codeUpper = code.toUpperCase();
  
  if (codeUpper.includes('PRAGMA SOLIDITY') || codeUpper.includes('CONTRACT ')) {
    return 'solidity';
  }
  if (codeUpper.includes('FN ') || codeUpper.includes('STRUCT ') || codeUpper.includes('IMPL ')) {
    return 'rust';
  }
  if (codeUpper.includes('MODULE ') || codeUpper.includes('PUBLIC FUN ')) {
    return 'move';
  }
  if (codeUpper.includes('%LANG STARKNET') || codeUpper.includes('@CONTRACT_INTERFACE')) {
    return 'cairo';
  }
  if (codeUpper.includes('@EXTERNAL') || codeUpper.includes('@INTERNAL')) {
    return 'vyper';
  }
  
  return 'solidity';
}

// Session Management
const sessions = new Map<string, { userId: string; createdAt: Date }>();

function createSession(userId: string): string {
  const sessionId = uuidv4();
  sessions.set(sessionId, { userId, createdAt: new Date() });
  return sessionId;
}

function getSession(sessionId: string) {
  return sessions.get(sessionId);
}

// Authentication Middleware
function authenticateApiKey(req: any, res: any, next: any) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32001,
        message: 'API key required',
        data: 'Include X-API-Key header or Authorization: Bearer token'
      }
    });
  }

  // Mock user - in production, validate against database
  req.user = { userId: 'mcp_user_' + apiKey.slice(-8), apiKey };
  next();
}

// Standard MCP HTTP API Handler
export function createMCPRouter() {
  const router = express.Router();

  // Standard MCP Endpoint - Handles both POST and GET
  router.all('/mcp', authenticateApiKey, async (req: any, res) => {
    try {
      // Handle CORS
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization, Mcp-Session-Id, Accept');
      
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }

      // GET request - List tools or open SSE stream
      if (req.method === 'GET') {
        const acceptsSSE = req.headers.accept?.includes('text/event-stream');
        
        if (acceptsSSE) {
          // Open SSE stream for server-to-client communication
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*'
          });
          
          res.write('data: {"jsonrpc": "2.0", "method": "stream/opened", "params": {}}\n\n');
          
          // Keep connection alive
          const keepAlive = setInterval(() => {
            res.write(': keepalive\n\n');
          }, 30000);
          
          req.on('close', () => {
            clearInterval(keepAlive);
          });
          
          return;
        }

        // Return available tools
        const response: JSONRPCResponse = {
          jsonrpc: '2.0',
          id: 'tools_list',
          result: {
            tools: MCP_TOOLS
          }
        };
        
        return res.json(response);
      }

      // POST request - Handle JSON-RPC messages
      if (req.method === 'POST') {
        const message: JSONRPCRequest = req.body;
        
        if (!message.jsonrpc || message.jsonrpc !== '2.0') {
          return res.status(400).json({
            jsonrpc: '2.0',
            id: message.id || null,
            error: {
              code: -32600,
              message: 'Invalid JSON-RPC 2.0 request'
            }
          });
        }

        // Handle session management
        let sessionId = req.headers['mcp-session-id'];
        if (!sessionId) {
          sessionId = createSession(req.user.userId);
          res.setHeader('Mcp-Session-Id', sessionId);
        }

        // Route based on method
        switch (message.method) {
          case 'tools/list':
            return res.json({
              jsonrpc: '2.0',
              id: message.id,
              result: {
                tools: MCP_TOOLS
              }
            });

          case 'tools/call':
            return await handleToolCall(message, req, res);

          default:
            return res.json({
              jsonrpc: '2.0',
              id: message.id,
              error: {
                code: -32601,
                message: `Method not found: ${message.method}`
              }
            });
        }
      }

      // Method not allowed
      return res.status(405).json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32602,
          message: 'Method not allowed'
        }
      });

    } catch (error) {
      console.error('[MCP API Error]', error);
      return res.status(500).json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal server error',
          data: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  });

  return router;
}

// Handle Tool Calls
async function handleToolCall(message: JSONRPCRequest, req: any, res: any) {
  const { name, arguments: args } = message.params;
  const apiUser = req.user;

  try {
    switch (name) {
      case 'audit_smart_contract': {
        const { contractCode, language, fileName } = args;
        
        if (!contractCode?.trim()) {
          return res.json({
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32602,
              message: 'Contract code is required'
            }
          });
        }

        const detectedLanguage = language || detectContractLanguage(contractCode);
        
        // Check credits
        const factors: CreditCalculationFactors = {
          codeLength: contractCode.length,
          complexity: Math.min(10, Math.max(1, Math.ceil(contractCode.length / 1000))),
          hasMultipleFiles: contractCode.includes('import') || contractCode.includes('pragma'),
          analysisType: 'security',
          language: detectedLanguage
        };

        const creditCheck = await CreditService.checkCreditsAndCalculateCost(apiUser.userId, factors);
        if (!creditCheck.hasEnough) {
          return res.json({
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32001,
              message: 'Insufficient credits',
              data: {
                needed: creditCheck.needed,
                current: creditCheck.current,
                cost: creditCheck.cost
              }
            }
          });
        }

        // Start streaming response
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        });

        // Send initial response
        const initialResponse = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: [
              {
                type: 'text',
                text: `# 🛡️ Smart Contract Security Audit\n\n**Contract**: ${fileName || 'Anonymous'}\n**Language**: ${detectedLanguage.charAt(0).toUpperCase() + detectedLanguage.slice(1)}\n**Analysis**: Starting...\n\n---\n\n`
              }
            ]
          }
        };
        
        res.write(`data: ${JSON.stringify(initialResponse)}\n\n`);

        // Deduct credits and stream analysis
        const deductionResult = await CreditService.deductCreditsForAudit(
          apiUser.userId,
          `mcp_${Date.now()}`,
          factors
        );

        if (deductionResult.success) {
          // Send credit info
          res.write(`data: ${JSON.stringify({
            jsonrpc: '2.0',
            method: 'credits/deducted',
            params: {
              creditsUsed: deductionResult.creditsDeducted,
              remainingCredits: deductionResult.newBalance
            }
          })}\n\n`);

          // Start actual audit streaming
          await processAuditStreaming(
            `mcp_${Date.now()}`,
            `session_${Date.now()}`,
            contractCode,
            res
          );
        }

        res.write(`data: ${JSON.stringify({
          jsonrpc: '2.0',
          method: 'stream/complete',
          params: {}
        })}\n\n`);
        
        return res.end();
      }

      case 'get_credit_balance': {
        const balance = await CreditService.getCreditBalance(apiUser.userId);
        
        return res.json({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: [
              {
                type: 'text',
                text: `# 💳 Credit Balance\n\n**Available Credits**: ${balance.credits}\n**Subscription Plan**: ${(balance.plan || 'free').charAt(0).toUpperCase() + (balance.plan || 'free').slice(1)}\n**User ID**: ${apiUser.userId}\n\n${balance.credits < 10 ? '⚠️ **Low Credits**: Consider upgrading your plan at [smartaudit.ai](https://smartaudit.ai/pricing)' : '✅ **Sufficient Credits**: Ready for analysis!'}`
              }
            ]
          }
        });
      }

      case 'detect_contract_language': {
        const { contractCode } = args;
        
        if (!contractCode?.trim()) {
          return res.json({
            jsonrpc: '2.0',
            id: message.id,
            error: {
              code: -32602,
              message: 'Contract code is required'
            }
          });
        }

        const detectedLanguage = detectContractLanguage(contractCode);
        const codeUpper = contractCode.toUpperCase();
        
        const indicators = [
          codeUpper.includes('PRAGMA SOLIDITY') && '✅ Solidity pragma detected',
          codeUpper.includes('FN ') && '✅ Rust function syntax detected',
          codeUpper.includes('MODULE ') && '✅ Move module detected',
          codeUpper.includes('%LANG STARKNET') && '✅ Cairo/StarkNet detected',
          codeUpper.includes('@EXTERNAL') && '✅ Vyper decorator detected',
        ].filter(Boolean);

        return res.json({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: [
              {
                type: 'text',
                text: `# 🔍 Language Detection Result\n\n**Detected Language**: ${detectedLanguage.charAt(0).toUpperCase() + detectedLanguage.slice(1)}\n\n**Confidence Indicators**:\n${indicators.join('\n')}\n\nUse this language for optimal analysis with the \`audit_smart_contract\` tool.`
              }
            ]
          }
        });
      }

      default:
        return res.json({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32601,
            message: `Unknown tool: ${name}`
          }
        });
    }

  } catch (error) {
    console.error(`[MCP Tool Error] ${name}:`, error);
    return res.json({
      jsonrpc: '2.0',
      id: message.id,
      error: {
        code: -32603,
        message: 'Tool execution failed',
        data: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}