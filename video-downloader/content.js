// Video detection logic
function findVideos() {
    const videoUrls = [];

    // 1. Standard Video Elements & Data Attributes
    const videos = Array.from(document.querySelectorAll('video, [data-video-url]'));
    videos.forEach(v => {
        let src = v.src || v.getAttribute('data-video-url');
        if (!src && v.querySelector('source')) {
            src = v.querySelector('source').src;
        }
        if (src && src.startsWith('http') && !src.includes('blob:')) {
            videoUrls.push(src);
        }
    });

    // 2. Scan ALL Script Tags (Deep Search)
    const allScripts = document.querySelectorAll('script');
    allScripts.forEach(script => {
        const content = script.textContent;
        if (!content) return;

        // Brute force MP4 search in scripts
        const mp4Regex = /https?:\/\/[^"'\s]+\.(mp4|m3u8|mov|avi)(?:\?[^"'\s]+)?/g;
        const matches = content.match(mp4Regex);
        if (matches) {
            matches.forEach(m => {
                // Unescape unicode (common in Pinterest metadata)
                const clearUrl = m.replace(/\\u002F/g, '/');
                videoUrls.push(clearUrl);
            });
        }

        // Specifically look for Pinterest video key-value pairs
        const pinKeyRegex = /"(url|contentUrl|v720P|v1)":\s*"(https?:\/\/[^"]+)"/g;
        let pinMatch;
        while ((pinMatch = pinKeyRegex.exec(content)) !== null) {
            const clearUrl = pinMatch[2].replace(/\\u002F/g, '/');
            videoUrls.push(clearUrl);
        }

        // Specifically look for Dailymotion metadata patterns
        if (window.location.hostname.includes('dailymotion.com')) {
            const dmRegex = /"qualities":\s*({[^}]+})/g;
            const dmMatch = dmRegex.exec(content);
            if (dmMatch) {
                try {
                    const qualities = JSON.parse(dmMatch[1]);
                    Object.values(qualities).forEach(q => {
                        if (Array.isArray(q) && q.length > 0 && q[0].url) {
                            videoUrls.push(q[0].url);
                        }
                    });
                } catch (e) { }
            }
        }
    });

    // 3. Document-wide Brute Force (Last Resort)
    const docHtml = document.documentElement.innerHTML;
    const broadRegex = /https?:\/\/v1\.pinimg\.com\/videos\/[^"'\s]+(?:\.mp4|\.m3u8)/g;
    const broadMatches = docHtml.match(broadRegex);
    if (broadMatches) videoUrls.push(...broadMatches);

    // Clean up, filter, and prioritize MP4 over HLS
    const unique = [...new Set(videoUrls)].filter(url => {
        return typeof url === 'string' &&
            url.startsWith('http') &&
            !url.includes('blob:') &&
            (url.includes('.mp4') || url.includes('video') || url.includes('/v1/'));
    });

    // Sort to put .mp4 files first (better for downloads)
    return unique.sort((a, b) => {
        if (a.includes('.mp4') && !b.includes('.mp4')) return -1;
        if (!a.includes('.mp4') && b.includes('.mp4')) return 1;
        return 0;
    });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getVideos") {
        sendResponse({ videos: findVideos() });
    }
});

// Floating Button Logic
function injectDownloadButtons() {
    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        if (video.dataset.downloaderAttached) return;
        video.dataset.downloaderAttached = 'true';

        // Create button container
        const btn = document.createElement('div');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" stroke-width="2"/>
                <path d="M12 8V16M12 16L15 13M12 16L9 13" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        // Style the button
        Object.assign(btn.style, {
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '36px',
            height: '36px',
            backgroundColor: 'rgba(255, 51, 102, 0.9)',
            borderRadius: '50%',
            cursor: 'pointer',
            zIndex: '2147483647',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transition: 'transform 0.2s, opacity 0.2s',
            pointerEvents: 'auto'
        });

        btn.className = 'v-download-btn';
        btn.title = 'Download Video';

        // Ensure parent is relative for absolute positioning
        const parent = video.parentElement;
        if (parent) {
            const computed = window.getComputedStyle(parent);
            if (computed.position === 'static') {
                parent.style.position = 'relative';
            }
            parent.appendChild(btn);
        }

        btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.1)');
        btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // 1. Try direct source
            let src = video.src;
            if (!src && video.querySelector('source')) {
                src = video.querySelector('source').src;
            }

            // 2. If src is missing or a blob, try finding alternative URLs from metadata
            if (!src || src.startsWith('blob:')) {
                const detectedVideos = findVideos();
                if (detectedVideos.length > 0) {
                    // Use the first detected video URL as the most likely match
                    src = detectedVideos[0];
                }
            }

            if (src && src.startsWith('http') && !src.startsWith('blob:')) {
                chrome.runtime.sendMessage({
                    action: "downloadVideo",
                    url: src,
                    filename: "video_download_" + Date.now() + ".mp4"
                });
            } else {
                alert("Could not extract a direct video link. The video might be protected or using a specialized streaming format.");
            }
        });
    });
}

// Observe DOM changes to detect dynamically loaded videos
const observer = new MutationObserver(() => {
    injectDownloadButtons();
});

observer.observe(document.body, { childList: true, subtree: true });
// Initial injection
injectDownloadButtons();
