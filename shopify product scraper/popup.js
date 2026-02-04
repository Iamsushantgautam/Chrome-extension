document.addEventListener('DOMContentLoaded', async () => {
    // UI Elements
    const storeTitle = document.getElementById('store-title');
    const storeUrl = document.getElementById('store-url');
    // const storeLocation = document.getElementById('store-location'); // Not used dynamically yet

    // Stats
    const statProductCount = document.getElementById('stat-product-count');
    const statCollectionCount = document.getElementById('stat-collection-count');
    const statFirstDate = document.getElementById('stat-first-date');
    const statLastDate = document.getElementById('stat-last-date');

    // Actions
    const btnExportAll = document.getElementById('btn-export-all');
    const btnCountBadge = document.getElementById('btn-count-badge');
    const collectionSelect = document.getElementById('collection-select');
    const btnExportCollection = document.getElementById('btn-export-collection');

    // Selected Bar
    const selectedBar = document.getElementById('selected-actions');
    const selectedCountEl = document.getElementById('selected-count');
    const btnExportSelected = document.getElementById('btn-export-selected');

    // List
    const productList = document.getElementById('product-list');

    // State
    let allProducts = [];
    let collections = [];
    let selectedHandles = new Set();
    let currentStoreHost = '';

    // 1. Initialize & Inject Content Script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    try {
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
        });
    } catch (e) { /* Already injected */ }

    // 2. Check Store & Start Scraping
    chrome.tabs.sendMessage(tab.id, { action: "CHECK_SHOPIFY" }, (response) => {
        const statusBadge = document.getElementById('status-badge');
        const statusDot = document.getElementById('status-dot');
        const statusText = document.getElementById('status-text');

        const connectedView = document.getElementById('connected-view');
        const notShopifyView = document.getElementById('not-shopify-view');

        if (chrome.runtime.lastError || !response || !response.isShopify) {
            // Not Shopify Store State
            if (statusBadge) statusBadge.classList.add('not-connected');
            if (statusDot) {
                statusDot.classList.remove('active');
                statusDot.classList.add('red');
            }
            if (statusText) statusText.textContent = "Not Shopify";

            if (connectedView) connectedView.style.display = 'none';
            if (notShopifyView) notShopifyView.style.display = 'flex';
            return;
        }

        // Shopify Store State
        storeTitle.textContent = "Shopify Store Detected";
        storeUrl.textContent = response.host;
        currentStoreHost = response.host;

        // Show Connected View
        if (connectedView) connectedView.style.display = 'block';
        if (notShopifyView) notShopifyView.style.display = 'none';

        // Start scraping immediately
        chrome.tabs.sendMessage(tab.id, { action: "START_SCRAPE" });
    });

    // 3. Listen for Data
    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === "PROGRESS") {
            // Optional progress bar update could go here
        }

        if (msg.action === "COLLECTIONS_FOUND") {
            collections = msg.collections;
            statCollectionCount.textContent = collections.length;

            // Populate Dropdown
            // Preserve selection if rebuilding
            const currentVal = collectionSelect.value;
            collectionSelect.innerHTML = '<option value="">All Products (Default)</option>';
            collections.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.handle;
                opt.textContent = c.title;
                collectionSelect.appendChild(opt);
            });
            if (currentVal) collectionSelect.value = currentVal;
        }

        if (msg.action === "COMPLETE") {
            allProducts = msg.products;

            // Initial View: Show All
            if (!collectionSelect.value) {
                renderProducts(allProducts);
                updateStats(allProducts); // Global Stats
                btnExportAll.disabled = false;
                btnCountBadge.textContent = allProducts.length;
            }
            storeTitle.textContent = "Store Connected";
        }

        if (msg.action === "COLLECTION_COMPLETE") {
            const collProducts = msg.products;
            renderProducts(collProducts);
            // We don't update Global Stats (First/Last date of store), 
            // but maybe we update the grid title or count?
            // For now just rendering them is what user asked: "show the all products"

            // Enable collection export with correct data
            btnExportCollection.onclick = () => {
                generateCSV(collProducts, `${currentStoreHost}_collection_${msg.handle}`);
            };
            btnExportCollection.textContent = `Export Collection (${collProducts.length})`;
            btnExportCollection.disabled = false;
        }
    });

    // 4. UI Logic
    function updateStats(products) {
        if (!products || products.length === 0) return;

        statProductCount.textContent = products.length;

        // Date Logic (Sort by created_at)
        const sorted = [...products].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        const first = new Date(sorted[0].created_at);
        const last = new Date(sorted[sorted.length - 1].created_at);

        statFirstDate.textContent = first.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        statLastDate.textContent = last.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

        // Try to guess location (not reliable in basic scrape, placeholder)
        // storeLocation.textContent = "Detected"; 
    }

    function renderProducts(products) {
        productList.innerHTML = '';

        products.forEach((p, index) => {
            const card = document.createElement('div');
            card.className = 'product-card';

            const imgUrl = p.images && p.images[0] ? p.images[0].src : '';
            const price = p.variants && p.variants[0] ? p.variants[0].price : '0.00';
            const date = new Date(p.created_at).toLocaleDateString();

            card.innerHTML = `
                <div class="product-img-box">
                    <div class="seq-badge">${index + 1}</div>
                    <input type="checkbox" class="select-checkbox" data-handle="${p.handle}">
                    ${imgUrl ? `<img src="${imgUrl}" class="product-img">` : '<span style="color:#ccc">No Image</span>'}
                </div>
                <div class="p-details">
                    <div class="p-title" title="${p.title}">${p.title}</div>
                    <div class="p-meta">Created: ${date}</div>
                    <div class="p-price">${price}</div>
                    
                    <div class="card-actions">
                        <button class="btn-small btn-blue btn-details" data-handle="${p.handle}">See details</button>
                        <button class="btn-small btn-green btn-export-single" data-handle="${p.handle}">Export</button>
                    </div>
                </div>
            `;

            productList.appendChild(card);
        });

        // Add Event Listeners for dynamic items
        document.querySelectorAll('.select-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const handle = e.target.dataset.handle;
                if (e.target.checked) selectedHandles.add(handle);
                else selectedHandles.delete(handle);
                updateSelectedBar();
            });
        });

        document.querySelectorAll('.btn-export-single').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const handle = e.target.dataset.handle;
                const p = allProducts.find(x => x.handle === handle);
                if (p) generateCSV([p], `${currentStoreHost}_${p.handle}`);
            });
        });

        document.querySelectorAll('.btn-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const handle = e.target.dataset.handle;
                chrome.tabs.create({ url: `https://${currentStoreHost}/products/${handle}` });
            });
        });
    }

    function updateSelectedBar() {
        const count = selectedHandles.size;
        selectedCountEl.textContent = count;

        if (count > 0) {
            selectedBar.style.display = 'flex';
        } else {
            selectedBar.style.display = 'none';
        }
    }

    // 5. Export Actions
    btnExportAll.addEventListener('click', () => {
        generateCSV(allProducts, `${currentStoreHost}_all_products`);
    });

    btnExportSelected.addEventListener('click', () => {
        const selected = allProducts.filter(p => selectedHandles.has(p.handle));
        generateCSV(selected, `${currentStoreHost}_selected_products`);
    });

    collectionSelect.addEventListener('change', () => {
        const handle = collectionSelect.value;

        if (!handle) {
            // Revert to All
            renderProducts(allProducts);
            btnExportCollection.disabled = true;
            btnExportCollection.textContent = "Export Selected Collection";
            return;
        }

        // Show Loading
        productList.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Fetching collection products...</p>
            </div>
        `;

        // Disable export until fetched
        btnExportCollection.disabled = true;

        // Fetch Collection
        chrome.tabs.sendMessage(tab.id, {
            action: "FETCH_COLLECTION",
            handle: handle
        });
    });

    // CSV Generator (Reused & Optimized)
    function generateCSV(products, filename) {
        const headers = [
            'Handle', 'Title', 'Body (HTML)', 'Vendor', 'Type', 'Tags', 'Published',
            'Option1 Name', 'Option1 Value', 'Option2 Name', 'Option2 Value', 'Option3 Name', 'Option3 Value',
            'Variant SKU', 'Variant Grams', 'Variant Inventory Qty', 'Variant Price', 'Variant Compare At Price',
            'Image Src', 'Image Position', 'Image Alt Text'
        ];

        let rows = [];

        products.forEach(p => {
            // simplified logic for robustness
            const variants = p.variants || [];
            const images = p.images || [];
            const max = Math.max(variants.length, images.length) || 1;

            for (let i = 0; i < max; i++) {
                let row = new Array(headers.length).fill('');

                row[0] = p.handle;

                if (i === 0) {
                    row[1] = escapeCSV(p.title);
                    row[2] = escapeCSV(p.body_html);
                    row[3] = escapeCSV(p.vendor);
                    row[4] = escapeCSV(p.product_type);
                    row[5] = escapeCSV(p.tags);
                    row[6] = 'TRUE';

                    if (p.options[0]) row[7] = escapeCSV(p.options[0].name);
                    if (p.options[1]) row[9] = escapeCSV(p.options[1].name);
                    if (p.options[2]) row[11] = escapeCSV(p.options[2].name);
                }

                if (i < variants.length) {
                    const v = variants[i];
                    row[8] = escapeCSV(v.option1);
                    row[10] = escapeCSV(v.option2);
                    row[12] = escapeCSV(v.option3);
                    row[13] = escapeCSV(v.sku);
                    row[14] = v.grams;
                    row[15] = v.inventory_quantity;
                    row[16] = v.price;
                    row[17] = v.compare_at_price;
                }

                if (i < images.length) {
                    row[18] = escapeCSV(images[i].src);
                    row[19] = i + 1;
                    row[20] = escapeCSV(images[i].alt);
                }

                rows.push(row.join(','));
            }
        });

        const csvContent = headers.join(',') + '\n' + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        chrome.downloads.download({
            url: url,
            filename: `${filename}.csv`
        });
    }

    function escapeCSV(str) {
        if (!str) return '';
        str = String(str).replace(/"/g, '""');
        if (str.search(/("|,|\n)/g) >= 0) str = `"${str}"`;
        return str;
    }
});
