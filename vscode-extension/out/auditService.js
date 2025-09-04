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
exports.AuditService = void 0;
const vscode = __importStar(require("vscode"));
class AuditService {
    constructor(context) {
        this.context = context;
    }
    async analyzeContract(contractCode, fileName) {
        const config = vscode.workspace.getConfiguration('smartaudit');
        const apiKey = config.get('apiKey');
        const apiUrl = config.get('apiUrl');
        if (!apiKey || !apiUrl) {
            throw new Error('API key or URL not configured');
        }
        try {
            console.log('[AUDIT] Starting real analysis for:', fileName);
            vscode.window.showInformationMessage(`🔍 SmartAudit AI: Starting analysis of ${fileName}...`);
            // Use the dedicated VS Code audit endpoint
            console.log('[AUDIT] Creating VS Code audit...');
            const result = await this.createVSCodeAudit(contractCode, fileName, apiKey, apiUrl);
            return result;
        }
        catch (error) {
            console.error('[AUDIT] Analysis failed:', error);
            vscode.window.showErrorMessage(`❌ SmartAudit AI: ${error.message}`);
            return null;
        }
    }
    async createVSCodeAudit(contractCode, fileName, apiKey, apiUrl) {
        try {
            // Call the VS Code specific audit endpoint
            const response = await fetch(`${apiUrl}/api/vscode/audit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    contractCode,
                    language: this.detectLanguage(fileName),
                    fileName
                })
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 402) {
                    throw new Error(`Insufficient credits. ${errorData.error || 'Please purchase more credits'}`);
                }
                else if (response.status === 403) {
                    throw new Error('Upgrade to Pro plan required for VS Code extension');
                }
                else if (response.status === 400) {
                    throw new Error(errorData.error || 'Invalid contract code');
                }
                else {
                    throw new Error(errorData.error || `API Error: ${response.status}`);
                }
            }
            const auditData = await response.json();
            console.log('[AUDIT] VS Code audit started:', auditData.sessionId);
            if (!auditData.success || !auditData.sessionId) {
                throw new Error('Failed to start audit session');
            }
            vscode.window.showInformationMessage(`🔄 SmartAudit AI: Audit started, processing...`);
            // Poll for results
            return await this.pollForResults(auditData.sessionId, apiKey, apiUrl);
        }
        catch (error) {
            console.error('[AUDIT] VS Code audit failed:', error);
            throw error;
        }
    }
    async pollForResults(sessionId, apiKey, apiUrl) {
        return new Promise(async (resolve, reject) => {
            try {
                const startTime = Date.now();
                console.log('[AUDIT] Polling for results, session:', sessionId);
                let attempts = 0;
                const maxAttempts = 60; // 5 minutes max (60 attempts × 5s)
                const poll = async () => {
                    try {
                        attempts++;
                        const elapsed = Math.round((Date.now() - startTime) / 1000);
                        console.log(`[POLL ${attempts}] Checking audit status... (${elapsed}s elapsed)`);
                        const response = await fetch(`${apiUrl}/api/vscode/audit/status/${sessionId}`, {
                            method: 'GET',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            }
                        });
                        if (!response.ok) {
                            throw new Error(`Status check failed: ${response.status}`);
                        }
                        const statusData = await response.json();
                        console.log('[AUDIT] Status:', statusData.status);
                        if (statusData.status === 'completed') {
                            // Analysis complete
                            vscode.window.showInformationMessage(`✅ SmartAudit AI: Analysis completed! Processing results...`);
                            console.log(`[AUDIT] Server response:`, JSON.stringify(statusData, null, 2));
                            const responseText = statusData.report || statusData.result || '';
                            // Parse vulnerabilities directly from response for accurate count
                            const vulnerabilities = this.parseVulnerabilities(responseText);
                            console.log(`[AUDIT] Found ${vulnerabilities.length} vulnerabilities in response`);
                            const result = {
                                sessionId,
                                rawResponse: responseText,
                                formattedReport: responseText,
                                vulnerabilityCount: vulnerabilities.length,
                                securityScore: this.calculateSecurityScore(vulnerabilities),
                                completedAt: new Date().toISOString()
                            };
                            resolve(result);
                            return;
                        }
                        else if (statusData.status === 'failed') {
                            reject(new Error(statusData.error || 'Analysis failed'));
                            return;
                        }
                        else if (statusData.status === 'analyzing' || statusData.status === 'pending') {
                            // Still processing
                            if (attempts <= maxAttempts) {
                                if (attempts % 6 === 0) { // Every 30 seconds
                                    vscode.window.showInformationMessage(`📝 SmartAudit AI: Analysis in progress... (${Math.floor(attempts * 5 / 60)} minutes elapsed)`);
                                }
                                setTimeout(poll, 5000); // Poll every 5 seconds
                            }
                            else {
                                reject(new Error('Analysis timeout - taking longer than expected'));
                            }
                        }
                        else {
                            reject(new Error(`Unknown status: ${statusData.status}`));
                        }
                    }
                    catch (error) {
                        console.error('[AUDIT] Polling error:', error);
                        if (attempts <= maxAttempts) {
                            setTimeout(poll, 5000); // Retry after 5 seconds
                        }
                        else {
                            reject(error);
                        }
                    }
                };
                // Start polling
                await poll();
            }
            catch (error) {
                console.error('[AUDIT] Polling failed:', error);
                reject(error);
            }
        });
    }
    async getFinalResults(sessionId, apiKey, apiUrl, rawResponse) {
        try {
            // Try to get structured results from API
            const response = await fetch(`${apiUrl}/api/audit/results/${sessionId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                }
            });
            let structuredResult = null;
            if (response.ok) {
                structuredResult = await response.json();
            }
            // Parse vulnerabilities from raw response
            const vulnerabilities = this.parseVulnerabilities(rawResponse);
            return {
                sessionId,
                rawResponse,
                formattedReport: rawResponse,
                vulnerabilityCount: vulnerabilities.length,
                securityScore: this.calculateSecurityScore(vulnerabilities),
                completedAt: new Date().toISOString()
            };
        }
        catch (error) {
            console.warn('[AUDIT] Failed to get structured results, using raw response');
            const vulnerabilities = this.parseVulnerabilities(rawResponse);
            return {
                sessionId,
                rawResponse,
                formattedReport: rawResponse,
                vulnerabilityCount: vulnerabilities.length,
                securityScore: this.calculateSecurityScore(vulnerabilities),
                completedAt: new Date().toISOString()
            };
        }
    }
    parseVulnerabilities(response) {
        const vulnerabilities = [];
        // Parse different vulnerability formats from AI response
        const lines = response.split('\n');
        let currentVuln = {};
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // Look for severity indicators
            if (line.match(/\*\*(critical|high|medium|low)\*\*/i)) {
                if (currentVuln.title) {
                    vulnerabilities.push(currentVuln);
                }
                currentVuln = {};
                const severity = line.match(/\*\*(critical|high|medium|low)\*\*/i)?.[1];
                if (severity) {
                    currentVuln.severity = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
                }
            }
            // Look for vulnerability titles
            if (line.includes('Vulnerability:') || line.includes('Issue:') || line.includes('Finding:')) {
                currentVuln.title = line.replace(/.*?(Vulnerability|Issue|Finding):\s*/, '').replace(/\*\*/g, '');
            }
            // Look for line numbers
            const lineMatch = line.match(/line\s*(\d+)/i);
            if (lineMatch && !currentVuln.line) {
                currentVuln.line = parseInt(lineMatch[1]);
            }
            // Look for descriptions
            if (line.includes('Description:')) {
                currentVuln.description = lines[i + 1]?.trim() || line.replace(/.*Description:\s*/, '');
            }
            // Look for recommendations
            if (line.includes('Recommendation:') || line.includes('Fix:')) {
                currentVuln.recommendation = lines[i + 1]?.trim() || line.replace(/.*(Recommendation|Fix):\s*/, '');
            }
        }
        // Add final vulnerability if exists
        if (currentVuln.title) {
            vulnerabilities.push(currentVuln);
        }
        // If no structured vulns found, extract from common patterns
        if (vulnerabilities.length === 0) {
            const criticalMatches = response.match(/critical.*?vulnerability/gi);
            const highMatches = response.match(/high.*?vulnerability/gi);
            const mediumMatches = response.match(/medium.*?vulnerability/gi);
            const lowMatches = response.match(/low.*?vulnerability/gi);
            criticalMatches?.forEach(match => vulnerabilities.push({
                severity: 'Critical',
                title: match.replace(/critical\s*/i, '').trim(),
                description: 'Critical security vulnerability detected by AI analysis'
            }));
            highMatches?.forEach(match => vulnerabilities.push({
                severity: 'High',
                title: match.replace(/high\s*/i, '').trim(),
                description: 'High severity security issue detected by AI analysis'
            }));
            mediumMatches?.forEach(match => vulnerabilities.push({
                severity: 'Medium',
                title: match.replace(/medium\s*/i, '').trim(),
                description: 'Medium severity security issue detected by AI analysis'
            }));
            lowMatches?.forEach(match => vulnerabilities.push({
                severity: 'Low',
                title: match.replace(/low\s*/i, '').trim(),
                description: 'Low severity security issue detected by AI analysis'
            }));
        }
        return vulnerabilities;
    }
    calculateSecurityScore(vulnerabilities) {
        let score = 10.0;
        vulnerabilities.forEach(vuln => {
            switch (vuln.severity) {
                case 'Critical':
                    score -= 3.0;
                    break;
                case 'High':
                    score -= 2.0;
                    break;
                case 'Medium':
                    score -= 1.0;
                    break;
                case 'Low':
                    score -= 0.5;
                    break;
            }
        });
        return Math.max(0, Math.min(10, score));
    }
    detectLanguage(fileName) {
        const ext = fileName.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'sol': return 'solidity';
            case 'rs': return 'rust';
            case 'move': return 'move';
            case 'cairo': return 'cairo';
            case 'vy': return 'vyper';
            case 'go': return 'go';
            case 'py': return 'python';
            case 'ts': return 'typescript';
            case 'js': return 'javascript';
            default: return 'solidity';
        }
    }
    parseAuditResults(result) {
        return {
            vulnerabilities: this.parseVulnerabilities(result.rawResponse),
            summary: {
                sessionId: result.sessionId,
                vulnerabilityCount: result.vulnerabilityCount,
                securityScore: result.securityScore,
                completedAt: result.completedAt,
                rawResponse: result.rawResponse
            }
        };
    }
}
exports.AuditService = AuditService;
//# sourceMappingURL=auditService.js.map