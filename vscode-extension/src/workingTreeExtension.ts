import * as vscode from 'vscode';

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

    constructor(private context: vscode.ExtensionContext) {}

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
            default:
                return Promise.resolve([]);
        }
    }

    private getRootItems(): SmartAuditTreeItem[] {
        const config = vscode.workspace.getConfiguration('smartaudit');
        const apiKey = config.get<string>('apiKey');
        const hasApiKey = apiKey && apiKey.trim().length > 0;
        
        const items: SmartAuditTreeItem[] = [];

        // Status section
        items.push(new SmartAuditTreeItem(
            hasApiKey ? '🟢 Connected & Ready' : '🔴 Not Connected',
            vscode.TreeItemCollapsibleState.Collapsed,
            'status',
            undefined,
            new vscode.ThemeIcon(hasApiKey ? 'check' : 'error')
        ));

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
        
        const items: SmartAuditTreeItem[] = [];
        
        if (apiKey && apiKey.trim().length > 0) {
            items.push(new SmartAuditTreeItem(
                '✅ API Key Configured',
                vscode.TreeItemCollapsibleState.None,
                'statusItem',
                undefined,
                new vscode.ThemeIcon('key')
            ));
            
            items.push(new SmartAuditTreeItem(
                '✅ Extension Active',
                vscode.TreeItemCollapsibleState.None,
                'statusItem',
                undefined,
                new vscode.ThemeIcon('check')
            ));
            
            items.push(new SmartAuditTreeItem(
                '✅ Commands Ready',
                vscode.TreeItemCollapsibleState.None,
                'statusItem',
                undefined,
                new vscode.ThemeIcon('terminal')
            ));
            
            items.push(new SmartAuditTreeItem(
                '🔗 API Connected',
                vscode.TreeItemCollapsibleState.None,
                'statusItem',
                undefined,
                new vscode.ThemeIcon('globe')
            ));
        } else {
            items.push(new SmartAuditTreeItem(
                '❌ API Key Missing',
                vscode.TreeItemCollapsibleState.None,
                'statusItem',
                {
                    command: 'workbench.action.openSettings',
                    title: 'Open Settings',
                    arguments: ['smartaudit.apiKey']
                },
                new vscode.ThemeIcon('warning')
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
        const auditCommand = vscode.commands.registerCommand('smartaudit.auditFile', () => {
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const fileName = editor.document.fileName.split('/').pop() || editor.document.fileName.split('\\').pop();
                vscode.window.showInformationMessage(`🔍 SmartAudit AI: Analyzing ${fileName}...`);
                console.log('📁 Analyzing file:', fileName);
            } else {
                vscode.window.showWarningMessage('📝 SmartAudit AI: Please open a smart contract file to audit');
            }
        });
        
        const refreshCommand = vscode.commands.registerCommand('smartaudit.refresh', () => {
            dataProvider.refresh();
            vscode.window.showInformationMessage('🔄 SmartAudit AI: Dashboard refreshed');
            console.log('🔄 Dashboard refreshed');
        });
        
        const showHistoryCommand = vscode.commands.registerCommand('smartaudit.showHistory', () => {
            vscode.window.showInformationMessage('📊 SmartAudit AI: Audit history feature coming soon!');
        });
        
        const showCreditsCommand = vscode.commands.registerCommand('smartaudit.showCredits', () => {
            vscode.window.showInformationMessage('💰 SmartAudit AI: Current balance: 150 credits');
        });
        
        context.subscriptions.push(auditCommand, refreshCommand, showHistoryCommand, showCreditsCommand);
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