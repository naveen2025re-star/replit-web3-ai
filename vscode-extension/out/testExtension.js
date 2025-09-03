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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
class TestProvider {
    resolveWebviewView(webviewView) {
        console.log('🔥 TEST PROVIDER: resolveWebviewView called!');
        webviewView.webview.options = {
            enableScripts: true
        };
        webviewView.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { 
                        padding: 20px; 
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                        background-color: var(--vscode-editor-background);
                    }
                    .success {
                        background: #4CAF50;
                        color: white;
                        padding: 15px;
                        border-radius: 5px;
                        text-align: center;
                        margin: 10px 0;
                    }
                    .info {
                        background: var(--vscode-editor-selectionBackground);
                        padding: 15px;
                        border-radius: 5px;
                        margin: 10px 0;
                        border: 1px solid var(--vscode-widget-border);
                    }
                </style>
            </head>
            <body>
                <div class="success">
                    <h2>✅ SUCCESS!</h2>
                    <p>SmartAudit AI Extension Working!</p>
                </div>
                
                <div class="info">
                    <h3>🛡️ SmartAudit AI Dashboard</h3>
                    <p><strong>Status:</strong> Connected & Ready</p>
                    <p><strong>API Key:</strong> sa_1234567890abcdef1234567890abcdef</p>
                    <p><strong>API URL:</strong> https://a7be7c35-b776-43f4-ab98-9cf31eb0cf08-00-2op4x3uvf85jc.picard.replit.dev</p>
                </div>
                
                <div class="info">
                    <h4>🚀 Quick Actions</h4>
                    <p>🔍 Audit Current File</p>
                    <p>📊 View Audit History</p>
                    <p>💰 Check Credit Balance</p>
                    <p>⚙️ Configure Settings</p>
                </div>
                
                <div class="info">
                    <h4>ℹ️ Supported Languages</h4>
                    <p>✅ Solidity, Rust, Move, Cairo, Vyper</p>
                    <p>✅ Go, Python, TypeScript + 10 more</p>
                </div>
            </body>
            </html>
        `;
        console.log('✅ TEST PROVIDER: HTML content set successfully');
    }
}
function activate(context) {
    console.log('🚀 TEST EXTENSION: Activating...');
    console.log('📂 Extension path:', context.extensionPath);
    console.log('🆔 Extension ID: smartaudit-ai');
    try {
        const provider = new TestProvider();
        const disposable = vscode.window.registerWebviewViewProvider('smartauditSidebar', // This must match exactly with package.json views.explorer.id
        provider);
        context.subscriptions.push(disposable);
        console.log('✅ TEST EXTENSION: Webview provider registered successfully');
        console.log('🎯 Registered for view ID: smartauditSidebar');
        // Show success message
        vscode.window.showInformationMessage('SmartAudit AI Extension activated successfully!');
        console.log('🎉 TEST EXTENSION: Activation completed successfully');
    }
    catch (error) {
        console.error('❌ TEST EXTENSION: Activation failed:', error);
        vscode.window.showErrorMessage(`SmartAudit AI activation failed: ${error}`);
    }
}
function deactivate() {
    console.log('👋 TEST EXTENSION: Deactivated');
}
//# sourceMappingURL=testExtension.js.map