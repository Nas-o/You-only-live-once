/**
 * 主题切换验收：
 * paper → ink → swiss → paper；检查 dataset、截图、持久化与重启恢复。
 */
import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'apps/linux');
const workDir = path.join(root, 'screenshots/tmp/themes');
const configDir = path.join(workDir, 'yolo-linux');
const dataFile = path.join(configDir, 'yolo-data.json');
for (const dir of ['.home', '.runtime', '.tmp']) fs.mkdirSync(path.join(root, dir), { recursive: true });
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(configDir, { recursive: true });

const env = {
  ...process.env,
  XDG_CONFIG_HOME: workDir,
  YOLO_CONFIG_DIR: configDir,
  XDG_CACHE_HOME: path.join(root, '.xdg-cache'),
  HOME: path.join(root, '.home'),
  XDG_RUNTIME_DIR: path.join(root, '.runtime'),
  TMPDIR: path.join(root, '.tmp'),
};
const args = [appDir, '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--force-device-scale-factor=1', '--demo'];
function launch() {
  return electron.launch({
    executablePath: path.join(root, 'node_modules/electron/dist/electron'),
    args,
    cwd: appDir,
    env,
    timeout: 60_000,
  });
}
async function themeOf(page) {
  return page.evaluate(() => document.documentElement.dataset.theme);
}
async function clearToasts(page) {
  while ((await page.locator('.toast-close').count()) > 0) {
    await page.locator('.toast-close').first().click();
    await page.waitForTimeout(60);
  }
}

async function shot(page, name) {
  await page.waitForTimeout(500);
  await clearToasts(page);
  await page.screenshot({ path: path.join(root, 'screenshots', name) });
  console.log(`✓ ${name}`);
}

let app = await launch();
let page = await app.firstWindow();
await page.waitForSelector('.app-shell');
await page.waitForTimeout(1200);
if ((await themeOf(page)) !== 'paper') throw new Error('默认主题不是 paper');
if (!(await page.locator('.theme-toggle').isVisible())) throw new Error('顶栏主题按钮不可见');
await shot(page, '42-theme-paper.png');

await page.locator('.theme-toggle').click();
await page.waitForTimeout(700);
if ((await themeOf(page)) !== 'ink') throw new Error('第一次点击未切换到 ink');
await shot(page, '43-theme-ink.png');
await page.locator('.nav-item').filter({ hasText: '任务表' }).first().click();
await page.waitForTimeout(500);
await shot(page, '44-theme-ink-tasks.png');

await page.locator('.theme-toggle').click();
await page.waitForTimeout(700);
if ((await themeOf(page)) !== 'swiss') throw new Error('第二次点击未切换到 swiss');
await shot(page, '45-theme-swiss-tasks.png');
await page.locator('.nav-item').filter({ hasText: '今日' }).first().click();
await page.waitForTimeout(500);
await shot(page, '46-theme-swiss.png');

await page.locator('.theme-toggle').click();
await page.waitForTimeout(700);
if ((await themeOf(page)) !== 'lulu') throw new Error('第三次点击未切换到 lulu');
await shot(page, '49-theme-lulu.png');

// 在设置页选择 ink，测试设置面板按钮
await page.locator('.nav-item').filter({ hasText: '设置' }).first().click();
await page.waitForTimeout(500);
const luluTone = page.locator('.skin-tone-switch button').filter({ hasText: '暗色' });
if (await luluTone.count()) {
  await luluTone.click();
  await page.waitForTimeout(400);
  if ((await page.evaluate(() => document.documentElement.dataset.skinTone)) !== 'dark') {
    throw new Error('噜噜暗色未应用');
  }
  await shot(page, '50-theme-lulu-dark.png');
  await page.locator('.nav-item').filter({ hasText: '今日' }).first().click();
  await page.waitForTimeout(400);
  await shot(page, '51-theme-lulu-dark-today.png');
  await page.locator('.nav-item').filter({ hasText: '设置' }).first().click();
  await page.waitForTimeout(300);
  await page.locator('.skin-tone-switch button').filter({ hasText: '亮色' }).click();
  await page.waitForTimeout(300);
}
await page.locator('.nav-item').filter({ hasText: '今日' }).first().click();
await page.waitForTimeout(300);
await page.locator('.theme-toggle').click(); // lulu -> paper
await page.waitForTimeout(500);
await page.locator('.theme-toggle').click(); // paper -> ink
await page.waitForTimeout(700);
await page.locator('.nav-item').filter({ hasText: '设置' }).first().click();
await page.waitForTimeout(500);
await page.locator('.theme-option.theme-swiss').click();
await page.waitForTimeout(700);
if ((await themeOf(page)) !== 'swiss') throw new Error('设置面板未切换到 swiss');
await shot(page, '47-theme-settings.png');

// 持久化：设回 ink 并等待保存
await page.locator('.theme-option.theme-ink').click();
await page.waitForTimeout(1500);
const saved = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
if (saved.settings.theme !== 'ink') throw new Error(`主题未持久化：${saved.settings.theme}`);
await app.close();
app = null;

// 重启恢复
app = await launch();
page = await app.firstWindow();
await page.waitForSelector('.app-shell');
await page.waitForTimeout(1200);
if ((await themeOf(page)) !== 'ink') throw new Error('重启后未恢复 ink 主题');
await shot(page, '48-theme-restored.png');
await app.close();
console.log('主题切换、设置面板与重启恢复全部通过');
