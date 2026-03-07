const PROJ_PREVIEW_MAX_HEIGHT = 1000;

const ProjectionUtils = {
  getSourceData(image) {
    const c = document.createElement("canvas");
    c.width = image.width;
    c.height = image.height;
    const ctx = c.getContext("2d");
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, image.width, image.height);
  },

  downscaleForPreview(image) {
    if (image.height <= PROJ_PREVIEW_MAX_HEIGHT) return image;
    const ratio = PROJ_PREVIEW_MAX_HEIGHT / image.height;
    const w = Math.round(image.width * ratio);
    const h = PROJ_PREVIEW_MAX_HEIGHT;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    ctx.drawImage(image, 0, 0, w, h);
    return c;
  },

  prepareImage(image, config) {
    const scale = config.scale || 1;
    const userOffsetX = config.offsetX || 0;
    const userOffsetY = config.offsetY || 0;
    const canvasHeight = Math.round(
      Math.max(image.width, image.height) / scale,
    );
    const canvasWidth = canvasHeight * 2;

    const prepared = document.createElement("canvas");
    prepared.width = canvasWidth;
    prepared.height = canvasHeight;
    const ctx = prepared.getContext("2d");

    const scaledWidth = image.width * (canvasHeight / image.height) * scale;
    const scaledHeight = canvasHeight * scale;
    const offsetX = (canvasWidth - scaledWidth) / 2 + userOffsetX;
    const offsetY = (canvasHeight - scaledHeight) / 2 + userOffsetY;

    ctx.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight);
    return prepared;
  },

  renderConfig(projection, container, onChange) {
    container.innerHTML = "";
    projection._onChange = onChange;
    projection._onInput = null;
  },

  showSliders(projection, prefix) {
    if (document.getElementById(prefix + "Scale")) return;
    const container = document.getElementById("projectionConfig");
    container.innerHTML = `
      <div class="config-group">
        <label>Scale</label>
        <div class="scale-controls">
          <input type="range" id="${prefix}Scale" min="0.5" max="1.5" step="0.001" value="1">
          <input type="number" id="${prefix}ScaleInput" min="0.5" max="1.5" step="0.001" value="1">
        </div>
      </div>
      <div class="config-group">
        <label>Offset X</label>
        <div class="scale-controls">
          <input type="range" id="${prefix}OffsetX" min="-100" max="100" step="0.001" value="0">
          <input type="number" id="${prefix}OffsetXInput" min="-100" max="100" step="0.001" value="0">
        </div>
      </div>
      <div class="config-group">
        <label>Offset Y</label>
        <div class="scale-controls">
          <input type="range" id="${prefix}OffsetY" min="-100" max="100" step="0.001" value="0">
          <input type="number" id="${prefix}OffsetYInput" min="-100" max="100" step="0.001" value="0">
        </div>
      </div>
    `;

    const setupControl = function (sliderId, inputId) {
      const slider = document.getElementById(sliderId);
      const input = document.getElementById(inputId);
      slider.addEventListener("input", function () {
        input.value = slider.value;
        if (projection._onInput) projection._onInput();
      });
      slider.addEventListener("change", function () {
        if (projection._onChange) projection._onChange();
      });
      input.addEventListener("input", function () {
        slider.value = input.value;
        if (projection._onInput) projection._onInput();
      });
      input.addEventListener("change", function () {
        if (projection._onChange) projection._onChange();
      });
    };

    setupControl(prefix + "Scale", prefix + "ScaleInput");
    setupControl(prefix + "OffsetX", prefix + "OffsetXInput");
    setupControl(prefix + "OffsetY", prefix + "OffsetYInput");
  },

  getSliderConfig(prefix) {
    const scaleEl = document.getElementById(prefix + "Scale");
    const offXEl = document.getElementById(prefix + "OffsetX");
    const offYEl = document.getElementById(prefix + "OffsetY");
    return {
      scale: scaleEl ? parseFloat(scaleEl.value) : 1,
      offsetX: offXEl ? parseFloat(offXEl.value) : 0,
      offsetY: offYEl ? parseFloat(offYEl.value) : 0,
    };
  },

  convertWithWorker(image, workerPath, buildMessage) {
    return new Promise(function (resolve, reject) {
      const sourceData = ProjectionUtils.getSourceData(image);
      const msg = buildMessage(sourceData, image);
      const worker = new Worker(workerPath);
      worker.onmessage = function (e) {
        const outW = e.data.width;
        const outH = e.data.height;
        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        const imgData = ctx.createImageData(outW, outH);
        imgData.data.set(e.data.out);
        ctx.putImageData(imgData, 0, 0);
        worker.terminate();
        resolve(canvas);
      };
      worker.onerror = function (err) {
        worker.terminate();
        reject(err);
      };
      worker.postMessage(msg.data, msg.transfer);
    });
  },

  renderOverlayMask(ctx, width, height, drawCutouts) {
    const overlay = document.createElement("canvas");
    overlay.width = width;
    overlay.height = height;
    const oCtx = overlay.getContext("2d");

    oCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
    oCtx.fillRect(0, 0, width, height);

    oCtx.globalCompositeOperation = "destination-out";
    oCtx.fillStyle = "black";
    drawCutouts(oCtx, width, height);

    ctx.drawImage(overlay, 0, 0);
  },
};
