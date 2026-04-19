function createGlobePreview(canvasEl, sourceCanvas) {
  const state = {
    lon: 0,
    lat: 0,
    raf: 0,
    last: 0,
    srcData: null,
    srcW: 0,
    srcH: 0,
    dragging: false,
    autoRotate: true,
    lastX: 0,
    lastY: 0,
  };

  const DPR = Math.min(1.5, window.devicePixelRatio || 1);

  function resize() {
    const parent = canvasEl.parentElement;

    if (!parent) return;

    const size = Math.min(parent.clientWidth, parent.clientHeight);
    const px = Math.max(80, Math.floor(size));
    canvasEl.width = Math.floor(px * DPR);
    canvasEl.height = Math.floor(px * DPR);
    canvasEl.style.width = px + 'px';
    canvasEl.style.height = px + 'px';
  }

  resize();

  const ro = new ResizeObserver(resize);

  if (canvasEl.parentElement) {
    ro.observe(canvasEl.parentElement);
  }

  const ctx = canvasEl.getContext('2d');

  function setSource(src) {
    if (!src) {
      state.srcData = null;
      return;
    }

    const srcW = 480;
    const srcH = 240;
    const off = document.createElement('canvas');
    off.width = srcW;
    off.height = srcH;
    const octx = off.getContext('2d');
    octx.drawImage(src, 0, 0, srcW, srcH);
    state.srcData = octx.getImageData(0, 0, srcW, srcH).data;
    state.srcW = srcW;
    state.srcH = srcH;
  }

  function render() {
    if (!state.srcData) return;

    const W = canvasEl.width;
    const H = canvasEl.height;
    const R = W / 2 - 2;
    const cx = W / 2;
    const cy = H / 2;
    const lon0 = state.lon * Math.PI / 180;
    const lat0 = state.lat * Math.PI / 180;
    const cosLat0 = Math.cos(lat0);
    const sinLat0 = Math.sin(lat0);
    const img = ctx.createImageData(W, H);
    const data = img.data;
    const srcData = state.srcData;
    const srcW = state.srcW;
    const srcH = state.srcH;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const dx = (x - cx) / R;
        const dy = (cy - y) / R;
        const rho2 = dx * dx + dy * dy;
        const i = (y * W + x) * 4;

        if (rho2 > 1) {
          data[i + 3] = 0;
          continue;
        }

        const rho = Math.sqrt(rho2);
        const c = Math.asin(rho);
        const cosC = Math.cos(c);
        const sinC = Math.sin(c);
        let lat, lon;

        if (rho === 0) {
          lat = lat0;
          lon = lon0;
        } else {
          lat = Math.asin(cosC * sinLat0 + (dy * sinC * cosLat0) / rho);
          lon = lon0 + Math.atan2(dx * sinC, rho * cosLat0 * cosC - dy * sinLat0 * sinC);
        }

        while (lon > Math.PI) lon -= 2 * Math.PI;
        while (lon < -Math.PI) lon += 2 * Math.PI;

        const u = ((lon + Math.PI) / (2 * Math.PI)) * srcW;
        const v = ((Math.PI / 2 - lat) / Math.PI) * srcH;
        const ix = Math.min(srcW - 1, Math.max(0, Math.floor(u)));
        const iy = Math.min(srcH - 1, Math.max(0, Math.floor(v)));
        const si = (iy * srcW + ix) * 4;
        const shade = Math.max(0.55, Math.sqrt(1 - rho2) + 0.1);
        data[i]     = Math.min(255, srcData[si]     * shade);
        data[i + 1] = Math.min(255, srcData[si + 1] * shade);
        data[i + 2] = Math.min(255, srcData[si + 2] * shade);
        data[i + 3] = 255;
      }
    }

    ctx.putImageData(img, 0, 0);
  }

  function tick(t) {
    const last = state.last || t;
    const dt = (t - last) / 1000;
    state.last = t;

    if (state.autoRotate && !state.dragging) {
      state.lon = (state.lon + dt * 14) % 360;
    }

    render();
    state.raf = requestAnimationFrame(tick);
  }

  state.raf = requestAnimationFrame(tick);

  function pointerXY(e) {
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }

    return { x: e.clientX, y: e.clientY };
  }

  function onDown(e) {
    const p = pointerXY(e);
    state.dragging = true;
    state.autoRotate = false;
    state.lastX = p.x;
    state.lastY = p.y;
  }

  function onMove(e) {
    if (!state.dragging) return;

    const p = pointerXY(e);
    state.lon += (p.x - state.lastX) * 0.4;
    state.lat = Math.max(-85, Math.min(85, state.lat - (p.y - state.lastY) * 0.4));
    state.lastX = p.x;
    state.lastY = p.y;
  }

  function onUp() {
    state.dragging = false;
  }

  canvasEl.addEventListener('mousedown', onDown);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onUp);
  canvasEl.addEventListener('touchstart', onDown, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('touchend', onUp);

  if (sourceCanvas) setSource(sourceCanvas);

  function destroy() {
    cancelAnimationFrame(state.raf);
    ro.disconnect();
    canvasEl.removeEventListener('mousedown', onDown);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseup', onUp);
    canvasEl.removeEventListener('touchstart', onDown);
    window.removeEventListener('touchmove', onMove);
    window.removeEventListener('touchend', onUp);
  }

  return { setSource, destroy };
}
