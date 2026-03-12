importScripts("mollweide-core.js");

self.onmessage = function (e) {
  const result = mollweideConvertPixels(e.data.src, e.data.width, e.data.height);
  self.postMessage(result, [result.out.buffer]);
};
