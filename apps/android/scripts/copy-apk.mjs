/** 把 Gradle 产出的 debug APK 复制到 release/ 便于分发 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const source = path.join(appDir, 'android/app/build/outputs/apk/debug/app-debug.apk');
const releaseDir = path.join(appDir, 'release');
const version = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8')).version;
const target = path.join(releaseDir, `YouOnlyLiveOnce-${version}-android-debug.apk`);
if (!fs.existsSync(source)) {
  console.error('找不到 app-debug.apk，请先执行 Gradle assembleDebug');
  process.exit(1);
}
fs.mkdirSync(releaseDir, { recursive: true });
fs.copyFileSync(source, target);
console.log(`✓ APK：${target}（${(fs.statSync(target).size / 1024 / 1024).toFixed(1)} MB）`);
