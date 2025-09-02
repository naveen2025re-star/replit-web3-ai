import * as vscode from 'vscode';
import { SmartAuditAPI } from '../api/smartauditApi';
import { SecureStorage } from '../security/secureStorage';

export class MarketplaceSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'smartauditSidebar';
    
    private _view?: vscode.WebviewView;
    private secureStorage: SecureStorage;
    
    constructor(
        private readonly _extensionUri: vscode.Uri,
        private api: SmartAuditAPI,
        private context: vscode.ExtensionContext
    ) {
        this.secureStorage = SecureStorage.getInstance(context);
    }
    
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;
        
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        
        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            try {
                await this.handleWebviewMessage(data, webviewView);
            } catch (error) {
                console.error('Webview message handling error:', error);
            }
        });
        
        // Auto-refresh data when view becomes visible
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                webviewView.webview.postMessage({ type: 'refresh' });
            }
        });
        
        // Initial data load
        this.loadInitialData(webviewView);
    }
    
    private async handleWebviewMessage(data: any, webviewView: vscode.WebviewView): Promise<void> {
        switch (data.type) {
            case 'getUserInfo':
                await this.loadUserInfo(webviewView);
                break;
                
            case 'getAuditHistory':
                await this.loadAuditHistory(webviewView);
                break;
                
            case 'configureApiKey':
                await this.configureApiKey();
                break;
                
            case 'auditCurrentFile':
                await vscode.commands.executeCommand('smartaudit.auditFile');
                break;
                
            case 'showHistory':
                await vscode.commands.executeCommand('smartaudit.showHistory');
                break;
                
            case 'openDocs':
                vscode.env.openExternal(vscode.Uri.parse('https://docs.smartaudit.ai'));
                break;
                
            case 'openWebApp':
                vscode.env.openExternal(vscode.Uri.parse('https://smartaudit.ai'));
                break;
                
            case 'clearData':
                await this.clearUserData(webviewView);
                break;
        }
    }
    
    private async loadInitialData(webviewView: vscode.WebviewView): Promise<void> {
        await this.loadUserInfo(webviewView);
        await this.loadAuditHistory(webviewView);
    }
    
    private async loadUserInfo(webviewView: vscode.WebviewView): Promise<void> {
        try {
            const userInfo = await this.api.getUserInfo();
            webviewView.webview.postMessage({
                type: 'userInfo',
                data: {
                    ...userInfo,
                    connected: true
                }
            });
        } catch (error) {
            webviewView.webview.postMessage({
                type: 'userInfo',
                data: { 
                    connected: false, 
                    error: 'API key not configured or invalid' 
                }
            });
        }
    }
    
    private async loadAuditHistory(webviewView: vscode.WebviewView): Promise<void> {
        try {
            const history = await this.api.getAuditHistory(10);
            webviewView.webview.postMessage({
                type: 'auditHistory',
                data: history
            });
        } catch (error) {
            webviewView.webview.postMessage({
                type: 'auditHistory',
                data: []
            });
        }
    }
    
    private async configureApiKey(): Promise<void> {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your SmartAudit AI API Key',
            placeHolder: 'sa_xxxxxxxxxxxxxxxx',
            password: true,
            validateInput: (value) => {
                if (!value || !value.startsWith('sa_') || value.length < 20) {
                    return 'Please enter a valid SmartAudit AI API key (starts with sa_)';
                }
                return null;
            }
        });
        
        if (apiKey) {
            try {
                // Store securely
                await this.secureStorage.storeApiKey(apiKey);
                
                // Update configuration for immediate use
                const config = vscode.workspace.getConfiguration('smartaudit');
                await config.update('apiKey', apiKey, vscode.ConfigurationTarget.Global);
                
                vscode.window.showInformationMessage('API key configured successfully!');
                
                // Refresh sidebar
                if (this._view) {
                    this.loadInitialData(this._view);
                }
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to save API key: ${error}`);
            }
        }
    }
    
    private async clearUserData(webviewView: vscode.WebviewView): Promise<void> {
        const confirm = await vscode.window.showWarningMessage(
            'Clear all SmartAudit AI data? This will remove your API key and cached data.',
            { modal: true },
            'Clear Data'
        );
        
        if (confirm === 'Clear Data') {
            try {
                await this.secureStorage.clearApiKey();
                this.secureStorage.clearSession();
                
                // Clear configuration
                const config = vscode.workspace.getConfiguration('smartaudit');
                await config.update('apiKey', undefined, vscode.ConfigurationTarget.Global);
                
                vscode.window.showInformationMessage('SmartAudit AI data cleared successfully');
                
                // Refresh sidebar
                webviewView.webview.postMessage({ type: 'refresh' });
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to clear data: ${error}`);
            }
        }
    }
    
    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Get resource URIs for proper CSP
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'resources', 'sidebar.js')
        );
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource} 'unsafe-inline'; style-src ${webview.cspSource} 'unsafe-inline';">
    <title>SmartAudit AI</title>
    <style>
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            font-weight: var(--vscode-font-weight);
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            margin: 0;
            padding: 16px;
        }
        
        .header {
            display: flex;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        
        .logo {
            width: 32px;
            height: 32px;
            margin-right: 12px;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .title {
            font-weight: bold;
            font-size: 16px;
        }
        
        .section {
            margin-bottom: 24px;
        }
        
        .section-title {
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--vscode-textLink-foreground);
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .user-info {
            background: var(--vscode-badge-background);
            padding: 16px;
            border-radius: 6px;
            margin-bottom: 16px;
            border: 1px solid var(--vscode-widget-border);
        }
        
        .user-info.disconnected {
            background: var(--vscode-inputValidation-errorBackground);
            border-color: var(--vscode-inputValidation-errorBorder);
        }
        
        .credit-balance {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            font-size: 16px;
        }
        
        .user-name {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
            margin-top: 4px;
        }
        
        .button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 16px;
            border-radius: 4px;
            cursor: pointer;
            width: 100%;
            margin-bottom: 8px;
            font-size: 13px;
            font-weight: 500;
            transition: background-color 0.2s ease;
        }
        
        .button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .button.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .button.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .history-item {
            padding: 12px 0;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        
        .history-item:last-child {
            border-bottom: none;
        }
        
        .history-title {
            font-weight: 500;
            margin-bottom: 6px;
            color: var(--vscode-foreground);
        }
        
        .history-meta {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .status-badge {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-weight: 500;
        }
        
        .status-completed {
            background: var(--vscode-testing-iconPassed);
            color: white;
        }
        
        .status-analyzing {
            background: var(--vscode-testing-iconQueued);
            color: white;
        }
        
        .loading {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: 20px;
            font-style: italic;
        }
        
        .error {
            color: var(--vscode-errorForeground);
            background: var(--vscode-inputValidation-errorBackground);
            padding: 12px;
            border-radius: 4px;
            margin-bottom: 12px;
            border: 1px solid var(--vscode-inputValidation-errorBorder);
        }
        
        .quick-actions {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 16px;
        }
        
        .quick-actions .button {
            margin-bottom: 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">SA</div>
        <div class="title">SmartAudit AI</div>
    </div>
    
    <div class="section">
        <div class="quick-actions">
            <button class="button" onclick="auditCurrentFile()">🛡️ Audit File</button>
            <button class="button secondary" onclick="showHistory()">📊 History</button>
        </div>
        <button class="button secondary" onclick="openWebApp()">🌐 Open Web App</button>
    </div>
    
    <div class="section">
        <div class="section-title">Account Status</div>
        <div id="userInfo" class="loading">🔄 Loading account info...</div>
    </div>
    
    <div class="section">
        <div class="section-title">Recent Audits</div>
        <div id="auditHistory" class="loading">🔄 Loading audit history...</div>
    </div>
    
    <div class="section">
        <button class="button secondary" onclick="openDocs()">📚 Documentation</button>
        <button class="button secondary" onclick="configureApiKey()">⚙️ Configure API Key</button>
        <button class="button secondary" onclick="clearData()" style="color: var(--vscode-errorForeground);">🗑️ Clear Data</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function auditCurrentFile() {
            vscode.postMessage({ type: 'auditCurrentFile' });
        }
        
        function showHistory() {
            vscode.postMessage({ type: 'showHistory' });
        }
        
        function configureApiKey() {
            vscode.postMessage({ type: 'configureApiKey' });
        }
        
        function openDocs() {
            vscode.postMessage({ type: 'openDocs' });
        }
        
        function openWebApp() {
            vscode.postMessage({ type: 'openWebApp' });
        }
        
        function clearData() {
            vscode.postMessage({ type: 'clearData' });
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
            
            if (userInfo && userInfo.connected) {
                userInfoEl.innerHTML = \`
                    <div class="user-info">
                        <div class="credit-balance">💰 \${userInfo.credits} Credits</div>
                        <div class="user-name">\${userInfo.displayName || 'Anonymous User'}</div>
                    </div>
                \`;
            } else {
                userInfoEl.innerHTML = \`
                    <div class="user-info disconnected">
                        <div style="color: var(--vscode-errorForeground); font-weight: bold;">❌ Not Connected</div>
                        <div style="font-size: 11px; margin-top: 4px;">Configure your API key to get started</div>
                    </div>
                \`;
            }
        }
        
        function displayAuditHistory(history) {
            const historyEl = document.getElementById('auditHistory');
            
            if (history && history.length > 0) {
                historyEl.innerHTML = history.slice(0, 5).map(audit => {
                    const date = new Date(audit.createdAt).toLocaleDateString();
                    const statusClass = audit.status === 'completed' ? 'status-completed' : 'status-analyzing';
                    
                    return \`
                        <div class="history-item">
                            <div class="history-title">\${audit.title}</div>
                            <div class="history-meta">
                                <span>\${audit.creditsUsed} credits • \${date}</span>
                                <span class="status-badge \${statusClass}">\${audit.status}</span>
                            </div>
                        </div>
                    \`;
                }).join('');
            } else {
                historyEl.innerHTML = '<div class="loading">📝 No audits yet. Start your first audit!</div>';
            }
        }
        
        // Initial load
        refreshData();
        
        // Refresh every 30 seconds
        setInterval(refreshData, 30000);
    </script>
</body>
</html>`;
    }
    
    public refresh(): void {
        if (this._view && this._view.visible) {
            this._view.webview.postMessage({ type: 'refresh' });
        }
    }
}