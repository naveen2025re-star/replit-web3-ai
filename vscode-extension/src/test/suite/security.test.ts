import { strict as assert } from 'assert';
import * as vscode from 'vscode';
import { SecureStorage } from '../../security/secureStorage';
import { SmartAuditAPI } from '../../api/smartauditApi';

suite('Security Test Suite', () => {
    let mockContext: vscode.ExtensionContext;
    let secureStorage: SecureStorage;

    suiteSetup(() => {
        // Mock extension context
        mockContext = {
            secrets: {
                store: async (key: string, value: string) => { /* mock */ },
                get: async (key: string) => undefined,
                delete: async (key: string) => { /* mock */ }
            }
        } as any;
    });

    setup(() => {
        secureStorage = SecureStorage.getInstance(mockContext);
    });

    test('API Key Validation', () => {
        // Test valid API keys
        assert.strictEqual(
            (secureStorage as any).validateApiKey('sa_test123456789012345678901234567890.abcdefghij123456'), 
            true,
            'Should accept valid API key format'
        );

        // Test invalid API keys
        assert.strictEqual(
            (secureStorage as any).validateApiKey('invalid_key'), 
            false,
            'Should reject invalid API key format'
        );

        assert.strictEqual(
            (secureStorage as any).validateApiKey(''), 
            false,
            'Should reject empty API key'
        );

        assert.strictEqual(
            (secureStorage as any).validateApiKey(null), 
            false,
            'Should reject null API key'
        );
    });

    test('Input Sanitization', () => {
        const api = new SmartAuditAPI();
        
        // Test contract code sanitization
        const maliciousCode = '<script>alert("xss")</script>pragma solidity ^0.8.0;';
        const sanitized = (api as any).sanitizeContractCode(maliciousCode);
        
        assert.strictEqual(
            sanitized.includes('<script>'), 
            false,
            'Should remove script tags from contract code'
        );

        assert.strictEqual(
            sanitized.includes('pragma solidity'), 
            true,
            'Should preserve valid Solidity code'
        );
    });

    test('Request ID Generation', () => {
        const api = new SmartAuditAPI();
        
        const id1 = (api as any).generateRequestId();
        const id2 = (api as any).generateRequestId();
        
        assert.notStrictEqual(id1, id2, 'Should generate unique request IDs');
        assert.strictEqual(typeof id1, 'string', 'Should return string');
        assert.ok(id1.length > 0, 'Should not be empty');
    });

    test('URL Validation', () => {
        const api = new SmartAuditAPI();
        
        // Test valid URLs
        assert.strictEqual(
            (api as any).validateUrl('https://api.smartaudit.ai'),
            'https://api.smartaudit.ai',
            'Should accept valid HTTPS URL'
        );

        // Test invalid URLs
        assert.strictEqual(
            (api as any).validateUrl('ftp://malicious.com'),
            'https://smartaudit-ai.replit.app',
            'Should reject non-HTTP(S) URLs and return default'
        );

        assert.strictEqual(
            (api as any).validateUrl('not-a-url'),
            'https://smartaudit-ai.replit.app',
            'Should reject invalid URLs and return default'
        );
    });

    test('Rate Limiting Simulation', async () => {
        const api = new SmartAuditAPI();
        
        // Simulate rate limit check
        const shouldRetry = (api as any).shouldRetry({ response: { status: 429 } });
        assert.strictEqual(shouldRetry, false, 'Should not retry on rate limit (429)');
        
        const shouldRetryServer = (api as any).shouldRetry({ response: { status: 500 } });
        assert.strictEqual(shouldRetryServer, true, 'Should retry on server error (500)');
    });

    test('Session Token Generation', () => {
        const token1 = secureStorage.generateSessionToken();
        const token2 = secureStorage.generateSessionToken();
        
        assert.notStrictEqual(token1, token2, 'Should generate unique session tokens');
        assert.strictEqual(token1.length, 32, 'Should generate 32-character tokens');
        assert.ok(/^[a-f0-9]+$/.test(token1), 'Should contain only hexadecimal characters');
    });
});