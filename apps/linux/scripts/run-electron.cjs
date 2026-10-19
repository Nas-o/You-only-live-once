/**
 * Electron 启动器：
 * - 正常情况下保留 Chromium sandbox；
 * - 仅当 chrome-sandbox 没有 setuid 位（或显式 YOLO_NO_SANDBOX=1）时附加 --no-sandbox。
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const electronBinary = require('electron');
const appDir = path.resolve(__dirname, '..');
const sandboxHelper = path.join(path.dirname(electronBinary), 'chrome-sandbox');

let needsNoSandbox = process.env.YOLO_NO_SANDBOX === '1';
try {
  const stat = fs.statSync(sandboxHelper);
  if ((stat.mode & 0o4000) === 0) needsNoSandbox = true;
} catch {
  needsNoSandbox = true;
}

const args = ['.'];
if (needsNoSandbox) args.push('--no-sandbox');
args.push(...process.argv.slice(2));

if (needsNoSandbox) {
  console.log('[yolo] chrome-sandbox 未配置 setuid，使用 --no-sandbox 启动（仅开发环境）。');
}

const child = spawn(electronBinary, args, {
  cwd: appDir,
  stdio: 'inherit',
  env: process.env,
});

child.on('close', (code) => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal));
}
