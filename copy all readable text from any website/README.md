# Universal Website Text Copier

A powerful Chrome Extension (Manifest V3) that allows you to copy text from difficult sources on the web, including **HTML Canvas elements**, **Images (OCR)**, and specific **visual areas** regardless of the underlying DOM structure.

## 🚀 Features

### 1. 📄 Copy Page Text
Instantly extracts and copies all visible text from the current webpage, preserving the basic layout.

### 2. ✂️ Select Area Text
Draw a selection box around *any* part of the screen to copy only the text inside that area.
- Works by spatially analyzing text nodes (using `TreeWalker`) relative to your selection box.
- Great for copying columns, sidebars, or specific data points without grabbing surrounding clutter.

### 3. 🎨 Copy Canvas Text
Extracts text drawn onto HTML5 `<canvas>` elements.
- **How it works**: Injects a hook into the page's main execution context to intercept `fillText` and `strokeText` calls, recording the text before it becomes just pixels.

### 4. 🔍 Image OCR (Optical Character Recognition)
Detects images on the page and uses **Tesseract.js** to recognize and extract text embedded within them.
- Includes automatic CORS handling to process images securely without security errors.

---

## 🛠️ Installation

1. **Clone or Download** this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** by toggling the switch in the top-right corner.
4. Click the **Load unpacked** button.
5. Select the folder containing `manifest.json` (the root of this project).

## 🖥️ Usage

1. Pin the extension to your browser toolbar for easy access.
2. Click the extension icon to open the modern UI popup.
3. Choose your desired action:
   - **Copy Page Text**: Copies everything.
   - **Select Area Text**: Click, then click-and-drag on the page to select text.
   - **Copy Canvas Text**: Retrieves text from canvas elements (note: page must have loaded with extension enabled for full capture).
   - **Image OCR**: Scans visible images for text.

## ⚙️ Technical Details

- **Manifest V3**: Uses the latest Chrome Extension standard.
- **Dynamic Injection**: Includes an auto-heal mechanism (`popup.js`) that injects content scripts dynamically if they are missing (e.g., if the extension was reloaded while a tab was open), preventing "Reload Page" errors.
- **Main World Execution**: `canvas-hook.js` is executed in the `MAIN` world to access the page's native window objects, while other scripts run in the `ISOLATED` world for security.

## 📂 Project Structure

- `manifest.json`: Extension configuration.
- `popup.html` / `popup.js` / `popup.css`: The extension interface.
- `content.js`: Main logic for page interaction and selection.
- `canvas-hook.js`: Script for intercepting canvas text methods.
- `ocr.js`: Logic for handling image OCR via Tesseract.js.
- `lib/`: Contains external libraries (Tesseract.js).

## 🔒 Permissions

- `activeTab`: To access the current page when clicked.
- `scripting`: To inject scripts dynamically.
- `clipboardWrite`: To save extracted text to your clipboard.
