document.addEventListener('DOMContentLoaded', () => {
    let allMedia = [];
    let filteredMedia = [];
    let selectedIndices = new Set();
    let isSelectAll = false;
    let activeTab = 'images'; // Track active tab

    // DOM Elements
    const container = document.getElementById("media-container");
    const countEl = document.getElementById("total-count");
    const imageCountEl = document.getElementById("image-count");
    const videoCountEl = document.getElementById("video-count");
    const selectedCountEl = document.getElementById("selected-count");
    const btnDownload = document.getElementById("download-selected");
    const btnSelectAll = document.getElementById("btn-select-all");

    // Tab elements
    const tabs = document.querySelectorAll('.tab');

    // Lightbox Elements
    const lightbox = document.getElementById("lightbox");
    const lbWrapper = document.getElementById("lb-media-wrapper");
    const lbCounter = document.getElementById("lb-counter");
    const lbDownload = document.getElementById("lb-download");
    let currentLbIndex = -1;

    // Filters
    const filterSize = document.getElementById("filter-size");
    const filterType = document.getElementById("filter-type");
    const filterUrl = document.getElementById("filter-url");

    // Listeners
    if (filterSize) filterSize.onchange = applyFilters;
    if (filterType) filterType.onchange = applyFilters;
    if (filterUrl) filterUrl.oninput = applyFilters;

    if (btnSelectAll) btnSelectAll.onclick = toggleSelectAll;
    if (btnDownload) btnDownload.onclick = downloadSelected;

    // Header buttons
    const btnReset = document.getElementById('btn-reset');
    const btnClose = document.getElementById('btn-close');

    if (btnReset) {
        btnReset.onclick = () => {
            selectedIndices.clear();
            isSelectAll = false;
            render();
            updateStats();
        };
    }

    if (btnClose) {
        btnClose.onclick = () => {
            window.close();
        };
    }

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active to clicked tab
            tab.classList.add('active');
            // Update active tab
            activeTab = tab.dataset.tab;

            // Toggle sections
            const mediaContainer = document.getElementById('media-container');
            const bgRemoverSection = document.getElementById('bg-remover-section');
            const subHeader = document.querySelector('.sub-header');
            const bottomBar = document.querySelector('.bottom-bar');

            if (activeTab === 'bg-remover') {
                // Show BG Remover, hide media grid
                if (mediaContainer) mediaContainer.style.display = 'none';
                if (bgRemoverSection) bgRemoverSection.style.display = 'flex';
                if (subHeader) subHeader.style.display = 'none';
                if (bottomBar) bottomBar.style.display = 'none';
            } else {
                // Show media grid, hide BG Remover
                if (mediaContainer) mediaContainer.style.display = 'grid';
                if (bgRemoverSection) bgRemoverSection.style.display = 'none';
                if (subHeader) subHeader.style.display = 'flex';
                if (bottomBar) bottomBar.style.display = 'flex';
                // Re-apply filters for images/videos
                applyFilters();
            }
        });
    });

    // Debug Panel
    const debugPanel = document.getElementById("debug-panel");
    const debugContent = document.getElementById("debug-content");
    let debugMessages = [];

    function addDebug(msg, type = 'info') {
        const colors = { info: '#0066cc', success: '#22c55e', error: '#ef4444', warning: '#f59e0b' };
        const prefix = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
        debugMessages.push(`<div style="color:${colors[type]};margin:2px 0;">${prefix[type]} ${msg}</div>`);
        if (debugContent) {
            debugContent.innerHTML = debugMessages.slice(-5).join(''); // Show last 5
        }
        if (debugPanel) debugPanel.style.display = 'block';
    }

    // Lightbox Listeners
    // Lightbox Listeners
    const lbCloseBtn = document.querySelector(".lb-close");
    const lbPrevBtn = document.querySelector(".lb-prev");
    const lbNextBtn = document.querySelector(".lb-next");

    if (lbCloseBtn) lbCloseBtn.onclick = closeLightbox;
    if (lbPrevBtn) lbPrevBtn.onclick = () => navLightbox(-1);
    if (lbNextBtn) lbNextBtn.onclick = () => navLightbox(1);

    if (lbCloseBtn) { // Wrapper for keydown
        document.addEventListener("keydown", (e) => {
            if (lightbox && !lightbox.classList.contains("hidden")) {
                if (e.key === "Escape") closeLightbox();
                if (e.key === "ArrowLeft") navLightbox(-1);
                if (e.key === "ArrowRight") navLightbox(1);
            }
        });
    }

    // Store current website info
    let currentWebsiteUrl = '';
    let currentWebsiteName = '';

    // Initialize
    (async () => {
        console.log("Media Downloader Popup: Initializing...");
        addDebug("Extension popup opened", 'info');

        // Check if Chrome API is available
        if (!chrome.tabs) {
            console.error("Chrome tabs API not available");
            addDebug("Chrome API not available!", 'error');
            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            console.error("No active tab found");
            addDebug("No active tab found!", 'error');
            return;
        }

        // Store website info
        currentWebsiteUrl = tab.url;
        try {
            const url = new URL(tab.url);
            currentWebsiteName = url.hostname.replace('www.', '');
        } catch (e) {
            currentWebsiteName = 'downloads';
        }

        console.log("Active tab:", tab.url);
        addDebug(`Scanning: ${tab.url.substring(0, 40)}...`, 'info');

        // Always try to inject first (in case page was loaded before extension)
        try {
            console.log("Injecting content script...");
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["content.js"]
            });
            console.log("Content script injected successfully");
        } catch (injectError) {
            console.log("Injection error (may already be injected):", injectError.message);
        }

        // Wait a moment for script to initialize
        await new Promise(resolve => setTimeout(resolve, 300));

        // Now try to get media
        try {
            console.log("Requesting media from content script...");
            const response = await sendMessage(tab.id, { action: "GET_MEDIA" });
            console.log("Response received:", response);

            if (response) {
                loadMedia(response);
            } else {
                console.error("Received null/undefined response");
                if (container) {
                    container.innerHTML = `<div class="empty-state">Failed to communicate with page. <br><button onclick="location.reload()">Retry</button></div>`;
                }
            }
        } catch (err) {
            console.error("Error getting media:", err);
            if (container) {
                container.innerHTML = `<div class="empty-state">Error: ${err.message}<br><button onclick="location.reload()">Retry</button></div>`;
            }
        }
    })();

    function loadMedia(data) {
        console.log("Media Downloader Popup: Received data", data);

        if (!data) {
            console.warn("No data received from content script");
            if (container) container.innerHTML = `<div class="empty-state">No media data received</div>`;
            return;
        }

        // Merge images and videos with an index
        allMedia = [
            ...data.images.map(x => ({ ...x, originalIndex: -1 })),
            ...data.videos.map(x => ({ ...x, originalIndex: -1 }))
        ];

        console.log("Total media items:", allMedia.length);

        // Assign unique IDs for selection tracking
        allMedia.forEach((item, i) => item.id = i);

        // Update counts
        const imageCount = data.images.length;
        const videoCount = data.videos.length;

        if (countEl) countEl.textContent = allMedia.length;
        if (imageCountEl) imageCountEl.textContent = imageCount;
        if (videoCountEl) videoCountEl.textContent = videoCount;

        applyFilters();
    }

    function applyFilters() {
        if (!filterSize || !filterType || !filterUrl) return;

        const sizeVal = filterSize.value;
        const typeVal = filterType.value;
        const urlVal = filterUrl.value.toLowerCase();

        filteredMedia = allMedia.filter(item => {
            // 0. Tab Filter - FIRST check active tab
            if (activeTab === 'images' && item.type === 'video') return false;
            if (activeTab === 'videos' && item.type !== 'video') return false;

            // 1. Size Filter
            if (sizeVal !== 'all') {
                const maxDim = Math.max(item.width, item.height);
                if (sizeVal === 'small' && maxDim >= 500) return false;
                if (sizeVal === 'medium' && (maxDim < 500 || maxDim > 1000)) return false;
                if (sizeVal === 'large' && maxDim <= 1000) return false;
            }

            // 2. Type Filter
            if (typeVal !== 'all') {
                // Check item.type (video vs image) or extension
                const ext = getExtension(item.src);
                if (typeVal === 'video') {
                    if (item.type !== 'video') return false;
                } else {
                    if (item.type === 'video') return false;
                    // Simple extension check
                    if (!ext.includes(typeVal)) return false;
                }
            }

            // 3. URL Filter
            if (urlVal && !item.src.toLowerCase().includes(urlVal)) {
                return false;
            }

            return true;
        });

        render();
        updateStats();
    }

    function render() {
        if (!container) return;
        container.innerHTML = "";

        if (filteredMedia.length === 0) {
            container.innerHTML = `<div class="empty-state">No media matches your filters</div>`;
            return;
        }

        console.log("Rendering", filteredMedia.length, "media items");

        filteredMedia.forEach((item, index) => {
            const isSelected = selectedIndices.has(item.id);
            const card = document.createElement("div");
            card.className = `media-card ${isSelected ? 'selected' : ''}`;

            // Open lightbox on MAIN card click
            card.onclick = () => openLightbox(item.id);

            // Create checkbox
            const checkbox = document.createElement("div");
            checkbox.className = "checkbox-overlay";
            checkbox.onclick = (e) => toggleSelection(e, item.id);

            // Create image wrapper
            const imageWrap = document.createElement("div");
            imageWrap.className = "card-image-wrap";

            // Create actual media element
            let mediaEl;
            if (item.type === 'image') {
                mediaEl = document.createElement("img");

                // Set crossorigin to allow loading from CDNs
                mediaEl.crossOrigin = "anonymous";

                // Set source
                mediaEl.src = item.src;
                mediaEl.alt = `Image ${index + 1}`;

                // Simple, clear inline styles
                mediaEl.style.maxWidth = "130px";
                mediaEl.style.maxHeight = "130px";
                mediaEl.style.display = "block";
                mediaEl.style.margin = "auto";

                // Log when image starts loading
                console.log(`[${index + 1}] Loading image:`, item.src.substring(0, 60) + "...");

                // Show first few in debug panel
                if (index < 3) {
                    addDebug(`Loading img [${index + 1}]...`, 'info');
                }

                mediaEl.onload = () => {
                    console.log(`✅ [${index + 1}] Loaded:`,
                        `${mediaEl.naturalWidth}×${mediaEl.naturalHeight}px`,
                        item.src.substring(0, 50) + "...");

                    if (index < 3) {
                        addDebug(`Loaded [${index + 1}]: ${mediaEl.naturalWidth}×${mediaEl.naturalHeight}px`, 'success');
                    }
                };

                mediaEl.onerror = (e) => {
                    console.error(`❌ [${index + 1}] Failed:`, item.src);
                    addDebug(`Failed to load image [${index + 1}]`, 'error');

                    // Try without crossorigin
                    if (mediaEl.crossOrigin) {
                        console.log(`[${index + 1}] Retrying without CORS...`);
                        addDebug(`Retrying [${index + 1}] without CORS...`, 'warning');
                        mediaEl.crossOrigin = null;
                        mediaEl.src = item.src; // Reload
                    } else {
                        imageWrap.innerHTML = `<div style="color:#999;font-size:11px;text-align:center;padding:20px;">❌ Failed to load<br><small>${item.src.substring(0, 30)}...</small></div>`;
                    }
                };
            } else {
                mediaEl = document.createElement("video");
                mediaEl.src = item.src;
                mediaEl.muted = true;
                mediaEl.disablePictureInPicture = true;
            }

            // Create badges
            const badgesDiv = document.createElement("div");
            badgesDiv.className = "card-badges";

            const ext = getExtension(item.src).toUpperCase() || item.type.toUpperCase();
            const extBadge = document.createElement("span");
            extBadge.className = "badge";
            extBadge.textContent = ext;

            const dimBadge = document.createElement("span");
            dimBadge.className = "badge";
            dimBadge.textContent = `${item.width}x${item.height}`;

            // File size badge
            const sizeBadge = document.createElement("span");
            sizeBadge.className = "badge badge-size";
            sizeBadge.textContent = "...";

            badgesDiv.appendChild(extBadge);
            badgesDiv.appendChild(dimBadge);
            badgesDiv.appendChild(sizeBadge);

            // Fetch file size asynchronously
            fetchFileSize(item.src).then(size => {
                if (size) {
                    sizeBadge.textContent = formatFileSize(size);
                } else {
                    sizeBadge.style.display = 'none';
                }
            }).catch(() => {
                sizeBadge.style.display = 'none';
            });

            // Create card info
            const cardInfo = document.createElement("div");
            cardInfo.className = "card-info";

            const urlDiv = document.createElement("div");
            urlDiv.className = "card-url";
            urlDiv.title = item.src;
            urlDiv.textContent = item.src;

            cardInfo.appendChild(urlDiv);

            // Assemble card
            imageWrap.appendChild(mediaEl);
            imageWrap.appendChild(badgesDiv);

            card.appendChild(checkbox);
            card.appendChild(imageWrap);
            card.appendChild(cardInfo);

            container.appendChild(card);
        });

        console.log("Render complete. Cards in DOM:", container.children.length);
    }

    function toggleSelection(e, id) {
        if (e) e.stopPropagation();
        if (selectedIndices.has(id)) {
            selectedIndices.delete(id);
        } else {
            selectedIndices.add(id);
        }
        render();
        updateStats();
    }

    function toggleSelectAll() {
        isSelectAll = !isSelectAll;

        if (isSelectAll) {
            // Select all VISIBLE items
            filteredMedia.forEach(item => selectedIndices.add(item.id));
            if (btnSelectAll) btnSelectAll.textContent = "Deselect all";
        } else {
            selectedIndices.clear();
            if (btnSelectAll) btnSelectAll.textContent = "Select all";
        }
        render();
        updateStats();
    }

    function updateStats() {
        if (countEl) countEl.textContent = filteredMedia.length;
        if (selectedCountEl) selectedCountEl.textContent = selectedIndices.size;

        if (btnDownload) {
            btnDownload.disabled = selectedIndices.size === 0;

            if (selectedIndices.size > 0) {
                btnDownload.textContent = `Download ${selectedIndices.size} files`;
            } else {
                btnDownload.textContent = "Download Selected";
            }
        }
    }

    // Lightbox Functions
    function openLightbox(id) {
        const index = filteredMedia.findIndex(m => m.id === id);
        if (index === -1) return;
        currentLbIndex = index;
        if (lightbox) lightbox.classList.remove("hidden");
        showLbMedia();
    }

    function closeLightbox() {
        if (lightbox) lightbox.classList.add("hidden");
        if (lbWrapper) lbWrapper.innerHTML = "";
    }

    function navLightbox(dir) {
        currentLbIndex += dir;
        if (currentLbIndex < 0) currentLbIndex = filteredMedia.length - 1;
        if (currentLbIndex >= filteredMedia.length) currentLbIndex = 0;
        showLbMedia();
    }

    function showLbMedia() {
        if (!lbWrapper) return;
        lbWrapper.innerHTML = "";
        const item = filteredMedia[currentLbIndex];

        if (lbCounter) lbCounter.textContent = `${currentLbIndex + 1} / ${filteredMedia.length}`;
        if (lbDownload) lbDownload.href = item.src;

        let el;
        if (item.type === 'video') {
            el = document.createElement("video");
            el.src = item.src;
            el.controls = true;
            el.autoplay = true;
        } else {
            el = document.createElement("img");
            el.src = item.src;
        }
        lbWrapper.appendChild(el);
    }

    async function downloadSelected() {
        const itemsToDownload = allMedia.filter(item => selectedIndices.has(item.id));
        if (itemsToDownload.length === 0) return;

        if (btnDownload) {
            btnDownload.textContent = `Downloading ${itemsToDownload.length} files...`;
            btnDownload.disabled = true;
        }

        let successCount = 0;
        let failCount = 0;

        try {
            // Use website name as folder name
            const folderName = currentWebsiteName || 'downloads';
            console.log(`Downloading to folder: ${folderName}`);
            addDebug(`Creating folder: ${folderName}`, 'info');

            // Download each file individually
            for (let i = 0; i < itemsToDownload.length; i++) {
                const item = itemsToDownload[i];

                try {
                    // Fetch the file
                    const response = await fetch(item.src);
                    const blob = await response.blob();

                    // Detect extension
                    let ext = getExtension(item.src) || (item.type === 'video' ? 'mp4' : 'jpg');

                    // Fallback from MIME type
                    if (blob.type === 'image/jpeg') ext = 'jpg';
                    if (blob.type === 'image/png') ext = 'png';
                    if (blob.type === 'image/webp') ext = 'webp';
                    if (blob.type === 'image/gif') ext = 'gif';
                    if (blob.type === 'image/svg+xml') ext = 'svg';

                    // Create blob URL
                    const blobUrl = URL.createObjectURL(blob);

                    // Sanitize folder name (replace invalid characters)
                    const safeFolderName = folderName.replace(/[<>:"|?*]/g, '_');

                    // Generate filename with folder path
                    const filename = `${safeFolderName}/image_${String(i + 1).padStart(3, '0')}_${item.width}x${item.height}.${ext}`;

                    console.log(`Downloading: ${filename}`);

                    // Download the file
                    const downloadId = await chrome.downloads.download({
                        url: blobUrl,
                        filename: filename,
                        conflictAction: 'uniquify', // Auto-rename if file exists
                        saveAs: false // Auto-save to Downloads folder
                    });

                    console.log(`Download started: ID ${downloadId}`);

                    successCount++;

                    // Update button text with progress
                    if (btnDownload) {
                        btnDownload.textContent = `Downloaded ${successCount}/${itemsToDownload.length}...`;
                    }

                    // Clean up blob URL after a delay
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);

                } catch (e) {
                    console.error("Failed to download", item.src, e);
                    failCount++;
                }
            }

            // Show completion message
            if (btnDownload) {
                if (failCount === 0) {
                    btnDownload.textContent = `✅ Downloaded ${successCount} files`;
                    addDebug(`Downloaded ${successCount} files to ${folderName}`, 'success');
                } else {
                    btnDownload.textContent = `⚠️ Downloaded ${successCount}, Failed ${failCount}`;
                    addDebug(`Downloaded ${successCount}, Failed ${failCount}`, 'warning');
                }
            }

        } catch (err) {
            console.error("Download error:", err);
            if (btnDownload) btnDownload.textContent = "❌ Download failed";
            addDebug("Download failed: " + err.message, 'error');
        } finally {
            setTimeout(() => {
                updateStats();
            }, 3000);
        }
    }

    // Helpers
    function getExtension(url) {
        if (!url) return "";
        // Remove query params
        const clean = url.split('?')[0].split('#')[0];
        const parts = clean.split('.');
        if (parts.length > 1) return parts.pop().toLowerCase();
        return "";
    }

    async function fetchFileSize(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            const contentLength = response.headers.get('Content-Length');
            return contentLength ? parseInt(contentLength) : null;
        } catch (e) {
            // If HEAD fails, try GET with range
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: { 'Range': 'bytes=0-0' }
                });
                const contentRange = response.headers.get('Content-Range');
                if (contentRange) {
                    const match = contentRange.match(/\/(\d+)/);
                    return match ? parseInt(match[1]) : null;
                }
                return null;
            } catch (e2) {
                return null;
            }
        }
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(1) + ' KB';
        }
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function sendMessage(tabId, msg) {
        return new Promise((resolve, reject) => {
            chrome.tabs.sendMessage(tabId, msg, (response) => {
                if (chrome.runtime.lastError) resolve(null);
                else resolve(response);
            });
        });
    }

    // ================== BACKGROUND REMOVER ==================
    const bgFileInput = document.getElementById('bg-file-input');
    const uploadArea = document.getElementById('upload-area');
    const previewArea = document.getElementById('preview-area');
    const originalImg = document.getElementById('original-img');
    const resultImg = document.getElementById('result-img');
    const processingSpinner = document.getElementById('processing-spinner');
    const btnBgDownload = document.getElementById('btn-bg-download');
    const btnBgReset = document.getElementById('btn-bg-reset');
    const btnUpload = document.querySelector('.btn-upload');

    let processedImageBlob = null;

    // Upload button click
    if (btnUpload) {
        btnUpload.addEventListener('click', () => {
            bgFileInput.click();
        });
    }

    // Upload area click
    if (uploadArea) {
        uploadArea.addEventListener('click', () => {
            bgFileInput.click();
        });
    }

    // Drag and drop
    if (uploadArea) {
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--primary)';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '#d1d5db';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '#d1d5db';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                handleImageUpload(file);
            }
        });
    }

    // File input change
    if (bgFileInput) {
        bgFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleImageUpload(file);
            }
        });
    }

    function handleImageUpload(file) {
        // Show preview area
        uploadArea.style.display = 'none';
        previewArea.style.display = 'flex';

        // Show original image
        const reader = new FileReader();
        reader.onload = (e) => {
            originalImg.src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Process image
        removeBackground(file);
    }

    async function removeBackground(file) {
        try {
            // Show spinner
            processingSpinner.style.display = 'flex';
            resultImg.style.display = 'none';
            btnBgDownload.disabled = true;

            // Use remove.bg API - requires API key
            // For demo purposes, I'll use a client-side solution
            // In production, you should use remove.bg API with your key

            const formData = new FormData();
            formData.append('image_file', file);
            // 'auto' uses highest available resolution (Full HD if credit exists, Preview if standard free tier)
            formData.append('size', 'auto');

            // API Key
            const apiKey = 'jVvZvSY4V3FkyxKsgymNPtxf';

            const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                method: 'POST',
                headers: {
                    'X-Api-Key': apiKey
                },
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errDetail = errData.errors ? errData.errors[0].title : response.statusText;
                console.error("API Error:", errData);
                throw new Error(`API Error: ${errDetail} (${response.status})`);
            }

            const blob = await response.blob();
            processedImageBlob = blob;

            // Show result
            const url = URL.createObjectURL(blob);
            resultImg.src = url;
            resultImg.style.display = 'block';
            processingSpinner.style.display = 'none';
            btnBgDownload.disabled = false;

        } catch (error) {
            console.error('Error removing background:', error);

            let helpfulMsg = "Please check your API key in popup.js";
            if (error.message.includes("402")) {
                helpfulMsg = "⚠️ <b>Quota Exceeded!</b><br>You have used all 50 free credits.<br>Please get a new API key from remove.bg";
            }

            processingSpinner.innerHTML = `
                <div style="color: var(--primary); text-align: center; padding: 10px;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p style="margin: 8px 0 0 0; font-size: 13px; font-weight: 600;">Failed to remove background</p>
                    <p style="margin: 4px 0 8px 0; font-size: 11px; color: #ef4444;">${error.message}</p>
                    <p style="margin: 0; font-size: 11px; color: var(--text-muted); line-height: 1.4;">${helpfulMsg}</p>
                    <button id="btn-retry-upload" class="btn-outline" style="margin-top: 12px; font-size: 11px; padding: 4px 8px;">Try Another Key</button>
                </div>
            `;

            // Re-attach upload reset listener to the new button
            const btnRetry = document.getElementById('btn-retry-upload');
            if (btnRetry) {
                btnRetry.onclick = () => btnBgReset.click();
            }
        }
    }

    // Download button
    if (btnBgDownload) {
        btnBgDownload.addEventListener('click', () => {
            if (processedImageBlob) {
                const url = URL.createObjectURL(processedImageBlob);
                chrome.downloads.download({
                    url: url,
                    filename: `bg-removed-${Date.now()}.png`,
                    saveAs: true
                });
            }
        });
    }

    // Reset button
    if (btnBgReset) {
        btnBgReset.addEventListener('click', () => {
            uploadArea.style.display = 'block';
            previewArea.style.display = 'none';
            bgFileInput.value = '';
            originalImg.src = '';
            resultImg.src = '';
            processedImageBlob = null;
            processingSpinner.style.display = 'none';
            processingSpinner.innerHTML = `
                <div class="spinner-circle"></div>
                <p>Removing background...</p>
            `;
        });
    }

}); // End DOMContentLoaded

