// Background service worker
chrome.runtime.onInstalled.addListener(() => {
    console.log("Pinterest & Web Video Downloader installed.");
});

// Handle messages from content scripts if needed
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "downloadVideo") {
        chrome.downloads.download({
            url: request.url,
            filename: request.filename || "video.mp4",
            saveAs: true
        });
    }
});
