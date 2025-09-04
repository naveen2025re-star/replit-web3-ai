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
            // Try streaming first, fallback to polling
            try {
                const streamingResult = await this.createStreamingAudit(contractCode, fileName, apiKey, apiUrl);
                if (streamingResult)
                    return streamingResult;
            }
            catch (streamingError) {
                console.warn('[AUDIT] Streaming failed, falling back to polling:', streamingError);
            }
            // Fallback to polling method
            console.log('[AUDIT] Using polling method...');
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
    async createStreamingAudit(contractCode, fileName, apiKey, apiUrl) {
        return new Promise(async (resolve, reject) => {
            try {
                console.log('[AUDIT] Starting streaming audit...');
                // Create results panel first
                const panel = vscode.window.createWebviewPanel('smartauditResults', `SmartAudit AI: ${fileName}`, vscode.ViewColumn.Beside, {
                    enableScripts: true,
                    retainContextWhenHidden: true
                });
                // Set initial content
                panel.webview.html = this.getStreamingWebviewContent();
                // Start streaming request
                const response = await fetch(`${apiUrl}/api/vscode/audit/stream`, {
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
                    throw new Error(`Streaming failed: ${response.status}`);
                }
                if (!response.body) {
                    throw new Error('No response body for streaming');
                }
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullResponse = '';
                let vulnerabilityCount = 0;
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done)
                            break;
                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');
                        for (const line of lines) {
                            if (line.trim() === '')
                                continue; // Skip empty lines
                            try {
                                // Handle both SSE format (data: {...}) and direct JSON
                                let data;
                                if (line.startsWith('data: ')) {
                                    data = JSON.parse(line.substring(6));
                                }
                                else if (line.trim().startsWith('{')) {
                                    data = JSON.parse(line.trim());
                                }
                                else {
                                    continue; // Skip non-JSON lines
                                }
                                console.log('[STREAMING] Received:', data);
                                switch (data.type) {
                                    case 'connected':
                                        panel.webview.postMessage({ type: 'status', message: 'Connected to AI...', status: 'analyzing' });
                                        break;
                                    case 'credits_deducted':
                                        panel.webview.postMessage({
                                            type: 'credits',
                                            creditsUsed: data.creditsUsed,
                                            remainingCredits: data.remainingCredits
                                        });
                                        break;
                                    case 'status':
                                        panel.webview.postMessage({ type: 'status', message: 'AI analysis in progress...', status: data.status });
                                        break;
                                    case 'chunk':
                                        // Clean JSON chunks first
                                        let cleanData = data.data;
                                        if (typeof cleanData === 'string') {
                                            // Remove JSON chunk format like {"body": "text"}
                                            cleanData = cleanData.replace(/\{"body":\s*"([^"]+)"\}/g, '$1');
                                            cleanData = cleanData.replace(/\\"/g, '"');
                                            cleanData = cleanData.replace(/\\n/g, '\n');
                                        }
                                        fullResponse += cleanData;
                                        panel.webview.postMessage({ type: 'chunk', data: cleanData });
                                        break;
                                    case 'analysis_complete':
                                        vulnerabilityCount = this.parseVulnerabilities(fullResponse).length;
                                        panel.webview.postMessage({
                                            type: 'complete',
                                            response: fullResponse,
                                            vulnerabilityCount: vulnerabilityCount
                                        });
                                        const result = {
                                            sessionId: data.result?.sessionId || '',
                                            rawResponse: fullResponse,
                                            formattedReport: fullResponse,
                                            vulnerabilityCount: vulnerabilityCount,
                                            securityScore: this.calculateSecurityScore(this.parseVulnerabilities(fullResponse)),
                                            completedAt: new Date().toISOString()
                                        };
                                        vscode.window.showInformationMessage(`✅ SmartAudit AI: Found ${vulnerabilityCount} issues in ${fileName}`);
                                        resolve(result);
                                        return;
                                    case 'error':
                                        panel.webview.postMessage({ type: 'error', message: data.message });
                                        reject(new Error(data.message));
                                        return;
                                }
                            }
                            catch (parseError) {
                                console.error('[STREAMING] Failed to parse line:', line, parseError);
                            }
                        }
                    }
                }
                finally {
                    reader.releaseLock();
                }
                // If we get here, analysis completed
                if (fullResponse) {
                    vulnerabilityCount = this.parseVulnerabilities(fullResponse).length;
                    const result = {
                        sessionId: 'stream_' + Date.now(),
                        rawResponse: fullResponse,
                        formattedReport: fullResponse,
                        vulnerabilityCount: vulnerabilityCount,
                        securityScore: this.calculateSecurityScore(this.parseVulnerabilities(fullResponse)),
                        completedAt: new Date().toISOString()
                    };
                    resolve(result);
                }
                else {
                    reject(new Error('No response received from streaming'));
                }
            }
            catch (error) {
                console.error('[STREAMING] Error:', error);
                reject(error);
            }
        });
    }
    getStreamingWebviewContent() {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SmartAudit AI Analysis</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    line-height: 1.6;
                }
                .header {
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 15px;
                    margin-bottom: 20px;
                }
                .status {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 10px;
                }
                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid var(--vscode-progressBar-background);
                    border-top: 2px solid var(--vscode-progressBar-foreground);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .credits {
                    background: var(--vscode-badge-background);
                    color: var(--vscode-badge-foreground);
                    padding: 4px 8px;
                    border-radius: 3px;
                    font-size: 12px;
                }
                .content {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    font-size: 14px;
                    background-color: var(--vscode-editor-background);
                    padding: 20px;
                    border-radius: 6px;
                    border: 1px solid var(--vscode-panel-border);
                    margin: 15px 0;
                    max-height: 70vh;
                    overflow-y: auto;
                    line-height: 1.6;
                }
                .content h1, .content h2, .content h3 {
                    color: var(--vscode-terminal-ansiYellow);
                    margin-top: 20px;
                    margin-bottom: 10px;
                    border-bottom: 1px solid var(--vscode-panel-border);
                    padding-bottom: 5px;
                }
                .content h1 { font-size: 1.5em; }
                .content h2 { font-size: 1.3em; }
                .content h3 { font-size: 1.1em; }
                .content strong {
                    color: var(--vscode-terminal-ansiCyan);
                    font-weight: 600;
                }
                .content ul, .content ol {
                    margin: 10px 0;
                    padding-left: 20px;
                }
                .content li {
                    margin: 5px 0;
                }
                .content code {
                    background-color: var(--vscode-textCodeBlock-background);
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    font-size: 12px;
                }
                .content .vuln-critical { 
                    background-color: rgba(255, 68, 68, 0.1);
                    border-left: 4px solid #ff4444;
                    padding: 10px;
                    margin: 10px 0;
                    border-radius: 0 4px 4px 0;
                }
                .content .vuln-high { 
                    background-color: rgba(255, 136, 0, 0.1);
                    border-left: 4px solid #ff8800;
                    padding: 10px;
                    margin: 10px 0;
                    border-radius: 0 4px 4px 0;
                }
                .content .vuln-medium { 
                    background-color: rgba(255, 170, 0, 0.1);
                    border-left: 4px solid #ffaa00;
                    padding: 10px;
                    margin: 10px 0;
                    border-radius: 0 4px 4px 0;
                }
                .content .vuln-low { 
                    background-color: rgba(0, 170, 255, 0.1);
                    border-left: 4px solid #00aaff;
                    padding: 10px;
                    margin: 10px 0;
                    border-radius: 0 4px 4px 0;
                }
                .vulnerability {
                    background: var(--vscode-inputValidation-errorBackground);
                    border-left: 4px solid var(--vscode-inputValidation-errorBorder);
                    padding: 10px;
                    margin: 10px 0;
                    border-radius: 4px;
                }
                .summary {
                    background: var(--vscode-textBlockQuote-background);
                    border-left: 4px solid var(--vscode-textBlockQuote-border);
                    padding: 15px;
                    margin: 15px 0;
                    border-radius: 4px;
                }
                .error {
                    background: var(--vscode-inputValidation-errorBackground);
                    color: var(--vscode-inputValidation-errorForeground);
                    padding: 10px;
                    border-radius: 4px;
                    margin: 10px 0;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>🛡️ SmartAudit AI Analysis</h2>
                <div class="status" id="status">
                    <div class="spinner"></div>
                    <span>Initializing analysis...</span>
                </div>
                <div id="credits" class="credits" style="display: none;">Credits used: 0 | Remaining: 0</div>
            </div>
            <div class="main-content">
                <div class="content" id="content">Waiting for analysis to begin...</div>
            </div>
            
            <script>
                const vscode = acquireVsCodeApi();
                const statusEl = document.getElementById('status');
                const creditsEl = document.getElementById('credits');
                const contentEl = document.getElementById('content');
                
                // Simple markdown to HTML converter
                function formatMarkdownToHTML(text) {
                    if (!text) return '';
                    
                    let html = text
                        // Headers
                        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                        // Bold
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        // Line breaks
                        .replace(/\\n/g, '<br>')
                        .replace(/\n/g, '<br>')
                        // Code blocks (simple)
                        .replace(/\`([^\`]+)\`/g, '<code>$1</code>')
                        // Vulnerability severity styling
                        .replace(/\*\*Critical\*\*/gi, '<span class="vuln-critical">🔴 <strong>CRITICAL</strong></span>')
                        .replace(/\*\*High\*\*/gi, '<span class="vuln-high">🟠 <strong>HIGH</strong></span>')
                        .replace(/\*\*Medium\*\*/gi, '<span class="vuln-medium">🟡 <strong>MEDIUM</strong></span>')
                        .replace(/\*\*Low\*\*/gi, '<span class="vuln-low">🔵 <strong>LOW</strong></span>');
                    
                    return html;
                }
                
                window.addEventListener('message', event => {
                    const message = event.data;
                    
                    switch (message.type) {
                        case 'status':
                            statusEl.innerHTML = \`<div class="spinner"></div><span>\${message.message}</span>\`;
                            break;
                        case 'credits':
                            creditsEl.style.display = 'block';
                            creditsEl.textContent = \`Credits used: \${message.creditsUsed} | Remaining: \${message.remainingCredits}\`;
                            break;
                        case 'chunk':
                            // Convert markdown to HTML for better display
                            const formattedChunk = formatMarkdownToHTML(message.data);
                            contentEl.innerHTML += formattedChunk;
                            contentEl.scrollTop = contentEl.scrollHeight;
                            break;
                        case 'complete':
                            statusEl.innerHTML = \`<span style="color: var(--vscode-terminal-ansiGreen);">✅ Analysis Complete!</span>\`;
                            const summary = document.createElement('div');
                            summary.className = 'summary';
                            summary.innerHTML = \`<strong>Analysis Summary:</strong><br>\${message.vulnerabilityCount} security issues found<br>Response length: \${message.response.length} characters\`;
                            contentEl.parentNode.insertBefore(summary, contentEl);
                            break;
                        case 'error':
                            statusEl.innerHTML = \`<span style="color: var(--vscode-terminal-ansiRed);">❌ Error</span>\`;
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'error';
                            errorDiv.textContent = message.message;
                            contentEl.parentNode.insertBefore(errorDiv, contentEl);
                            break;
                    }
                });
            </script>
        </body>
        </html>`;
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