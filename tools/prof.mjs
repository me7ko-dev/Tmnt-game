// Профил: кои функции отнемат най-много време при рисуване (CPU profile през CDP)
import { launch, PAGE } from './pw.mjs';
const b = await launch();
const pg = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2 });
await pg.goto((process.env.PAGE_URL || PAGE) + '#god'); await pg.waitForTimeout(500);
await pg.evaluate(c => { const D = window.__dbg; D.startGame(0, +(c.lvl || 1)); window.__G.introT = 0; for (const k of c.codes) D.spawnEnemy(k, 1, false); }, { codes: process.env.CODES || 'nnoykbh', lvl: process.env.LVL });
await pg.waitForTimeout(800);
const cdp = await pg.context().newCDPSession(pg);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
await pg.waitForTimeout(4000);
const { profile } = await cdp.send('Profiler.stop');
const self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n]));
const dt = profile.timeDeltas, total = dt.reduce((a, c) => a + c, 0);
profile.samples.forEach((id, i) => { const n = byId.get(id), k = n.callFrame.functionName || '(' + n.callFrame.url.split('/').pop() + ')'; self.set(k, (self.get(k) || 0) + dt[i]); });
const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 28);
for (const [k, v] of top) console.log((v / total * 100).toFixed(1).padStart(5) + '%  ' + k);
await b.close();
