import { Octokit } from "@octokit/rest";
import simpleGit from "simple-git";
import { promises as fs } from "fs";
import path from "path";

export interface GitHubIntegration {
  octokit: Octokit;
  owner: string;
  repo: string;
}

export interface ScanResult {
  id: string;
  status: 'pending' | 'completed' | 'failed';
  findings: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reportUrl?: string;
  summary: string;
}

export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getRepositoryInfo(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.rest.repos.get({
        owner,
        repo,
      });
      return {
        id: data.id,
        name: data.name,
        fullName: data.full_name,
        description: data.description,
        defaultBranch: data.default_branch,
        private: data.private,
        language: data.language,
      };
    } catch (error) {
      throw new Error(`Failed to get repository info: ${error}`);
    }
  }

  async scanRepository(owner: string, repo: string, branch = 'main') {
    try {
      // Get repository contents recursively
      const contracts = await this.findSolidityFiles(owner, repo, branch);
      
      if (contracts.length === 0) {
        throw new Error('No Solidity files found in repository');
      }

      // Create scan session
      const scanId = `github_${owner}_${repo}_${Date.now()}`;
      
      return {
        scanId,
        contracts: contracts.map(c => ({
          path: c.path,
          size: c.size,
          sha: c.sha
        })),
        totalFiles: contracts.length,
        estimatedTime: Math.ceil(contracts.length * 2), // 2 minutes per contract estimate
      };
    } catch (error) {
      throw new Error(`Repository scan failed: ${error}`);
    }
  }

  async addPullRequestComment(owner: string, repo: string, pullNumber: number, scanResult: ScanResult) {
    try {
      const commentBody = this.generatePRComment(scanResult);
      
      await this.octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body: commentBody,
      });

      return true;
    } catch (error) {
      throw new Error(`Failed to add PR comment: ${error}`);
    }
  }

  async createCommitStatus(owner: string, repo: string, sha: string, scanResult: ScanResult) {
    try {
      const state = this.getCommitState(scanResult);
      const description = this.getCommitDescription(scanResult);

      await this.octokit.rest.repos.createCommitStatus({
        owner,
        repo,
        sha,
        state,
        description,
        context: 'SmartAudit AI',
        target_url: scanResult.reportUrl,
      });

      return true;
    } catch (error) {
      throw new Error(`Failed to create commit status: ${error}`);
    }
  }

  async setupWebhook(owner: string, repo: string, webhookUrl: string) {
    try {
      const { data } = await this.octokit.rest.repos.createWebhook({
        owner,
        repo,
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret: process.env.GITHUB_WEBHOOK_SECRET,
        },
        events: ['push', 'pull_request'],
        active: true,
      });

      return {
        id: data.id,
        url: data.config.url,
        events: data.events,
      };
    } catch (error) {
      throw new Error(`Failed to setup webhook: ${error}`);
    }
  }

  private async findSolidityFiles(owner: string, repo: string, branch: string, path = ''): Promise<any[]> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      const files: any[] = [];
      const items = Array.isArray(data) ? data : [data];

      for (const item of items) {
        if (item.type === 'file' && item.name.endsWith('.sol')) {
          files.push(item);
        } else if (item.type === 'dir') {
          // Recursively scan directories
          const subFiles = await this.findSolidityFiles(owner, repo, branch, item.path);
          files.push(...subFiles);
        }
      }

      return files;
    } catch (error) {
      return [];
    }
  }

  private generatePRComment(scanResult: ScanResult): string {
    const severityEmoji = {
      low: '🟡',
      medium: '🟠', 
      high: '🔴',
      critical: '🚨'
    };

    const emoji = severityEmoji[scanResult.severity];
    
    return `## ${emoji} SmartAudit AI Scan Results

**Status:** ${scanResult.status === 'completed' ? '✅ Complete' : '⏳ In Progress'}
**Findings:** ${scanResult.findings} issues detected
**Severity:** ${scanResult.severity.toUpperCase()}

### Summary
${scanResult.summary}

${scanResult.reportUrl ? `[📊 View Full Report](${scanResult.reportUrl})` : ''}

---
*Automated by SmartAudit AI - Secure your smart contracts before deployment*`;
  }

  private getCommitState(scanResult: ScanResult): 'pending' | 'success' | 'failure' | 'error' {
    if (scanResult.status === 'pending') return 'pending';
    if (scanResult.status === 'failed') return 'error';
    
    // Success if no critical/high severity issues
    return ['critical', 'high'].includes(scanResult.severity) ? 'failure' : 'success';
  }

  private getCommitDescription(scanResult: ScanResult): string {
    if (scanResult.status === 'pending') return 'Smart contract security scan in progress...';
    if (scanResult.status === 'failed') return 'Security scan failed';
    
    return `${scanResult.findings} ${scanResult.severity} severity issues found`;
  }

  async getFileContent(owner: string, repo: string, path: string, branch = 'main'): Promise<string> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      if ('content' in data && data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }
      
      throw new Error('File content not found');
    } catch (error) {
      throw new Error(`Failed to get file content: ${error}`);
    }
  }
}

