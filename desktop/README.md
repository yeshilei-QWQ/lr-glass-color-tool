# LR Glass 调色工具 · 桌面版（Electron）

> **版本：V1.6 · by X1a0ye**

基于 V1.5 模块化版本封装的 **Electron 桌面应用**。

---

## 使用

需要 **Node.js ≥ 16**。

```bash
npm install    # 安装 Electron 及依赖（国内可用 npmmirror 镜像）
npm start      # 启动桌面应用
```

> 无网络 / 网吧：`node node_modules/electron/cli.js .`

## 打包分发

后续用 electron-builder 打包为 Windows 安装包（exe / 免安装版）。

---

## 项目结构

```
lr-glass-desktop/
├── index.html          主界面（HTML / CSS / DOM）
├── main.js             Electron 主进程
├── preload.js          预加载脚本（contextBridge）
├── package.json        依赖与脚本
├── .gitignore
└── src/                （10 个功能模块，同浏览器版）
    ├── state.js  history.js  controls.js
    ├── view.js   color.js    blend.js
    ├── layers.js blur.js     adjust.js
    └── app.js
```

## 安全配置

- `contextIsolation: true`
- `nodeIntegration: false`
- 通过 `preload.js` 暴露最小接口

## 待办（下一步）
- electron-builder 打包 exe
- 滑块性能优化 + 数值直接输入