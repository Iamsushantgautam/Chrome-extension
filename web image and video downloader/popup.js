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

    // Manual Input Elements
    const manualInputSection = document.getElementById('manual-video-input-section');
    const manualUrlInput = document.getElementById('manual-video-url');
    const btnManualPreview = document.getElementById('btn-manual-preview');

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
                // Show BG Remover, hide media grid and manual input
                if (mediaContainer) mediaContainer.style.display = 'none';
                if (bgRemoverSection) bgRemoverSection.style.display = 'flex';
                if (subHeader) subHeader.style.display = 'none';
                if (bottomBar) bottomBar.style.display = 'none';
                if (manualInputSection) manualInputSection.style.display = 'none';
            } else {
                if (activeTab === 'videos') {
                    if (manualInputSection) manualInputSection.style.display = 'flex';
                } else {
                    if (manualInputSection) manualInputSection.style.display = 'none';
                }

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


        // Check if Chrome API is available
        if (!chrome.tabs) {
            console.error("Chrome tabs API not available");

            return;
        }

        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            console.error("No active tab found");

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
                // Don't show error immediately, just log it. Manual input might still work.

            }
        } catch (err) {
            console.error("Error getting media:", err);

        }
    })();

    // Helper: Get File Size
    async function getFileSize(url) {
        try {
            const response = await fetch(url, { method: 'HEAD' });
            const size = response.headers.get('content-length');
            if (!size) return 'Unknown size';

            const bytes = parseInt(size, 10);
            if (bytes < 1024) return bytes + ' B';
            if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
            if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
            return (bytes / 1073741824).toFixed(1) + ' GB';
        } catch (e) {
            return 'Size N/A';
        }
    }

    // Manual Video Preview Logic
    if (btnManualPreview) {
        btnManualPreview.addEventListener('click', async () => {
            let url = manualUrlInput.value.trim();
            if (!url) return;

            if (!url.startsWith('http')) {
                alert("Please enter a valid URL starting with http/https");
                return;
            }

            btnManualPreview.textContent = "Scanning...";
            btnManualPreview.disabled = true;

            try {
                // If URL ends with .mp4, .jpg, .png, etc - it's a direct media file
                const directMediaMatch = url.match(/\.(mp4|webm|ogg|mov|jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i);

                if (directMediaMatch) {
                    // Direct media file URL
                    const ext = directMediaMatch[1].toLowerCase();
                    const isVideo = ['mp4', 'webm', 'ogg', 'mov'].includes(ext);
                    const sizeStr = await getFileSize(url);

                    const newItem = {
                        id: Date.now(),
                        src: url,
                        type: isVideo ? 'video' : 'image',
                        width: 0,
                        height: 0,
                        manual: true,
                        quality: isVideo ? 'Direct Link' : undefined,
                        sizeStr: sizeStr
                    };

                    allMedia.unshift(newItem);
                    manualUrlInput.value = '';
                    applyFilters();

                } else if (url.includes('dailymotion.com/video/') || url.includes('dai.ly/')) {
                    // Dailymotion specific handling
                    const videoIdMatch = url.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/);
                    if (videoIdMatch) {
                        const videoId = videoIdMatch[1];
                        const metaResponse = await fetch(`https://www.dailymotion.com/player/metadata/video/${videoId}`);
                        const metaData = await metaResponse.json();
                        console.log('Dailymotion metadata:', metaData);

                        if (metaData.qualities) {
                            const q = metaData.qualities;
                            console.log('Full qualities object:', JSON.stringify(q, null, 2));
                            const order = ['1080', '720', '480', '380', 'auto'];
                            let foundUrl = null;
                            let detectedQuality = 'Auto';

                            for (const label of order) {
                                if (q[label] && q[label].length > 0) {
                                    console.log(`Quality ${label}:`, q[label]);

                                    // Try different URL structures
                                    let urlToUse = null;

                                    // Check if it's an array of objects with url property
                                    if (typeof q[label][0] === 'object' && q[label][0] !== null && q[label][0].url) {
                                        // Look for non-m3u8 URL
                                        const mp4Item = q[label].find(item => {
                                            const itemUrl = item.url;
                                            return itemUrl && !itemUrl.includes('.m3u8');
                                        });
                                        if (mp4Item) urlToUse = mp4Item.url;
                                    } else if (typeof q[label][0] === 'string') {
                                        // Direct string URLs
                                        const mp4Str = q[label].find(u => !u.includes('.m3u8'));
                                        if (mp4Str) urlToUse = mp4Str;
                                    }

                                    if (urlToUse) {
                                        foundUrl = urlToUse;
                                        detectedQuality = label === 'auto' ? 'High' : label + 'p';
                                        console.log('✅ Selected URL:', foundUrl);
                                        break;
                                    }
                                }
                            }

                            // If no MP4 found, try to get m3u8 as fallback
                            if (!foundUrl) {
                                for (const label of order) {
                                    if (q[label] && q[label].length > 0) {
                                        const anyItem = q[label][0];
                                        if (typeof anyItem === 'object' && anyItem !== null && anyItem.url) {
                                            foundUrl = anyItem.url;
                                            detectedQuality = (label === 'auto' ? 'Stream' : label + 'p (m3u8)');
                                            break;
                                        } else if (typeof anyItem === 'string') {
                                            foundUrl = anyItem;
                                            detectedQuality = (label === 'auto' ? 'Stream' : label + 'p (m3u8)');
                                            break;
                                        }
                                    }
                                }
                            }

                            if (foundUrl) {
                                const isM3u8 = foundUrl.includes('.m3u8') || foundUrl.includes('mpegURL');
                                const newItem = {
                                    id: Date.now(),
                                    src: foundUrl,
                                    type: 'video',
                                    width: 0,
                                    height: 0,
                                    manual: true,
                                    quality: detectedQuality,
                                    sizeStr: isM3u8 ? 'Stream' : await getFileSize(foundUrl)
                                };
                                allMedia.unshift(newItem);
                                manualUrlInput.value = '';
                                applyFilters();
                            }
                        }
                    }

                } else if (url.includes('pinterest.com/pin/') || url.includes('pin.it/')) {
                    // Pinterest specific handling
                    const response = await fetch(url);
                    const html = await response.text();

                    const v720Match = html.match(/https?:\/\/[^"']+v720P[^"']+\.mp4/);
                    let foundUrl = null;
                    let detectedQuality = 'Standard';

                    if (v720Match) {
                        foundUrl = v720Match[0];
                        detectedQuality = '720p HD';
                    } else {
                        const mp4Match = html.match(/https?:\/\/[^"']+\.mp4/);
                        if (mp4Match) {
                            foundUrl = mp4Match[0];
                        }
                    }

                    if (foundUrl) {
                        const sizeStr = await getFileSize(foundUrl);
                        const newItem = {
                            id: Date.now(),
                            src: foundUrl,
                            type: 'video',
                            width: 0,
                            height: 0,
                            manual: true,
                            quality: detectedQuality,
                            sizeStr: sizeStr
                        };
                        allMedia.unshift(newItem);
                        manualUrlInput.value = '';
                        applyFilters();
                    }

                } else {
                    // Generic website - fetch and parse all media
                    btnManualPreview.textContent = "Fetching page...";
                    const response = await fetch(url);
                    const html = await response.text();

                    btnManualPreview.textContent = "Parsing media...";

                    // Parse HTML to find images and videos
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');

                    const foundMedia = [];
                    const seenUrls = new Set();

                    // Get base URL for resolving relative paths
                    const baseUrl = new URL(url);

                    // Find all images
                    doc.querySelectorAll('img').forEach(img => {
                        // Use getAttribute to get raw URL instead of .src which resolves relative to extension
                        let src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('data-lazy');
                        if (src && !src.startsWith('data:') && !src.startsWith('blob:') && !src.startsWith('chrome-extension://')) {
                            try {
                                // Resolve relative URLs
                                const absoluteUrl = new URL(src, baseUrl).href;
                                if (!seenUrls.has(absoluteUrl)) {
                                    seenUrls.add(absoluteUrl);
                                    foundMedia.push({
                                        src: absoluteUrl,
                                        type: 'image',
                                        width: img.width || 0,
                                        height: img.height || 0,
                                        manual: true
                                    });
                                }
                            } catch (e) {
                                console.warn('Invalid image URL:', src);
                            }
                        }
                    });

                    // Find all videos
                    doc.querySelectorAll('video').forEach(video => {
                        // Use getAttribute to get raw URL
                        let src = video.getAttribute('src');
                        if (!src) {
                            const source = video.querySelector('source');
                            if (source) src = source.getAttribute('src');
                        }

                        if (src && !src.startsWith('blob:') && !src.startsWith('data:') && !src.startsWith('chrome-extension://')) {
                            try {
                                const absoluteUrl = new URL(src, baseUrl).href;
                                if (!seenUrls.has(absoluteUrl)) {
                                    seenUrls.add(absoluteUrl);
                                    foundMedia.push({
                                        src: absoluteUrl,
                                        type: 'video',
                                        width: 0,
                                        height: 0,
                                        manual: true,
                                        quality: 'Detected'
                                    });
                                }
                            } catch (e) {
                                console.warn('Invalid video URL:', src);
                            }
                        }
                    });

                    // Find video URLs in HTML text (for embedded players)
                    const mp4Matches = html.matchAll(/https?:\/\/[^"'\s]+\.mp4[^"'\s]*/gi);
                    for (const match of mp4Matches) {
                        const videoUrl = match[0];
                        if (!seenUrls.has(videoUrl)) {
                            seenUrls.add(videoUrl);
                            foundMedia.push({
                                src: videoUrl,
                                type: 'video',
                                width: 0,
                                height: 0,
                                manual: true,
                                quality: 'Found in HTML'
                            });
                        }
                    }

                    if (foundMedia.length > 0) {
                        // Add all found media with unique IDs
                        foundMedia.forEach((item, idx) => {
                            item.id = Date.now() + idx;
                            allMedia.unshift(item);
                        });

                        manualUrlInput.value = '';

                        // Update counts
                        const imageCount = foundMedia.filter(m => m.type === 'image').length;
                        const videoCount = foundMedia.filter(m => m.type === 'video').length;

                        if (countEl) countEl.textContent = allMedia.length;
                        if (imageCountEl) imageCountEl.textContent = allMedia.filter(m => m.type === 'image').length;
                        if (videoCountEl) videoCountEl.textContent = allMedia.filter(m => m.type === 'video').length;

                        applyFilters();

                        alert(`Found ${foundMedia.length} items (${imageCount} images, ${videoCount} videos)`);
                    } else {
                        alert("No images or videos found on this page.");
                    }
                }

            } catch (e) {
                console.error("Manual fetch failed", e);
                alert("Failed to fetch media: " + e.message + "\n\nNote: Some websites block external access (CORS). Try visiting the page directly and using the extension.");
            } finally {
                btnManualPreview.textContent = "Preview";
                btnManualPreview.disabled = false;
            }
        });
    }

    function loadMedia(data) {
        console.log("Media Downloader Popup: Received data", data);

        if (!data) {
            console.warn("No data received from content script");
            return;
        }

        // Filter out blob: URLs and invalid sources
        const seenUrls = new Set();

        const validImages = (data.images || []).filter(img => {
            if (!img.src || img.src.startsWith('blob:') || img.src.startsWith('data:')) return false;
            // Deduplicate
            if (seenUrls.has(img.src)) return false;
            seenUrls.add(img.src);
            return true;
        });

        const validVideos = (data.videos || []).filter(vid => {
            if (!vid.src || vid.src.startsWith('blob:') || vid.src.startsWith('data:')) return false;
            if (seenUrls.has(vid.src)) return false;
            seenUrls.add(vid.src);
            return true;
        });

        // Merge images and videos with an index
        allMedia = [
            ...validImages.map(x => ({ ...x, originalIndex: -1 })),
            ...validVideos.map(x => ({ ...x, originalIndex: -1 }))
        ];

        console.log("Total media items:", allMedia.length);

        // Assign unique IDs for selection tracking
        allMedia.forEach((item, i) => item.id = i);

        // Update counts
        const imageCount = validImages.length;
        const videoCount = validVideos.length;

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

            // 1. Size Filter (Skip for manual items)
            if (!item.manual && sizeVal !== 'all') {
                const maxDim = Math.max(item.width, item.height);
                if (sizeVal === 'small' && maxDim >= 500) return false;
                if (sizeVal === 'medium' && (maxDim < 500 || maxDim > 1000)) return false;
                if (sizeVal === 'large' && maxDim <= 1000) return false;
            }

            // 2. Type Filter
            if (typeVal !== 'all') {
                const ext = getExtension(item.src);
                if (typeVal === 'video') {
                    if (item.type !== 'video') return false;
                } else {
                    if (item.type === 'video') return false;
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
        try {
            if (!container) {
                console.error("Render error: Container not found");

                return;
            }

            // Force display style to ensure it's not hidden
            container.style.display = 'grid';
            container.innerHTML = "";

            if (filteredMedia.length === 0) {
                container.innerHTML = `<div class="empty-state">No media matches your filters</div>`;

                return;
            }

            // addDebug(`Rendering ${filteredMedia.length} items...`, 'info');

            let successCount = 0;

            filteredMedia.forEach((item, index) => {
                try {
                    const isSelected = selectedIndices.has(item.id);
                    const card = document.createElement("div");
                    card.className = `media-card ${isSelected ? 'selected' : ''}`;
                    // Force card styles to ensure visibility
                    card.style.display = 'flex';
                    card.style.flexDirection = 'column';
                    card.style.position = 'relative';
                    card.style.minHeight = '150px';
                    card.style.background = '#fff';
                    card.style.border = '1px solid #ddd';

                    // Open lightbox on MAIN card click
                    card.onclick = () => openLightbox(item.id);

                    // Create checkbox
                    const checkbox = document.createElement("div");
                    checkbox.className = "checkbox-overlay";
                    checkbox.onclick = (e) => toggleSelection(e, item.id);

                    // Create image wrapper
                    const imageWrap = document.createElement("div");
                    imageWrap.className = "card-image-wrap";
                    imageWrap.style.height = '140px'; // Explicit height
                    imageWrap.style.position = 'relative';

                    // Create actual media element
                    let mediaEl;
                    if (item.type === 'image') {
                        mediaEl = document.createElement("img");
                        mediaEl.crossOrigin = "anonymous";
                        mediaEl.src = item.src || "";
                        mediaEl.alt = `Image ${index + 1}`;

                        // Critical styles
                        mediaEl.style.maxWidth = "100%";
                        mediaEl.style.maxHeight = "100%";
                        mediaEl.style.display = "block";
                        mediaEl.style.margin = "auto";

                        mediaEl.onerror = () => {
                            if (mediaEl.crossOrigin) {
                                mediaEl.crossOrigin = null;
                                mediaEl.src = item.src;
                            } else {
                                // Don't hide the card, just show failure
                                imageWrap.innerHTML = `<div style="padding:10px;font-size:10px;text-align:center;color:red;">Img Fail</div>`;
                            }
                        };
                    } else {
                        mediaEl = document.createElement("video");
                        mediaEl.src = item.src || "";
                        mediaEl.muted = true;
                        mediaEl.style.maxWidth = "100%";
                        mediaEl.style.maxHeight = "100%";
                    }

                    // Create badges
                    const badgesDiv = document.createElement("div");
                    badgesDiv.className = "card-badges";

                    const ext = getExtension(item.src).toUpperCase() || (item.type || "").toUpperCase();
                    const extBadge = document.createElement("span");
                    extBadge.className = "badge";
                    extBadge.textContent = ext;

                    const dimBadge = document.createElement("span");
                    dimBadge.className = "badge";
                    if (item.manual) {
                        dimBadge.textContent = item.quality || 'Auto';
                    } else {
                        dimBadge.textContent = `${item.width || '?'}x${item.height || '?'}`;
                    }

                    badgesDiv.appendChild(extBadge);
                    badgesDiv.appendChild(dimBadge);

                    // Create card info
                    const cardInfo = document.createElement("div");
                    cardInfo.className = "card-info";

                    const urlDiv = document.createElement("div");
                    urlDiv.className = "card-url";
                    urlDiv.title = item.src || "";
                    urlDiv.textContent = item.src ? item.src.substring(0, 50) : "No URL";

                    cardInfo.appendChild(urlDiv);

                    // Create download button
                    const downloadBtn = document.createElement("div");
                    downloadBtn.className = "btn-download-item";
                    downloadBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    `;
                    downloadBtn.title = "Download this item";
                    downloadBtn.onclick = (e) => {
                        e.stopPropagation(); // Prevent light box or selection
                        chrome.downloads.download({
                            url: item.src,
                            saveAs: false // Auto download
                        });
                    };

                    // Assemble card
                    imageWrap.appendChild(mediaEl);
                    imageWrap.appendChild(badgesDiv);
                    imageWrap.appendChild(downloadBtn); // Add download button to image wrap

                    card.appendChild(checkbox);
                    card.appendChild(imageWrap);
                    card.appendChild(cardInfo);

                    container.appendChild(card);
                    successCount++;
                } catch (itemErr) {
                    console.error("Error rendering item", index, itemErr);

                }
            });

            // addDebug(`Rendered ${successCount}/${filteredMedia.length} to DOM`, 'info');

            // Verify DOM
            if (container.children.length === 0) {

            } else {
                // Check visibility of first item
                // addDebug(`DOM Valid. First item: ${container.children[0].tagName}`, 'success');
            }

        } catch (e) {
            console.error("Render crash:", e);

            if (container) container.innerHTML = `<div class="empty-state" style="color:red">Render Error: ${e.message}</div>`;
        }
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
            const folderName = currentWebsiteName || 'downloads';
            console.log(`Downloading to folder: ${folderName}`);

            for (let i = 0; i < itemsToDownload.length; i++) {
                const item = itemsToDownload[i];

                try {
                    let ext = getExtension(item.src) || (item.type === 'video' ? 'mp4' : 'jpg');

                    const safeFolderName = folderName.replace(/[<>:"|?*]/g, '_');
                    const filename = `${safeFolderName}/media_${String(i + 1).padStart(3, '0')}_${Date.now()}.${ext}`;

                    console.log(`Downloading: ${filename}`);

                    await chrome.downloads.download({
                        url: item.src,
                        filename: filename,
                        conflictAction: 'uniquify',
                        saveAs: false
                    });

                    successCount++;
                    if (btnDownload) {
                        btnDownload.textContent = `Downloading ${successCount}/${itemsToDownload.length}...`;
                    }
                } catch (e) {
                    console.error("Failed to download", item.src, e);
                    failCount++;
                }
            }

            if (btnDownload) {
                if (failCount === 0) {
                    btnDownload.textContent = `✅ Downloaded ${successCount} files`;
                } else {
                    btnDownload.textContent = `⚠️ Downloaded ${successCount}, Failed ${failCount}`;
                }
            }

        } catch (err) {
            console.error("Download error:", err);
            if (btnDownload) btnDownload.textContent = "❌ Download failed";
        } finally {
            setTimeout(() => {
                updateStats();
            }, 3000);
        }
    }

    // Helpers
    function getExtension(url) {
        if (!url) return "";
        try {
            const clean = url.split('?')[0].split('#')[0];
            const parts = clean.split('.');
            if (parts.length > 1) {
                const ext = parts.pop().toLowerCase();
                // Ensure extension is reasonable length (e.g., jpg, jpeg, png, mp4)
                // If it's too long (like a com/UUID), treat as unknown
                if (ext.length <= 5 && /^[a-z0-9]+$/i.test(ext)) {
                    return ext;
                }
            }
        } catch (e) { return ""; }
        return "";
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

    if (btnUpload) {
        btnUpload.addEventListener('click', () => {
            bgFileInput.click();
        });
    }

    if (uploadArea) {
        uploadArea.addEventListener('click', () => {
            bgFileInput.click();
        });
    }

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

    if (bgFileInput) {
        bgFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleImageUpload(file);
            }
        });
    }

    function handleImageUpload(file) {
        uploadArea.style.display = 'none';
        previewArea.style.display = 'flex';

        const reader = new FileReader();
        reader.onload = (e) => {
            originalImg.src = e.target.result;
        };
        reader.readAsDataURL(file);

        removeBackground(file);
    }

    async function removeBackground(file) {
        try {
            processingSpinner.style.display = 'flex';
            resultImg.style.display = 'none';
            btnBgDownload.disabled = true;

            const formData = new FormData();
            formData.append('image_file', file);
            formData.append('size', 'auto');
            const apiKey = 'jVvZvSY4V3FkyxKsgymNPtxf';

            const response = await fetch('https://api.remove.bg/v1.0/removebg', {
                method: 'POST',
                headers: { 'X-Api-Key': apiKey },
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

            const btnRetry = document.getElementById('btn-retry-upload');
            if (btnRetry) {
                btnRetry.onclick = () => btnBgReset.click();
            }
        }
    }

    if (btnBgDownload) {
        btnBgDownload.addEventListener('click', () => {
            if (processedImageBlob) {
                const url = URL.createObjectURL(processedImageBlob);
                chrome.downloads.download({
                    url: url,
                    filename: 'background_removed.png',
                    saveAs: true
                });
            }
        });
    }

    if (btnBgReset) {
        btnBgReset.addEventListener('click', () => {
            uploadArea.style.display = 'block';
            previewArea.style.display = 'none';
            bgFileInput.value = '';
            processingSpinner.style.display = 'flex';
            resultImg.src = '';
            originalImg.src = '';
            if (processingSpinner.querySelector('svg')) {
                // Reset spinner content if error occurred
                processingSpinner.innerHTML = '<div class="spinner-circle"></div><p>Removing background...</p>';
            }
        });
    }
});
