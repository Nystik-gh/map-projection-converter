importScripts("nicolosi-core.js");

self.onmessage = function (e) {
  const result = nicolosiConvertPixels(e.data.src, e.data.hemi);
  self.postMessage(result, [result.out.buffer]);
};
