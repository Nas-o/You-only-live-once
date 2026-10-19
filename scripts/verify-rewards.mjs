import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const appDir = path.join(root, 'apps/linux');
const workDir = path.join(root, 'screenshots/tmp/rewards');
const configDir = path.join(workDir, 'yolo-linux');
const dataFile = path.join(configDir, 'yolo-data.json');
for (const dir of ['.home', '.runtime', '.tmp']) fs.mkdirSync(path.join(root, dir), { recursive: true });
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(configDir, { recursive: true });
const app = await electron.launch({
  executablePath: path.join(root, 'node_modules/electron/dist/electron'),
  args: [appDir, '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--force-device-scale-factor=1', '--demo'],
  cwd: appDir,
  env: { ...process.env, XDG_CONFIG_HOME: workDir, YOLO_CONFIG_DIR: configDir, XDG_CACHE_HOME: path.join(root, '.xdg-cache'), HOME: path.join(root, '.home'), XDG_RUNTIME_DIR: path.join(root, '.runtime'), TMPDIR: path.join(root, '.tmp') },
  timeout: 60000,
});
const page = await app.firstWindow();
await page.waitForSelector('.app-shell');
await page.waitForTimeout(1500);
const read = () => JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const xp0 = read().rewards.xp;
console.log('initial xp', xp0);

await page.locator('.nav-item').filter({ hasText: '任务表' }).first().click();
await page.waitForTimeout(400);
await page.locator('.task-row').filter({ hasText: 'JavaScript 核心语法' }).click();
await page.waitForTimeout(500);
await page.locator('.progress-slider').evaluate(() => {});
await page.locator('.drawer-scroll').evaluate((el) => { el.scrollTop = 760; });
await page.waitForTimeout(300);
const firstCheck = page.locator('.phase-item').first().locator('.phase-check');
await firstCheck.click();
await page.waitForTimeout(300);
await firstCheck.click();
await page.waitForTimeout(800);
let d = read();
if (d.rewards.xp !== xp0) throw new Error(`phase redo changed xp: ${xp0} -> ${d.rewards.xp}`);
console.log('✓ 阶段撤销/重做不重复领奖');

await page.locator('.drawer-scroll').evaluate((el) => { el.scrollTop = 0; });
await page.waitForTimeout(200);
await page.locator('.detail-actions button').filter({ hasText: '标记完成' }).click();
await page.waitForSelector('.growth-stamp-btn', { timeout: 5000 });
console.log('✓ 完成任务归档证据');
await page.locator('.growth-stamp-btn').click();
await page.waitForTimeout(800);
d = read();
const xp1 = d.rewards.xp;
console.log('after complete xp', xp1);
if (xp1 <= xp0) throw new Error('task completion did not award xp');
if (!d.tasks.find((t) => t.id === 't_js').completionRewardedAt) throw new Error('completion reward marker missing');

await page.locator('.detail-actions button').filter({ hasText: '重新开启' }).click();
await page.waitForTimeout(400);
await page.locator('.detail-actions button').filter({ hasText: '标记完成' }).click();
await page.waitForTimeout(900);
d = read();
if (d.rewards.xp !== xp1) throw new Error(`re-complete changed xp: ${xp1} -> ${d.rewards.xp}`);
console.log('✓ 任务重开再完成不重复领奖');

await page.locator('.detail-close').click();
await page.waitForTimeout(250);
await page.locator('.nav-item').filter({ hasText: '成长' }).first().click();
await page.waitForTimeout(500);
if (!(await page.locator('.growth-page').isVisible())) throw new Error('growth page not shown');
if ((await page.locator('.growth-skill-card').count()) < 1) throw new Error('skill tree not rendered');
if (!(await page.locator('.growth-page').innerText()).includes('证据')) throw new Error('evidence copy missing');
console.log('✓ 成长技能树与证据链正常渲染');

console.log('全部奖励断言通过');
await app.close();
