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
exports.SidebarProvider = void 0;
const vscode = __importStar(require("vscode"));
class SidebarProvider {
    constructor(_extensionUri, api) {
        this._extensionUri = _extensionUri;
        this.api = api;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'getUserInfo':
                    try {
                        const userInfo = await this.api.getUserInfo();
                        webviewView.webview.postMessage({
                            type: 'userInfo',
                            data: userInfo
                        });
                    }
                    catch (error) {
                        console.error('Failed to get user info:', error);
                    }
                    break;
                case 'getAuditHistory':
                    try {
                        const history = await this.api.getAuditHistory(10);
                        webviewView.webview.postMessage({
                            type: 'auditHistory',
                            data: history
                        });
                    }
                    catch (error) {
                        console.error('Failed to get audit history:', error);
                    }
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'smartaudit');
                    break;
                case 'auditCurrentFile':
                    vscode.commands.executeCommand('smartaudit.auditFile');
                    break;
            }
        });
        // Auto-refresh data when view becomes visible
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                webviewView.webview.postMessage({ type: 'refresh' });
            }
        });
    }
    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SmartAudit AI</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            font-weight: var(--vscode-font-weight);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 16px;
        }
        
        .header {
            display: flex;
            align-items: center;
            margin-bottom: 16px;
        }
        
        .logo {
            width: 24px;
            height: 24px;
            margin-right: 8px;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 12px;
        }
        
        .title {
            font-weight: bold;
            font-size: 14px;
        }
        
        .section {
            margin-bottom: 20px;
        }
        
        .section-title {
            font-weight: bold;
            margin-bottom: 8px;
            color: var(--vscode-textLink-foreground);
        }
        
        .user-info {
            background: var(--vscode-badge-background);
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 12px;
        }
        
        .credit-balance {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        
        .button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 12px;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            margin-bottom: 8px;
        }
        
        .button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .history-item {
            padding: 8px 0;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        
        .history-title {
            font-weight: 500;
            margin-bottom: 4px;
        }
        
        .history-meta {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        .loading {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: 20px;
        }
        
        .error {
            color: var(--vscode-errorForeground);
            background: var(--vscode-inputValidation-errorBackground);
            padding: 8px;
            border-radius: 4px;
            margin-bottom: 8px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">SA</div>
        <div class="title">SmartAudit AI</div>
    </div>
    
    <div class="section">
        <button class="button" onclick="auditCurrentFile()">🛡️ Audit Current File</button>
        <button class="button" onclick="openSettings()">⚙️ Settings</button>
    </div>
    
    <div class="section">
        <div class="section-title">Account</div>
        <div id="userInfo" class="loading">Loading account info...</div>
    </div>
    
    <div class="section">
        <div class="section-title">Recent Audits</div>
        <div id="auditHistory" class="loading">Loading audit history...</div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function auditCurrentFile() {
            vscode.postMessage({ type: 'auditCurrentFile' });
        }
        
        function openSettings() {
            vscode.postMessage({ type: 'openSettings' });
        }
        
        function refreshData() {
            vscode.postMessage({ type: 'getUserInfo' });
            vscode.postMessage({ type: 'getAuditHistory' });
        }
        
        // Listen for messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'userInfo':
                    displayUserInfo(message.data);
                    break;
                case 'auditHistory':
                    displayAuditHistory(message.data);
                    break;
                case 'refresh':
                    refreshData();
                    break;
            }
        });
        
        function displayUserInfo(userInfo) {
            const userInfoEl = document.getElementById('userInfo');
            if (userInfo) {
                userInfoEl.innerHTML = \`
                    <div class="user-info">
                        <div><strong>\${userInfo.displayName || 'User'}</strong></div>
                        <div class="credit-balance">Credits: \${userInfo.credits}</div>
                    </div>
                \`;
            } else {
                userInfoEl.innerHTML = '<div class="error">Please configure your API key in settings</div>';
            }
        }
        
        function displayAuditHistory(history) {
            const historyEl = document.getElementById('auditHistory');
            
            if (history && history.length > 0) {
                historyEl.innerHTML = history.map(audit => \`
                    <div class="history-item">
                        <div class="history-title">\${audit.title}</div>
                        <div class="history-meta">
                            \${audit.status} • \${audit.creditsUsed} credits • 
                            \${new Date(audit.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                \`).join('');
            } else {
                historyEl.innerHTML = '<div class="loading">No audits yet</div>';
            }
        }
        
        // Initial load
        refreshData();
    </script>
</body>
</html>`;
    }
}
exports.SidebarProvider = SidebarProvider;
SidebarProvider.viewType = 'smartauditSidebar';
//# sourceMappingURL=sidebarProvider.js.map