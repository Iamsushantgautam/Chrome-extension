document.addEventListener('DOMContentLoaded', async () => {
    const videoList = document.getElementById('video-list');
    const statusContainer = document.getElementById('status-container');

    const videoUrlInput = document.getElementById('video-url');
    const previewBtn = document.getElementById('preview-btn');
    const urlPreview = document.getElementById('url-preview');

    const refreshBtn = document.getElementById('refresh-btn');
    const closeBtn = document.getElementById('close-btn');

    refreshBtn.addEventListener('click', () => {
        window.location.reload();
    });

    closeBtn.addEventListener('click', () => {
        window.close();
    });

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

        let detectedQuality = 'Auto';

        // If it's a Dailymotion link
        if (url.includes('dailymotion.com/video/') || url.includes('dai.ly/')) {
            previewBtn.innerText = "Resolving...";
            previewBtn.disabled = true;
            try {
                const videoIdMatch = url.match(/(?:dailymotion\.com\/video\/|dai\.ly\/)([a-zA-Z0-9]+)/);
                if (videoIdMatch) {
                    const videoId = videoIdMatch[1];
                    const metaResponse = await fetch(`https://www.dailymotion.com/player/metadata/video/${videoId}`);
                    const metaData = await metaResponse.json();

                    if (metaData.qualities) {
                        const foundVideos = [];
                        const q = metaData.qualities;
                        const order = ['2160', '1440', '1080', '720', '480', '380', '240', 'auto'];

                        for (const label of order) {
                            if (q[label] && q[label].length > 0) {
                                const qUrl = q[label][0].url;
                                const qLabel = label === 'auto' ? 'High' : label + 'p';
                                foundVideos.push({ url: qUrl, quality: qLabel });
                            }
                        }

                        if (foundVideos.length > 0) {
                            // Clear and render all found qualities
                            statusContainer.classList.add('hidden');
                            statusContainer.style.display = 'none';

                            // If we found multiple, it's better to use the render function logic
                            for (const v of foundVideos) {
                                const fileSize = await getFileSize(v.url);
                                const item = document.createElement('div');
                                item.className = 'video-item manual-added';
                                const fileName = `dailymotion_${v.quality}_${Date.now()}.mp4`;

                                item.innerHTML = `
                                    <div class="video-thumb">
                                        <video src="${v.url}" muted></video>
                                    </div>
                                    <div class="video-info">
                                        <div class="video-name">Dailymotion Video (${v.quality})</div>
                                        <div class="video-meta">Quality: ${v.quality} | Size: ${fileSize}</div>
                                    </div>
                                    <button class="download-btn">Download</button>
                                `;

                                if (videoList.firstChild) {
                                    videoList.insertBefore(item, videoList.firstChild);
                                } else {
                                    videoList.appendChild(item);
                                }

                                item.querySelector('.download-btn').addEventListener('click', () => {
                                    chrome.downloads.download({
                                        url: v.url,
                                        filename: fileName,
                                        saveAs: true
                                    });
                                });
                            }

                            // Clear input and return early since we handled rendering
                            videoUrlInput.value = '';
                            previewBtn.innerText = "Preview";
                            previewBtn.disabled = false;
                            return;
                        }
                    }
                }
            } catch (e) {
                console.error("Dailymotion extraction failed", e);
            } finally {
                previewBtn.innerText = "Preview";
                previewBtn.disabled = false;
            }
        }

        // If it's a Pinterest link (Standard or Shortened pin.it)
        if ((url.includes('pinterest.com/pin/') || url.includes('pin.it/')) && !url.includes('.mp4')) {
            previewBtn.innerText = "Resolving...";
            previewBtn.disabled = true;
            try {
                const response = await fetch(url);
                const html = await response.text();

                // 1. Prioritize v720P specifically in HTML
                const v720Match = html.match(/https?:\/\/[^"']+v720P[^"']+\.mp4/);
                if (v720Match) {
                    url = v720Match[0];
                    detectedQuality = '720p HD';
                } else {
                    const mp4Match = html.match(/https?:\/\/[^"']+\.mp4/);
                    if (mp4Match) {
                        url = mp4Match[0];
                        detectedQuality = url.includes('v720P') ? '720p HD' : 'Standard';
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
                                if (found) {
                                    url = found;
                                    detectedQuality = url.includes('v720P') ? '720p HD' : 'Standard';
                                }
                            } catch (e) { }
                        }
                    }
                }

                if (!url.includes('.mp4')) {
                    const pwsMatch = html.match(/"url":\s*"(https?:\/\/[^"]+v1[^"]+\.mp4)"/);
                    if (pwsMatch) {
                        url = pwsMatch[1];
                        detectedQuality = 'Standard';
                    }
                }

            } catch (e) {
                console.error("Extraction failed", e);
            } finally {
                previewBtn.innerText = "Preview";
                previewBtn.disabled = false;
            }
        }

        if ((url.includes('pinterest.com/pin/') || url.includes('pin.it/') || url.includes('dailymotion.com')) && (!url.includes('.mp4') && !url.includes('.m3u8') && !url.includes('video'))) {
            alert("Could not extract video link. Try opening the page in your browser first.");
            return;
        }

        const fileSize = await getFileSize(url);

        // Hide empty state if showing
        statusContainer.classList.add('hidden');
        statusContainer.style.display = 'none';

        const item = document.createElement('div');
        item.className = 'video-item manual-added';
        const fileName = "manual_download_" + Date.now() + ".mp4";

        item.innerHTML = `
            <div class="video-thumb">
                <video src="${url}" muted autoplay loop></video>
            </div>
            <div class="video-info">
                <div class="video-name">Pasted Video</div>
                <div class="video-meta">Quality: ${detectedQuality} | Size: ${fileSize}</div>
            </div>
            <button class="download-btn">Download</button>
        `;

        // Prepend to the video list
        if (videoList.firstChild) {
            videoList.insertBefore(item, videoList.firstChild);
        } else {
            videoList.appendChild(item);
        }

        item.querySelector('.download-btn').addEventListener('click', () => {
            chrome.downloads.download({
                url: url,
                filename: fileName,
                saveAs: true
            });
        });

        // Clear input
        videoUrlInput.value = '';
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
        // Keep m3u8 files even if they are small because they are playlists
        const filteredVideos = videoData.filter(v =>
            v.bytes > 50000 ||
            v.url.includes('.m3u8') ||
            v.url.includes('dailymotion.com')
        );

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

            const isStream = data.url.includes('.m3u8');

            // Infer quality from URL
            let quality = 'Standard';
            const url = data.url.toLowerCase();

            if (url.includes('2160') || url.includes('4k')) quality = '4K Ultra HD';
            else if (url.includes('1440') || url.includes('2k')) quality = '2K QHD';
            else if (url.includes('1080')) quality = '1080p HD';
            else if (url.includes('720') || url.includes('v720p')) quality = '720p HD';
            else if (url.includes('480')) quality = '480p';
            else if (url.includes('360')) quality = '360p';
            else if (url.includes('240')) quality = '240p';
            else if (isStream) quality = 'Adaptive';

            item.innerHTML = `
                <div class="video-thumb">
                  <video src="${data.url}" muted></video>
                </div>
                <div class="video-info">
                  <div class="video-name">${fileName}</div>
                  <div class="video-meta">Quality: ${quality} | Size: ${data.sizeStr}</div>
                </div>
                <button class="download-btn" data-url="${data.url}">${isStream ? 'Link' : 'Download'}</button>
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
