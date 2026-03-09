importScripts("winkel-tripel-core.js");

self.onmessage = function (e) {
  const result = winkelTripelConvertPixels(
    e.data.src,
    e.data.width,
    e.data.height,
  );
  self.postMessage(result, [result.out.buffer]);
};
