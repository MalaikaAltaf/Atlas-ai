chrome.action.onClicked.addListener((tab) => {
  // Just open sidebar - it will fetch content from the active tab
  chrome.sidePanel.open({ tabId: tab.id }, () => {
    console.log("[Atlas AI] Sidebar opened for tab:", tab.id);
  });
});