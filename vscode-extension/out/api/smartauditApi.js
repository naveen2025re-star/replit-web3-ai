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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmartAuditAPI = void 0;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
const CryptoJS = __importStar(require("crypto-js"));
class SmartAuditAPI {
    constructor() {
        this.cache = new Map();
        this.retryAttempts = new Map();
        this.maxRetries = 3;
        this.baseDelay = 1000; // 1 second
        this.client = axios_1.default.create();
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
    updateConfig() {
        const config = vscode.workspace.getConfiguration('smartaudit');
        const apiUrl = config.get('apiUrl', 'https://smartaudit-ai.replit.app');
        const apiKey = config.get('apiKey');
        this.client.defaults.baseURL = this.validateUrl(apiUrl);
        this.client.defaults.headers.common['Authorization'] = apiKey ? `Bearer ${this.sanitizeApiKey(apiKey)}` : '';
        this.client.defaults.timeout = 30000;
        this.client.defaults.headers.common['User-Agent'] = 'SmartAudit-VSCode/1.0.0';
        this.client.defaults.headers.common['X-Client-Version'] = '1.0.0';
    }
    validateUrl(url) {
        try {
            const parsedUrl = new URL(url);
            if (!['https:', 'http:'].includes(parsedUrl.protocol)) {
                throw new Error('Invalid protocol');
            }
            return url;
        }
        catch {
            console.warn('Invalid API URL, using default');
            return 'https://smartaudit-ai.replit.app';
        }
    }
    sanitizeApiKey(apiKey) {
        // Remove any non-alphanumeric characters except dots and hyphens
        return apiKey.replace(/[^a-zA-Z0-9.-]/g, '').substring(0, 100);
    }
    setupInterceptors() {
        // Request interceptor for security
        this.client.interceptors.request.use((config) => {
            // Add request timestamp for replay attack prevention
            config.headers['X-Timestamp'] = Date.now().toString();
            // Add request ID for tracking
            config.headers['X-Request-ID'] = this.generateRequestId();
            return config;
        }, (error) => Promise.reject(error));
        // Response interceptor for validation
        this.client.interceptors.response.use((response) => {
            // Validate response structure
            if (typeof response.data !== 'object') {
                console.warn('Invalid response format received');
            }
            return response;
        }, (error) => {
            // Enhanced error handling
            this.logSecurityEvent(error);
            return Promise.reject(error);
        });
    }
    generateRequestId() {
        return CryptoJS.lib.WordArray.random(16).toString();
    }
    logSecurityEvent(error) {
        if (error.response?.status === 401) {
            console.warn('Authentication failed - possible compromised API key');
        }
        else if (error.response?.status === 429) {
            console.warn('Rate limit exceeded - possible abuse detected');
        }
        else if (error.code === 'ENOTFOUND') {
            console.warn('DNS resolution failed - possible network manipulation');
        }
    }
    async getFromCacheOrFetch(cacheKey, fetchFn, ttl = 300000) {
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
            return cached.data;
        }
        const data = await fetchFn();
        this.cache.set(cacheKey, { data, timestamp: Date.now(), ttl });
        return data;
    }
    clearExpiredCache() {
        const now = Date.now();
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp >= value.ttl) {
                this.cache.delete(key);
            }
        }
    }
    async retryWithBackoff(fn, context) {
        const attempts = this.retryAttempts.get(context) || 0;
        try {
            const result = await fn();
            this.retryAttempts.delete(context);
            return result;
        }
        catch (error) {
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
    shouldRetry(error) {
        return error.response?.status >= 500 ||
            error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT';
    }
    async getUserInfo() {
        return this.getFromCacheOrFetch('userInfo', async () => {
            return this.retryWithBackoff(async () => {
                const response = await this.client.get('/api/vscode/auth');
                return response.data.user;
            }, 'getUserInfo');
        }, 60000 // Cache for 1 minute
        ).catch(error => {
            this.handleError(error, 'Failed to authenticate with SmartAudit AI');
            throw error;
        });
    }
    async startAudit(contractCode, language, fileName) {
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
            const response = await this.client.post('/api/vscode/audit', {
                contractCode: sanitizedCode,
                language: sanitizedLanguage,
                fileName: sanitizedFileName
            });
            return {
                sessionId: response.data.sessionId,
                sessionKey: response.data.sessionKey
            };
        }, 'startAudit').catch(error => {
            this.handleError(error, 'Failed to start contract audit');
            throw error;
        });
    }
    sanitizeContractCode(code) {
        // Remove potentially dangerous content while preserving code structure
        return code
            .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
            .replace(/<script[\s\S]*?<\/script>/gi, '') // Remove script tags
            .trim();
    }
    async getAuditStatus(sessionId) {
        try {
            const response = await this.client.get(`/api/vscode/audit/status/${sessionId}`);
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'Failed to get audit status');
            throw error;
        }
    }
    async getAuditHistory(limit = 20) {
        const safeLimit = Math.min(Math.max(1, limit), 100); // Clamp between 1-100
        return this.getFromCacheOrFetch(`auditHistory_${safeLimit}`, async () => {
            return this.retryWithBackoff(async () => {
                const response = await this.client.get('/api/vscode/audit/history', {
                    params: { limit: safeLimit }
                });
                return response.data.history;
            }, 'getAuditHistory');
        }, 30000 // Cache for 30 seconds
        ).catch(error => {
            this.handleError(error, 'Failed to load audit history');
            throw error;
        });
    }
    handleError(error, defaultMessage) {
        console.error('SmartAudit API Error:', error);
        if (axios_1.default.isAxiosError(error)) {
            if (error.response?.status === 401) {
                vscode.window.showErrorMessage('Invalid or expired API key. Please check your SmartAudit AI configuration.', 'Configure').then(action => {
                    if (action === 'Configure') {
                        vscode.commands.executeCommand('workbench.action.openSettings', 'smartaudit.apiKey');
                    }
                });
            }
            else if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'];
                const message = error.response.data?.message || 'Rate limit exceeded';
                vscode.window.showErrorMessage(`${message}${retryAfter ? ` Retry in ${retryAfter} seconds.` : ''}`);
            }
            else if (error.response?.data?.error) {
                vscode.window.showErrorMessage(`SmartAudit AI: ${error.response.data.error}`);
            }
            else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
                vscode.window.showErrorMessage('Cannot connect to SmartAudit AI. Please check your internet connection and API URL.');
            }
            else {
                vscode.window.showErrorMessage(`${defaultMessage}: ${error.message}`);
            }
        }
        else {
            vscode.window.showErrorMessage(`${defaultMessage}: ${error.message || 'Unknown error'}`);
        }
    }
}
exports.SmartAuditAPI = SmartAuditAPI;
//# sourceMappingURL=smartauditApi.js.map