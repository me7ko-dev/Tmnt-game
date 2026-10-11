// Витрина на моделите: всички герои, врагове и шефове в различни пози → shots/models-*.png
import { launch, PAGE, SHOTS } from './pw.mjs';
const b = await launch();
const pg = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(PAGE + '#god'); await pg.waitForTimeout(600);
const scene = async (name, fn, arg) => {
  await pg.evaluate(([src, arg]) => {
    const D = window.__dbg, G = window.__G;
    D.startGame(0, Number(arg && arg.lvl || 3)); G.introT = 0; G.hazT = 1e9; G.stop = 1e9; D.ents.length = 0; D.P.x = -500;
    new Function('D', 'G', 'arg', src)(D, G, arg);
  }, [fn.toString().replace(/^[^{]*{|}$/g, ''), arg]);
  await pg.waitForTimeout(400);
  await pg.screenshot({ path: `${SHOTS}/models-${name}.png` });
};
const turtles = function () {
  const mk = (i, x, y, st, s, extra) => { const e = Object.assign({ pl: true, t: D.TURTLES[i], x: G.cam + x, y, z: 0, vx: 0, vz: 0, face: 1, state: st, st: s, anim: 30 + i * 7, inv: 0, combo: 1, jk: false, hw: 10, hp: 100, pow: 0, powT: 0 }, extra || {}); e.C = D.colorsFor(e); D.ents.push(e); return e; };
  for (let i = 0; i < 4; i++) mk(i, 60 + i * 110, 175, 'idle', 0);
  mk(0, 60, 252, 'attack', 9, { combo: 3 }); mk(1, 170, 252, 'super', 33); mk(2, 280, 252, 'super', 20); mk(3, 390, 252, 'hurt', 3);
};
const enemies = function () {
  const codes = 'nowykbhsr';
  [...codes].forEach((c, i) => { const e = D.spawnEnemy(c, 1, false); e.x = G.cam + 30 + (i % 5) * 100; e.y = i < 5 ? 180 : 255; e.state = i === 4 ? 'windup' : i === 6 ? 'attack' : 'idle'; e.st = i === 6 ? 5 : 8; e.face = -1; e.z = 0; e.hpT = 60; e.hp = e.maxhp * 0.6; });
};
const bosses = function () {
  ['rhino', 'boar', 'fly', 'samurai', 'blade', 'brain'].forEach((k, i) => { const e = D.spawnBoss(k, 0); e.x = G.cam + 50 + (i % 3) * 170; e.y = i < 3 ? 185 : 262; e.state = 'idle'; e.z = k === 'fly' ? 20 : 0; e.face = -1; if (i === 3) e.hp = e.maxhp * 0.3; });
};
await scene('turtles', turtles);
await scene('enemies', enemies);
await scene('bosses', bosses);
console.log('ERRORS', errs.slice(0, 5));
await b.close();
