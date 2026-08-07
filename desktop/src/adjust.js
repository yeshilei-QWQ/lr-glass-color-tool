/* ============ 单图层调整（含模糊），参数对象 p ============ */
function applyLayer(data, p) {
  let allZero = true;
  for (const k in p) { if (p[k]) { allZero = false; break; } }
  if (allZero) return;
  const n = data.length;
  const gain = Math.pow(2, p.exposure || 0);
  const tempShift = (p.temp || 0) * 0.55;
  const tintShift = (p.tint || 0) * 0.45;
  const cf = 1 + (p.contrast || 0) / 100;
  const satF = 1 + (p.saturation || 0) / 100;
  const gra = p.grain || 0;

  for (let i = 0; i < n; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];
    r *= gain; g *= gain; b *= gain;
    r += tempShift + tintShift; b -= tempShift; g -= tintShift * 0.85;
    r = (r - 128) * cf + 128; g = (g - 128) * cf + 128; b = (b - 128) * cf + 128;
    let lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (p.highlights) { const w = sstep(0.55, 1.0, lum/255) * (p.highlights/100) * 70; r+=w; g+=w; b+=w; }
    if (p.shadows)     { const w = sstep(0.0, 0.45, lum/255) * (p.shadows/100) * 70; r+=w; g+=w; b+=w; }
    if (p.whites)      { r += (p.whites||0)*0.3; g += (p.whites||0)*0.3; b += (p.whites||0)*0.3; }
    if (p.blacks)      { r += (p.blacks||0)*0.3; g += (p.blacks||0)*0.3; b += (p.blacks||0)*0.3; }
    let hsl = rgbToHsl(c255(r), c255(g), c255(b));
    hsl.s = Math.max(0, Math.min(100, hsl.s * satF));
    if (p.vibrance) { const sf = 1 - hsl.s/100; hsl.s = Math.max(0, Math.min(100, hsl.s + (p.vibrance||0) * sf)); }
    const wt = channelWeightsFromHue(hsl.h);
    hsl.h += wt.red*(p['red-h']||0)*1.2 + wt.green*(p['green-h']||0)*1.2 + wt.blue*(p['blue-h']||0)*1.2;
    let chS = wt.red*(p['red-s']||0)*0.6 + wt.green*(p['green-s']||0)*0.6 + wt.blue*(p['blue-s']||0)*0.6;
    let chL = wt.red*(p['red-l']||0)*0.5 + wt.green*(p['green-l']||0)*0.5 + wt.blue*(p['blue-l']||0)*0.5;
    hsl.s = Math.max(0, Math.min(100, hsl.s + chS));
    hsl.l = Math.max(0, Math.min(100, hsl.l + chL*1.2));
    const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
    r = rgb.r; g = rgb.g; b = rgb.b;
    if (p.clarity) { let ll = 0.299*r + 0.587*g + 0.114*b; const d = ((ll-128)/128) * (p.clarity||0) * 0.25; r+=d; g+=d; b+=d; }
    if (gra > 0) { const seed = Math.sin((i/4)*12.9898)*43758.5453; const no = (seed - Math.floor(seed)) - 0.5; r += no*gra*0.6; g += no*gra*0.6; b += no*gra*0.6; }
    data[i] = c255(r); data[i+1] = c255(g); data[i+2] = c255(b);
  }
  // 暗角
  if (p.vignette) applyVignetteLayer(data, p.vignette);
  // 高斯模糊滤镜
  if (p.blur > 0) gaussianBlur(data, (p.blur / 100) * 20 + 0.6);
}
function sstep(e0, e1, x) { const t = Math.max(0, Math.min(1, (x-e0)/(e1-e0))); return t*t*(3-2*t); }
function c255(v) { return v < 0 ? 0 : v > 255 ? 255 : v; }
function applyVignetteLayer(data, amount) {
  const cx = (imageWidth-1)/2, cy = (imageHeight-1)/2;
  const maxD = Math.sqrt(cx*cx + cy*cy);
  const amt = -amount;
  let idx = 0;
  for (let y = 0; y < imageHeight; y++) {
    for (let x = 0; x < imageWidth; x++) {
      const d = Math.sqrt((x-cx)*(x-cx) + (y-cy)*(y-cy)) / maxD;
      const f = 1 - amt * Math.pow(d, 3);
      data[idx] = c255(data[idx]*f); data[idx+1] = c255(data[idx+1]*f); data[idx+2] = c255(data[idx+2]*f);
      idx += 4;
    }
  }
}
/* ============ 合成渲染管线（覆盖 render） ============ */
function blendImages(base, layer, modeKey, opacity) {
  const mode = BLEND_MODES[modeKey] || BLEND_MODES.normal;
  const a = opacity;
  const w = imageWidth, h = imageHeight;
  for (let i = 0; i < base.length; i += 4) {
    const LR = layer[i], LG = layer[i+1], LB = layer[i+2];
    const RR = base[i],  RG = base[i+1], RB = base[i+2];
    let o;
    // 亮度混合模式特殊处理
    if (modeKey === 'luminosity') {
      const res = mode.fn.apply(null, [LR, LG, LB, a, RR, RG, RB]);
      o = { r: res.r, g: res.g, b: res.b };
    } else {
      o = mode.fn(LR, LG, LB, a, RR, RG, RB);
    }
    base[i] = c255(o.r); base[i+1] = c255(o.g); base[i+2] = c255(o.b);
  }
}

