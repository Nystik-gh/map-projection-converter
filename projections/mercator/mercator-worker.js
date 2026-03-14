importScripts("mercator-core.js");

self.onmessage = function (e) {
  const result = mercatorConvertPixels(e.data.src, e.data.width, e.data.height);
  self.postMessage(result, [result.out.buffer]);
};
