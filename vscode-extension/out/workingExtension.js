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
const https = __importStar(require("https"));
class WorkingProvider {
    constructor(context) {
        this.context = context;
        this.apiBaseUrl = 'https://a7be7c35-b776-43f4-ab98-9cf31eb0cf08-00-2op4x3uvf85jc.picard.replit.dev';
    }
    resolveWebviewView(webviewView) {
        console.log('🎯 WORKING PROVIDER: resolveWebviewView called!');
        webviewView.webview.options = {
            enableScripts: true
        };
        webviewView.webview.html = this.getHTML();
        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            console.log('📧 Message received:', message.type);
            switch (message.type) {
                case 'getUserInfo':
                    await this.handleGetUserInfo(webviewView);
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'smartaudit.apiKey');
                    break;
                case 'refresh':
                    webviewView.webview.html = this.getHTML();
                    break;
            }
        });
        console.log('✅ WORKING PROVIDER: Webview fully configured');
    }
    async handleGetUserInfo(webviewView) {
        try {
            const config = vscode.workspace.getConfiguration('smartaudit');
            const apiKey = config.get('apiKey');
            if (!apiKey || apiKey.trim().length === 0) {
                console.log('⚠️ No API key configured');
                webviewView.webview.postMessage({
                    type: 'userInfo',
                    data: null
                });
                return;
            }
            console.log('🔑 Making API request with key:', apiKey.substring(0, 10) + '...');
            const userInfo = await this.fetchUserInfo(apiKey);
            webviewView.webview.postMessage({
                type: 'userInfo',
                data: userInfo
            });
            console.log('✅ User info sent to webview');
        }
        catch (error) {
            console.error('❌ Error getting user info:', error);
            webviewView.webview.postMessage({
                type: 'userInfo',
                data: null
            });
        }
    }
    fetchUserInfo(apiKey) {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify({ apiKey });
            const options = {
                hostname: 'a7be7c35-b776-43f4-ab98-9cf31eb0cf08-00-2op4x3uvf85jc.picard.replit.dev',
                path: '/api/vscode/auth',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    try {
                        if (res.statusCode === 200) {
                            const response = JSON.parse(data);
                            console.log('✅ API Response:', response);
                            resolve(response.user || response);
                        }
                        else {
                            console.log('❌ API Error:', res.statusCode, data);
                            resolve(null);
                        }
                    }
                    catch (err) {
                        console.error('❌ JSON Parse Error:', err);
                        resolve(null);
                    }
                });
            });
            req.on('error', (err) => {
                console.error('❌ Request Error:', err);
                resolve(null);
            });
            req.write(postData);
            req.end();
        });
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
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 6px 0;
            width: 100%;
            font-size: 14px;
        }
        .btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .info-card {
            background: var(--vscode-editor-selectionBackground);
            padding: 12px;
            border-radius: 6px;
            margin: 10px 0;
        }
        .loading {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: 20px;
        }
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .connected {
            background-color: #00ff00;
        }
        .disconnected {
            background-color: #ff0000;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>🛡️ SmartAudit AI</h2>
        <div id="status">
            <span class="status-indicator disconnected"></span>
            <span>Connecting...</span>
        </div>
    </div>
    
    <div id="content">
        <div class="loading">
            ⏳ Loading dashboard...
        </div>
    </div>
    
    <div id="actions" style="margin-top: 20px;">
        <button class="btn" onclick="refreshData()">🔄 Refresh</button>
        <button class="btn" onclick="openSettings()">⚙️ Configure Settings</button>
        <button class="btn" onclick="openDocs()">📚 Documentation</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        // Load data on startup
        setTimeout(() => {
            loadUserInfo();
        }, 500);
        
        function loadUserInfo() {
            vscode.postMessage({ type: 'getUserInfo' });
        }
        
        function refreshData() {
            document.getElementById('content').innerHTML = '<div class="loading">⏳ Refreshing...</div>';
            loadUserInfo();
        }
        
        function openSettings() {
            vscode.postMessage({ type: 'openSettings' });
        }
        
        function openDocs() {
            window.open('https://smartaudit.ai/docs', '_blank');
        }
        
        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            console.log('📨 Webview received:', message.type);
            
            switch (message.type) {
                case 'userInfo':
                    displayUserInfo(message.data);
                    break;
            }
        });
        
        function displayUserInfo(userInfo) {
            const content = document.getElementById('content');
            const status = document.getElementById('status');
            
            if (userInfo && userInfo.credits !== undefined) {
                // Connected and authenticated
                status.innerHTML = '<span class="status-indicator connected"></span><span>Connected</span>';
                
                content.innerHTML = \`
                    <div class="info-card">
                        <h4>👤 Account Info</h4>
                        <p><strong>User:</strong> \${userInfo.displayName || 'SmartAudit User'}</p>
                        <p><strong>Credits:</strong> \${userInfo.credits || 0}</p>
                        \${userInfo.walletAddress ? \`<p><strong>Wallet:</strong> \${userInfo.walletAddress.substring(0, 6)}...\${userInfo.walletAddress.slice(-4)}</p>\` : ''}
                    </div>
                    <div class="info-card">
                        <h4>🚀 Quick Actions</h4>
                        <button class="btn" onclick="auditCurrentFile()">🔍 Audit Current File</button>
                        <button class="btn" onclick="viewHistory()">📊 View Audit History</button>
                    </div>
                \`;
            } else {
                // No API key or not authenticated
                status.innerHTML = '<span class="status-indicator disconnected"></span><span>Not Connected</span>';
                
                content.innerHTML = \`
                    <div class="info-card">
                        <h4>🔑 Setup Required</h4>
                        <p>Configure your API key to start auditing smart contracts across 17+ blockchain languages.</p>
                        <button class="btn" onclick="openSettings()">⚙️ Configure API Key</button>
                        <button class="btn" onclick="getApiKey()">🆆 Get Free API Key</button>
                    </div>
                \`;
            }
        }
        
        function auditCurrentFile() {
            vscode.postMessage({ type: 'auditCurrentFile' });
        }
        
        function viewHistory() {
            vscode.postMessage({ type: 'showHistory' });
        }
        
        function getApiKey() {
            window.open('https://smartaudit.ai/settings', '_blank');
        }
    </script>
</body>
</html>`;
    }
}
function activate(context) {
    console.log('🚀 WORKING EXTENSION: Starting activation...');
    const provider = new WorkingProvider(context);
    const disposable = vscode.window.registerWebviewViewProvider('smartauditSidebar', provider);
    context.subscriptions.push(disposable);
    console.log('✅ WORKING EXTENSION: Webview provider registered for smartauditSidebar');
    console.log('🎉 WORKING EXTENSION: Activation complete!');
}
function deactivate() {
    console.log('👋 WORKING EXTENSION: Deactivated');
}
//# sourceMappingURL=workingExtension.js.map