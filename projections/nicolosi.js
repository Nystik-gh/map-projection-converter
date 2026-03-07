const HALF_PI = Math.PI / 2;
const TWO_PI = Math.PI * 2;
const INV_HALF_PI = 1 / HALF_PI;
const PREVIEW_MAX_HEIGHT = 1000;

function getSourceData(image) {
  const c = document.createElement("canvas");
  c.width = image.width;
  c.height = image.height;
  const ctx = c.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, image.width, image.height);
}

function downscaleForPreview(image) {
  if (image.height <= PREVIEW_MAX_HEIGHT) return image;
  const ratio = PREVIEW_MAX_HEIGHT / image.height;
  const w = Math.round(image.width * ratio);
  const h = PREVIEW_MAX_HEIGHT;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(image, 0, 0, w, h);
  return c;
}

function nicolosiToEquirectangular(image) {
  const src = getSourceData(image).data;

  const hemi = image.height;
  const outW = hemi * 2;
  const outH = hemi;
  const hemiMax = hemi - 1;
  const stride = hemi * 2;

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = outW;
  outputCanvas.height = outH;
  const outputCtx = outputCanvas.getContext("2d");
  const outputImageData = outputCtx.createImageData(outW, outH);
  const out = outputImageData.data;

  let nx, ny;

  for (let y = 0; y < outH; y++) {
    const phi = HALF_PI - (y / outH) * Math.PI;
    const sinPhi = Math.sin(phi);
    const cosPhi = Math.cos(phi);
    const absPhi = Math.abs(phi);
    const isEquator = phi === 0;
    const isPole = absPhi === HALF_PI;
    const c_phi = (2 * phi) / Math.PI;
    const d_phi =
      isPole || isEquator ? 0 : (1 - c_phi * c_phi) / (sinPhi - c_phi);
    const d2_phi = d_phi * d_phi;
    const outRowBase = y * outW * 4;

    for (let x = 0; x < outW; x++) {
      const lambda = (x / outW) * TWO_PI - Math.PI;
      let localLambda, hemisphereOffset;

      if (lambda < 0) {
        hemisphereOffset = 0;
        localLambda = lambda + HALF_PI;
      } else {
        hemisphereOffset = hemi;
        localLambda = lambda - HALF_PI;
      }

      // Inline nicolosiForward
      const absLambda = Math.abs(localLambda);
      const sign = localLambda > 0 ? 1 : localLambda < 0 ? -1 : 0;

      if (localLambda === 0 || isPole) {
        nx = 0;
        ny = phi * INV_HALF_PI;
      } else if (isEquator) {
        nx = localLambda * INV_HALF_PI;
        ny = 0;
      } else if (absLambda === HALF_PI) {
        nx = localLambda * INV_HALF_PI * cosPhi;
        ny = sign;
      } else {
        const b = Math.PI / (2 * localLambda) - (2 * localLambda) / Math.PI;
        const b2 = b * b;
        const b2d2 = 1 + b2 / d2_phi;
        const d2b2 = 1 + d2_phi / b2;

        const M = ((b * sinPhi) / d_phi - b / 2) / b2d2;
        const N = ((d2_phi * sinPhi) / b2 + d_phi / 2) / d2b2;

        nx = M + Math.sqrt(M * M + (cosPhi * cosPhi) / b2d2) * sign;
        ny =
          N +
          Math.sqrt(
            N * N -
              ((d2_phi * sinPhi * sinPhi) / b2 + d_phi * sinPhi - 1) / d2b2,
          ) *
            (-phi * b > 0 ? 1 : -phi * b < 0 ? -1 : 0) *
            sign;
      }

      if (nx * nx + ny * ny > 1) continue;

      // Inline bilinear sampling
      const px = (nx + 1) * 0.5 * hemiMax;
      const py = (1 - ny) * 0.5 * hemiMax;

      const x0 = px | 0;
      const y0 = py | 0;
      let x1 = x0 + 1;
      if (x1 > hemiMax) x1 = hemiMax;
      let y1 = y0 + 1;
      if (y1 > hemiMax) y1 = hemiMax;

      const dx = px - x0;
      const dy = py - y0;
      const idx1 = dx;
      const idy1 = dy;
      const idx0 = 1 - dx;
      const idy0 = 1 - dy;

      const w00 = idx0 * idy0;
      const w10 = idx1 * idy0;
      const w01 = idx0 * idy1;
      const w11 = idx1 * idy1;

      const i00 = (y0 * stride + x0 + hemisphereOffset) * 4;
      const i10 = (y0 * stride + x1 + hemisphereOffset) * 4;
      const i01 = (y1 * stride + x0 + hemisphereOffset) * 4;
      const i11 = (y1 * stride + x1 + hemisphereOffset) * 4;

      const oi = outRowBase + x * 4;
      out[oi] =
        src[i00] * w00 + src[i10] * w10 + src[i01] * w01 + src[i11] * w11;
      out[oi + 1] =
        src[i00 + 1] * w00 +
        src[i10 + 1] * w10 +
        src[i01 + 1] * w01 +
        src[i11 + 1] * w11;
      out[oi + 2] =
        src[i00 + 2] * w00 +
        src[i10 + 2] * w10 +
        src[i01 + 2] * w01 +
        src[i11 + 2] * w11;
      out[oi + 3] =
        src[i00 + 3] * w00 +
        src[i10 + 3] * w10 +
        src[i01 + 3] * w01 +
        src[i11 + 3] * w11;
    }
  }

  outputCtx.putImageData(outputImageData, 0, 0);
  return outputCanvas;
}

