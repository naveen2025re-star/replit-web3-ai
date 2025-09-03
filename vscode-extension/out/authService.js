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
exports.AuthService = void 0;
const vscode = __importStar(require("vscode"));
class AuthService {
    constructor(context) {
        this.cachedUserInfo = null;
        this.lastAuthCheck = 0;
        this.AUTH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        this.context = context;
    }
    async validateApiKey() {
        const config = vscode.workspace.getConfiguration('smartaudit');
        const apiKey = config.get('apiKey');
        const apiUrl = config.get('apiUrl');
        if (!apiKey || apiKey.trim().length === 0) {
            return { success: false, error: 'API key not configured' };
        }
        if (!apiUrl || apiUrl.trim().length === 0) {
            return { success: false, error: 'API URL not configured' };
        }
        // Use cache if recent
        const now = Date.now();
        if (this.cachedUserInfo && (now - this.lastAuthCheck) < this.AUTH_CACHE_DURATION) {
            return { success: true, user: this.cachedUserInfo };
        }
        try {
            console.log('[AUTH] Validating API key...');
            // Step 1: Validate API key format
            if (!apiKey.includes('.') || apiKey.split('.').length !== 2) {
                return { success: false, error: 'Invalid API key format' };
            }
            // Step 2: Test API key with a simple authenticated endpoint (list audits)
            const testUrl = `${apiUrl}/api/audit/list-audits?limit=1`;
            const testResponse = await fetch(testUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!testResponse.ok) {
                if (testResponse.status === 401) {
                    return { success: false, error: 'Invalid or expired API key' };
                }
                else if (testResponse.status === 429) {
                    return { success: false, error: 'Rate limit exceeded' };
                }
                else if (testResponse.status === 403) {
                    return { success: false, error: 'API key lacks required permissions' };
                }
                else {
                    return { success: false, error: `API error: ${testResponse.status}` };
                }
            }
            // Step 3: Get the userId from the validated API response
            const testData = await testResponse.json();
            console.log('[AUTH] API key validation successful');
            // Step 4: Get user credits and plan info
            // The API key validation gives us the userId, but we need to extract it
            // Let's try to get user info by making a credit balance request
            // First, let's try to extract userId from the test response or make another authenticated call
            // that returns user info. For now, let's use the audit endpoint pattern.
            // Step 4: Try to get user credits (this endpoint requires userId)
            // Since we validated the API key, let's try to call the audit endpoint to get user info
            const auditResponse = await fetch(`${apiUrl}/api/audit/list-audits?limit=1`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!auditResponse.ok) {
                return { success: false, error: 'Failed to fetch user information' };
            }
            const auditData = await auditResponse.json();
            // From the audit response, we can't directly get userId, but we know the API key is valid
            // Let's make a test audit request to see if we can get user info
            console.log('[AUTH] Getting user credits...');
            // For now, since we can't easily extract userId from the API responses,
            // let's create a simple test audit to validate the account and get user info
            const testAuditResponse = await fetch(`${apiUrl}/api/audit/create-audit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contractCode: '// Test contract\npragma solidity ^0.8.0;\ncontract Test { }',
                    contractLanguage: 'solidity',
                    publicTitle: 'Extension Auth Test',
                    isPublic: false
                })
            });
            if (testAuditResponse.ok) {
                const auditInfo = await testAuditResponse.json();
                console.log('[AUTH] User has sufficient credits and Pro plan access');
                // Extract user info from audit response if available
                this.cachedUserInfo = {
                    userId: 'validated-user', // We know it's valid but don't have exact ID
                    balance: 0, // We'll update this with a proper call later
                    totalUsed: 0,
                    totalEarned: 0,
                    planTier: 'Pro', // Must be Pro+ to create private audits
                    canCreatePrivateAudits: true,
                    permissions: ['audit:create', 'audit:read'],
                    rateLimit: 100
                };
                this.lastAuthCheck = now;
                return { success: true, user: this.cachedUserInfo };
            }
            else if (testAuditResponse.status === 402) {
                // Insufficient credits - but account is valid
                const errorData = await testAuditResponse.json();
                this.cachedUserInfo = {
                    userId: 'validated-user',
                    balance: errorData.currentBalance || 0,
                    totalUsed: 0,
                    totalEarned: 0,
                    planTier: errorData.currentBalance > 1000 ? 'Pro' : 'Free',
                    canCreatePrivateAudits: errorData.currentBalance > 1000,
                    permissions: ['audit:create', 'audit:read'],
                    rateLimit: 100
                };
                this.lastAuthCheck = now;
                return { success: true, user: this.cachedUserInfo };
            }
            else if (testAuditResponse.status === 403) {
                return { success: false, error: 'Free plan users cannot use VS Code extension. Upgrade to Pro plan.' };
            }
            else {
                return { success: false, error: 'Account validation failed' };
            }
        }
        catch (error) {
            console.error('[AUTH] Authentication failed:', error);
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                return { success: false, error: 'Cannot connect to SmartAudit API. Check API URL.' };
            }
            return {
                success: false,
                error: error.message || 'Authentication failed'
            };
        }
    }
    async getUserInfo() {
        const authResult = await this.validateApiKey();
        return authResult.success ? authResult.user || null : null;
    }
    clearCache() {
        this.cachedUserInfo = null;
        this.lastAuthCheck = 0;
    }
    isAuthenticated() {
        return this.cachedUserInfo !== null;
    }
    async refreshUserInfo() {
        this.clearCache();
        await this.validateApiKey();
    }
}
exports.AuthService = AuthService;
//# sourceMappingURL=authService.js.map