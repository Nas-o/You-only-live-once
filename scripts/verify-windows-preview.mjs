/**
 * 在 Linux 上用 Linux Electron 启动 Windows 子项目的外壳与共享 UI，
 * 验证 Windows 工程配置/主进程/数据目录逻辑（不代表 Windows 原生运行）。
 */
import { _electron as electron } from 'playwright';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const electronBinary = require('electron');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'apps/windows');
const workDir = path.join(root, 'screenshots/tmp/windows-preview');
const configDir = path.join(workDir, 'yolo-windows');
const dataFile = path.join(configDir, 'yolo-data.json');

for (const dir of ['.home', '.runtime', '.tmp']) fs.mkdirSync(path.join(root, dir), { recursive: true });
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(configDir, { recursive: true });

const chromiumArgs = ['--force-device-scale-factor=1', '--demo'];
if (process.platform === 'linux') chromiumArgs.unshift('--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu');
const app = await electron.launch({
  executablePath: electronBinary,
  args: [appDir, ...chromiumArgs],
  cwd: appDir,
  env: {
    ...process.env,
    XDG_CONFIG_HOME: workDir,
    YOLO_CONFIG_DIR: configDir,
    XDG_CACHE_HOME: path.join(root, '.xdg-cache'),
    HOME: path.join(root, '.home'),
    XDG_RUNTIME_DIR: path.join(root, '.runtime'),
    TMPDIR: path.join(root, '.tmp'),
  },
  timeout: 60_000,
});

const page = await app.firstWindow();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
await page.waitForSelector('.app-shell', { timeout: 30_000 });
await page.waitForTimeout(1500);
const hero = await page.locator('.hero-quote').innerText();
const tasks = await page.locator('.task-card').count();
if (!hero.includes('先看清路')) throw new Error(`Windows shell 未渲染预期首页：${hero}`);
if (errors.length) throw new Error(`渲染错误：${errors.join(' | ')}`);
if (!fs.existsSync(dataFile)) throw new Error('Windows 数据文件未写入预期目录');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
if (!data.meta.onboarded || data.tasks.length < 5) throw new Error('示例数据未正确载入');
console.log('✓ Windows 外壳与共享 UI 启动正常');
console.log('✓ 数据目录：', dataFile);
console.log('✓ 今日任务卡片：', tasks, '· 任务总数：', data.tasks.length);
await page.screenshot({ path: path.join(root, 'screenshots/22-windows-preview.png') });
await app.close();
console.log('Windows 预览验证完成');
