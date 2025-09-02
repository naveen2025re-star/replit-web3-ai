import * as vscode from 'vscode';
import { SmartAuditAPI } from './api/smartauditApi';
import { DiagnosticProvider } from './providers/diagnosticProvider';
import { SidebarProvider } from './providers/sidebarProvider';

let diagnosticCollection: vscode.DiagnosticCollection;
let smartauditApi: SmartAuditAPI;
let diagnosticProvider: DiagnosticProvider;

export function activate(context: vscode.ExtensionContext) {
    console.log('SmartAudit AI extension is now active!');
    
    // Initialize API client
    smartauditApi = new SmartAuditAPI();
    
    // Create diagnostic collection for showing security issues
    diagnosticCollection = vscode.languages.createDiagnosticCollection('smartaudit');
    context.subscriptions.push(diagnosticCollection);
    
    // Initialize diagnostic provider
    diagnosticProvider = new DiagnosticProvider(diagnosticCollection, smartauditApi);
    
    // Initialize sidebar provider
    const sidebarProvider = new SidebarProvider(context.extensionUri, smartauditApi);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('smartauditSidebar', sidebarProvider)
    );
    
    // Register commands
    
    // Audit current file
    const auditFileDisposable = vscode.commands.registerCommand('smartaudit.auditFile', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showWarningMessage('No active Solidity file to audit.');
            return;
        }
        
        const document = editor.document;
        if (document.languageId !== 'solidity') {
            vscode.window.showWarningMessage('SmartAudit AI only supports Solidity files (.sol)');
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
        
        if (autoAudit && document.languageId === 'solidity') {
            await auditDocument(document);
        }
    });
    
    context.subscriptions.push(
        auditFileDisposable,
        showHistoryDisposable, 
        showCreditsDisposable,
        autoAuditDisposable
    );
    
    // Set context for workspace with smart contracts
    checkForSmartContracts();
    
    // Watch for new .sol files
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.sol');
    watcher.onDidCreate(() => checkForSmartContracts());
    watcher.onDidDelete(() => checkForSmartContracts());
    context.subscriptions.push(watcher);
}

async function auditDocument(document: vscode.TextDocument) {
    const config = vscode.workspace.getConfiguration('smartaudit');
    const apiKey = config.get<string>('apiKey');
    
    if (!apiKey) {
        const action = await vscode.window.showWarningMessage(
            'SmartAudit AI API key not configured.',
            'Configure Now',
            'Get API Key'
        );
        
        if (action === 'Configure Now') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'smartaudit.apiKey');
        } else if (action === 'Get API Key') {
            vscode.env.openExternal(vscode.Uri.parse('https://smartaudit.ai/settings'));
        }
        return;
    }
    
    const fileName = document.fileName.split('/').pop() || 'contract.sol';
    const contractCode = document.getText();
    
    if (!contractCode.trim()) {
        vscode.window.showWarningMessage('No contract code to audit.');
        return;
    }
    
    // Show progress
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Auditing ${fileName}...`,
        cancellable: false
    }, async (progress) => {
        try {
            progress.report({ message: 'Starting analysis...' });
            
            // Start audit
            const auditResponse = await smartauditApi.startAudit(contractCode, 'solidity', fileName);
            
            progress.report({ message: 'Analyzing contract...' });
            
            // Poll for results
            let attempts = 0;
            const maxAttempts = 60; // 5 minutes max
            
            while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
                
                const status = await smartauditApi.getAuditStatus(auditResponse.sessionId);
                
                if (status.status === 'completed') {
                    progress.report({ message: 'Processing results...' });
                    
                    // Show diagnostics if enabled
                    const showInline = config.get<boolean>('showInlineResults', true);
                    if (showInline && status.diagnostics) {
                        diagnosticProvider.showDiagnostics(document, status.diagnostics);
                    }
                    
                    // Show summary
                    const vulnCount = status.vulnerabilityCount || { high: 0, medium: 0, low: 0 };
                    const total = vulnCount.high + vulnCount.medium + vulnCount.low;
                    
                    vscode.window.showInformationMessage(
                        `Audit completed! Found ${total} issues (${vulnCount.high} high, ${vulnCount.medium} medium, ${vulnCount.low} low) • Used ${status.creditsUsed} credits`
                    );
                    
                    return;
                } else if (status.status === 'failed') {
                    throw new Error('Audit analysis failed');
                }
                
                attempts++;
            }
            
            throw new Error('Audit timed out');
            
        } catch (error) {
            vscode.window.showErrorMessage(`Audit failed: ${error}`);
            console.error('Audit error:', error);
        }
    });
}

async function checkForSmartContracts() {
    const files = await vscode.workspace.findFiles('**/*.sol', '**/node_modules/**', 1);
    vscode.commands.executeCommand('setContext', 'workspaceHasSmartContracts', files.length > 0);
}

export function deactivate() {
    if (diagnosticCollection) {
        diagnosticCollection.dispose();
    }
}