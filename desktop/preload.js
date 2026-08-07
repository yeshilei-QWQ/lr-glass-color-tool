// preload.js — 通过 contextBridge 暴露最小可用接口
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 预留：方便 renderer 后续扩展桌面能力
  platform: process.platform
});