import * as vscode from 'vscode';

export interface BlockchainLanguage {
    name: string;
    category: string;
    networks: string[];
    fileExtensions: string[];
    description: string;
    icon: string;
}

export interface DetectedLanguage {
    language: BlockchainLanguage;
    confidence: number;
    reasons: string[];
}

export class BlockchainLanguageDetector {
    private static readonly SUPPORTED_LANGUAGES: BlockchainLanguage[] = [
        {
            name: 'Solidity',
            category: 'EVM Smart Contracts',
            networks: ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base'],
            fileExtensions: ['.sol'],
            description: 'Smart contracts for Ethereum and EVM-compatible networks',
            icon: '💎'
        },
        {
            name: 'Rust',
            category: 'Systems Programming',
            networks: ['solana', 'near', 'polkadot', 'substrate'],
            fileExtensions: ['.rs'],
            description: 'High-performance blockchain applications and smart contracts',
            icon: '🦀'
        },
        {
            name: 'Move',
            category: 'Resource-Oriented Programming',
            networks: ['diem', 'aptos', 'sui'],
            fileExtensions: ['.move'],
            description: 'Move smart contracts for Diem, Aptos, and Sui',
            icon: '🏃'
        },
        {
            name: 'Cairo',
            category: 'Zero-Knowledge Proofs',
            networks: ['starknet', 'starkex'],
            fileExtensions: ['.cairo'],
            description: 'Smart contracts for StarkNet and zero-knowledge applications',
            icon: '🏺'
        },
        {
            name: 'Go',
            category: 'Blockchain Infrastructure',
            networks: ['cosmos', 'tendermint', 'ethereum'],
            fileExtensions: ['.go'],
            description: 'Blockchain nodes, validators, and infrastructure',
            icon: '🐹'
        },
        {
            name: 'TypeScript',
            category: 'DApp Development',
            networks: ['ethereum', 'polygon', 'solana', 'near'],
            fileExtensions: ['.ts'],
            description: 'Decentralized application frontends and smart contract interactions',
            icon: '📘'
        },
        {
            name: 'JavaScript',
            category: 'DApp Development',
            networks: ['ethereum', 'polygon', 'solana', 'near'],
            fileExtensions: ['.js'],
            description: 'Web3 applications and blockchain integrations',
            icon: '📒'
        },
        {
            name: 'Python',
            category: 'Blockchain Analytics',
            networks: ['ethereum', 'bitcoin', 'algorand'],
            fileExtensions: ['.py'],
            description: 'Blockchain analytics, smart contract testing, and DeFi scripts',
            icon: '🐍'
        },
        {
            name: 'Vyper',
            category: 'EVM Smart Contracts',
            networks: ['ethereum', 'polygon', 'arbitrum'],
            fileExtensions: ['.vy'],
            description: 'Pythonic smart contracts for Ethereum',
            icon: '🐍'
        },
        {
            name: 'Yul',
            category: 'EVM Assembly',
            networks: ['ethereum', 'polygon', 'bsc'],
            fileExtensions: ['.yul'],
            description: 'Low-level EVM assembly language',
            icon: '⚙️'
        },
        {
            name: 'Clarity',
            category: 'Smart Contracts',
            networks: ['stacks', 'bitcoin'],
            fileExtensions: ['.clar'],
            description: 'Smart contracts for Stacks blockchain',
            icon: '🔍'
        },
        {
            name: 'Cadence',
            category: 'Resource-Oriented Programming',
            networks: ['flow'],
            fileExtensions: ['.cdc'],
            description: 'Smart contracts for Flow blockchain',
            icon: '🌊'
        },
        {
            name: 'Haskell',
            category: 'Functional Programming',
            networks: ['cardano', 'plutus'],
            fileExtensions: ['.hs'],
            description: 'Plutus smart contracts for Cardano',
            icon: '🎩'
        },
        {
            name: 'AssemblyScript',
            category: 'WebAssembly',
            networks: ['near', 'eos'],
            fileExtensions: ['.as'],
            description: 'WebAssembly smart contracts',
            icon: '🔧'
        },
        {
            name: 'C++',
            category: 'High-Performance Computing',
            networks: ['eos', 'bitcoin', 'ethereum'],
            fileExtensions: ['.cpp', '.cc', '.cxx'],
            description: 'High-performance blockchain nodes and smart contracts',
            icon: '⚡'
        },
        {
            name: 'Michelson',
            category: 'Functional Smart Contracts',
            networks: ['tezos'],
            fileExtensions: ['.tz'],
            description: 'Smart contracts for Tezos blockchain',
            icon: '🏛️'
        },
        {
            name: 'WebAssembly',
            category: 'Virtual Machine',
            networks: ['near', 'polkadot', 'cosmos'],
            fileExtensions: ['.wasm', '.wat'],
            description: 'WebAssembly smart contracts and modules',
            icon: '🌐'
        }
    ];

