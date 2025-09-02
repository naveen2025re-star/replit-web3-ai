import * as vscode from 'vscode';
import * as CryptoJS from 'crypto-js';

export class SecureStorage {
    private static instance: SecureStorage;
    private secretStorage: vscode.SecretStorage;
    private memoryStorage = new Map<string, string>();
    
    private constructor(context: vscode.ExtensionContext) {
        this.secretStorage = context.secrets;
    }
    
    public static getInstance(context?: vscode.ExtensionContext): SecureStorage {
        if (!SecureStorage.instance && context) {
            SecureStorage.instance = new SecureStorage(context);
        }
        return SecureStorage.instance;
    }
    
    /**
     * Securely store API key using VS Code's SecretStorage
     */
    async storeApiKey(apiKey: string): Promise<void> {
        if (!this.validateApiKey(apiKey)) {
            throw new Error('Invalid API key format');
        }
        
        // Encrypt the API key before storing
        const encrypted = this.encryptData(apiKey);
        await this.secretStorage.store('smartaudit.apiKey', encrypted);
        
        // Store in memory for session (avoid repeated decryption)
        this.memoryStorage.set('apiKey', apiKey);
        
        console.log('API key stored securely');
    }
    
    /**
     * Retrieve and decrypt API key
     */
    async getApiKey(): Promise<string | undefined> {
        // Try memory first for performance
        const memoryKey = this.memoryStorage.get('apiKey');
        if (memoryKey && this.validateApiKey(memoryKey)) {
            return memoryKey;
        }
        
        // Fallback to secure storage
        try {
            const encrypted = await this.secretStorage.get('smartaudit.apiKey');
            if (!encrypted) {
                return undefined;
            }
            
            const decrypted = this.decryptData(encrypted);
            if (this.validateApiKey(decrypted)) {
                this.memoryStorage.set('apiKey', decrypted);
                return decrypted;
            }
        } catch (error) {
            console.error('Failed to decrypt API key:', error);
            await this.clearApiKey(); // Clear corrupted data
        }
        
        return undefined;
    }
    
    /**
     * Remove stored API key
     */
    async clearApiKey(): Promise<void> {
        await this.secretStorage.delete('smartaudit.apiKey');
        this.memoryStorage.delete('apiKey');
        console.log('API key cleared');
    }
    
    /**
     * Validate API key format
     */
    private validateApiKey(apiKey: string): boolean {
        if (!apiKey || typeof apiKey !== 'string') {
            return false;
        }
        
        // Check format: should start with 'sa_' and be reasonable length
        const apiKeyRegex = /^sa_[a-zA-Z0-9]{32,}\.[a-zA-Z0-9]{16,}$/;
        return apiKeyRegex.test(apiKey) && apiKey.length <= 200;
    }
    
    /**
     * Encrypt sensitive data
     */
    private encryptData(data: string): string {
        try {
            // Use VS Code's machine ID as part of encryption key
            const machineId = vscode.env.machineId;
            const key = CryptoJS.SHA256(machineId + 'smartaudit-salt').toString();
            
            const encrypted = CryptoJS.AES.encrypt(data, key).toString();
            return encrypted;
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }
    
    /**
     * Decrypt sensitive data
     */
    private decryptData(encryptedData: string): string {
        try {
            const machineId = vscode.env.machineId;
            const key = CryptoJS.SHA256(machineId + 'smartaudit-salt').toString();
            
            const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
            return decrypted.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }
    
    /**
     * Store session data temporarily
     */
    setSessionData(key: string, value: string): void {
        this.memoryStorage.set(key, value);
    }
    
    /**
     * Get session data
     */
    getSessionData(key: string): string | undefined {
        return this.memoryStorage.get(key);
    }
    
    /**
     * Clear all session data
     */
    clearSession(): void {
        this.memoryStorage.clear();
    }
    
    /**
     * Generate secure session token
     */
    generateSessionToken(): string {
        const timestamp = Date.now().toString();
        const random = CryptoJS.lib.WordArray.random(16).toString();
        return CryptoJS.SHA256(timestamp + random).toString().substring(0, 32);
    }
}