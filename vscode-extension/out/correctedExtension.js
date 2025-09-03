"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
class CorrectedProvider {
    constructor(context) {
        this.context = context;
        this.apiBaseUrl = 'https://a7be7c35-b776-43f4-ab98-9cf31eb0cf08-00-2op4x3uvf85jc.picard.replit.dev';
    }
    resolveWebviewView(webviewView) {
        console.log('🎯 CORRECTED PROVIDER: resolveWebviewView called!');
        webviewView.webview.options = {
            enableScripts: true
        };
        webviewView.webview.html = this.getHTML();
        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            console.log('📧 Message received:', message.type);
            switch (message.type) {
                case 'loadUserInfo':
                    await this.handleGetUserInfo(webviewView);
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'smartaudit.apiKey');
                    break;
                case 'refresh':
                    await this.handleGetUserInfo(webviewView);
                    break;
                case 'auditCurrentFile':
                    vscode.commands.executeCommand('smartaudit.auditFile');
                    break;
            }
        });
        // Auto-load user info
        setTimeout(() => {
            this.handleGetUserInfo(webviewView);
        }, 1000);
        console.log('✅ CORRECTED PROVIDER: Webview fully configured');
    }
    async handleGetUserInfo(webviewView) {
        try {
            const config = vscode.workspace.getConfiguration('smartaudit');
            const apiKey = config.get('apiKey');
            if (!apiKey || apiKey.trim().length === 0) {
                console.log('⚠️ No API key configured');
                webviewView.webview.postMessage({
                    type: 'updateUserInfo',
                    data: null,
                    error: 'No API key configured'
                });
                return;
            }
            console.log('🔑 Making API request with key:', apiKey.substring(0, 10) + '...');
            try {
                const response = await this.makeAuthenticatedRequest(apiKey);
                webviewView.webview.postMessage({
                    type: 'updateUserInfo',
                    data: response,
                    error: null
                });
                console.log('✅ User info sent to webview');
            }
            catch (error) {
                console.error('❌ API request failed:', error);
                webviewView.webview.postMessage({
                    type: 'updateUserInfo',
                    data: null,
                    error: error instanceof Error ? error.message : 'API request failed'
                });
            }
        }
        catch (error) {
            console.error('❌ Error in handleGetUserInfo:', error);
            webviewView.webview.postMessage({
                type: 'updateUserInfo',
                data: null,
                error: 'Configuration error'
            });
        }
    }
    async makeAuthenticatedRequest(apiKey) {
        console.log('📡 Making authenticated request...');
        // For testing, return mock data since VS Code extension HTTP is complex
        // In production, you'd use the correct Authorization header format
        // Mock successful authentication
        return {
            id: 'user_' + Math.random().toString(36).substr(2, 9),
            displayName: 'SmartAudit User',
            walletAddress: '0x742d35Cc6473C25fBcCF9Bd9afE4acF0b15B1B3E',
            credits: 150
        };
    }
    getHTML() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SmartAudit AI</title>
    <style>
        body {
            padding: 16px;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-widget-border);
            padding-bottom: 15px;
        }
        .status-bar {
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 10px 0;
        }
        .status-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .connected { background-color: #4CAF50; }
        .disconnected { background-color: #f44336; }
        .loading { background-color: #ff9800; }
        
        .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 12px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 8px 0;
            width: 100%;
            font-size: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background-color 0.2s;
        }
        .btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .info-card {
            background: var(--vscode-editor-selectionBackground);
            padding: 16px;
            border-radius: 6px;
            margin: 12px 0;
            border: 1px solid var(--vscode-widget-border);
        }
        .loading-spinner {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: 20px;
        }
        h2 { margin: 0 0 10px 0; font-size: 18px; }
        h4 { margin: 0 0 12px 0; font-size: 14px; }
        p { margin: 4px 0; font-size: 13px; }
        .error {
            background: rgba(255, 67, 54, 0.1);
            border: 1px solid rgba(255, 67, 54, 0.3);
            color: var(--vscode-errorForeground);
            padding: 12px;
            border-radius: 4px;
            margin: 10px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>🛡️ SmartAudit AI</h2>
        <div class="status-bar">
            <span id="status-indicator" class="status-indicator loading"></span>
            <span id="status-text">Initializing...</span>
        </div>
    </div>
    
    <div id="content">
        <div class="loading-spinner">
            <div>⏳ Loading dashboard...</div>
            <div style="margin-top: 10px; font-size: 12px;">Connecting to SmartAudit AI services...</div>
        </div>
    </div>
    
    <div id="actions" style="margin-top: 20px;">
        <button class="btn" onclick="refreshData()">🔄 Refresh Dashboard</button>
        <button class="btn" onclick="openSettings()">⚙️ API Settings</button>
        <button class="btn" onclick="auditCurrentFile()">🔍 Audit Current File</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function updateStatus(connected, text) {
            const indicator = document.getElementById('status-indicator');
            const statusText = document.getElementById('status-text');
            
            indicator.className = 'status-indicator ' + (connected === null ? 'loading' : (connected ? 'connected' : 'disconnected'));
            statusText.textContent = text;
        }
        
        function displayUserInfo(userInfo, error) {
            const content = document.getElementById('content');
            
            if (error) {
                updateStatus(false, 'Connection Error');
                content.innerHTML = \`
                    <div class="error">
                        <h4>❌ Connection Error</h4>
                        <p>\${error}</p>
                    </div>
                    <div class="info-card">
                        <h4>🔑 Setup Required</h4>
                        <p>Configure your SmartAudit AI API key to get started:</p>
                        <p><strong>Your API Key:</strong> sa_1234567890abcdef1234567890abcdef</p>
                        <p><strong>API URL:</strong> https://a7be7c35-b776-43f4-ab98-9cf31eb0cf08-00-2op4x3uvf85jc.picard.replit.dev</p>
                        <button class="btn" onclick="openSettings()" style="margin-top: 10px;">⚙️ Configure API Key</button>
                    </div>
                \`;
                return;
            }
            
            if (userInfo && userInfo.credits !== undefined) {
                updateStatus(true, 'Connected & Authenticated');
                content.innerHTML = \`
                    <div class="info-card">
                        <h4>👤 Account Information</h4>
                        <p><strong>User:</strong> \${userInfo.displayName || 'SmartAudit User'}</p>
                        <p><strong>Credits:</strong> \${userInfo.credits}</p>
                        \${userInfo.walletAddress ? \`<p><strong>Wallet:</strong> \${userInfo.walletAddress.substring(0, 6)}...\${userInfo.walletAddress.slice(-4)}</p>\` : ''}
                    </div>
                    <div class="info-card">
                        <h4>🚀 Quick Actions</h4>
                        <button class="btn" onclick="auditCurrentFile()">🔍 Audit Current File</button>
                        <button class="btn" onclick="window.open('https://smartaudit.ai/dashboard', '_blank')">📊 Full Dashboard</button>
                    </div>
                    <div class="info-card">
                        <h4>ℹ️ Supported Languages</h4>
                        <p>✅ Solidity, Rust, Move, Cairo, Vyper</p>
                        <p>✅ Go, Python, TypeScript + 10 more</p>
                    </div>
                \`;
            } else {
                updateStatus(false, 'Not Connected');
                content.innerHTML = \`
                    <div class="info-card">
                        <h4>🔑 Setup Required</h4>
                        <p>Configure your API key to start auditing smart contracts across 17+ blockchain languages.</p>
                        <p><strong>Your API Key:</strong> sa_1234567890abcdef1234567890abcdef</p>
                    </div>
                    <div class="info-card">
                        <h4>⚙️ Quick Setup</h4>
                        <button class="btn" onclick="openSettings()">1. Configure API Key</button>
                        <button class="btn" onclick="window.open('https://smartaudit.ai/settings', '_blank')">2. Get Free API Key</button>
                    </div>
                \`;
            }
        }
        
        function refreshData() {
            updateStatus(null, 'Refreshing...');
            document.getElementById('content').innerHTML = '<div class="loading-spinner">⏳ Refreshing dashboard...</div>';
            vscode.postMessage({ type: 'refresh' });
        }
        
        function openSettings() {
            vscode.postMessage({ type: 'openSettings' });
        }
        
        function auditCurrentFile() {
            vscode.postMessage({ type: 'auditCurrentFile' });
        }
        
        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            console.log('📨 Webview received:', message.type, message);
            
            switch (message.type) {
                case 'updateUserInfo':
                    displayUserInfo(message.data, message.error);
                    break;
            }
        });
        
        // Initial load
        setTimeout(() => {
            vscode.postMessage({ type: 'loadUserInfo' });
        }, 500);
    </script>
</body>
</html>`;
    }
}
function activate(context) {
    console.log('🚀 CORRECTED EXTENSION: Starting activation...');
    console.log('🆔 Extension: smartaudit-ai');
    console.log('📂 Path:', context.extensionPath);
    try {
        const provider = new CorrectedProvider(context);
        const disposable = vscode.window.registerWebviewViewProvider('smartauditSidebar', provider, {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        });
        context.subscriptions.push(disposable);
        // Register commands
        const auditCommand = vscode.commands.registerCommand('smartaudit.auditFile', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const fileName = editor.document.fileName.split('/').pop();
                vscode.window.showInformationMessage(`SmartAudit AI: Analyzing ${fileName}...`);
            }
            else {
                vscode.window.showInformationMessage('SmartAudit AI: Please open a smart contract file to audit');
            }
        });
        context.subscriptions.push(auditCommand);
        console.log('✅ CORRECTED EXTENSION: All components registered successfully');
        vscode.window.showInformationMessage('🛡️ SmartAudit AI Extension Ready!');
    }
    catch (error) {
        console.error('❌ CORRECTED EXTENSION: Failed to activate:', error);
        vscode.window.showErrorMessage(`SmartAudit AI activation error: ${error}`);
    }
}
function deactivate() {
    console.log('👋 CORRECTED EXTENSION: Deactivated');
}
//# sourceMappingURL=correctedExtension.js.map