// Увеличен изглед на част от витрината: node tools/zoom.mjs <сцена> x y w h
import { launch, PAGE, SHOTS } from './pw.mjs';
const [name = 'turtles', x = 0, y = 0, w = 480, h = 270] = process.argv.slice(2);
const b = await launch();
const pg = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 3 });
await pg.goto(PAGE + '#god'); await pg.waitForTimeout(500);
await pg.evaluate(name => {
  const D = window.__dbg, G = window.__G;
  D.startGame(0, 3); G.introT = 0; G.hazT = 1e9; G.stop = 1e9; D.ents.length = 0; D.P.x = -500;
  const mk = (i, x, y, st, s, extra) => { const e = Object.assign({ pl: true, t: D.TURTLES[i], x: G.cam + x, y, z: 0, vx: 0, vz: 0, face: 1, state: st, st: s, anim: 30 + i * 7, inv: 0, combo: 1, jk: false, hw: 10, hp: 100, pow: 0, powT: 0 }, extra || {}); e.C = D.colorsFor(e); D.ents.push(e); return e; };
  if (name === 'turtles') for (let i = 0; i < 4; i++) mk(i, 60 + i * 110, 200, 'idle', 0);
  if (name === 'faces') { mk(0, 60, 200, 'attack', 4); mk(1, 170, 200, 'attack', 4, { combo: 3 }); mk(2, 280, 200, 'hurt', 3); mk(3, 390, 200, 'idle', 0, { anim: 205 }); }
  if (name === 'enemies') [...'nowykbhsr'].forEach((c, i) => { const e = D.spawnEnemy(c, 1, false); e.x = G.cam + 30 + (i % 5) * 100; e.y = i < 5 ? 180 : 255; e.state = 'idle'; e.face = -1; e.z = 0; });
}, name);
await pg.waitForTimeout(300);
await pg.screenshot({ path: `${SHOTS}/zoom-${name}.png`, clip: { x: +x, y: +y, width: +w, height: +h } });
await b.close();
