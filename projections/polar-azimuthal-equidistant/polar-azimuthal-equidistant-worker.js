importScripts("polar-azimuthal-equidistant-core.js");

self.onmessage = function (e) {
  const result = polarAzimuthalEquidistantConvertPixels(e.data.src, e.data.hemi, e.data.centralMeridian);
  self.postMessage(result, [result.out.buffer]);
};
