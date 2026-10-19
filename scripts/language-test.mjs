import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
for (const dir of ['.home', '.runtime', '.tmp']) fs.mkdirSync(path.join(root, dir), { recursive: true });
const workDir = path.join(root, 'screenshots/tmp/language');
const configDir = path.join(workDir, 'yolo-linux');
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
  ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
};

const launch = async () => {
  const app = await electron.launch({
    executablePath: path.join(root, 'node_modules/electron/dist/electron'),
    args: [
      path.join(root, 'apps/linux'),
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--force-device-scale-factor=1',
      '--demo',
    ],
    cwd: path.join(root, 'apps/linux'),
    env,
    timeout: 60000,
  });
  const page = await app.firstWindow();
  await page.waitForSelector('.app-shell');
  await page.waitForTimeout(1200);
  return { app, page };
};

const pick = async (page, label) => {
  await page.locator('.language-toggle').click();
  await page.waitForTimeout(150);
  await page.locator('.language-menu button').filter({ hasText: label }).click();
  await page.waitForTimeout(700);
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log('✓', message);
};

let { app, page } = await launch();
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));

await pick(page, 'English');
assert((await page.locator('.nav-item').allInnerTexts()).some((text) => text.includes('Tasks')), 'English 导航');
assert((await page.evaluate(() => document.documentElement.lang)) === 'en', 'English lang 属性');
assert((await page.locator('.language-toggle').innerText()).includes('EN'), 'English 顶栏语言标记');
await page.screenshot({ path: path.join(root, 'screenshots/70-language-en.png') });
await page.locator('.nav-item').filter({ hasText: 'Tasks' }).first().click();
await page.waitForTimeout(400);
assert((await page.locator('.page-header .page-lede').innerText()).includes('Every task'), 'English 页面正文');
await page.screenshot({ path: path.join(root, 'screenshots/71-language-en-tasks.png') });

await page.locator('.nav-item').filter({ hasText: 'Stats' }).click();
await page.waitForTimeout(400);
assert((await page.locator('.page-lede').innerText()).includes('No grades here'), 'English 统计页镜子文案');
const statHints = await page.locator('.stat-hint').allInnerTexts();
assert(statHints.some((text) => text.includes('Completion 17%')), 'English 完成率');
assert(statHints.some((text) => text.includes('5 recons')), 'English 启程侦查数量');
await page.screenshot({ path: path.join(root, 'screenshots/87-en-stats.png') });

await page.locator('.nav-item').filter({ hasText: 'Growth' }).click();
await page.waitForTimeout(400);
assert((await page.locator('.page-lede').innerText()).includes('Focus, recon'), 'English 成长页文案');
assert((await page.locator('.growth-stage-side h2').innerText()) === 'Steady builder', 'English 成长阶段名');
await page.screenshot({ path: path.join(root, 'screenshots/88-en-growth.png') });

await page.locator('.nav-item').filter({ hasText: 'Tasks' }).click();
await page.waitForTimeout(300);
await page.locator('.task-row').filter({ hasText: 'Linux' }).locator('.task-action button').click();
await page.waitForTimeout(400);
assert((await page.locator('.report-banner').innerText()).includes('Ten minutes of recon'), 'English 启程侦查提示');
assert((await page.locator('.report-banner').innerText()).includes('task phases'), 'English 启程侦查排版文案');
assert((await page.locator('.report-form textarea').first().getAttribute('placeholder')).includes('e.g.'), 'English 报告占位符');
await page.locator('.modal-head .icon-btn').click();
await page.waitForTimeout(300);

await page.locator('.nav-item').filter({ hasText: 'Settings' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: path.join(root, 'screenshots/72-language-en-settings.png') });
await page.locator('.nav-item').filter({ hasText: 'Tasks' }).click();
await page.waitForTimeout(300);

await pick(page, '日本語');
assert((await page.locator('.nav-item').allInnerTexts()).some((text) => text.includes('タスク')), '日本語ナビ');
assert((await page.evaluate(() => document.documentElement.lang)) === 'ja', '日本語 lang 属性');
await page.screenshot({ path: path.join(root, 'screenshots/73-language-ja.png') });

await pick(page, '한국어');
assert((await page.locator('.nav-item').allInnerTexts()).some((text) => text.includes('작업')), '한국어 내비');
assert((await page.evaluate(() => document.documentElement.lang)) === 'ko', '한국어 lang 속성');
await page.screenshot({ path: path.join(root, 'screenshots/74-language-ko.png') });

await pick(page, '中文');
assert((await page.locator('.nav-item').allInnerTexts()).some((text) => text.includes('任务表')), '中文导航恢复');
assert((await page.evaluate(() => document.documentElement.lang)) === 'zh-CN', '中文 lang 属性');

await pick(page, 'English');
await page.waitForTimeout(600);
await app.close();
({ app, page } = await launch());
assert((await page.locator('.nav-item').allInnerTexts()).some((text) => text.includes('Tasks')), '语言设置在重启后保留');
assert((await page.evaluate(() => document.documentElement.lang)) === 'en', '重启后 lang 属性保留');
assert(errors.length === 0, `语言切换无页面错误：${errors.join('; ')}`);

await app.close();
console.log('全部语言断言通过');
