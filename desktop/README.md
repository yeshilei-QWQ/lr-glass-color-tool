# LR Glass 调色工具 · V2.0（桌面版 / Electron）

> **版本：V2.0 · by X1a0ye**

基于 V1.5 模块化 + V1.6 Electron 壳，已打包为 **Windows 便携版 exe**。

---

## 交付产物

| 产物 | 说明 | 位置 |
| --- | --- | --- |
| `LR Glass 2.0.0.exe` | **免安装便携版**（双击即用） | `dist/` |
| `win-unpacked/` | 解压后的完整应用目录 | `dist/` |

**分发：只需把 `LR Glass 2.0.0.exe` 发给朋友，双击即用，无需安装 Node。**

---

## 从源码运行

需要 **Node.js ≥ 16**。

```bash
npm install    # 安装 Electron + electron-builder
npm start      # 直接运行
npm run dist   # 打包
```

**注意**：若环境中存在 `ELECTRON_RUN_AS_NODE=1` 环境变量（如部分网吧/兼容环境），需先清除再运行：
```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm start
```

---

## 项目结构

```
lr-glass-desktop/
├── index.html          主界面（HTML / CSS / DOM）
├── main.js             Electron 主进程（含 ELECTRON_RUN_AS_NODE 兼容）
├── preload.js          预加载脚本（contextBridge）
├── package.json        依赖 / 脚本 / electron-builder 配置
├── .gitignore
├── dist/               打包产物
└── src/                （10 个功能模块）
    ├── state.js  history.js  controls.js
    ├── view.js   color.js    blend.js
    ├── layers.js blur.js     adjust.js
    └── app.js
```

## 安全配置
- `contextIsolation: true`、`nodeIntegration: false`
- 通过 `preload.js` 暴露最小接口

## 待办（下一步）
- 滑块性能优化 + 数值直接输入
- 自定义应用图标