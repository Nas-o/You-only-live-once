/** 仅用于在桌面上验证 Android Web 产物（file:// + localStorage 桥），不是 Android 应用本体。 */
const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const workDir = path.join(root, 'screenshots/tmp/android-web');
fs.mkdirSync(workDir, { recursive: true });
app.setName('YOLO Android Web QA');
app.setPath('userData', path.join(workDir, 'userData'));

app.whenReady().then(() => {
  const win = new BrowserWindow({
    width: 390,
    height: 844,
    show: false,
    backgroundColor: '#0b0e13',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(root, 'apps/android/dist/index.html'), { query: { demo: '1' } });
  win.once('ready-to-show', () => win.show());
});

app.on('window-all-closed', () => app.quit());
