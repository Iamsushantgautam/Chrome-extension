async function runBulkOCR() {
  const images = [...document.images].filter(img =>
    img.src &&
    img.width > 100 &&
    img.height > 50
  );

  let output = "";

  for (const img of images) {
    try {
      const canvas = document.createElement("canvas");

      // Load image with CORS to prevent tainted canvas
      const corsImg = new Image();
      corsImg.crossOrigin = "Anonymous";
      corsImg.src = img.src;

      await new Promise((resolve, reject) => {
        corsImg.onload = resolve;
        corsImg.onerror = reject;
      });

      const scale = 800 / Math.max(corsImg.width, corsImg.height);
      canvas.width = corsImg.width * scale;
      canvas.height = corsImg.height * scale;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(corsImg, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL("image/png");
      const res = await Tesseract.recognize(dataUrl, "eng");

      if (res.data.text.trim()) {
        output += res.data.text + "\n";
      }
    } catch (e) {
      console.log("OCR skipped for image:", img.src, e);
    }
  }

  copyToClipboard(output);
}
