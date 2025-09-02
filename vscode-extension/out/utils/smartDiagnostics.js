"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartDiagnosticsParser = void 0;
class SmartDiagnosticsParser {
    /**
     * Parse audit report text and extract structured diagnostics
     */
    static parseAuditReport(reportText, contractCode, detectedLang) {
        if (!reportText || !contractCode) {
            return [];
        }
        const diagnostics = [];
        const lines = reportText.split('\n');
        const codeLines = contractCode.split('\n');
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const diagnostic = this.parseLine(line, i, lines, codeLines, detectedLang);
            if (diagnostic) {
                diagnostics.push(diagnostic);
            }
        }
        // Remove duplicates and sort by severity/line
        return this.deduplicateAndSort(diagnostics);
    }
    /**
     * Parse a single line for diagnostic information
     */
    static parseLine(line, lineIndex, allLines, codeLines, detectedLang) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.length < 10) {
            return null;
        }
        // Extract line numbers using various patterns
        const lineNumber = this.extractLineNumber(trimmed);
        if (lineNumber === null) {
            return null;
        }
        // Validate line number is within bounds
        if (lineNumber < 0 || lineNumber >= codeLines.length) {
            return null;
        }
        // Determine severity
        const severity = this.determineSeverity(trimmed);
        // Extract message and clean it
        const message = this.extractMessage(trimmed, lineNumber);
        // Categorize the vulnerability
        const category = this.categorizeVulnerability(message);
        // Generate recommendation
        const recommendation = this.generateRecommendation(category, message);
        // Calculate column positions for better highlighting
        const { startCol, endCol } = this.calculateColumns(codeLines[lineNumber], message);
        return {
            line: lineNumber,
            column: startCol,
            endLine: lineNumber,
            endColumn: endCol,
            severity,
            message,
            source: 'SmartAudit AI',
            code: `smartaudit-${category?.toLowerCase() || 'vulnerability'}`,
            category,
            recommendation
        };
    }
    /**
     * Extract line number from text using multiple patterns
     */
    static extractLineNumber(text) {
        const patterns = [
            /(?:line|Line|LINE)\s+(\d+)/,
            /(?:at|At|AT)\s+line\s+(\d+)/,
            /(?:on|On|ON)\s+line\s+(\d+)/,
            /\bL(\d+)\b/,
            /:(\d+):/,
            /\[(\d+)\]/,
            /\((\d+)\)/,
            /line\s*(\d+)/i
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const lineNum = parseInt(match[1], 10);
                if (!isNaN(lineNum) && lineNum > 0) {
                    return lineNum - 1; // Convert to 0-indexed
                }
            }
        }
        return null;
    }
    /**
     * Determine severity based on keywords in the text
     */
    static determineSeverity(text) {
        const lowerText = text.toLowerCase();
        for (const [keyword, severity] of Object.entries(this.SEVERITY_KEYWORDS)) {
            if (lowerText.includes(keyword)) {
                return severity;
            }
        }
        // Default based on certain indicators
        if (lowerText.includes('vulnerable') || lowerText.includes('exploit') || lowerText.includes('attack')) {
            return 'error';
        }
        if (lowerText.includes('recommend') || lowerText.includes('consider') || lowerText.includes('optimize')) {
            return 'information';
        }
        return 'warning';
    }
    /**
     * Extract and clean the message text
     */
    static extractMessage(text, lineNumber) {
        // Remove line number references
        let message = text
            .replace(/(?:line|Line|LINE)\s+\d+\s*:?\s*/g, '')
            .replace(/(?:at|At|AT)\s+line\s+\d+\s*:?\s*/g, '')
            .replace(/\bL\d+\b\s*:?\s*/g, '')
            .replace(/:\d+:\s*/g, '')
            .replace(/\[\d+\]\s*/g, '')
            .replace(/\(\d+\)\s*/g, '');
        // Clean up common prefixes
        message = message
            .replace(/^[-•*]\s*/, '')
            .replace(/^\d+\.\s*/, '')
            .replace(/^vulnerability:?\s*/i, '')
            .replace(/^issue:?\s*/i, '')
            .replace(/^warning:?\s*/i, '')
            .replace(/^error:?\s*/i, '');
        message = message.trim();
        // Ensure minimum message quality
        if (message.length < 10) {
            message = `Security issue detected on line ${lineNumber + 1}`;
        }
        // Capitalize first letter
        if (message.length > 0) {
            message = message.charAt(0).toUpperCase() + message.slice(1);
        }
        // Add period if missing
        if (message && !message.endsWith('.') && !message.endsWith('!') && !message.endsWith('?')) {
            message += '.';
        }
        return message;
    }
    /**
     * Categorize vulnerability based on content
     */
    static categorizeVulnerability(message) {
        const lowerMessage = message.toLowerCase();
        for (const [keyword, category] of Object.entries(this.VULNERABILITY_CATEGORIES)) {
            if (lowerMessage.includes(keyword)) {
                return category;
            }
        }
        return undefined;
    }
    /**
     * Generate contextual recommendations
     */
    static generateRecommendation(category, message) {
        if (!category)
            return undefined;
        const recommendations = {
            'Reentrancy Attack': 'Use the checks-effects-interactions pattern and consider reentrancy guards.',
            'Integer Overflow': 'Use SafeMath library or Solidity 0.8+ built-in overflow protection.',
            'Integer Underflow': 'Use SafeMath library or Solidity 0.8+ built-in underflow protection.',
            'Access Control': 'Implement proper access controls with modifiers like onlyOwner.',
            'Authorization': 'Add appropriate authorization checks before sensitive operations.',
            'Authentication': 'Verify caller identity and permissions before execution.',
            'Code Injection': 'Validate and sanitize all external inputs.',
            'Denial of Service': 'Implement gas limits and avoid loops over unbounded arrays.',
            'Gas Optimization': 'Consider gas-efficient alternatives to reduce transaction costs.',
            'Timestamp Dependence': 'Avoid relying on block.timestamp for critical logic.',
            'Weak Randomness': 'Use secure randomness sources like Chainlink VRF.',
            'Delegatecall': 'Be extremely careful with delegatecall and validate target contracts.',
            'Selfdestruct': 'Consider alternatives to selfdestruct which can be unpredictable.'
        };
        return recommendations[category];
    }
    /**
     * Calculate smart column positions for highlighting
     */
    static calculateColumns(codeLine, message) {
        if (!codeLine) {
            return { startCol: 0, endCol: 50 };
        }
        const trimmedLine = codeLine.trim();
        const startCol = codeLine.indexOf(trimmedLine);
        // Try to find specific patterns that might be mentioned in the message
        const keywords = ['function', 'modifier', 'require', 'assert', 'transfer', 'send', 'call', 'delegatecall'];
        for (const keyword of keywords) {
            if (message.toLowerCase().includes(keyword) && codeLine.includes(keyword)) {
                const keywordPos = codeLine.indexOf(keyword);
                return {
                    startCol: keywordPos,
                    endCol: Math.min(keywordPos + keyword.length + 20, codeLine.length)
                };
            }
        }
        // Default to highlighting meaningful part of the line
        return {
            startCol: startCol,
            endCol: Math.min(startCol + trimmedLine.length, codeLine.length)
        };
    }
    /**
     * Remove duplicate diagnostics and sort by priority
     */
    static deduplicateAndSort(diagnostics) {
        // Remove duplicates based on line + message
        const unique = new Map();
        for (const diagnostic of diagnostics) {
            const key = `${diagnostic.line}-${diagnostic.message}`;
            if (!unique.has(key)) {
                unique.set(key, diagnostic);
            }
        }
        // Sort by severity then by line number
        const severityOrder = { error: 0, warning: 1, information: 2 };
        return Array.from(unique.values()).sort((a, b) => {
            const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
            if (severityDiff !== 0)
                return severityDiff;
            return a.line - b.line;
        });
    }
}
exports.SmartDiagnosticsParser = SmartDiagnosticsParser;
SmartDiagnosticsParser.SEVERITY_KEYWORDS = {
    critical: 'error',
    high: 'error',
    severe: 'error',
    dangerous: 'error',
    medium: 'warning',
    moderate: 'warning',
    low: 'information',
    minor: 'information',
    info: 'information',
    note: 'information',
    suggestion: 'information'
};
SmartDiagnosticsParser.VULNERABILITY_CATEGORIES = {
    'reentrancy': 'Reentrancy Attack',
    'overflow': 'Integer Overflow',
    'underflow': 'Integer Underflow',
    'access': 'Access Control',
    'authorization': 'Authorization',
    'authentication': 'Authentication',
    'injection': 'Code Injection',
    'dos': 'Denial of Service',
    'gas': 'Gas Optimization',
    'timestamp': 'Timestamp Dependence',
    'randomness': 'Weak Randomness',
    'delegatecall': 'Delegatecall',
    'selfdestruct': 'Selfdestruct'
};
//# sourceMappingURL=smartDiagnostics.js.map