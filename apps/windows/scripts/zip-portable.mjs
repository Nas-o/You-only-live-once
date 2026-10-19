/**
 * 把 electron-builder 的 win-unpacked 打成便携版 ZIP。
 * 这是 Linux 交叉构建 Windows 产物的方式；Windows 原生环境可直接用 NSIS 安装包。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const releaseDir = path.join(appDir, 'release');
const arch = process.argv[2] === 'arm64' ? 'arm64' : 'x64';
const unpacked = path.join(releaseDir, arch === 'x64' ? 'win-unpacked' : `win-${arch}-unpacked`);
const version = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8')).version;
const target = path.join(releaseDir, `YouOnlyLiveOnce-${version}-win-${arch}-portable.zip`);

if (!fs.existsSync(path.join(unpacked, 'yolo.exe'))) {
  console.error(`找不到 ${path.relative(appDir, unpacked)}/yolo.exe，请先执行 electron-builder --win dir --${arch}`);
  process.exit(1);
}
if (fs.existsSync(target)) fs.rmSync(target);
let result;
if (process.platform === 'win32') {
  const quote = (value) => value.replace(/'/g, "''");
  result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Compress-Archive -Path '${quote(unpacked)}' -DestinationPath '${quote(target)}' -Force`,
    ],
    { stdio: 'inherit' },
  );
} else {
  result = spawnSync('zip', ['-r', '-q', path.basename(target), 'win-unpacked'], {
    cwd: releaseDir,
    stdio: 'inherit',
  });
}
if (result.status !== 0) {
  console.error('ZIP 打包失败；Linux 下请安装 zip，Windows 下请确认 PowerShell Compress-Archive 可用。');
  process.exit(result.status ?? 1);
}
const size = (fs.statSync(target).size / 1024 / 1024).toFixed(1);
console.log(`✓ Windows 便携版（${arch}）：${target}（${size} MB）`);
