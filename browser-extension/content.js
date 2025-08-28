// SmartAudit AI Browser Extension - Content Script
class SmartAuditExtension {
  constructor() {
    this.apiBase = 'https://your-domain.com/api';
    this.init();
  }

  init() {
    // Wait for page to load
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.injectAuditButton());
    } else {
      this.injectAuditButton();
    }
  }

  // Detect which block explorer we're on
  detectBlockExplorer() {
    const hostname = window.location.hostname;
    
    if (hostname.includes('etherscan.io')) return 'etherscan';
    if (hostname.includes('bscscan.com')) return 'bscscan';
    if (hostname.includes('polygonscan.com')) return 'polygonscan';
    if (hostname.includes('arbiscan.io')) return 'arbiscan';
    if (hostname.includes('ftmscan.com')) return 'ftmscan';
    
    return 'unknown';
  }

  // Extract contract address from URL
  getContractAddress() {
    const path = window.location.pathname;
    const addressMatch = path.match(/\/address\/(0x[a-fA-F0-9]{40})/);
    return addressMatch ? addressMatch[1] : null;
  }

  // Check if contract is verified
  isContractVerified() {
    // Look for contract source code section
    const sourceCodeSection = document.querySelector('[id*="code"], [class*="sourcecode"], .tab-content');
    return sourceCodeSection && sourceCodeSection.textContent.includes('pragma solidity');
  }

  // Extract contract source code
  getContractSource() {
    // Try different selectors based on block explorer
    const selectors = [
      '#editor', // Etherscan
      '.js-sourcecode', // Alternative
      'pre[id*="code"]', // Generic
      '.tab-content pre' // Tab content
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.includes('pragma solidity')) {
        return element.textContent;
      }
    }

    return null;
  }

  // Inject audit button into the page
  injectAuditButton() {
    const contractAddress = this.getContractAddress();
    if (!contractAddress) return;

    // Find a good place to inject the button
    let targetElement = this.findTargetElement();
    if (!targetElement) return;

    // Create audit button
    const auditButton = this.createAuditButton(contractAddress);
    
    // Insert button
    targetElement.insertAdjacentElement('afterend', auditButton);
  }

  findTargetElement() {
    // Try to find the contract header or address display
    const selectors = [
      '.card-header', // Etherscan card header
      '.page-header', // Page header
      '.d-flex.align-items-center', // Flexbox container
      'h1', // Main heading
      '.container-xl .row .col' // Main content column
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.includes('0x')) {
        return element;
      }
    }

    return document.querySelector('main, .container, .content') || document.body;
  }

  createAuditButton(contractAddress) {
    const container = document.createElement('div');
    container.className = 'smartaudit-container';
    container.style.cssText = `
      margin: 10px 0;
      padding: 10px;
      background: linear-gradient(135deg, #1e3a8a, #3b82f6);
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;

    const isVerified = this.isContractVerified();
    
    container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center;">
          <div style="
            width: 24px;
            height: 24px;
            background: #3b82f6;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 8px;
          ">
            🛡️
          </div>
          <div>
            <div style="color: white; font-weight: 600; font-size: 14px;">
              SmartAudit AI
            </div>
            <div style="color: rgba(255,255,255,0.8); font-size: 12px;">
              ${isVerified ? 'Ready to scan' : 'Contract not verified'}
            </div>
          </div>
        </div>
        <button 
          id="smartaudit-scan-btn"
          style="
            background: ${isVerified ? '#059669' : '#6b7280'};
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            cursor: ${isVerified ? 'pointer' : 'not-allowed'};
            transition: all 0.2s;
          "
          ${isVerified ? '' : 'disabled'}
        >
          ${isVerified ? '🔍 Scan Contract' : '❌ Not Available'}
        </button>
      </div>
      <div id="smartaudit-results" style="margin-top: 10px; display: none;"></div>
    `;

    // Add click handler
    const scanButton = container.querySelector('#smartaudit-scan-btn');
    if (isVerified) {
      scanButton.addEventListener('click', () => this.scanContract(contractAddress));
    }

    return container;
  }

  async scanContract(contractAddress) {
    const scanButton = document.getElementById('smartaudit-scan-btn');
    const resultsDiv = document.getElementById('smartaudit-results');
    
    // Update button state
    scanButton.textContent = '⏳ Scanning...';
    scanButton.disabled = true;
    
    try {
      // Get contract source code
      const sourceCode = this.getContractSource();
      if (!sourceCode) {
        throw new Error('Could not extract contract source code');
      }

      // Get API key from storage
      const { apiKey } = await chrome.storage.sync.get(['apiKey']);
      if (!apiKey) {
        this.showLoginPrompt(resultsDiv);
        return;
      }

      // Call audit API
      const response = await fetch(`${this.apiBase}/audit/extension`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          contractAddress,
          sourceCode,
          blockExplorer: this.detectBlockExplorer(),
          url: window.location.href
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Scan failed');
      }

      this.displayResults(resultsDiv, result);
      
    } catch (error) {
      console.error('SmartAudit scan failed:', error);
      this.displayError(resultsDiv, error.message);
    } finally {
      // Reset button
      scanButton.textContent = '🔍 Scan Contract';
      scanButton.disabled = false;
    }
  }

  showLoginPrompt(container) {
    container.style.display = 'block';
    container.innerHTML = `
      <div style="
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 6px;
        padding: 10px;
        text-align: center;
      ">
        <div style="color: #ef4444; font-size: 12px; margin-bottom: 8px;">
          🔑 Authentication Required
        </div>
        <button 
          onclick="chrome.runtime.sendMessage({action: 'openPopup'})"
          style="
            background: #3b82f6;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
          "
        >
          Connect Account
        </button>
      </div>
    `;
  }

  displayResults(container, result) {
    container.style.display = 'block';
    
    const severityColor = {
      low: '#22c55e',
      medium: '#eab308', 
      high: '#f97316',
      critical: '#ef4444'
    };

    const bgColor = {
      low: 'rgba(34, 197, 94, 0.1)',
      medium: 'rgba(234, 179, 8, 0.1)',
      high: 'rgba(249, 115, 22, 0.1)',
      critical: 'rgba(239, 68, 68, 0.1)'
    };

    container.innerHTML = `
      <div style="
        background: ${bgColor[result.severity] || bgColor.low};
        border: 1px solid ${severityColor[result.severity] || severityColor.low}40;
        border-radius: 6px;
        padding: 10px;
      ">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="
            color: ${severityColor[result.severity] || severityColor.low};
            font-weight: 600;
            font-size: 12px;
          ">
            ${result.findings} Issues Found (${result.severity.toUpperCase()})
          </span>
          <span style="color: rgba(255,255,255,0.6); font-size: 10px;">
            Scan completed
          </span>
        </div>
        <div style="color: rgba(255,255,255,0.8); font-size: 11px; line-height: 1.4;">
          ${result.summary}
        </div>
        <div style="margin-top: 8px; text-align: center;">
          <a 
            href="${result.reportUrl}" 
            target="_blank"
            style="
              color: #3b82f6;
              text-decoration: none;
              font-size: 11px;
              font-weight: 500;
            "
          >
            📊 View Full Report →
          </a>
        </div>
      </div>
    `;
  }

  displayError(container, message) {
    container.style.display = 'block';
    container.innerHTML = `
      <div style="
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 6px;
        padding: 10px;
        text-align: center;
      ">
        <div style="color: #ef4444; font-size: 12px;">
          ❌ Scan failed: ${message}
        </div>
      </div>
    `;
  }
}

// Initialize extension when page loads
new SmartAuditExtension();