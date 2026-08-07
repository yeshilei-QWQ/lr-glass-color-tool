const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// 禁用菜单栏（更接近原生应用观感），保留基础快捷键
function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'LR Glass 调色工具',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadFile('index.html');

  // 设置窗口标题（允许 renderer 通过 preload 更新）
  ipcMain.on('set-title', (e, title) => {
    win.setTitle(title || 'LR Glass 调色工具');
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});