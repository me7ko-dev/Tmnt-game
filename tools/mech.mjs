// Проверка на механиките: хвърляне, супер удари, броня, бомби, ярост. node tools/mech.mjs
import { launch, PAGE } from './pw.mjs';
const b = await launch();
const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(PAGE); await pg.waitForTimeout(500);
const res = await pg.evaluate(async () => {
  const D = window.__dbg, G = window.__G, K = D.keys, out = {};
  const wait = n => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const fresh = (ti, lvl = 1) => { D.startGame(ti, lvl); G.introT = 0; G.hazT = 1e9; D.ents.length = 0; D.P.x = G.cam + 150; D.P.y = 215; D.P.face = 1; D.P.inv = 0; };
  const enemy = (c, dx, dy = 0) => { const e = D.spawnEnemy(c, 1, false); e.x = D.P.x + dx; e.y = D.P.y + dy; e.state = 'idle'; e.atkCd = 1e9; return e; };
  // хвърляне: врагът е отпред, държим назад + удар
  fresh(0); let e = enemy('n', 14), o = enemy('o', -60); o.atkCd = 1e9;
  K.ArrowLeft = true; K.KeyJ = true; await wait(2); K.KeyJ = false;
  out.throwState = D.P.state; out.held = e.state; await wait(6); K.ArrowLeft = false;
  await wait(60); out.thrownHp = e.hp + '/' + e.maxhp; out.otherHit = o.hp < o.maxhp;
  // броня: първите два удара не спират Тежкаря, третият го поваля
  fresh(0); e = enemy('h', 26);
  for (let i = 0; i < 3; i++) { K.KeyJ = true; await wait(2); K.KeyJ = false; await wait(9); if (i === 1) out.armorAfter2 = e.state; }
  let downAt = -1; for (let k = 0; k < 40 && downAt < 0; k++) { await wait(1); if (e.state === 'down') downAt = k; }
  out.armorAfter3 = e.state; out.bruteHp = e.hp;
  // супер удари на всички костенурки
  out.supers = {};
  for (let ti = 0; ti < 4; ti++) {
    fresh(ti); const es = [enemy('n', 40), enemy('n', 70, 8), enemy('o', 100, -6)];
    D.P.pow = 100; K.KeyL = true; await wait(2); K.KeyL = false; out.supers[ti + '_state'] = D.P.state; out.supers[ti + '_pow'] = D.P.pow;
    if (ti === 2) K.ArrowRight = true;
    await wait(110); K.ArrowRight = false;
    out.supers[ti] = es.map(x => x.maxhp - x.hp).join(',') + ' -> ' + D.P.state;
  }
  // без пълен метър СПЕЦ е въртене и струва живот
  fresh(0); D.P.pow = 50; D.P.hp = 100; K.KeyL = true; await wait(2); K.KeyL = false; out.spinState = D.P.state; out.spinHp = D.P.hp;
  // бомба: пада до играча и избухва
  fresh(1); D.P.inv = 0; const hp0 = D.P.hp; D.lob(G.cam + 400, D.P.y, 30, D.P.x, D.P.y); await wait(100); out.bombDmg = hp0 - D.P.hp; out.projsLeft = D.projs.length;
  // ярост от пицата: двойна сила и неуязвимост
  fresh(0); D.items.push({ type: 'power', x: D.P.x, y: D.P.y, z: 0, vz: 0, life: 900 }); await wait(3); out.powT = D.P.powT;
  e = enemy('n', 22); e.atkCd = 0; await wait(80); out.powHp = D.P.hp;
  // комбо брояч
  out.maxChain = G.stats.maxChain;
  return out;
});
console.log(JSON.stringify(res, null, 1));
console.log('ERRORS', errs);
await b.close();
