import { _electron as electron } from 'playwright';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const root = process.cwd();
for (const dir of ['.home', '.runtime', '.tmp']) fs.mkdirSync(path.join(root, dir), { recursive: true });
const workDir = path.join(root, 'screenshots/tmp/ai-mock');
const configDir = path.join(workDir, 'yolo-linux');
const dataFile = path.join(configDir, 'yolo-data.json');
const secretFile = path.join(configDir, 'ai-secret.json');
fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(configDir, { recursive: true });

const requests = [];
const firstQuestion = { id: 'q1', question: '你之前系统学过哪些编程语言？最熟练的是哪一门？' };
const clarifyQuestion = { id: 'q2', question: '你写过哪些具体的程序或项目？请说一个你能独立运行的。' };

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
  });
  req.on('end', () => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'Access-Control-Allow-Origin': '*' });
      res.end();
      return;
    }
    const auth = req.headers.authorization ?? '';
    const parsed = body ? JSON.parse(body) : {};
    requests.push({ url: req.url, auth, body: parsed });
    const last = parsed.messages?.at(-1)?.content ?? '';
    let content;
    if (last.includes('只回复 OK')) {
      content = 'OK';
    } else if (last.includes('## 用户自己写的计划')) {
      content = JSON.stringify({
        confidence: 86,
        planVerdict: 'conditional',
        planScore: 58,
        verdict: 'too_optimistic',
        suggestedMinMinutes: 720,
        suggestedMaxMinutes: 840,
        summary:
          '计划方向正确，但你还没有把“完成标准”和“反馈节奏”写死。按现在这份计划推进，最可能的风险是前两周看文档、后面才写代码，导致所有权和借用检查没有足够练习。',
        profileSummary: '有其他语言基础，算法经验一般，目标偏实践，但缺少可验证的 Rust 项目经历。',
        tips: [
          {
            severity: 'high',
            title: '先看文档后写代码，风险最高',
            detail: '所有权和借用只有在你亲手触发编译错误时才会真正学会。把阅读和写代码交替安排，而不是先读完再动手。',
            evidence: '你的计划把第 1 周全部安排为阅读，项目从第 3 周才开始。',
          },
          {
            severity: 'medium',
            title: '完成标准还不够可验证',
            detail: '“理解了 Rust”无法验收。至少写成一个可运行的小工具，并留下一次真实的借用错误排查记录。',
          },
        ],
        factors: [
          { label: '历史校准', impact: 'up', explanation: '同类项目任务实际投入通常高于预计，需要增加缓冲。' },
          { label: '先修基础', impact: 'neutral', explanation: '已有其他语言经验，但算法训练不足，项目复杂度要控制。' },
          { label: '计划结构', impact: 'up', explanation: '阅读和动手分离，收尾阶段容易挤压。' },
        ],
        risks: ['前三周没有可运行产物，反馈来得太晚。', '借用检查的练习量不足，容易产生“看懂了但写不出”的错觉。'],
        recommendations: ['从第 1 周开始每天写 30–45 分钟代码', '把“完成标准”改成可运行 CLI + 错误排查记录', '每周留出 20% 缓冲'],
      });
    } else if (last.includes('尚无已回答的背景问题')) {
      content = JSON.stringify({
        confidence: 35,
        summary: '还缺少你的语言基础和具体项目经历。',
        answerQuality: { status: 'valid', note: '首轮没有回答。' },
        questions: [firstQuestion],
        known: ['任务与 Rust 相关'],
        missing: ['语言基础', '项目经历'],
        readyForPlan: false,
      });
    } else if (last.includes('轮次：1')) {
      content = JSON.stringify({
        confidence: 35,
        summary: '上一轮回答“英语”与编程经历无关，不能作为有效证据。',
        answerQuality: { status: 'irrelevant', note: '问题问的是编程语言和项目经历，回答是英语，属于答非所问。' },
        questions: [clarifyQuestion],
        known: ['任务与 Rust 相关'],
        missing: ['编程语言基础', '项目经历'],
        readyForPlan: false,
      });
    } else if (last.includes('轮次：2')) {
      content = JSON.stringify({
        confidence: 82,
        summary: '已经知道你有其他语言基础和一个可运行项目；可以进入计划评估。',
        answerQuality: { status: 'valid', note: '回答具体，给出了语言和项目。' },
        questions: [],
        known: ['有其他语言基础', '有可运行项目'],
        missing: [],
        readyForPlan: true,
      });
    } else {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: `unexpected mock prompt: ${last.slice(0, 80)}` } }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ choices: [{ message: { content } }] }));
  });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;

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
await page.waitForTimeout(1500);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log('✓', message);
};

