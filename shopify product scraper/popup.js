document.addEventListener('DOMContentLoaded', async () => {
    // UI Elements
    const storeTitle = document.getElementById('store-title');
    const storeUrl = document.getElementById('store-url');

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
    let currentCurrency = 'USD';

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
        currentCurrency = response.currency || 'USD';

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

            if (!collectionSelect.value) {
                renderProducts(allProducts);
                updateStats(allProducts);
                btnExportAll.disabled = false;
                btnCountBadge.textContent = allProducts.length;
            }
            storeTitle.textContent = "Store Connected";
        }

        if (msg.action === "COLLECTION_COMPLETE") {
            const collProducts = msg.products;
            renderProducts(collProducts);

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

        const sorted = [...products].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const first = new Date(sorted[0].created_at);
        const last = new Date(sorted[sorted.length - 1].created_at);

        statFirstDate.textContent = first.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        statLastDate.textContent = last.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function renderProducts(products) {
        productList.innerHTML = '';

        products.forEach((p, index) => {
            const card = document.createElement('div');
            card.className = 'product-card';

            const imgUrl = p.images && p.images[0] ? p.images[0].src : '';
            const price = p.variants && p.variants[0] ? p.variants[0].price : '0.00';
            const date = new Date(p.created_at).toLocaleDateString();

            const totalInventory = p.variants.reduce((sum, v) => sum + (v.inventory_quantity || 0), 0);
            const inventoryText = totalInventory > 0 ? `${totalInventory} in stock` : 'Out of Stock';
            const inventoryClass = totalInventory > 0 ? 'in-stock' : 'out-of-stock';

            card.innerHTML = `
                <div class="product-img-box">
                    <div class="seq-badge">${index + 1}</div>
                    <input type="checkbox" class="select-checkbox" data-handle="${p.handle}">
                    ${imgUrl ? `<img src="${imgUrl}" class="product-img">` : '<span style="color:#ccc">No Image</span>'}
                </div>
                <div class="p-details">
                    <div class="p-title" title="${p.title}">${p.title}</div>
                    <div class="p-meta">Created: ${date}</div>
                    <div class="p-inventory ${inventoryClass}">${inventoryText}</div>
                    <div class="p-price">${currentCurrency} ${price}</div>
                    
                    <div class="card-actions">
                        <button class="btn-small btn-blue btn-details" data-handle="${p.handle}">See details</button>
                        <button class="btn-small btn-green btn-export-single" data-handle="${p.handle}">Export</button>
                    </div>
                </div>
            `;

            productList.appendChild(card);
        });

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
                if (p) {
                    const safeTitle = p.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    generateCSV([p], safeTitle);
                }
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
            renderProducts(allProducts);
            btnExportCollection.disabled = true;
            btnExportCollection.textContent = "Export Selected Collection";
            return;
        }

        productList.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Fetching collection products...</p>
            </div>
        `;

        btnExportCollection.disabled = true;
        chrome.tabs.sendMessage(tab.id, {
            action: "FETCH_COLLECTION",
            handle: handle
        });
    });

    // CSV Generator (Full Shopify Format)
    function generateCSV(products, filename) {
        const headers = [
            'Title', 'URL handle', 'Description', 'Vendor', 'Product category', 'Type', 'Tags', 'Published on online store',
            'Status', 'SKU', 'Barcode', 'Option1 name', 'Option1 value', 'Option1 Linked To', 'Option2 name', 'Option2 value',
            'Option2 Linked To', 'Option3 name', 'Option3 value', 'Option3 Linked To', 'Price', 'Compare-at price', 'Cost per item',
            'Charge tax', 'Tax code', 'Unit price total measure', 'Unit price total measure unit', 'Unit price base measure',
            'Unit price base measure unit', 'Inventory tracker', 'Inventory quantity', 'Continue selling when out of stock',
            'Weight value (grams)', 'Weight unit for display', 'Requires shipping', 'Fulfillment service', 'Product image URL',
            'Image position', 'Image alt text', 'Variant image URL', 'Gift card', 'SEO title', 'SEO description',
            'Color (product.metafields.shopify.color-pattern)', 'Google Shopping / Google product category',
            'Google Shopping / Gender', 'Google Shopping / Age group', 'Google Shopping / Manufacturer part number (MPN)',
            'Google Shopping / Ad group name', 'Google Shopping / Ads labels', 'Google Shopping / Condition',
            'Google Shopping / Custom product', 'Google Shopping / Custom label 0', 'Google Shopping / Custom label 1',
            'Google Shopping / Custom label 2', 'Google Shopping / Custom label 3', 'Google Shopping / Custom label 4'
        ];

        let rows = [];
        products.forEach(p => {
            const variants = p.variants || [];
            const images = p.images || [];
            const max = Math.max(variants.length, images.length) || 1;

            for (let i = 0; i < max; i++) {
                let rowData = {};
                headers.forEach(h => rowData[h] = '');
                const v = variants[i] || {};
                const img = images[i] || {};

                if (i === 0) {
                    rowData['Title'] = escapeCSV(p.title);
                    rowData['Description'] = escapeCSV(p.body_html);
                    rowData['Vendor'] = escapeCSV(p.vendor);
                    rowData['Type'] = escapeCSV(p.product_type);
                    rowData['Tags'] = escapeCSV(p.tags);
                    rowData['Published on online store'] = 'TRUE';
                    rowData['Status'] = 'active';
                    rowData['Gift card'] = 'FALSE';
                    if (p.options && p.options[0]) rowData['Option1 name'] = escapeCSV(p.options[0].name);
                    if (p.options && p.options[1]) rowData['Option2 name'] = escapeCSV(p.options[1].name);
                    if (p.options && p.options[2]) rowData['Option3 name'] = escapeCSV(p.options[2].name);
                }

                rowData['URL handle'] = p.handle;

                if (i < variants.length) {
                    rowData['Option1 value'] = escapeCSV(v.option1);
                    rowData['Option2 value'] = escapeCSV(v.option2);
                    rowData['Option3 value'] = escapeCSV(v.option3);
                    rowData['SKU'] = escapeCSV(v.sku);
                    rowData['Barcode'] = escapeCSV(v.barcode);
                    rowData['Price'] = v.price;
                    rowData['Compare-at price'] = v.compare_at_price;
                    rowData['Charge tax'] = v.taxable ? 'TRUE' : 'FALSE';
                    rowData['Inventory tracker'] = v.inventory_management || 'shopify';
                    rowData['Inventory quantity'] = v.inventory_quantity || 0;
                    rowData['Continue selling when out of stock'] = v.inventory_policy === 'continue' ? 'continue' : 'deny';
                    rowData['Weight value (grams)'] = v.grams;
                    rowData['Weight unit for display'] = 'g';
                    rowData['Requires shipping'] = v.requires_shipping ? 'TRUE' : 'FALSE';
                    rowData['Fulfillment service'] = v.fulfillment_service || 'manual';
                    if (v.featured_image) rowData['Variant image URL'] = escapeCSV(v.featured_image.src);
                }

                if (i < images.length) {
                    rowData['Product image URL'] = escapeCSV(img.src);
                    rowData['Image position'] = img.position || (i + 1);
                    rowData['Image alt text'] = escapeCSV(img.alt);
                }

                const row = headers.map(h => rowData[h]);
                rows.push(row.join(','));
            }
        });

        const csvContent = headers.join(',') + '\n' + rows.join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({ url: url, filename: `${filename}.csv` });
    }

    function escapeCSV(str) {
        if (!str) return '';
        str = String(str).replace(/"/g, '""');
        if (str.search(/("|,|\n)/g) >= 0) str = `"${str}"`;
        return str;
    }
});
