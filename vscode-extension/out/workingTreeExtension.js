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
exports.SmartAuditDataProvider = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const authService_1 = require("./authService");
const auditService_1 = require("./auditService");
// Tree item class for our dashboard
class SmartAuditTreeItem extends vscode.TreeItem {
    constructor(label, collapsibleState, contextValue, command, iconPath) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.contextValue = contextValue;
        this.command = command;
        this.iconPath = iconPath;
        this.contextValue = contextValue;
        this.command = command;
        this.iconPath = iconPath;
    }
}
// Tree data provider class - exactly like AgentLISA pattern
class SmartAuditDataProvider {
    constructor(context) {
        this.context = context;
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.authService = new authService_1.AuthService(context);
        this.auditService = new auditService_1.AuditService(context);
        // Listen for configuration changes and refresh tree view
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('smartaudit')) {
                console.log('[TREE] Settings changed, refreshing tree view...');
                this.refresh();
                // Also clear auth cache to force re-validation with new key
                this.authService.clearCache();
            }
        });
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!element) {
            // Root items
            return Promise.resolve(this.getRootItems());
        }
        // Handle child items
        switch (element.contextValue) {
            case 'config':
                return Promise.resolve(this.getConfigItems());
            case 'actions':
                return Promise.resolve(this.getActionItems());
            case 'status':
                return Promise.resolve(this.getStatusItems());
            case 'languages':
                return Promise.resolve(this.getLanguageItems());
            case 'results':
                return Promise.resolve(this.getResultItems());
            case 'summary':
                return Promise.resolve(this.getSummaryItems());
            default:
                return Promise.resolve([]);
        }
    }
    getRootItems() {
        const config = vscode.workspace.getConfiguration('smartaudit');
        const apiKey = config.get('apiKey');
        const apiUrl = config.get('apiUrl');
        // Check if we have both API key and URL
        const hasConfig = apiKey && apiKey.trim().length > 0 && apiUrl && apiUrl.trim().length > 0;
        // Get cached auth status
        const isAuthenticated = this.authService.isAuthenticated();
        const cachedUser = this.context.workspaceState.get('smartaudit.user');
        // Simulate analysis state for demo purposes
        const isAnalyzing = this.context.workspaceState.get('smartaudit.analyzing', false);
        const hasResults = this.context.workspaceState.get('smartaudit.hasResults', false);
        const items = [];
        // Status section - shows real connection state
        if (isAnalyzing) {
            items.push(new SmartAuditTreeItem('🔄 Analyzing Contract...', vscode.TreeItemCollapsibleState.Collapsed, 'status', undefined, new vscode.ThemeIcon('loading~spin')));
        }
        else if (hasResults) {
            items.push(new SmartAuditTreeItem('✅ Analysis Complete', vscode.TreeItemCollapsibleState.Collapsed, 'status', undefined, new vscode.ThemeIcon('check-all')));
        }
        else if (!hasConfig) {
            items.push(new SmartAuditTreeItem('🔴 Configuration Missing', vscode.TreeItemCollapsibleState.Collapsed, 'status', undefined, new vscode.ThemeIcon('error')));
        }
        else if (isAuthenticated && cachedUser && cachedUser.planTier) {
            items.push(new SmartAuditTreeItem(`🟢 Connected (${cachedUser.planTier} Plan)`, vscode.TreeItemCollapsibleState.Collapsed, 'status', undefined, new vscode.ThemeIcon('check')));
        }
        else {
            items.push(new SmartAuditTreeItem('🟡 Validating Connection...', vscode.TreeItemCollapsibleState.Collapsed, 'status', undefined, new vscode.ThemeIcon('sync~spin')));
        }
        // Results section - only show when we have results
        if (hasResults) {
            items.push(new SmartAuditTreeItem('📊 Analysis Results (3 issues)', vscode.TreeItemCollapsibleState.Collapsed, 'results', undefined, new vscode.ThemeIcon('list-tree')));
            items.push(new SmartAuditTreeItem('📈 Analysis Summary', vscode.TreeItemCollapsibleState.Collapsed, 'summary', undefined, new vscode.ThemeIcon('graph')));
        }
        // Configuration section
        items.push(new SmartAuditTreeItem('🔑 Configuration', vscode.TreeItemCollapsibleState.Collapsed, 'config', undefined, new vscode.ThemeIcon('gear')));
        // Quick Actions section
        items.push(new SmartAuditTreeItem('🚀 Quick Actions', vscode.TreeItemCollapsibleState.Collapsed, 'actions', undefined, new vscode.ThemeIcon('rocket')));
        // Supported Languages section
        items.push(new SmartAuditTreeItem('✨ Supported Languages', vscode.TreeItemCollapsibleState.Collapsed, 'languages', undefined, new vscode.ThemeIcon('symbol-property')));
        return items;
    }
    getStatusItems() {
        const config = vscode.workspace.getConfiguration('smartaudit');
        const apiKey = config.get('apiKey');
        const apiUrl = config.get('apiUrl');
        const cachedUser = this.context.workspaceState.get('smartaudit.user');
        const items = [];
        if (!apiKey || apiKey.trim().length === 0) {
            items.push(new SmartAuditTreeItem('❌ API Key Missing', vscode.TreeItemCollapsibleState.None, 'statusItem', {
                command: 'workbench.action.openSettings',
                title: 'Configure API Key',
                arguments: ['smartaudit.apiKey']
            }, new vscode.ThemeIcon('key')));
        }
        else if (!apiUrl || apiUrl.trim().length === 0) {
            items.push(new SmartAuditTreeItem('❌ API URL Missing', vscode.TreeItemCollapsibleState.None, 'statusItem', {
                command: 'workbench.action.openSettings',
                title: 'Configure API URL',
                arguments: ['smartaudit.apiUrl']
            }, new vscode.ThemeIcon('globe')));
        }
        else if (cachedUser) {
            // Show real user info
            items.push(new SmartAuditTreeItem(`✅ Plan: ${cachedUser.planTier}`, vscode.TreeItemCollapsibleState.None, 'statusItem', undefined, new vscode.ThemeIcon('star')));
            items.push(new SmartAuditTreeItem(`💰 Credits: ${cachedUser.balance}`, vscode.TreeItemCollapsibleState.None, 'statusItem', undefined, new vscode.ThemeIcon('credit-card')));
            items.push(new SmartAuditTreeItem(`🔍 Total Audits: ${Math.floor(cachedUser.totalUsed / 10)}`, vscode.TreeItemCollapsibleState.None, 'statusItem', undefined, new vscode.ThemeIcon('search')));
            if (cachedUser.canCreatePrivateAudits) {
                items.push(new SmartAuditTreeItem('✅ Private Audits Enabled', vscode.TreeItemCollapsibleState.None, 'statusItem', undefined, new vscode.ThemeIcon('shield')));
            }
            else {
                items.push(new SmartAuditTreeItem('❌ Upgrade to Pro for Private Audits', vscode.TreeItemCollapsibleState.None, 'statusItem', {
                    command: 'vscode.open',
                    title: 'Upgrade Plan',
                    arguments: [vscode.Uri.parse('https://smartaudit.ai/pricing')]
                }, new vscode.ThemeIcon('warning')));
            }
        }
        else {
            // Check if we're currently validating to avoid infinite loops
            const isValidating = this.context.workspaceState.get('smartaudit.validating', false);
            if (!isValidating) {
                // Start validation once
                this.context.workspaceState.update('smartaudit.validating', true);
                // Validate in background
                this.authService.validateApiKey().then(authResult => {
                    this.context.workspaceState.update('smartaudit.validating', false);
                    if (authResult.success && authResult.user) {
                        this.context.workspaceState.update('smartaudit.user', authResult.user);
                    }
                    else {
                        console.error('[VALIDATION] Failed:', authResult.error);
                    }
                    this.refresh();
                });
            }
            items.push(new SmartAuditTreeItem('🔄 Validating API Key...', vscode.TreeItemCollapsibleState.None, 'statusItem', undefined, new vscode.ThemeIcon('sync~spin')));
        }
        return items;
    }
    getConfigItems() {
        const items = [];
        // Get current API key from settings (not cached)
        const config = vscode.workspace.getConfiguration('smartaudit');
        const currentApiKey = config.get('apiKey');
        let apiKeyDisplay = 'API Key: Not Set';
        if (currentApiKey && currentApiKey.trim().length > 0) {
            // Show first 20 characters + ... for security
            apiKeyDisplay = `API Key: ${currentApiKey.substring(0, 25)}...`;
        }
        items.push(new SmartAuditTreeItem(apiKeyDisplay, vscode.TreeItemCollapsibleState.None, 'configItem', {
            command: 'workbench.action.openSettings',
            title: 'Configure API Key',
            arguments: ['smartaudit.apiKey']
        }, new vscode.ThemeIcon('key')));
        // Get current API URL from settings
        const currentApiUrl = config.get('apiUrl');
        let apiUrlDisplay = 'API URL: Not Set';
        if (currentApiUrl && currentApiUrl.trim().length > 0) {
            // Show URL hostname for display
            try {
                const url = new URL(currentApiUrl);
                apiUrlDisplay = `API URL: ${url.hostname}`;
            }
            catch {
                apiUrlDisplay = `API URL: ${currentApiUrl.substring(0, 30)}...`;
            }
        }
        items.push(new SmartAuditTreeItem(apiUrlDisplay, vscode.TreeItemCollapsibleState.None, 'configItem', {
            command: 'workbench.action.openSettings',
            title: 'Configure API URL',
            arguments: ['smartaudit.apiUrl']
        }, new vscode.ThemeIcon('globe')));
        items.push(new SmartAuditTreeItem('⚙️ Open All Settings', vscode.TreeItemCollapsibleState.None, 'configItem', {
            command: 'workbench.action.openSettings',
            title: 'Open SmartAudit Settings',
            arguments: ['smartaudit']
        }, new vscode.ThemeIcon('settings-gear')));
        return items;
    }
    getActionItems() {
        const items = [];
        items.push(new SmartAuditTreeItem('🔍 Audit Current File', vscode.TreeItemCollapsibleState.None, 'actionItem', {
            command: 'smartaudit.auditFile',
            title: 'Audit Current File'
        }, new vscode.ThemeIcon('search')));
        items.push(new SmartAuditTreeItem('📊 View Audit History', vscode.TreeItemCollapsibleState.None, 'actionItem', {
            command: 'smartaudit.showHistory',
            title: 'Show Audit History'
        }, new vscode.ThemeIcon('history')));
        items.push(new SmartAuditTreeItem('💰 Check Credit Balance', vscode.TreeItemCollapsibleState.None, 'actionItem', {
            command: 'smartaudit.showCredits',
            title: 'Show Credit Balance'
        }, new vscode.ThemeIcon('credit-card')));
        items.push(new SmartAuditTreeItem('🔄 Refresh Dashboard', vscode.TreeItemCollapsibleState.None, 'actionItem', {
            command: 'smartaudit.refresh',
            title: 'Refresh Dashboard'
        }, new vscode.ThemeIcon('refresh')));
        items.push(new SmartAuditTreeItem('📚 Open Documentation', vscode.TreeItemCollapsibleState.None, 'actionItem', {
            command: 'vscode.open',
            title: 'Open Documentation',
            arguments: [vscode.Uri.parse('https://smartaudit.ai/docs')]
        }, new vscode.ThemeIcon('book')));
        return items;
    }
    getLanguageItems() {
        const languages = [
            { name: 'Solidity', icon: 'symbol-class' },
            { name: 'Rust', icon: 'symbol-struct' },
            { name: 'Move', icon: 'symbol-interface' },
            { name: 'Cairo', icon: 'symbol-module' },
            { name: 'Vyper', icon: 'symbol-property' },
            { name: 'Go', icon: 'symbol-function' },
            { name: 'Python', icon: 'symbol-method' },
            { name: 'TypeScript', icon: 'symbol-variable' },
            { name: 'JavaScript', icon: 'symbol-string' },
            { name: 'C++', icon: 'symbol-numeric' },
            { name: 'Java', icon: 'symbol-object' },
            { name: 'Haskell', icon: 'symbol-misc' },
            { name: 'AssemblyScript', icon: 'symbol-snippet' },
            { name: 'WebAssembly', icon: 'symbol-ruler' },
            { name: '+ 3 more languages', icon: 'add' }
        ];
        return languages.map(lang => new SmartAuditTreeItem(`✅ ${lang.name}`, vscode.TreeItemCollapsibleState.None, 'languageItem', undefined, new vscode.ThemeIcon(lang.icon)));
    }
    getResultItems() {
        const items = [];
        const auditResults = this.context.workspaceState.get('smartaudit.lastResults');
        if (!auditResults || !auditResults.vulnerabilities) {
            items.push(new SmartAuditTreeItem('📝 No vulnerabilities found', vscode.TreeItemCollapsibleState.None, 'resultItem', undefined, new vscode.ThemeIcon('check')));
            return items;
        }
        // Show real vulnerabilities found by AI
        auditResults.vulnerabilities.forEach((vuln, index) => {
            const severityIcon = this.getSeverityIcon(vuln.severity);
            const severityEmoji = this.getSeverityEmoji(vuln.severity);
            items.push(new SmartAuditTreeItem(`${severityEmoji} ${vuln.severity}: ${vuln.title}`, vscode.TreeItemCollapsibleState.None, 'resultItem', vuln.line ? {
                command: 'vscode.open',
                title: 'Go to Line',
                arguments: [
                    vscode.window.activeTextEditor?.document.uri,
                    { selection: new vscode.Range(vuln.line - 1, 0, vuln.line - 1, 100) }
                ]
            } : undefined, new vscode.ThemeIcon(severityIcon)));
        });
        return items;
    }
    getSummaryItems() {
        const items = [];
        const auditResults = this.context.workspaceState.get('smartaudit.lastResults');
        const fileName = this.context.workspaceState.get('smartaudit.lastFileName');
        if (!auditResults || !auditResults.summary) {
            items.push(new SmartAuditTreeItem('📝 No analysis data available', vscode.TreeItemCollapsibleState.None, 'summaryItem', undefined, new vscode.ThemeIcon('info')));
            return items;
        }
        const summary = auditResults.summary;
        items.push(new SmartAuditTreeItem(`✅ Contract: ${fileName || 'Unknown'}`, vscode.TreeItemCollapsibleState.None, 'summaryItem', undefined, new vscode.ThemeIcon('file-code')));
        // Calculate time ago
        const completedAt = new Date(summary.completedAt);
        const now = new Date();
        const diffMs = now.getTime() - completedAt.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const timeAgo = diffMins < 1 ? 'just now' :
            diffMins < 60 ? `${diffMins}m ago` :
                `${Math.floor(diffMins / 60)}h ago`;
        items.push(new SmartAuditTreeItem(`⏱️ Completed: ${timeAgo}`, vscode.TreeItemCollapsibleState.None, 'summaryItem', undefined, new vscode.ThemeIcon('clock')));
        // Estimate lines from response length
        const estimatedLines = Math.floor(summary.rawResponse?.length / 50) || 0;
        items.push(new SmartAuditTreeItem(`🔍 Response Length: ${summary.rawResponse?.length || 0} chars`, vscode.TreeItemCollapsibleState.None, 'summaryItem', undefined, new vscode.ThemeIcon('search')));
        items.push(new SmartAuditTreeItem(`🔢 Issues Found: ${summary.vulnerabilityCount || 0}`, vscode.TreeItemCollapsibleState.None, 'summaryItem', undefined, new vscode.ThemeIcon('list-ordered')));
        if (summary.securityScore !== null && summary.securityScore !== undefined) {
            items.push(new SmartAuditTreeItem(`📊 Security Score: ${summary.securityScore.toFixed(1)}/10`, vscode.TreeItemCollapsibleState.None, 'summaryItem', undefined, new vscode.ThemeIcon('graph')));
        }
        return items;
    }
    getSeverityIcon(severity) {
        switch (severity?.toLowerCase()) {
            case 'critical': return 'error';
            case 'high': return 'warning';
            case 'medium': return 'info';
            case 'low': return 'lightbulb';
            default: return 'circle-outline';
        }
    }
    getSeverityEmoji(severity) {
        switch (severity?.toLowerCase()) {
            case 'critical': return '🔴';
            case 'high': return '🟠';
            case 'medium': return '🟡';
            case 'low': return '🟢';
            default: return '⚪';
        }
    }
}
exports.SmartAuditDataProvider = SmartAuditDataProvider;
function activate(context) {
    console.log('🚀 WORKING TREE EXTENSION: Starting activation...');
    try {
        // Create the data provider - exactly like AgentLISA
        const dataProvider = new SmartAuditDataProvider(context);
        // Register the tree data provider - this is the KEY difference
        const treeRegistration = vscode.window.registerTreeDataProvider('smartauditSidebar', // Must match package.json view id
        dataProvider);
        context.subscriptions.push(treeRegistration);
        console.log('✅ WORKING TREE: TreeDataProvider registered successfully');
        // Register commands
        const auditCommand = vscode.commands.registerCommand('smartaudit.auditFile', async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('📝 SmartAudit AI: Please open a smart contract file to audit');
                return;
            }
            const fileName = editor.document.fileName.split('/').pop() || editor.document.fileName.split('\\').pop();
            const contractCode = editor.document.getText();
            if (contractCode.trim().length < 10) {
                vscode.window.showWarningMessage('📝 SmartAudit AI: Contract code is too short to analyze');
                return;
            }
            try {
                // Validate authentication first
                const authResult = await dataProvider.authService.validateApiKey();
                if (!authResult.success) {
                    vscode.window.showErrorMessage(`🔐 SmartAudit AI: ${authResult.error}`);
                    return;
                }
                // Clear previous results and start analysis
                context.workspaceState.update('smartaudit.analyzing', true);
                context.workspaceState.update('smartaudit.hasResults', false);
                context.workspaceState.update('smartaudit.lastResults', undefined);
                context.workspaceState.update('smartaudit.lastFileName', fileName);
                dataProvider.refresh();
                console.log('📁 Starting REAL analysis for:', fileName);
                // Call real audit service
                const result = await dataProvider.auditService.analyzeContract(contractCode, fileName || 'contract.sol');
                if (result) {
                    // Parse and store results
                    const parsedResults = dataProvider.auditService.parseAuditResults(result);
                    context.workspaceState.update('smartaudit.analyzing', false);
                    context.workspaceState.update('smartaudit.hasResults', true);
                    context.workspaceState.update('smartaudit.lastResults', parsedResults);
                    dataProvider.refresh();
                    const vulnCount = parsedResults.vulnerabilities.length;
                    const score = parsedResults.summary.securityScore;
                    if (vulnCount === 0) {
                        vscode.window.showInformationMessage(`✅ SmartAudit AI: Analysis complete! No vulnerabilities found in ${fileName}. Security Score: ${score?.toFixed(1)}/10`);
                    }
                    else {
                        vscode.window.showInformationMessage(`⚠️ SmartAudit AI: Analysis complete! Found ${vulnCount} issue${vulnCount > 1 ? 's' : ''} in ${fileName}. Security Score: ${score?.toFixed(1)}/10`);
                    }
                    console.log('🎉 REAL analysis completed with results:', vulnCount, 'vulnerabilities');
                }
                else {
                    // Analysis failed
                    context.workspaceState.update('smartaudit.analyzing', false);
                    context.workspaceState.update('smartaudit.hasResults', false);
                    dataProvider.refresh();
                    console.log('❌ Analysis failed');
                }
            }
            catch (error) {
                console.error('❌ Audit command failed:', error);
                context.workspaceState.update('smartaudit.analyzing', false);
                context.workspaceState.update('smartaudit.hasResults', false);
                dataProvider.refresh();
                vscode.window.showErrorMessage(`❌ SmartAudit AI: ${error.message}`);
            }
        });
        const refreshCommand = vscode.commands.registerCommand('smartaudit.refresh', async () => {
            console.log('🔄 Refreshing authentication...');
            vscode.window.showInformationMessage('🔄 SmartAudit AI: Refreshing connection...');
            // Clear ALL cached data including API key tracking
            dataProvider.authService.clearCache();
            context.workspaceState.update('smartaudit.user', undefined);
            context.workspaceState.update('lastApiKey', undefined);
            // Force reload configuration from settings
            const config = vscode.workspace.getConfiguration('smartaudit');
            const newApiKey = config.get('apiKey');
            if (newApiKey && newApiKey.trim().length > 0) {
                console.log(`[REFRESH] Using new API key: ${newApiKey.substring(0, 20)}...`);
            }
            // Trigger re-authentication with fresh config
            const authResult = await dataProvider.authService.validateApiKey();
            if (authResult.success && authResult.user) {
                context.workspaceState.update('smartaudit.user', authResult.user);
                vscode.window.showInformationMessage(`✅ SmartAudit AI: Connected as ${authResult.user.planTier} user with ${authResult.user.balance} credits`);
            }
            else {
                vscode.window.showErrorMessage(`❌ SmartAudit AI: ${authResult.error || 'Authentication failed'}`);
            }
            dataProvider.refresh();
            console.log('🔄 Dashboard refreshed');
        });
        const simulateResultsCommand = vscode.commands.registerCommand('smartaudit.simulateResults', () => {
            context.workspaceState.update('smartaudit.analyzing', false);
            context.workspaceState.update('smartaudit.hasResults', true);
            dataProvider.refresh();
            vscode.window.showInformationMessage('🎯 SmartAudit AI: Demo results added to tree view!');
        });
        const clearResultsCommand = vscode.commands.registerCommand('smartaudit.clearResults', () => {
            context.workspaceState.update('smartaudit.analyzing', false);
            context.workspaceState.update('smartaudit.hasResults', false);
            dataProvider.refresh();
            vscode.window.showInformationMessage('🗑️ SmartAudit AI: Results cleared');
        });
        const showHistoryCommand = vscode.commands.registerCommand('smartaudit.showHistory', () => {
            vscode.window.showInformationMessage('📊 SmartAudit AI: Audit history feature coming soon!');
        });
        const showCreditsCommand = vscode.commands.registerCommand('smartaudit.showCredits', () => {
            vscode.window.showInformationMessage('💰 SmartAudit AI: Current balance: 150 credits');
        });
        context.subscriptions.push(auditCommand, refreshCommand, showHistoryCommand, showCreditsCommand, simulateResultsCommand, clearResultsCommand);
        console.log('✅ WORKING TREE: All commands registered successfully');
        // Show success notification
        vscode.window.showInformationMessage('🛡️ SmartAudit AI TreeView Extension Activated Successfully!');
        console.log('🎉 WORKING TREE EXTENSION: Activation completed successfully!');
        console.log('👀 Check the Explorer panel for SmartAudit AI tree view');
        // Set context for showing the tree view
        vscode.commands.executeCommand('setContext', 'smartaudit.activated', true);
    }
    catch (error) {
        console.error('❌ WORKING TREE EXTENSION: Activation failed:', error);
        vscode.window.showErrorMessage(`SmartAudit AI tree activation failed: ${error}`);
    }
}
function deactivate() {
    console.log('👋 WORKING TREE EXTENSION: Deactivated');
}
//# sourceMappingURL=workingTreeExtension.js.map