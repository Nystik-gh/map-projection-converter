const WEB_MERCATOR_MAX_LATITUDE = 85.05112878;
const BYTES_PER_PIXEL = 4;
const MERCATOR_PREVIEW_MAX_HEIGHT = 1000;

function downscaleMercatorPreview(image) {
  if (image.height <= MERCATOR_PREVIEW_MAX_HEIGHT) return image;
  const ratio = MERCATOR_PREVIEW_MAX_HEIGHT / image.height;
  const w = Math.round(image.width * ratio);
  const h = MERCATOR_PREVIEW_MAX_HEIGHT;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.drawImage(image, 0, 0, w, h);
  return c;
}

function createCanvasFromImage(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0);
  return canvas;
}

function mercatorToEquirectangular(mercatorImage, outputWidth, outputHeight) {
  const sourceCanvas = createCanvasFromImage(mercatorImage);
  const sourceCtx = sourceCanvas.getContext("2d");
  const sourceData = sourceCtx.getImageData(
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
  );

  const { width: sourceWidth, height: sourceHeight } = sourceCanvas;

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;
  const outputCtx = outputCanvas.getContext("2d");
  const outputImageData = outputCtx.createImageData(outputWidth, outputHeight);

  const maxLatRad = (WEB_MERCATOR_MAX_LATITUDE * Math.PI) / 180;
  const mercatorYMax = Math.log(Math.tan(Math.PI / 4 + maxLatRad / 2));

  for (let y = 0; y < outputHeight; y++) {
    const latitude = Math.PI / 2 - (y / outputHeight) * Math.PI;

    for (let x = 0; x < outputWidth; x++) {
      const longitude = (x / outputWidth) * 2 * Math.PI - Math.PI;

      const mercatorX = (longitude + Math.PI) / (2 * Math.PI);
      const mercatorY =
        (mercatorYMax - Math.log(Math.tan(Math.PI / 4 + latitude / 2))) /
        (2 * mercatorYMax);

      const sourceX = Math.floor(mercatorX * sourceWidth);
      const sourceY = Math.floor(mercatorY * sourceHeight);

      if (
        sourceX >= 0 &&
        sourceX < sourceWidth &&
        sourceY >= 0 &&
        sourceY < sourceHeight
      ) {
        const sourceIndex = (sourceY * sourceWidth + sourceX) * BYTES_PER_PIXEL;
        const outputIndex = (y * outputWidth + x) * BYTES_PER_PIXEL;

        outputImageData.data[outputIndex] = sourceData.data[sourceIndex];
        outputImageData.data[outputIndex + 1] =
          sourceData.data[sourceIndex + 1];
        outputImageData.data[outputIndex + 2] =
          sourceData.data[sourceIndex + 2];
        outputImageData.data[outputIndex + 3] =
          sourceData.data[sourceIndex + 3];
      }
    }
  }

  outputCtx.putImageData(outputImageData, 0, 0);
  return outputCanvas;
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
    const preview = downscaleMercatorPreview(image);
    const outputWidth = preview.width;
    const outputHeight = Math.round(outputWidth / 2);
    return mercatorToEquirectangular(preview, outputWidth, outputHeight);
  },
};
