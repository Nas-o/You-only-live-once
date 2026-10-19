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
const workDir = path.join(root, 'screenshots/tmp/packaged');
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(path.join(workDir, 'yolo-linux'), { recursive: true });
const app = await electron.launch({
  executablePath: path.join(root, 'apps/linux/release/linux-unpacked/yolo'),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--force-device-scale-factor=1', '--demo'],
  cwd: path.join(root, 'apps/linux/release/linux-unpacked'),
  env: { ...process.env, XDG_CONFIG_HOME: workDir, YOLO_CONFIG_DIR: path.join(workDir, 'yolo-linux'), XDG_CACHE_HOME: path.join(root, '.xdg-cache'), HOME: path.join(root, '.home'), XDG_RUNTIME_DIR: path.join(root, '.runtime'), TMPDIR: path.join(root, '.tmp') },
  timeout: 60000,
});
const page = await app.firstWindow();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.waitForSelector('.app-shell', { timeout: 30000 });
await page.waitForTimeout(1200);
const title = await page.locator('.hero-quote').innerText();
console.log('title:', title.slice(0, 40));
console.log('tasks:', await page.locator('.task-card').count());
console.log('errors:', errors);
await page.screenshot({ path: path.join(root, 'screenshots/14-packaged.png') });
await app.close();
