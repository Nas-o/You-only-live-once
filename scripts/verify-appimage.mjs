import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
// 受限环境：把运行目录留在工作区内，并确保存在
for (const dir of ['.home', '.runtime', '.tmp']) {
  fs.mkdirSync(path.join(root, dir), { recursive: true });
}
try {
  fs.chmodSync(path.join(root, '.runtime'), 0o700);
} catch {
  /* ignore */
}
const workDir = path.join(root, 'screenshots/tmp/appimage');
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(path.join(workDir, 'yolo-linux'), { recursive: true });
const appImage = path.join(root, 'apps/linux/release/YouOnlyLiveOnce-0.1.0-x86_64.AppImage');
const app = await electron.launch({
  executablePath: appImage,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--force-device-scale-factor=1', '--demo'],
  cwd: path.join(root, 'apps/linux/release'),
  env: {
    ...process.env,
    APPIMAGE_EXTRACT_AND_RUN: '1',
    XDG_CONFIG_HOME: workDir,
    YOLO_CONFIG_DIR: path.join(workDir, 'yolo-linux'),
    XDG_CACHE_HOME: path.join(root, '.xdg-cache'),
    HOME: path.join(root, '.home'),
    XDG_RUNTIME_DIR: path.join(root, '.runtime'),
    TMPDIR: path.join(root, '.tmp'),
  },
  timeout: 90000,
});
const page = await app.firstWindow();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.waitForSelector('.app-shell', { timeout: 45000 });
await page.waitForTimeout(1200);
console.log('appimage title:', (await page.locator('.hero-quote').innerText()).slice(0, 24));
console.log('appimage errors:', errors);
await page.screenshot({ path: path.join(root, 'screenshots/15-appimage.png') });
await app.close();
