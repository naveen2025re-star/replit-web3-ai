import * as vscode from 'vscode';

interface UserInfo {
    userId: string;
    balance: number;
    totalUsed: number;
    totalEarned: number;
    planTier: 'Free' | 'Pro' | 'Pro+' | 'Enterprise';
    canCreatePrivateAudits: boolean;
    permissions: string[];
    rateLimit: number;
}

interface AuthResult {
    success: boolean;
    user?: UserInfo;
    error?: string;
}

export class AuthService {
    private context: vscode.ExtensionContext;
    private cachedUserInfo: UserInfo | null = null;
    private lastAuthCheck = 0;
    private readonly AUTH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    async validateApiKey(): Promise<AuthResult> {
        const config = vscode.workspace.getConfiguration('smartaudit');
        const apiKey = config.get<string>('apiKey');
        const apiUrl = config.get<string>('apiUrl');
        
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
            
            // Step 1: Validate API key format (should start with sa_ and contain a dot)
            if (!apiKey.startsWith('sa_')) {
                return { success: false, error: 'API key must start with sa_' };
            }
            
            if (apiKey.length < 40) {
                return { success: false, error: 'API key too short' };
            }
            
            // More flexible validation - some keys may not have dots in development
            console.log(`[AUTH] Validating API key format: ${apiKey.substring(0, 10)}...`);

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
                } else if (authResponse.status === 429) {
                    return { success: false, error: 'Rate limit exceeded' };
                } else if (authResponse.status === 403) {
                    return { success: false, error: 'API key lacks required permissions' };
                } else {
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
            let planTier: 'Free' | 'Pro' | 'Pro+' | 'Enterprise' = 'Free';
            if (user.credits >= 15000) planTier = 'Pro+';
            else if (user.credits >= 5000) planTier = 'Pro';
            else if (user.credits >= 1000) planTier = 'Pro'; // Basic Pro access
            
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

        } catch (error: any) {
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

    async getUserInfo(): Promise<UserInfo | null> {
        const authResult = await this.validateApiKey();
        return authResult.success ? authResult.user || null : null;
    }

    clearCache(): void {
        this.cachedUserInfo = null;
        this.lastAuthCheck = 0;
    }

    isAuthenticated(): boolean {
        return this.cachedUserInfo !== null;
    }

    async refreshUserInfo(): Promise<void> {
        this.clearCache();
        await this.validateApiKey();
    }
}