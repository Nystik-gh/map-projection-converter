// Miller Cylindrical (1942): y = 1.25 * ln(tan(pi/4 + 0.4 * phi)), x = lambda.
const MILLER_X_MAX = Math.PI;
const MILLER_Y_MAX = 1.25 * Math.log(Math.tan(0.45 * Math.PI));

function millerConvertPixels(src, srcW, srcH) {
  const srcWmax = srcW - 1;
  const srcHmax = srcH - 1;
  const outW = srcW;
  const outH = Math.round(srcW / 2);
  const out = new Uint8ClampedArray(outW * outH * 4);

  for (let y = 0; y < outH; y++) {
    const phi = Math.PI / 2 - (y / outH) * Math.PI;
    const yMiller = 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * phi));
    const py = (1 - yMiller / MILLER_Y_MAX) * 0.5 * srcHmax;
    const outRowBase = y * outW * 4;

    for (let x = 0; x < outW; x++) {
      const lambda = (x / outW) * 2 * Math.PI - Math.PI;
      const px = (lambda / MILLER_X_MAX + 1) * 0.5 * srcWmax;

      if (px < 0 || px > srcWmax || py < 0 || py > srcHmax) continue;

      const x0 = px | 0;
      const y0 = py | 0;
      let x1 = x0 + 1;
      if (x1 > srcWmax) x1 = srcWmax;
      let y1 = y0 + 1;
      if (y1 > srcHmax) y1 = srcHmax;

      const dx = px - x0;
      const dy = py - y0;
      const w00 = (1 - dx) * (1 - dy);
      const w10 = dx * (1 - dy);
      const w01 = (1 - dx) * dy;
      const w11 = dx * dy;

      const i00 = (y0 * srcW + x0) * 4;
      const i10 = (y0 * srcW + x1) * 4;
      const i01 = (y1 * srcW + x0) * 4;
      const i11 = (y1 * srcW + x1) * 4;

      const oi = outRowBase + x * 4;
      out[oi] =
        src[i00] * w00 + src[i10] * w10 + src[i01] * w01 + src[i11] * w11;
      out[oi + 1] =
        src[i00 + 1] * w00 +
        src[i10 + 1] * w10 +
        src[i01 + 1] * w01 +
        src[i11 + 1] * w11;
      out[oi + 2] =
        src[i00 + 2] * w00 +
        src[i10 + 2] * w10 +
        src[i01 + 2] * w01 +
        src[i11 + 2] * w11;
      out[oi + 3] =
        src[i00 + 3] * w00 +
        src[i10 + 3] * w10 +
        src[i01 + 3] * w01 +
        src[i11 + 3] * w11;
    }
  }

  return { out: out, width: outW, height: outH };
}
