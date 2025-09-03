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
        const hasApiKey = apiKey && apiKey.trim().length > 0;
        // Simulate analysis state for demo purposes
        const isAnalyzing = this.context.workspaceState.get('smartaudit.analyzing', false);
        const hasResults = this.context.workspaceState.get('smartaudit.hasResults', false);
        const items = [];
        // Status section - shows current state
        if (isAnalyzing) {
            items.push(new SmartAuditTreeItem('🔄 Analyzing Contract...', vscode.TreeItemCollapsibleState.Collapsed, 'status', undefined, new vscode.ThemeIcon('loading~spin')));
        }
        else if (hasResults) {
            items.push(new SmartAuditTreeItem('✅ Analysis Complete', vscode.TreeItemCollapsibleState.Collapsed, 'status', undefined, new vscode.ThemeIcon('check-all')));
        }
        else {
            items.push(new SmartAuditTreeItem(hasApiKey ? '🟢 Connected & Ready' : '🔴 Not Connected', vscode.TreeItemCollapsibleState.Collapsed, 'status', undefined, new vscode.ThemeIcon(hasApiKey ? 'check' : 'error')));
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
        const items = [];
        if (apiKey && apiKey.trim().length > 0) {
            items.push(new SmartAuditTreeItem('✅ API Key Configured', vscode.TreeItemCollapsibleState.None, 'statusItem', undefined, new vscode.ThemeIcon('key')));
            items.push(new SmartAuditTreeItem('✅ Extension Active', vscode.TreeItemCollapsibleState.None, 'statusItem', undefined, new vscode.ThemeIcon('check')));
            items.push(new SmartAuditTreeItem('✅ Commands Ready', vscode.TreeItemCollapsibleState.None, 'statusItem', undefined, new vscode.ThemeIcon('terminal')));
            items.push(new SmartAuditTreeItem('🔗 API Connected', vscode.TreeItemCollapsibleState.None, 'statusItem', undefined, new vscode.ThemeIcon('globe')));
        }
        else {
            items.push(new SmartAuditTreeItem('❌ API Key Missing', vscode.TreeItemCollapsibleState.None, 'statusItem', {
                command: 'workbench.action.openSettings',
                title: 'Open Settings',
                arguments: ['smartaudit.apiKey']
            }, new vscode.ThemeIcon('warning')));
        }
        return items;
    }
    getConfigItems() {
        const items = [];
        items.push(new SmartAuditTreeItem('API Key: sa_1234567890abcdef...', vscode.TreeItemCollapsibleState.None, 'configItem', {
            command: 'workbench.action.openSettings',
            title: 'Configure API Key',
            arguments: ['smartaudit.apiKey']
        }, new vscode.ThemeIcon('key')));
        items.push(new SmartAuditTreeItem('API URL: a7be7c35-b776-43f4-ab98...', vscode.TreeItemCollapsibleState.None, 'configItem', {
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
        items.push(new SmartAuditTreeItem('🔴 Critical: Reentrancy Vulnerability', vscode.TreeItemCollapsibleState.None, 'resultItem', {
            command: 'vscode.open',
            title: 'Open Issue',
            arguments: [vscode.Uri.file('path/to/file'), { selection: new vscode.Range(44, 0, 44, 50) }]
        }, new vscode.ThemeIcon('error')));
        items.push(new SmartAuditTreeItem('🟡 Medium: Unchecked External Call', vscode.TreeItemCollapsibleState.None, 'resultItem', {
            command: 'vscode.open',
            title: 'Open Issue',
            arguments: [vscode.Uri.file('path/to/file'), { selection: new vscode.Range(66, 0, 66, 30) }]
        }, new vscode.ThemeIcon('warning')));
        items.push(new SmartAuditTreeItem('🟠 Low: Gas Optimization Opportunity', vscode.TreeItemCollapsibleState.None, 'resultItem', {
            command: 'vscode.open',
            title: 'Open Issue',
            arguments: [vscode.Uri.file('path/to/file'), { selection: new vscode.Range(22, 0, 22, 40) }]
        }, new vscode.ThemeIcon('info')));
        return items;
    }
    getSummaryItems() {
        const items = [];
        items.push(new SmartAuditTreeItem('✅ Contract: Immunefi_ch1.sol', vscode.TreeItemCollapsibleState.None, 'summaryItem', undefined, new vscode.ThemeIcon('file-code')));
        items.push(new SmartAuditTreeItem('⏱️ Completed: 2m 34s ago', vscode.TreeItemCollapsibleState.None, 'summaryItem', undefined, new vscode.ThemeIcon('clock')));
        items.push(new SmartAuditTreeItem('🔍 Lines Analyzed: 156', vscode.TreeItemCollapsibleState.None, 'summaryItem', undefined, new vscode.ThemeIcon('search')));
        items.push(new SmartAuditTreeItem('💰 Credits Used: 5', vscode.TreeItemCollapsibleState.None, 'summaryItem', undefined, new vscode.ThemeIcon('credit-card')));
        items.push(new SmartAuditTreeItem('📊 Security Score: 7.2/10', vscode.TreeItemCollapsibleState.None, 'summaryItem', undefined, new vscode.ThemeIcon('graph')));
        return items;
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
            if (editor) {
                const fileName = editor.document.fileName.split('/').pop() || editor.document.fileName.split('\\').pop();
                // Start analysis simulation
                context.workspaceState.update('smartaudit.analyzing', true);
                context.workspaceState.update('smartaudit.hasResults', false);
                dataProvider.refresh();
                vscode.window.showInformationMessage(`🔍 SmartAudit AI: Analyzing ${fileName}...`);
                console.log('📁 Starting analysis for:', fileName);
                // Simulate analysis process
                setTimeout(() => {
                    context.workspaceState.update('smartaudit.analyzing', false);
                    context.workspaceState.update('smartaudit.hasResults', true);
                    dataProvider.refresh();
                    vscode.window.showInformationMessage(`✅ SmartAudit AI: Analysis complete! Found 3 security issues in ${fileName}`);
                    console.log('🎉 Analysis completed with results');
                }, 5000); // 5 second demo
            }
            else {
                vscode.window.showWarningMessage('📝 SmartAudit AI: Please open a smart contract file to audit');
            }
        });
        const refreshCommand = vscode.commands.registerCommand('smartaudit.refresh', () => {
            dataProvider.refresh();
            vscode.window.showInformationMessage('🔄 SmartAudit AI: Dashboard refreshed');
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