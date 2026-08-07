// ===== 预览渲染调度（rAF 节流）+ 退出预览 =====
let previewRAF = null;
function requestPreviewRender() {
  if (previewRAF) return;
  previewRAF = requestAnimationFrame(function(){ previewRAF = null; render(); });
}
// 退出降采样预览，强制走全分辨率渲染（离散动作前调用）
function exitPreview() { isPreviewRender = false; }
function bindSliders() {
  setupValueInputs();
  document.querySelectorAll('.sidebar-left input[type=range]').forEach(el => {
    const key = el.id;
    params[key] = parseFloat(el.value);
    updateValueLabel(key);

    el.addEventListener('input', () => {
      params[key] = parseFloat(el.value);
      updateValueLabel(key);
      // 拖动中：进入降采样预览（rAF 节流），保证流畅
      isPreviewRender = true;
      requestPreviewRender();
    });
    el.addEventListener('change', () => {
      // 松手：退出预览，做一次全分辨率精确渲染
      exitPreview();
      render();
      if (isRestoring) return;
      const delta = params[key];
      pushHistory(PARAM_LABELS[key] + ' = ' + fmtVal(key, delta));
    });
  });
}

function updateValueLabel(key) {
  const el = document.getElementById('v-' + key);
  if (!el) return;
  const txt = (params[key] > 0 ? '+' : '') + params[key];
  if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = txt;
  else el.textContent = txt;
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
      // 生成降采样预览数据（用于滑块拖动时的流畅预览）
      buildPreviewFromImage(img);
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

// 生成降采样的预览数据（最长边约 PREVIEW_MAX），用于拖动滑块时的流畅预览
const PREVIEW_MAX = 900;
function buildPreviewFromImage(img) {
  const pw = img.naturalWidth, ph = img.naturalHeight;
  const scale = Math.min(1, PREVIEW_MAX / Math.max(pw, ph));
  previewWidth = Math.max(1, Math.floor(pw * scale));
  previewHeight = Math.max(1, Math.floor(ph * scale));
  previewData = getImageData(img, previewWidth, previewHeight);
}
// ===== 数值直接输入：把滑块右侧的值显示改为可编辑输入框 =====
function setupValueInputs() {
  document.querySelectorAll('.control-header .value').forEach(function(sp) {
    if (sp.tagName !== 'SPAN') return; // 已转换过
    const key = sp.id.replace('v-', '');
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'value';
    input.id = sp.id;
    input.dataset.key = key;
    input.inputMode = 'decimal';
    input.autocomplete = 'off';
    input.title = '点击输入精确数值，回车/失焦生效';
    const v = params[key] || 0;
    input.value = v > 0 ? '+' + v : String(v);
    sp.replaceWith(input);

    // 打字实时预览
    input.addEventListener('input', function() {
      const range = document.getElementById(key);
      if (!range) return;
      const min = parseFloat(range.min), max = parseFloat(range.max);
      const raw = parseFloat(input.value);
      if (isNaN(raw)) return;
      const clamped = Math.min(max, Math.max(min, raw));
      params[key] = clamped;
      range.value = clamped;
      isPreviewRender = true;
      requestPreviewRender();
    });
    // 回车提交
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    });
    // 失焦提交（精确渲染 + 历史）
    input.addEventListener('change', function() {
      const range = document.getElementById(key);
      if (!range) return;
      const min = parseFloat(range.min), max = parseFloat(range.max);
      const raw = parseFloat(input.value);
      if (isNaN(raw)) { updateValueLabel(key); return; }
      const clamped = Math.min(max, Math.max(min, raw));
      params[key] = clamped;
      range.value = clamped;
      exitPreview();
      render();
      if (!isRestoring) pushHistory(PARAM_LABELS[key] + ' = ' + fmtVal(key, clamped));
    });
  });
}