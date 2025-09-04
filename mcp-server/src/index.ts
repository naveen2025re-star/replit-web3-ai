#!/usr/bin/env node

/**
 * SmartAudit AI MCP Server
 * 
 * Universal smart contract auditing server compatible with all AI IDEs:
 * - Claude Desktop, Cursor, Continue.dev, Codeium, Windsurf, etc.
 * 
 * Provides comprehensive blockchain security analysis through Model Context Protocol
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
import { config } from 'dotenv';

// Load environment variables
config();

// API Configuration
const API_BASE_URL = process.env.SMARTAUDIT_API_URL || 'https://smartaudit-ai-backend.replit.app';
const DEFAULT_API_KEY = process.env.SMARTAUDIT_API_KEY || '';

/**
 * SmartAudit AI Client - Handles all API interactions
 */
class SmartAuditClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || DEFAULT_API_KEY;
    this.baseUrl = API_BASE_URL;
  }

  private async makeRequest(endpoint: string, options: any = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-API-Key': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new McpError(
        ErrorCode.InternalError,
        `API request failed: ${response.status} ${error}`
      );
    }

    return response.json();
  }

  private async makeStreamRequest(endpoint: string, options: any = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-API-Key': this.apiKey,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new McpError(
        ErrorCode.InternalError,
        `Streaming request failed: ${response.status} ${error}`
      );
    }

    return response;
  }

  /**
   * Authenticate and get user information
   */
  async getUserInfo() {
    return this.makeRequest('/api/vscode/auth');
  }

  /**
   * Get user's credit balance
   */
  async getCreditBalance() {
    const userInfo: any = await this.getUserInfo();
    return {
      credits: userInfo.user?.credits || 0,
      plan: userInfo.user?.plan || 'free',
      userId: userInfo.user?.id
    };
  }

  /**
   * Start streaming smart contract audit
   */
  async auditContract(contractCode: string, language: string = 'solidity', fileName?: string) {
    const response = await this.makeStreamRequest('/api/vscode/audit/stream', {
      method: 'POST',
      body: JSON.stringify({
        contractCode,
        language,
        fileName: fileName || 'contract.sol'
      }),
    });

    return response;
  }

  /**
   * Get audit history
   */
  async getAuditHistory(limit: number = 10) {
    return this.makeRequest(`/api/vscode/audit/history?limit=${limit}`);
  }

  /**
   * Start repository audit
   */
  async auditRepository(repoUrl: string, branch: string = 'main') {
    return this.makeRequest('/api/audit/sessions', {
      method: 'POST',
      body: JSON.stringify({
        repositoryUrl: repoUrl,
        branch,
        analysisType: 'repository'
      }),
    });
  }
}

/**
 * Tool Definitions for AI IDEs
 */
