import { chromium } from 'playwright';
const [lvl = 0, turtle = 1, maxSec = 240, god = 1] = process.argv.slice(2).map(Number);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const pg = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = [];
pg.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + e.stack));
await pg.goto('file://' + process.cwd() + '/index.html' + (god ? '#god' : ''));
await pg.waitForTimeout(300);
await pg.evaluate(([l, t]) => {
  const D = window.__dbg, K = D.keys; let n = 0;
  window.__log = [];
  window.__bot = () => {
    const G = window.__G, P = D.P; n++;
    for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyJ', 'KeyK', 'KeyL', 'Enter']) K[k] = false;
    if (G.scene === 'clear') { if (n % 20 === 0) { window.__log.push('clear ' + G.lvl + ' score ' + G.score); K.Enter = true; } return; }
    if (G.scene !== 'play' || !P) return;
    const al = D.ents.filter(e => e.hp > 0 && !['enter', 'drop', 'down', 'getup'].includes(e.state) && !e.ghost);
    if (al.length) {
      al.sort((a, c) => Math.abs(a.x - P.x) + Math.abs(a.y - P.y) * 2 - Math.abs(c.x - P.x) - Math.abs(c.y - P.y) * 2);
      const e = al[0], dx = e.x - P.x, dy = e.y - P.y, want = 20 + (e.hw || 9);
      if (Math.abs(dx) > want) K[dx > 0 ? 'ArrowRight' : 'ArrowLeft'] = true;
      else if (Math.abs(dx) < 10) K[dx > 0 ? 'ArrowLeft' : 'ArrowRight'] = true;
      else if (P.face !== Math.sign(dx)) K[dx > 0 ? 'ArrowRight' : 'ArrowLeft'] = true;
      if (dy > 3) K.ArrowDown = true; else if (dy < -3) K.ArrowUp = true;
      if (Math.abs(dx) < want + 12 && Math.abs(dy) < 10 && n % 6 === 0) K.KeyJ = true;
      if (n % 400 === 0) K.KeyL = true;
    } else K.ArrowRight = true;
  };
  window.__turbo = 6;
  D.startGame(t, l);
}, [lvl, turtle]);
const t0 = Date.now(); let last = '';
while ((Date.now() - t0) / 1000 < maxSec) {
  await pg.waitForTimeout(3000);
  const st = await pg.evaluate(() => { const G = window.__G, P = window.__dbg.P; const L = window.__log.splice(0); return { L, s: `${G.scene} lvl${G.lvl} cam${G.cam | 0} wave${G.waveI} boss${G.bossStage} hp${P && P.hp} lives${G.lives} ents${window.__dbg.ents.length} score${G.score}` }; });
  for (const l of st.L) console.log(l);
  if (st.s !== last) console.log(Math.round((Date.now() - t0) / 1000) + 's', st.s); last = st.s;
  if (st.s.startsWith('gameover') || st.s.startsWith('ending') || st.s.startsWith('title')) break;
  const m = st.s.match(/lvl(\d) .*boss(\d)/); if (m && m[2] !== '0') await pg.screenshot({ path: `shots/boss-${m[1]}.png` });
}
await pg.screenshot({ path: 'shots/final.png' });
console.log('ERRORS', errs.slice(0, 5));
await b.close();
