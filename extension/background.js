// Open the side panel when the extension icon is clicked
if (chrome.sidePanel) {
  chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((e) => console.warn("[ZAPI] sidePanel:", e));
} else {
  // Fallback for Chrome < 114 — open sidepanel.html in a regular tab
  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: "sidepanel.html" });
  });
}