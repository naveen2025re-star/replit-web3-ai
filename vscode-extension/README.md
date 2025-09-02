# SmartAudit AI VS Code Extension

AI-powered smart contract security analysis directly in VS Code. Audit your Solidity contracts without leaving your development environment.

## Features

- **Right-click Audit**: Right-click any `.sol` file to audit with SmartAudit AI
- **Inline Diagnostics**: Security issues appear as squiggly underlines with hover tooltips
- **Sidebar Panel**: View audit history, credit balance, and manage settings
- **Auto-audit**: Optionally audit files automatically on save
- **Credit Tracking**: Monitor your credit usage directly in VS Code

## Getting Started

### 1. Get Your API Key

1. Visit [SmartAudit AI](https://smartaudit.ai)
2. Connect your wallet and sign up
3. Go to Settings → API Keys
4. Generate a new API key for VS Code

### 2. Configure the Extension

1. Open VS Code Settings (`Cmd/Ctrl + ,`)
2. Search for "SmartAudit"
3. Paste your API key in the "Api Key" field

### 3. Audit Your First Contract

1. Open any `.sol` file in VS Code
2. Right-click in the editor
3. Select "Audit with SmartAudit AI"
4. Wait for results to appear as inline diagnostics

## Commands

- `SmartAudit: Audit with SmartAudit AI` - Audit the current Solidity file
- `SmartAudit: Show Audit History` - View your recent audits
- `SmartAudit: Show Credit Balance` - Check your remaining credits

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `smartaudit.apiKey` | Your SmartAudit AI API key | (required) |
| `smartaudit.apiUrl` | SmartAudit AI API URL | `https://smartaudit-ai.replit.app` |
| `smartaudit.autoAudit` | Auto-audit files on save | `false` |
| `smartaudit.showInlineResults` | Show results as VS Code diagnostics | `true` |

## Security Issues Display

The extension displays security issues using VS Code's built-in diagnostic system:

- 🔴 **Errors**: Critical and high-severity vulnerabilities
- 🟡 **Warnings**: Medium-severity issues  
- 🔵 **Information**: Low-severity issues and suggestions

Hover over any highlighted code to see detailed explanations and recommendations.

## Supported Languages

Currently supports:
- Solidity (`.sol` files)

## Requirements

- VS Code 1.60.0 or higher
- Active SmartAudit AI account with API key
- Internet connection for audit analysis

## Privacy & Security

- Your code is sent securely to SmartAudit AI servers for analysis
- API keys are stored securely in VS Code settings
- All audits are private by default when initiated from VS Code
- No code is stored permanently on SmartAudit AI servers

## Troubleshooting

### "API key not configured"
1. Make sure you've set your API key in VS Code settings
2. Verify the API key is valid by checking Settings → API Keys on SmartAudit AI

### "Cannot connect to SmartAudit AI"
1. Check your internet connection
2. Verify the API URL setting is correct
3. Check if your firewall is blocking the connection

### "Rate limit exceeded"  
1. You've exceeded the hourly request limit for your API key
2. Wait for the rate limit to reset or upgrade your plan
3. Consider reducing auto-audit frequency

## Support

- 📧 Email: support@smartaudit.ai
- 💬 Discord: [Join our community](https://discord.gg/smartaudit)
- 📖 Documentation: [SmartAudit AI Docs](https://docs.smartaudit.ai)

## Release Notes

### 1.0.0
- Initial release
- Basic audit functionality
- Inline diagnostics
- Sidebar panel
- API key authentication