    /**
     * Detect blockchain language from file
     */
    static detectFromFile(document: vscode.TextDocument): DetectedLanguage | null {
        const fileName = document.fileName;
        const fileExtension = this.getFileExtension(fileName);
        const content = document.getText();

        // Primary detection by file extension
        const languagesByExtension = this.SUPPORTED_LANGUAGES.filter(lang => 
            lang.fileExtensions.includes(fileExtension)
        );

        if (languagesByExtension.length === 0) {
            return null;
        }

        // If only one match, return it with high confidence
        if (languagesByExtension.length === 1) {
            return {
                language: languagesByExtension[0],
                confidence: 0.95,
                reasons: [`File extension ${fileExtension} matches ${languagesByExtension[0].name}`]
            };
        }

        // Multiple matches - use content analysis for disambiguation
        const contentAnalysis = this.analyzeContent(content, languagesByExtension);
        
        return contentAnalysis;
    }

    /**
     * Get all supported languages
     */
    static getSupportedLanguages(): BlockchainLanguage[] {
        return [...this.SUPPORTED_LANGUAGES];
    }

    /**
     * Get language by name
     */
    static getLanguageByName(name: string): BlockchainLanguage | undefined {
        return this.SUPPORTED_LANGUAGES.find(lang => 
            lang.name.toLowerCase() === name.toLowerCase()
        );
    }

    /**
     * Check if file is supported blockchain language
     */
    static isSupportedFile(document: vscode.TextDocument): boolean {
        const fileExtension = this.getFileExtension(document.fileName);
        return this.SUPPORTED_LANGUAGES.some(lang => 
            lang.fileExtensions.includes(fileExtension)
        );
    }

    /**
     * Get file extension including the dot
     */
    private static getFileExtension(fileName: string): string {
        const lastDot = fileName.lastIndexOf('.');
        return lastDot !== -1 ? fileName.substring(lastDot) : '';
    }

