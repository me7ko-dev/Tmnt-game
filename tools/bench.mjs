// Точно време за рисуване на кадър (мс): стара срещу нова версия, редувано, най-доброто от много опити
// node tools/bench.mjs [стара.html]   CODES=кои врагове
import { pathToFileURL } from 'node:url';
import { launch, PAGE } from './pw.mjs';
const codes = process.env.CODES ?? 'nnoykbh', other = process.argv[2];
const b = await launch();
const pages = {};
for (const [k, url] of [["нова", PAGE], ...process.argv.slice(2).map((f, i) => ["v" + (i + 1), pathToFileURL(f).href])]) {
  const pg = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
  await pg.goto(url + '#god'); await pg.waitForTimeout(500); pages[k] = pg;
}
const setup = (pg, l) => pg.evaluate(async ([l, codes, fl]) => { window.__flash = fl;
  const D = window.__dbg, G = window.__G; D.startGame(0, l); G.introT = 0; G.hazT = 1e9;
  const valid = Object.keys(window.__dbg.LEVELS ? {} : {}); for (const c of codes) try { D.spawnEnemy(c, 1, false); } catch (e) { }
  await new Promise(r => setTimeout(r, 1200)); G.stop = 1e9; if (window.__flash) for (const e of D.ents) e.flash = 8;
}, [l, codes, !!process.env.FLASH]);
const once = pg => pg.evaluate(() => { const D = window.__dbg, c = D.cv.getContext('2d'); const t0 = performance.now(); for (let i = 0; i < 10; i++) D.render(); c.getImageData(0, 0, 1, 1); return (performance.now() - t0) / 10; });
for (const l of [0, 1, 2, 3, 4, 5]) {
  for (const pg of Object.values(pages)) await setup(pg, l);
  const best = {};
  for (let k = 0; k < 15; k++) for (const [n, pg] of Object.entries(pages)) best[n] = Math.min(best[n] ?? 1e9, await once(pg));
  console.log('рунд', l + 1, Object.entries(best).map(([n, v]) => n + ' ' + v.toFixed(2) + 'мс').join('  '));
}
await b.close();
