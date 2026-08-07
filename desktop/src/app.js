/* ================= 补齐：工具 / 预设 / API / 快捷键 / 初始化 ================= */
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 2200);
}

/* 重置全部 */
function resetAll(record) {
  if (!sourceData) { showToast('请先打开图片'); return; }
  Object.keys(params).forEach(function(k){ if (k !== 'blur') params[k] = 0; });
  syncSlidersFromParams();
  if (record) pushHistory('重置全部');
  if (sourceData) render();
}

/* ================= 预设管理 ================= */
let presets = [];
let activeTag = '';
function loadStoredPresets() {
  try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : []; } catch(e) { return []; }
}
function persistPresets() { localStorage.setItem(STORAGE_KEY, JSON.stringify(presets)); updateTagList(); renderPresets(); }
function savePreset() {
  const name = document.getElementById('presetName').value.trim();
  if (!name) { showToast('请填写预设名称'); return; }
  presets.push({
    id: Date.now().toString(),
    name: name,
    params: JSON.parse(JSON.stringify(params)),
    tags: splitTags(document.getElementById('presetTag').value),
    createdAt: new Date().toISOString()
  });
  document.getElementById('presetName').value = '';
  document.getElementById('presetTag').value = '';
  persistPresets();
  showToast('已保存预设');
}
function splitTags(str) { return String(str).split(/[,，;;\s]+/).map(function(t){ return t.trim(); }).filter(Boolean); }
function getAllTags() { const s = new Set(); presets.forEach(function(p){ (p.tags||[]).forEach(function(t){ s.add(t); }); }); return Array.from(s); }
function setTag(tag) { activeTag = tag; document.querySelectorAll('#tagList .tag').forEach(function(t){ t.classList.toggle('active', t.dataset.tag === tag); }); renderPresets(); }
function updateTagList() {
  const el = document.getElementById('tagList'); if (!el) return;
  const all = getAllTags();
  el.innerHTML = '<span class="tag' + (activeTag===''?' active':'') + '" data-tag="" onclick="setTag(\'\')">全部</span>' +
    all.map(function(t){ return '<span class="tag' + (activeTag===t?' active':'') + '" data-tag="' + escapeHtml(t) + '" onclick="setTag(\'' + escapeHtml(t)+'\')">' + escapeHtml(t) + '</span>'; }).join('');
}
function renderPresets() {
  const listEl = document.getElementById('presetList'); if (!listEl) return;
  const emptyEl = document.getElementById('presetEmpty');
  let f = presets;
  if (activeTag) f = f.filter(function(p){ return (p.tags||[]).indexOf(activeTag) >= 0; });
  if (f.length === 0) { listEl.innerHTML = ''; emptyEl.style.display = 'block'; return; }
  emptyEl.style.display = 'none';
  listEl.innerHTML = f.map(function(p){
    const n = Object.keys(p.params||{}).filter(function(k){ return p.params[k] !== 0; }).length;
    return '<li class="preset-item" onclick="applyPreset(\'' + p.id + '\')">' +
      '<div class="p-info"><div class="p-name">' + escapeHtml(p.name) + '</div>' +
      '<div class="p-meta">' + n + ' 项调整</div></div>' +
      '<div class="p-actions"><button class="icon-btn" onclick="event.stopPropagation(); if(confirm(\'删除预设？\')) deletePreset(\'' + p.id + '\')">删除</button></div>' +
    '</li>';
  }).join('');
  const pc = document.getElementById('presetCount'); if (pc) pc.textContent = f.length + ' 个';
}
function applyPreset(id) {
  const p = presets.find(function(x){ return x.id === id; });
  if (!p) { showToast('预设不存在'); return; }
  if (!sourceData) { showToast('请先打开图片'); return; }
  Object.keys(p.params).forEach(function(k){ params[k] = p.params[k]; });
  syncSlidersFromParams();
  pushHistory('应用预设：' + p.name);
  render();   showToast('已应用：' + p.name);
}
function deletePreset(id) { presets = presets.filter(function(p){ return p.id !== id; }); persistPresets(); showToast('已删除预设'); }
/* ================= 快捷键 ================= */
document.addEventListener('keydown', function(e){
  const mod = e.ctrlKey || e.metaKey;
  if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undoAction(); }
  else if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redoAction(); }
  else if (mod && e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); redoAction(); }
});

/* ================= 初始化 ================= */
document.addEventListener('DOMContentLoaded', function(){
  presets = loadStoredPresets();
  bindSliders();
  initLayers();
  updateTagList();
  renderPresets();
  updateHistoryUI();
});
