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
window.__dbg = { startGame, startLevel, spawnBoss, spawnEnemy, get P() { return P; }, get ents() { return ents; }, inp, keys, LEVELS };
})();
