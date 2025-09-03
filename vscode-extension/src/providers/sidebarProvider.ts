import * as vscode from 'vscode';
import { SmartAuditAPI } from '../api/smartauditApi';

export class SidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'smartauditSidebar';
    
    private _view?: vscode.WebviewView;
    
    constructor(
        private readonly _extensionUri: vscode.Uri,
        private api: SmartAuditAPI
    ) {}
    
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        console.log('SmartAudit AI: Resolving webview view...');
        
        this._view = webviewView;
        
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        
        try {
            webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
            console.log('SmartAudit AI: Successfully set webview HTML');
        } catch (error) {
            console.error('SmartAudit AI: Error setting webview HTML:', error);
            webviewView.webview.html = '<html><body><h3>SmartAudit AI Error</h3><p>Failed to load dashboard. Check console for details.</p></body></html>';
        }
        
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
                    } catch (error) {
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
                    } catch (error) {
                        console.error('Failed to get audit history:', error);
                    }
                    break;
                    
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'smartaudit');
                    break;
                    
                case 'refresh':
                    // Force refresh the dashboard
                    try {
                        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
                        console.log('SmartAudit AI: Dashboard refreshed');
                    } catch (error) {
                        console.error('SmartAudit AI: Error refreshing dashboard:', error);
                    }
                    break;
                    
                case 'auditCurrentFile':
                    vscode.commands.executeCommand('smartaudit.auditFile');
                    break;
                    
                case 'showHistory':
                    vscode.commands.executeCommand('smartaudit.showHistory');
                    break;
                    
                case 'showCredits':
                    vscode.commands.executeCommand('smartaudit.showCredits');
                    break;
            }
        });
        
        // Auto-refresh data when view becomes visible
        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible) {
                webviewView.webview.postMessage({ type: 'refresh' });
            }
        });
        
        // Refresh data periodically
        const refreshInterval = setInterval(async () => {
            if (webviewView.visible) {
                try {
                    const userInfo = await this.api.getUserInfo();
                    webviewView.webview.postMessage({
                        type: 'userInfo',
                        data: userInfo
                    });
                } catch (error) {
                    console.error('Failed to refresh user info:', error);
                }
            }
        }, 30000); // Refresh every 30 seconds
        
        // Clean up interval when webview is disposed
        webviewView.onDidDispose(() => {
            clearInterval(refreshInterval);
        });
    }
    
    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SmartAudit AI Dashboard</title>
    <style>
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            font-weight: var(--vscode-font-weight);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
            line-height: 1.5;
        }
        
        .container {
            padding: 16px;
            max-height: 100vh;
            overflow-y: auto;
        }
        
        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding: 12px 0;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        
        .header-left {
            display: flex;
            align-items: center;
        }
        
        .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: var(--vscode-charts-red);
            margin-left: 8px;
            animation: pulse 2s infinite;
        }
        
        .status-indicator.connected {
            background-color: var(--vscode-charts-green);
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .logo {
            width: 28px;
            height: 28px;
            margin-right: 12px;
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
        }
        
        .title {
            font-weight: 600;
            font-size: 16px;
            color: var(--vscode-foreground);
        }
        
        .subtitle {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 2px;
        }
        
        .section {
            margin-bottom: 24px;
        }
        
        .card {
            background: var(--vscode-sideBar-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            transition: all 0.2s ease;
        }
        
        .card:hover {
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 16px;
        }
        
        .stat-card {
            background: var(--vscode-badge-background);
            padding: 12px;
            border-radius: 6px;
            text-align: center;
        }
        
        .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
            display: block;
        }
        
        .stat-label {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 4px;
        }
        
        .section-title {
            font-weight: bold;
            margin-bottom: 8px;
            color: var(--vscode-textLink-foreground);
        }
        
        .user-info {
            background: linear-gradient(135deg, var(--vscode-badge-background) 0%, var(--vscode-sideBar-background) 100%);
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 16px;
            border: 1px solid var(--vscode-widget-border);
        }
        
        .user-name {
            font-weight: 600;
            font-size: 15px;
            margin-bottom: 4px;
        }
        
        .user-wallet {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            font-family: monospace;
        }
        
        .credit-balance {
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
        }
        
        .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 16px;
            border-radius: 6px;
            cursor: pointer;
            width: 100%;
            margin-bottom: 8px;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .btn:hover {
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
        }
        
        .btn:active {
            transform: translateY(0);
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            color: white;
            font-weight: 600;
        }
        
        .btn-secondary {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }
        
        .btn-icon {
            font-size: 16px;
        }
        
        .button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .history-item {
            padding: 12px;
            border-bottom: 1px solid var(--vscode-widget-border);
            transition: background-color 0.2s ease;
            cursor: pointer;
            border-radius: 4px;
            margin-bottom: 4px;
        }
        
        .history-item:hover {
            background: var(--vscode-list-hoverBackground);
        }
        
        .history-item:last-child {
            border-bottom: none;
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
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 12px;
            border-left: 3px solid var(--vscode-errorForeground);
        }
        
        .success {
            color: var(--vscode-terminal-ansiGreen);
            background: rgba(0, 255, 0, 0.1);
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 12px;
            border-left: 3px solid var(--vscode-terminal-ansiGreen);
        }
        
        .info {
            color: var(--vscode-textLink-foreground);
            background: rgba(0, 123, 255, 0.1);
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 12px;
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
        
        .progress-bar {
            width: 100%;
            height: 4px;
            background: var(--vscode-progressBar-background);
            border-radius: 2px;
            overflow: hidden;
            margin: 8px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: var(--vscode-progressBar-background);
            border-radius: 2px;
            transition: width 0.3s ease;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }
        
        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="header-left">
                <div class="logo">🛡️</div>
                <div>
                    <div class="title">SmartAudit AI</div>
                    <div class="subtitle">Security Dashboard</div>
                </div>
            </div>
            <div class="status-indicator" id="statusIndicator" title="Connection Status"></div>
        </div>
    
        <div class="section">
            <button class="btn btn-primary" onclick="auditCurrentFile()">
                <span class="btn-icon">🚀</span>
                Audit Current File
            </button>
            <button class="btn btn-secondary" onclick="openSettings()">
                <span class="btn-icon">⚙️</span>
                Configure Settings
            </button>
        </div>
    
        <div class="card user-info" id="userCard" style="display:none;">
            <div class="user-name" id="userName">Loading...</div>
            <div class="user-wallet" id="userWallet"></div>
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-value" id="creditsBalance">-</span>
                    <div class="stat-label">Credits</div>
                </div>
                <div class="stat-card">
                    <span class="stat-value" id="totalAudits">-</span>
                    <div class="stat-label">Audits</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">📊 Recent Activity</div>
            <div id="auditHistory" class="loading">Loading recent audits...</div>
        </div>
        
        <div class="section">
            <div class="section-title">🚀 Quick Actions</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <button class="btn" onclick="showHistory()" style="font-size: 12px; padding: 8px;">
                    📈 History
                </button>
                <button class="btn" onclick="showCredits()" style="font-size: 12px; padding: 8px;">
                    💳 Credits
                </button>
            </div>
        </div>
        
        <div class="empty-state" id="emptyState" style="display: none;">
            <div class="empty-state-icon">🔍</div>
            <p>No audits yet</p>
            <p style="font-size: 12px;">Click "Audit Current File" to get started!</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function auditCurrentFile() {
            vscode.postMessage({ type: 'auditCurrentFile' });
            showNotification('🚀 Starting audit...', 'info');
        }
        
        function openSettings() {
            vscode.postMessage({ type: 'openSettings' });
        }
        
        function showHistory() {
            vscode.postMessage({ type: 'showHistory' });
        }
        
        function showCredits() {
            vscode.postMessage({ type: 'showCredits' });
        }
        
        function refreshData() {
            updateConnectionStatus(true);
            vscode.postMessage({ type: 'getUserInfo' });
            vscode.postMessage({ type: 'getAuditHistory' });
        }
        
        function updateConnectionStatus(connected) {
            const indicator = document.getElementById('statusIndicator');
            if (connected) {
                indicator.classList.add('connected');
                indicator.title = 'Connected to SmartAudit AI';
            } else {
                indicator.classList.remove('connected');
                indicator.title = 'Not connected - check API key';
            }
        }
        
        function showNotification(message, type) {
            console.log('[' + type.toUpperCase() + '] ' + message);
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
            const userCard = document.getElementById('userCard');
            const userName = document.getElementById('userName');
            const userWallet = document.getElementById('userWallet');
            const creditsBalance = document.getElementById('creditsBalance');
            const container = document.querySelector('.container');
            
            if (userInfo && userInfo.credits !== undefined) {
                // User is authenticated - show dashboard
                updateConnectionStatus(true);
                userCard.style.display = 'block';
                userName.textContent = userInfo.displayName || 'SmartAudit User';
                userWallet.textContent = userInfo.walletAddress ? 
                    userInfo.walletAddress.substring(0, 6) + '...' + userInfo.walletAddress.slice(-4) : '';
                creditsBalance.textContent = userInfo.credits || '0';
                
                // Hide welcome content if any
                const welcomeContent = document.getElementById('welcomeContent');
                if (welcomeContent) welcomeContent.style.display = 'none';
            } else {
                // No API key or authentication failed - show welcome
                updateConnectionStatus(false);
                userCard.style.display = 'none';
                
                // Show welcome content
                showWelcomeContent();
            }
        }
        
        function displayAuditHistory(history) {
            const historyEl = document.getElementById('auditHistory');
            const totalAudits = document.getElementById('totalAudits');
            const emptyState = document.getElementById('emptyState');
            
            if (history && history.length > 0) {
                totalAudits.textContent = history.length;
                emptyState.style.display = 'none';
                historyEl.innerHTML = history.slice(0, 5).map(audit => {
                    const statusEmoji = audit.status === 'completed' ? '✅' : audit.status === 'failed' ? '❌' : '⏳';
                    return \`
                        <div class="history-item">
                            <div class="history-title">\${statusEmoji} \${audit.title}</div>
                            <div class="history-meta">
                                \${audit.language || 'Unknown'} • \${audit.creditsUsed} credits • 
                                \${new Date(audit.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                    \`;
                }).join('');
            } else {
                totalAudits.textContent = '0';
                historyEl.innerHTML = '';
                emptyState.style.display = 'block';
            }
        }
        
        // Initial load
        refreshData();
        
        function showWelcomeContent() {
            const historyEl = document.getElementById('auditHistory');
            historyEl.innerHTML = 
                '<div style="text-align: center; padding: 20px;">' +
                    '<div style="font-size: 48px; margin-bottom: 16px;">\ud83d\udee1\ufe0f</div>' +
                    '<h3 style="margin-bottom: 16px; color: var(--vscode-foreground);">Welcome to SmartAudit AI!</h3>' +
                    '<p style="margin-bottom: 20px; color: var(--vscode-descriptionForeground); line-height: 1.5;">' +
                        'Get started by configuring your API key to begin auditing smart contracts across 17+ blockchain languages.' +
                    '</p>' +
                    '<div style="display: flex; flex-direction: column; gap: 8px;">' +
                        '<button class="btn btn-primary" onclick="vscode.postMessage({type: \'openSettings\'})">' +
                            '\u2699\ufe0f Configure API Key' +
                        '</button>' +
                        '<button class="btn btn-secondary" onclick="window.open(\'https://smartaudit.ai/settings\', \'_blank\')">' +
                            '\ud83c\udd86 Get Free API Key' +
                        '</button>' +
                        '<button class="btn btn-secondary" onclick="window.open(\'https://smartaudit.ai/docs\', \'_blank\')">' +
                            '\ud83d\udcc4 View Documentation' +
                        '</button>' +
                    '</div>' +
                '</div>';
        }
        
        // Auto-refresh periodically
        setInterval(() => {
            if (document.visibilityState === 'visible') {
                refreshData();
            }
        }, 60000); // Refresh every minute when visible
    </script>
</body>
</html>`;
    }
}