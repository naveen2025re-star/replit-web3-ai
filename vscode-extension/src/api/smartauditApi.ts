import * as vscode from 'vscode';
import axios, { AxiosInstance } from 'axios';

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
    
    constructor() {
        this.client = axios.create();
        this.updateConfig();
        
        // Listen for configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('smartaudit')) {
                this.updateConfig();
            }
        });
    }
    
    private updateConfig() {
        const config = vscode.workspace.getConfiguration('smartaudit');
        const apiUrl = config.get<string>('apiUrl', 'https://smartaudit-ai.replit.app');
        const apiKey = config.get<string>('apiKey');
        
        this.client.defaults.baseURL = apiUrl;
        this.client.defaults.headers.common['Authorization'] = apiKey ? `Bearer ${apiKey}` : '';
        this.client.defaults.timeout = 30000; // 30 seconds
    }
    
    async getUserInfo(): Promise<UserInfo> {
        try {
            const response = await this.client.get('/api/vscode/auth');
            return response.data.user;
        } catch (error) {
            this.handleError(error, 'Failed to authenticate with SmartAudit AI');
            throw error;
        }
    }
    
    async startAudit(contractCode: string, language: string, fileName?: string): Promise<{ sessionId: string; sessionKey: string }> {
        try {
            const response = await this.client.post('/api/vscode/audit', {
                contractCode,
                language,
                fileName
            });
            
            return {
                sessionId: response.data.sessionId,
                sessionKey: response.data.sessionKey
            };
        } catch (error) {
            this.handleError(error, 'Failed to start contract audit');
            throw error;
        }
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
        try {
            const response = await this.client.get('/api/vscode/audit/history', {
                params: { limit }
            });
            return response.data.history;
        } catch (error) {
            this.handleError(error, 'Failed to load audit history');
            throw error;
        }
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