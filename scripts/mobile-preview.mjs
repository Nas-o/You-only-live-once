/**
 * 移动视口验收：用 Electron 加载 Linux 版共享 UI，并通过 CDP 模拟 390×844 手机屏幕。
 * 用于在 Android 打包前检查响应式布局。
 */
import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'apps/linux');
const workDir = path.join(root, 'screenshots/tmp/mobile');
const configDir = path.join(workDir, 'yolo-linux');
for (const dir of ['.home', '.runtime', '.tmp']) fs.mkdirSync(path.join(root, dir), { recursive: true });
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(configDir, { recursive: true });

const app = await electron.launch({
  executablePath: path.join(root, 'node_modules/electron/dist/electron'),
  args: [appDir, '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--demo'],
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
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
await page.waitForSelector('.app-shell');
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: 390,
  screenHeight: 844,
});
await page.waitForTimeout(800);

const shot = async (name) => {
  await page.waitForTimeout(350);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 2) throw new Error(`${name} 出现横向溢出：${overflow}px`);
  await page.screenshot({ path: path.join(root, 'screenshots', name) });
  console.log(`✓ ${name}`);
  return overflow;
};

if (!(await page.locator('.mobile-nav').isVisible())) throw new Error('移动底部导航未显示');
if (await page.locator('.sidebar').isVisible()) throw new Error('移动端侧栏不应显示');
await shot('30-mobile-today.png');

const mobileNav = (name) => page.locator('.mobile-nav button').filter({ hasText: name }).first();
await mobileNav('任务').click();
await page.waitForTimeout(500);
await shot('31-mobile-tasks.png');

await page.locator('.task-row').filter({ hasText: 'JavaScript 核心语法' }).click();
await page.waitForTimeout(450);
await shot('32-mobile-task-detail.png');
await page.locator('.note-section').scrollIntoViewIfNeeded();
await page.waitForTimeout(350);
await shot('52-mobile-document.png');
await page.locator('.doc-tabs button').filter({ hasText: '预览' }).click();
await page.waitForTimeout(300);
await shot('53-mobile-document-preview.png');
await page.locator('.note-expand-btn').click();
await page.waitForTimeout(350);
await shot('54-mobile-document-expanded.png');
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
await page.locator('.detail-close').click();
await page.waitForTimeout(250);

await page.locator('.task-row').filter({ hasText: 'Linux 命令行基础' }).locator('.task-action button').first().click();
await page.waitForTimeout(500);
await shot('33-mobile-report.png');
await page.locator('.modal-head .icon-btn').click();
await page.waitForTimeout(300);

await mobileNav('星图').click();
await page.waitForTimeout(450);
await shot('34-mobile-goals.png');
await page.locator('.goal-card').first().click();
await page.waitForTimeout(400);
await shot('35-mobile-goal-detail.png');
await page.locator('.detail-close').click();
await page.waitForTimeout(300);

await mobileNav('成长').click();
await page.waitForTimeout(450);
await shot('36-mobile-growth.png');

await mobileNav('统计').click();
await page.waitForTimeout(450);
await shot('37-mobile-stats.png');

await page.locator('.mobile-only[aria-label="设置"]').click();
await page.waitForTimeout(450);
await shot('38-mobile-settings.png');

await mobileNav('任务').click();
await page.waitForTimeout(400);
await page.locator('.task-row').filter({ hasText: 'JavaScript 核心语法' }).locator('.task-action button').first().click();
await page.waitForTimeout(700);
await shot('39-mobile-focus.png');
await page.locator('.focus-close').click();
await page.waitForTimeout(300);

if (errors.length) throw new Error(`渲染错误：${errors.join(' | ')}`);
console.log('移动视口验收完成');
await app.close();
