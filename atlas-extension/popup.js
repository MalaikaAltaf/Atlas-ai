document.getElementById('openSidebar').onclick = async function() {
    const [tab] = await chrome.tabs.query({active: true, lastFocusedWindow: true});
    if (tab) {
        chrome.sidePanel.open({ windowId: tab.windowId });
    }
};