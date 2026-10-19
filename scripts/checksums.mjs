/** 为发布产物生成 SHA256 校验文件 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const targets = [
  'apps/linux/release/YouOnlyLiveOnce-0.1.0-x86_64.AppImage',
  'apps/linux/release/YouOnlyLiveOnce-0.1.0-amd64.deb',
  'apps/windows/release/YouOnlyLiveOnce-0.1.0-win-x64-portable.zip',
  'apps/android/release/YouOnlyLiveOnce-0.1.0-android-debug.apk',
];
const lines = [];
for (const relative of targets) {
  const file = path.join(root, relative);
  if (!fs.existsSync(file)) continue;
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  lines.push(`${hash.digest('hex')}  ${relative}`);
}
fs.writeFileSync(path.join(root, 'SHA256SUMS.txt'), `${lines.join('\n')}\n`);
console.log(lines.join('\n'));