await page.locator('.nav-item').filter({ hasText: '设置' }).click();
await page.waitForTimeout(500);
await page.locator('.ai-settings-card').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.locator('.ai-enable-line input').check();
await page.locator('.ai-form-grid select').selectOption('custom');
await page.locator('.ai-form-grid input[type="password"]').fill('test-key-123');
await page.locator('.ai-form-grid input[type="url"]').fill(`http://127.0.0.1:${port}/v1`);
await page.locator('.ai-form-grid input[placeholder="deepseek-flash"]').fill('deepseek-flash');
await page.locator('.ai-settings-actions button').filter({ hasText: '保存设置' }).click();
await page.waitForTimeout(500);
assert((await page.locator('.ai-status').innerText()).includes('设置已保存'), 'AI 设置保存');
await page.locator('.ai-settings-actions button').filter({ hasText: '测试连接' }).click();
await page.waitForTimeout(1200);
assert((await page.locator('.ai-status').innerText()).includes('连接成功'), 'API 连接测试通过');

await page.locator('.nav-item').filter({ hasText: '任务表' }).first().click();
await page.waitForTimeout(400);
await page.locator('.task-row').filter({ hasText: 'JavaScript 核心语法' }).click();
await page.waitForTimeout(500);
await page.locator('.ai-estimate-panel').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await page.locator('.ai-start button').filter({ hasText: '开始背景访谈' }).click();
await page.waitForSelector('.ai-question', { timeout: 15000 });
assert((await page.locator('.ai-question').count()) === 1, 'AI 每轮只问一个问题');
assert((await page.locator('.ai-question-copy small').count()) === 0, '问题下方没有解释');
assert((await page.locator('.ai-confidence-meter, .ai-plan-confidence').count()) === 0, '不展示置信度');
assert(!(await page.locator('.ai-estimate-panel').innerText()).includes('置信度'), '界面文案不出现置信度');
await page.locator('.ai-question textarea').fill('学过英语。');
await page.locator('.ai-interview-foot button').filter({ hasText: '提交回答' }).click();
await page.waitForSelector('.ai-question textarea', { timeout: 15000 });
await page.waitForTimeout(500);
const afterIrrelevant = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
assert(afterIrrelevant.assessmentSessions[0].stage === 'interview', '离谱回答不进入计划阶段');
assert(afterIrrelevant.assessmentSessions[0].confidence === 35, '离谱回答不加置信度');
assert(afterIrrelevant.assessmentSessions[0].lastAnswerQuality === 'irrelevant', '离谱回答被标记为答非所问');
assert((await page.locator('.ai-question').count()) === 1, '被追问时仍只问一个问题');
assert(!(await page.locator('.ai-estimate-panel').innerText()).includes('置信度'), '追问时仍不展示置信度');
await page.locator('.ai-question textarea').fill('学过 JavaScript 和 Python，写过一个可运行的命令行记账工具。');
await page.locator('.ai-interview-foot button').filter({ hasText: '提交回答' }).click();
await page.waitForSelector('.ai-plan-textarea', { timeout: 15000 });
assert((await page.locator('.ai-plan-stage').innerText()).includes('先写你自己的学习计划'), '要求用户先写计划');
assert(!(await page.locator('.ai-estimate-panel').innerText()).includes('置信度'), '计划阶段仍不展示置信度');

