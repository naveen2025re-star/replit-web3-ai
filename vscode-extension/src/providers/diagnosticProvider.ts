import * as vscode from 'vscode';
import { SmartAuditAPI, AuditDiagnostic } from '../api/smartauditApi';

export class DiagnosticProvider {
    constructor(
        private diagnosticCollection: vscode.DiagnosticCollection,
        private api: SmartAuditAPI
    ) {}
    
    showDiagnostics(document: vscode.TextDocument, auditDiagnostics: AuditDiagnostic[]) {
        const diagnostics: vscode.Diagnostic[] = [];
        
        for (const auditDiagnostic of auditDiagnostics) {
            const range = new vscode.Range(
                Math.max(0, auditDiagnostic.line),
                auditDiagnostic.column,
                Math.max(0, auditDiagnostic.endLine),
                auditDiagnostic.endColumn
            );
            
            const severity = this.convertSeverity(auditDiagnostic.severity);
            
            const diagnostic = new vscode.Diagnostic(
                range,
                auditDiagnostic.message,
                severity
            );
            
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
            vscode.window.setStatusBarMessage(
                `SmartAudit: ${errorCount} errors, ${warningCount} warnings`,
                5000
            );
        }
    }
    
    clearDiagnostics(document?: vscode.TextDocument) {
        if (document) {
            this.diagnosticCollection.set(document.uri, []);
        } else {
            this.diagnosticCollection.clear();
        }
    }
    
    private convertSeverity(severity: string): vscode.DiagnosticSeverity {
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