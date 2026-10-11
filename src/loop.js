// ---------------------------------------------------------------- цикъл
let last = performance.now(), acc = 0, slowAvg = 16, slowN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = now - last; acc += Math.min(100, dt); last = now;
  if (G.scene === 'play' && !document.hidden && dt < 200) {
    slowAvg = slowAvg * 0.97 + dt * 0.03; slowN++;
    if (slowN > 180 && slowAvg > 21 && qual < QCAP.length - 1) { qual++; slowN = 0; slowAvg = 16; resize(); }
  }
  let n = 0;
  while (acc >= 1000 / 60 && n < 4) { tick(); acc -= 1000 / 60; n++; }
  if (n === 4) acc = 0;
  for (let i = 1; i < (window.__turbo | 0); i++) tick();
  render();
}
if (document.fonts && document.fonts.load) { document.fonts.load('10px "Press Start 2P"').catch(() => { }); document.fonts.load('20px "Russo One"').catch(() => { }); }
setScene('title');
requestAnimationFrame(frame);
// икона на приложението (за инсталиране на телефона), рисувана със същия код като героите
function makeIcon(n, pad = 1) {
  const c = document.createElement('canvas'); c.width = c.height = n;
  const keep = g; g = c.getContext('2d');
  try {
    g.setTransform(n / 64, 0, 0, n / 64, 0, 0);
    g.fillStyle = vgrad(0, 64, [[0, '#2a5a20'], [1, '#0b0f0c']]); g.fillRect(0, 0, 64, 64);
    add(() => glow(32, 30, 34, '#8ef05a', 0.45));
    const k = 2.6 * pad; g.translate(32 + 3 * k, 33); g.scale(k, k);
    headTurtle(0, 0, 7, colorsFor({ pl: true, t: TURTLES[0] }), 0, 'calm', 'leo', 0);
  } finally { g = keep; }
  return c.toDataURL('image/png');
}
window.__dbg = { render, cv, makeIcon,  startGame, startLevel, spawnBoss, spawnEnemy, lob, startSuper, get P() { return P; }, get ents() { return ents; }, get projs() { return projs; }, get items() { return items; }, inp, keys, LEVELS, TURTLES, colorsFor };
})();
