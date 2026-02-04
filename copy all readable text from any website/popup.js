document.getElementById("copyAll").onclick = () => handleAction("COPY_ALL");
document.getElementById("selectArea").onclick = () => handleAction("SELECT_AREA");
document.getElementById("copyCanvas").onclick = () => handleAction("COPY_CANVAS");
document.getElementById("bulkOCR").onclick = () => handleAction("BULK_OCR");

async function handleAction(action) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  try {
    await sendMessage(tab.id, { action });
  } catch (err) {
    console.log("Connection failed, attempting to inject scripts...", err);
    // If connection failed, try injecting scripts then retry
    try {
      // Inject Main World script (for canvas hooking)
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["canvas-hook.js"],
        world: "MAIN"
      });

      // Inject Isolated World scripts
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["lib/tesseract.min.js", "ocr.js", "content.js"]
      });

      // Small delay to ensure listeners are ready
      await new Promise(r => setTimeout(r, 100));

      // Retry sending message
      await sendMessage(tab.id, { action });
    } catch (e) {
      console.error("Injection failed:", e);
      alert("Could not execute on this page. Please reload the page and try again.\n\nError: " + (e.message || e));
    }
  }
}

function sendMessage(tabId, msg) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, msg, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(response);
      }
    });
  });
}

