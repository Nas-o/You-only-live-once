/**
 * 在 macOS + Xcode 上生成未签名 IPA。
 * 未签名 IPA 不能直接上架，也不能像普通 APK 一样双击安装；
 * 需要使用 AltStore / Sideloadly 等工具用自己的 Apple ID 重签。
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(__dirname, '..');
const releaseDir = path.join(appDir, 'release');
const derived = path.join(appDir, 'ios', 'DerivedData');
const version = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8')).version;
const target = path.join(releaseDir, `YouOnlyLiveOnce-${version}-ios-unsigned.ipa`);

function run(command, args, cwd = appDir) {
  const result = spawnSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    console.error(`命令失败：${command} ${args.join(' ')}`);
    process.exit(result.status ?? 1);
  }
}

fs.mkdirSync(releaseDir, { recursive: true });
fs.rmSync(derived, { recursive: true, force: true });

run('npx', ['cap', 'sync', 'ios']);
run('xcodebuild', [
  '-workspace',
  path.join('ios', 'App', 'App.xcworkspace'),
  '-scheme',
  'App',
  '-configuration',
  'Release',
  '-sdk',
  'iphoneos',
  '-derivedDataPath',
  derived,
  'CODE_SIGNING_ALLOWED=NO',
  'CODE_SIGNING_REQUIRED=NO',
  'CODE_SIGN_IDENTITY=',
  'PROVISIONING_PROFILE_SPECIFIER=',
]);

const app = path.join(derived, 'Build', 'Products', 'Release-iphoneos', 'App.app');
if (!fs.existsSync(app)) {
  console.error(`找不到构建产物：${app}`);
  process.exit(1);
}

const payload = path.join(releaseDir, 'Payload');
fs.rmSync(payload, { recursive: true, force: true });
fs.mkdirSync(payload, { recursive: true });
run('cp', ['-R', app, path.join(payload, 'App.app')]);
fs.rmSync(target, { force: true });
run('zip', ['-qry', target, 'Payload'], releaseDir);
fs.rmSync(payload, { recursive: true, force: true });
console.log(`✓ iOS 未签名 IPA：${target}`);
console.log('  未签名 IPA 需要 AltStore / Sideloadly 等工具重签后才能安装。');
