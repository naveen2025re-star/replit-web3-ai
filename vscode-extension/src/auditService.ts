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
            
            // Step 1: Create audit session
            const session = await this.createAuditSession(contractCode, fileName, apiKey, apiUrl);
            if (!session) {
                throw new Error('Failed to create audit session');
            }

            console.log('[AUDIT] Session created:', session.sessionId);
            vscode.window.showInformationMessage(`🔄 SmartAudit AI: Analysis session created, processing...`);
            
            // Step 2: Start analysis and stream results
            const result = await this.streamAnalysis(session, apiKey, apiUrl);
            return result;

        } catch (error: any) {
            console.error('[AUDIT] Analysis failed:', error);
            vscode.window.showErrorMessage(`❌ SmartAudit AI: ${error.message}`);
            return null;
        }
    }

    private async createAuditSession(contractCode: string, fileName: string, apiKey: string, apiUrl: string): Promise<AuditSession | null> {
        try {
            const response = await fetch(`${apiUrl}/api/audit/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    contractCode,
                    contractLanguage: this.detectLanguage(fileName),
                    isPublic: false,
                    title: `VS Code: ${fileName}`,
                    description: `Smart contract analysis from VS Code extension`,
                    tags: ['vscode-extension']
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 402) {
                    throw new Error(`Insufficient credits. You need ${errorData.needed || 'more'} credits. Current balance: ${errorData.current || 0}`);
                } else if (response.status === 403) {
                    throw new Error('Upgrade to Pro plan required for VS Code extension');
                } else {
                    throw new Error(errorData.message || `API Error: ${response.status}`);
                }
            }

            const data = await response.json();
            return {
                sessionId: data.sessionId,
                sessionKey: data.sessionKey,
                status: data.status
            };

        } catch (error: any) {
            console.error('[AUDIT] Session creation failed:', error);
            throw error;
        }
    }

    private async streamAnalysis(session: AuditSession, apiKey: string, apiUrl: string): Promise<AuditResult | null> {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('[AUDIT] Starting analysis stream for session:', session.sessionId);
                
                const response = await fetch(`${apiUrl}/api/audit/analyze/${session.sessionId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Accept': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('[AUDIT] Analysis failed:', errorText);
                    reject(new Error(`Analysis failed: ${response.status}`));
                    return;
                }

                if (!response.body) {
                    reject(new Error('No response body received'));
                    return;
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullResponse = '';
                let hasContent = false;

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (line.startsWith('event: content')) {
                                continue;
                            }
                            
                            if (line.startsWith('data: ')) {
                                try {
                                    const jsonData = JSON.parse(line.slice(6));
                                    if (jsonData.body) {
                                        fullResponse += jsonData.body;
                                        hasContent = true;
                                        
                                        // Update progress
                                        if (fullResponse.length % 500 === 0) { // Every 500 chars
                                            vscode.window.showInformationMessage(`📝 SmartAudit AI: Analysis in progress... (${Math.floor(fullResponse.length / 100)} tokens processed)`);
                                        }
                                    } else if (jsonData.status) {
                                        console.log('[AUDIT] Status update:', jsonData.status);
                                        if (jsonData.status === 'complete' || jsonData.status === 'completed') {
                                            console.log('[AUDIT] Analysis completed');
                                            break;
                                        }
                                    }
                                } catch (e) {
                                    // Ignore invalid JSON lines
                                }
                            }
                            
                            if (line.startsWith('event: complete')) {
                                console.log('[AUDIT] Received complete event');
                                break;
                            }
                            
                            if (line.startsWith('event: error')) {
                                console.error('[AUDIT] Received error event');
                                reject(new Error('Analysis failed on server'));
                                return;
                            }
                        }
                    }
                } finally {
                    reader.releaseLock();
                }

                if (!hasContent || fullResponse.trim().length === 0) {
                    reject(new Error('No analysis content received'));
                    return;
                }

                console.log(`[AUDIT] Analysis completed. Response length: ${fullResponse.length}`);
                vscode.window.showInformationMessage(`✅ SmartAudit AI: Analysis completed! Processing results...`);

                // Get final results
                const finalResult = await this.getFinalResults(session.sessionId, apiKey, apiUrl, fullResponse);
                resolve(finalResult);

            } catch (error: any) {
                console.error('[AUDIT] Stream analysis failed:', error);
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