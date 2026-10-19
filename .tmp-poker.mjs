import { _electron as electron } from 'playwright';
import fs from 'node:fs'; import path from 'node:path';
const root=process.cwd();
for (const d of ['.home','.runtime','.tmp']) fs.mkdirSync(path.join(root,d),{recursive:true});
const config=path.join(root,'screenshots/tmp/poker'); fs.rmSync(config,{recursive:true,force:true}); fs.mkdirSync(path.join(config,'yolo-linux'),{recursive:true});
const env={...process.env,XDG_CONFIG_HOME:config,YOLO_CONFIG_DIR:path.join(config,'yolo-linux'),XDG_CACHE_HOME:path.join(root,'.xdg-cache'),HOME:path.join(root,'.home'),XDG_RUNTIME_DIR:path.join(root,'.runtime'),TMPDIR:path.join(root,'.tmp'),ELECTRON_DISABLE_SECURITY_WARNINGS:'true'};
const app=await electron.launch({executablePath:path.join(root,'node_modules/electron/dist/electron'),args:[path.join(root,'apps/linux'),'--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--force-device-scale-factor=1','--demo'],cwd:path.join(root,'apps/linux'),env,timeout:60000});
const page=await app.firstWindow(); await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(2200);
page.on('pageerror',e=>console.log('PAGEERROR',e.message));
await page.locator('.nav-item').filter({hasText:'任务表'}).click(); await page.waitForTimeout(400);
for (let i=0;i<2;i++) {
  await page.locator('.task-row').filter({hasText:'JavaScript 核心语法'}).locator('.task-action button').first().click();
  await page.waitForTimeout(6500);
  const stop = page.locator('.focus-controls .btn-primary');
  if (!(await stop.count())) { console.log('no stop button'); break; }
  await stop.click();
  await page.waitForTimeout(1300);
  console.log('stop', i, 'reveal', await page.locator('.poker-reveal-layer').count());
}
if (await page.locator('.poker-reveal-layer').count()) {
  await page.waitForTimeout(900);
  console.log('hand', await page.locator('.poker-reveal-card h2').innerText(), await page.locator('.poker-reveal-math').innerText());
  await page.screenshot({path:path.join(root,'screenshots/61-poker-reveal.png')});
}
await app.close();
