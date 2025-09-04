# 🛡️ SmartAudit AI MCP Server

Universal smart contract security auditing server compatible with **all AI IDEs** supporting Model Context Protocol (MCP).

## 🚀 Supported AI IDEs

- **Claude Desktop** ✅
- **Cursor** ✅  
- **Continue.dev** ✅
- **Codeium** ✅
- **Windsurf** ✅
- **Any MCP-compatible AI IDE** ✅

## 🎯 Features

### 🔍 **Smart Contract Auditing**
- **17+ Programming Languages**: Solidity, Rust, Move, Cairo, Vyper, Yul, and more
- **Real-time Analysis**: Streaming results with native AI IDE rendering
- **Comprehensive Reports**: Security vulnerabilities, gas optimization, best practices

### 📊 **Repository Analysis**
- **GitHub Integration**: Analyze entire repositories
- **Multi-file Support**: Scan all contracts in a project
- **CI/CD Integration**: Automated security scanning

### 💳 **Credit Management**
- **Balance Tracking**: Monitor audit credits
- **Plan Information**: Free, Pro, Pro+ subscription details
- **Usage History**: Track your audit activities

## 📦 Installation

### 1. Install Package
```bash
npm install -g smartaudit-ai-mcp
```

### 2. Get API Key
1. Visit [SmartAudit AI Dashboard](https://smartaudit.ai/dashboard)
2. Generate your API key
3. Save it for configuration

### 3. Configure AI IDE

#### Claude Desktop
Add to your `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "smartaudit-ai": {
      "command": "smartaudit-ai-mcp",
      "env": {
        "SMARTAUDIT_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

#### Cursor
Add to your MCP configuration:
```json
{
  "mcp": {
    "servers": {
      "smartaudit-ai": {
        "command": ["smartaudit-ai-mcp"],
        "env": {
          "SMARTAUDIT_API_KEY": "your_api_key_here"
        }
      }
    }
  }
}
```

## 🛠️ Available Tools

### `audit_smart_contract`
Perform comprehensive security audit of smart contract code.

```
@smartaudit audit_smart_contract
contractCode: [paste your contract code]
language: solidity
fileName: MyContract.sol
```

### `audit_repository`  
Audit entire GitHub repository for security issues.

```
@smartaudit audit_repository
repoUrl: https://github.com/user/repo
branch: main
```

### `get_credit_balance`
Check your remaining audit credits and plan.

```
@smartaudit get_credit_balance
```

### `get_audit_history`
Retrieve your recent audit history.

```
@smartaudit get_audit_history
limit: 10
```

### `detect_contract_language`
Automatically detect smart contract programming language.

```
@smartaudit detect_contract_language
contractCode: [paste code to analyze]
```

## 💡 Usage Examples

### Example 1: Audit Solidity Contract
```
Hey Claude, can you audit this smart contract for security issues?

@smartaudit audit_smart_contract
contractCode: |
  pragma solidity ^0.8.0;
  contract Example {
    uint256 public value;
    function setValue(uint256 _value) public {
      value = _value;
    }
  }
language: solidity
fileName: Example.sol
```

### Example 2: Check Credits
```
@smartaudit get_credit_balance
```

### Example 3: Repository Audit
```
Please analyze this DeFi project for security vulnerabilities:

@smartaudit audit_repository
repoUrl: https://github.com/compound-finance/compound-protocol
```

## 🎨 Benefits vs VS Code Extension

| Feature | MCP Server | VS Code Extension |
|---------|------------|-------------------|
| **AI IDE Support** | ✅ Universal (Claude, Cursor, etc.) | ❌ VS Code only |
| **Markdown Rendering** | ✅ Native AI rendering | ⚠️ Custom webview |
| **Streaming Display** | ✅ Built-in AI streaming | ⚠️ Complex implementation |
| **Maintenance** | ✅ Single codebase | ❌ Multiple extensions |
| **User Experience** | ✅ Natural AI chat | ⚠️ Custom interface |

## 🔧 Development

### Local Development
```bash
git clone <repo>
cd mcp-server
npm install
cp .env.example .env
# Edit .env with your API key
npm run dev
```

### Building
```bash
npm run build
```

## 📋 Requirements

- **Node.js**: 18.0.0 or higher
- **SmartAudit AI API Key**: Get from [dashboard](https://smartaudit.ai/dashboard)
- **MCP-compatible AI IDE**: Claude Desktop, Cursor, Continue.dev, etc.

## 🆘 Support

- **Documentation**: [SmartAudit AI Docs](https://docs.smartaudit.ai)
- **API Reference**: [API Documentation](https://api.smartaudit.ai/docs)
- **Discord**: [Join Community](https://discord.gg/smartaudit)

## 📄 License

MIT License - See LICENSE file for details.