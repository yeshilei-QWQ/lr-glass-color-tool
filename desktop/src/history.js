// history 每项: { snap, desc }
let history = [];
let histIndex = -1;      // 当前所处历史步骤索引
let isRestoring = false; // 防止恢复时重复记录

function pushHistory(desc) {
  // 丢弃当前索引之后的重做分支
  if (histIndex < history.length - 1) {
    history = history.slice(0, histIndex + 1);
  }
  if (history.length > 200) history.shift(); // 上限
  history.push({
    snap: JSON.parse(JSON.stringify(params)),
    layers: JSON.parse(JSON.stringify(layers)),
    active: activeLayerIndex,
    desc: desc
  });
  histIndex = history.length - 1;
  updateHistoryUI();
}

function restoreHistory(idx) {
  if (idx < 0 || idx >= history.length) return;
  isRestoring = true;
  exitPreview();
  histIndex = idx;
  const h = history[idx];
  if (h.layers && h.layers.length) {
    layers = h.layers;
    activeLayerIndex = Math.min(h.active || 0, layers.length - 1);
    params = layers[activeLayerIndex].params;
  } else {
    Object.keys(params).forEach(function(k){ params[k] = 0; });
    Object.assign(params, h.snap || {});
  }
  syncSlidersFromParams();
  render();
  isRestoring = false;
  updateHistoryUI();
}

function undoAction() {
  if (histIndex <= 0) { showToast('没有可撤销的步骤'); return; }
  restoreHistory(histIndex - 1);
}

function redoAction() {
  if (histIndex >= history.length - 1) { showToast('没有可重做的步骤'); return; }
  restoreHistory(histIndex + 1);
}

// 跳转到历史中的第 n 步（从底部新建）
function applyHistory(dir) {
  if (!sourceData) return;
  if (dir === -1) {
    // 把当前状态作为新步骤提交
    if (paramsAreDefault()) { showToast('当前已无调整'); return; }
    pushHistory('新建步骤');
    updateHistoryUI();
    return;
  }
  // dir 是历史步骤索引（倒数第 n 条），从列表点击
}

function jumpToHistory(index) {
  if (index < 0 || index > history.length - 1) return;
  restoreHistory(index);
}

function updateHistoryUI() {
  const list = document.getElementById('historyList');
  const empty = document.getElementById('historyEmpty');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  if (undoBtn) undoBtn.disabled = histIndex <= 0;
  if (redoBtn) redoBtn.disabled = histIndex >= history.length - 1;

  if (history.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = history.map((h, i) => {
    const cur = i === histIndex;
    return '<li class="history-step' + (cur ? ' current' : '') + '" onclick="jumpToHistory(' + i + ')" title="跳到该步骤">' +
      '<span class="h-index">' + (i + 1) + '</span>' +
      '<span class="h-desc">' + escapeHtml(h.desc) + '</span>' +
      '<span class="h-val">' + (cur ? '当前' : '') + '</span>' +
      '</li>';
  }).join('');
  const el = list.querySelector('.current');
  if (el) el.scrollIntoView({ block: 'nearest' });
}

function historySnapshotDesc() {
  // 生成当前状态的一句话描述
  const active = Object.keys(params).filter(k => params[k] !== 0 || (k === 'grain' && params[k] !== 0));
  if (active.length === 0) return '初始状态';
  return active.map(k => PARAM_LABELS[k] + ' ' + fmtVal(k, params[k])).join('，');
}

function fmtVal(k, v) {
  if (k === 'exposure') return (v > 0 ? '+' : '') + v;
  return (v > 0 ? '+' : '') + v;
}

function paramsAreDefault() {
  return Object.keys(params).every(k => params[k] === 0);
}

// ================== 滑块处理 ==================
