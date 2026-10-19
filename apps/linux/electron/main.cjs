/**
 * 你只活一次 · Linux 桌面外壳
 * 职责：窗口、数据文件持久化、导入导出、安全边界。业务逻辑全部在共享 core 与渲染层。
 */
const { app, BrowserWindow, dialog, ipcMain, Menu, powerMonitor, safeStorage, session, shell } = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { createAiBridge } = require('./ai.cjs');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const isDemo = process.argv.includes('--demo');

app.setName('You Only Live Once');
app.setAppUserModelId('com.yolo.linux');

// 将数据固定在本应用自己的目录：<config>/yolo-linux/
const configRoot = process.env.YOLO_CONFIG_DIR
  ? path.resolve(process.env.YOLO_CONFIG_DIR)
  : path.join(app.getPath('appData'), 'yolo-linux');
app.setPath('userData', configRoot);

const dataFile = path.join(configRoot, 'yolo-data.json');
const backupFile = path.join(configRoot, 'yolo-data.backup.json');
const windowStateFile = path.join(configRoot, 'window-state.json');

let mainWindow = null;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

async function atomicWrite(file, text) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await fsp.writeFile(tmp, text, 'utf8');
  await fsp.rename(tmp, file);
}

async function saveData(data) {
  if (!data || typeof data !== 'object') throw new Error('数据格式无效');
  const text = JSON.stringify(data, null, 2);
  if (fs.existsSync(dataFile)) {
    try {
      await fsp.copyFile(dataFile, backupFile);
    } catch {
      /* 备份失败不阻断主保存 */
    }
  }
  await atomicWrite(dataFile, text);
  return { ok: true, path: dataFile, savedAt: new Date().toISOString() };
}

async function loadData() {
  if (!fs.existsSync(dataFile)) return { ok: true, data: null, path: dataFile };
  try {
    const data = readJson(dataFile);
    if (data === null) {
      const backup = readJson(backupFile);
      return {
        ok: true,
        data: backup,
        path: dataFile,
        recoveredFromBackup: Boolean(backup),
        error: '主数据文件无法解析',
      };
    }
    return { ok: true, data, path: dataFile };
  } catch (error) {
    const backup = readJson(backupFile);
    return {
      ok: true,
      data: backup,
      path: dataFile,
      recoveredFromBackup: Boolean(backup),
      error: String(error),
    };
  }
}

function loadWindowState() {
  const state = readJson(windowStateFile);
  const valid =
    state &&
    Number.isFinite(state.width) &&
    Number.isFinite(state.height) &&
    state.width >= 1000 &&
    state.height >= 700;
  return valid ? state : { width: 1440, height: 920 };
}

async function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const bounds = mainWindow.getBounds();
  try {
    await atomicWrite(windowStateFile, JSON.stringify(bounds));
  } catch {
    /* 忽略窗口状态保存失败 */
  }
}

function createWindow() {
  const state = loadWindowState();
  mainWindow = new BrowserWindow({
    width: state.width,
    height: state.height,
    x: state.x,
    y: state.y,
    minWidth: 1080,
    minHeight: 720,
    show: false,
    backgroundColor: '#f3eee4',
    title: '你只活一次',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    if (process.env.YOLO_DEVTOOLS === '1') mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 安全：禁止页面跳转与新窗口打开外部内容
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow.webContents.getURL();
    if (url !== current && !url.startsWith('file://')) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    }
  });

  mainWindow.on('close', () => {
    void saveWindowState();
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function installCsp() {
  if (isDev) return;
  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });
}

function registerIpc() {
  createAiBridge({ configRoot, safeStorage, ipcMain });
  ipcMain.handle('data:load', () => loadData());
  ipcMain.handle('data:save', (_event, data) => saveData(data));
  ipcMain.handle('data:path', () => dataFile);

  ipcMain.handle('data:export', async (_event, data) => {
    const stamp = new Date().toISOString().slice(0, 10);
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出「你只活一次」数据',
      defaultPath: path.join(app.getPath('documents'), `yolo-backup-${stamp}.json`),
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || !result.filePath) return { ok: false, canceled: true };
    await atomicWrite(result.filePath, JSON.stringify(data, null, 2));
    return { ok: true, path: result.filePath };
  });

  ipcMain.handle('data:import', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '导入「你只活一次」数据',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return { ok: false, canceled: true };
    const file = result.filePaths[0];
    try {
      const data = JSON.parse(await fsp.readFile(file, 'utf8'));
      return { ok: true, data, path: file };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  });

  ipcMain.handle('app:info', () => ({
    appVersion: app.getVersion(),
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome,
    nodeVersion: process.versions.node,
    platform: process.platform,
    arch: process.arch,
    dataPath: dataFile,
    configDir: configRoot,
    demo: isDemo,
    isDev,
  }));

  ipcMain.handle('shell:open-external', async (_event, url) => {
    if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return { ok: false };
    await shell.openExternal(url);
    return { ok: true };
  });

  ipcMain.handle('app:open-data-folder', async () => {
    await fsp.mkdir(configRoot, { recursive: true });
    shell.showItemInFolder(dataFile);
    return { ok: true };
  });

  ipcMain.handle('app:quit', () => {
    app.quit();
    return { ok: true };
  });

  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize();
    return { ok: true };
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    installCsp();
    registerIpc();
    createWindow();

    // 系统休眠/锁屏时通知渲染层：按断开时刻暂停计时，避免虚增专注时间
    const announceSuspend = (reason) => {
      const at = new Date().toISOString();
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.send('power:suspend', { at, reason });
      }
    };
    powerMonitor.on('suspend', () => announceSuspend('suspend'));
    powerMonitor.on('lock-screen', () => announceSuspend('lock-screen'));
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
