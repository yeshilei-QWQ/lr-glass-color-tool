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
function initHoldComparison() {
  const main = document.getElementById('mainCanvas');
  if (!main) return;
  function release(ev) {
    document.removeEventListener('mouseup', release);
    if (holdPrev !== null) { viewMode = holdPrev; holdPrev = null; render(); }
  }
  main.addEventListener('mousedown', function (ev) {
    if (viewMode === 'original' || viewMode !== 'edited') return;
    holdPrev = viewMode;
    viewMode = 'original';
    exitPreview();
    render();
    document.addEventListener('mouseup', release);
  });
}