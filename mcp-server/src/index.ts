#!/usr/bin/env node

/**
 * SmartAudit AI MCP Server v2.0
 * 
 * Enterprise-grade Model Context Protocol server for AI-powered smart contract auditing
 * Compatible with Claude Desktop, Cursor, Continue.dev, Codeium, Windsurf, and all MCP-enabled IDEs
 * 
 * Features:
 * - Real-time streaming security analysis
 * - Multi-language smart contract support (Solidity, Rust, Move, Cairo, Vyper)
 * - Credit management and audit history
 * - Robust error handling and validation
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration
const API_BASE_URL = process.env.SMARTAUDIT_API_URL || 'http://localhost:5000';
const DEFAULT_API_KEY = process.env.SMARTAUDIT_API_KEY || '';

// Input validation schemas
const AuditContractSchema = z.object({
  contractCode: z.string().min(1, 'Contract code is required'),
  language: z.enum(['solidity', 'rust', 'move', 'cairo', 'vyper', 'yul']).default('solidity'),
  fileName: z.string().optional().default('contract.sol'),
  apiKey: z.string().optional(),
});

const AnalyzeMultipleSchema = z.object({
  contracts: z.array(z.object({
    fileName: z.string(),
    content: z.string().min(1),
    language: z.string().optional(),
  })).min(1, 'At least one contract is required'),
  apiKey: z.string().optional(),
});

const AuditHistorySchema = z.object({
  limit: z.number().min(1).max(50).default(10),
  apiKey: z.string().optional(),
});

const DetectLanguageSchema = z.object({
  contractCode: z.string().min(1, 'Contract code is required'),
});

const CreditBalanceSchema = z.object({
  apiKey: z.string().optional(),
});

/**
 * SmartAudit AI API Client
 */
class SmartAuditClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || DEFAULT_API_KEY;
    this.baseUrl = API_BASE_URL;
  }

  private validateApiKey(): void {
    if (!this.apiKey) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'SmartAudit API key is required. Get yours at https://smartaudit.ai/dashboard'
      );
    }
  }

  /**
   * Make streaming request to MCP API endpoint
   */
  private async makeStreamingRequest(action: string, tool: string, args: any): Promise<string> {
    this.validateApiKey();

    try {
      const response = await fetch(`${this.baseUrl}/api/stream/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          action,
          tool,
          arguments: args,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      // Process streaming response
      let result = '';
      let errorMessage = '';
      
      // Handle streaming response body
      if (response.body) {
        const body = response.body as any; // Type assertion for compatibility
        const reader = body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'content') {
                    result += data.content;
                  } else if (data.type === 'result' && data.data?.message) {
                    result = data.data.message;
                  } else if (data.type === 'error') {
                    errorMessage = data.message;
                    break;
                  } else if (data.type === 'credits_deducted') {
                    // Add credit info to result
                    result += `\n\n**Credits Used**: ${data.creditsUsed} | **Remaining**: ${data.remainingCredits}\n\n`;
                  } else if (data.type === 'complete') {
                    break;
                  }
                } catch (parseError) {
                  // Skip invalid JSON lines
                }
              }
            }
            
            if (errorMessage) break;
          }
        } finally {
          reader.releaseLock();
        }
      }

      if (errorMessage) {
        throw new Error(errorMessage);
      }

      return result || 'Operation completed successfully.';
    } catch (error) {
      console.error(`[API Error] ${tool}:`, error);
      throw new McpError(
        ErrorCode.InternalError,
        `${tool} failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async auditContract(contractCode: string, language: string, fileName: string): Promise<string> {
    return this.makeStreamingRequest('call_tool', 'audit_smart_contract', {
      contractCode,
      language,
      fileName,
    });
  }

  async analyzeMultipleContracts(contracts: any[]): Promise<string> {
    return this.makeStreamingRequest('call_tool', 'analyze_multiple_contracts', {
      contracts,
    });
  }

  async getCreditBalance(): Promise<string> {
    return this.makeStreamingRequest('call_tool', 'get_credit_balance', {});
  }

  async getAuditHistory(limit: number): Promise<string> {
    return this.makeStreamingRequest('call_tool', 'get_audit_history', {
      limit,
    });
  }

  async detectContractLanguage(contractCode: string): Promise<string> {
    return this.makeStreamingRequest('call_tool', 'detect_contract_language', {
      contractCode,
    });
  }
}

/**
 * Language Detection Utility
 */
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

/**
 * MCP Tool Definitions
 */
const TOOLS = [
  {
    name: 'audit_smart_contract',
    description: 'Perform comprehensive security audit of smart contract code with real-time AI analysis. Detects vulnerabilities, gas optimization issues, and provides detailed security recommendations for Solidity, Rust, Move, Cairo, and Vyper contracts.',
    inputSchema: {
      type: 'object',
      properties: {
        contractCode: {
          type: 'string',
          description: 'The smart contract source code to analyze (paste from IDE)'
        },
        language: {
          type: 'string',
          enum: ['solidity', 'rust', 'move', 'cairo', 'vyper', 'yul'],
          default: 'solidity',
          description: 'Programming language of the contract (auto-detected if not specified)'
        },
        fileName: {
          type: 'string',
          description: 'Optional filename for context (e.g., "MyContract.sol")'
        },
        apiKey: {
          type: 'string',
          description: 'Your SmartAudit AI API key (get from https://smartaudit.ai/dashboard)'
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
        },
        apiKey: {
          type: 'string',
          description: 'Your SmartAudit AI API key'
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
      properties: {
        apiKey: {
          type: 'string',
          description: 'Your SmartAudit AI API key'
        }
      },
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
        },
        apiKey: {
          type: 'string',
          description: 'Your SmartAudit AI API key'
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

/**
 * SmartAudit MCP Server
 */
class SmartAuditMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'smartaudit-ai',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => console.error('[MCP Server Error]', error);
    
    process.on('SIGINT', async () => {
      console.error('[MCP Server] Shutting down gracefully...');
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: TOOLS };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'audit_smart_contract':
            return await this.handleAuditContract(args);
          
          case 'analyze_multiple_contracts':
            return await this.handleAnalyzeMultiple(args);
          
          case 'get_credit_balance':
            return await this.handleCreditBalance(args);
          
          case 'get_audit_history':
            return await this.handleAuditHistory(args);
          
          case 'detect_contract_language':
            return await this.handleDetectLanguage(args);
          
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        console.error(`[Tool Error] ${name}:`, error);
        
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });
  }

  private async handleAuditContract(args: any) {
    const validatedArgs = AuditContractSchema.parse(args);
    const { contractCode, language, fileName, apiKey } = validatedArgs;
    
    const client = new SmartAuditClient(apiKey);
    const detectedLanguage = language || detectContractLanguage(contractCode);
    
    const result = await client.auditContract(contractCode, detectedLanguage, fileName);
    
    return {
      content: [{
        type: 'text',
        text: `# 🛡️ Smart Contract Security Audit Report

**Contract**: ${fileName}
**Language**: ${detectedLanguage.charAt(0).toUpperCase() + detectedLanguage.slice(1)}
**Analysis Date**: ${new Date().toLocaleString()}

---

${result}

---

**Powered by SmartAudit AI** | [Get API Key](https://smartaudit.ai/dashboard)`
      }]
    };
  }

  private async handleAnalyzeMultiple(args: any) {
    const validatedArgs = AnalyzeMultipleSchema.parse(args);
    const { contracts, apiKey } = validatedArgs;
    
    const client = new SmartAuditClient(apiKey);
    const result = await client.analyzeMultipleContracts(contracts);
    
    return {
      content: [{
        type: 'text',
        text: `# 📁 Multi-Contract Security Analysis

**Files Analyzed**: ${contracts.length}
**Analysis Date**: ${new Date().toLocaleString()}

---

${result}

---

**Powered by SmartAudit AI** | [Get API Key](https://smartaudit.ai/dashboard)`
      }]
    };
  }

  private async handleCreditBalance(args: any) {
    const validatedArgs = CreditBalanceSchema.parse(args);
    const { apiKey } = validatedArgs;
    
    const client = new SmartAuditClient(apiKey);
    const result = await client.getCreditBalance();
    
    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
  }

  private async handleAuditHistory(args: any) {
    const validatedArgs = AuditHistorySchema.parse(args);
    const { limit, apiKey } = validatedArgs;
    
    const client = new SmartAuditClient(apiKey);
    const result = await client.getAuditHistory(limit);
    
    return {
      content: [{
        type: 'text',
        text: result
      }]
    };
  }

  private async handleDetectLanguage(args: any) {
    const validatedArgs = DetectLanguageSchema.parse(args);
    const { contractCode } = validatedArgs;
    
    // For language detection, we can use local logic or API
    const detectedLanguage = detectContractLanguage(contractCode);
    
    const codeUpper = contractCode.toUpperCase();
    const indicators = [
      codeUpper.includes('PRAGMA SOLIDITY') && '✅ Solidity pragma detected',
      codeUpper.includes('FN ') && '✅ Rust function syntax detected',
      codeUpper.includes('MODULE ') && '✅ Move module detected',
      codeUpper.includes('%LANG STARKNET') && '✅ Cairo/StarkNet detected',
      codeUpper.includes('@EXTERNAL') && '✅ Vyper decorator detected',
    ].filter(Boolean);
    
    return {
      content: [{
        type: 'text',
        text: `# 🔍 Language Detection Result

**Detected Language**: ${detectedLanguage.charAt(0).toUpperCase() + detectedLanguage.slice(1)}

**Confidence Indicators**:
${indicators.join('\n')}

Use this language for optimal analysis with the \`audit_smart_contract\` tool.`
      }]
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    // Log to stderr (not stdout to avoid interfering with MCP protocol)
    console.error('🔥 SmartAudit AI MCP Server v2.0 - Enterprise Ready');
    console.error('📋 Available Tools: 5 comprehensive smart contract audit tools');
    console.error('🔑 API Key:', DEFAULT_API_KEY ? '✅ Configured' : '❌ Not found (will use runtime key)');
    console.error('🌐 Backend:', API_BASE_URL);
    console.error('🚀 Ready for AI IDE connections!');
  }
}

/**
 * Main Entry Point
 */
async function main() {
  try {
    const server = new SmartAuditMCPServer();
    await server.run();
  } catch (error) {
    console.error('❌ Fatal error starting MCP server:', error);
    process.exit(1);
  }
}

// Start the server
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.argv[1] === __filename) {
  main();
}