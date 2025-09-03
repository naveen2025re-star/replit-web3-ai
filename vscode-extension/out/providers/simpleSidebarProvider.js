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
exports.SimpleSidebarProvider = void 0;
const vscode = __importStar(require("vscode"));
class SimpleSidebarProvider {
    constructor(_extensionUri, api) {
        this._extensionUri = _extensionUri;
        this.api = api;
    }
    resolveWebviewView(webviewView, context, _token) {
        console.log('🎯 SimpleSidebarProvider: resolveWebviewView called!');
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this.getSimpleHTML();
        // Handle messages
        webviewView.webview.onDidReceiveMessage(async (data) => {
            console.log('📧 Message received:', data.type);
            switch (data.type) {
                case 'getUserInfo':
                    try {
                        const userInfo = await this.api.getUserInfo();
                        webviewView.webview.postMessage({
                            type: 'userInfo',
                            data: userInfo
                        });
                        console.log('✅ User info sent');
                    }
                    catch (error) {
                        console.error('❌ Error getting user info:', error);
                        webviewView.webview.postMessage({
                            type: 'userInfo',
                            data: null
                        });
                    }
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'smartaudit.apiKey');
                    break;
            }
        });
        console.log('✅ SimpleSidebarProvider: Webview fully configured');
    }
    getSimpleHTML() {
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
        .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 4px 0;
            width: 100%;
        }
        .btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .status {
            padding: 8px;
            margin: 8px 0;
            border-radius: 4px;
            background: var(--vscode-editor-selectionBackground);
        }
        .loading {
            text-align: center;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <h3>🛡️ SmartAudit AI</h3>
    
    <div id="status" class="status loading">
        ⏳ Loading dashboard...
    </div>
    
    <div id="content" style="display: none;">
        <div id="userInfo">
            <h4>👤 User Account</h4>
            <p id="userName">Loading...</p>
            <p id="credits">Credits: Loading...</p>
        </div>
        
        <div id="actions">
            <h4>🚀 Quick Actions</h4>
            <button class="btn" onclick="openSettings()">⚙️ Configure API Key</button>
            <button class="btn" onclick="auditFile()">🔍 Audit Current File</button>
            <button class="btn" onclick="showHistory()">📊 View History</button>
        </div>
    </div>
    
    <div id="welcome" style="display: none;">
        <div style="text-align: center; padding: 20px;">
            <div style="font-size: 48px; margin-bottom: 16px;">🛡️</div>
            <h3>Welcome to SmartAudit AI!</h3>
            <p>Get started by configuring your API key to begin auditing smart contracts.</p>
            <button class="btn" onclick="openSettings()">⚙️ Configure API Key</button>
            <button class="btn" onclick="getApiKey()">🆆 Get Free API Key</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        // Load user info on startup
        setTimeout(() => {
            vscode.postMessage({ type: 'getUserInfo' });
        }, 500);
        
        function openSettings() {
            vscode.postMessage({ type: 'openSettings' });
        }
        
        function auditFile() {
            vscode.postMessage({ type: 'auditCurrentFile' });
        }
        
        function showHistory() {
            vscode.postMessage({ type: 'showHistory' });
        }
        
        function getApiKey() {
            window.open('https://smartaudit.ai/settings', '_blank');
        }
        
        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            console.log('📨 Received:', message.type);
            
            switch (message.type) {
                case 'userInfo':
                    handleUserInfo(message.data);
                    break;
            }
        });
        
        function handleUserInfo(userInfo) {
            const status = document.getElementById('status');
            const content = document.getElementById('content');
            const welcome = document.getElementById('welcome');
            
            status.style.display = 'none';
            
            if (userInfo && userInfo.credits !== undefined) {
                // User is authenticated
                content.style.display = 'block';
                welcome.style.display = 'none';
                
                document.getElementById('userName').textContent = userInfo.displayName || 'SmartAudit User';
                document.getElementById('credits').textContent = 'Credits: ' + (userInfo.credits || '0');
            } else {
                // No authentication
                content.style.display = 'none';
                welcome.style.display = 'block';
            }
        }
    </script>
</body>
</html>`;
    }
}
exports.SimpleSidebarProvider = SimpleSidebarProvider;
SimpleSidebarProvider.viewType = 'smartauditSidebar';
//# sourceMappingURL=simpleSidebarProvider.js.map