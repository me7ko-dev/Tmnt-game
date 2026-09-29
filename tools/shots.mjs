// Снимки на всички екрани и рундове за визуална проверка: node tools/shots.mjs
import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_CERT')) errs.push(m.text()); });
await pg.goto('file://' + process.cwd() + '/index.html#god'); await pg.waitForTimeout(600);
await pg.screenshot({ path: 'shots/a-title.png' });
await pg.evaluate(() => { window.__G.scene = 'select'; }); await pg.waitForTimeout(300); await pg.screenshot({ path: 'shots/b-select.png' });
await pg.evaluate(() => { window.__G.scene = 'levels'; }); await pg.waitForTimeout(600); await pg.screenshot({ path: 'shots/c-levels.png' });
const bosses = [['rhino'], ['boar'], ['fly'], ['samurai'], ['rhino', 'boar'], ['blade', 'brain']];
for (let i = 0; i < 6; i++) {
  await pg.evaluate(i => { const D = window.__dbg; D.startGame(i % 4, i); window.__G.introT = 0; window.__G.hazT = 30; window.__turbo = 1; }, i);
  await pg.evaluate(() => { const P = window.__dbg.P; P.x = 230; });
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => { const D = window.__dbg; const G = window.__G; G.cam = 400; D.P.x = 600; D.P.state = 'attack'; D.P.st = 6; D.P.combo = 1; });
  await pg.waitForTimeout(700);
  await pg.screenshot({ path: `shots/l${i}-a.png` });
  await pg.evaluate(bs => { const D = window.__dbg, G = window.__G, L = D.LEVELS[G.lvl]; G.cam = L.len - 480; G.lock = G.cam; G.waveI = 99; G.wave = null; D.ents.length = 0; D.P.x = G.cam + 150; for (const k of bs) D.spawnBoss(k, bs.indexOf(k)); for (const e of D.ents) { e.state = 'idle'; e.x = G.cam + 300 + (e.x < G.cam ? -60 : 0); e.z = 0; } }, bosses[i]);
  await pg.waitForTimeout(900);
  await pg.screenshot({ path: `shots/l${i}-boss.png` });
}
console.log('ERRORS', errs.slice(0, 8));
await b.close();
