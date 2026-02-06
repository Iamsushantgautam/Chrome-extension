// Guard against multiple injections
if (window.mediaDownloaderInjected) {
    console.log("Media Downloader: Already injected");
} else {
    window.mediaDownloaderInjected = true;

    // ==========================================
    // ADVANCED VIDEO DETECTION (From Source Extension)
    // ==========================================
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

    // ==========================================
    // Unified Media Scanner (Target + Source)
    // ==========================================
    function getAllMedia() {
        const media = {
            images: [],
            videos: []
        };
        const seenUrls = new Set();

        const addImage = (src, width, height) => {
            if (!src) return;
            // Skip data URIs that are SVG placeholders (usually very small)
            if (src.startsWith('data:image/svg') && src.length < 200) return;

            const absoluteUrl = resolveUrl(src);
            if (seenUrls.has(absoluteUrl)) return;
            seenUrls.add(absoluteUrl);

            media.images.push({
                src: absoluteUrl,
                type: "image",
                width: width || 0,
                height: height || 0
            });
        };

        const addVideo = (src, width, height) => {
            if (!src) return;
            const absoluteUrl = resolveUrl(src);
            if (seenUrls.has(absoluteUrl)) return;
            seenUrls.add(absoluteUrl);

            media.videos.push({
                src: absoluteUrl,
                type: "video",
                width: width || 0,
                height: height || 0
            });
        };

        function resolveUrl(url) {
            try {
                if (url.startsWith('//')) return 'https:' + url;
                if (url.startsWith('/')) return window.location.origin + url;
                if (!url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('blob:')) {
                    return new URL(url, window.location.href).href;
                }
                return url;
            } catch (e) {
                console.warn("Failed to resolve URL:", url);
                return url;
            }
        }

        // 1. Get Images (img tags) including srcset
        document.querySelectorAll("img").forEach((img) => {
            let src = img.currentSrc || img.src;
            // Sometimes images are lazy loaded in data-src
            if (!src || src.includes('data:image/gif;base64')) {
                src = img.dataset.src || img.dataset.lazy || img.dataset.original;
            }

            if (src && src !== '') {
                // Filter very small 1x1 tracking pixels
                const w = img.naturalWidth || img.width;
                const h = img.naturalHeight || img.height;
                if (w > 1 || h > 1) {
                    addImage(src, w, h);
                }
            }
        });

        // 2. Get Background Images (FIXED: capture all valid URLs)
        document.querySelectorAll("*").forEach((el) => {
            try {
                const style = window.getComputedStyle(el);
                const bg = style.backgroundImage;
                if (bg && bg !== "none") {
                    // Match all url() patterns
                    const matches = bg.match(/url\((['"]?)([^'"()]*)\1\)/g);
                    if (matches) {
                        matches.forEach(match => {
                            // Extract URL from url("...") or url(...)
                            let url = match.slice(4, -1).trim();
                            if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
                                url = url.slice(1, -1);
                            }
                            // Accept all valid URLs (removed restrictive filter)
                            if (url && !url.startsWith('data:image/svg') && url.length > 5) {
                                addImage(url, el.offsetWidth, el.offsetHeight);
                            }
                        });
                    }
                }
            } catch (e) {
                // Skip elements that throw errors
            }
        });

        // 3. Get Videos (Combined Approach)
        // A. Standard tags
        document.querySelectorAll("video").forEach((video) => {
            let src = video.src || video.currentSrc;
            if (src) {
                addVideo(src, video.videoWidth || video.offsetWidth, video.videoHeight || video.offsetHeight);
            }
            // Check sources inside video
            video.querySelectorAll("source").forEach(source => {
                if (source.src) {
                    addVideo(source.src, video.videoWidth || video.offsetWidth, video.videoHeight || video.offsetHeight);
                }
            });
        });

        // B. Advanced Detection (Scripts, JSON-LD, etc.)
        const advancedVideos = findVideos();
        advancedVideos.forEach(url => {
            addVideo(url, 0, 0);
        });

        console.log("Media Downloader: Found", media.images.length, "images and", media.videos.length, "videos");
        return media;
    }

    // Handle Messages
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === "GET_MEDIA") {
            const data = getAllMedia();
            sendResponse(data);
        } else if (msg.action === "getVideos") {
            sendResponse({ videos: findVideos() });
        }
        return true;
    });
}
