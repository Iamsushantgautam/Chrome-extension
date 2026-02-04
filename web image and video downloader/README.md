# 🖼️ Media Downloader & BG Remover

A powerful Chrome extension to **download images & videos** from any website and **remove image backgrounds** instantly.

---

## ✨ Features

### 1. **Media Downloader** 📥
- **Auto-Detect**: Finds all images and videos on the current page.
- **Smart Filtering**: Filter by type (JPG, PNG, Video) or size (Small, Medium, Large).
- **Batch Download**: Select multiple files and download them all at once.
- **Organized**: Downloads are saved in folders named after the website.
- **File Sizes**: See file sizes (KB/MB) and dimensions before downloading.
- **Tabs**: Separate views for **Images** and **Videos**.

### 2. **Background Remover** 🎨
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
4. Find line **~730** (search for `apiKey`).
5. Replace:
   ```javascript
   const apiKey = 'YOUR_KEY_HERE';
   ```
   with your actual key.
6. **Reload** the extension (click 🔄 icon on the extension card in `chrome://extensions/`).

---

## 📖 How to Use

### **Downloading Media:**
1. Go to any website (e.g., Unsplash, Pinterest, YouTube).
2. Click the **extension icon**.
3. Browse the **IMages** or **Videos** tabs.
4. Select the items you want.
5. Click **"Download Selected"**.

### **Removing Backgrounds:**
1. Click the extension icon.
2. Go to the **"BG Remover"** tab.
3. Drag & drop an image or click to upload.
4. Wait for AI processing.
5. Click **"Download HD Image"**.

---

## 📁 Project Structure

- `manifest.json` - Configuration & Permissions
- `popup.html` - Can be opened to view UI structure
- `popup.js` - Main logic (API calls, downloading, UI)
- `popup.css` - Styling (Grid, Colors, Layout)
- `content.js` - Script that scans web pages for media

---

**Enjoy your new Media Tool!** 🚀
