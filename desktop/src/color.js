function render() {
  if (!sourceData) return;
  const main = document.getElementById('mainCanvas');
  const ctx = main.getContext('2d');
  if (viewMode === 'original') {
    ctx.putImageData(new ImageData(new Uint8ClampedArray(sourceData.data), imageWidth, imageHeight), 0, 0);
    updateHistogram(sourceData.data);
  } else {
    const clamped = new Uint8ClampedArray(sourceData.data);
    applyAdjustments(clamped);
    ctx.putImageData(new ImageData(clamped, imageWidth, imageHeight), 0, 0);
    updateHistogram(clamped);
  }
}

function updateHistogram(data) {
  const canvas = document.getElementById('histogramCanvas');
  canvas.width = 200; canvas.height = 68;
  const ctx = canvas.getContext('2d');
  const bins = 50;
  const lum = new Array(bins).fill(0);
  const n = data.length;
  let max = 0;
  for (let i = 0; i < n; i += 4) {
    const L = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
    const idx = Math.min(bins - 1, Math.floor(L / 256 * bins));
    lum[idx]++;
    if (lum[idx] > max) max = lum[idx];
  }
  ctx.clearRect(0, 0, 200, 68);
  ctx.fillStyle = 'rgba(255,255,255,.8)';
  const bw = 200 / bins;
  for (let j = 0; j < bins; j++) {
    const h = max > 0 ? (lum[j] / max) * 60 : 0;
    ctx.fillRect(j * bw, 68 - h, bw - 1, h);
  }
}
// ================== 色彩空间工具 ==================
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) { r = g = b = l; }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: r * 255, g: g * 255, b: b * 255 };
}

// 通道混合权重 —— 模拟 Lightroom HSL：根据主色相区间加权
function channelWeights(r, g, b) {
  const hsl = rgbToHsl(r, g, b);
  const H = hsl.h;
  // 六个色相区间中心
  const centers = { red: 0, green: 120, blue: 240, yellow: 60, aqua: 180, magenta: 300 };
  const result = {};
  const span = 50; // 影响范围
  for (const ch in centers) {
    let diff = Math.abs(H - centers[ch]);
    if (diff > 180) diff = 360 - diff;
    const w = diff <= span ? 1 - (diff / span) : 0;
    result[ch] = w;
  }
  return result;
}

// ================== 核心调整 ==================
function applyAdjustments(data) {
  const n = data.length;
  const gain = Math.pow(2, params.exposure);
  const tempShift = params.temp * 0.55;
  const tintShift = params.tint * 0.45;
  const contrastF = 1 + params.contrast / 100;
  const satF = 1 + params.saturation / 100;
  const vibF = 1 + params.vibrance / 100;

  const grainParams = params.grain;
  const vignette = params.vignette;

  for (let i = 0; i < n; i += 4) {
    let r = data[i], g = data[i+1], b = data[i+2];

    // 曝光
    r *= gain; g *= gain; b *= gain;

    // 白平衡
    r += tempShift + tintShift;
    b -= tempShift;
    g -= tintShift * 0.85;

    // 对比度
    r = (r - 128) * contrastF + 128;
    g = (g - 128) * contrastF + 128;
    b = (b - 128) * contrastF + 128;

    // 明度分量用于高光/阴影
    let lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // 高光 （只作用高亮区）
    if (params.highlights !== 0) {
      const w = smoothstep(0.55, 1.0, lum / 255) * (params.highlights / 100) * 70;
      r += w; g += w; b += w;
    }
    // 阴影 （只作用暗部）
    if (params.shadows !== 0) {
      const w = smoothstep(0.0, 0.45, lum / 255) * (params.shadows / 100) * 70;
      r += w; g += w; b += w;
    }
    // 白色色阶（压缩高光截止）
    if (params.whites !== 0) {
      r += params.whites * 0.3; g += params.whites * 0.3; b += params.whites * 0.3;
    }
    // 黑色色阶（压缩暗部截止）
    if (params.blacks !== 0) {
      r += params.blacks * 0.3; g += params.blacks * 0.3; b += params.blacks * 0.3;
    }

    // 到位 RGB 转到 HSL
    let hsl = rgbToHsl(clamp255(r), clamp255(g), clamp255(b));

    // 整体饱和度
    hsl.s = Math.max(0, Math.min(100, hsl.s * satF));
    // 自然饱和度：低饱和色增益大，已饱和色增益小
    if (vibF !== 1) {
      const satFactor = 1 - hsl.s / 100;
      hsl.s = Math.max(0, Math.min(100, hsl.s + params.vibrance * satFactor));
    }

    // 通道 HSL（红色/绿色/蓝色 色相、饱和度、明度）
    const wts = channelWeightsFromHue(hsl.h);
    hsl.h += wts.red * params['red-h'] * 1.2 + wts.green * params['green-h'] * 1.2 + wts.blue * params['blue-h'] * 1.2;
    let chSat = wts.red * params['red-s'] * 0.6 + wts.green * params['green-s'] * 0.6 + wts.blue * params['blue-s'] * 0.6;
    let chLum = wts.red * params['red-l'] * 0.5 + wts.green * params['green-l'] * 0.5 + wts.blue * params['blue-l'] * 0.5;
    hsl.s = Math.max(0, Math.min(100, hsl.s + chSat));
    hsl.l = Math.max(0, Math.min(100, hsl.l + chLum * 1.2));

    const rgb2 = hslToRgb(hsl.h, hsl.s, hsl.l);
    r = rgb2.r; g = rgb2.g; b = rgb2.b;

    // 清晰度：用邻近对比的近似——通过局部反差增益（简化为提高中频）使用 unsharp 近似
    // 这里做简化：清晰度 = 让亮度远离中间调
    if (params.clarity !== 0) {
      let ll = 0.299 * r + 0.587 * g + 0.114 * b;
      const delta = ((ll - 128) / 128) * params.clarity * 0.25;
      r += delta; g += delta; b += delta;
    }

    // 颗粒（确定性伪随机）
    if (grainParams > 0) {
      const idx = i / 4;
      const seed = Math.sin(idx * 12.9898) * 43758.5453;
      const noise = (seed - Math.floor(seed)) - 0.5;
      r += noise * grainParams * 0.6;
      g += noise * grainParams * 0.6;
      b += noise * grainParams * 0.6;
    }

    data[i] = clamp255(r);
    data[i+1] = clamp255(g);
    data[i+2] = clamp255(b);
  }

  // 暗角（单独处理，基于像素位置）
  if (vignette !== 0) applyVignette(data);
}

function applyVignette(data) {
  const cx = (imageWidth - 1) / 2, cy = (imageHeight - 1) / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  const amount = -params.vignette; // 正=暗角，负=提亮四角
  for (let y = 0; y < imageHeight; y++) {
    for (let x = 0; x < imageWidth; x++) {
      const dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy)) / maxDist;
      const factor = 1 - amount * Math.pow(dist, 3);
      const idx = (y * imageWidth + x) * 4;
      data[idx] = clamp255(data[idx] * factor);
      data[idx+1] = clamp255(data[idx+1] * factor);
      data[idx+2] = clamp255(data[idx+2] * factor);
    }
  }
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}
