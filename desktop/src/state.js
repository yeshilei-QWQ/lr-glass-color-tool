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
// 预览缩放：fit=适应窗口  actual=100%  custom=自定义(zoom)
let zoomMode = 'fit';
let zoom = 1;
let fitScale = 1;
// 平移（Lightroom 式拖动手感）：仅当画布超出视口时生效
let panX = 0, panY = 0;
let panEnabled = false;
let histChannel = 'lum'; // 直方图通道

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


/* ================= 图片队列 + 批处理 / 工作流 接口（骨架） =================
 * importMode: 'single'（当前启用）| 'batch'（将来启用，需实现批量处理逻辑后，
 *  再通过 importQueue.setMode('batch') 切换单张/多张处理）。
 * imageStack: 图片队列，每项 { id, name, w, h, data, preview, previewW, previewH, createdAt }。
 *   data     -> 原始分辨率 RGBA (Uint8ClampedArray)，写入 sourceData 供现有单图管线使用
 *   preview  -> 降采样预览 RGBA，写入 previewData 供拖动滑块流畅预览
 * 现有单图全局 sourceData/imageWidth/imageHeight/previewData 仍为「活动图」镜像，
 * 由 activateImage 负责同步，保证现有大量单图代码零改动。
 */
let imageStack = [];
let activeImageIndex = -1;    // -1 无图；single 模式仅 0
let importMode = 'single';    // 'single' | 'batch'

/* 渲染管线后端注册表（性能 / 硬件加速 · 骨架）
 * 当前 default: CPU 逐像素（applyLayer）。
 * 将来可 register('webgl', {...}) / ('webgpu', {...}) / ('offscreen', {...})，
 * 全部像素处理由 renderPipeline.get().process(data, params) 承担，保留性能优化能力。
 */
const renderPipeline = {
  backends: {},      // 后端名 -> 后端对象
  current: 'cpu',    // 当前后端（缺省 cpu）
  register(name, backend) { this.backends[name] = backend; },
  use(name) { if (this.backends[name]) this.current = name; },
  get() { return this.backends[this.current] || null; },
};

/* 导入队列 API（批处理 / 工作流 对外接口）—— 实现由 importer.js 注入 */
const importQueue = {
  mode: importMode,
  setMode(m) { importMode = m; this.mode = m; },
  addImages: null,      // (FileList|Array<File>, done?) 由 importer.js 赋值
  activate: null,      // (index) 由 importer.js 赋值
  size() { return imageStack.length; },
  all() { return imageStack.slice(); },
  activeIndex() { return activeImageIndex; },
};
