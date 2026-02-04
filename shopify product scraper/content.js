// Check if it's a Shopify store
function isShopify() {
    return !!(window.Shopify || document.querySelector('script[src*="shopify"]'));
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "CHECK_SHOPIFY") {
        let currency = "USD"; // Fallback

        // Try to find currency
        const metaCurrency = document.querySelector('meta[property="og:price:currency"]');
        if (metaCurrency) {
            currency = metaCurrency.getAttribute('content');
        } else if (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) {
            currency = window.Shopify.currency.active;
        }

        sendResponse({
            isShopify: isShopify(),
            host: window.location.hostname,
            currency: currency
        });
    }

    if (request.action === "START_SCRAPE") {
        scrapeAllProducts(sendResponse);
        return true;
    }

    if (request.action === "FETCH_COLLECTION") {
        fetchCollectionProducts(request.handle, sendResponse);
        return true;
    }
});

async function fetchCollectionProducts(handle, sendResponse) {
    let collectionProducts = [];
    let page = 1;
    let hasMore = true;
    const limit = 250;

    try {
        while (hasMore) {
            chrome.runtime.sendMessage({ action: "PROGRESS", status: `Fetching collection page ${page}...` });

            const response = await fetch(`${window.location.origin}/collections/${handle}/products.json?limit=${limit}&page=${page}`);
            if (!response.ok) { // If collection scrape fails, maybe try get all if handle is 'all'
                hasMore = false; break;
            }

            const data = await response.json();
            const products = data.products;

            if (products && products.length > 0) {
                collectionProducts = collectionProducts.concat(products);
                page++;
            } else {
                hasMore = false;
            }
            if (page > 50) hasMore = false;
        }

        chrome.runtime.sendMessage({
            action: "COLLECTION_COMPLETE",
            products: collectionProducts,
            handle: handle
        });

    } catch (error) {
        chrome.runtime.sendMessage({ action: "ERROR", message: "Failed to fetch collection: " + error.message });
    }
}

async function scrapeAllProducts(sendResponse) {
    let allProducts = [];
    let page = 1;
    let hasMore = true;
    const limit = 250;

    try {
        while (hasMore) {
            // Notify progress
            chrome.runtime.sendMessage({
                action: "PROGRESS",
                count: allProducts.length,
                status: `Fetching page ${page}...`
            });

            const response = await fetch(`${window.location.origin}/products.json?limit=${limit}&page=${page}`);
            if (!response.ok) throw new Error("Failed to fetch products");

            const data = await response.json();
            const products = data.products;

            if (products && products.length > 0) {
                allProducts = allProducts.concat(products);
                page++;
            } else {
                hasMore = false;
            }

            // Safety break
            if (page > 50) hasMore = false;
        }

        // Fetch collections in parallel if possible, or after
        try {
            const collResp = await fetch(`${window.location.origin}/collections.json`);
            if (collResp.ok) {
                const collData = await collResp.json();
                chrome.runtime.sendMessage({
                    action: "COLLECTIONS_FOUND",
                    collections: collData.collections
                });
            }
        } catch (e) { console.log("Collections fetch failed", e); }

        chrome.runtime.sendMessage({
            action: "COMPLETE",
            products: allProducts,
            count: allProducts.length
        });


    } catch (error) {
        chrome.runtime.sendMessage({
            action: "ERROR",
            message: error.message
        });
    }
}
