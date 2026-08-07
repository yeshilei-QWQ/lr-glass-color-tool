# LR Glass 调色工具 · V1.5

> **版本：V1.5 · by X1a0ye**

上一版（V1, 单文件 HTML）的**模块化重构版本**。功能与 V1 保持一致，但脚本已按职责拆分为多个文件，为后续功能扩展和 Electron 封装做准备。

---

## 本次更新（V1.5）

### 结构重构
V1 是单文件（约 64KB，两个 `<script>` 块互相覆盖），V1.5 拆分为 **HTML + 10 个 JS 模块**：

```
lr-glass-app/
├── index.html          主页面（HTML / CSS / DOM 结构）
└── src/
    ├── state.js        全局状态、常量、默认参数
    ├── history.js      历史 / 撤销 / 重做系统
    ├── controls.js     滑块绑定、参数同步、分组重置、图片导入
    ├── view.js         画布初始化、视图模式（原图/调整/对比）、分割线
    ├── color.js        色彩空间转换、主调色算法（applyAdjustments）
    ├── blend.js        混合模式定义与底层混合函数
    ├── layers.js       图层对象、图层操作、图层面板 UI
    ├── blur.js         高斯模糊算法（可分 1D）
    ├── adjust.js       图层渲染管线（applyLayer / renderComposite）、导出
    └── app.js          工具函数、预设管理、API 接入、初始化
```

### 拆分原则
- **按功能职责划分**文件，而非按执行顺序
- 保持原加载顺序（state → history → controls → view → color → blend → layers → blur → adjust → app），确保函数覆盖关系与 V1 一致（如 `render()`、`layerItemHTML()` 的后定义版本生效）
- **零逻辑改动**：全部为物理拆分搬家，算法代码与 V1 逐字一致

### 已知问题（待 V2 优化）
- 滑块拖动时画面**卡顿**：当前为逐像素同步运算 + 实时渲染，大图尤为明显
- 滑块不支持**直接数值输入**（Lightroom 风格），只能拖动

---

## 使用说明

双击打开 `index.html` 即可（需保持 `src/` 目录与 `index.html` 同级）。

> 注意：V1.5 起不再是单文件，分发时需**整个目录一起打包**（或封装为 Electron）。

---

## 版本历史

### V1.5（本版）— 模块化重构
- 单文件 HTML 拆分为独立 JS 模块
- 功能与 V1 完全一致，无逻辑改动

### V1 — 首个完整版
- 完整调色 / 图层 / 历史 / 预设 / API 功能
- 修复对比度算法、导入尺寸崩溃等 6 个 bug（详见 V1 版 README）