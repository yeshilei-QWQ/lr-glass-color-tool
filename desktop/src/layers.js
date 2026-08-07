/* ============ 图层数据模型（简化为单一基础图层，无图层面板） ============ */
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
}
function curLayer() { return layers[activeLayerIndex]; }