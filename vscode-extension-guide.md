# SmartAudit AI VS Code Extension

## Architecture Overview

### Authentication Strategy
- Use API keys instead of wallet signatures for VS Code
- Store API keys securely in VS Code settings
- Implement token refresh mechanism

### Core Features

#### 1. **Right-Click Context Menu**
```typescript
// Register command for auditing current file
vscode.commands.registerCommand('smartaudit.auditFile', async () => {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const code = editor.document.getText();
    await auditContract(code);
  }
});
```

#### 2. **Sidebar Panel**
- Audit history
- Credit balance display
- Community audits browser
- Settings configuration

#### 3. **Inline Diagnostics**
```typescript
// Show security issues as VS Code diagnostics
const diagnosticCollection = vscode.languages.createDiagnosticCollection('smartaudit');

function showVulnerabilities(vulnerabilities: any[], document: vscode.TextDocument) {
  const diagnostics = vulnerabilities.map(vuln => {
    const range = new vscode.Range(vuln.line - 1, 0, vuln.line - 1, 100);
    return new vscode.Diagnostic(range, vuln.description, vscode.DiagnosticSeverity.Warning);
  });
  
  diagnosticCollection.set(document.uri, diagnostics);
}
```

## API Integration Plan

### 1. Authentication Endpoint
```typescript
// POST /api/auth/api-key (New endpoint needed)
interface ApiKeyAuth {
  apiKey: string;
  userId: string;
  expiresAt: string;
}
```

### 2. Audit Endpoint
```typescript
// Use existing POST /api/audit/session
const auditResponse = await fetch(`${API_BASE}/api/audit/session`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contractCode: code,
    language: 'solidity',
    visibility: { isPublic: false }
  })
});
```

### 3. File Structure
```
smartaudit-vscode/
├── src/
│   ├── extension.ts          // Main extension entry
│   ├── api/
│   │   ├── client.ts         // API client
│   │   └── types.ts          // TypeScript types
│   ├── providers/
│   │   ├── sidebarProvider.ts // Sidebar webview
│   │   └── diagnosticProvider.ts
│   ├── commands/
│   │   ├── auditFile.ts
│   │   └── showHistory.ts
│   └── utils/
│       └── config.ts         // VS Code settings
├── package.json
├── webpack.config.js
└── resources/              // Icons and assets
```

## Required Backend Changes

### 1. Add API Key Authentication
```typescript
// Add to server/routes.ts
app.post('/api/auth/api-key', async (req, res) => {
  const { userId } = req.body;
  const apiKey = generateApiKey();
  
  // Store in database with expiration
  await storage.createApiKey({
    userId,
    apiKey: hashApiKey(apiKey),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  });
  
  res.json({ apiKey, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) });
});
```

### 2. Modify Existing Endpoints
- Add API key middleware to audit endpoints
- Return structured vulnerability data for VS Code diagnostics
- Add metadata for line numbers and severity levels

## Implementation Steps

### Phase 1: Basic Extension
1. Set up VS Code extension project
2. Implement API key authentication
3. Add right-click audit functionality
4. Basic results display

### Phase 2: Advanced Features  
1. Sidebar panel with audit history
2. Inline diagnostics and hover tooltips
3. Credit balance integration
4. Community audits browser

### Phase 3: Developer Experience
1. Auto-audit on file save (optional)
2. Workspace-level settings
3. Multi-file project auditing
4. Integration with Solidity language server

## VS Code Extension Manifest (package.json)

```json
{
  "name": "smartaudit-ai",
  "displayName": "SmartAudit AI",
  "description": "AI-powered smart contract security analysis",
  "version": "1.0.0",
  "engines": { "vscode": "^1.60.0" },
  "categories": ["Other", "Debuggers", "Linters"],
  "activationEvents": [
    "onLanguage:solidity",
    "onCommand:smartaudit.auditFile"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "smartaudit.auditFile",
        "title": "Audit with SmartAudit AI",
        "category": "SmartAudit"
      }
    ],
    "menus": {
      "editor/context": [
        {
          "command": "smartaudit.auditFile",
          "when": "resourceExtname == .sol",
          "group": "smartaudit"
        }
      ]
    },
    "configuration": {
      "title": "SmartAudit AI",
      "properties": {
        "smartaudit.apiKey": {
          "type": "string",
          "description": "Your SmartAudit AI API key"
        },
        "smartaudit.apiUrl": {
          "type": "string",
          "default": "https://your-app.replit.app",
          "description": "SmartAudit AI API URL"
        }
      }
    }
  }
}
```

## Next Steps

1. **Create API Key System**: Add API key generation and authentication to your backend
2. **VS Code Extension Setup**: Initialize the extension project structure
3. **Core Integration**: Implement basic audit functionality using your existing APIs
4. **Testing**: Test with real smart contracts in VS Code environment
5. **Marketplace**: Publish to VS Code Marketplace

This approach leverages all your existing backend infrastructure while providing a seamless developer experience directly in VS Code.