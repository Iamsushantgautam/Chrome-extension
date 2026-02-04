# 🎥 Pinterest, Dailymotion & Web Video Downloader

A premium, high-performance Chrome extension designed to detect and download videos from **Pinterest**, **Dailymotion**, and virtually any website with video content. Featuring a modern glassmorphism UI, best-quality resolution selection, and "Deep-Scan" extraction technology.

---

## ✨ Features

- **🚀 One-Click Download**: A floating glowing download icon appears directly on top of videos while you browse.
- **📌 Pinterest Specialist**: Supports standard board links, individual Pins, and even **shortened share links** (`pin.it`).
- **📺 Dailymotion Integration**: Automatically resolves and detects multiple quality levels (1080p, 720p, etc.) from Dailymotion.
- **💎 Best Quality First**: Automatically prioritizes HD resolutions for high-fidelity downloads.
- **🔍 Deep-Scan Extraction**: Bypasses technical protections by scanning hidden metadata and JSON settings for direct video links.
- **🎨 Premium UI/UX**: Stunning dark-mode interface with glassmorphism, radial gradients, and smooth animations.
- **🔄 Actions & Control**: New **Refresh** and **Close** buttons for a faster, more effective workflow.

---

## 🛠️ How to Install Locally (Developer Mode)

Since this is a custom extension, you need to load it into Chrome manually:

1.  **Download/Clone** this repository to your computer.
2.  Open **Google Chrome**.
3.  In the address bar, type `chrome://extensions/` and press Enter.
4.  Enable **Developer mode** using the toggle switch in the top-right corner.
5.  Click the **Load unpacked** button that appears.
6.  Select the `video-downloader` folder (the one containing `manifest.json`).
7.  The extension is now installed! **Pin it** for easy access.

---

## 📖 How to Use

### Method 1: On-Page Floating Button (Fastest)
1. Navigate to a website with videos (e.g., Pinterest or Dailymotion).
2. Look for the **Glowing Pink Download Icon** (positioned slightly offset for better visibility).
3. Click it to download the video directly.

### Method 2: Extension Popup (Auto-Detect)
1. Click the extension icon in your Chrome toolbar.
2. The popup will automatically list all videos detected, labeled with their **Quality** and **File Size**.
3. Click **Download** next to any video in the list.

### Method 3: Manual URL Entry
1. Copy a video link from Pinterest or Dailymotion.
2. Open the extension popup.
3. Paste the link into the input box and click **Preview**.
4. The resolved video will be added to the list with its best quality.

---

## 🔧 Troubleshooting

- **No video found?** Refresh the page and try again. Sometimes page scripts need a reload to reveal metadata.
- **Download fails?** Ensure you've granted the extension download permissions if prompted.
- **Resolution too low?** The extension picks the best available; if the source is low-res, the download will be as well.

---

## 👨‍💻 Technical Details
- **Architecture**: Manifest V3 (Latest standard).
- **Stack**: Vanilla JS, HTML5, CSS3 (Custom Glassmorphism).
- **Permissions**: `activeTab`, `downloads`, `scripting`, `storage`, `<all_urls>`.
