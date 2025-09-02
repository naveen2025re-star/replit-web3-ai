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
exports.DiagnosticProvider = void 0;
const vscode = __importStar(require("vscode"));
class DiagnosticProvider {
    constructor(diagnosticCollection, api) {
        this.diagnosticCollection = diagnosticCollection;
        this.api = api;
    }
    showDiagnostics(document, auditDiagnostics) {
        const diagnostics = [];
        for (const auditDiagnostic of auditDiagnostics) {
            const range = new vscode.Range(Math.max(0, auditDiagnostic.line), auditDiagnostic.column, Math.max(0, auditDiagnostic.endLine), auditDiagnostic.endColumn);
            const severity = this.convertSeverity(auditDiagnostic.severity);
            const diagnostic = new vscode.Diagnostic(range, auditDiagnostic.message, severity);
            diagnostic.source = auditDiagnostic.source || 'SmartAudit AI';
            diagnostic.code = {
                value: 'smart-contract-vulnerability',
                target: vscode.Uri.parse('https://smartaudit.ai/docs/vulnerabilities')
            };
            // Add related information for better context
            if (auditDiagnostic.severity === 'error') {
                diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
            }
            diagnostics.push(diagnostic);
        }
        this.diagnosticCollection.set(document.uri, diagnostics);
        // Show summary in status bar
        const errorCount = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error).length;
        const warningCount = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning).length;
        if (errorCount + warningCount > 0) {
            vscode.window.setStatusBarMessage(`SmartAudit: ${errorCount} errors, ${warningCount} warnings`, 5000);
        }
    }
    clearDiagnostics(document) {
        if (document) {
            this.diagnosticCollection.set(document.uri, []);
        }
        else {
            this.diagnosticCollection.clear();
        }
    }
    convertSeverity(severity) {
        switch (severity.toLowerCase()) {
            case 'error':
                return vscode.DiagnosticSeverity.Error;
            case 'warning':
                return vscode.DiagnosticSeverity.Warning;
            case 'information':
            case 'info':
                return vscode.DiagnosticSeverity.Information;
            default:
                return vscode.DiagnosticSeverity.Warning;
        }
    }
}
exports.DiagnosticProvider = DiagnosticProvider;
//# sourceMappingURL=diagnosticProvider.js.map