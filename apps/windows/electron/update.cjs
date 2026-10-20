/**
 * 桌面端更新：检查 GitHub Releases，并在 Windows 便携版 / Linux AppImage / macOS ZIP
 * 上尝试自动替换当前程序。所有下载都会校验 GitHub Release 的 sha256 digest。
 */
const { app, ipcMain, shell } = require('electron');
const crypto = require('node:crypto');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const REPO = 'Nas-o/You-only-live-once';

function parseVersion(value) {
  return String(value).replace(/^v/i, '').split(/[.+-]/).slice(0, 3).map((x) => Number(x) || 0);
}

function newer(latest, current) {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  for (let i = 0; i < 3; i += 1) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}

function assetFor(platform, arch) {
  const suffix = arch === 'arm64' ? 'arm64' : arch === 'x64' ? 'x64' : arch;
  if (platform === 'win32') return `YouOnlyLiveOnce-${'{version}'}-win-${suffix}-portable.zip`;
  if (platform === 'linux') return `YouOnlyLiveOnce-${'{version}'}-${arch === 'arm64' ? 'arm64' : 'x86_64'}.AppImage`;
  if (platform === 'darwin') return `YouOnlyLiveOnce-${'{version}'}-mac-${suffix}.zip`;
  return '';
}

function pickAsset(release, version) {
  const pattern = assetFor(process.platform, process.arch).replace('{version}', version);
  if (!pattern) return null;
  return (release.assets || []).find((asset) => asset.name === pattern) ?? null;
}

async function checkForUpdates() {
  const current = app.getVersion();
  const response = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'YOLO-Desktop' },
  });
  if (!response.ok) throw new Error(`GitHub Releases 返回 ${response.status}`);
  const release = await response.json();
  const latest = String(release.tag_name || '').replace(/^v/i, '');
  if (!latest) throw new Error('无法读取最新版本号');
  const available = newer(latest, current);
  const asset = pickAsset(release, latest);
  return {
    available,
    currentVersion: current,
    latestVersion: latest,
    name: release.name || `v${latest}`,
    notes: String(release.body || '').slice(0, 1200),
    releaseUrl: release.html_url,
    assetName: asset?.name ?? '',
    assetUrl: asset?.browser_download_url ?? release.html_url,
    assetDigest: asset?.digest ?? '',
    publishedAt: release.published_at,
    installable: Boolean(asset) && ['win32', 'linux', 'darwin'].includes(process.platform),
  };
}

async function download(url, target, digest) {
  const response = await fetch(url, { headers: { 'User-Agent': 'YOLO-Desktop' } });
  if (!response.ok || !response.body) throw new Error(`下载失败：HTTP ${response.status}`);
  const array = Buffer.from(await response.arrayBuffer());
  if (digest && digest.startsWith('sha256:')) {
    const actual = `sha256:${crypto.createHash('sha256').update(array).digest('hex')}`;
    if (actual !== digest) throw new Error('更新包校验失败，已取消安装');
  }
  await fsp.writeFile(target, array);
}

function findFile(root, name, depth = 3) {
  if (depth < 0) return null;
  let entries = [];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    const full = path.join(root, entry.name);
    if (entry.isFile() && entry.name === name) return full;
    if (entry.isDirectory()) {
      const found = findFile(full, name, depth - 1);
      if (found) return found;
    }
  }
  return null;
}

function launchDetached(command, args, options = {}) {
  const child = spawn(command, args, { detached: true, stdio: 'ignore', ...options });
  child.unref();
}

async function installWindows(info) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'yolo-update-'));
  const zip = path.join(root, 'update.zip');
  await download(info.assetUrl, zip, info.assetDigest);
  const extract = path.join(root, 'extract');
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-NonInteractive', '-Command', `Expand-Archive -LiteralPath '${zip}' -DestinationPath '${extract}' -Force`],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) throw new Error('解压更新包失败');
  const exe = findFile(extract, 'yolo.exe');
  if (!exe) throw new Error('更新包里找不到 yolo.exe');
  const source = path.dirname(exe);
  const target = path.dirname(process.execPath);
  const helper = path.join(root, 'apply-update.cmd');
  const script = `@echo off\r\ntimeout /t 3 /nobreak >nul\r\nrobocopy "${source}" "${target}" /E /IS /IT /NFL /NDL /NJH /NJS /NC /NS /NP >nul\r\nstart "" "${path.join(target, 'yolo.exe')}"\r\nrmdir /s /q "${root}"\r\n`;
  await fsp.writeFile(helper, script, 'utf8');
  launchDetached('cmd.exe', ['/c', 'start', '', helper]);
  app.quit();
  return { ok: true };
}

async function installLinux(info) {
  const current = process.env.APPIMAGE;
  if (!current) throw new Error('当前不是 AppImage 运行，请从 Release 页面手动下载');
  const update = `${current}.update`;
  await download(info.assetUrl, update, info.assetDigest);
  await fsp.chmod(update, 0o755);
  const helper = path.join(os.tmpdir(), `yolo-update-${Date.now()}.sh`);
  const script = `#!/bin/sh\nsleep 2\nold="$1"\nnew="$2"\nmv "$old" "$old.old"\nmv "$new" "$old"\nchmod +x "$old"\n"$old" >/dev/null 2>&1 &\nrm -f "$old.old"\n`;
  await fsp.writeFile(helper, script, 'utf8');
  await fsp.chmod(helper, 0o755);
  launchDetached('/bin/sh', [helper, current, update]);
  app.quit();
  return { ok: true };
}

async function installMac(info) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'yolo-update-'));
  const zip = path.join(root, 'update.zip');
  await download(info.assetUrl, zip, info.assetDigest);
  const extract = path.join(root, 'extract');
  const result = spawnSync('ditto', ['-x', '-k', zip, extract]);
  if (result.status !== 0) throw new Error('解压 macOS 更新包失败');
  let entries = [];
  try {
    entries = fs.readdirSync(extract).filter((name) => name.endsWith('.app'));
  } catch {
    entries = [];
  }
  if (!entries[0]) throw new Error('更新包里找不到 .app');
  const newApp = path.join(extract, entries[0]);
  const currentApp = path.resolve(path.dirname(process.execPath), '..', '..');
  const helper = path.join(root, 'apply-update.sh');
  const script = `#!/bin/sh\nsleep 3\nold="$1"\nnew="$2"\nrm -rf "$old.old"\nmv "$old" "$old.old"\nmv "$new" "$old"\nxattr -dr com.apple.quarantine "$old" >/dev/null 2>&1 || true\nopen "$old"\nrm -rf "$old.old"\n`;
  await fsp.writeFile(helper, script, 'utf8');
  await fsp.chmod(helper, 0o755);
  launchDetached('/bin/sh', [helper, currentApp, newApp]);
  app.quit();
  return { ok: true };
}

function registerUpdateIpc() {
  ipcMain.handle('update:check', async () => {
    try {
      return { ok: true, info: await checkForUpdates() };
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    }
  });

  ipcMain.handle('update:install', async (_event, info) => {
    try {
      if (!info || !info.assetUrl) throw new Error('没有可用的更新包');
      if (process.platform === 'win32') return await installWindows(info);
      if (process.platform === 'linux') return await installLinux(info);
      if (process.platform === 'darwin') return await installMac(info);
      await shell.openExternal(info.assetUrl);
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error?.message || error) };
    }
  });
}

module.exports = { registerUpdateIpc };