export class CICDService {
  static generateYAMLConfig(projectType: 'hardhat' | 'truffle' | 'foundry' = 'hardhat'): string {
    const configs = {
      hardhat: `name: SmartAudit CI
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Compile contracts
      run: npx hardhat compile
      
    - name: Run SmartAudit AI
      uses: smartaudit-ai/action@v1
      with:
        api-key: \${{ secrets.SMARTAUDIT_API_KEY }}
        contracts-path: './contracts'
        create-pr-comment: true
        fail-on-high-severity: true
      env:
        GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`,
        
      truffle: `name: SmartAudit CI
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Compile contracts
      run: npx truffle compile
      
    - name: Run SmartAudit AI
      uses: smartaudit-ai/action@v1
      with:
        api-key: \${{ secrets.SMARTAUDIT_API_KEY }}
        contracts-path: './contracts'
        create-pr-comment: true
        fail-on-high-severity: true`,
        
      foundry: `name: SmartAudit CI
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    
    - name: Install Foundry
      uses: foundry-rs/foundry-toolchain@v1
      
    - name: Build contracts
      run: forge build
      
    - name: Run SmartAudit AI
      uses: smartaudit-ai/action@v1
      with:
        api-key: \${{ secrets.SMARTAUDIT_API_KEY }}
        contracts-path: './src'
        create-pr-comment: true
        fail-on-high-severity: true`
    };

    return configs[projectType];
  }

  static generateJenkinsfile(): string {
    return `pipeline {
    agent any
    
    environment {
        SMARTAUDIT_API_KEY = credentials('smartaudit-api-key')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                sh 'npm ci'
            }
        }
        
        stage('Compile Contracts') {
            steps {
                sh 'npx hardhat compile'
            }
        }
        
        stage('Security Audit') {
            steps {
                script {
                    def auditResult = sh(
                        script: 'curl -X POST "https://your-domain.com/api/integrations/cicd/scan" -H "Authorization: Bearer \${SMARTAUDIT_API_KEY}" -H "Content-Type: application/json" -d \'{"repository": "\${GIT_URL}", "branch": "\${GIT_BRANCH}", "commitSha": "\${GIT_COMMIT}"}\'',
                        returnStdout: true
                    ).trim()
                    
                    def result = readJSON text: auditResult
                    
                    if (result.severity in ['high', 'critical']) {
                        error "Security audit found \${result.severity} severity issues"
                    }
                }
            }
        }
    }
    
    post {
        always {
            publishHTML([
                allowMissing: false,
                alwaysLinkToLastBuild: true,
                keepAll: true,
                reportDir: 'audit-reports',
                reportFiles: 'index.html',
                reportName: 'Security Audit Report'
            ])
        }
    }
}`;
  }
}