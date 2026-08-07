/* ============ 图层 / 混合模式 / 滤镜 引擎（模块化可扩展） ============ */
function channelWeightsFromHue(H) {
  const centers = { red:0, green:120, blue:240, yellow:60, aqua:180, magenta:300 };
  const result = {};
  const span = 50;
  for (const ch in centers) {
    let diff = Math.abs(H - centers[ch]);
    if (diff > 180) diff = 360 - diff;
    result[ch] = diff <= span ? 1 - diff / span : 0;
  }
  return result;
}
const BLEND_MODES = {
  normal:     { label: '正常',     fn: (r,g,b,a,bR,bG,bB)=>({r:a*r+(1-a)*bR,g:a*g+(1-a)*bG,b:a*b+(1-a)*bB}) },
  multiply:   { label: '正片叠底', fn: (r,g,b,a,bR,bG,bB)=>({r:bm(r,bR,a),g:bm(g,bG,a),b:bm(b,bB,a)}) },
  screen:     { label: '滤色',     fn: (r,g,b,a,bR,bG,bB)=>({r:bs(r,bR,a),g:bs(g,bG,a),b:bs(b,bB,a)}) },
  overlay:    { label: '叠加',     fn: (r,g,b,a,bR,bG,bB)=>({r:bo(r,bR,a),g:bo(g,bG,a),b:bo(b,bB,a)}) },
  softlight:  { label: '柔光',     fn: (r,g,b,a,bR,bG,bB)=>({r:bq(r,bR,a),g:bq(g,bG,a),b:bq(b,bB,a)}) },
  hardlight:  { label: '强光',     fn: (r,g,b,a,bR,bG,bB)=>({r:bq(bR,r,a),g:bq(bG,g,a),b:bq(bB,b,a)}) },
  darken:     { label: '变暗',     fn: (r,g,b,a,bR,bG,bB)=>({r:a*Math.min(r,bR)+(1-a)*bR,g:a*Math.min(g,bG)+(1-a)*bG,b:a*Math.min(b,bB)+(1-a)*bB}) },
  lighten:    { label: '变亮',     fn: (r,g,b,a,bR,bG,bB)=>({r:a*Math.max(r,bR)+(1-a)*bR,g:a*Math.max(g,bG)+(1-a)*bG,b:a*Math.max(b,bB)+(1-a)*bB}) },
  difference: { label: '差值',     fn: (r,g,b,a,bR,bG,bB)=>({r:Math.abs(r-a*bR-128*(1-a)),g:Math.abs(g-a*bG-128*(1-a)),b:Math.abs(b-a*bB-128*(1-a))}) },
  exclusion:  { label: '排除',     fn: (r,g,b,a,bR,bG,bB)=>({r:bw(r,bR,a),g:bw(g,bG,a),b:bw(b,bB,a)}) },
  luminosity: { label: '叠加处理', fn: (r,g,b,a,bR,bG,bB)=>({r:a*r+(1-a)*bR,g:a*g+(1-a)*bG,b:a*b+(1-a)*bB}) },
};
function bm(r,bR,a){ return a*((r/255)*(bR/255))*255 + (1-a)*bR; }
function bs(r,bR,a){ return a*(255 - (1-r/255)*(1-bR/255)*255) + (1-a)*bR; }
function bo(r,bR,a){ const t = r<128 ? (2*r*bR)/255 : 255 - 2*(255-r)*(255-bR)/255; return a*t + (1-a)*bR; }
function bq(r,bR,a){ const t = r<128 ? (2*r/255)*(bR/255)*255 : 255 - 2*(1-r/255)*(1-bR/255)*255; return a*t + (1-a)*bR; }
function bw(r,bR,a){ return a*(r+bR-2*r*bR/255) + (1-a)*bR; }
