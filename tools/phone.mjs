// Изглед на телефон (хоризонтално и вертикално) със сензорно управление
import { launch, PAGE, SHOTS } from './pw.mjs';
const b = await launch();
const errs = [];
for (const [n, w, h] of [['land', 844, 390], ['port', 390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const pg = await ctx.newPage(); pg.on('pageerror', e => errs.push(e.message));
  await pg.goto(PAGE + '#god'); await pg.waitForTimeout(600);
  await pg.screenshot({ path: `${SHOTS}/phone-${n}-title.png` });
  await pg.evaluate(() => { const D = window.__dbg; D.startGame(3, 2); window.__G.introT = 0; D.P.pow = 100; for (const c of 'rrb') D.spawnEnemy(c, 1, false); });
  // докосване на джойстика и бутона УДАР
  const box = await pg.locator('#btnA').boundingBox();
  await pg.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await pg.waitForTimeout(900);
  await pg.screenshot({ path: `${SHOTS}/phone-${n}-play.png` });
  await ctx.close();
}
console.log('ERRORS', errs);
await b.close();
