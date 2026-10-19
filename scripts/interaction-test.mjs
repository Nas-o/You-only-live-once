/**
 * 交互回归测试（真实 Electron + 真实 UI 操作）
 * 覆盖：报告门禁、自动计时、收功、单计时守卫、点亮知识、创建任务、持久化、引导流程
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
const workDir = path.join(root, 'screenshots', 'tmp', 'interaction');
const configDir = path.join(workDir, 'yolo-linux');
const dataFile = path.join(configDir, 'yolo-data.json');

fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(configDir, { recursive: true });

const baseEnv = {
  ...process.env,
  XDG_CACHE_HOME: path.join(root, '.xdg-cache'),
  HOME: path.join(root, '.home'),
  XDG_RUNTIME_DIR: path.join(root, '.runtime'),
  TMPDIR: path.join(root, '.tmp'),
  ELECTRON_DISABLE_SECURITY_WARNINGS: 'true',
};

const runtimeErrors = [];

const args = [
  appDir,
  '--no-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-gpu-compositing',
  '--disable-software-rasterizer',
  '--force-device-scale-factor=1',
];

function assert(condition, message) {
  if (!condition) throw new Error(`断言失败：${message}`);
  console.log(`  ✓ ${message}`);
}

function readData() {
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

async function waitForSave(page, ms = 1400) {
  await page.waitForTimeout(ms);
}

async function launch(demo) {
  const app = await electron.launch({
    executablePath: path.join(root, 'node_modules/electron/dist/electron'),
    args: demo ? [...args, '--demo'] : args,
    cwd: appDir,
    env: { ...baseEnv, XDG_CONFIG_HOME: workDir, YOLO_CONFIG_DIR: configDir },
    timeout: 60_000,
  });
  const page = await app.firstWindow();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
      runtimeErrors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => {
    errors.push(error.message);
    runtimeErrors.push(error.message);
  });
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1800);
  return { app, page, errors };
}

async function nav(page, name) {
  await page.locator('.nav-item').filter({ hasText: name }).first().click();
  await page.waitForTimeout(450);
}

async function main() {
  let app;
  let page;
  try {
    ({ app, page } = await launch(true));
    await page.waitForSelector('.app-shell', { timeout: 30_000 });

    console.log('▶ 报告门禁与自动计时');
    await nav(page, '任务表');
    await page.locator('.segmented button').filter({ hasText: '需侦查' }).click();
    await page.waitForTimeout(300);
    await page
      .locator('.task-row')
      .filter({ hasText: 'Linux 命令行基础' })
      .locator('.task-action button')
      .click();
    await page.waitForSelector('.modal');
    assert(await page.locator('.modal').isVisible(), '无报告任务点击计时会打开侦查报告');

    await page.getByPlaceholder(/JavaScript 的作用域/).fill(
      'Linux 命令行与文件系统：目录结构、权限、进程、管道与常用排错命令。',
    );
    await page.getByPlaceholder(/能独立读懂并改写/).fill(
      '能独立在服务器上完成文件管理、日志排查、进程检查与基础部署，不依赖图形界面。',
    );
    await page.getByPlaceholder(/不查资料写出闭包/).fill(
      '不查资料完成 30 个常用命令练习；能在 10 分钟内定位端口占用并清理日志。',
    );
    await page.getByPlaceholder(/会 HTML\/CSS 和基础函数/).fill(
      '有一台可用的 Linux 环境，理解文件与目录的基本概念。',
    );
    await page.getByPlaceholder(/闭包、原型、Promise/).fill(
      '文件与目录、权限、grep/sed/awk、管道重定向、进程管理、ssh 与 systemd。',
    );
    await page.getByPlaceholder(/暂不深挖 V8 源码/).fill(
      '暂不研究内核源码与复杂 shell 编程；不背冷门参数，需要时查手册。',
    );
    await page.getByPlaceholder(/容易陷入教程循环/).fill(
      '容易只看不练；权限与路径容易混淆；远程操作前忘记备份。',
    );
    const stepNames = page.getByLabel(/第 1 步名称/);
    await stepNames.fill('文件与目录基础');
    await page.getByLabel(/第 2 步名称/).fill('权限与常用文本工具');
    await page.getByLabel(/第 1 步说明/).fill('路径、查看、创建、移动与删除');
    await page.getByLabel(/第 2 步说明/).fill('chmod、grep、管道与重定向');
    await page.getByLabel('资料 1').fill('《鸟哥的 Linux 私房菜》');
    await page.waitForTimeout(300);

    const submit = page.locator('.modal-foot button').filter({ hasText: '提交并开始计时' });
    assert(!(await submit.isDisabled()), '完整报告后提交按钮可用');
    await submit.click();
    await page.waitForSelector('.focus-layer', { timeout: 10_000 });
    assert(await page.locator('.focus-layer').isVisible(), '提交报告后自动进入专注空间');

    await page.waitForTimeout(6500);
    const clockText = await page.locator('.focus-clock').innerText();
    assert(/00:0[5-9]|00:1[0-9]/.test(clockText) || clockText !== '00:00:00', `计时器在走：${clockText}`);
    await page.locator('.focus-controls button').filter({ hasText: '收功' }).click();
    await page.waitForTimeout(500);
    assert(!(await page.locator('.focus-layer').count()), '收功后专注空间关闭');
    await waitForSave(page);

    let data = readData();
    const linux = data.tasks.find((t) => t.id === 't_linux');
    assert(Boolean(linux.report), '报告已写入任务');
    assert(linux.report.score >= 80, `报告评分合理：${linux.report.score}`);
    assert(linux.totalFocusSeconds >= 5, `专注时长已记录：${linux.totalFocusSeconds}s`);
    assert(data.sessions.length >= 26, `专注记录已追加：${data.sessions.length} 条`);
    assert(data.activeTimers.length === 0, '收功后无残留计时');
    const xpAfterReport = data.rewards.xp;
    assert(xpAfterReport > 2_790, `成长值增加：${xpAfterReport}`);

    console.log('▶ 单计时守卫');
    await nav(page, '任务表');
    await page.locator('.segmented button').filter({ hasText: '全部' }).click();
    await page.waitForTimeout(300);
    await page
      .locator('.task-row')
      .filter({ hasText: 'JavaScript 核心语法' })
      .locator('.task-action button')
      .click();
    await page.waitForTimeout(400);
    await page.locator('.focus-close').click();
    await page.waitForTimeout(350);
    await page
      .locator('.task-row')
      .filter({ hasText: 'React 组件与状态管理' })
      .locator('.task-action button')
      .click();
    await page.waitForTimeout(600);
    const toastText = await page.locator('.toast-host').innerText();
    assert(toastText.includes('人不能一心二用'), '第二个任务不能同时开始计时');
    await waitForSave(page);
    data = readData();
    assert(data.activeTimers.length === 1, '只保留一个活跃计时');

    console.log('▶ 点亮知识点');
    await nav(page, '大目标');
    await page.locator('.goal-card').filter({ hasText: '建立个人品牌' }).click();
    await page.waitForTimeout(500);
    const pointRow = page.locator('.point-row').filter({ hasText: '作品集网站' }).first();
    await pointRow.locator('button').filter({ hasText: '点亮' }).click();
    await page.waitForTimeout(700);
    assert((await pointRow.getAttribute('class')).includes('is-lit'), '知识点已点亮');
    await page.locator('.detail-close').click();
    await waitForSave(page);
    data = readData();
    const brand = data.goals.find((g) => g.id === 'g_brand') ?? data.goals.find((g) => g.title === '建立个人品牌');
    assert(
      brand.knowledgePoints.find((p) => p.title === '作品集网站').status === 'lit',
      '点亮状态已持久化',
    );

    console.log('▶ 学习文档 Markdown 编辑器');
    await nav(page, '任务表');
    await page.locator('.task-row').filter({ hasText: 'JavaScript 核心语法' }).click();
    await page.waitForTimeout(500);
    await page.locator('.note-section').scrollIntoViewIfNeeded();
    await page.locator('.doc-tabs button').filter({ hasText: '预览' }).click();
    await page.waitForTimeout(300);
    assert((await page.locator('.md-doc h2').count()) >= 1, 'Markdown 标题已渲染');
    assert((await page.locator('.md-doc pre').count()) >= 1, 'Markdown 代码块已渲染');
    assert(
      (await page.locator('.md-doc input[type=checkbox]').count()) >= 2,
      'Markdown 任务清单已渲染',
    );

    await page.locator('.doc-tabs button').filter({ hasText: '编写' }).click();
    await page.locator('.doc-textarea').fill(
      '## 交互测试文档\n\n<script>window.__xss = 1</script>\n\n| 项目 | 状态 |\n| --- | --- |\n| Markdown | ok |\n\n- [x] Markdown 渲染\n\n```js\nconst ok = true;\n```',
    );
    await page.locator('.note-head-actions .btn-primary').click();
    await page.waitForTimeout(300);
    assert(
      (await page.locator('.toast-host').innerText()).includes('学习文档已保存'),
      '学习文档手动保存有反馈',
    );
    await page.locator('.doc-tabs button').filter({ hasText: '预览' }).click();
    await page.waitForTimeout(300);
    assert((await page.locator('.md-doc script').count()) === 0, 'Markdown 预览会清理脚本标签');
    assert(
      (await page.locator('.md-doc table').count()) >= 1,
      'Markdown 表格已渲染',
    );
    assert(
      (await page.evaluate(() => window.__xss)) === undefined,
      'Markdown 中的脚本不会执行',
    );
    await page.waitForTimeout(1200);
    await page.locator('.note-expand-btn').click();
    assert(await page.locator('.note-section.is-expanded').isVisible(), '学习文档可以全屏展开');
    await page.locator('.doc-tab-split').click();
    assert(await page.locator('.doc-body.is-split').isVisible(), '学习文档可以左右分栏');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    assert(
      await page.locator('.drawer').isVisible(),
      '收起全屏文档时任务抽屉仍然保留',
    );
    await page.locator('.detail-close').click();
    await waitForSave(page);
    data = readData();
    const jsTask = data.tasks.find((t) => t.id === 't_js');
    assert(jsTask.note.includes('交互测试文档'), '学习文档已自动保存到任务');

    console.log('▶ 学习文档写作计时');
    await nav(page, '任务表');
    await page.locator('.task-row').filter({ hasText: 'JavaScript 核心语法' }).click();
    await page.waitForTimeout(400);
    await page.locator('.note-section').scrollIntoViewIfNeeded();
    const writingBefore = readData().writingLogs.length;
    await page.locator('.doc-writing-controls button').filter({ hasText: '开始写作' }).click();
    await page.waitForTimeout(6500);
    await page.locator('.doc-writing-controls button').filter({ hasText: '结束并记录' }).click();
    await waitForSave(page);
    data = readData();
    const latestWriting = data.writingLogs.at(-1);
    assert(data.writingLogs.length === writingBefore + 1, '写作计时生成一条记录');
    assert(Boolean(latestWriting?.sessionId), '写作记录关联到某次专注');
    assert((latestWriting?.seconds ?? 0) >= 5, '写作时长被记录');
    assert(
      (await page.locator('.toast-host').innerText()).includes('写作证据已归档'),
      '写作记录有即时反馈',
    );
    await page.locator('.detail-close').click();
    await waitForSave(page);

    console.log('▶ 新建任务');
    await page.locator('.topbar .btn-primary').click();
    await page.waitForSelector('.modal');
    await page.getByPlaceholder('例如：JavaScript 核心语法').fill('交互回归任务');
    await page.getByPlaceholder('为什么做这件事？完成后会得到什么？').fill('验证创建任务与阶段拆分。');
    await page.locator('.task-level-picker button').filter({ hasText: '二级' }).click();
    await page.waitForTimeout(250);
    await page.locator('.task-chain-form select').selectOption({ index: 1 });
    await page.locator('.modal-foot button').filter({ hasText: '创建任务' }).click();
    await page.waitForTimeout(700);
    assert(await page.locator('.drawer').isVisible(), '创建后打开任务详情');
    assert(
      (await page.locator('.drawer').innerText()).includes('交互回归任务'),
      '新任务标题正确',
    );
    assert(
      (await page.locator('.drawer').innerText()).includes('上级任务'),
      '新任务显示上级任务链',
    );
    await page.locator('.detail-close').click();
    await waitForSave(page);
    data = readData();
    const regressionTask = data.tasks.find((t) => t.title === '交互回归任务');
    assert(Boolean(regressionTask), '新任务已持久化');
    assert(regressionTask?.level === 2, '新任务保存为二级任务');
    assert(Boolean(regressionTask?.parentId), '新任务保存上级任务');
    const xpBeforeRestart = data.rewards.xp;

    console.log('▶ 重启后的恢复');
    await app.close();
    app = null;
    ({ app, page } = await launch(true));
    await page.waitForSelector('.app-shell', { timeout: 30_000 });
    await waitForSave(page);
    data = readData();
    assert(data.activeTimers.length === 1, '上次的 1 个计时被保留');
    assert(data.activeTimers.every((t) => t.pausedAt), '重启后自动暂停，不虚增时间');
    assert(data.tasks.some((t) => t.title === '交互回归任务'), '任务在重启后仍在');
    assert(data.rewards.xp >= xpBeforeRestart, `成长值保持：${data.rewards.xp}`);
    await nav(page, '任务表');
    assert(
      (await page.locator('.task-table').innerText()).includes('交互回归任务'),
      '界面在重启后显示任务',
    );

    console.log('▶ 统计 · 预计 vs 实际布局');
    await nav(page, '统计');
    const calibrationRow = page.locator('.calibration-row').first();
    await calibrationRow.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const geometry = await calibrationRow.evaluate((row) => {
      const rowRect = row.getBoundingClientRect();
      const title = row.querySelector('.calibration-title')?.getBoundingClientRect();
      const bars = row.querySelector('.calibration-bars')?.getBoundingClientRect();
      return {
        rowWidth: rowRect.width,
        titleWidth: title?.width ?? 0,
        titleBottom: title?.bottom ?? 0,
        barsTop: bars?.top ?? 0,
      };
    });
    assert(geometry.titleWidth > geometry.rowWidth * 0.8, '预计 vs 实际标题占满整行');
    assert(geometry.barsTop >= geometry.titleBottom, '预计/实际条形图位于标题下方');
    console.log('  ✓ 预计 vs 实际不再串行');

    console.log('▶ 无示例引导');
    await app.close();
    app = null;
    fs.rmSync(workDir, { recursive: true, force: true });
    fs.mkdirSync(configDir, { recursive: true });
    ({ app, page } = await launch(false));
    await page.waitForSelector('.onboarding', { timeout: 30_000 });
    await page.locator('.onboarding-panel input[type="text"]').fill('回归测试者');
    assert((await page.locator('.sample-toggle').count()) === 0, '首次引导不再默认载入示例');
    await page.locator('.onboarding-submit').click();
    await page.waitForSelector('.app-shell', { timeout: 15_000 });
    await page.waitForTimeout(700);
    assert((await page.locator('.today-page').innerText()).includes('还没有进行中的任务'), '从零开始显示空状态');
    await waitForSave(page);
    data = readData();
    assert(data.tasks.length === 0, '首次进入没有预填任务');
    assert(data.goals.length === 0, '首次进入没有预填大目标');
    assert(data.sessions.length === 0, '首次进入没有预填专注记录');
    assert(data.rewards.xp === 0, '首次进入没有预填成长值');
    await page.locator('.topbar .btn-primary').click();
    await page.getByPlaceholder('例如：JavaScript 核心语法').fill('第一个任务');
    await page.locator('.modal-foot button').filter({ hasText: '创建任务' }).click();
    await page.waitForTimeout(700);
    await page.locator('.detail-close').click();
    await waitForSave(page);
    data = readData();
    assert(data.meta.onboarded, '引导完成状态已保存');
    assert(data.profile.name === '回归测试者', '称呼已保存');
    assert(data.tasks.length === 1, '从零创建的任务已保存');

    assert(
      runtimeErrors.length === 0,
      `渲染进程无报错${runtimeErrors.length ? `：${runtimeErrors.join(' | ')}` : ''}`,
    );

    console.log('\n全部交互断言通过。');
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
