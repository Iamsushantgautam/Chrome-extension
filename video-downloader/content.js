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
            // Find all qualitites in script tags - more robust regex
            const dmRegex = /"qualities":\s*({.+?})\s*,"/g;
            let dmMatch;
            while ((dmMatch = dmRegex.exec(content)) !== null) {
                try {
                    // Try to extract the JSON object more carefully
                    let jsonStr = dmMatch[1];
                    // Basic check to ensure balanced braces
                    let openBraces = 0;
                    let closingIndex = -1;
                    for (let i = 0; i < jsonStr.length; i++) {
                        if (jsonStr[i] === '{') openBraces++;
                        if (jsonStr[i] === '}') {
                            openBraces--;
                            if (openBraces === 0) {
                                closingIndex = i;
                                break;
                            }
                        }
                    }
                    if (closingIndex !== -1) {
                        jsonStr = jsonStr.substring(0, closingIndex + 1);
                    }

                    const qualities = JSON.parse(jsonStr);
                    Object.values(qualities).forEach(q => {
                        if (Array.isArray(q)) {
                            q.forEach(source => {
                                if (source.url && (source.url.startsWith('http') || source.url.startsWith('//'))) {
                                    const fullUrl = source.url.startsWith('//') ? 'https:' + source.url : source.url;
                                    videoUrls.push(fullUrl);
                                }
                            });
                        }
                    });
                } catch (e) { }
            }

            // Broad search for Dailymotion CDN URLs specifically
            const dmCdnRegex = /https?:\/\/[^"'\s]*?dmcdn\.net\/[^"'\s]*?\.(mp4|m3u8)(?:\?[^"'\s]*)?/g;
            const dmCdnMatches = content.match(dmCdnRegex);
            if (dmCdnMatches) {
                dmCdnMatches.forEach(m => videoUrls.push(m));
            }
        }
    });

    // 3. Document-wide Brute Force (Last Resort)
    const docHtml = document.documentElement.innerHTML;
    const broadRegex = /https?:\/\/v1\.pinimg\.com\/videos\/[^"'\s]+(?:\.mp4|\.m3u8)/g;
    const broadMatches = docHtml.match(broadRegex);
    if (broadMatches) videoUrls.push(...broadMatches);

    // Clean up, filter, and prioritize MP4 over HLS
    let unique = [...new Set(videoUrls)].filter(url => {
        return typeof url === 'string' &&
            url.startsWith('http') &&
            !url.includes('blob:') &&
            !url.toLowerCase().includes('.m3u8') &&
            !url.toLowerCase().includes('.html') &&
            !url.toLowerCase().includes('.htm') &&
            (url.includes('.mp4') || url.includes('video') || url.includes('/v1/'));
    });

    // If any .mp4 videos are found, ONLY return those
    const mp4Videos = unique.filter(url => url.toLowerCase().includes('.mp4'));
    if (mp4Videos.length > 0) {
        unique = mp4Videos;
    }

    // Sort to put .mp4 files first (if we have multiple mp4s)
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
    const detectedVideos = findVideos();
    // Only show if we actually found a downloadable MP4/Video file
    const hasDownloadableVideo = detectedVideos.some(url =>
        url.toLowerCase().includes('.mp4') ||
        url.includes('pinimg.com/videos') ||
        url.includes('dmcdn.net')
    );

    if (!hasDownloadableVideo) return;

    const videos = document.querySelectorAll('video');
    videos.forEach(video => {
        if (video.dataset.downloaderAttached) return;
        video.dataset.downloaderAttached = 'true';

        // Create button container
        const btn = document.createElement('div');
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 18px; height: 18px;">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="white" stroke-width="2.5"/>
                <path d="M12 8V16M12 16L15 13M12 16L9 13" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        // Style the button - Small Circular Icon
        Object.assign(btn.style, {
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            background: 'linear-gradient(135deg, #ff3366, #ff0044)',
            borderRadius: '50%',
            cursor: 'pointer',
            zIndex: '2147483647',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(255, 51, 102, 0.4)',
            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            pointerEvents: 'auto',
            border: '1.5px solid rgba(255, 255, 255, 0.3)',
            backdropFilter: 'blur(8px)',
            userSelect: 'none'
        });

        btn.className = 'v-download-btn';
        btn.title = 'Download MP4';

        // Ensure parent is relative for absolute positioning
        const parent = video.parentElement;
        if (parent) {
            const computed = window.getComputedStyle(parent);
            if (computed.position === 'static') {
                parent.style.position = 'relative';
            }
            parent.appendChild(btn);
        }

        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'scale(1.15)';
            btn.style.boxShadow = '0 6px 15px rgba(255, 51, 102, 0.6)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = 'scale(1)';
            btn.style.boxShadow = '0 4px 12px rgba(255, 51, 102, 0.4)';
        });

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const currentVideos = findVideos();
            if (currentVideos.length > 0) {
                chrome.runtime.sendMessage({
                    action: "downloadVideo",
                    url: currentVideos[0],
                    filename: "video_download_" + Date.now() + ".mp4"
                });
            } else {
                alert("Could not extract a direct video link.");
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
