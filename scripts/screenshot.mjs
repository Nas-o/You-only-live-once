/**
 * 真实 Electron 截图验收脚本。
 * 用法：node scripts/screenshot.mjs
 * 输出：screenshots/*.png
 */
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
const appDir = path.join(root, 'apps/linux');
const shotDir = path.join(root, 'screenshots');
const configRoot = path.join(shotDir, 'tmp', 'config');

fs.rmSync(path.join(shotDir, 'tmp'), { recursive: true, force: true });
fs.mkdirSync(path.join(configRoot, 'yolo-linux'), { recursive: true });
fs.mkdirSync(shotDir, { recursive: true });

const env = {
  ...process.env,
  XDG_CONFIG_HOME: configRoot,
  XDG_CACHE_HOME: path.join(root, '.xdg-cache'),
  ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
  YOLO_CONFIG_DIR: path.join(configRoot, 'yolo-linux'),
  HOME: path.join(root, '.home'),
  XDG_RUNTIME_DIR: path.join(root, '.runtime'),
  TMPDIR: path.join(root, '.tmp'),
};

async function launch({ demo, configName }) {
  const configDir = path.join(shotDir, 'tmp', configName);
  fs.rmSync(configDir, { recursive: true, force: true });
  fs.mkdirSync(path.join(configDir, 'yolo-linux'), { recursive: true });
  const childEnv = {
    ...env,
    XDG_CONFIG_HOME: configDir,
    YOLO_CONFIG_DIR: path.join(configDir, 'yolo-linux'),
  };
  const args = [
    appDir,
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-gpu-compositing',
    '--disable-software-rasterizer',
    '--force-device-scale-factor=1',
  ];
  if (demo) args.push('--demo');
  const app = await electron.launch({
    executablePath: path.join(root, 'node_modules/electron/dist/electron'),
    args,
    cwd: appDir,
    env: childEnv,
    timeout: 60_000,
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1800);
  return { app, page };
}

async function shot(page, name) {
  await page.waitForTimeout(420);
  await page.screenshot({ path: path.join(shotDir, `${name}.png`) });
  console.log(`✓ ${name}.png`);
}

async function clearToasts(page) {
  const closes = page.locator('.toast-close');
  while ((await closes.count()) > 0) {
    await closes.first().click({ timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(100);
  }
}

async function main() {
  let app;
  let page;
  try {
  ({ app, page } = await launch({ demo: true, configName: 'demo' }));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[renderer error]', msg.text());
  });
  page.on('pageerror', (error) => console.log('[page error]', error.message));

  await page.waitForSelector('.app-shell', { timeout: 30_000 });
  await shot(page, '01-today');

  const nav = (name) => page.locator('.nav-item').filter({ hasText: name }).first();
  console.log('→ tasks');
  await nav('任务表').click();
  await page.waitForTimeout(600);
  await shot(page, '02-tasks');

  await page.locator('.task-row').filter({ hasText: 'JavaScript 核心语法' }).click();
  await page.waitForTimeout(500);
  await shot(page, '03-task-detail');

  await page.locator('.drawer-scroll').evaluate((el) => { el.scrollTop = 820; });
  await shot(page, '16-task-phases');
  await page.locator('.phase-item').first().locator('button[aria-label="编辑阶段"]').click();
  await shot(page, '17-phase-editor');
  await page.locator('.session-list').scrollIntoViewIfNeeded();
  await shot(page, '18-task-sessions');
  await page.locator('.note-section').evaluate((el) => el.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(350);
  await shot(page, '49-task-document');
  await page.locator('.doc-tabs button').filter({ hasText: '预览' }).click();
  await page.waitForTimeout(300);
  await shot(page, '50-task-document-preview');
  await page.locator('.note-expand-btn').click();
  await page.waitForTimeout(350);
  await page.locator('.doc-tab-split').click();
  await page.waitForTimeout(300);
  await shot(page, '51-task-document-expanded');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  await page.locator('.drawer-scroll').evaluate((el) => { el.scrollTop = 0; });
  await page.waitForTimeout(250);
  await page.locator('.section-head-actions button').filter({ hasText: '修订' }).click();
  await page.waitForTimeout(450);
  await page.locator('.modal-body').evaluate((el) => { el.scrollTop = 760; });
  await shot(page, '19-report-path');
  await page.locator('.modal-head .icon-btn').click();
  await page.waitForTimeout(300);
  await page.locator('.detail-close').click();
  await page.waitForTimeout(300);

  console.log('→ filter missing-report');
  await page.locator('.segmented button').filter({ hasText: '需侦查' }).click();
  await page.waitForTimeout(400);
  await shot(page, '04-tasks-missing-report');
  await page.locator('.task-row').filter({ hasText: 'Linux 命令行基础' }).click();
  await page.waitForTimeout(300);
  await shot(page, '05-task-detail-needs-report');
  await page.locator('.detail-close').click();
  await page.waitForTimeout(300);

  await page.locator('.task-row').filter({ hasText: 'Linux 命令行基础' }).locator('button').filter({ hasText: '先侦查' }).click();
  await page.waitForTimeout(500);
  await shot(page, '06-report-modal');
  await page.locator('.modal-head .icon-btn').click();
  await page.waitForTimeout(300);

  console.log('→ goals');
  await nav('大目标').click();
  await page.waitForTimeout(600);
  await shot(page, '07-goals');
  await page.locator('.goal-card').first().click();
  await page.waitForTimeout(500);
  await shot(page, '08-goal-detail');
  await page.locator('.detail-close').click();
  await page.waitForTimeout(300);

  console.log('→ growth');
  await nav('成长').click();
  await page.waitForTimeout(600);
  await shot(page, '09-growth');

  console.log('→ stats');
  await nav('统计').click();
  await page.waitForTimeout(600);
  await shot(page, '10-stats');
  await page.locator('.calibration-row').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  await shot(page, '63-stats-estimate');

  console.log('→ settings');
  await nav('设置').click();
  await page.waitForTimeout(600);
  await shot(page, '11-settings');

  console.log('→ focus');
  await nav('任务表').click();
  await page.waitForTimeout(500);
  await page.locator('.segmented button').filter({ hasText: '全部' }).click();
  await page.waitForTimeout(400);
  await page
    .locator('.task-row')
    .filter({ hasText: 'JavaScript 核心语法' })
    .locator('.task-action button')
    .first()
    .click();
  await page.waitForTimeout(1500);
  await shot(page, '12-focus');
  await page.locator('.focus-close').click();
  await page.waitForTimeout(400);

  await page
    .locator('.task-row')
    .filter({ hasText: 'React 组件与状态管理' })
    .locator('.task-action button')
    .first()
    .click();
  await page.waitForTimeout(700);
  await nav('今日').click();
  await page.waitForTimeout(500);
  await shot(page, '20-single-focus-guard');

  await app.close();
  app = null;

  console.log('→ onboarding');
  const onboarding = await launch({ demo: false, configName: 'fresh' });
  await onboarding.page.waitForSelector('.onboarding', { timeout: 30_000 });
  await shot(onboarding.page, '13-onboarding');
  await onboarding.page.locator('.onboarding-panel input[type="text"]').fill('行者');
  await onboarding.page.locator('.onboarding-submit').click();
  await onboarding.page.waitForSelector('.app-shell', { timeout: 30_000 });
  await onboarding.page.waitForTimeout(800);
  await clearToasts(onboarding.page);
  await shot(onboarding.page, '57-empty-today');
  await onboarding.page.locator('.nav-item').filter({ hasText: '任务表' }).first().click();
  await onboarding.page.waitForTimeout(500);
  await shot(onboarding.page, '58-empty-tasks');
  await onboarding.page.locator('.nav-item').filter({ hasText: '大目标' }).first().click();
  await onboarding.page.waitForTimeout(500);
  await shot(onboarding.page, '59-empty-goals');
  await onboarding.page.locator('.nav-item').filter({ hasText: '统计' }).first().click();
  await onboarding.page.waitForTimeout(500);
  await shot(onboarding.page, '60-empty-stats');
  await onboarding.app.close();

  console.log('→ growth stamp');
  const growth = await launch({ demo: true, configName: 'growth-stamp' });
  await growth.page.waitForSelector('.app-shell', { timeout: 30_000 });
  await growth.page.locator('.nav-item').filter({ hasText: '任务表' }).first().click();
  await growth.page.waitForTimeout(500);
  await growth.page.locator('.task-row').filter({ hasText: 'JavaScript 核心语法' }).click();
  await growth.page.waitForTimeout(400);
  await growth.page.locator('.detail-actions button').filter({ hasText: '标记完成' }).click();
  await growth.page.waitForSelector('.growth-stamp-layer', { timeout: 5000 });
  await clearToasts(growth.page);
  await shot(growth.page, '61-growth-stamp');
  await growth.page.locator('.growth-stamp-btn').click();
  await growth.app.close();

  console.log('→ AI panels');
  const ai = await launch({ demo: true, configName: 'ai-panels' });
  await ai.page.waitForSelector('.app-shell', { timeout: 30_000 });
  await ai.page.locator('.nav-item').filter({ hasText: '任务表' }).first().click();
  await ai.page.waitForTimeout(400);
  await ai.page.locator('.task-row').filter({ hasText: 'JavaScript 核心语法' }).click();
  await ai.page.waitForTimeout(400);
  await ai.page.locator('.ai-estimate-panel').scrollIntoViewIfNeeded();
  await ai.page.waitForTimeout(350);
  await shot(ai.page, '64-ai-task-panel');
  await ai.page.locator('.detail-close').click();
  await ai.page.waitForTimeout(250);
  await ai.page.locator('.nav-item').filter({ hasText: '设置' }).click();
  await ai.page.waitForTimeout(350);
  await ai.page.locator('.ai-settings-card').scrollIntoViewIfNeeded();
  await ai.page.waitForTimeout(350);
  await shot(ai.page, '65-ai-settings');
  await ai.app.close();

  console.log('done');
  } finally {
    if (app) {
      try {
        await app.close();
      } catch {
        /* ignore */
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
