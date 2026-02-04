document.addEventListener('DOMContentLoaded', async () => {
    const videoList = document.getElementById('video-list');
    const statusContainer = document.getElementById('status-container');

    const videoUrlInput = document.getElementById('video-url');
    const previewBtn = document.getElementById('preview-btn');
    const urlPreview = document.getElementById('url-preview');

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

    previewBtn.addEventListener('click', async () => {
        let url = videoUrlInput.value.trim();
        if (!url) return;

        if (!url.startsWith('http')) {
            alert("Please enter a valid URL starting with http/https");
            return;
        }

        // If it's a Pinterest link (Standard or Shortened pin.it)
        if ((url.includes('pinterest.com/pin/') || url.includes('pin.it/')) && !url.includes('.mp4')) {
            previewBtn.innerText = "Resolving...";
            previewBtn.disabled = true;
            try {
                const response = await fetch(url);
                const html = await response.text();

                // 1. Try to find direct MP4 link in HTML
                const mp4Match = html.match(/https?:\/\/[^"']+\.mp4/);
                if (mp4Match) {
                    url = mp4Match[0];
                } else {
                    // 2. Try LD+JSON (Structured Data)
                    const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
                    if (ldMatch) {
                        try {
                            const ldData = JSON.parse(ldMatch[1]);
                            const findUrl = (obj) => {
                                if (obj.contentUrl) return obj.contentUrl;
                                if (obj.video && obj.video.contentUrl) return obj.video.contentUrl;
                                if (Array.isArray(obj)) {
                                    for (let item of obj) {
                                        let res = findUrl(item);
                                        if (res) return res;
                                    }
                                }
                                return null;
                            };
                            const found = findUrl(ldData);
                            if (found) url = found;
                        } catch (e) { }
                    }
                }

                if (!url.includes('.mp4')) {
                    const pwsMatch = html.match(/"url":\s*"(https?:\/\/[^"]+v1[^"]+\.mp4)"/);
                    if (pwsMatch) url = pwsMatch[1];
                }

            } catch (e) {
                console.error("Extraction failed", e);
            } finally {
                previewBtn.innerText = "Preview";
                previewBtn.disabled = false;
            }
        }

        if ((url.includes('pinterest.com/pin/') || url.includes('pin.it/')) && !url.includes('.mp4')) {
            alert("Could not extract video link. Try opening the Pin in your browser first.");
            return;
        }

        const fileSize = await getFileSize(url);

        urlPreview.innerHTML = `
            <div class="video-item">
                <div class="video-thumb">
                    <video id="preview-video-player" src="${url}" muted autoplay loop></video>
                </div>
                <div class="video-info">
                    <div class="video-name">Extracted Video</div>
                    <div class="video-meta">Quality: MP4 | Size: ${fileSize}</div>
                </div>
                <button class="download-btn" id="manual-download-btn">Download Video</button>
            </div>
        `;
        urlPreview.classList.remove('hidden');

        const videoPlayer = document.getElementById('preview-video-player');
        videoPlayer.onerror = () => {
            urlPreview.innerHTML = '<div class="empty-state"><p>Could not preview this URL.</p><span class="subtext">The link might be a webpage, not a direct video.</span></div>';
        };

        document.getElementById('manual-download-btn').addEventListener('click', () => {
            chrome.downloads.download({
                url: url,
                filename: "video_download_" + Date.now() + ".mp4",
                saveAs: true
            });
        });
    });

    async function renderVideos(videos) {
        statusContainer.classList.add('hidden');
        statusContainer.style.display = 'none';
        videoList.innerHTML = '';

        // Pre-fetch all sizes to filter
        const videoData = await Promise.all(videos.map(async (url) => {
            const sizeStr = await getFileSize(url);
            // Extract numeric value for filtering (handle MB, KB, etc.)
            let bytes = 0;
            if (sizeStr.includes('MB')) bytes = parseFloat(sizeStr) * 1024 * 1024;
            else if (sizeStr.includes('KB')) bytes = parseFloat(sizeStr) * 1024;
            else if (sizeStr.includes('GB')) bytes = parseFloat(sizeStr) * 1024 * 1024 * 1024;
            else if (sizeStr.includes('B')) bytes = parseFloat(sizeStr);

            return { url, sizeStr, bytes };
        }));

        // Filter out "dual" videos (any video smaller than 50KB is likely a thumbnail/preview)
        // Also remove duplicates if they have the same size
        const filteredVideos = videoData.filter(v => v.bytes > 50000); // 50KB threshold

        if (filteredVideos.length === 0 && videos.length > 0) {
            // If everything was filtered out, just show the largest one
            const largest = videoData.reduce((prev, current) => (prev.bytes > current.bytes) ? prev : current);
            renderItem(largest, 0);
        } else {
            filteredVideos.forEach((data, index) => {
                renderItem(data, index);
            });
        }

        function renderItem(data, index) {
            const item = document.createElement('div');
            item.className = 'video-item';
            const fileName = `video_${index + 1}.mp4`;

            item.innerHTML = `
                <div class="video-thumb">
                  <video src="${data.url}" muted></video>
                </div>
                <div class="video-info">
                  <div class="video-name">${fileName}</div>
                  <div class="video-meta">MP4 Video | Size: ${data.sizeStr}</div>
                </div>
                <button class="download-btn" data-url="${data.url}">Download</button>
            `;

            videoList.appendChild(item);

            item.querySelector('.download-btn').addEventListener('click', (e) => {
                const videoUrl = e.target.getAttribute('data-url');
                chrome.downloads.download({
                    url: videoUrl,
                    filename: fileName,
                    saveAs: true
                });
            });
        }
    }

    function showEmptyState(message) {
        statusContainer.innerHTML = `
      <div class="empty-state">
        <p>${message}</p>
        <span class="subtext">Make sure the video is playing or visible.</span>
      </div>
    `;
        statusContainer.style.display = 'flex';
    }

    // Auto-detect videos on popup open
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, { action: "getVideos" }, (response) => {
            if (chrome.runtime.lastError) {
                statusContainer.querySelector('.subtext').innerText = "Navigate to a website to auto-detect videos.";
                return;
            }
            if (response && response.videos && response.videos.length > 0) {
                renderVideos(response.videos);
            } else {
                showEmptyState("No videos detected on this page.");
            }
        });
    } catch (err) {
        console.error(err);
    }
});
