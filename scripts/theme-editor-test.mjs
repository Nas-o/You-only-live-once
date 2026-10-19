import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
for (const dir of ['.home', '.runtime', '.tmp']) fs.mkdirSync(path.join(root, dir), { recursive: true });
const workDir = path.join(root, 'screenshots/tmp/theme-editor');
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

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log('✓', message);
};

let { app, page } = await launch();
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));

await page.locator('.nav-item').nth(5).click();
await page.waitForTimeout(400);
await page.locator('.custom-theme-edit').click();
await page.waitForTimeout(300);
assert(await page.locator('.theme-editor').isVisible(), '主题编辑器能打开');
await page.screenshot({ path: path.join(root, 'screenshots/99-custom-theme-editor.png') });

await page.locator('input[placeholder="例如：噜噜"]').fill('噜噜');
const colors = page.locator('.theme-color-control input[type=color]');
await colors.nth(4).fill('#c25b48');
await page.waitForTimeout(200);
await page.screenshot({ path: path.join(root, 'screenshots/100-custom-theme-preview.png') });
await page.locator('.modal-foot button').filter({ hasText: '保存并应用' }).click();
await page.waitForTimeout(700);

const applied = await page.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  custom: document.documentElement.dataset.customTheme,
  seal: getComputedStyle(document.documentElement).getPropertyValue('--seal').trim(),
  title: document.querySelector('.theme-toggle')?.getAttribute('title') ?? '',
}));
assert(applied.custom === 'true', '自定义主题已应用');
assert(applied.seal === '#c25b48', '自定义印章色已应用');
assert(applied.title.includes('噜噜'), '顶栏显示自定义主题名');
assert((await page.locator('.custom-theme-row').innerText()).includes('噜噜'), '设置页显示自定义主题');
assert((await page.locator('.custom-theme-row').getAttribute('class')).includes('is-active'), '自定义主题处于选中状态');
await page.screenshot({ path: path.join(root, 'screenshots/101-custom-theme-applied.png') });

await app.close();
({ app, page } = await launch());
const persisted = await page.evaluate(() => ({
  theme: document.documentElement.dataset.theme,
  custom: document.documentElement.dataset.customTheme,
  seal: getComputedStyle(document.documentElement).getPropertyValue('--seal').trim(),
}));
assert(persisted.custom === 'true' && persisted.seal === '#c25b48', '自定义主题重启后保留');

await page.locator('.theme-toggle').click();
await page.waitForTimeout(300);
assert((await page.evaluate(() => document.documentElement.dataset.customTheme)) !== 'true', '顶栏主题按钮可离开自定义主题');
for (let index = 0; index < 4; index += 1) {
  await page.locator('.theme-toggle').click();
  await page.waitForTimeout(200);
}
assert((await page.evaluate(() => document.documentElement.dataset.customTheme)) === 'true', '顶栏主题按钮可回到噜噜主题');

await page.locator('.language-toggle').click();
await page.waitForTimeout(120);
await page.locator('.language-menu button').filter({ hasText: 'English' }).click();
await page.waitForTimeout(500);
await page.locator('.nav-item').filter({ hasText: 'Settings' }).click();
await page.waitForTimeout(300);
await page.locator('.custom-theme-edit').click();
await page.waitForTimeout(300);
assert((await page.locator('.modal-head h2').innerText()) === 'Custom theme', '英文主题编辑器标题');
assert(await page.locator('.theme-color-field').first().innerText().then((text) => text.includes('Page background')), '英文颜色字段');
await page.screenshot({ path: path.join(root, 'screenshots/102-custom-theme-en.png') });
assert(errors.length === 0, `主题编辑无页面错误：${errors.join('; ')}`);

await app.close();
console.log('全部自编辑主题断言通过');
