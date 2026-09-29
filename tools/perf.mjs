import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
await pg.goto('file:///home/user/tmnt-game/index.html#god'); await pg.waitForTimeout(500);
for (const l of [0, 1, 2, 3, 4, 5]) {
  const r = await pg.evaluate(async l => {
    const D = window.__dbg; D.startGame(0, l); window.__G.introT = 0;
    for (const c of 'nnoyw') D.spawnEnemy(c, 1, false);
    await new Promise(r => setTimeout(r, 800));
    let n = 0; const t0 = performance.now(); await new Promise(res => { function f() { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(); } requestAnimationFrame(f); });
    return n / 2;
  }, l);
  await pg.screenshot({ path: `/home/user/tmnt-game/shots/m${l}.png` });
  console.log('level', l, 'fps', r);
}
await b.close();
