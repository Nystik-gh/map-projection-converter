const HALF_PI = Math.PI / 2;
const TWO_PI = Math.PI * 2;
const INV_HALF_PI = 1 / HALF_PI;

function nicolosiToEquirectangular(image) {
  const src = ProjectionUtils.getSourceData(image).data;

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

const nicolosi = {
  id: "nicolosi",
  name: "Nicolosi Globular",
  description: "Two hemispheres side by side (2:1 ratio)",

  renderConfig(container, onChange) {
    ProjectionUtils.renderConfig(this, container, onChange);
  },

  showConfig() {
    ProjectionUtils.showSliders(this, "nicolosi");
  },

  renderInputOverlay(ctx, width, height) {
    ProjectionUtils.renderOverlayMask(
      ctx,
      width,
      height,
      function (oCtx, w, h) {
        const radius = h / 2;
        oCtx.beginPath();
        oCtx.arc(radius, radius, radius, 0, 2 * Math.PI);
        oCtx.fill();
        oCtx.beginPath();
        oCtx.arc(w - radius, radius, radius, 0, 2 * Math.PI);
        oCtx.fill();
      },
    );
  },

  getConfig() {
    return ProjectionUtils.getSliderConfig("nicolosi");
  },

  prepareImage(image, config) {
    return ProjectionUtils.prepareImage(image, config);
  },

  convert(image) {
    return nicolosiToEquirectangular(
      ProjectionUtils.downscaleForPreview(image),
    );
  },

  convertFullRes(image) {
    return ProjectionUtils.convertWithWorker(
      image,
      "projections/nicolosi-worker.js",
      function (sourceData, img) {
        return {
          data: { src: sourceData.data, hemi: img.height },
          transfer: [sourceData.data.buffer],
        };
      },
    );
  },
};
