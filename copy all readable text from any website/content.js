if (window.hasRunContent) {
  // Script already loaded, nothing to do
} else {
  window.hasRunContent = true;

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {


    if (msg.action === "COPY_ALL") {
      copyToClipboard(document.body.innerText);
      sendResponse({ status: "done" });
    }

    else if (msg.action === "SELECT_AREA") {
      enableSelection();
      sendResponse({ status: "started" });
    }

    else if (msg.action === "COPY_CANVAS") {
      const onCanvasText = (e) => {
        if (e.detail) {
          copyToClipboard(e.detail);
          showStatus("Canvas text copied");
        } else {
          showStatus("No canvas text found", true);
        }
        window.removeEventListener("COPY_EXTENSION_SEND_CANVAS", onCanvasText);
      };
      window.addEventListener("COPY_EXTENSION_SEND_CANVAS", onCanvasText);
      window.dispatchEvent(new CustomEvent("COPY_EXTENSION_GET_CANVAS"));
      sendResponse({ status: "processing" });
    }

    else if (msg.action === "BULK_OCR") {
      runBulkOCR();
      sendResponse({ status: "started" });
    }

    return true; // Keep channel open for async responses if needed, though here we responded synchronously mostly.
  });

  function showStatus(msg, isError = false) {
    const el = document.createElement("div");
    el.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 20px;
    background: ${isError ? '#ef4444' : '#22c55e'};
    color: white;
    border-radius: 8px;
    z-index: 1000000;
    font-family: sans-serif;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transition: opacity 0.5s;
  `;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 500);
    }, 2000);
  }

  function copyToClipboard(text) {
    if (!text || !text.trim()) {
      showStatus("No text found to copy", true);
      return;
    }

    navigator.clipboard.writeText(text)
      .then(() => showStatus("Copied to clipboard!"))
      .catch(err => {
        console.error(err);
        showStatus("Failed to copy", true);
      });
  }

  let startX, startY, box;

  function enableSelection() {
    document.body.style.cursor = "crosshair";
    document.addEventListener("mousedown", startSelect, { once: true });
  }

  function startSelect(e) {
    e.preventDefault();
    startX = e.clientX;
    startY = e.clientY;

    box = document.createElement("div");
    box.style.cssText = `
    position: fixed;
    border: 2px solid #3b82f6;
    background: rgba(59, 130, 246, 0.2);
    z-index: 2147483647;
    pointer-events: none;
  `;
    document.body.appendChild(box);

    document.addEventListener("mousemove", drawBox);
    document.addEventListener("mouseup", endSelect, { once: true });
  }

  function drawBox(e) {
    const left = Math.min(startX, e.clientX);
    const top = Math.min(startY, e.clientY);
    const width = Math.abs(e.clientX - startX);
    const height = Math.abs(e.clientY - startY);

    box.style.left = left + "px";
    box.style.top = top + "px";
    box.style.width = width + "px";
    box.style.height = height + "px";
  }

  function endSelect(e) {
    document.removeEventListener("mousemove", drawBox);
    document.body.style.cursor = "";

    const rect = box.getBoundingClientRect();
    box.remove();

    // If box is too small, assume it was a click, ignore
    if (rect.width < 5 || rect.height < 5) return;

    const textParts = [];

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null
    );

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.nodeValue.trim()) continue;

      const range = document.createRange();
      range.selectNode(node);
      const r = range.getBoundingClientRect();

      // Check if the text node overlaps with the selection box
      const overlaps = !(r.right < rect.left ||
        r.left > rect.right ||
        r.bottom < rect.top ||
        r.top > rect.bottom);

      if (overlaps) {
        // Check visibility of parent
        const style = window.getComputedStyle(node.parentElement);
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
          textParts.push(node.nodeValue.trim());
        }
      }
    }

    copyToClipboard(textParts.join("\n"));
  }
}
