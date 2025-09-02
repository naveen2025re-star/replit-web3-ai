import * as vscode from 'vscode';
import { BlockchainLanguageDetector } from '../utils/blockchainLanguageDetector';

export class LanguageSelector {
    /**
     * Show language selection quick pick for manual language override
     */
    static async showLanguageSelector(document: vscode.TextDocument): Promise<void> {
        const supportedLanguages = BlockchainLanguageDetector.getSupportedLanguages();
        
        // Auto-detect current language
        const detected = BlockchainLanguageDetector.detectFromFile(document);
        
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
            const languageOverrides = config.get<Record<string, string>>('languageOverrides', {});
            languageOverrides[document.fileName] = selected.language.name;
            await config.update('languageOverrides', languageOverrides, vscode.ConfigurationTarget.Workspace);
            
            vscode.window.showInformationMessage(
                `Language set to ${selected.language.icon} ${selected.language.name} for this file`
            );
        }
    }

    /**
     * Get user's language override for a specific file
     */
    static getUserLanguageOverride(document: vscode.TextDocument): string | undefined {
        const config = vscode.workspace.getConfiguration('smartaudit');
        const languageOverrides = config.get<Record<string, string>>('languageOverrides', {});
        return languageOverrides[document.fileName];
    }

    /**
     * Show network selector for multi-chain support
     */
    static async showNetworkSelector(): Promise<string | undefined> {
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
    static async showSpecializedChecksSelector(detectedLang?: any): Promise<string[] | undefined> {
        const baseChecks = [
            'general-security',
            'best-practices',
            'gas-optimization',
            'access-control',
            'input-validation'
        ];

        const languageSpecificChecks = detectedLang ? 
            BlockchainLanguageDetector.getLanguageByName(detectedLang.language.name)?.fileExtensions.includes('.sol') ?
                ['reentrancy', 'integer-overflow', 'delegatecall', 'timestamp-dependence'] :
            detectedLang.language.name === 'Rust' ?
                ['memory-safety', 'ownership-validation', 'panic-handling'] :
            detectedLang.language.name === 'Move' ?
                ['resource-safety', 'capability-security'] :
            [] : [];

        const allChecks = [...baseChecks, ...languageSpecificChecks];
        
        const items = allChecks.map(check => ({
            label: check.split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' '),
            description: `Check for ${check.replace('-', ' ')} vulnerabilities`,
            picked: baseChecks.includes(check) // Default to base checks
        }));

        const selected = await vscode.window.showQuickPick(items, {
            title: 'Select Security Checks',
            placeHolder: 'Choose which security checks to perform',
            canPickMany: true,
            ignoreFocusOut: false
        });

        return selected?.map(item => 
            item.label.toLowerCase().replace(' ', '-')
        );
    }
}