const TOOLS = [
  {
    name: 'audit_smart_contract',
    description: 'Perform comprehensive security audit of smart contract code with real-time analysis',
    inputSchema: {
      type: 'object',
      properties: {
        contractCode: {
          type: 'string',
          description: 'The smart contract source code to analyze'
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
    name: 'audit_repository',
    description: 'Audit entire GitHub repository for smart contract security issues',
    inputSchema: {
      type: 'object',
      properties: {
        repoUrl: {
          type: 'string',
          description: 'GitHub repository URL (e.g., "https://github.com/user/repo")'
        },
        branch: {
          type: 'string',
          default: 'main',
          description: 'Git branch to analyze'
        },
        apiKey: {
          type: 'string',
          description: 'Your SmartAudit AI API key'
        }
      },
      required: ['repoUrl']
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
          description: 'Your SmartAudit AI API key'
        }
      },
      required: []
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
    description: 'Automatically detect the programming language of smart contract code',
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
 * Language Detection Utility
 */
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

/**
 * Process streaming audit response
 */
async function processStreamingAudit(response: any): Promise<string> {
  let fullResult = '';
  
  if (!response.body) {
    throw new McpError(ErrorCode.InternalError, 'No response body received');
  }

  const reader = response.body.getReader();
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
            const data = JSON.parse(line.substring(6));
            if (data.type === 'chunk' && data.data) {
              fullResult += data.data;
            }
          } catch (e) {
            // Ignore parse errors for streaming data
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullResult || 'Analysis completed but no results received.';
}

/**
 * Main MCP Server
 */
const server = new Server(
  {
    name: 'smartaudit-ai',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'audit_smart_contract': {
        const { contractCode, language, fileName, apiKey } = args as {
          contractCode: string;
          language?: string;
          fileName?: string;
          apiKey?: string;
        };

        const client = new SmartAuditClient(apiKey);
        const detectedLanguage = language || detectContractLanguage(contractCode);
        
        // Start streaming audit
        const response = await client.auditContract(contractCode, detectedLanguage, fileName);
        const result = await processStreamingAudit(response);

        return {
          content: [{
            type: 'text',
            text: `# 🛡️ Smart Contract Security Audit Report

**Contract**: ${fileName || 'Anonymous Contract'}
**Language**: ${detectedLanguage.charAt(0).toUpperCase() + detectedLanguage.slice(1)}
**Analysis Date**: ${new Date().toLocaleString()}

---

${result}

---

**Powered by SmartAudit AI** | Get your API key at [smartaudit.ai](https://smartaudit.ai/dashboard)`
          }]
        };
      }

      case 'audit_repository': {
        const { repoUrl, branch, apiKey } = args as {
          repoUrl: string;
          branch?: string;
          apiKey?: string;
        };

        const client = new SmartAuditClient(apiKey);
        const result: any = await client.auditRepository(repoUrl, branch || 'main');

        return {
          content: [{
            type: 'text',
            text: `# 📁 Repository Audit Started

**Repository**: ${repoUrl}
**Branch**: ${branch || 'main'}
**Session ID**: ${result.sessionId}

Repository audit has been initiated. The analysis will scan all smart contracts in the repository for security vulnerabilities.

Use the \`get_audit_history\` tool to check the progress and results.`
          }]
        };
      }

      case 'get_credit_balance': {
        const { apiKey } = args as { apiKey?: string };
        
        const client = new SmartAuditClient(apiKey);
        const balance = await client.getCreditBalance();

        return {
          content: [{
            type: 'text',
            text: `# 💳 Credit Balance

**Available Credits**: ${balance.credits}
**Subscription Plan**: ${balance.plan.charAt(0).toUpperCase() + balance.plan.slice(1)}
**User ID**: ${balance.userId}

${balance.credits < 10 ? '⚠️ **Low Credits**: Consider upgrading your plan at [smartaudit.ai](https://smartaudit.ai/pricing)' : '✅ **Sufficient Credits**: Ready for analysis!'}`
          }]
        };
      }

      case 'get_audit_history': {
        const { limit, apiKey } = args as { limit?: number; apiKey?: string };
        
        const client = new SmartAuditClient(apiKey);
        const history: any = await client.getAuditHistory(limit || 10);

        let historyText = '# 📋 Audit History\n\n';
        
        if (!history.audits || history.audits.length === 0) {
          historyText += 'No audit history found. Start your first audit with the `audit_smart_contract` tool!';
        } else {
          history.audits.forEach((audit: any, index: number) => {
            historyText += `## ${index + 1}. ${audit.fileName || 'Contract'}\n`;
            historyText += `- **Status**: ${audit.status}\n`;
            historyText += `- **Language**: ${audit.language}\n`;
            historyText += `- **Date**: ${new Date(audit.createdAt).toLocaleString()}\n`;
            historyText += `- **Vulnerabilities**: ${audit.vulnerabilityCount || 'N/A'}\n\n`;
          });
        }

        return {
          content: [{
            type: 'text',
            text: historyText
          }]
        };
      }

      case 'detect_contract_language': {
        const { contractCode } = args as { contractCode: string };
        const detectedLanguage = detectContractLanguage(contractCode);

        return {
          content: [{
            type: 'text',
            text: `# 🔍 Language Detection Result

**Detected Language**: ${detectedLanguage.charAt(0).toUpperCase() + detectedLanguage.slice(1)}

**Confidence Indicators**:
${contractCode.toUpperCase().includes('PRAGMA SOLIDITY') ? '✅ Solidity pragma detected' : ''}
${contractCode.toUpperCase().includes('FN ') ? '✅ Rust function syntax detected' : ''}
${contractCode.toUpperCase().includes('MODULE ') ? '✅ Move module detected' : ''}
${contractCode.toUpperCase().includes('%LANG STARKNET') ? '✅ Cairo/StarkNet detected' : ''}
${contractCode.toUpperCase().includes('@EXTERNAL') ? '✅ Vyper decorator detected' : ''}

Use this language with the \`audit_smart_contract\` tool for optimal analysis.`
          }]
        };
      }

      default:
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error) {
    console.error(`Error executing tool ${name}:`, error);
    
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

/**
 * Start the MCP server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('SmartAudit AI MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});