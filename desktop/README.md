# LR Glass 调色工具 · V2-lite（桌面精简版）

> **版本：V2-lite · by X1a0ye**（精简优化轻量版）

Lightroom 风格桌面调色应用，Windows 便携版 / 源码两种使用方式。

---

## 交付产物

| 产物 | 说明 | 位置 |
| --- | --- | --- |
| `LR Glass 2.0.0-lite.exe` | 免安装便携版（双击即用） | `dist/` |
| `win-unpacked/` | 解压后的完整应用目录 | `dist/` |

**分发：只需把 exe 发给朋友，双击即用，无需安装 Node。**

---

## V2-lite（本次精简）

移除冗余、聚焦核心调色体验：
- **移除 API 接入区**（JSON 参数 + 远端调用，现无需求）
- **移除搜索框**（原未实现逻辑的假功能）
- **移除图层系统**（多图层/混合模式/不透明度，回归简洁的单层调色）
- 历史系统保留不动；调色/预设/视图/导出等核心功能不受影响

## 功能清单
- **基础调整**：曝光 / 对比度 / 高光 / 阴影 / 白色 / 黑色
- **白平衡**：色温 / 色调
- **颜色**：饱和度 / 自然饱和度
- **效果**：清晰度 / 颗粒 / 暗角
- **HSL 通道**：红 / 绿 / 蓝（色相、饱和度、明度）
- 视图：原图 / 调整 / 对比分割
- 预设管理：保存 / 应用 / 标签筛选
- 历史与撤销 / 重做
- 导出 PNG

---

## 从源码运行
需要 **Node.js ≥ 16**。
```bash
npm install
npm start
```
> 若环境存在 `ELECTRON_RUN_AS_NODE=1`（部分网吧），先清除再运行：
> ```powershell
> Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
> ```
> 打包：`npm run dist`

## 项目结构
```
lr-glass-desktop/
├── index.html    主界面
├── main.js       Electron 主进程
├── preload.js    预加载脚本
├── package.json  electron-builder 配置
├── dist/         打包产物
└── src/          （10 个模块）
    state.js history.js controls.js view.js
    color.js blend.js  layers.js blur.js adjust.js app.js
```

## 待办
- 滑块性能优化 + 数值直接输入
- 自定义应用图标