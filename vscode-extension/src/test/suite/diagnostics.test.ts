import { strict as assert } from 'assert';
import { SmartDiagnosticsParser } from '../../utils/smartDiagnostics';

suite('Smart Diagnostics Test Suite', () => {
    const sampleSolidityCode = `
pragma solidity ^0.8.0;

contract TestContract {
    mapping(address => uint256) public balances;
    
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        payable(msg.sender).transfer(amount);
        balances[msg.sender] -= amount;
    }
    
    function randomNumber() public view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.difficulty)));
    }
}`.trim();

    test('Line Number Extraction', () => {
        const testCases = [
            { text: 'Vulnerability found on line 8: Reentrancy detected', expected: 7 },
            { text: 'Issue at line 12 in function withdraw', expected: 11 },
            { text: 'Critical error L15: Integer overflow', expected: 14 },
            { text: 'Warning: Weak randomness detected at line 5', expected: 4 },
            { text: 'line 3: Access control missing', expected: 2 }
        ];

        for (const testCase of testCases) {
            const lineNumber = (SmartDiagnosticsParser as any).extractLineNumber(testCase.text);
            assert.strictEqual(
                lineNumber, 
                testCase.expected, 
                `Should extract line number ${testCase.expected + 1} from: "${testCase.text}"`
            );
        }
    });

    test('Severity Determination', () => {
        const testCases = [
            { text: 'Critical vulnerability detected', expected: 'error' },
            { text: 'High severity issue found', expected: 'error' },
            { text: 'Medium risk identified', expected: 'warning' },
            { text: 'Low priority optimization', expected: 'information' },
            { text: 'Consider using SafeMath', expected: 'information' },
            { text: 'Vulnerable to reentrancy attack', expected: 'error' }
        ];

        for (const testCase of testCases) {
            const severity = (SmartDiagnosticsParser as any).determineSeverity(testCase.text);
            assert.strictEqual(
                severity, 
                testCase.expected, 
                `Should determine severity "${testCase.expected}" for: "${testCase.text}"`
            );
        }
    });

    test('Message Extraction and Cleaning', () => {
        const testCases = [
            { 
                input: 'line 5: - Reentrancy vulnerability detected', 
                expected: 'Reentrancy vulnerability detected.' 
            },
            { 
                input: 'L12: Warning: consider using SafeMath library', 
                expected: 'Consider using SafeMath library.' 
            },
            { 
                input: '3. Issue: weak randomness in line 8', 
                expected: 'Weak randomness.' 
            }
        ];

        for (const testCase of testCases) {
            const message = (SmartDiagnosticsParser as any).extractMessage(testCase.input, 0);
            assert.strictEqual(
                message, 
                testCase.expected, 
                `Should clean message: "${testCase.input}" -> "${testCase.expected}"`
            );
        }
    });

    test('Vulnerability Categorization', () => {
        const testCases = [
            { text: 'Reentrancy attack possible', expected: 'Reentrancy Attack' },
            { text: 'Integer overflow detected', expected: 'Integer Overflow' },
            { text: 'Access control missing', expected: 'Access Control' },
            { text: 'Gas optimization needed', expected: 'Gas Optimization' },
            { text: 'Timestamp dependence vulnerability', expected: 'Timestamp Dependence' }
        ];

        for (const testCase of testCases) {
            const category = (SmartDiagnosticsParser as any).categorizeVulnerability(testCase.text);
            assert.strictEqual(
                category, 
                testCase.expected, 
                `Should categorize: "${testCase.text}" as "${testCase.expected}"`
            );
        }
    });

    test('Full Report Parsing', () => {
        const auditReport = `
SmartAudit AI Analysis Results:

1. CRITICAL: Reentrancy vulnerability detected on line 8
   The withdraw function is vulnerable to reentrancy attacks.

2. HIGH: Weak randomness found at line 13
   Using block.timestamp and block.difficulty for randomness is predictable.

3. MEDIUM: Gas optimization opportunity on line 7
   Consider using unchecked arithmetic where safe.
        `.trim();

        const diagnostics = SmartDiagnosticsParser.parseAuditReport(auditReport, sampleSolidityCode);
        
        assert.ok(diagnostics.length >= 2, 'Should extract multiple diagnostics');
        
        const reentrancyDiag = diagnostics.find(d => d.message.toLowerCase().includes('reentrancy'));
        assert.ok(reentrancyDiag, 'Should find reentrancy diagnostic');
        assert.strictEqual(reentrancyDiag?.severity, 'error', 'Reentrancy should be error severity');
        assert.strictEqual(reentrancyDiag?.line, 7, 'Should map to correct line (0-indexed)');
        
        const randomnessDiag = diagnostics.find(d => d.message.toLowerCase().includes('randomness'));
        assert.ok(randomnessDiag, 'Should find randomness diagnostic');
        assert.strictEqual(randomnessDiag?.severity, 'error', 'High severity should map to error');
    });

    test('Deduplication', () => {
        const auditReport = `
line 5: Reentrancy detected
line 5: Reentrancy vulnerability found
line 8: Gas optimization needed
Line 8: Consider gas optimization
        `.trim();

        const diagnostics = SmartDiagnosticsParser.parseAuditReport(auditReport, sampleSolidityCode);
        
        // Should deduplicate based on line + similar message
        const line5Diags = diagnostics.filter(d => d.line === 4);
        const line8Diags = diagnostics.filter(d => d.line === 7);
        
        assert.ok(line5Diags.length <= 2, 'Should limit similar diagnostics on same line');
        assert.ok(line8Diags.length <= 2, 'Should limit similar diagnostics on same line');
    });

    test('Column Position Calculation', () => {
        const codeLine = '    function withdraw(uint256 amount) public {';
        const message = 'Function vulnerability detected';
        
        const { startCol, endCol } = (SmartDiagnosticsParser as any).calculateColumns(codeLine, message);
        
        assert.ok(typeof startCol === 'number', 'Should return numeric start column');
        assert.ok(typeof endCol === 'number', 'Should return numeric end column');
        assert.ok(startCol <= endCol, 'Start column should be <= end column');
        assert.ok(endCol <= codeLine.length, 'End column should not exceed line length');
    });

    test('Recommendation Generation', () => {
        const recommendations = [
            ['Reentrancy Attack', 'checks-effects-interactions'],
            ['Integer Overflow', 'SafeMath'],
            ['Access Control', 'onlyOwner'],
            ['Gas Optimization', 'gas-efficient'],
            ['Weak Randomness', 'Chainlink VRF']
        ];

        for (const [category, expectedKeyword] of recommendations) {
            const recommendation = (SmartDiagnosticsParser as any).generateRecommendation(category, '');
            assert.ok(
                recommendation?.toLowerCase().includes(expectedKeyword.toLowerCase()), 
                `Should generate recommendation containing "${expectedKeyword}" for category "${category}"`
            );
        }
    });
});