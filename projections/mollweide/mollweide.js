function mollweideToEquirectangular(image) {
  const src = ProjectionUtils.getSourceData(image).data;
  const result = mollweideConvertPixels(src, image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = result.width;
  canvas.height = result.height;
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(result.width, result.height);
  imgData.data.set(result.out);
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

const mollweide = {
  id: "mollweide",
  name: "Mollweide",
  description: "Equal-area pseudocylindrical whole-world projection",

  renderConfig(container, onChange) {
    ProjectionUtils.renderConfig(this, container, onChange);
  },

  showConfig() {
    ProjectionUtils.showSliders(this, "mollweide");
  },

  renderInputOverlay(ctx, width, height) {
    ProjectionUtils.renderOverlayMask(
      ctx,
      width,
      height,
      function (oCtx, w, h) {
        oCtx.beginPath();
        // Right boundary (lambda = pi), top to bottom
        for (let lat = 90; lat >= -90; lat--) {
          const phi = (lat * Math.PI) / 180;
          const pt = mollweideForward(Math.PI, phi);
          const px = (pt.x / MOLLWEIDE_X_MAX + 1) * 0.5 * w;
          const py = (1 - pt.y / MOLLWEIDE_Y_MAX) * 0.5 * h;
          if (lat === 90) oCtx.moveTo(px, py);
          else oCtx.lineTo(px, py);
        }
        // Left boundary (lambda = -pi), bottom to top
        for (let lat = -90; lat <= 90; lat++) {
          const phi = (lat * Math.PI) / 180;
          const pt = mollweideForward(-Math.PI, phi);
          const px = (pt.x / MOLLWEIDE_X_MAX + 1) * 0.5 * w;
          const py = (1 - pt.y / MOLLWEIDE_Y_MAX) * 0.5 * h;
          oCtx.lineTo(px, py);
        }
        oCtx.closePath();
        oCtx.fill();
      },
    );
  },

  getConfig() {
    return ProjectionUtils.getSliderConfig("mollweide");
  },

  prepareImage(image, config) {
    return ProjectionUtils.prepareImage(
      image,
      config,
      MOLLWEIDE_X_MAX / MOLLWEIDE_Y_MAX,
    );
  },

  convert(image) {
    return mollweideToEquirectangular(
      ProjectionUtils.downscaleForPreview(image),
    );
  },

  convertFullRes(image) {
    return ProjectionUtils.convertWithWorker(
      image,
      "projections/mollweide/mollweide-worker.js",
      function (sourceData, img) {
        return {
          data: { src: sourceData.data, width: img.width, height: img.height },
          transfer: [sourceData.data.buffer],
        };
      },
    );
  },
};
