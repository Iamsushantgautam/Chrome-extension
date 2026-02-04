# 🎥 Pinterest & Web Video Downloader

A premium, high-performance Chrome extension designed to detect and download videos from **Pinterest**, **TikTok**, and virtually any website with video content. Featuring a modern glassmorphism UI and "Deep-Scan" extraction technology.

---

## ✨ Features

- **🚀 One-Click Download**: A floating pink download icon appears directly on top of videos while you browse.
- **📌 Pinterest Specialist**: Supports standard board links, individual Pins, and even **shortened share links** (`pin.it`).
- **🔍 Deep-Scan Extraction**: Bypasses technical protections by scanning hidden metadata and JSON-LD for high-quality MP4 links.
- **🖼️ Live Preview**: Paste a URL to see a video preview before committing to the download.
- **🎨 Premium UI**: Beautiful dark-mode interface with smooth animations and modern typography.

---

## 🛠️ How to Install Locally (Developer Mode)

Since this is a custom extension, you need to load it into Chrome manually:

1.  **Download/Clone** this repository to your computer.
2.  Open **Google Chrome**.
3.  In the address bar, type `chrome://extensions/` and press Enter.
4.  Enable **Developer mode** using the toggle switch in the top-right corner.
5.  Click the **Load unpacked** button that appears.
6.  Select the `video-downloader` folder (the one containing `manifest.json`).
7.  The extension is now installed! You should see the icon in your extension puzzle menu. **Pin it** for easy access.

---

## 📖 How to Use

### Method 1: On-Page Floating Button (Fastest)
1. Navigate to a website with videos (e.g., Pinterest).
2. Look for the **Pink Download Circle** located at the top-right of the video player.
3. Click it to download the video directly.

### Method 2: Extension Popup (Manual/Deep Scan)
1. Click the extension icon in your Chrome toolbar.
2. The popup will automatically list all videos detected on the current page.
3. Click **Download** next to any video in the list.

### Method 3: Download via Link (Share Links)
1. Copy a link from Pinterest (works with `pin.it` shortened links).
2. Open the extension popup.
3. Paste the link into the input box and click **Preview**.
4. Once the preview appears, click **Download Video**.

---

## 🔧 Troubleshooting

- **Icon not showing?** Refresh the page you are on.
- **Download fails?** Make sure you have clicked "Allow" if Chrome asks for download permissions.
- **Still stuck?** Open the extension popup while on the video page to trigger a "Deep Scan."

---

## 👨‍💻 Technical Details
- **Architecture**: Manifest V3 (Latest standard).
- **Stack**: Vanilla JS, HTML5, CSS3.
- **Permissions**: `activeTab` (to detect videos), `downloads` (to save files), `scripting` (to inject the floating button).
