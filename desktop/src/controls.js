function bindSliders() {
  document.querySelectorAll('.sidebar-left input[type=range]').forEach(el => {
    const key = el.id;
    params[key] = parseFloat(el.value);
    updateValueLabel(key);

    el.addEventListener('input', () => {
      params[key] = parseFloat(el.value);
      updateValueLabel(key);
      render();
    });
    el.addEventListener('change', () => {
      if (isRestoring) return;
      const delta = params[key];
      pushHistory(PARAM_LABELS[key] + ' = ' + fmtVal(key, delta));
    });
  });
}

function updateValueLabel(key) {
  const el = document.getElementById('v-' + key);
  if (el) el.textContent = (params[key] > 0 ? '+' : '') + params[key];
}

function syncSlidersFromParams() {
  Object.keys(params).forEach(k => {
    const el = document.getElementById(k);
    if (el) el.value = params[k];
    updateValueLabel(k);
  });
}

function resetGroup(keys) {
  if (!sourceData) { showToast('请先打开图片'); return; }
  keys.forEach(k => { params[k] = 0; });
  syncSlidersFromParams();
  pushHistory('重置整组');
  render();
}
// ================== 图片加载 ==================
function handleFile(event) {
  const file = event.target.files[0];
  if (file) loadImageFromFile(file);
  event.target.value = '';
}

function handleDrop(event) {
  event.preventDefault();
  document.getElementById('dropOverlay').classList.add('hidden');
  const file = event.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadImageFromFile(file);
  else showToast('仅支持图片文件');
}

function loadImageFromFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 2048;
      let w = img.naturalWidth, h = img.naturalHeight;
      if (w > MAX || h > MAX) {
        const ratio = Math.min(MAX / w, MAX / h);
        w = Math.floor(w * ratio);
        h = Math.floor(h * ratio);
      }
      imageWidth = w; imageHeight = h;
      sourceData = getImageData(img, w, h);
      // 修复：先初始化画布尺寸，再触发渲染，避免 putImageData 尺寸不匹配抛 IndexSizeError
      setupCanvas();
      resetAll(false);
      pushHistory('导入图片');
      render();
      renderPresets();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function getImageData(img, w, h) {
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  const ctx = off.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}
