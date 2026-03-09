const WINKEL_PHI1 = Math.acos(2 / Math.PI);
const WINKEL_COS_PHI1 = 2 / Math.PI;
// Max extents: at equator lambda=pi → x_max = (2+pi)/2; at pole → y_max = pi/2
const WINKEL_X_MAX = (2 + Math.PI) / 2;
const WINKEL_Y_MAX = Math.PI / 2;

function winkelTripelForward(lambda, phi) {
  const cosPhi = Math.cos(phi);
  const cosHalfLambda = Math.cos(lambda / 2);
  const alpha = Math.acos(cosPhi * cosHalfLambda);

  let sincAlpha;
  if (alpha === 0) {
    sincAlpha = 1;
  } else {
    sincAlpha = Math.sin(alpha) / alpha;
  }

  const xAitoff = (2 * cosPhi * Math.sin(lambda / 2)) / sincAlpha;
  const yAitoff = Math.sin(phi) / sincAlpha;

  return {
    x: (lambda * WINKEL_COS_PHI1 + xAitoff) / 2,
    y: (phi + yAitoff) / 2,
  };
}

function winkelTripelConvertPixels(src, srcW, srcH) {
  const srcWmax = srcW - 1;
  const srcHmax = srcH - 1;
  const outW = srcW;
  const outH = Math.round(srcW / 2);
  const out = new Uint8ClampedArray(outW * outH * 4);

  for (let y = 0; y < outH; y++) {
    const phi = Math.PI / 2 - (y / outH) * Math.PI;
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);
    const outRowBase = y * outW * 4;

    for (let x = 0; x < outW; x++) {
      const lambda = (x / outW) * 2 * Math.PI - Math.PI;

      const cosHalfLambda = Math.cos(lambda / 2);
      const alpha = Math.acos(cosPhi * cosHalfLambda);

      let sincAlpha;
      if (alpha === 0) {
        sincAlpha = 1;
      } else {
        sincAlpha = Math.sin(alpha) / alpha;
      }

      const xAitoff = (2 * cosPhi * Math.sin(lambda / 2)) / sincAlpha;
      const yAitoff = sinPhi / sincAlpha;

      const xW = (lambda * WINKEL_COS_PHI1 + xAitoff) / 2;
      const yW = (phi + yAitoff) / 2;

      const px = (xW / WINKEL_X_MAX + 1) * 0.5 * srcWmax;
      const py = (1 - yW / WINKEL_Y_MAX) * 0.5 * srcHmax;

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