function nicolosiConvertWorker(image) {
  return new Promise(function (resolve, reject) {
    const sourceData = getSourceData(image);
    const hemi = image.height;
    const worker = new Worker("projections/nicolosi-worker.js");
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
    worker.postMessage({ src: sourceData.data, hemi: hemi }, [
      sourceData.data.buffer,
    ]);
  });
}

const nicolosi = {
  id: "nicolosi",
  name: "Nicolosi Globular",
  description: "Two hemispheres side by side (2:1 ratio)",

  renderConfig(container, onChange) {
    container.innerHTML = "";
    this._onChange = onChange;
    this._onInput = null;
  },

  showConfig() {
    if (document.getElementById("nicolosiScale")) return;
    const container = document.getElementById("projectionConfig");
    container.innerHTML = `
      <div class="config-group">
        <label>Scale</label>
        <div class="scale-controls">
          <input type="range" id="nicolosiScale" min="0.5" max="1.5" step="0.001" value="1">
          <input type="number" id="nicolosiScaleInput" min="0.5" max="1.5" step="0.001" value="1">
        </div>
      </div>
      <div class="config-group">
        <label>Offset X</label>
        <div class="scale-controls">
          <input type="range" id="nicolosiOffsetX" min="-100" max="100" step="0.001" value="0">
          <input type="number" id="nicolosiOffsetXInput" min="-100" max="100" step="0.001" value="0">
        </div>
      </div>
      <div class="config-group">
        <label>Offset Y</label>
        <div class="scale-controls">
          <input type="range" id="nicolosiOffsetY" min="-100" max="100" step="0.001" value="0">
          <input type="number" id="nicolosiOffsetYInput" min="-100" max="100" step="0.001" value="0">
        </div>
      </div>
    `;

    const setupControl = (sliderId, inputId, callback) => {
      const slider = document.getElementById(sliderId);
      const input = document.getElementById(inputId);
      slider.addEventListener("input", () => {
        input.value = slider.value;
        if (this._onInput) this._onInput();
      });
      slider.addEventListener("change", () => {
        if (this._onChange) this._onChange();
      });
      input.addEventListener("input", () => {
        slider.value = input.value;
        if (this._onInput) this._onInput();
      });
      input.addEventListener("change", () => {
        if (this._onChange) this._onChange();
      });
    };

    setupControl("nicolosiScale", "nicolosiScaleInput");
    setupControl("nicolosiOffsetX", "nicolosiOffsetXInput");
    setupControl("nicolosiOffsetY", "nicolosiOffsetYInput");
  },

  renderInputOverlay(ctx, width, height) {
    const radius = height / 2;
    const leftCenterX = radius;
    const rightCenterX = width - radius;
    const centerY = radius;

    const overlay = document.createElement("canvas");
    overlay.width = width;
    overlay.height = height;
    const oCtx = overlay.getContext("2d");

    oCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
    oCtx.fillRect(0, 0, width, height);

    oCtx.globalCompositeOperation = "destination-out";
    oCtx.fillStyle = "black";
    oCtx.beginPath();
    oCtx.arc(leftCenterX, centerY, radius, 0, 2 * Math.PI);
    oCtx.fill();
    oCtx.beginPath();
    oCtx.arc(rightCenterX, centerY, radius, 0, 2 * Math.PI);
    oCtx.fill();

    ctx.drawImage(overlay, 0, 0);
  },

  getConfig() {
    const scaleSlider = document.getElementById("nicolosiScale");
    const offsetXSlider = document.getElementById("nicolosiOffsetX");
    const offsetYSlider = document.getElementById("nicolosiOffsetY");
    return {
      scale: scaleSlider ? parseFloat(scaleSlider.value) : 1,
      offsetX: offsetXSlider ? parseFloat(offsetXSlider.value) : 0,
      offsetY: offsetYSlider ? parseFloat(offsetYSlider.value) : 0,
    };
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

  convert(image) {
    return nicolosiToEquirectangular(downscaleForPreview(image));
  },

  convertFullRes(image) {
    return nicolosiConvertWorker(image);
  },
};
