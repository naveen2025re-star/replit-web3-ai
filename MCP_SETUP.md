# Smart Contract Auditor MCP Setup Guide

## Overview

The Smart Contract Auditor Model Context Protocol (MCP) server enables AI-based IDEs like Claude Desktop, VS Code, and Cursor to interact directly with your smart contract auditing system. This allows developers to:

- **Audit smart contracts** directly from their IDE
- **Search the web** for security vulnerability information  
- **Generate secure code** templates and patterns
- **Get vulnerability explanations** with prevention strategies
- **Access audit history** and previous results

## Quick Start

### 1. Build the MCP Server

```bash
# Build the executable MCP server
node mcp-build.js
```

This creates `build/mcp-server.js` - a standalone executable MCP server.

### 2. Test the Server

```bash
# Test that the server starts correctly
node build/mcp-server.js
```

You should see: `Smart Contract Auditor MCP server is running on stdio`

## IDE Integration

### Claude Desktop

1. **Find your config file**:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. **Add the MCP server**:
   ```json
   {
     "mcpServers": {
       "smart-contract-auditor": {
         "command": "node",
         "args": ["/absolute/path/to/your/project/build/mcp-server.js"],
         "env": {
           "NODE_ENV": "production"
         }
       }
     }
   }
   ```

3. **Restart Claude Desktop**

4. **Verify Connection**: You should see the MCP server listed in Claude's available tools.

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

### 🔍 audit_smart_contract
Audit any Solidity smart contract for security vulnerabilities.

**Usage**: 
```
Please audit this smart contract:

pragma solidity ^0.8.0;
contract MyToken {
    mapping(address => uint256) public balances;
    
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount);
        msg.sender.call{value: amount}("");
        balances[msg.sender] -= amount;
    }
}
```

**Returns**: Detailed vulnerability report with severity levels and remediation steps.

### 🌐 search_web  
Search for smart contract security information and best practices.

**Usage**:
```
Search for recent reentrancy attack examples and prevention methods
```

**Returns**: Curated search results from security resources and documentation.

### 📊 get_audit_history
View your previous audit sessions and results.

**Usage**:
```  
Show me my recent contract audits
```

**Returns**: List of previous audits with timestamps and basic info.

### 📚 explain_vulnerability
Get detailed explanations of specific vulnerabilities with code examples.

**Usage**:
```
Explain how integer overflow attacks work in smart contracts
```

**Available vulnerabilities**: `reentrancy`, `integer_overflow`, `access_control`, `unchecked_call`, `denial_of_service`, `front_running`, `timestamp_dependence`, `tx_origin`

### ⚡ generate_secure_code
Generate secure smart contract templates for common patterns.

**Usage**:
```
Generate a secure multisig wallet contract
```

**Available patterns**: `erc20_token`, `erc721_nft`, `multisig_wallet`, `staking_contract`, `governance_token`, `dutch_auction`, `escrow_contract`

## Example Conversations

### Security Audit Workflow
```
User: I have an ERC20 token contract that I need audited. Here's the code: [paste contract]

AI: I'll audit your ERC20 token contract for security vulnerabilities.

[MCP Server runs audit_smart_contract tool]

The audit found 3 vulnerabilities:
- HIGH: Reentrancy vulnerability in transfer function
- MEDIUM: Missing overflow protection  
- LOW: Lack of event emissions

Would you like me to search for examples of how to fix these issues?

User: Yes, show me how to fix the reentrancy issue

AI: I'll search for reentrancy prevention methods.

[MCP Server runs search_web tool]

Here are the best practices I found...
```

### Learning and Development
```
User: I'm new to smart contract security. Can you explain the most common vulnerabilities?

AI: I'll explain the most critical smart contract vulnerabilities.

[MCP Server runs explain_vulnerability for each major vulnerability type]

Here's a comprehensive overview of the top vulnerabilities...

User: Can you generate a secure ERC20 template that avoids these issues?

AI: I'll generate a secure ERC20 token template for you.

[MCP Server runs generate_secure_code tool]

Here's a production-ready secure ERC20 implementation...
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

### Web Search Not Working
- The MCP server uses DuckDuckGo's API with fallback to curated resources
- If internet access is limited, it will use local security resource database
- Check network connectivity and firewall settings

### Audit Results Seem Inaccurate
- The MCP server currently provides demo audit results
- For production use, connect it to your actual AI auditing service
- Modify the `auditSmartContract` function in `server/mcpServer.ts`

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

- The MCP server runs locally and doesn't store sensitive data
- Audit results are stored in your local database
- Web search uses public APIs (DuckDuckGo) - no API keys required
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