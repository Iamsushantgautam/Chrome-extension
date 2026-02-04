# 🛍️ Shopify Product Scraper by Shopscan

A powerful and user-friendly Chrome extension designed to extract product data from any Shopify-powered online store. Export complete product catalogs, including variants and images, directly into a CSV file compatible with Shopify's import verification.

## ✨ Key Features

*   **Auto-Detection**: Instantly identifies if the current website is a Shopify store.
*   **Comprehensive Data**: Scrapes titles, handles, descriptions (HTML), prices, variants, images, and SEO metadata.
*   **Collection Filtering**: Select and export products from specific collections only.
*   **One-Click Export**: Download a properly formatted CSV ready for Shopify import.
*   **Smart Dashboard**: View store statistics like total products, collections, and catalog age at a glance.
*   **Batch & Single Export**: Choose to export the entire store, a specific collection, or individual products.

---

## 🚀 How to Install Locally

Since this extension is in development (or if you are loading it from source), follow these steps to install it on Google Chrome:

1.  **Download/Clone the Source Code**:
    *   Ensure you have the folder containing `manifest.json`, `popup.html`, `icon.png`, etc. (e.g., inside `shopify product scraper`).

2.  **Open Chrome Extensions Page**:
    *   Open Google Chrome.
    *   In the address bar, type: `chrome://extensions/` and hit Enter.

3.  **Enable Developer Mode**:
    *   Look for the toggle switch named **"Developer mode"** in the top right corner.
    *   Turn it **ON**.

4.  **Load the Extension**:
    *   Click the **"Load unpacked"** button that appears in the top left.
    *   Navigate to and select the folder where the extension files are located (the folder containing `manifest.json`).

5.  **Pin It**:
    *   Click the puzzle piece icon in your Chrome toolbar.
    *   Find "Shopify Product Scraper" and click the pushpin icon to keep it visible.

---

## 📖 How to Use

1.  **Navigate to a Store**:
    *   Visit any e-commerce website (e.g., `gymshark.com`, `colourpop.com`).
    *   The extension icon will remain active.

2.  **Open the Extension**:
    *   Click the extension icon in your toolbar.
    *   **If it's a Shopify store**: You will see the "Connected" dashboard with store stats.
    *   **If it's NOT a Shopify store**: You will see a "Not Shopify" warning and a promotional offer.

3.  **Export Data**:
    *   **Export All**: Click **"Export All Products"** to fetch and download the entire catalog.
    *   **Export Collection**: Select a collection from the dropdown menu. The grid will update to show only those products. Click **"Export Collection"** to download them.
    *   **Select & Export**: Check the boxes on specific product cards and click **"Download Selected"** (floating bar).
    *   **Single Product**: Click the **"Export"** button on any individual card.

4.  **Review CSV**:
    *   The downloaded file is formatted for Shopify. You can open it in Excel, Google Sheets, or import it directly into another Shopify store.

---

## ⚠️ Troubleshooting & Notes

*   **"Not a Shopify Store"**: This tool only works on sites built with Shopify. It detects standard Shopify global variables. Custom headless builds might not always be detected.
*   **Slow Export**: For stores with thousands of products, the export process might take a minute as it fetches data page-by-page. Please be patient and keep the popup open if required (though the background script handles most tasks).
*   **Missing Images**: The tool scrapes image URLs. If the source store protects its images or deletes them, they won't appear.

---

**Happy Scraping!** 🕵️‍♂️
