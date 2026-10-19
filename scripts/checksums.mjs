/** 为 release 目录中的实际产物生成 SHA256 校验文件 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const groups = [
  { dir: 'apps/linux/release', match: /\.(AppImage|deb)$/ },
  { dir: 'apps/windows/release', match: /-portable\.zip$/ },
  { dir: 'apps/android/release', match: /\.apk$/ },
];

const targets = [];
for (const group of groups) {
  const dir = path.join(root, group.dir);
  if (!fs.existsSync(dir)) continue;
  for (const name of fs.readdirSync(dir).sort()) {
    const file = path.join(dir, name);
    if (fs.statSync(file).isFile() && group.match.test(name)) targets.push(file);
  }
}

if (targets.length === 0) {
  console.error('没有找到可校验的 release 产物，请先打包。');
  process.exit(1);
}

const lines = targets.map((file) => {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return `${hash.digest('hex')}  ${path.relative(root, file)}`;
});
fs.writeFileSync(path.join(root, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`);
console.log(lines.join('\n'));
