function mercatorToEquirectangular(image) {
  const src = ProjectionUtils.getSourceData(image).data;
  const result = mercatorConvertPixels(src, image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = result.width;
  canvas.height = result.height;
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(result.width, result.height);
  imgData.data.set(result.out);
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

const mercator = {
  id: "mercator",
  name: "Mercator",
  description: "Square mercator projected map",

  renderConfig(container) {
    container.innerHTML = "";
  },

  getConfig() {
    return {};
  },

  convert(image) {
    return mercatorToEquirectangular(
      ProjectionUtils.downscaleForPreview(image),
    );
  },

  convertFullRes(image) {
    return ProjectionUtils.convertWithWorker(
      image,
      "projections/mercator/mercator-worker.js",
      function (sourceData, img) {
        return {
          data: { src: sourceData.data, width: img.width, height: img.height },
          transfer: [sourceData.data.buffer],
        };
      },
    );
  },
};
