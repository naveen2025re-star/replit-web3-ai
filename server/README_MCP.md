# SmartAudit MCP HTTP API

## 🎯 Complete Standard MCP Implementation

This implementation provides a **standard MCP HTTP API** that AI assistants can call directly, following Anthropic's MCP Streamable HTTP Transport specification (2025-03-26).

## 🚀 Quick Start

### Running the MCP Server

```bash
# From project root
cd server && tsx standardMCP.ts

# Server will start on port 5001
# API endpoint: http://localhost:5001/mcp
```

### Testing with curl

```bash
# 1. List available tools
curl -X GET "http://localhost:5001/mcp" \
  -H "X-API-Key: your_api_key_here" \
  -H "Accept: application/json"

# 2. Detect contract language
curl -X POST "http://localhost:5001/mcp" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test_1",
    "method": "tools/call",
    "params": {
      "name": "detect_contract_language",
      "arguments": {
        "contractCode": "pragma solidity ^0.8.0;\n\ncontract SimpleStorage {\n    uint256 storedData;\n}"
      }
    }
  }'

# 3. Audit smart contract (streaming response)
curl -X POST "http://localhost:5001/mcp" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -H "Accept: text/event-stream" \
  -d '{
    "jsonrpc": "2.0",
    "id": "audit_1",
    "method": "tools/call",
    "params": {
      "name": "audit_smart_contract",
      "arguments": {
        "contractCode": "pragma solidity ^0.8.0;\n\ncontract SimpleStorage {\n    uint256 storedData;\n\n    function set(uint256 x) public {\n        storedData = x;\n    }\n\n    function get() public view returns (uint256) {\n        return storedData;\n    }\n}",
        "language": "solidity",
        "fileName": "SimpleStorage.sol"
      }
    }
  }'
```

## 🛠️ Available Tools

### 1. `audit_smart_contract`
Perform comprehensive security audit with real-time streaming analysis.

**Parameters:**
- `contractCode` (required): Smart contract source code
- `language` (optional): Programming language (solidity, rust, move, cairo, vyper)
- `fileName` (optional): Filename for context

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": "audit_1",
  "method": "tools/call",
  "params": {
    "name": "audit_smart_contract",
    "arguments": {
      "contractCode": "pragma solidity ^0.8.0;...",
      "language": "solidity",
      "fileName": "MyContract.sol"
    }
  }
}
```

### 2. `analyze_multiple_contracts`
Analyze multiple contract files from IDE workspace.

**Parameters:**
- `contracts` (required): Array of contract objects with fileName, content, language

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": "multi_1",
  "method": "tools/call",
  "params": {
    "name": "analyze_multiple_contracts",
    "arguments": {
      "contracts": [
        {
          "fileName": "Contract1.sol",
          "content": "pragma solidity ^0.8.0;...",
          "language": "solidity"
        },
        {
          "fileName": "Contract2.sol", 
          "content": "contract Token {...}",
          "language": "solidity"
        }
      ]
    }
  }
}
```

### 3. `get_credit_balance`
Check remaining audit credits and subscription plan.

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": "credits_1",
  "method": "tools/call",
  "params": {
    "name": "get_credit_balance",
    "arguments": {}
  }
}
```

### 4. `detect_contract_language`
Automatically detect programming language of smart contract code.

**Parameters:**
- `contractCode` (required): Contract source code to analyze

**Example:**
```json
{
  "jsonrpc": "2.0",
  "id": "detect_1", 
  "method": "tools/call",
  "params": {
    "name": "detect_contract_language",
    "arguments": {
      "contractCode": "pragma solidity ^0.8.0;\n\ncontract MyContract {...}"
    }
  }
}
```

## 📋 Response Formats

### Standard JSON Response
```json
{
  "jsonrpc": "2.0",
  "id": "request_id",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Analysis results in markdown format..."
      }
    ]
  }
}
```

### Streaming Response (SSE)
```
data: {"jsonrpc": "2.0", "id": "audit_1", "result": {"content": [{"type": "text", "text": "# Starting audit..."}]}}

data: {"jsonrpc": "2.0", "method": "content/chunk", "params": {"content": "## Vulnerabilities found..."}}

data: {"jsonrpc": "2.0", "method": "stream/complete", "params": {}}
```

### Error Response
```json
{
  "jsonrpc": "2.0",
  "id": "request_id",
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": "Additional error details"
  }
}
```

## 🔐 Authentication

Include API key in requests:

**Option 1: X-API-Key Header**
```
X-API-Key: your_api_key_here
```

**Option 2: Authorization Header**
```
Authorization: Bearer your_api_key_here
```

## 🌐 CORS Support

The server includes full CORS support for cross-origin requests from AI IDEs and web applications.

**Allowed Origins:** `*` (all origins)
**Allowed Methods:** `GET, POST, OPTIONS`
**Allowed Headers:** `Content-Type, X-API-Key, Authorization, Mcp-Session-Id, Accept`

## 🔄 Session Management

The server automatically manages sessions using `Mcp-Session-Id` headers for tracking user interactions and maintaining context across multiple requests.

## 🚦 Health Check

```bash
curl http://localhost:5001/health
```

Response:
```json
{
  "status": "healthy",
  "server": "SmartAudit MCP Server",
  "version": "1.0.0",
  "timestamp": "2025-01-07T..."
}
```

## 🎯 AI Assistant Integration Examples

### Claude/ChatGPT Integration
AI assistants can directly call the MCP endpoint to audit smart contracts:

```javascript
// AI assistant can make this HTTP request
const response = await fetch('http://localhost:5001/mcp', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'user_api_key',
    'Accept': 'text/event-stream'
  },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 'audit_request_1',
    method: 'tools/call',
    params: {
      name: 'audit_smart_contract',
      arguments: {
        contractCode: userProvidedCode,
        language: 'solidity',
        fileName: 'UserContract.sol'
      }
    }
  })
});
```

### IDE Extension Integration
VS Code extensions and other IDE tools can integrate directly:

```typescript
import { EventSource } from 'eventsource';

const audit = new EventSource('http://localhost:5001/mcp', {
  method: 'POST',
  headers: {
    'X-API-Key': apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(auditRequest)
});

audit.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.method === 'content/chunk') {
    displayAuditResults(data.params.content);
  }
};
```

## 🏗️ Architecture

- **Framework:** Express.js with TypeScript
- **Protocol:** JSON-RPC 2.0 over HTTP
- **Transport:** Streamable HTTP (MCP 2025-03-26 standard)
- **Authentication:** API key based
- **Streaming:** Server-Sent Events (SSE) for real-time responses
- **Language Support:** Solidity, Rust, Move, Cairo, Vyper, Yul

## 📚 Compliance

This implementation fully complies with:
- ✅ Anthropic MCP Streamable HTTP Transport (2025-03-26)
- ✅ JSON-RPC 2.0 Specification
- ✅ OpenAPI 3.0 Compatible
- ✅ Universal AI IDE Compatibility
- ✅ CORS Standards
- ✅ RESTful API Principles

---

**Ready for Production Use** 🚀

The MCP server provides a robust, standards-compliant API that any AI assistant can integrate with for smart contract auditing capabilities.