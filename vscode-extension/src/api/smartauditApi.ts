import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';
import * as CryptoJS from 'crypto-js';

export interface UserInfo {
    id: string;
    displayName?: string;
    walletAddress?: string;
    credits: number;
    permissions: string[];
}

export interface AuditHistory {
    id: string;
    title: string;
    status: string;
    language: string;
    source: string;
    creditsUsed: number;
    createdAt: string;
    completedAt?: string;
}

export interface AuditStatus {
    success: boolean;
    status: string;
    sessionId: string;
    report?: string;
    diagnostics?: AuditDiagnostic[];
    vulnerabilityCount?: {
        high: number;
        medium: number;
        low: number;
    };
    creditsUsed?: number;
}

export interface AuditDiagnostic {
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
    severity: 'error' | 'warning' | 'information';
    message: string;
    source: string;
}

export class SmartAuditAPI {
    private client: AxiosInstance;
    private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
    private retryAttempts = new Map<string, number>();
    private readonly maxRetries = 3;
    private readonly baseDelay = 1000; // 1 second
    
    constructor() {
        this.client = axios.create();
        this.updateConfig();
        this.setupInterceptors();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('smartaudit')) {
                this.updateConfig();
            }
        });
        
        // Clear expired cache entries every 10 minutes
        setInterval(() => this.clearExpiredCache(), 600000);
    }
    
    private updateConfig() {
        const config = vscode.workspace.getConfiguration('smartaudit');
        const apiUrl = config.get<string>('apiUrl', 'https://smartaudit-ai.replit.app');
        const apiKey = config.get<string>('apiKey');
        
        this.client.defaults.baseURL = this.validateUrl(apiUrl);
        this.client.defaults.headers.common['Authorization'] = apiKey ? `Bearer ${this.sanitizeApiKey(apiKey)}` : '';
        this.client.defaults.timeout = 30000;
        this.client.defaults.headers.common['User-Agent'] = 'SmartAudit-VSCode/1.0.0';
        this.client.defaults.headers.common['X-Client-Version'] = '1.0.0';
    }
    
    private validateUrl(url: string): string {
        try {
            const parsedUrl = new URL(url);
            if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
                throw new Error('Invalid protocol');
            }
            return url;
        } catch {
            console.warn('Invalid API URL, using default');
            return 'https://smartaudit-ai.replit.app';
        }
    }
    
    private sanitizeApiKey(apiKey: string): string {
        // Remove any non-alphanumeric characters except dots and hyphens
        return apiKey.replace(/[^a-zA-Z0-9.-]/g, '').substring(0, 100);
    }
    
    private setupInterceptors() {
        // Request interceptor for security
        this.client.interceptors.request.use(
            (config) => {
                // Add request timestamp for replay attack prevention
                config.headers['X-Timestamp'] = Date.now().toString();
                
                // Add request ID for tracking
                config.headers['X-Request-ID'] = this.generateRequestId();
                
                return config;
            },
            (error) => Promise.reject(error)
        );
        
        // Response interceptor for validation
        this.client.interceptors.response.use(
            (response) => {
                // Validate response structure
                if (typeof response.data !== 'object') {
                    console.warn('Invalid response format received');
                }
                return response;
            },
            (error) => {
                // Enhanced error handling
                this.logSecurityEvent(error);
                return Promise.reject(error);
            }
        );
    }
    
    private generateRequestId(): string {
        return CryptoJS.lib.WordArray.random(16).toString();
    }
    
    private logSecurityEvent(error: any) {
        if (error.response?.status === 401) {
            console.warn('Authentication failed - possible compromised API key');
        } else if (error.response?.status === 429) {
            console.warn('Rate limit exceeded - possible abuse detected');
        } else if (error.code === 'ENOTFOUND') {
            console.warn('DNS resolution failed - possible network manipulation');
        }
    }
    
    private async getFromCacheOrFetch<T>(cacheKey: string, fetchFn: () => Promise<T>, ttl: number = 300000): Promise<T> {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.data as T;
        }
        
        const data = await fetchFn();
        this.cache.set(cacheKey, { data, timestamp: Date.now(), ttl });
        return data;
    }
    
    private clearExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp >= value.ttl) {
                this.cache.delete(key);
            }
        }
    }
    
    private async retryWithBackoff<T>(fn: () => Promise<T>, context: string): Promise<T> {
        const attempts = this.retryAttempts.get(context) || 0;
        
        try {
            const result = await fn();
            this.retryAttempts.delete(context);
            return result;
        } catch (error) {
            if (attempts < this.maxRetries && this.shouldRetry(error)) {
                const delay = this.baseDelay * Math.pow(2, attempts);
                await new Promise(resolve => setTimeout(resolve, delay));
                this.retryAttempts.set(context, attempts + 1);
                return this.retryWithBackoff(fn, context);
            }
            this.retryAttempts.delete(context);
            throw error;
        }
    }
    
    private shouldRetry(error: any): boolean {
        return error.response?.status >= 500 || 
               error.code === 'ECONNRESET' || 
               error.code === 'ETIMEDOUT';
    }
    
    async getUserInfo(): Promise<UserInfo> {
        return this.getFromCacheOrFetch(
            'userInfo',
            async () => {
                return this.retryWithBackoff(async () => {
                    const response = await this.client.get('/api/vscode/auth');
                    return response.data.user;
                }, 'getUserInfo');
            },
            60000 // Cache for 1 minute
        ).catch(error => {
            this.handleError(error, 'Failed to authenticate with SmartAudit AI');
            throw error;
        });
    }
    
    async startAudit(contractCode: string, language: string, fileName?: string, auditConfig?: any): Promise<{ sessionId: string; sessionKey: string }> {
        // Input validation
        if (!contractCode?.trim()) {
            throw new Error('Contract code is required');
        }
        
        if (contractCode.length > 100000) {
            throw new Error('Contract code too large (max 100KB)');
        }
        
        // Sanitize inputs
        const sanitizedCode = this.sanitizeContractCode(contractCode);
        const sanitizedLanguage = language.toLowerCase().replace(/[^a-z]/g, '');
        const sanitizedFileName = fileName ? fileName.replace(/[^a-zA-Z0-9.-]/g, '') : undefined;
        
        return this.retryWithBackoff(async () => {
            const payload: any = {
                contractCode: sanitizedCode,
                language: sanitizedLanguage,
                fileName: sanitizedFileName
            };
            
            // Add language-specific configuration if provided
            if (auditConfig) {
                payload.languageConfig = {
                    detectedLanguage: auditConfig.language,
                    category: auditConfig.category,
                    networks: auditConfig.networks,
                    specialChecks: auditConfig.specialChecks
                };
            }
            
            const response = await this.client.post('/api/vscode/audit', payload);
            
            return {
                sessionId: response.data.sessionId,
                sessionKey: response.data.sessionKey
            };
        }, 'startAudit').catch(error => {
            this.handleError(error, 'Failed to start contract audit');
            throw error;
        });
    }
    
    private sanitizeContractCode(code: string): string {
        // Remove potentially dangerous content while preserving code structure
        return code
            .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
            .replace(/<script[\s\S]*?<\/script>/gi, '') // Remove script tags
            .trim();
    }
    
    async getAuditStatus(sessionId: string): Promise<AuditStatus> {
        try {
            const response = await this.client.get(`/api/vscode/audit/status/${sessionId}`);
            return response.data;
        } catch (error) {
            this.handleError(error, 'Failed to get audit status');
            throw error;
        }
    }
    
    async getAuditHistory(limit: number = 20): Promise<AuditHistory[]> {
        const safeLimit = Math.min(Math.max(1, limit), 100); // Clamp between 1-100
        
        return this.getFromCacheOrFetch(
            `auditHistory_${safeLimit}`,
            async () => {
                return this.retryWithBackoff(async () => {
                    const response = await this.client.get('/api/vscode/audit/history', {
                        params: { limit: safeLimit }
                    });
                    return response.data.history;
                }, 'getAuditHistory');
            },
            30000 // Cache for 30 seconds
        ).catch(error => {
            this.handleError(error, 'Failed to load audit history');
            throw error;
        });
    }
    
    private handleError(error: any, defaultMessage: string) {
        console.error('SmartAudit API Error:', error);
        
        if (axios.isAxiosError(error)) {
            if (error.response?.status === 401) {
                vscode.window.showErrorMessage(
                    'Invalid or expired API key. Please check your SmartAudit AI configuration.',
                    'Configure'
                ).then(action => {
                    if (action === 'Configure') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'smartaudit.apiKey');
                    }
                });
            } else if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'];
                const message = error.response.data?.message || 'Rate limit exceeded';
                vscode.window.showErrorMessage(`${message}${retryAfter ? ` Retry in ${retryAfter} seconds.` : ''}`);
            } else if (error.response?.data?.error) {
                vscode.window.showErrorMessage(`SmartAudit AI: ${error.response.data.error}`);
            } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                vscode.window.showErrorMessage('Cannot connect to SmartAudit AI. Please check your internet connection and API URL.');
            } else {
                vscode.window.showErrorMessage(`${defaultMessage}: ${error.message}`);
            }
        } else {
            vscode.window.showErrorMessage(`${defaultMessage}: ${error.message || 'Unknown error'}`);
        }
    }
}