// SmartAudit AI Browser Extension - Background Script

chrome.runtime.onInstalled.addListener(() => {
  console.log('SmartAudit AI extension installed');
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openPopup') {
    chrome.action.openPopup();
  }
  
  if (request.action === 'scan') {
    // Forward scan request to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(tabs[0].id, { action: 'scan' });
    });
  }
});

// Update badge based on page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isBlockExplorer = [
      'etherscan.io',
      'bscscan.com', 
      'polygonscan.com',
      'arbiscan.io',
      'ftmscan.com'
    ].some(explorer => tab.url.includes(explorer) && tab.url.includes('/address/'));
    
    if (isBlockExplorer) {
      chrome.action.setBadgeText({ text: '✓', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981', tabId });
      chrome.action.setTitle({ 
        title: 'SmartAudit AI - Click to scan this contract',
        tabId 
      });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
      chrome.action.setTitle({ 
        title: 'SmartAudit AI - Navigate to a contract page to scan',
        tabId 
      });
    }
  }
});