# Manual Installation Guide

## Quick Install Steps

### 1. Copy Extension Folder
Copy the entire `vscode-extension` folder to your local machine.

### 2. Install Dependencies
```bash
cd vscode-extension
npm install
```

### 3. Compile Extension
```bash
npm run compile
```

### 4. Install in VS Code
Since we can't package due to environment limitations, use VS Code's development mode:

1. Open VS Code
2. Go to `File → Open Folder` 
3. Select the `vscode-extension` folder
4. Press F5 to launch Extension Development Host
5. Test in the new window that opens

## Configuration

### API Key Setup
1. In VS Code, go to Settings (Ctrl/Cmd + ,)
2. Search for "smartaudit"
3. Enter your API key in `SmartAudit AI: Api Key`
4. Set API URL: `https://smartaudit-ai.replit.app`

### Language Settings
- **Supported Languages**: Choose which languages to auto-audit
- **Preferred Network**: Set default blockchain network
- **Auto Audit**: Enable auto-audit on file save
- **Show Inline Results**: Display results as VS Code diagnostics

## Testing Checklist

### ✅ Language Detection
- [ ] Solidity (.sol) files detected
- [ ] Rust (.rs) files detected  
- [ ] Move (.move) files detected
- [ ] Cairo (.cairo) files detected
- [ ] Python (.py) files detected
- [ ] TypeScript (.ts) files detected
- [ ] All 17+ languages working

### ✅ Commands Working
- [ ] Right-click "Audit with SmartAudit AI"
- [ ] Command palette commands
- [ ] Language selector shows all languages
- [ ] Network selector shows all networks
- [ ] Credit balance display

### ✅ Smart Features
- [ ] Language-specific icons and descriptions
- [ ] Network compatibility messages
- [ ] Auto-detection confidence scores
- [ ] User language overrides
- [ ] Multi-chain support

## Troubleshooting

**Extension Not Loading:**
- Check VS Code Developer Console (Help → Toggle Developer Tools)
- Look for TypeScript compilation errors
- Ensure all dependencies installed

**Commands Not Appearing:**
- Check file extensions match supported types
- Verify activation events in package.json
- Restart Extension Development Host

**API Connection Issues:**
- Verify API key is set correctly
- Check network connectivity
- Ensure backend server is running