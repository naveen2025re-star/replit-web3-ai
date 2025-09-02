# SmartAudit AI - MCP Integration Guide

![SmartAudit AI MCP](https://via.placeholder.com/800x200/1e293b/ffffff?text=SmartAudit+AI+MCP)

Connect your smart contract auditing to Claude, Cursor, or Windsurf using our Model Context Protocol integration. Built for developers who want AI-powered security analysis directly in their development environment.

## What is SmartAudit AI MCP?

SmartAudit AI MCP is a secure, real-time connection between your favorite AI assistants and our smart contract auditing platform. Get comprehensive security analysis, vulnerability detection, and optimization suggestions without leaving your IDE.

### Key Features:
- **🔐 Web3 Authentication**: Connect securely using your wallet
- **🔍 Real-time Auditing**: Comprehensive security analysis powered by AI
- **💰 Credit Management**: Track usage and manage your audit credits
- **📊 Audit History**: Access previous audit results and reports
- **🚀 IDE Integration**: Works with Claude Desktop, Cursor, and Windsurf

## Quick Setup (Remote Connection)

### Step 1: Choose Your AI Assistant

You can connect SmartAudit AI MCP with:
- **Claude Desktop** (latest version)
- **Cursor** 
- **Windsurf**
- Any MCP-compatible AI assistant

### Step 2: Add SmartAudit AI MCP to Your Config

**For Claude Desktop:**

Go to Settings > Developer > Add/Edit Config and paste:

```json
{
  "mcpServers": {
    "smartaudit-ai": {
      "command": "npx",
      "args": ["mcp-remote", "YOUR_DEPLOYED_URL/mcp/stream"]
    }
  }
}
```

**For Cursor or Windsurf:**

Go to Settings > Tools & Integrations > Add Custom MCP and paste:

```json
{
  "mcpServers": {
    "smartaudit-ai": {
      "url": "YOUR_DEPLOYED_URL/mcp/stream"
    }
  }
}
```

### Step 3: Authenticate Your Wallet

Once connected, authenticate by saying:
```
"Authenticate my wallet: 0x[your-wallet-address]"
```

The AI will guide you through the connection process and show your available credits.

### VS Code with Claude Extension

1. **Install Claude Dev extension**
2. **Open VS Code settings** (Cmd/Ctrl + ,)
3. **Search for "claude-dev"**
4. **Add MCP server config**:
   ```json
   {
     "claude-dev.mcpServers": {
       "smart-contract-auditor": {
         "command": "node",
         "args": ["./build/mcp-server.js"],
         "cwd": "/absolute/path/to/your/project"
       }
     }
   }
   ```

### Cursor IDE

1. **Create/Edit** `~/.cursor/mcp_servers.json`:
   ```json
   {
     "servers": {
       "smart-contract-auditor": {
         "command": "node",
         "args": ["/absolute/path/to/your/project/build/mcp-server.js"]
       }
     }
   }
   ```

2. **Restart Cursor**

## Available Tools

### 🔐 authenticate
Authenticate with your wallet address to access auditing features.

**Usage**: 
```
Please authenticate me with wallet address 0x1234567890123456789012345678901234567890
```

**Returns**: Authentication status, user ID, and current credit balance.

### 💳 get_credits
View your credit balance, transaction history, and available packages.

**Usage**:
```
Show me my current credit balance and purchase options
```

**Returns**: Current balance, recent transactions, and available credit packages.

### 🔍 audit_smart_contract
Audit any Solidity smart contract for security vulnerabilities. **Cost: 10 credits**

**Usage**: 
```
Audit this smart contract:

pragma solidity ^0.8.0;
contract MyToken {
    mapping(address => uint256) public balances;
    
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount);
        payable(msg.sender).transfer(amount);
        balances[msg.sender] -= amount;
    }
}
```

**Returns**: Detailed vulnerability report with severity levels, gas optimizations, and remediation steps.

### 📦 bulk_audit
Audit multiple smart contracts at once with bulk discount. **Cost: 8 credits each**

**Usage**:
```
Perform bulk audit on these contracts:
1. [Contract A code]
2. [Contract B code] 
3. [Contract C code]
```

**Returns**: Summary results for all contracts with individual session IDs.

### 📊 get_audit_history
View your previous audit sessions and results.

**Usage**:
```  
Show me my recent contract audits
```

**Returns**: List of previous audits with session IDs, timestamps, and status.

## Example Conversations

### Security Audit Workflow
```
User: Please authenticate me with wallet address 0x123...

AI: Authentication successful! You have 50 credits available. You can now use the auditing features.

User: I have an ERC20 token contract that I need audited. Here's the code: [paste contract]

AI: I'll audit your ERC20 token contract for security vulnerabilities.

[MCP Server runs audit_smart_contract tool]

The audit found 3 vulnerabilities (10 credits used, 40 remaining):
- HIGH: Reentrancy vulnerability in transfer function
- MEDIUM: Missing overflow protection  
- LOW: Lack of event emissions

Session ID: audit-123456 - use this to reference or share this audit.
```

### Bulk Audit Workflow
```
User: I need to audit 5 contracts for my DeFi protocol

AI: I can perform a bulk audit with our discount rate (8 credits per contract instead of 10). 

[MCP Server runs bulk_audit tool]

Bulk audit complete! Results:
- Contract A: 2 vulnerabilities found
- Contract B: 0 vulnerabilities (secure)
- Contract C: 3 vulnerabilities found
- Contract D: 1 vulnerability found  
- Contract E: 0 vulnerabilities (secure)

Total: 40 credits used, 10 credits remaining
Individual session IDs provided for detailed reports.
```

## Troubleshooting

### MCP Server Won't Start
- Ensure Node.js 18+ is installed
- Check that all dependencies are installed: `npm install`
- Verify the build completed successfully: `ls -la build/mcp-server.js`

### IDE Can't Find MCP Server  
- Use absolute paths in configuration files
- Ensure the MCP server executable has correct permissions: `chmod +x build/mcp-server.js`
- Check IDE logs for connection errors

### Authentication Issues
- Ensure wallet address format is correct (0x + 40 hex characters)
- Verify you have a registered account in the system
- Check that your wallet address is properly connected

### Insufficient Credits
- Check your credit balance with the `get_credits` tool
- Purchase additional credits through the web interface
- Bulk audits offer better value (8 credits vs 10 credits per contract)

## Advanced Configuration

### Custom Environment Variables
Add to your IDE's MCP server config:
```json
{
  "env": {
    "NODE_ENV": "production",
    "LOG_LEVEL": "info",
    "MAX_SEARCH_RESULTS": "15"
  }
}
```

### HTTP Mode (for Remote Access)
To run the MCP server over HTTP instead of stdio:

```bash
# Modify server/mcpServer.ts to use StreamableHTTPServerTransport
# Then build and run on a specific port
node build/mcp-server.js --http --port 3001
```

## Security Notes

- The MCP server connects to your secure auditing backend
- Authentication is required for all auditing operations
- Audit results are stored securely with session tracking
- Credit usage is tracked and auditable
- No smart contract code is sent to external services without explicit consent

## Development

To modify or extend the MCP server:

1. Edit `server/mcpServer.ts`
2. Rebuild: `node mcp-build.js`  
3. Test changes: `node build/mcp-server.js`
4. Update your IDE configuration if needed

The server is built using the official Model Context Protocol TypeScript SDK and follows all MCP specifications for maximum compatibility.

---

🎉 **You're now ready to use AI-powered smart contract auditing directly in your development environment!**