const POLAR_AE_HALF_PI = Math.PI / 2;
const POLAR_AE_TWO_PI = Math.PI * 2;

// Two polar azimuthal equidistant discs side by side: the northern hemisphere on the
// left, the southern on the right, the Equator as each rim. The discs meet at one
// point on the Equator, at longitude centralMeridian (radians).
function polarAzimuthalEquidistantConvertPixels(src, hemi, centralMeridian) {
  const outW = hemi * 2;
  const outH = hemi;
  const hemiMax = hemi - 1;
  const stride = hemi * 2;
  const out = new Uint8ClampedArray(outW * outH * 4);

  for (let y = 0; y < outH; y++) {
    const phi = POLAR_AE_HALF_PI - (y / outH) * Math.PI;
    const north = phi >= 0;
    const radius = (POLAR_AE_HALF_PI - Math.abs(phi)) / POLAR_AE_HALF_PI;
    const hemisphereOffset = north ? 0 : hemi;
    const outRowBase = y * outW * 4;

    for (let x = 0; x < outW; x++) {
      const lambda = (x / outW) * POLAR_AE_TWO_PI - Math.PI;

      // Longitude runs counterclockwise around the North Pole and clockwise around
      // the South Pole. The discs meet on the right edge of the left disc and the
      // left edge of the right disc.
      const theta = north ? lambda - centralMeridian : Math.PI - (lambda - centralMeridian);
      const nx = radius * Math.cos(theta);
      const ny = radius * Math.sin(theta);

      const px = (nx + 1) * 0.5 * hemiMax;
      const py = (1 - ny) * 0.5 * hemiMax;

      const x0 = px | 0;
      const y0 = py | 0;
      let x1 = x0 + 1;
      if (x1 > hemiMax) {
        x1 = hemiMax;
      }

      let y1 = y0 + 1;
      if (y1 > hemiMax) {
        y1 = hemiMax;
      }

      const dx = px - x0;
      const dy = py - y0;
      const w00 = (1 - dx) * (1 - dy);
      const w10 = dx * (1 - dy);
      const w01 = (1 - dx) * dy;
      const w11 = dx * dy;

      const i00 = (y0 * stride + x0 + hemisphereOffset) * 4;
      const i10 = (y0 * stride + x1 + hemisphereOffset) * 4;
      const i01 = (y1 * stride + x0 + hemisphereOffset) * 4;
      const i11 = (y1 * stride + x1 + hemisphereOffset) * 4;

      const oi = outRowBase + x * 4;
      for (let c = 0; c < 4; c++) {
        out[oi + c] =
          src[i00 + c] * w00 + src[i10 + c] * w10 + src[i01 + c] * w01 + src[i11 + c] * w11;
      }
    }
  }

  return { out: out, width: outW, height: outH };
}
