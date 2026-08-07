/* ============ 高斯模糊（可分 1D，O(n) per pass） ============ */
function gaussianKernel(sigma) {
  const rad = Math.max(1, Math.round(sigma * 3));
  const size = rad * 2 + 1;
  const k = new Array(size);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - rad;
    k[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += k[i];
  }
  for (let i = 0; i < size; i++) k[i] /= sum;
  return { k, rad };
}
function blurPass(src, dst, w, h, k, rad) {
  // 水平
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let i = -rad; i <= rad; i++) {
        let xx = x + i;
        if (xx < 0) xx = 0; else if (xx >= w) xx = w - 1;
        const s = (row + xx) * 4;
        const wt = k[i + rad];
        r += src[s] * wt; g += src[s+1] * wt; b += src[s+2] * wt;
      }
      const d = (row + x) * 4;
      dst[d] = r; dst[d+1] = g; dst[d+2] = b; dst[d+3] = src[(row + x) * 4 + 3];
    }
  }
}
function verticalPass(src, dst, w, h, k, rad) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let i = -rad; i <= rad; i++) {
        let yy = y + i;
        if (yy < 0) yy = 0; else if (yy >= h) yy = h - 1;
        const s = (yy * w + x) * 4;
        const wt = k[i + rad];
        r += src[s] * wt; g += src[s+1] * wt; b += src[s+2] * wt; a += src[s+3] * wt;
      }
      const d = (y * w + x) * 4;
      dst[d] = r; dst[d+1] = g; dst[d+2] = b; dst[d+3] = a;
    }
  }
}
function gaussianBlur(data, sigma) {
  if (sigma <= 0.5) return;
  const { k, rad } = gaussianKernel(sigma);
  const w = imageWidth, h = imageHeight, n = w * h;
  const tmp = new Uint8ClampedArray(n * 4);
  const out = new Uint8ClampedArray(n * 4);
  blurPass(data, tmp, w, h, k, rad);
  verticalPass(tmp, out, w, h, k, rad);
  data.set(out);
}
