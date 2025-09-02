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
exports.EnhancedDiagnosticProvider = void 0;
const vscode = __importStar(require("vscode"));
const smartDiagnostics_1 = require("../utils/smartDiagnostics");
class EnhancedDiagnosticProvider {
    constructor(diagnosticCollection, api) {
        this.api = api;
        this.diagnosticCollection = diagnosticCollection;
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.statusBarItem.command = 'smartaudit.showCredits';
        this.statusBarItem.show();
        // Create decoration type for inline highlights
        this.decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: new vscode.ThemeColor('editorError.background'),
            border: '1px solid',
            borderColor: new vscode.ThemeColor('editorError.foreground'),
            borderRadius: '3px',
            isWholeLine: false
        });
        // Update status bar periodically
        this.updateStatusBar();
        setInterval(() => this.updateStatusBar(), 60000); // Every minute
    }
    /**
     * Show enhanced diagnostics with smart parsing and contextual information
     */
    async showDiagnostics(document, auditReport, detectedLang) {
        try {
            // Parse using smart diagnostics parser with language context
            const smartDiagnostics = smartDiagnostics_1.SmartDiagnosticsParser.parseAuditReport(auditReport, document.getText(), detectedLang);
            // Convert to VS Code diagnostics
            const vscDiagnostics = this.convertToVSCodeDiagnostics(smartDiagnostics);
            // Set diagnostics
            this.diagnosticCollection.set(document.uri, vscDiagnostics);
            // Add inline decorations
            this.addInlineDecorations(document, smartDiagnostics);
            // Show summary notification with language info
            this.showSummaryNotification(smartDiagnostics, detectedLang);
            // Update status bar
            await this.updateStatusBar();
        }
        catch (error) {
            console.error('Failed to show enhanced diagnostics:', error);
            vscode.window.showErrorMessage('Failed to process audit results');
        }
    }
    /**
     * Convert smart diagnostics to VS Code format
     */
    convertToVSCodeDiagnostics(diagnostics) {
        return diagnostics.map(diag => {
            const range = new vscode.Range(Math.max(0, diag.line), diag.column, Math.max(0, diag.endLine), diag.endColumn);
            const severity = this.convertSeverity(diag.severity);
            const vscDiagnostic = new vscode.Diagnostic(range, diag.message, severity);
            // Add rich metadata
            vscDiagnostic.source = diag.source;
            if (diag.code) {
                vscDiagnostic.code = {
                    value: diag.code,
                    target: vscode.Uri.parse('https://docs.smartaudit.ai/vulnerabilities')
                };
            }
            // Add related information for context
            if (diag.recommendation) {
                vscDiagnostic.relatedInformation = [{
                        location: new vscode.Location(vscode.Uri.parse('recommendation'), range),
                        message: `💡 Recommendation: ${diag.recommendation}`
                    }];
            }
            // Add tags for better categorization
            if (diag.severity === 'error') {
                vscDiagnostic.tags = [vscode.DiagnosticTag.Deprecated];
            }
            return vscDiagnostic;
        });
    }
    /**
     * Add inline decorations for visual emphasis
     */
    addInlineDecorations(document, diagnostics) {
        const editor = vscode.window.activeTextEditor;
        if (!editor || editor.document !== document) {
            return;
        }
        const decorations = diagnostics
            .filter(d => d.severity === 'error')
            .map(diag => ({
            range: new vscode.Range(diag.line, diag.column, diag.endLine, diag.endColumn),
            hoverMessage: new vscode.MarkdownString(`🚨 **${diag.category || 'Security Issue'}**\n\n${diag.message}\n\n${diag.recommendation ? `💡 **Recommendation:** ${diag.recommendation}` : ''}`)
        }));
        editor.setDecorations(this.decorationType, decorations);
    }
    /**
     * Show summary notification with actionable insights
     */
    showSummaryNotification(diagnostics, detectedLang) {
        const counts = {
            error: diagnostics.filter(d => d.severity === 'error').length,
            warning: diagnostics.filter(d => d.severity === 'warning').length,
            info: diagnostics.filter(d => d.severity === 'information').length
        };
        const total = counts.error + counts.warning + counts.info;
        if (total === 0) {
            const langMessage = detectedLang ?
                `✅ No security issues found in your ${detectedLang.language.name} code! ` +
                    `${detectedLang.language.icon} Ready for ${detectedLang.language.networks.slice(0, 2).join(', ')}.` :
                '✅ No security issues found! Your code looks good.';
            vscode.window.showInformationMessage(langMessage, 'View Details').then(action => {
                if (action === 'View Details') {
                    vscode.commands.executeCommand('workbench.panel.markers.view.focus');
                }
            });
            return;
        }
        const severity = counts.error > 0 ? '🚨 Critical' :
            counts.warning > 0 ? '⚠️ Warning' : '📝 Info';
        const langInfo = detectedLang ?
            `${detectedLang.language.icon} ${detectedLang.language.name} ` : '';
        const message = `${langInfo}${severity}: Found ${total} issues (${counts.error} critical, ${counts.warning} warnings, ${counts.info} info)`;
        if (counts.error > 0) {
            vscode.window.showErrorMessage(message, 'View Issues', 'Learn More').then(action => {
                if (action === 'View Issues') {
                    vscode.commands.executeCommand('workbench.panel.markers.view.focus');
                }
                else if (action === 'Learn More') {
                    vscode.env.openExternal(vscode.Uri.parse('https://docs.smartaudit.ai/security-guide'));
                }
            });
        }
        else {
            vscode.window.showWarningMessage(message, 'View Issues').then(action => {
                if (action === 'View Issues') {
                    vscode.commands.executeCommand('workbench.panel.markers.view.focus');
                }
            });
        }
    }
    /**
     * Update status bar with current credit balance
     */
    async updateStatusBar() {
        try {
            const userInfo = await this.api.getUserInfo();
            this.statusBarItem.text = `$(shield) SmartAudit: ${userInfo.credits} credits`;
            this.statusBarItem.tooltip = `SmartAudit AI - Credits: ${userInfo.credits}\nUser: ${userInfo.displayName || 'Anonymous'}`;
        }
        catch (error) {
            this.statusBarItem.text = '$(shield) SmartAudit: Not connected';
            this.statusBarItem.tooltip = 'SmartAudit AI - Click to configure API key';
        }
    }
    /**
     * Clear all diagnostics and decorations
     */
    clearDiagnostics(document) {
        if (document) {
            this.diagnosticCollection.set(document.uri, []);
        }
        else {
            this.diagnosticCollection.clear();
        }
        // Clear decorations
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            editor.setDecorations(this.decorationType, []);
        }
    }
    /**
     * Convert severity string to VS Code severity
     */
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
    /**
     * Dispose of resources
     */
    dispose() {
        this.statusBarItem.dispose();
        this.decorationType.dispose();
    }
}
exports.EnhancedDiagnosticProvider = EnhancedDiagnosticProvider;
//# sourceMappingURL=enhancedDiagnosticProvider.js.map