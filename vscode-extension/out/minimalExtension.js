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
class MinimalProvider {
    constructor() { }
    resolveWebviewView(webviewView) {
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
function activate(context) {
    console.log('🚀 MINIMAL EXTENSION: Starting activation...');
    const provider = new MinimalProvider();
    const disposable = vscode.window.registerWebviewViewProvider('smartauditSidebar', provider);
    context.subscriptions.push(disposable);
    console.log('✅ MINIMAL EXTENSION: Webview provider registered for smartauditSidebar');
    console.log('🎉 MINIMAL EXTENSION: Activation complete!');
}
function deactivate() {
    console.log('👋 MINIMAL EXTENSION: Deactivated');
}
//# sourceMappingURL=minimalExtension.js.map