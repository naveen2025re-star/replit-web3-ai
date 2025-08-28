// SmartAudit AI Browser Extension - Popup Script

class PopupManager {
  constructor() {
    this.init();
  }

  async init() {
    // Check if user is already connected
    const { apiKey } = await chrome.storage.sync.get(['apiKey']);
    
    if (apiKey) {
      this.showConnectedState();
    } else {
      this.showLoginState();
    }

    this.bindEvents();
  }

  bindEvents() {
    // Connect button
    document.getElementById('connect-btn').addEventListener('click', () => {
      this.connectAccount();
    });

    // Get API key button
    document.getElementById('get-key-btn').addEventListener('click', async () => {
      const apiBase = await this.getApiBase();
      const baseUrl = apiBase.replace('/api', '');
      chrome.tabs.create({ url: `${baseUrl}/auth` });
    });

    // Scan current contract button
    document.getElementById('scan-current-btn').addEventListener('click', () => {
      this.scanCurrentContract();
    });

    // Open dashboard button
    document.getElementById('open-dashboard-btn').addEventListener('click', async () => {
      const apiBase = await this.getApiBase();
      const baseUrl = apiBase.replace('/api', '');
      chrome.tabs.create({ url: `${baseUrl}/auditor` });
    });

    // Disconnect button
    document.getElementById('disconnect-btn').addEventListener('click', () => {
      this.disconnect();
    });

    // Enter key on API input
    document.getElementById('api-key-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.connectAccount();
      }
    });
  }

  async connectAccount() {
    const apiKey = document.getElementById('api-key-input').value.trim();
    
    if (!apiKey) {
      this.showError('Please enter your API key');
      return;
    }

    const connectBtn = document.getElementById('connect-btn');
    connectBtn.textContent = '🔄 Connecting...';
    connectBtn.disabled = true;

    try {
      // Get API base URL
      const apiBase = await this.getApiBase();
      
      // Validate API key
      const response = await fetch(`${apiBase}/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Invalid API key');
      }

      // Save API key
      await chrome.storage.sync.set({ apiKey });
      
      this.showConnectedState();
      this.showSuccess('Connected successfully!');
      
    } catch (error) {
      console.error('Connection failed:', error);
      this.showError('Invalid API key. Please check and try again.');
    } finally {
      connectBtn.textContent = '🔗 Connect Account';
      connectBtn.disabled = false;
    }
  }

  async disconnect() {
    await chrome.storage.sync.remove(['apiKey']);
    this.showLoginState();
    this.showSuccess('Disconnected successfully');
  }

  async scanCurrentContract() {
    const scanBtn = document.getElementById('scan-current-btn');
    scanBtn.textContent = '⏳ Scanning...';
    scanBtn.disabled = true;

    try {
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!this.isBlockExplorerTab(tab.url)) {
        throw new Error('Please navigate to a contract page on Etherscan or other supported block explorer');
      }

      // Inject content script to scan
      await chrome.tabs.sendMessage(tab.id, { action: 'scan' });
      
      // Close popup
      window.close();
      
    } catch (error) {
      console.error('Scan failed:', error);
      this.showError(error.message);
    } finally {
      scanBtn.textContent = '🔍 Scan Current Contract';
      scanBtn.disabled = false;
    }
  }

  isBlockExplorerTab(url) {
    const supportedExplorers = [
      'etherscan.io',
      'bscscan.com',
      'polygonscan.com',
      'arbiscan.io',
      'ftmscan.com'
    ];
    
    return supportedExplorers.some(explorer => 
      url && url.includes(explorer) && url.includes('/address/')
    );
  }

  showLoginState() {
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('connected-section').classList.add('hidden');
  }

  showConnectedState() {
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('connected-section').classList.remove('hidden');
  }

  showError(message) {
    // Create temporary error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 12px;
    `;
    errorDiv.textContent = message;
    
    const content = document.querySelector('.content');
    content.insertBefore(errorDiv, content.firstChild);
    
    // Remove after 3 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 3000);
  }

  showSuccess(message) {
    // Create temporary success message
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #10b981;
      padding: 8px 12px;
      border-radius: 6px;
      margin-bottom: 12px;
      font-size: 12px;
    `;
    successDiv.textContent = message;
    
    const content = document.querySelector('.content');
    content.insertBefore(successDiv, content.firstChild);
    
    // Remove after 2 seconds
    setTimeout(() => {
      successDiv.remove();
    }, 2000);
  }

  async getApiBase() {
    // Try to get current tab's URL to determine API base
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      const url = new URL(currentTab.url);
      
      if (url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1')) {
        return 'http://localhost:5000/api';
      }
      
      return `${url.protocol}//${url.hostname}/api`;
    } catch (error) {
      // Fallback to default
      return 'https://your-domain.com/api';
    }
  }
}

// Initialize popup when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});