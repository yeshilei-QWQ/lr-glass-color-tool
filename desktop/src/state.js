const STORAGE_KEY = 'lr_glass_presets_v1';
const API_KEY = 'lr_glass_apis_v1';

let sourceData = null;
let imageWidth = 0, imageHeight = 0;
// 降采样预览数据（用于拖动滑块时的流畅预览）
let previewData = null;
let previewWidth = 0, previewHeight = 0;
// true = 当前正在用降采样预览渲染；松手后切回全分辨率精确渲染
let isPreviewRender = false;
let viewMode = 'original';
let splitRatio = 0.5;
let lastToast = null;

let params = {
  exposure: 0, contrast: 0, highlights: 0, shadows: 0, whites: 0, blacks: 0,
  temp: 0, tint: 0,
  saturation: 0, vibrance: 0,
  clarity: 0, grain: 0, vignette: 0,
  'red-h': 0, 'red-s': 0, 'red-l': 0,
  'green-h': 0, 'green-s': 0, 'green-l': 0,
  'blue-h': 0, 'blue-s': 0, 'blue-l': 0,
};

// 参数中文名
const PARAM_LABELS = {
  exposure: '曝光', contrast: '对比度', highlights: '高光', shadows: '阴影',
  whites: '白色', blacks: '黑色', temp: '色温', tint: '色调',
  saturation: '饱和度', vibrance: '自然饱和度',
  clarity: '清晰度', grain: '颗粒', vignette: '暗角',
  'red-h': '红色色相', 'red-s': '红色饱和度', 'red-l': '红色明度',
  'green-h': '绿色色相', 'green-s': '绿色饱和度', 'green-l': '绿色明度',
  'blue-h': '蓝色色相', 'blue-s': '蓝色饱和度', 'blue-l': '蓝色明度',
};

