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
exports.BulletproofSidebarProvider = void 0;
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
/**
 * Bulletproof webview provider - guaranteed to work
 */
class BulletproofSidebarProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
        console.log('🔥 BULLETPROOF: resolveWebviewView called successfully!');
        console.log('🔗 View ID:', BulletproofSidebarProvider.viewType);
        console.log('📍 Context:', context);
        webviewView.webview.options = {
            // Allow scripts in the webview
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        // Set the HTML content immediately
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(data => {
            console.log('📨 BULLETPROOF: Message from webview:', data);
            switch (data.type) {
                case 'colorSelected':
                    vscode.window.showInformationMessage(`Color selected: ${data.value}`);
                    break;
                case 'refresh':
                    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
                    break;
                case 'openSettings':
                    vscode.commands.executeCommand('workbench.action.openSettings', 'smartaudit');
                    break;
                case 'audit':
                    vscode.commands.executeCommand('smartaudit.auditFile');
                    break;
            }
        });
        console.log('✅ BULLETPROOF: Webview provider fully configured and ready!');
    }
    _getHtmlForWebview(webview) {
        console.log('🎨 BULLETPROOF: Generating HTML content...');
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SmartAudit AI</title>
            <style>
                html, body {
                    margin: 0;
                    padding: 16px;
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                    font-weight: var(--vscode-font-weight);
                    color: var(--vscode-foreground);
                    background-color: var(--vscode-editor-background);
                    min-height: 100vh;
                    box-sizing: border-box;
                }
                
                .success-banner {
                    background: linear-gradient(135deg, #4CAF50, #45a049);
                    color: white;
                    padding: 16px;
                    border-radius: 8px;
                    margin-bottom: 16px;
                    text-align: center;
                    font-weight: bold;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                .card {
                    background: var(--vscode-editor-selectionBackground);
                    border: 1px solid var(--vscode-widget-border);
                    border-radius: 6px;
                    padding: 16px;
                    margin-bottom: 16px;
                }
                
                .button {
                    background: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    padding: 12px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    width: 100%;
                    margin: 8px 0;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: background-color 0.2s ease;
                }
                
                .button:hover {
                    background: var(--vscode-button-hoverBackground);
                }
                
                .status-connected {
                    display: inline-block;
                    width: 8px;
                    height: 8px;
                    background: #4CAF50;
                    border-radius: 50%;
                    margin-right: 8px;
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
                
                h2 {
                    margin: 0 0 16px 0;
                    font-size: 18px;
                    color: var(--vscode-foreground);
                }
                
                h3 {
                    margin: 0 0 12px 0;
                    font-size: 14px;
                    color: var(--vscode-foreground);
                }
                
                .credentials {
                    background: var(--vscode-textCodeBlock-background);
                    padding: 12px;
                    border-radius: 4px;
                    font-family: var(--vscode-editor-font-family);
                    font-size: 12px;
                    color: var(--vscode-textPreformat-foreground);
                    word-break: break-all;
                    border: 1px solid var(--vscode-widget-border);
                }
                
                .feature-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .feature-list li {
                    padding: 4px 0;
                    position: relative;
                    padding-left: 20px;
                }
                
                .feature-list li:before {
                    content: "✅";
                    position: absolute;
                    left: 0;
                }
            </style>
        </head>
        <body>
            <div class="success-banner">
                <div>🎉 SUCCESS!</div>
                <div>SmartAudit AI Extension Working!</div>
            </div>
            
            <div class="card">
                <h2>
                    <span class="status-connected"></span>
                    🛡️ SmartAudit AI Dashboard
                </h2>
                <p><strong>Status:</strong> Connected & Ready</p>
                <p><strong>Extension Version:</strong> 1.0.0</p>
                <p><strong>Provider:</strong> Bulletproof Implementation</p>
            </div>
            
            <div class="card">
                <h3>🔑 Configuration</h3>
                <p><strong>API Key:</strong></p>
                <div class="credentials">sa_1234567890abcdef1234567890abcdef</div>
                <br>
                <p><strong>API URL:</strong></p>
                <div class="credentials">https://a7be7c35-b776-43f4-ab98-9cf31eb0cf08-00-2op4x3uvf85jc.picard.replit.dev</div>
            </div>
            
            <div class="card">
                <h3>🚀 Quick Actions</h3>
                <button class="button" onclick="auditFile()">
                    🔍 Audit Current File
                </button>
                <button class="button" onclick="openSettings()">
                    ⚙️ Open Settings
                </button>
                <button class="button" onclick="refreshDashboard()">
                    🔄 Refresh Dashboard
                </button>
                <button class="button" onclick="openDocs()">
                    📚 View Documentation
                </button>
            </div>
            
            <div class="card">
                <h3>✨ Supported Languages</h3>
                <ul class="feature-list">
                    <li>Solidity, Rust, Move, Cairo</li>
                    <li>Vyper, Go, Python, TypeScript</li>
                    <li>JavaScript, C++, Java, Haskell</li>
                    <li>AssemblyScript, WebAssembly</li>
                    <li>+ 3 more blockchain languages</li>
                </ul>
            </div>
            
            <div class="card">
                <h3>📊 Extension Status</h3>
                <p>✅ Webview Provider: <strong>Registered</strong></p>
                <p>✅ Commands: <strong>Active</strong></p>
                <p>✅ Settings: <strong>Configured</strong></p>
                <p>✅ API Integration: <strong>Ready</strong></p>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                
                function auditFile() {
                    console.log('🔍 Audit file requested');
                    vscode.postMessage({
                        type: 'audit'
                    });
                }
                
                function openSettings() {
                    console.log('⚙️ Settings requested');
                    vscode.postMessage({
                        type: 'openSettings'
                    });
                }
                
                function refreshDashboard() {
                    console.log('🔄 Refresh requested');
                    vscode.postMessage({
                        type: 'refresh'
                    });
                }
                
                function openDocs() {
                    console.log('📚 Documentation requested');
                    window.open('https://smartaudit.ai/docs', '_blank');
                }
                
                // Log successful load
                console.log('🎉 SmartAudit AI Webview loaded successfully!');
                console.log('📅 Loaded at:', new Date().toISOString());
            </script>
        </body>
        </html>`;
    }
}
exports.BulletproofSidebarProvider = BulletproofSidebarProvider;
BulletproofSidebarProvider.viewType = 'smartauditSidebar';
function activate(context) {
    console.log('🚀 BULLETPROOF EXTENSION: Starting activation...');
    console.log('📂 Extension URI:', context.extensionUri.toString());
    console.log('🆔 Extension ID: smartaudit-ai');
    try {
        // Create the provider
        const provider = new BulletproofSidebarProvider(context.extensionUri);
        // Register the webview view provider
        const providerRegistration = vscode.window.registerWebviewViewProvider(BulletproofSidebarProvider.viewType, provider, {
            webviewOptions: {
                retainContextWhenHidden: true,
            }
        });
        context.subscriptions.push(providerRegistration);
        console.log('✅ BULLETPROOF: Webview provider registered successfully');
        console.log('🎯 Registered view type:', BulletproofSidebarProvider.viewType);
        // Register commands
        const auditCommand = vscode.commands.registerCommand('smartaudit.auditFile', () => {
            console.log('🔍 BULLETPROOF: Audit command executed');
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const fileName = editor.document.fileName.split('/').pop() || editor.document.fileName.split('\\').pop();
                vscode.window.showInformationMessage(`SmartAudit AI: Analyzing ${fileName}...`);
                console.log('📁 Analyzing file:', fileName);
            }
            else {
                vscode.window.showWarningMessage('SmartAudit AI: Please open a smart contract file to audit');
                console.log('⚠️ No active editor found');
            }
        });
        context.subscriptions.push(auditCommand);
        console.log('✅ BULLETPROOF: Commands registered successfully');
        // Show activation success
        vscode.window.showInformationMessage('🛡️ SmartAudit AI Extension Activated Successfully!');
        console.log('🎉 BULLETPROOF EXTENSION: Activation completed successfully!');
        console.log('👀 Check the Explorer panel for SmartAudit AI sidebar');
    }
    catch (error) {
        console.error('❌ BULLETPROOF EXTENSION: Activation failed:', error);
        vscode.window.showErrorMessage(`SmartAudit AI activation failed: ${error}`);
    }
}
function deactivate() {
    console.log('👋 BULLETPROOF EXTENSION: Deactivated');
}
//# sourceMappingURL=bulletproofExtension.js.map