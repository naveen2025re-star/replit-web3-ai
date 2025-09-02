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
exports.LanguageSelector = void 0;
const vscode = __importStar(require("vscode"));
const blockchainLanguageDetector_1 = require("../utils/blockchainLanguageDetector");
class LanguageSelector {
    /**
     * Show language selection quick pick for manual language override
     */
    static async showLanguageSelector(document) {
        const supportedLanguages = blockchainLanguageDetector_1.BlockchainLanguageDetector.getSupportedLanguages();
        // Auto-detect current language
        const detected = blockchainLanguageDetector_1.BlockchainLanguageDetector.detectFromFile(document);
        const items = supportedLanguages.map(lang => ({
            label: `${lang.icon} ${lang.name}`,
            description: lang.category,
            detail: `Networks: ${lang.networks.slice(0, 3).join(', ')} | Extensions: ${lang.fileExtensions.join(', ')}`,
            language: lang,
            picked: detected?.language.name === lang.name
        }));
        const selected = await vscode.window.showQuickPick(items, {
            title: 'Select Blockchain Language',
            placeHolder: `Currently detected: ${detected ? detected.language.name : 'Unknown'}`,
            canPickMany: false,
            ignoreFocusOut: false
        });
        if (selected) {
            // Store user's language preference for this file
            const config = vscode.workspace.getConfiguration('smartaudit');
            const languageOverrides = config.get('languageOverrides', {});
            languageOverrides[document.fileName] = selected.language.name;
            await config.update('languageOverrides', languageOverrides, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage(`Language set to ${selected.language.icon} ${selected.language.name} for this file`);
        }
    }
    /**
     * Get user's language override for a specific file
     */
    static getUserLanguageOverride(document) {
        const config = vscode.workspace.getConfiguration('smartaudit');
        const languageOverrides = config.get('languageOverrides', {});
        return languageOverrides[document.fileName];
    }
    /**
     * Show network selector for multi-chain support
     */
    static async showNetworkSelector() {
        const networks = [
            { label: '🔷 Ethereum', value: 'ethereum', description: 'Main Ethereum network' },
            { label: '🟣 Polygon', value: 'polygon', description: 'Polygon (MATIC) network' },
            { label: '🟡 Binance Smart Chain', value: 'bsc', description: 'BSC network' },
            { label: '🔵 Arbitrum', value: 'arbitrum', description: 'Arbitrum L2 network' },
            { label: '🔴 Optimism', value: 'optimism', description: 'Optimism L2 network' },
            { label: '🟢 Base', value: 'base', description: 'Base L2 network' },
            { label: '🟠 Solana', value: 'solana', description: 'Solana network' },
            { label: '🔘 NEAR', value: 'near', description: 'NEAR Protocol' },
            { label: '⭐ StarkNet', value: 'starknet', description: 'StarkNet L2' },
            { label: '🌊 Flow', value: 'flow', description: 'Flow blockchain' },
            { label: '🎩 Cardano', value: 'cardano', description: 'Cardano network' },
            { label: '🏗️ Auto-detect', value: 'auto-detect', description: 'Automatically detect from code' }
        ];
        const selected = await vscode.window.showQuickPick(networks, {
            title: 'Select Target Blockchain Network',
            placeHolder: 'Choose the blockchain network for audit analysis',
            canPickMany: false,
            ignoreFocusOut: false
        });
        return selected?.value;
    }
    /**
     * Show specialized checks selector for advanced users
     */
    static async showSpecializedChecksSelector(detectedLang) {
        const baseChecks = [
            'general-security',
            'best-practices',
            'gas-optimization',
            'access-control',
            'input-validation'
        ];
        const languageSpecificChecks = detectedLang ?
            blockchainLanguageDetector_1.BlockchainLanguageDetector.getLanguageByName(detectedLang.language.name)?.fileExtensions.includes('.sol') ?
                ['reentrancy', 'integer-overflow', 'delegatecall', 'timestamp-dependence'] :
                detectedLang.language.name === 'Rust' ?
                    ['memory-safety', 'ownership-validation', 'panic-handling'] :
                    detectedLang.language.name === 'Move' ?
                        ['resource-safety', 'capability-security'] :
                        [] : [];
        const allChecks = [...baseChecks, ...languageSpecificChecks];
        const items = allChecks.map(check => ({
            label: check.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
            description: `Check for ${check.replace('-', ' ')} vulnerabilities`,
            picked: baseChecks.includes(check) // Default to base checks
        }));
        const selected = await vscode.window.showQuickPick(items, {
            title: 'Select Security Checks',
            placeHolder: 'Choose which security checks to perform',
            canPickMany: true,
            ignoreFocusOut: false
        });
        return selected?.map(item => item.label.toLowerCase().replace(' ', '-'));
    }
}
exports.LanguageSelector = LanguageSelector;
//# sourceMappingURL=languageSelector.js.map