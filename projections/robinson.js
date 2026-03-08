// Robinson lookup table at 5° intervals (0° to 90°)
const ROBINSON_X = [
  1.0, 0.9986, 0.9954, 0.99, 0.9822, 0.973, 0.96, 0.9427, 0.9216, 0.8962,
  0.8679, 0.835, 0.7986, 0.7597, 0.7186, 0.6732, 0.6213, 0.5722, 0.5322,
];
const ROBINSON_Y = [
  0.0, 0.062, 0.124, 0.186, 0.248, 0.31, 0.372, 0.434, 0.4958, 0.5571, 0.6176,
  0.6769, 0.7346, 0.7903, 0.8435, 0.8936, 0.9394, 0.9761, 1.0,
];

const ROBINSON_X_MAX = 0.8487 * Math.PI;
const ROBINSON_Y_MAX = 1.3523;

function robinsonInterpolate(absPhiDeg) {
  const index = Math.min(absPhiDeg, 90) / 5;
  const i = Math.min(17, index | 0);
  const t = index - i;
  return {
    plen: ROBINSON_X[i] + (ROBINSON_X[i + 1] - ROBINSON_X[i]) * t,
    pdfe: ROBINSON_Y[i] + (ROBINSON_Y[i + 1] - ROBINSON_Y[i]) * t,
  };
}

function robinsonForward(lambda, phi) {
  const absPhiDeg = Math.abs(phi) * (180 / Math.PI);
  const r = robinsonInterpolate(absPhiDeg);
  return {
    x: 0.8487 * lambda * r.plen,
    y: ROBINSON_Y_MAX * r.pdfe * (phi >= 0 ? 1 : -1),
  };
}

function robinsonToEquirectangular(image) {
  const src = ProjectionUtils.getSourceData(image).data;
  const srcW = image.width;
  const srcH = image.height;
  const srcWmax = srcW - 1;
  const srcHmax = srcH - 1;

  const outW = srcW;
  const outH = Math.round(srcW / 2);

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = outW;
  outputCanvas.height = outH;
  const outputCtx = outputCanvas.getContext("2d");
  const outputImageData = outputCtx.createImageData(outW, outH);
  const out = outputImageData.data;

  for (let y = 0; y < outH; y++) {
    const phi = Math.PI / 2 - (y / outH) * Math.PI;
    const absPhiDeg = Math.abs(phi) * (180 / Math.PI);
    const r = robinsonInterpolate(absPhiDeg);
    const yRob = ROBINSON_Y_MAX * r.pdfe * (phi >= 0 ? 1 : -1);
    const py = (1 - yRob / ROBINSON_Y_MAX) * 0.5 * srcHmax;
    const outRowBase = y * outW * 4;

    for (let x = 0; x < outW; x++) {
      const lambda = (x / outW) * 2 * Math.PI - Math.PI;
      const xRob = 0.8487 * lambda * r.plen;
      const px = (xRob / ROBINSON_X_MAX + 1) * 0.5 * srcWmax;

      if (px < 0 || px > srcWmax || py < 0 || py > srcHmax) continue;

      const x0 = px | 0;
      const y0 = py | 0;
      let x1 = x0 + 1;
      if (x1 > srcWmax) x1 = srcWmax;
      let y1 = y0 + 1;
      if (y1 > srcHmax) y1 = srcHmax;

      const dx = px - x0;
      const dy = py - y0;
      const w00 = (1 - dx) * (1 - dy);
      const w10 = dx * (1 - dy);
      const w01 = (1 - dx) * dy;
      const w11 = dx * dy;

      const i00 = (y0 * srcW + x0) * 4;
      const i10 = (y0 * srcW + x1) * 4;
      const i01 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;

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

const robinson = {
  id: "robinson",
  name: "Robinson",
  description: "Pseudocylindrical whole-world projection",

  renderConfig(container, onChange) {
    ProjectionUtils.renderConfig(this, container, onChange);
  },

  showConfig() {
    ProjectionUtils.showSliders(this, "robinson");
  },

  renderInputOverlay(ctx, width, height) {
    ProjectionUtils.renderOverlayMask(
      ctx,
      width,
      height,
      function (oCtx, w, h) {
        const xMax = ROBINSON_X_MAX;
        const yMax = ROBINSON_Y_MAX;

        oCtx.beginPath();
        // Right boundary (lambda = pi), top to bottom
        for (let lat = 90; lat >= -90; lat--) {
          const phi = (lat * Math.PI) / 180;
          const r = robinsonInterpolate(Math.abs(lat));
          const xRob = 0.8487 * Math.PI * r.plen;
          const yRob = yMax * r.pdfe * (phi >= 0 ? 1 : -1);
          const px = (xRob / xMax + 1) * 0.5 * w;
          const py = (1 - yRob / yMax) * 0.5 * h;
          if (lat === 90) oCtx.moveTo(px, py);
          else oCtx.lineTo(px, py);
        }
        // Left boundary (lambda = -pi), bottom to top
        for (let lat = -90; lat <= 90; lat++) {
          const phi = (lat * Math.PI) / 180;
          const r = robinsonInterpolate(Math.abs(lat));
          const xRob = -0.8487 * Math.PI * r.plen;
          const yRob = yMax * r.pdfe * (phi >= 0 ? 1 : -1);
          const px = (xRob / xMax + 1) * 0.5 * w;
          const py = (1 - yRob / yMax) * 0.5 * h;
          oCtx.lineTo(px, py);
        }
        oCtx.closePath();
        oCtx.fill();
      },
    );
  },

  getConfig() {
    return ProjectionUtils.getSliderConfig("robinson");
  },

  prepareImage(image, config) {
    return ProjectionUtils.prepareImage(
      image,
      config,
      ROBINSON_X_MAX / ROBINSON_Y_MAX,
    );
  },

  convert(image) {
    return robinsonToEquirectangular(
      ProjectionUtils.downscaleForPreview(image),
    );
  },

  convertFullRes(image) {
    return ProjectionUtils.convertWithWorker(
      image,
      "projections/robinson-worker.js",
      function (sourceData, img) {
        return {
          data: { src: sourceData.data, width: img.width, height: img.height },
          transfer: [sourceData.data.buffer],
        };
      },
    );
  },
};
