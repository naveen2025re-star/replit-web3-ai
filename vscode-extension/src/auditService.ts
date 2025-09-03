import * as vscode from 'vscode';

interface AuditSession {
    sessionId: string;
    sessionKey: string;
    status: 'pending' | 'analyzing' | 'completed' | 'failed';
}

interface AuditResult {
    sessionId: string;
    rawResponse: string;
    formattedReport: string;
    vulnerabilityCount: number | null;
    securityScore: number | null;
    completedAt: string;
}

interface ParsedVulnerability {
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    title: string;
    description: string;
    line?: number;
    recommendation?: string;
}

export class AuditService {
    private context: vscode.ExtensionContext;
    
    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async analyzeContract(contractCode: string, fileName: string): Promise<AuditResult | null> {
        const config = vscode.workspace.getConfiguration('smartaudit');
        const apiKey = config.get<string>('apiKey');
        const apiUrl = config.get<string>('apiUrl');

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

        } catch (error: any) {
            console.error('[AUDIT] Analysis failed:', error);
            vscode.window.showErrorMessage(`❌ SmartAudit AI: ${error.message}`);
            return null;
        }
    }

    private async createVSCodeAudit(contractCode: string, fileName: string, apiKey: string, apiUrl: string): Promise<AuditResult | null> {
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
                } else if (response.status === 403) {
                    throw new Error('Upgrade to Pro plan required for VS Code extension');
                } else if (response.status === 400) {
                    throw new Error(errorData.error || 'Invalid contract code');
                } else {
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

        } catch (error: any) {
            console.error('[AUDIT] VS Code audit failed:', error);
            throw error;
        }
    }

    private async pollForResults(sessionId: string, apiKey: string, apiUrl: string): Promise<AuditResult | null> {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('[AUDIT] Polling for results, session:', sessionId);
                
                let attempts = 0;
                const maxAttempts = 60; // 5 minutes max (60 attempts × 5s)
                
                const poll = async (): Promise<void> => {
                    try {
                        attempts++;
                        
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
                            
                            const result: AuditResult = {
                                sessionId,
                                rawResponse: statusData.result || '',
                                formattedReport: statusData.result || '',
                                vulnerabilityCount: null, // Will be calculated
                                securityScore: null, // Will be calculated  
                                completedAt: new Date().toISOString()
                            };
                            
                            resolve(result);
                            return;
                            
                        } else if (statusData.status === 'failed') {
                            reject(new Error(statusData.error || 'Analysis failed'));
                            return;
                            
                        } else if (statusData.status === 'analyzing' || statusData.status === 'pending') {
                            // Still processing
                            if (attempts <= maxAttempts) {
                                if (attempts % 6 === 0) { // Every 30 seconds
                                    vscode.window.showInformationMessage(`📝 SmartAudit AI: Analysis in progress... (${Math.floor(attempts * 5 / 60)} minutes elapsed)`);
                                }
                                setTimeout(poll, 5000); // Poll every 5 seconds
                            } else {
                                reject(new Error('Analysis timeout - taking longer than expected'));
                            }
                            
                        } else {
                            reject(new Error(`Unknown status: ${statusData.status}`));
                        }
                        
                    } catch (error) {
                        console.error('[AUDIT] Polling error:', error);
                        if (attempts <= maxAttempts) {
                            setTimeout(poll, 5000); // Retry after 5 seconds
                        } else {
                            reject(error);
                        }
                    }
                };
                
                // Start polling
                await poll();

            } catch (error: any) {
                console.error('[AUDIT] Polling failed:', error);
                reject(error);
            }
        });
    }

    private async getFinalResults(sessionId: string, apiKey: string, apiUrl: string, rawResponse: string): Promise<AuditResult> {
        try {
            // Try to get structured results from API
            const response = await fetch(`${apiUrl}/api/audit/results/${sessionId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                }
            });

            let structuredResult: any = null;
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

        } catch (error) {
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

    private parseVulnerabilities(response: string): ParsedVulnerability[] {
        const vulnerabilities: ParsedVulnerability[] = [];
        
        // Parse different vulnerability formats from AI response
        const lines = response.split('\n');
        let currentVuln: Partial<ParsedVulnerability> = {};
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Look for severity indicators
            if (line.match(/\*\*(critical|high|medium|low)\*\*/i)) {
                if (currentVuln.title) {
                    vulnerabilities.push(currentVuln as ParsedVulnerability);
                }
                currentVuln = {};
                const severity = line.match(/\*\*(critical|high|medium|low)\*\*/i)?.[1];
                if (severity) {
                    currentVuln.severity = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase() as any;
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
            vulnerabilities.push(currentVuln as ParsedVulnerability);
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

    private calculateSecurityScore(vulnerabilities: ParsedVulnerability[]): number {
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

    private detectLanguage(fileName: string): string {
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

    public parseAuditResults(result: AuditResult) {
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