    /**
     * Analyze file content to determine specific language
     */
    private static analyzeContent(content: string, candidateLanguages: BlockchainLanguage[]): DetectedLanguage {
        const scores = new Map<BlockchainLanguage, number>();
        const reasons = new Map<BlockchainLanguage, string[]>();

        // Initialize scores
        candidateLanguages.forEach(lang => {
            scores.set(lang, 0);
            reasons.set(lang, []);
        });

        // Content-based detection patterns
        const patterns = {
            'Solidity': [
                { pattern: /pragma solidity/i, score: 0.9, reason: 'Contains Solidity pragma' },
                { pattern: /contract\s+\w+/i, score: 0.8, reason: 'Contains contract declaration' },
                { pattern: /function\s+\w+.*public|private|internal|external/i, score: 0.7, reason: 'Contains Solidity function modifiers' },
                { pattern: /mapping\s*\(/i, score: 0.6, reason: 'Contains mapping declaration' },
                { pattern: /\bmsg\.sender\b/i, score: 0.5, reason: 'Uses msg.sender' },
                { pattern: /\buint256\b|\buint\b|\baddress\b/i, score: 0.4, reason: 'Uses Solidity types' }
            ],
            'Vyper': [
                { pattern: /@external\b/i, score: 0.9, reason: 'Contains Vyper external decorator' },
                { pattern: /@internal\b/i, score: 0.8, reason: 'Contains Vyper internal decorator' },
                { pattern: /def\s+\w+.*->/i, score: 0.7, reason: 'Python-style function with return type annotation' },
                { pattern: /interface\s+\w+:/i, score: 0.6, reason: 'Contains interface declaration' }
            ],
            'Rust': [
                { pattern: /#\[program\]/i, score: 0.9, reason: 'Contains Anchor program attribute' },
                { pattern: /use anchor_lang::/i, score: 0.8, reason: 'Imports Anchor framework' },
                { pattern: /pub struct\s+\w+/i, score: 0.7, reason: 'Contains public struct' },
                { pattern: /fn\s+\w+.*Result</i, score: 0.6, reason: 'Rust function returning Result' },
                { pattern: /&mut\s+\w+/i, score: 0.5, reason: 'Uses mutable references' }
            ],
            'Move': [
                { pattern: /module\s+\w+::\w+/i, score: 0.9, reason: 'Contains Move module declaration' },
                { pattern: /public\s+fun\s+\w+/i, score: 0.8, reason: 'Contains Move public function' },
                { pattern: /resource\s+struct\s+\w+/i, score: 0.7, reason: 'Contains Move resource' },
                { pattern: /acquires\s+\w+/i, score: 0.6, reason: 'Uses Move acquires keyword' }
            ],
            'Cairo': [
                { pattern: /%lang starknet/i, score: 0.9, reason: 'StarkNet Cairo contract' },
                { pattern: /@external\b/i, score: 0.8, reason: 'Cairo external function' },
                { pattern: /from starkware/i, score: 0.7, reason: 'Imports StarkWare modules' },
                { pattern: /felt\s+\w+/i, score: 0.6, reason: 'Uses Cairo felt type' }
            ],
            'Go': [
                { pattern: /package\s+main/i, score: 0.8, reason: 'Go main package' },
                { pattern: /import\s+\(/i, score: 0.7, reason: 'Go import block' },
                { pattern: /func\s+\w+\(/i, score: 0.6, reason: 'Go function declaration' },
                { pattern: /github\.com\/cosmos|github\.com\/ethereum/i, score: 0.5, reason: 'Imports blockchain libraries' }
            ],
            'TypeScript': [
                { pattern: /interface\s+\w+\s*{/i, score: 0.7, reason: 'TypeScript interface' },
                { pattern: /:\s*(string|number|boolean|any)\s*[;,}]/i, score: 0.6, reason: 'TypeScript type annotations' },
                { pattern: /import.*from\s+['"]@/i, score: 0.5, reason: 'Modern import syntax' },
                { pattern: /web3|ethers|@solana\/web3/i, score: 0.4, reason: 'Blockchain JavaScript libraries' }
            ],
            'Clarity': [
                { pattern: /\(define-public\s+\(/i, score: 0.9, reason: 'Clarity public function definition' },
                { pattern: /\(define-private\s+\(/i, score: 0.8, reason: 'Clarity private function definition' },
                { pattern: /\(contract-call\?\s+/i, score: 0.7, reason: 'Clarity contract call' },
                { pattern: /principal|uint|int/i, score: 0.6, reason: 'Clarity types' }
            ],
            'Cadence': [
                { pattern: /pub\s+contract\s+\w+/i, score: 0.9, reason: 'Cadence contract declaration' },
                { pattern: /pub\s+resource\s+\w+/i, score: 0.8, reason: 'Cadence resource declaration' },
                { pattern: /init\(\s*\)/i, score: 0.7, reason: 'Cadence initializer' },
                { pattern: /@\w+/i, score: 0.6, reason: 'Cadence annotations' }
            ]
        };

        // Score each language based on content patterns
        candidateLanguages.forEach(lang => {
            const langPatterns = patterns[lang.name as keyof typeof patterns];
            if (langPatterns) {
                langPatterns.forEach(({ pattern, score, reason }) => {
                    if (pattern.test(content)) {
                        const currentScore = scores.get(lang) || 0;
                        scores.set(lang, currentScore + score);
                        reasons.get(lang)?.push(reason);
                    }
                });
            }
        });

        // Find the language with highest score
        let bestLanguage = candidateLanguages[0];
        let bestScore = scores.get(bestLanguage) || 0;

        candidateLanguages.forEach(lang => {
            const score = scores.get(lang) || 0;
            if (score > bestScore) {
                bestLanguage = lang;
                bestScore = score;
            }
        });

        return {
            language: bestLanguage,
            confidence: Math.min(0.9, Math.max(0.3, bestScore / 2)), // Normalize to 0.3-0.9 range
            reasons: reasons.get(bestLanguage) || [`File extension matches ${bestLanguage.name}`]
        };
    }

    /**
     * Get appropriate network suggestions for a language
     */
    static getNetworkSuggestions(language: BlockchainLanguage): string[] {
        return language.networks.slice(0, 3); // Return top 3 most relevant networks
    }

    /**
     * Generate file-specific audit configuration
     */
    static generateAuditConfig(detected: DetectedLanguage): {
        language: string;
        category: string;
        networks: string[];
        specialChecks: string[];
    } {
        const { language } = detected;
        
        const specialChecks = this.getLanguageSpecificChecks(language.name);
        
        return {
            language: language.name,
            category: language.category,
            networks: language.networks,
            specialChecks
        };
    }

    /**
     * Get language-specific security checks
     */
    private static getLanguageSpecificChecks(languageName: string): string[] {
        const checksMap: Record<string, string[]> = {
            'Solidity': ['reentrancy', 'integer-overflow', 'access-control', 'gas-optimization'],
            'Vyper': ['reentrancy', 'integer-overflow', 'access-control'],
            'Rust': ['memory-safety', 'integer-overflow', 'privilege-escalation'],
            'Move': ['resource-safety', 'capability-security', 'access-control'],
            'Cairo': ['field-arithmetic', 'constraint-validation', 'prover-soundness'],
            'Go': ['concurrency-safety', 'memory-leaks', 'validation-bypass'],
            'TypeScript': ['injection-attacks', 'authentication-bypass', 'data-validation'],
            'JavaScript': ['injection-attacks', 'authentication-bypass', 'data-validation'],
            'Python': ['injection-attacks', 'deserialization', 'path-traversal'],
            'Clarity': ['arithmetic-safety', 'authorization-bugs', 'resource-management'],
            'Cadence': ['resource-safety', 'capability-security', 'access-control']
        };

        return checksMap[languageName] || ['general-security', 'best-practices'];
    }
}