function renderComposite() {
  const result = new Uint8ClampedArray(sourceData.data);
  for (let i = 0; i < layers.length; i++) {
    const l = layers[i];
    if (!l.enabled) continue;
    const copy = new Uint8ClampedArray(sourceData.data);
    applyLayer(copy, l.params);
    blendImages(result, copy, l.blendMode, l.opacity);
  }
  return result;
}

function render() {
  if (!sourceData) return;
  // 预览模式下用降采样数据，保证拖动流畅
  if (isPreviewRender && previewData) return renderPreview();
  renderFull();
}

// 拖动滑块时使用：降采样低分辨率渲染 + 放大预览（快速）
function renderPreview() {
  const main = document.getElementById('mainCanvas');
  const ctx = main.getContext('2d');
  const ow = imageWidth, oh = imageHeight, od = sourceData;
  // 离线小 canvas
  const off = document.createElement('canvas');
  off.width = previewWidth; off.height = previewHeight;
  const octx = off.getContext('2d');
  const clamped = new Uint8ClampedArray(previewData.data);
  if (viewMode === 'original') {
    octx.putImageData(new ImageData(new Uint8ClampedArray(previewData.data), previewWidth, previewHeight), 0, 0);
  } else {
    // 临时切换全局尺寸供 applyLayer 内部 vignette/blur 使用
    imageWidth = previewWidth; imageHeight = previewHeight;
    applyLayer(clamped, params);
    imageWidth = ow; imageHeight = oh;
    octx.putImageData(new ImageData(clamped, previewWidth, previewHeight), 0, 0);
  }
  // 放大绘制到主 canvas（尺寸 = 全分辨率）
  ctx.clearRect(0, 0, ow, oh);
  ctx.drawImage(off, 0, 0, previewWidth, previewHeight, 0, 0, ow, oh);
  // 直方图用预览结果（快）
  updateHistogram(clamped);
  sourceData = od;
}

// 松手 / 精确保存时使用：原始分辨率精确渲染
function renderFull() {
  const main = document.getElementById('mainCanvas');
  const ctx = main.getContext('2d');
  if (viewMode === 'original') {
    ctx.putImageData(new ImageData(new Uint8ClampedArray(sourceData.data), imageWidth, imageHeight), 0, 0);
    updateHistogram(sourceData.data);
    return;
  }
  const clamped = new Uint8ClampedArray(sourceData.data);
  applyLayer(clamped, params);
  ctx.putImageData(new ImageData(clamped, imageWidth, imageHeight), 0, 0);
  updateHistogram(clamped);
}

// 覆盖导出，使用渲染管线输出实际图层效果
function downloadImage() {
  if (!sourceData) { showToast('请先打开图片'); return; }
  const canvas = document.createElement('canvas');
  canvas.width = imageWidth; canvas.height = imageHeight;
  const ctx = canvas.getContext('2d');
  let out;
  if (layers.length <= 1) { out = new Uint8ClampedArray(sourceData.data); applyLayer(out, params); }
  else out = renderComposite();
  ctx.putImageData(new ImageData(out, imageWidth, imageHeight), 0, 0);
  const a = document.createElement('a');
  a.download = 'lr-glass-' + Date.now() + '.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
  showToast('已导出 PNG');
}
