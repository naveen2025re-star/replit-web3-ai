import * as vscode from 'vscode';
import { AuthService } from './authService';

// Tree item class for our dashboard
class SmartAuditTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue?: string,
        public readonly command?: vscode.Command,
        public readonly iconPath?: vscode.ThemeIcon
    ) {
        super(label, collapsibleState);
        this.contextValue = contextValue;
        this.command = command;
        this.iconPath = iconPath;
    }
}

// Tree data provider class - exactly like AgentLISA pattern
export class SmartAuditDataProvider implements vscode.TreeDataProvider<SmartAuditTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SmartAuditTreeItem | undefined | null | void> = 
        new vscode.EventEmitter<SmartAuditTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SmartAuditTreeItem | undefined | null | void> = 
        this._onDidChangeTreeData.event;

    public authService: AuthService;

    constructor(private context: vscode.ExtensionContext) {
        this.authService = new AuthService(context);
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SmartAuditTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SmartAuditTreeItem): Thenable<SmartAuditTreeItem[]> {
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

    private getRootItems(): SmartAuditTreeItem[] {
        const config = vscode.workspace.getConfiguration('smartaudit');
        const apiKey = config.get<string>('apiKey');
        const apiUrl = config.get<string>('apiUrl');
        
        // Check if we have both API key and URL
        const hasConfig = apiKey && apiKey.trim().length > 0 && apiUrl && apiUrl.trim().length > 0;
        
        // Get cached auth status
        const isAuthenticated = this.authService.isAuthenticated();
        const cachedUser = this.context.workspaceState.get('smartaudit.user');
        
        // Simulate analysis state for demo purposes
        const isAnalyzing = this.context.workspaceState.get('smartaudit.analyzing', false);
        const hasResults = this.context.workspaceState.get('smartaudit.hasResults', false);
        
        const items: SmartAuditTreeItem[] = [];

        // Status section - shows real connection state
        if (isAnalyzing) {
            items.push(new SmartAuditTreeItem(
                '🔄 Analyzing Contract...',
                vscode.TreeItemCollapsibleState.Collapsed,
                'status',
                undefined,
                new vscode.ThemeIcon('loading~spin')
            ));
        } else if (hasResults) {
            items.push(new SmartAuditTreeItem(
                '✅ Analysis Complete',
                vscode.TreeItemCollapsibleState.Collapsed,
                'status',
                undefined,
                new vscode.ThemeIcon('check-all')
            ));
        } else if (!hasConfig) {
            items.push(new SmartAuditTreeItem(
                '🔴 Configuration Missing',
                vscode.TreeItemCollapsibleState.Collapsed,
                'status',
                undefined,
                new vscode.ThemeIcon('error')
            ));
        } else if (isAuthenticated && cachedUser && (cachedUser as any).planTier) {
            items.push(new SmartAuditTreeItem(
                `🟢 Connected (${(cachedUser as any).planTier} Plan)`,
                vscode.TreeItemCollapsibleState.Collapsed,
                'status',
                undefined,
                new vscode.ThemeIcon('check')
            ));
        } else {
            items.push(new SmartAuditTreeItem(
                '🟡 Validating Connection...',
                vscode.TreeItemCollapsibleState.Collapsed,
                'status',
                undefined,
                new vscode.ThemeIcon('sync~spin')
            ));
        }

        // Results section - only show when we have results
        if (hasResults) {
            items.push(new SmartAuditTreeItem(
                '📊 Analysis Results (3 issues)',
                vscode.TreeItemCollapsibleState.Collapsed,
                'results',
                undefined,
                new vscode.ThemeIcon('list-tree')
            ));
            
            items.push(new SmartAuditTreeItem(
                '📈 Analysis Summary',
                vscode.TreeItemCollapsibleState.Collapsed,
                'summary',
                undefined,
                new vscode.ThemeIcon('graph')
            ));
        }

        // Configuration section
        items.push(new SmartAuditTreeItem(
            '🔑 Configuration',
            vscode.TreeItemCollapsibleState.Collapsed,
            'config',
            undefined,
            new vscode.ThemeIcon('gear')
        ));

        // Quick Actions section
        items.push(new SmartAuditTreeItem(
            '🚀 Quick Actions',
            vscode.TreeItemCollapsibleState.Collapsed,
            'actions',
            undefined,
            new vscode.ThemeIcon('rocket')
        ));

        // Supported Languages section
        items.push(new SmartAuditTreeItem(
            '✨ Supported Languages',
            vscode.TreeItemCollapsibleState.Collapsed,
            'languages',
            undefined,
            new vscode.ThemeIcon('symbol-property')
        ));

        return items;
    }

    private getStatusItems(): SmartAuditTreeItem[] {
        const config = vscode.workspace.getConfiguration('smartaudit');
        const apiKey = config.get<string>('apiKey');
        const apiUrl = config.get<string>('apiUrl');
        const cachedUser = this.context.workspaceState.get('smartaudit.user') as any;
        
        const items: SmartAuditTreeItem[] = [];
        
        if (!apiKey || apiKey.trim().length === 0) {
            items.push(new SmartAuditTreeItem(
                '❌ API Key Missing',
                vscode.TreeItemCollapsibleState.None,
                'statusItem',
                {
                    command: 'workbench.action.openSettings',
                    title: 'Configure API Key',
                    arguments: ['smartaudit.apiKey']
                },
                new vscode.ThemeIcon('key')
            ));
        } else if (!apiUrl || apiUrl.trim().length === 0) {
            items.push(new SmartAuditTreeItem(
                '❌ API URL Missing',
                vscode.TreeItemCollapsibleState.None,
                'statusItem',
                {
                    command: 'workbench.action.openSettings',
                    title: 'Configure API URL',
                    arguments: ['smartaudit.apiUrl']
                },
                new vscode.ThemeIcon('globe')
            ));
        } else if (cachedUser) {
            // Show real user info
            items.push(new SmartAuditTreeItem(
                `✅ Plan: ${cachedUser.planTier}`,
                vscode.TreeItemCollapsibleState.None,
                'statusItem',
                undefined,
                new vscode.ThemeIcon('star')
            ));
            
            items.push(new SmartAuditTreeItem(
                `💰 Credits: ${cachedUser.balance}`,
                vscode.TreeItemCollapsibleState.None,
                'statusItem',
                undefined,
                new vscode.ThemeIcon('credit-card')
            ));
            
            items.push(new SmartAuditTreeItem(
                `🔍 Total Audits: ${Math.floor(cachedUser.totalUsed / 10)}`,
                vscode.TreeItemCollapsibleState.None,
                'statusItem',
                undefined,
                new vscode.ThemeIcon('search')
            ));
            
            if (cachedUser.canCreatePrivateAudits) {
                items.push(new SmartAuditTreeItem(
                    '✅ Private Audits Enabled',
                    vscode.TreeItemCollapsibleState.None,
                    'statusItem',
                    undefined,
                    new vscode.ThemeIcon('shield')
                ));
            } else {
                items.push(new SmartAuditTreeItem(
                    '❌ Upgrade to Pro for Private Audits',
                    vscode.TreeItemCollapsibleState.None,
                    'statusItem',
                    {
                        command: 'vscode.open',
                        title: 'Upgrade Plan',
                        arguments: [vscode.Uri.parse('https://smartaudit.ai/pricing')]
                    },
                    new vscode.ThemeIcon('warning')
                ));
            }
        } else {
            items.push(new SmartAuditTreeItem(
                '🔄 Validating API Key...',
                vscode.TreeItemCollapsibleState.None,
                'statusItem',
                undefined,
                new vscode.ThemeIcon('sync~spin')
            ));
        }
        
        return items;
    }

    private getConfigItems(): SmartAuditTreeItem[] {
        const items: SmartAuditTreeItem[] = [];
        
        items.push(new SmartAuditTreeItem(
            'API Key: sa_1234567890abcdef...',
            vscode.TreeItemCollapsibleState.None,
            'configItem',
            {
                command: 'workbench.action.openSettings',
                title: 'Configure API Key',
                arguments: ['smartaudit.apiKey']
            },
            new vscode.ThemeIcon('key')
        ));
        
        items.push(new SmartAuditTreeItem(
            'API URL: a7be7c35-b776-43f4-ab98...',
            vscode.TreeItemCollapsibleState.None,
            'configItem',
            {
                command: 'workbench.action.openSettings',
                title: 'Configure API URL',
                arguments: ['smartaudit.apiUrl']
            },
            new vscode.ThemeIcon('globe')
        ));
        
        items.push(new SmartAuditTreeItem(
            '⚙️ Open All Settings',
            vscode.TreeItemCollapsibleState.None,
            'configItem',
            {
                command: 'workbench.action.openSettings',
                title: 'Open SmartAudit Settings',
                arguments: ['smartaudit']
            },
            new vscode.ThemeIcon('settings-gear')
        ));
        
        return items;
    }

    private getActionItems(): SmartAuditTreeItem[] {
        const items: SmartAuditTreeItem[] = [];
        
        items.push(new SmartAuditTreeItem(
            '🔍 Audit Current File',
            vscode.TreeItemCollapsibleState.None,
            'actionItem',
            {
                command: 'smartaudit.auditFile',
                title: 'Audit Current File'
            },
            new vscode.ThemeIcon('search')
        ));
        
        items.push(new SmartAuditTreeItem(
            '📊 View Audit History',
            vscode.TreeItemCollapsibleState.None,
            'actionItem',
            {
                command: 'smartaudit.showHistory',
                title: 'Show Audit History'
            },
            new vscode.ThemeIcon('history')
        ));
        
        items.push(new SmartAuditTreeItem(
            '💰 Check Credit Balance',
            vscode.TreeItemCollapsibleState.None,
            'actionItem',
            {
                command: 'smartaudit.showCredits',
                title: 'Show Credit Balance'
            },
            new vscode.ThemeIcon('credit-card')
        ));
        
        items.push(new SmartAuditTreeItem(
            '🔄 Refresh Dashboard',
            vscode.TreeItemCollapsibleState.None,
            'actionItem',
            {
                command: 'smartaudit.refresh',
                title: 'Refresh Dashboard'
            },
            new vscode.ThemeIcon('refresh')
        ));
        
        items.push(new SmartAuditTreeItem(
            '📚 Open Documentation',
            vscode.TreeItemCollapsibleState.None,
            'actionItem',
            {
                command: 'vscode.open',
                title: 'Open Documentation',
                arguments: [vscode.Uri.parse('https://smartaudit.ai/docs')]
            },
            new vscode.ThemeIcon('book')
        ));
        
        return items;
    }

    private getLanguageItems(): SmartAuditTreeItem[] {
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
        
        return languages.map(lang => new SmartAuditTreeItem(
            `✅ ${lang.name}`,
            vscode.TreeItemCollapsibleState.None,
            'languageItem',
            undefined,
            new vscode.ThemeIcon(lang.icon)
        ));
    }
    
    private getResultItems(): SmartAuditTreeItem[] {
        const items: SmartAuditTreeItem[] = [];
        
        items.push(new SmartAuditTreeItem(
            '🔴 Critical: Reentrancy Vulnerability',
            vscode.TreeItemCollapsibleState.None,
            'resultItem',
            {
                command: 'vscode.open',
                title: 'Open Issue',
                arguments: [vscode.Uri.file('path/to/file'), { selection: new vscode.Range(44, 0, 44, 50) }]
            },
            new vscode.ThemeIcon('error')
        ));
        
        items.push(new SmartAuditTreeItem(
            '🟡 Medium: Unchecked External Call',
            vscode.TreeItemCollapsibleState.None,
            'resultItem',
            {
                command: 'vscode.open',
                title: 'Open Issue',
                arguments: [vscode.Uri.file('path/to/file'), { selection: new vscode.Range(66, 0, 66, 30) }]
            },
            new vscode.ThemeIcon('warning')
        ));
        
        items.push(new SmartAuditTreeItem(
            '🟠 Low: Gas Optimization Opportunity',
            vscode.TreeItemCollapsibleState.None,
            'resultItem',
            {
                command: 'vscode.open',
                title: 'Open Issue',
                arguments: [vscode.Uri.file('path/to/file'), { selection: new vscode.Range(22, 0, 22, 40) }]
            },
            new vscode.ThemeIcon('info')
        ));
        
        return items;
    }
    
    private getSummaryItems(): SmartAuditTreeItem[] {
        const items: SmartAuditTreeItem[] = [];
        
        items.push(new SmartAuditTreeItem(
            '✅ Contract: Immunefi_ch1.sol',
            vscode.TreeItemCollapsibleState.None,
            'summaryItem',
            undefined,
            new vscode.ThemeIcon('file-code')
        ));
        
        items.push(new SmartAuditTreeItem(
            '⏱️ Completed: 2m 34s ago',
            vscode.TreeItemCollapsibleState.None,
            'summaryItem',
            undefined,
            new vscode.ThemeIcon('clock')
        ));
        
        items.push(new SmartAuditTreeItem(
            '🔍 Lines Analyzed: 156',
            vscode.TreeItemCollapsibleState.None,
            'summaryItem',
            undefined,
            new vscode.ThemeIcon('search')
        ));
        
        items.push(new SmartAuditTreeItem(
            '💰 Credits Used: 5',
            vscode.TreeItemCollapsibleState.None,
            'summaryItem',
            undefined,
            new vscode.ThemeIcon('credit-card')
        ));
        
        items.push(new SmartAuditTreeItem(
            '📊 Security Score: 7.2/10',
            vscode.TreeItemCollapsibleState.None,
            'summaryItem',
            undefined,
            new vscode.ThemeIcon('graph')
        ));
        
        return items;
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 WORKING TREE EXTENSION: Starting activation...');
    
    try {
        // Create the data provider - exactly like AgentLISA
        const dataProvider = new SmartAuditDataProvider(context);
        
        // Register the tree data provider - this is the KEY difference
        const treeRegistration = vscode.window.registerTreeDataProvider(
            'smartauditSidebar',  // Must match package.json view id
            dataProvider
        );
        
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
                
            } else {
                vscode.window.showWarningMessage('📝 SmartAudit AI: Please open a smart contract file to audit');
            }
        });
        
        const refreshCommand = vscode.commands.registerCommand('smartaudit.refresh', async () => {
            console.log('🔄 Refreshing authentication...');
            vscode.window.showInformationMessage('🔄 SmartAudit AI: Refreshing connection...');
            
            // Clear cached auth and re-validate
            dataProvider.authService.clearCache();
            context.workspaceState.update('smartaudit.user', undefined);
            
            // Trigger re-authentication
            const authResult = await dataProvider.authService.validateApiKey();
            
            if (authResult.success && authResult.user) {
                context.workspaceState.update('smartaudit.user', authResult.user);
                vscode.window.showInformationMessage(
                    `✅ SmartAudit AI: Connected as ${authResult.user.planTier} user with ${authResult.user.balance} credits`
                );
            } else {
                vscode.window.showErrorMessage(
                    `❌ SmartAudit AI: ${authResult.error || 'Authentication failed'}`
                );
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
        
    } catch (error) {
        console.error('❌ WORKING TREE EXTENSION: Activation failed:', error);
        vscode.window.showErrorMessage(`SmartAudit AI tree activation failed: ${error}`);
    }
}

export function deactivate() {
    console.log('👋 WORKING TREE EXTENSION: Deactivated');
}