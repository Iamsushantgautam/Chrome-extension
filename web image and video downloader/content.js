// Guard against multiple injections
if (window.mediaDownloaderInjected) {
    console.log("Media Downloader: Already injected");
} else {
    window.mediaDownloaderInjected = true;

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

        // 3. Get Videos (video tags + sources)
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

        console.log("Media Downloader: Found", media.images.length, "images and", media.videos.length, "videos");
        return media;
    }

    // Handle Messages
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === "GET_MEDIA") {
            const data = getAllMedia();
            sendResponse(data);
        }
        return true;
    });
}
