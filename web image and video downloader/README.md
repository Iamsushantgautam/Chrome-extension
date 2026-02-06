# 🖼️ Media Downloader & BG Remover

A powerful Chrome extension to **download images & videos** from any website and **remove image backgrounds** instantly.

---

## ✨ Features

### 1. **Media Downloader** 📥
- **Auto-Detect**: Automatically finds all images and videos on the current page.
- **Smart Filtering**: Filter by type (JPG, PNG, MP4, etc.), size (Small, Medium, Large), or URL.
- **Individual Downloads**: Each media card has a quick-download button for instant single-file downloads.
- **Batch Download**: Select multiple files and download them all at once.
- **Organized**: Downloads are saved in folders named after the website.
- **File Info**: See file sizes (KB/MB) and dimensions before downloading.
- **Tabs**: Separate views for **Images** and **Videos**.
- **Lightbox Preview**: Click any item to view it full-screen with navigation controls.

### 2. **Advanced Video Detection** 🎥
- **Pinterest Support**: Extracts high-quality videos (up to 720p HD) from Pinterest pins.
- **Dailymotion Support**: Gets the best available quality (1080p, 720p, 480p, etc.).
- **Hidden Video Detection**: Finds videos that aren't visible in `<video>` tags.
- **Floating Download Buttons**: Hover buttons appear on videos for quick access.
- **Format Filtering**: Only shows MP4 videos to avoid unsupported formats.
- **Deduplication**: Automatically removes duplicate videos.

### 3. **Website Media Scraper** 🌐
- **Manual URL Input**: Paste any website URL to extract all its images and videos.
- **Bulk Extraction**: Finds all `<img>` tags, `<video>` tags, and embedded media URLs.
- **Smart Resolution**: Handles relative URLs and lazy-loaded images (`data-src`, `data-lazy`).
- **Stats Display**: Shows count summary: "Found X items (Y images, Z videos)".
- **Works on**: Pinterest, Instagram, any website with accessible media.

### 4. **Background Remover** 🎨
- **AI-Powered**: Uses remove.bg technology for professional results.
- **Easy Upload**: Drag & drop or browse to upload.
- **Full HD**: Downloads high-quality transparent PNGs.
- **Preview**: See side-by-side comparison before downloading.
- **Smart Quota**: Automatically uses free preview mode if you run out of credits.

---

## 🚀 How to Install & Use Locally

Since this is a developer extension, you need to load it into Chrome manually.

### **Step 1: Download/Locate Code**
Ensure you have the source code folder on your computer.
*(You are currently in: `d:\My Project\Chrome extension\web image and video downloader`)*

### **Step 2: Open Chrome Extensions Page**
1. Open Google Chrome.
2. In the address bar, type: `chrome://extensions/`
3. Press **Enter**.

### **Step 3: Enable Developer Mode**
1. Look at the **top right** corner of the page.
2. Toggle the switch **"Developer mode"** to **ON** (blue).

### **Step 4: Load the Extension**
1. Click the button **"Load unpacked"** (top left).
2. A file picker will open.
3. Select the **folder** containing this project:
   `web image and video downloader`
4. Click **Select Folder**.

🎉 **The extension is now installed!** You should see its icon in your browser toolbar.

---

## 🛠️ Configuration (API Key)

To use the **Background Remover**, you need a free API key:

1. Go to [remove.bg/api](https://remove.bg/api) and sign up.
2. Get your **API Key**.
3. Open the file `popup.js` in a text editor (VS Code, Notepad, etc.).
4. Find around line **~930** (search for `apiKey`).
5. Replace:
   ```javascript
   const apiKey = 'YOUR_KEY_HERE';
   ```
   with your actual key.
6. **Reload** the extension (click 🔄 icon on the extension card in `chrome://extensions/`).

---

## 📖 How to Use

### **Downloading Media from Current Page:**
1. Go to any website (e.g., Unsplash, Pinterest, Instagram).
2. Click the **extension icon** in your toolbar.
3. Browse the **Images** or **Videos** tabs.
4. **Option A**: Click the download button on any card to download it instantly.
5. **Option B**: Select multiple items and click **"Download Selected"** for batch downloads.

### **Scraping Media from Any Website:**
1. Click the extension icon.
2. Go to the **Videos** tab.
3. In the **"Paste Pinterest/Dailymotion URL..."** input field, paste any website URL.
4. Click **"Preview"**.
5. Wait for the extension to scan and extract all media.
6. All found images and videos will appear in the list.

### **Downloading Pinterest Videos:**
1. Go to a Pinterest pin with a video.
2. Click the extension icon.
3. The video will auto-detect (or paste the pin URL manually).
4. Download the highest quality available (720p HD).

### **Removing Backgrounds:**
1. Click the extension icon.
2. Go to the **"BG Remover"** tab.
3. Drag & drop an image or click to upload.
4. Wait for AI processing.
5. Click **"Download HD Image"**.

---

## 📁 Project Structure

- `manifest.json` - Configuration & Permissions
- `popup.html` - Extension popup UI structure
- `popup.js` - Main logic (media detection, API calls, downloading, UI)
- `popup.css` - Styling (Grid, Colors, Layout, Animations)
- `content.js` - Script that scans web pages for media (injected into tabs)
- `background.js` - Service worker for extension lifecycle
- `icons/` - Extension icons (16px, 48px, 128px)

---

## 🔧 Key Improvements

### Recent Updates:
- ✅ Individual download buttons on every media card
- ✅ Website URL scraping - extract media from any site
- ✅ Pinterest & Dailymotion video detection
- ✅ Blob URL filtering (no more broken chrome-extension:// URLs)
- ✅ Duplicate media removal
- ✅ MP4-only filtering for videos
- ✅ Enhanced file extension detection
- ✅ Improved error handling with user-friendly messages

---

## 🚨 Troubleshooting

### "No images or videos found"
- Some websites use lazy loading or dynamic content. Try scrolling the page first.
- For protected content, use the manual URL input instead.

### "Failed to fetch media: CORS error"
- Some websites block external access. Visit the page directly and use auto-detection.

### Chrome-extension:// URLs appearing
- This has been fixed! Reload the extension to get the latest version.

### Background remover not working
- Ensure you've added your remove.bg API key to `popup.js`.
- Check your API quota at remove.bg.

---

**Enjoy your new Media Tool!** 🚀

For issues or feature requests, please check the code or create an issue in the project repository.
