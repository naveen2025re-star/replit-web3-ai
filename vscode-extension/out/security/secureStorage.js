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
exports.SecureStorage = void 0;
const vscode = __importStar(require("vscode"));
const CryptoJS = __importStar(require("crypto-js"));
class SecureStorage {
    constructor(context) {
        this.memoryStorage = new Map();
        this.secretStorage = context.secrets;
    }
    static getInstance(context) {
        if (!SecureStorage.instance && context) {
            SecureStorage.instance = new SecureStorage(context);
        }
        return SecureStorage.instance;
    }
    /**
     * Securely store API key using VS Code's SecretStorage
     */
    async storeApiKey(apiKey) {
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
    async getApiKey() {
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
        }
        catch (error) {
            console.error('Failed to decrypt API key:', error);
            await this.clearApiKey(); // Clear corrupted data
        }
        return undefined;
    }
    /**
     * Remove stored API key
     */
    async clearApiKey() {
        await this.secretStorage.delete('smartaudit.apiKey');
        this.memoryStorage.delete('apiKey');
        console.log('API key cleared');
    }
    /**
     * Validate API key format
     */
    validateApiKey(apiKey) {
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
    encryptData(data) {
        try {
            // Use VS Code's machine ID as part of encryption key
            const machineId = vscode.env.machineId;
            const key = CryptoJS.SHA256(machineId + 'smartaudit-salt').toString();
            const encrypted = CryptoJS.AES.encrypt(data, key).toString();
            return encrypted;
        }
        catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }
    /**
     * Decrypt sensitive data
     */
    decryptData(encryptedData) {
        try {
            const machineId = vscode.env.machineId;
            const key = CryptoJS.SHA256(machineId + 'smartaudit-salt').toString();
            const decrypted = CryptoJS.AES.decrypt(encryptedData, key);
            return decrypted.toString(CryptoJS.enc.Utf8);
        }
        catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }
    /**
     * Store session data temporarily
     */
    setSessionData(key, value) {
        this.memoryStorage.set(key, value);
    }
    /**
     * Get session data
     */
    getSessionData(key) {
        return this.memoryStorage.get(key);
    }
    /**
     * Clear all session data
     */
    clearSession() {
        this.memoryStorage.clear();
    }
    /**
     * Generate secure session token
     */
    generateSessionToken() {
        const timestamp = Date.now().toString();
        const random = CryptoJS.lib.WordArray.random(16).toString();
        return CryptoJS.SHA256(timestamp + random).toString().substring(0, 32);
    }
}
exports.SecureStorage = SecureStorage;
//# sourceMappingURL=secureStorage.js.map