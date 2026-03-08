function robinsonToEquirectangular(image) {
  const src = ProjectionUtils.getSourceData(image).data;
  const result = robinsonConvertPixels(src, image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = result.width;
  canvas.height = result.height;
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(result.width, result.height);
  imgData.data.set(result.out);
  ctx.putImageData(imgData, 0, 0);
  return canvas;
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
