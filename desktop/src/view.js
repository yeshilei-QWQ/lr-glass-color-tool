function onDividerMouseDown(e) {
  e.preventDefault();
  const divider = document.getElementById('compareDivider');
  const cl = document.getElementById('compareLeft');
  const mainEl = document.getElementById('mainCanvas');
  const onMove = (ev) => {
    const rect = mainEl.getBoundingClientRect();
    let ratio = (ev.clientX - rect.left) / rect.width;
    ratio = Math.max(0.05, Math.min(0.95, ratio));
    splitRatio = ratio;
    cl.style.width = (ratio * 100) + '%';
    divider.style.left = (ratio * 100) + '%';
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function setupCanvas() {
  document.getElementById('emptyState').classList.add('hidden');
  const wrap = document.getElementById('canvasWrap');
  const viewport = document.getElementById('viewport');
  wrap.classList.remove('hidden');

  const main = document.getElementById('mainCanvas');
  main.width = imageWidth; main.height = imageHeight;
  const orig = document.getElementById('origCanvas');
  orig.width = imageWidth; orig.height = imageHeight;
  const octx = orig.getContext('2d');
  octx.putImageData(new ImageData(new Uint8ClampedArray(sourceData.data), imageWidth, imageHeight), 0, 0);
  zoomMode = 'fit';
  applyZoom();

  document.getElementById('imgInfo').textContent = imageWidth + ' x ' + imageHeight + 'px';

  const divider = document.getElementById('compareDivider');
  const cl = document.getElementById('compareLeft');

  divider.removeEventListener('mousedown', onDividerMouseDown);
  divider.addEventListener('mousedown', onDividerMouseDown);

  divider.style.left = '50%';
  cl.style.width = '50%';
  setViewMode('original', document.getElementById('viewOriginal'));
}

// ================== 视图模式 ==================
function setViewMode(mode, btn) {
  viewMode = mode;
  exitPreview();
  document.querySelectorAll('.view-controls .btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  document.getElementById('splitHint').style.display = mode === 'split' ? 'block' : 'none';
  const hh = document.getElementById('holdHint');
  if (hh) hh.style.display = mode === 'edited' ? 'block' : 'none';
  const cl = document.getElementById('compareLeft');
  const divider = document.getElementById('compareDivider');
  if (mode === 'split') {
    cl.style.display = 'block';
    divider.style.display = 'block';
    cl.style.width = (splitRatio * 100) + '%';
    divider.style.left = (splitRatio * 100) + '%';
  } else {
    cl.style.display = 'none';
    divider.style.display = 'none';
  }
  render();
}

function resetSplit() {
  splitRatio = 0.5;
  exitPreview();
  document.getElementById('compareLeft').style.width = '50%';
  document.getElementById('compareDivider').style.left = '50%';
  render();
}

// ================== 预览缩放 ==================
function applyZoom() {
  const main = document.getElementById('mainCanvas');
  if (!main || !sourceData) return;
  const orig = document.getElementById('origCanvas');
  let s = zoom;
  if (zoomMode === 'fit') {
    const viewport = document.getElementById('viewport');
    const vw = viewport.clientWidth, vh = viewport.clientHeight;
    const p = Math.min((vw - 40) / imageWidth, (vh - 40) / imageHeight);
    fitScale = Math.max(0.02, p);
    s = fitScale;
  } else if (zoomMode === 'actual') { s = 1; }
  const dispW = Math.floor(imageWidth * s);
  const dispH = Math.floor(imageHeight * s);
  main.style.width = dispW + 'px';
  main.style.height = dispH + 'px';
  if (orig) { orig.style.width = dispW + 'px'; orig.style.height = dispH + 'px'; }
  applyPan();
  updateZoomLabel();
}
function setZoom(mode, val) {
  if (!sourceData) { showToast('\u8bf7\u5148\u6253\u5f00\u56fe\u7247'); return; }
  zoomMode = mode;
  if (mode === 'custom' && val) zoom = val;
  applyZoom();
  render();
}
function zoomIn() {
  if (!sourceData) { showToast('\u8bf7\u5148\u6253\u5f00\u56fe\u7247'); return; }
  zoomMode = 'custom';
  zoom = Math.min(8, (zoom || 1) * 1.25);
  applyZoom(); render();
}
function zoomOut() {
  if (!sourceData) { showToast('\u8bf7\u5148\u6253\u5f00\u56fe\u7247'); return; }
  zoomMode = 'custom';
  zoom = Math.max(0.05, (zoom || 1) / 1.25);
  applyZoom(); render();
}
function zoomFit() { setZoom('fit'); }
function zoomActual() { setZoom('actual'); }
function updateZoomLabel() {
  const el = document.getElementById('zoomLabel'); if (!el) return;
  const v = zoomMode === 'fit' ? fitScale : (zoomMode === 'actual' ? 1 : zoom);
  el.textContent = Math.round(v * 100) + '%';
}

// ================== 长按看原图（调整视图下按住画布临时显示原图） ==================
let holdPrev = null;
function panViewportSize() {
  const viewport = document.getElementById('viewport');
  return { w: viewport.clientWidth, h: viewport.clientHeight };
}
function currentScale() {
  if (zoomMode === 'fit') return fitScale;
  if (zoomMode === 'actual') return 1;
  return zoom;
}
function isPanEnabled() {
  if (!sourceData) return false;
  const v = panViewportSize();
  return Math.floor(imageWidth * currentScale()) > v.w || Math.floor(imageHeight * currentScale()) > v.h;
}
function clampPan() {
  const v = panViewportSize();
  const dw = Math.floor(imageWidth * currentScale());
  const dh = Math.floor(imageHeight * currentScale());
  // 以居中为基准的对称边界：图像任一边缘可平移到视口对应边缘
  const hx = (dw - v.w) / 2, hy = (dh - v.h) / 2;
  if (dw <= v.w) panX = 0; else panX = Math.max(-hx, Math.min(hx, panX));
  if (dh <= v.h) panY = 0; else panY = Math.max(-hy, Math.min(hy, panY));
}
function applyPan() {
  panEnabled = isPanEnabled();
  if (!panEnabled) { panX = 0; panY = 0; }
  clampPan();
  const wrap = document.getElementById('canvasWrap');
  if (!wrap) return;
  wrap.style.transform = 'translate(calc(-50% + ' + panX + 'px), calc(-50% + ' + panY + 'px))';
}
/** Lightroom 手感：长按看原图 + 拖动平移 + 滚轮缩放（跟随鼠标） */
function initViewportGestures() {
  const wrap = document.getElementById('canvasWrap');
  if (!wrap) return;
  let drag = null;
  wrap.addEventListener('mousedown', function (ev) {
    if (ev.button !== 0) return;
    if (ev.target && ev.target.closest && (ev.target.closest('button') || ev.target.closest('.compare-divider'))) return;
    drag = { x: ev.clientX, y: ev.clientY, px: panX, py: panY, moved: false, held: false };
    const movable = isPanEnabled();
    if (viewMode === 'edited' && !movable) {
      drag.held = true;
      holdPrev = viewMode;
      viewMode = 'original';
      exitPreview();
      render();
    }
    function onMove(ee) {
      const dx = ee.clientX - drag.x, dy = ee.clientY - drag.y;
      if (!drag.moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
        drag.moved = true;
        if (drag.held) { drag.held = false; holdPrev = null; viewMode = 'edited'; render(); }
      }
      if (drag.moved && movable) {
        // Lightroom 手感：拖动过程自由跟手，不硬 clamp；松手后再归位到有效边界
        panX = drag.px + dx; panY = drag.py + dy;
        var wT = document.getElementById('canvasWrap');
        if (wT) wT.style.transform = 'translate(calc(-50% + ' + panX + 'px), calc(-50% + ' + panY + 'px))';
      }
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      clampPan(); applyPan();
      if (drag.held && holdPrev !== null) { viewMode = holdPrev; holdPrev = null; render(); }
      drag = null;
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  wrap.addEventListener('wheel', function (ev) {
    if (!sourceData) return;
    ev.preventDefault();
    const vpRect = document.getElementById('viewport').getBoundingClientRect();
    const vx = ev.clientX - vpRect.left, vy = ev.clientY - vpRect.top;
    const cur = currentScale();
    const ns = Math.max(0.05, Math.min(8, cur * (ev.deltaY < 0 ? 1.25 : 1 / 1.25)));
    const dw0 = Math.max(1, Math.floor(imageWidth * cur)), dh0 = Math.max(1, Math.floor(imageHeight * cur));
    const dw1 = Math.max(1, Math.floor(imageWidth * ns)), dh1 = Math.max(1, Math.floor(imageHeight * ns));
    const cX = (vpRect.width - dw0) / 2 + panX, cY = (vpRect.height - dh0) / 2 + panY;
    const ppX = (vx - cX) / cur, ppY = (vy - cY) / cur;
    panX = vx - ppX * ns - (vpRect.width - dw1) / 2;
    panY = vy - ppY * ns - (vpRect.height - dh1) / 2;
    zoomMode = 'custom'; zoom = ns;
    applyZoom();
  }, { passive: false });
}