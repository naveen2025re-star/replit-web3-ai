import * as vscode from 'vscode';
import { SmartAuditAPI } from './api/smartauditApi';
import { EnhancedDiagnosticProvider } from './providers/enhancedDiagnosticProvider';
import { SidebarProvider } from './providers/sidebarProvider';
import { SecureStorage } from './security/secureStorage';
import { BlockchainLanguageDetector } from './utils/blockchainLanguageDetector';
import { LanguageSelector } from './commands/languageSelector';

let diagnosticCollection: vscode.DiagnosticCollection;
let smartauditApi: SmartAuditAPI;
let diagnosticProvider: EnhancedDiagnosticProvider;
let secureStorage: SecureStorage;
let sidebarProvider: any;

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 SmartAudit AI extension activating...');
    console.log('Extension path:', context.extensionPath);
    console.log('VS Code version:', vscode.version);
    
    // Initialize secure storage
    secureStorage = SecureStorage.getInstance(context);
    
    // Initialize API client
    smartauditApi = new SmartAuditAPI();
    
    // Create diagnostic collection for showing security issues
    diagnosticCollection = vscode.languages.createDiagnosticCollection('smartaudit');
    context.subscriptions.push(diagnosticCollection);
    
    // Initialize enhanced diagnostic provider
    diagnosticProvider = new EnhancedDiagnosticProvider(diagnosticCollection, smartauditApi);
    context.subscriptions.push(diagnosticProvider);
    
    // Initialize and register sidebar provider using exact VS Code pattern
    sidebarProvider = new SidebarProvider(context.extensionUri, smartauditApi);
    
    // Register webview provider with exact match to package.json view ID
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            SidebarProvider.viewType, // Use the static viewType from class
            sidebarProvider
        )
    );
    
    console.log('✅ SmartAudit AI: Registered webview provider with ID:', SidebarProvider.viewType);
    console.log('🎉 SmartAudit AI extension fully activated!');
    
    // Set configured context for other extensions/commands
    const updateConfiguredContext = async () => {
        const config = vscode.workspace.getConfiguration('smartaudit');
        const apiKey = config.get<string>('apiKey');
        const isConfigured = !!apiKey && apiKey.trim().length > 0;
        await vscode.commands.executeCommand('setContext', 'smartaudit.configured', isConfigured);
        console.log('SmartAudit configured context:', isConfigured, 'API Key:', apiKey ? 'Present' : 'Missing');
    };
    
    // Update context initially and when configuration changes
    updateConfiguredContext();
    vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('smartaudit.apiKey')) {
            updateConfiguredContext();
        }
    });
    
    // Register commands
    
    // Audit current file
    const auditFileDisposable = vscode.commands.registerCommand('smartaudit.auditFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active blockchain file to audit.');
            return;
        }
        
        const document = editor.document;
        
        // Check if it's a supported blockchain language
        if (!BlockchainLanguageDetector.isSupportedFile(document)) {
            const supportedExts = BlockchainLanguageDetector.getSupportedLanguages()
                .flatMap(lang => lang.fileExtensions)
                .slice(0, 8) // Show first 8 extensions
                .join(', ');
            vscode.window.showWarningMessage(
                `SmartAudit AI supports blockchain files: ${supportedExts} and more. This file type is not supported.`
            );
            return;
        }
        
        await auditDocument(document);
    });
    
    // Show audit history
    const showHistoryDisposable = vscode.commands.registerCommand('smartaudit.showHistory', async () => {
        try {
            const history = await smartauditApi.getAuditHistory();
            
            const quickPick = vscode.window.createQuickPick();
            quickPick.placeholder = 'Select an audit to view details';
            quickPick.items = history.map(audit => ({
                label: audit.title,
                description: `${audit.status} • ${audit.language} • ${audit.creditsUsed} credits`,
                detail: `Created: ${new Date(audit.createdAt).toLocaleString()}`,
                audit: audit
            }));
            
            quickPick.onDidChangeSelection(selection => {
                if (selection[0]) {
                    const selectedAudit = (selection[0] as any).audit;
                    vscode.window.showInformationMessage(
                        `Audit: ${selectedAudit.title}\\nStatus: ${selectedAudit.status}\\nCredits Used: ${selectedAudit.creditsUsed}`
                    );
                }
                quickPick.hide();
            });
            
            quickPick.show();
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load audit history: ${error}`);
        }
    });
    
    // Show credit balance
    const showCreditsDisposable = vscode.commands.registerCommand('smartaudit.showCredits', async () => {
        try {
            const userInfo = await smartauditApi.getUserInfo();
            vscode.window.showInformationMessage(
                `SmartAudit AI Credits: ${userInfo.credits}\\nUser: ${userInfo.displayName || 'Anonymous'}`
            );
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load credit balance: ${error}`);
        }
    });
    
    // Auto-audit on save if enabled
    const autoAuditDisposable = vscode.workspace.onDidSaveTextDocument(async (document) => {
        const config = vscode.workspace.getConfiguration('smartaudit');
        const autoAudit = config.get<boolean>('autoAudit', false);
        
        if (autoAudit && BlockchainLanguageDetector.isSupportedFile(document)) {
            const detectedLang = BlockchainLanguageDetector.detectFromFile(document);
            const supportedLanguages = config.get<string[]>('supportedLanguages', []);
            
            // Check if this language is enabled for auto-audit
            if (detectedLang && (supportedLanguages.length === 0 || 
                supportedLanguages.includes(detectedLang.language.name.toLowerCase()))) {
                await auditDocument(document);
            }
        }
    });
    
    // Select blockchain language
    const selectLanguageDisposable = vscode.commands.registerCommand('smartaudit.selectLanguage', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active file to set language for.');
            return;
        }
        await LanguageSelector.showLanguageSelector(editor.document);
    });

    // Select target network
    const selectNetworkDisposable = vscode.commands.registerCommand('smartaudit.selectNetwork', async () => {
        const network = await LanguageSelector.showNetworkSelector();
        if (network) {
            const config = vscode.workspace.getConfiguration('smartaudit');
            await config.update('preferredNetwork', network, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage(`Target network set to: ${network}`);
        }
    });
    
    context.subscriptions.push(
        auditFileDisposable,
        showHistoryDisposable, 
        showCreditsDisposable,
        selectLanguageDisposable,
        selectNetworkDisposable,
        autoAuditDisposable
    );
    
    // Set context for workspace with smart contracts
    checkForSmartContracts();
    
    // Watch for blockchain files
    const supportedExts = BlockchainLanguageDetector.getSupportedLanguages()
        .flatMap(lang => lang.fileExtensions)
        .map(ext => `**/*${ext}`)
        .join(',');
    const watcher = vscode.workspace.createFileSystemWatcher(`{${supportedExts}}`);
    watcher.onDidCreate(() => checkForSmartContracts());
    watcher.onDidDelete(() => checkForSmartContracts());
    context.subscriptions.push(watcher);
}

