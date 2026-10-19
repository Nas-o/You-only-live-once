/**
 * 验证 Android Web 产物：
 * - 390×844 真实窗口（不是 CDP 模拟）
 * - Android 平台桥（非原生分支）写入 localStorage
 * - 底部导航、任务计时、收功结算
 */
import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const harness = path.join(root, 'scripts/android-web-harness');
const workDir = path.join(root, 'screenshots/tmp/android-web');
const dataKey = 'yolo-data-v1';
for (const dir of ['.home', '.runtime', '.tmp']) fs.mkdirSync(path.join(root, dir), { recursive: true });
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(workDir, { recursive: true });

const app = await electron.launch({
  executablePath: path.join(root, 'node_modules/electron/dist/electron'),
  args: [harness, '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  cwd: root,
  env: {
    ...process.env,
    XDG_CONFIG_HOME: workDir,
    XDG_CACHE_HOME: path.join(root, '.xdg-cache'),
    HOME: path.join(root, '.home'),
    XDG_RUNTIME_DIR: path.join(root, '.runtime'),
    TMPDIR: path.join(root, '.tmp'),
  },
  timeout: 60_000,
});
const page = await app.firstWindow();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
await page.waitForSelector('.app-shell', { timeout: 30_000 });
await page.waitForTimeout(1600);

const info = await page.evaluate(() => ({ hasBridge: Boolean(window.yolo), native: window.yolo?.isDesktop }));
if (!info.hasBridge || info.native !== false) throw new Error('Android 平台桥未正确安装');
if (!(await page.locator('.mobile-nav').isVisible())) throw new Error('Android Web 未启用移动底部导航');
if (await page.locator('.sidebar').isVisible()) throw new Error('Android Web 不应显示桌面侧栏');
const width = await page.evaluate(() => window.innerWidth);
if (width > 400) throw new Error(`窗口宽度不是手机尺寸：${width}`);

let raw = await page.evaluate((key) => localStorage.getItem(key), dataKey);
if (!raw) {
  await page.waitForTimeout(1200);
  raw = await page.evaluate((key) => localStorage.getItem(key), dataKey);
}
if (!raw) throw new Error('Android 桥未把数据写入 localStorage');
const before = JSON.parse(raw);
if (!before.meta.onboarded || before.tasks.length < 5) throw new Error('示例数据未正确载入');

await page.locator('.mobile-nav button').filter({ hasText: '任务' }).click();
await page.waitForTimeout(500);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
if (overflow > 2) throw new Error(`Android Web 任务页横向溢出：${overflow}px`);
await page
  .locator('.task-row')
  .filter({ hasText: 'Linux 命令行基础' })
  .locator('.task-action button')
  .first()
  .click();
await page.waitForSelector('.modal');
await page.waitForTimeout(500);
const reportOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
if (reportOverflow > 2) throw new Error(`Android Web 报告弹窗横向溢出：${reportOverflow}px`);
await page.screenshot({ path: path.join(root, 'screenshots/41-android-report.png') });
await page.locator('.modal-head .icon-btn').click();
await page.waitForTimeout(400);
await page
  .locator('.task-row')
  .filter({ hasText: 'JavaScript 核心语法' })
  .locator('.task-action button')
  .first()
  .click();
await page.waitForSelector('.focus-layer');
await page.waitForTimeout(6200);
await page.locator('.focus-controls button').filter({ hasText: '收功' }).click();
await page.waitForTimeout(1500);

raw = await page.evaluate((key) => localStorage.getItem(key), dataKey);
const after = JSON.parse(raw);
if (after.sessions.length <= before.sessions.length) throw new Error('收功后未写入专注记录');
if (after.activeTimers.length !== 0) throw new Error('收功后存在残留计时');
if (errors.length) throw new Error(`渲染错误：${errors.join(' | ')}`);

await page.locator('.mobile-nav button').filter({ hasText: '今日' }).click();
await page.waitForTimeout(600);
await page.screenshot({ path: path.join(root, 'screenshots/40-android-web.png') });
console.log('✓ Android 平台桥 / localStorage 持久化正常');
console.log(`✓ 收功记录：${before.sessions.length} → ${after.sessions.length}`);
console.log('✓ 移动底部导航与 390×844 布局正常');
console.log('Android Web 验收完成');
await app.close();
