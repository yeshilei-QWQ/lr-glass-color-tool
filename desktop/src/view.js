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

  const vw = viewport.clientWidth, vh = viewport.clientHeight;
  const scale = Math.min((vw - 40) / imageWidth, (vh - 40) / imageHeight, 2);
  const dispW = Math.floor(imageWidth * scale);
  const dispH = Math.floor(imageHeight * scale);

  const main = document.getElementById('mainCanvas');
  main.width = imageWidth; main.height = imageHeight;
  main.style.width = dispW + 'px';
  main.style.height = dispH + 'px';

  const orig = document.getElementById('origCanvas');
  orig.width = imageWidth; orig.height = imageHeight;
  orig.style.width = dispW + 'px';
  orig.style.height = dispH + 'px';
  const octx = orig.getContext('2d');
  octx.putImageData(new ImageData(new Uint8ClampedArray(sourceData.data), imageWidth, imageHeight), 0, 0);

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

