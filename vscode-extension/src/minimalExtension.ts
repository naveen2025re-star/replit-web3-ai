import * as vscode from 'vscode';

class MinimalProvider implements vscode.WebviewViewProvider {
    constructor() {}

    resolveWebviewView(webviewView: vscode.WebviewView): void {
        console.log('🎯 MINIMAL PROVIDER: resolveWebviewView called!');
        
        webviewView.webview.options = {
            enableScripts: true
        };

        webviewView.webview.html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { 
                        padding: 16px; 
                        font-family: var(--vscode-font-family);
                        color: var(--vscode-foreground);
                    }
                </style>
            </head>
            <body>
                <h2>🎉 SUCCESS!</h2>
                <p>SmartAudit AI webview provider is working!</p>
                <p>✅ Extension loaded correctly</p>
                <p>✅ Webview provider registered</p>
                <p>✅ Content displayed successfully</p>
            </body>
            </html>
        `;
        
        console.log('✅ MINIMAL PROVIDER: HTML set successfully');
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('🚀 MINIMAL EXTENSION: Starting activation...');
    
    const provider = new MinimalProvider();
    
    const disposable = vscode.window.registerWebviewViewProvider(
        'smartauditSidebar',
        provider
    );
    
    context.subscriptions.push(disposable);
    
    console.log('✅ MINIMAL EXTENSION: Webview provider registered for smartauditSidebar');
    console.log('🎉 MINIMAL EXTENSION: Activation complete!');
}

export function deactivate() {
    console.log('👋 MINIMAL EXTENSION: Deactivated');
}