const plan = '第 1 周补 Rust 所有权与借用，每天 1 小时；第 2–3 周写一个 CLI 小工具；完成标准是一个可运行工具和一次借用错误排查记录。';
await page.locator('.ai-plan-textarea').fill(plan);
await page.locator('.ai-plan-actions button').filter({ hasText: '评估我的计划' }).click();
await page.waitForSelector('.ai-plan-result', { timeout: 15000 });
assert((await page.locator('.ai-plan-result').innerText()).includes('有条件可行'), '计划结论渲染');
assert(!(await page.locator('.ai-estimate-panel').innerText()).includes('置信度'), '结果页不展示置信度');
assert((await page.locator('.ai-plan-warning').innerText()).includes('先看文档后写代码'), '明显风险提示渲染');
assert((await page.locator('.ai-plan-result').innerText()).includes('12 小时'), '最终时间建议渲染');
await page.waitForTimeout(3000);
await page.screenshot({ path: path.join(root, 'screenshots/66-ai-review.png') });

const beforeApply = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
assert(beforeApply.assessmentSessions.length === 1, '访谈会话已持久化');
assert(beforeApply.assessmentSessions[0].stage === 'result', '会话进入结果阶段');
assert(beforeApply.estimateReviews[0].planVerdict === 'conditional', '计划结论已持久化');
assert(beforeApply.estimateReviews[0].confidenceScore === 86, '最终置信度已持久化');
const taskBefore = beforeApply.tasks.find((task) => task.title === 'JavaScript 核心语法');
const estimateBefore = taskBefore.estimatedMinutes;

await page.locator('.ai-review-actions button').filter({ hasText: '采用中值' }).click();
await page.waitForTimeout(800);
const afterApply = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const taskAfter = afterApply.tasks.find((task) => task.title === 'JavaScript 核心语法');
assert(taskAfter.estimatedMinutes === 780, `采用建议后预计时间 ${estimateBefore} → ${taskAfter.estimatedMinutes}`);
assert(Boolean(afterApply.estimateReviews[0].acceptedAt), '采用状态已记录');

const interviewRequest = requests.find((request) =>
  request.body.messages?.some((message) => message.content.includes('尚无已回答的背景问题')),
);
assert(Boolean(interviewRequest), '背景访谈请求已发送');
assert(interviewRequest.body.thinking?.type === 'disabled', 'DeepSeek 评估关闭思考模式');
assert(interviewRequest.body.reasoning_effort === 'none', 'DeepSeek reasoning_effort 关闭');
const planRequest = requests.find((request) =>
  request.body.messages?.some((message) => message.content.includes('## 用户自己写的计划')),
);
assert(Boolean(planRequest), '计划评估请求已发送');
assert(planRequest.body.messages.some((message) => message.content.includes(plan)), '计划正文进入上下文');
assert(planRequest.body.messages.some((message) => message.content.includes('JavaScript 核心语法')), '计划请求包含任务上下文');
assert(!JSON.stringify(beforeApply).includes('test-key-123'), 'Key 不进入数据文件');
if (fs.existsSync(secretFile)) {
  assert(!fs.readFileSync(secretFile, 'utf8').includes('test-key-123'), 'Key 不以明文写入安全文件');
}
assert(!fs.readFileSync(dataFile, 'utf8').includes('test-key-123'), '数据文件不包含 Key');

// 本地 Ollama 类接口允许不填 Key；清除 Key 后仍应能测试连接。
await page.locator('.detail-close').click();
await page.waitForTimeout(300);
await page.locator('.nav-item').filter({ hasText: '设置' }).click();
await page.waitForTimeout(350);
await page.locator('.ai-settings-card').scrollIntoViewIfNeeded();
await page.waitForTimeout(250);
await page.locator('.ai-settings-actions button').filter({ hasText: '清除 Key' }).click();
await page.waitForTimeout(300);
await page.locator('.ai-settings-actions button').filter({ hasText: '测试连接' }).click();
await page.waitForTimeout(1200);
assert((await page.locator('.ai-status').innerText()).includes('连接成功'), '本机接口允许无 Key 连接');

await app.close();
server.close();
console.log('全部 AI 学习助理断言通过');
