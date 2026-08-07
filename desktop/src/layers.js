/* 图层对象 */
let layerSeq = 0;
function newLayerParams() {
  return {
    exposure:0, contrast:0, highlights:0, shadows:0, whites:0, blacks:0,
    temp:0, tint:0, saturation:0, vibrance:0, clarity:0, grain:0, vignette:0,
    'red-h':0,'red-s':0,'red-l':0,'green-h':0,'green-s':0,'green-l':0,'blue-h':0,'blue-s':0,'blue-l':0,
    blur:0
  };
}
let layers = [];
let activeLayerIndex = 0;

function initLayers() {
  layers = [{
    id: 'lay-1', name: '基础图层', type: 'base', enabled: true,
    opacity: 1, blendMode: 'normal', params: newLayerParams()
  }];
  activeLayerIndex = 0;
  params = layers[0].params;
  syncSlidersFromParams();
  renderLayerPanel();
}
function curLayer() { return layers[activeLayerIndex]; }
/* 图层操作 */
function addLayer(kind) {
  const l = {
    id: 'lay-' + (++layerSeq),
    name: '图层 ' + layers.length,
    type: 'adjust', enabled: true, opacity: 1, blendMode: 'normal',
    params: newLayerParams()
  };
  layers.push(l);
  activeLayerIndex = layers.length - 1;
  params = l.params;
  syncSlidersFromParams();
  renderLayerPanel();
  pushHistory('新建图层：' + l.name);
  render();
}
function selectLayer(index) {
  if (index < 0 || index >= layers.length) return;
  activeLayerIndex = index;
  params = layers[index].params;
  syncSlidersFromParams();
  renderLayerPanel();
  render();
}
function toggleLayer(index, cb) { cb && cb(); layers[index].enabled = !layers[index].enabled; renderLayerPanel(); render(); }
function setLayerOpacity(index, val) {
  layers[index].opacity = parseFloat(val);
  renderLayerPanel(); render();
}
function setLayerBlend(index, mode) {
  layers[index].blendMode = mode;
  renderLayerPanel(); render();
}
function removeLayer(index) {
  if (layers.length <= 1) { showToast('至少保留一个图层'); return; }
  const nm = layers[index].name;
  layers.splice(index, 1);
  if (activeLayerIndex >= layers.length) activeLayerIndex = layers.length - 1;
  params = layers[activeLayerIndex].params;
  syncSlidersFromParams();
  renderLayerPanel();
  pushHistory('删除图层：' + nm);
  render();
}

/* 图层面板 UI 渲染 */
function renderLayerPanel() {
  let box = document.getElementById('layerPanel');
  if (!box) {
    // 注入到右侧侧栏顶部
    const right = document.querySelector('.sidebar-right');
    const holder = document.createElement('div');
    holder.id = 'layerPanel';
    right.insertBefore(holder, right.firstChild);
    box = holder;
  }
  const opts = Object.keys(BLEND_MODES).map(k => k).join(',');
  box.innerHTML =
    '<div class="sidebar-title">图层</div>' +
    '<div class="hist-bar">' +
      '<button class="btn primary" onclick="addLayer()">新增图层</button>' +
      '<button class="btn" onclick="curLayer()&&renameLayer(activeLayerIndex)">重命名</button>' +
    '</div>' +
    '<div id="layerList">' + layers.map((l, i) => layerItemHTML(l, i)).join('') + '</div>';
}

function layerItemHTML(l, i) {
  const active = i === activeLayerIndex;
  const optStr = Object.keys(BLEND_MODES).map(k => '<option value="' + k + '"' + (l.blendMode===k?' selected':'') + '>' + BLEND_MODES[k].label + '</option>').join('');
  return '<div class="layer-item' + (active?' active':'') + '" onclick="selectLayer(' + i + ')">' +
    '<div class="layer-head">' +
      '<button class="icon-btn ew" onclick="event.stopPropagation(); toggleLayer(' + i + ')">' + (l.enabled?'[开]':'[关]') + '</button>' +
      '<span class="layer-name">' + escapeHtml(l.name) + '</span>' +
      '<button class="icon-btn" onclick="event.stopPropagation(); removeLayer(' + i + ')">删除</button>' +
    '</div>' +
    '<div class="layer-sub">' +
      '<label>不透明度 <input type="range" min="0" max="100" value="' + Math.round(l.opacity*100) + '" oninput="setLayerOpacity(' + i + ', this.value/100)" onclick="event.stopPropagation()"></label>' +
      '<label>混合模式 <select onchange="setLayerBlend(' + i + ', this.value)" onclick="event.stopPropagation()">' + optStr + '</select></label>' +
    '</div>' +
  '</div>';
}

function renameLayer(index) {
  const cur = layers[index].name;
  const next = prompt('重命名图层', cur);
  if (next && next.trim()) { layers[index].name = next.trim(); renderLayerPanel(); }
}
