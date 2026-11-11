function polarAzimuthalEquidistantToEquirectangular(image, centralMeridian) {
  const src = ProjectionUtils.getSourceData(image).data;
  const result = polarAzimuthalEquidistantConvertPixels(src, image.height, centralMeridian);
  const canvas = document.createElement("canvas");
  canvas.width = result.width;
  canvas.height = result.height;
  const ctx = canvas.getContext("2d");
  const imgData = ctx.createImageData(result.width, result.height);
  imgData.data.set(result.out);
  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

const polarAzimuthalEquidistant = {
  id: "polar-azimuthal-equidistant",
  name: "Polar Azimuthal Equidistant",
  description: "North and south hemispheres side by side (2:1 ratio)",

  renderConfig(container, onChange) {
    ProjectionUtils.renderConfig(this, container, onChange);
  },

  showConfig() {
    ProjectionUtils.showSliders(this, "polarAe", [
      { id: "CentralMeridian", label: "Central meridian", min: -180, max: 180, step: 0.1, value: 0 },
    ]);
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
    return ProjectionUtils.getSliderConfig("polarAe");
  },

  // The longitude, in radians, of the point where the two discs meet.
  centralMeridian() {
    const el = document.getElementById("polarAeCentralMeridian");
    const degrees = el ? parseFloat(el.value) || 0 : 0;
    return (degrees * Math.PI) / 180;
  },

  prepareImage(image, config) {
    return ProjectionUtils.prepareImage(image, config);
  },

  convert(image) {
    return polarAzimuthalEquidistantToEquirectangular(
      ProjectionUtils.downscaleForPreview(image),
      this.centralMeridian(),
    );
  },

  convertFullRes(image) {
    const centralMeridian = this.centralMeridian();
    return ProjectionUtils.convertWithWorker(
      image,
      "projections/polar-azimuthal-equidistant/polar-azimuthal-equidistant-worker.js",
      function (sourceData, img) {
        return {
          data: { src: sourceData.data, hemi: img.height, centralMeridian: centralMeridian },
          transfer: [sourceData.data.buffer],
        };
      },
    );
  },
};
