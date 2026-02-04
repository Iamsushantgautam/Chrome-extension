(function () {
  const originalFill = CanvasRenderingContext2D.prototype.fillText;
  const originalStroke = CanvasRenderingContext2D.prototype.strokeText;

  const captured = [];

  CanvasRenderingContext2D.prototype.fillText = function (text) {
    captured.push(text);
    return originalFill.apply(this, arguments);
  };

  CanvasRenderingContext2D.prototype.strokeText = function (text) {
    captured.push(text);
    return originalStroke.apply(this, arguments);
  };

  window.__getCanvasText = function () {
    return captured.join("\n");
  };

  window.addEventListener("COPY_EXTENSION_GET_CANVAS", () => {
    window.dispatchEvent(new CustomEvent("COPY_EXTENSION_SEND_CANVAS", {
      detail: captured.join("\n")
    }));
  });
})();
