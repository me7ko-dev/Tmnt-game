// Проверка на живия сайт: зарежда се, без грешки, има манифест и офлайн режим
import { launch, SHOTS } from './pw.mjs';
const URL = process.argv[2] || 'https://me7ko-dev.github.io/Tmnt-game/';
const b = await launch();
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(URL + '?v=' + Date.now(), { waitUntil: 'load' }); await pg.waitForTimeout(2500);
const info = await pg.evaluate(async () => ({
  hasNew: typeof window.__dbg?.startSuper === 'function',
  manifest: !!document.querySelector('link[rel=manifest]'),
  sw: !!(navigator.serviceWorker && await navigator.serviceWorker.getRegistration()),
  font: document.fonts.check('10px "Press Start 2P"')
}));
await pg.screenshot({ path: `${SHOTS}/live.png` });
// офлайн: страницата се отваря и без мрежа
await ctx.setOffline(true); await pg.reload(); await pg.waitForTimeout(1500);
info.offline = await pg.evaluate(() => typeof window.__dbg?.startGame === 'function');
console.log(JSON.stringify(info), 'ERRORS', errs);
await b.close();
