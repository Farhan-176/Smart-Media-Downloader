// Context Menu setup
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "download-smart",
    title: "Download with SmartDownloader",
    contexts: ["link", "video", "audio"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "download-smart") {
    const url = info.linkUrl || info.srcUrl;
    if (url) {
      sendToDesktopApp(url);
    }
  }
});

// Intercept browser downloads
chrome.downloads.onCreated.addListener((downloadItem) => {
  // Ignore downloads initiated by our desktop app or local loops
  if (downloadItem.url.startsWith('http://127.0.0.1') || downloadItem.url.startsWith('http://localhost') || downloadItem.byExtensionId) {
    return;
  }

  // Cancel Chrome's built-in download engine
  chrome.downloads.cancel(downloadItem.id);

  // Extract clean filename
  const cleanFilename = downloadItem.filename ? downloadItem.filename.split(/[/\\]/).pop() : '';

  // Forward details to Electron integration server
  sendToDesktopApp(downloadItem.url, cleanFilename);
});

function sendToDesktopApp(url, filename = '') {
  fetch('http://127.0.0.1:3010/download', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      url: url,
      filename: filename
    })
  }).catch(err => {
    console.error('SmartDownloader Desktop App is not running:', err);
  });
}
