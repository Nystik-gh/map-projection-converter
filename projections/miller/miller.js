function millerToEquirectangular(image) {
  const src = ProjectionUtils.getSourceData(image).data;
  const result = millerConvertPixels(src, image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = result.width;
  canvas.height = result.height;
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(result.width, result.height);
  imgData.data.set(result.out);
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

const miller = {
  id: "miller",
  name: "Miller",
  description: "Miller cylindrical whole-world projection",

  renderConfig(container, onChange) {
    ProjectionUtils.renderConfig(this, container, onChange);
  },

  showConfig() {
    ProjectionUtils.showSliders(this, "miller");
  },

  getConfig() {
    return ProjectionUtils.getSliderConfig("miller");
  },

  prepareImage(image, config) {
    return ProjectionUtils.prepareImage(
      image,
      config,
      MILLER_X_MAX / MILLER_Y_MAX,
    );
  },

  convert(image) {
    return millerToEquirectangular(
      ProjectionUtils.downscaleForPreview(image),
    );
  },

  convertFullRes(image) {
    return ProjectionUtils.convertWithWorker(
      image,
      "projections/miller/miller-worker.js",
      function (sourceData, img) {
        return {
          data: { src: sourceData.data, width: img.width, height: img.height },
          transfer: [sourceData.data.buffer],
        };
      },
    );
  },
};
