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
            // Step 2: Use the dedicated VS Code auth endpoint
            const authUrl = `${apiUrl}/api/vscode/auth`;
            const authResponse = await fetch(authUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!authResponse.ok) {
                if (authResponse.status === 401) {
                    return { success: false, error: 'Invalid or expired API key' };
                }
                else if (authResponse.status === 429) {
                    return { success: false, error: 'Rate limit exceeded' };
                }
                else if (authResponse.status === 403) {
                    return { success: false, error: 'API key lacks required permissions' };
                }
                else {
                    return { success: false, error: `API authentication failed: ${authResponse.status}` };
                }
            }
            const authData = await authResponse.json();
            console.log('[AUTH] VS Code authentication successful');
            if (!authData.success || !authData.user) {
                return { success: false, error: 'Invalid authentication response' };
            }
            const user = authData.user;
            // Determine plan tier based on credits  
            let planTier = 'Free';
            if (user.credits >= 15000)
                planTier = 'Pro+';
            else if (user.credits >= 5000)
                planTier = 'Pro';
            else if (user.credits >= 1000)
                planTier = 'Pro'; // Basic Pro access
            // VS Code extension requires Pro plan minimum
            if (planTier === 'Free') {
                return { success: false, error: 'VS Code extension requires Pro plan. Upgrade at smartaudit.ai' };
            }
            this.cachedUserInfo = {
                userId: user.id,
                balance: user.credits || 0,
                totalUsed: 0, // Will be updated if needed
                totalEarned: user.credits || 0,
                planTier,
                canCreatePrivateAudits: true, // Pro+ users can always create private audits
                permissions: user.permissions || ['audit:read', 'audit:write'],
                rateLimit: 1000 // Default rate limit
            };
            this.lastAuthCheck = now;
            console.log(`[AUTH] User validated: ${planTier} plan with ${user.credits} credits`);
            return { success: true, user: this.cachedUserInfo };
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