async function auditDocument(document: vscode.TextDocument) {
    // Show immediate feedback that audit has started
    const statusMessage = vscode.window.setStatusBarMessage('🔍 SmartAudit AI: Starting analysis...', 3000);
    
    const config = vscode.workspace.getConfiguration('smartaudit');
    const apiKey = config.get<string>('apiKey');
    
    if (!apiKey) {
        const action = await vscode.window.showWarningMessage(
            '⚠️ SmartAudit AI requires an API key to function. Would you like to configure it now?',
            'Configure Now',
            'Get Free API Key',
        );
        
        if (action === 'Configure Now') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'smartaudit.apiKey');
            vscode.window.showInformationMessage('💡 Tip: Set your API key in the SmartAudit AI settings to start auditing!');
        } else if (action === 'Get Free API Key') {
            vscode.env.openExternal(vscode.Uri.parse('https://smartaudit.ai/settings'));
            vscode.window.showInformationMessage('🌐 Visit smartaudit.ai to get your free API key!');
        }
        return;
    }
    
    // Detect blockchain language (check for user override first)
    const userOverride = LanguageSelector.getUserLanguageOverride(document);
    let detectedLang = userOverride ? 
        { language: BlockchainLanguageDetector.getLanguageByName(userOverride)!, confidence: 1.0, reasons: ['User override'] } :
        BlockchainLanguageDetector.detectFromFile(document);
        
    if (!detectedLang || !detectedLang.language) {
        vscode.window.showErrorMessage('Unable to detect blockchain language for this file.');
        return;
    }
    
    const fileName = document.fileName.split('/').pop() || `contract${detectedLang.language.fileExtensions[0]}`;
    const contractCode = document.getText();
    
    if (!contractCode.trim()) {
        vscode.window.showWarningMessage('No code to audit.');
        return;
    }
    
    // Generate audit configuration
    const auditConfig = BlockchainLanguageDetector.generateAuditConfig(detectedLang);
    
    // Show the sidebar when audit starts
    vscode.commands.executeCommand('setContext', 'workspaceHasSmartContracts', true);
    
    // Show progress with better visibility  
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `🛡️ SmartAudit AI: Analyzing ${detectedLang.language.name}`,
        cancellable: true
    }, async (progress, token) => {
        try {
            progress.report({ 
                message: `Starting ${detectedLang?.language.name || 'code'} analysis...` 
            });
            
            // Start audit with language information
            const auditResponse = await smartauditApi.startAudit(
                contractCode, 
                auditConfig.language.toLowerCase(), 
                fileName,
                auditConfig
            );
            
            progress.report({ message: 'Analyzing contract...' });
            
            // Poll for results
            let attempts = 0;
            const maxAttempts = 60; // 5 minutes max
            
            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
                
                const status = await smartauditApi.getAuditStatus(auditResponse.sessionId);
                
                if (status.status === 'completed') {
                    progress.report({ message: 'Processing results...' });
                    
                    // Show enhanced diagnostics
                    const showInline = config.get<boolean>('showInlineResults', true);
                    if (showInline && status.report) {
                        await diagnosticProvider.showDiagnostics(document, status.report, detectedLang);
                    }
                    
                    // Refresh sidebar
                    sidebarProvider.refresh();
                    
                    // Show completion message with language-specific info
                    const networkInfo = auditConfig.networks.slice(0, 2).join(', ');
                    vscode.window.showInformationMessage(
                        `✅ ${detectedLang?.language.name || 'Code'} audit completed! Compatible with: ${networkInfo}`
                    );
                    
                    return;
                } else if (status.status === 'failed') {
                    throw new Error('Audit analysis failed');
                }
                
                attempts++;
            }
            
            throw new Error('Audit timed out');
            
        } catch (error) {
            // Show detailed error with helpful actions
            const errorMsg = error instanceof Error ? error.message : String(error);
            const action = await vscode.window.showErrorMessage(
                `❌ SmartAudit AI audit failed: ${errorMsg}`,
                'Check Settings',
                'Get Help'
            );
            
            if (action === 'Check Settings') {
                vscode.commands.executeCommand('workbench.action.openSettings', 'smartaudit');
            } else if (action === 'Get Help') {
                vscode.env.openExternal(vscode.Uri.parse('https://smartaudit.ai/help'));
            }
            
            console.error('SmartAudit AI Error:', error);
        }
    });
}

async function checkForSmartContracts() {
    const supportedExts = BlockchainLanguageDetector.getSupportedLanguages()
        .flatMap(lang => lang.fileExtensions)
        .map(ext => `**/*${ext}`)
        .join(',');
    const files = await vscode.workspace.findFiles(`{${supportedExts}}`, '**/node_modules/**', 1);
    vscode.commands.executeCommand('setContext', 'workspaceHasSmartContracts', files.length > 0);
}


export function deactivate() {
    if (diagnosticCollection) {
        diagnosticCollection.dispose();
    }
    
    if (diagnosticProvider) {
        diagnosticProvider.dispose();
    }
    
    if (secureStorage) {
        secureStorage.clearSession();
    }
}