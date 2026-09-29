// ---------------------------------------------------------------- рисуване: сцени
function drawWorld() {
  const L = LEVELS[G.lvl], cam = Math.round(G.cam * 4) / 4;
  g.save();
  if (G.shake) g.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake) * 0.6);
  drawBG(L.theme, cam);
  for (const h of hazards) if (h.k === 'laser' || (h.k === 'car' && h.t <= h.warn)) drawHazard(h, cam);
  const list = [];
  for (const o of props) list.push([o.y, () => { shadow(o.x - cam + 2, o.y, 0, 17); drawProp(o, cam); }]);
  for (const it of items) list.push([it.y, () => { shadow(it.x - cam, it.y, it.z, 13); drawItem(it, cam); }]);
  for (const e of ents) list.push([e.y, () => { if (!e.ghost) shadow(e.x - cam, e.y, e.z, 13 * (e.sc || 1) * CHS); drawChar(e, cam); }]);
  if (P && P.state !== 'dead') list.push([P.y + 0.01, () => { shadow(P.x - cam, P.y, P.z, 15 * CHS); drawChar(P, cam); }]);
  for (const p of projs) list.push([p.y, () => { shadow(p.x - cam, p.y, p.z, 5); drawProj(p, cam); }]);
  for (const h of hazards) if (h.k === 'fall' || (h.k === 'car' && h.t > h.warn)) list.push([h.y, () => drawHazard(h, cam)]);
  list.sort((a, b) => a[0] - b[0]);
  for (const [, fn] of list) fn();
  for (const e of ents) if (e.boss && e.move === 'laser' && e.phase > 0) {
    const y = e.y - e.z - 26 * e.sc * CHS, x0 = e.x - cam + e.face * 22, x1 = e.face > 0 ? W : 0, lx = Math.min(x0, x1), lw = Math.abs(x1 - x0);
    if (e.phase === 1) { if (G.t & 4) { g.strokeStyle = 'rgba(255,60,200,.85)'; g.setLineDash([5, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); g.setLineDash([]); } add(() => glow(x0, y, 10 + (G.t % 10), '#ff40d0', 0.8)); }
    else add(() => { g.fillStyle = vgrad(y - 12, y + 12, [[0, 'rgba(255,64,208,0)'], [0.5, 'rgba(255,64,208,.7)'], [1, 'rgba(255,64,208,0)']]); g.fillRect(lx, y - 12, lw, 24); g.fillStyle = '#ff9af0'; g.fillRect(lx, y - 3.5, lw, 7); g.fillStyle = '#fff'; g.fillRect(lx, y - 1.5, lw, 3); glow(x0, y, 22, '#ff70e0', 1); });
  }
  drawOver(L.theme, cam);
  drawParts(cam);
  for (const t of texts) { g.globalAlpha = Math.min(1, t.life / 20); txt(t.txt, t.x - cam, t.y - t.z, 8, t.col); g.globalAlpha = 1; }
  g.restore();
  if (G.flash > 0) { g.fillStyle = `rgba(255,255,255,${(G.flash / 12).toFixed(2)})`; g.fillRect(0, 0, W, H); }
}
function hpBar(x, y, w, h, v, col) {
  v = clamp(v, 0, 1);
  rrect(x - 1.5, y - 1.5, w + 3, h + 3, 2); g.fillStyle = '#050505'; g.fill();
  g.fillStyle = vgrad(y, y + h, [[0, '#4a1414'], [1, '#200808']]); g.fillRect(x, y, w, h);
  const c = v > 0.5 ? col : v > 0.25 ? '#ffd23f' : '#ff4a3a';
  g.fillStyle = vgrad(y, y + h, [[0, tone(c, 45)], [0.5, c], [1, tone(c, -35)]]); g.fillRect(x, y, w * v, h);
  g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 1; i < 10; i++) g.fillRect(x + w * i / 10, y, 0.8, h);
  g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y, w * v, 1);
}
function hudPanel(x, y, w, h) {
  rrect(x, y, w, h, 5); g.fillStyle = vgrad(y, y + h, [[0, 'rgba(20,34,24,.85)'], [1, 'rgba(4,10,6,.85)']]); g.fill();
  g.strokeStyle = 'rgba(234,255,234,.35)'; g.lineWidth = 1; g.stroke();
}
function drawHUD() {
  const T = TURTLES[G.turtle];
  hudPanel(4, 4, 160, 34);
  g.save(); g.beginPath(); g.arc(21, 21, 13, 0, TAU); g.fillStyle = ball(21, 21, 13, '#2a3a2e'); g.fill(); g.strokeStyle = T.color; g.lineWidth = 1.5; g.stroke(); g.clip();
  g.translate(19, 23); g.scale(1.5, 1.5); headTurtle(0, 0, 6.5, P.C, G.t); g.restore();
  txt(T.name, 40, 12, 7, T.color === '#8a45d6' ? '#c9a0ff' : tone(T.color, 25), 'left');
  for (let i = 0; i < Math.min(G.lives, 5); i++) { const lx = 156 - i * 9; g.beginPath(); g.ellipse(lx, 12, 3.6, 3, 0, 0, TAU); outlineFill(ball(lx, 12, 3.6, '#7a5226'), 1.4); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(lx - 2, 11.6, 4, 0.6); }
  hpBar(40, 19, 118, 6, P.hp / 100, '#5fe05f');
  txt(String(G.score).padStart(7, '0'), 158, 31, 6, '#ffd23f', 'right', FP, 2);
  const bs = ents.filter(e => e.boss && e.hp > 0);
  bs.forEach((b, i) => {
    const y = 6 + i * 26;
    hudPanel(W - 170, y - 2, 166, 24);
    txt(b.def.name, W - 10, y + 5, 7, '#ff8a7a', 'right');
    g.fillStyle = '#ff5a3a'; g.beginPath(); g.arc(W - 160, y + 5, 3.2, 0, TAU); g.fill(); g.fillStyle = '#111'; g.fillRect(W - 161.8, y + 4, 1.2, 1.2); g.fillRect(W - 159.2, y + 4, 1.2, 1.2);
    hpBar(W - 162, y + 12, 154, 6, b.hp / b.maxhp, '#ff5a3a');
  });
  if (G.goT > 0 && !G.wave && (G.t & 16)) {
    txt('НАПРЕД', W - 62, H / 2 - 30, 12, '#ffd23f');
    g.beginPath(); g.moveTo(W - 12, H / 2 - 30); g.lineTo(W - 26, H / 2 - 42); g.lineTo(W - 26, H / 2 - 18); g.closePath(); outlineFill(vgrad(H / 2 - 42, H / 2 - 18, [[0, '#fff0a0'], [1, '#e0a010']]), 2);
  }
  if (G.introT > 0) {
    const L = LEVELS[G.lvl], k = G.introT > 140 ? (170 - G.introT) / 30 : G.introT < 30 ? G.introT / 30 : 1;
    g.fillStyle = vgrad(H / 2 - 40, H / 2 + 40, [[0, 'rgba(0,0,0,0)'], [0.2, `rgba(0,0,0,${(0.75 * k).toFixed(2)})`], [0.8, `rgba(0,0,0,${(0.75 * k).toFixed(2)})`], [1, 'rgba(0,0,0,0)']]); g.fillRect(0, H / 2 - 40, W, 80);
    g.globalAlpha = k; const dx = (1 - k) * 60;
    txt('РУНД ' + (G.lvl + 1), W / 2 - dx, H / 2 - 18, 10, '#ffd23f'); gradTitle(L.name, W / 2 + dx, H / 2 + 5, 24, ['#d8ffb0', '#6fd04a', '#2a7a1a']); txt(L.sub, W / 2, H / 2 + 27, 6, '#eaffea', 'center', FP, 2); g.globalAlpha = 1;
  }
  if (G.banner && G.banner.t > 0) {
    const k = Math.min(1, G.banner.t / 20, (160 - G.banner.t) / 15);
    g.globalAlpha = k; g.fillStyle = vgrad(H / 2 - 26, H / 2 + 26, [[0, 'rgba(90,0,0,0)'], [0.2, 'rgba(90,0,0,.8)'], [0.8, 'rgba(90,0,0,.8)'], [1, 'rgba(90,0,0,0)']]); g.fillRect(0, H / 2 - 26, W, 52);
    txt('ШЕФ', W / 2, H / 2 - 10, 8, '#ffd23f'); gradTitle(G.banner.txt, W / 2, H / 2 + 8, 20, ['#ffe0d0', '#ff7a5a', '#a01a10']); g.globalAlpha = 1;
  }
  if (G.bossStage === 2) txt('НЕЩО ИДВА...', W / 2, H / 2, 12, '#c070ff');
  if (G.bossStage === 4) gradTitle('ПОБЕДА!', W / 2, H / 2 - 10, 30, ['#ffffff', '#7dff7d', '#1a8a2a']);
}
function gradTitle(s, x, y, size, cols, font = FT_T) {
  g.font = size + 'px ' + font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = size * 0.3; g.strokeStyle = '#0a0a0a'; g.strokeText(s, x, y + size * 0.06);
  g.fillStyle = vgrad(y - size * 0.5, y + size * 0.5, [[0, cols[0]], [0.5, cols[1]], [1, cols[2]]]); g.fillText(s, x, y);
  g.save(); g.globalAlpha *= 0.5; g.lineWidth = 0.6; g.strokeStyle = '#ffffff'; g.strokeText(s, x, y - 0.5); g.restore();
}
function button(x, y, w, h, label, fn, size = 8) {
  const i = UI.btns.length; UI.btns.push({ x, y, w, h, fn });
  const sel = G.sel === i;
  rrect(x, y + 2, w, h, 6); g.fillStyle = 'rgba(0,0,0,.5)'; g.fill();
  rrect(x, y, w, h, 6); g.fillStyle = sel ? vgrad(y, y + h, [[0, '#fff0a0'], [1, '#e0a010']]) : vgrad(y, y + h, [[0, 'rgba(40,70,44,.95)'], [1, 'rgba(10,24,14,.95)']]); g.fill();
  g.lineWidth = 1.6; g.strokeStyle = sel ? '#ffffff' : '#6fd04a'; g.stroke();
  g.fillStyle = 'rgba(255,255,255,.18)'; rrect(x + 2, y + 1.5, w - 4, h * 0.4, 4); g.fill();
  txt(label, x + w / 2, y + h / 2 + 1, size, sel ? '#1a1a1a' : '#eaffea', 'center', FP, 0);
}
function logo(y, s = 1) {
  g.save(); g.translate(W / 2, y); g.scale(s, s);
  add(() => glow(0, 12, 130, '#6fd04a', 0.25));
  g.save(); g.rotate(-0.03);
  g.font = '38px ' + FT_T; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  g.lineWidth = 12; g.strokeStyle = '#0a1a06'; g.strokeText('КОСТЕНУРКИТЕ', 0, 3);
  g.lineWidth = 7; g.strokeStyle = '#1a3a10'; g.strokeText('КОСТЕНУРКИТЕ', 0, 0);
  g.fillStyle = vgrad(-18, 18, [[0, '#e8ffb8'], [0.45, '#7ee04a'], [0.55, '#4ab82a'], [1, '#1f6a14']]); g.fillText('КОСТЕНУРКИТЕ', 0, 0);
  g.save(); g.beginPath(); g.rect(-200, -20, 400, 12); g.clip(); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillText('КОСТЕНУРКИТЕ', 0, 0); g.restore();
  g.restore();
  g.beginPath(); g.moveTo(-100, 21); g.lineTo(100, 16); g.lineTo(93, 47); g.lineTo(-93, 49); g.closePath();
  outlineFill(vgrad(16, 49, [[0, '#ff6a5a'], [0.5, '#d0342f'], [1, '#7a1410']]), 3);
  g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.moveTo(-98, 22); g.lineTo(98, 17.5); g.lineTo(97, 23); g.lineTo(-97, 27); g.fill();
  g.font = '26px ' + FT_T; g.lineWidth = 4; g.strokeStyle = '#3a0806'; g.strokeText('НИНДЖИ', 0, 33); g.fillStyle = vgrad(22, 44, [[0, '#ffffff'], [1, '#ffd0c0']]); g.fillText('НИНДЖИ', 0, 32);
  g.restore();
}
function fakeTurtle(i, st = 'idle') { const e = { pl: true, t: TURTLES[i], x: 0, y: 0, z: 0, face: 1, state: st, st: G.t % 30, anim: G.t + i * 13, inv: 0, combo: 1, jk: false }; e.C = colorsFor(e); return e; }
function drawTitle() {
  drawBG('street', G.t * 0.6); drawOver('street', G.t * 0.6);
  g.fillStyle = vgrad(0, H, [[0, 'rgba(0,0,0,.35)'], [0.5, 'rgba(0,0,0,.1)'], [1, 'rgba(0,0,0,.5)']]); g.fillRect(0, 0, W, H);
  logo(54);
  for (let i = 0; i < 4; i++) { const e = fakeTurtle(i); e.x = 150 + i * 60; e.y = 198; e.face = i < 2 ? 1 : -1; shadow(e.x, e.y, 0, 20); drawChar(e, 0); }
  UI.cols = 1;
  button(W / 2 - 70, 208, 140, 22, 'ИГРАЙ', () => { G.startLvl = 0; setScene('select'); }, 10);
  button(W / 2 - 70, 235, 66, 18, 'РУНДОВЕ', () => setScene('levels'), 6);
  button(W / 2 + 4, 235, 66, 18, Snd.muted ? 'ЗВУК: НЕ' : 'ЗВУК: ДА', () => { Snd.setMuted(!Snd.muted); if (!Snd.muted) Music.start('title'); }, 6);
  button(W - 74, 8, 66, 16, 'ЦЯЛ ЕКРАН', goFull, 5);
  if (G.best) txt('РЕКОРД ' + G.best, 8, 14, 6, '#ffd23f', 'left', FP, 2);
  txt('Фен игра. Не е официален продукт.', W / 2, H - 7, 5, '#9ab09a', 'center', FP, 0);
  Music.start('title');
}
function goFull() {
  const d = document.documentElement;
  try {
    const p = (d.requestFullscreen || d.webkitRequestFullscreen || (() => Promise.reject())).call(d);
    if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }).catch(() => { });
  } catch (e) { }
}
function backButton() {
  const bi = UI.btns.length; UI.btns.push({ x: 6, y: 6, w: 58, h: 18, fn: () => setScene('title') });
  rrect(6, 6, 58, 18, 5); g.fillStyle = G.sel === bi ? '#ffd23f' : 'rgba(10,24,14,.9)'; g.fill(); g.strokeStyle = '#6fd04a'; g.lineWidth = 1.4; g.stroke();
  txt('< НАЗАД', 35, 16, 5, G.sel === bi ? '#111' : '#eaffea', 'center', FP, 0);
}
function drawSelect() {
  drawBG('sewer', G.t * 0.3); drawOver('sewer', G.t * 0.3);
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, W, H);
  gradTitle('ИЗБЕРИ КОСТЕНУРКА', W / 2, 20, 18, ['#fff0a0', '#ffd23f', '#b07a10']);
  txt('РУНД ' + (G.startLvl + 1) + ': ' + LEVELS[G.startLvl].name, W / 2, 38, 6, '#9ad09a', 'center', FP, 2);
  UI.cols = 4;
  for (let i = 0; i < 4; i++) {
    const T = TURTLES[i], x = 16 + i * 114, y = 48, w = 106, h = 186, sel = G.sel === i;
    UI.btns.push({ x, y, w, h, fn: () => startGame(i, G.startLvl) });
    rrect(x, y, w, h, 7); g.fillStyle = vgrad(y, y + h, [[0, sel ? rgba(T.color, 0.45) : 'rgba(20,34,24,.9)'], [1, 'rgba(4,10,6,.95)']]); g.fill();
    g.lineWidth = sel ? 3 : 1.5; g.strokeStyle = sel ? '#ffd23f' : T.color; g.stroke();
    if (sel) add(() => glow(x + w / 2, y + 80, 60, T.color, 0.35));
    const e = fakeTurtle(i, sel && (G.t % 60) < 20 ? 'attack' : 'idle'); if (e.state === 'attack') e.st = G.t % 20; e.sc = 1.6; e.x = x + w / 2; e.y = y + 118;
    shadow(e.x, e.y, 0, 26); drawChar(e, 0);
    gradTitle(T.name, x + w / 2, y + 134, 14, [tone(T.color, 60), tone(T.color, 20), tone(T.color, -35)]);
    txt(T.desc, x + w / 2, y + 149, 6, '#eaffea', 'center', FP, 2);
    ['СИЛА', 'БЪРЗ', 'ОБХВАТ'].forEach((lb, j) => {
      txt(lb, x + 8, y + 161 + j * 9, 5, '#9ab09a', 'left', FP, 0);
      for (let k = 0; k < 5; k++) { rrect(x + 52 + k * 9.5, y + 158 + j * 9, 8, 5, 1); g.fillStyle = k < T.stat[j] ? vgrad(y + 158 + j * 9, y + 163 + j * 9, [[0, '#a0ff90'], [1, '#2a9a2a']]) : '#1a2a1a'; g.fill(); }
    });
  }
  backButton();
  txt('Докосни костенурка, за да започнеш', W / 2, H - 14, 6, '#eaffea', 'center', FP, 2);
}
function drawLevels() {
  drawBG('tech', G.t * 0.3); drawOver('tech', G.t * 0.3);
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, 0, W, H);
  gradTitle('ИЗБЕРИ РУНД', W / 2, 20, 18, ['#fff0a0', '#ffd23f', '#b07a10']);
  UI.cols = 3;
  LEVELS.forEach((L, i) => {
    const x = 18 + (i % 3) * 150, y = 40 + Math.floor(i / 3) * 106, w = 142, h = 98, sel = G.sel === i;
    UI.btns.push({ x, y, w, h, fn: () => { G.startLvl = i; setScene('select'); } });
    g.save(); rrect(x, y, w, h, 7); g.clip();
    const c = thumb(L.theme, 400 + i * 200); g.drawImage(c, x - 20, y - 6, w + 40, (w + 40) * H / W);
    g.fillStyle = vgrad(y + h - 44, y + h, [[0, 'rgba(0,0,0,0)'], [0.4, 'rgba(0,0,0,.65)'], [1, 'rgba(0,0,0,.85)']]); g.fillRect(x, y + h - 44, w, 44);
    g.restore();
    rrect(x, y, w, h, 7); g.lineWidth = sel ? 3 : 1.5; g.strokeStyle = sel ? '#ffd23f' : '#6fd04a'; g.stroke();
    txt('РУНД ' + (i + 1), x + 8, y + 12, 7, '#ffd23f', 'left');
    txt(L.name, x + w / 2, y + h - 28, 7, '#9dff8d', 'center', FP, 2);
    txt('Шеф: ' + [...L.boss, ...(L.boss2 || [])].map(b => BDEF[b].name).join(', '), x + w / 2, y + h - 12, 5, '#ffb0a0', 'center', FP, 0);
    if (G.done.includes(i)) txt('ПРЕМИНАТ', x + w - 8, y + 12, 5, '#7dff7d', 'right', FP, 2);
  });
  backButton();
}
function panel(h) {
  g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W, H);
  rrect(W / 2 - 132, H / 2 - h / 2 + 3, 264, h, 9); g.fillStyle = 'rgba(0,0,0,.5)'; g.fill();
  rrect(W / 2 - 132, H / 2 - h / 2, 264, h, 9); g.fillStyle = vgrad(H / 2 - h / 2, H / 2 + h / 2, [[0, 'rgba(30,52,34,.97)'], [1, 'rgba(6,14,8,.97)']]); g.fill(); g.strokeStyle = '#6fd04a'; g.lineWidth = 2; g.stroke();
}
function drawPause() {
  panel(130); UI.cols = 1;
  gradTitle('ПАУЗА', W / 2, H / 2 - 42, 22, ['#fff0a0', '#ffd23f', '#b07a10']);
  button(W / 2 - 80, H / 2 - 20, 160, 22, 'ПРОДЪЛЖИ', togglePause, 8);
  button(W / 2 - 80, H / 2 + 8, 76, 20, Snd.muted ? 'ЗВУК: НЕ' : 'ЗВУК: ДА', () => Snd.setMuted(!Snd.muted), 6);
  button(W / 2 + 4, H / 2 + 8, 76, 20, 'МЕНЮ', () => { setScene('title'); }, 6);
  txt('Стрелки/джойстик: ход  J/УДАР  K/СКОК  L/СПЕЦ', W / 2, H / 2 + 46, 5, '#9ab09a', 'center', FP, 0);
}
function drawClear() {
  panel(140); UI.cols = 1;
  gradTitle('РУНД ' + (G.lvl + 1) + ' ПРЕМИНАТ!', W / 2, H / 2 - 48, 18, ['#e8ffd0', '#7dff7d', '#1a8a2a']);
  txt('Бонус: ' + G.bonus, W / 2, H / 2 - 24, 8, '#ffd23f');
  txt('Точки: ' + G.score, W / 2, H / 2 - 8, 8, '#eaffea');
  const last = G.lvl >= LEVELS.length - 1;
  button(W / 2 - 80, H / 2 + 10, 160, 24, last ? 'ФИНАЛ' : 'СЛЕДВАЩ РУНД', () => { if (last) { setScene('ending'); Music.start('end'); confetti(); } else startLevel(G.lvl + 1); }, 8);
  button(W / 2 - 50, H / 2 + 40, 100, 18, 'МЕНЮ', () => setScene('title'), 6);
}
function drawGameOver() {
  panel(130); UI.cols = 1;
  gradTitle('КРАЙ НА ИГРАТА', W / 2, H / 2 - 40, 18, ['#ffd0c0', '#ff5a4a', '#8a1010']);
  txt('Точки: ' + G.score, W / 2, H / 2 - 18, 8, '#ffd23f');
  button(W / 2 - 80, H / 2 - 2, 160, 24, 'ПРОДЪЛЖИ РУНДА', () => { G.lives = 3; G.conts++; G.score = Math.floor(G.score / 2); startLevel(G.lvl); }, 7);
  button(W / 2 - 50, H / 2 + 30, 100, 18, 'МЕНЮ', () => setScene('title'), 6);
}
function confetti() { parts = []; for (let i = 0; i < 120; i++) parts.push({ k: 'confetti', x: rnd(W), y: rnd(-H, 0), vx: rnd(-0.4, 0.4), vy: rnd(0.6, 1.6), vz: 0, z: 0, life: 99999, max: 99999, col: ['#ffd23f', '#e0342f', '#2f6fe0', '#8a45d6', '#f08a1c', '#5fe05f'][i % 6] }); }
function drawEnding() {
  drawBG('street', 900 + G.t * 0.2); drawOver('street', 900 + G.t * 0.2);
  g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(0, 0, W, H);
  for (const q of parts) if (q.y > H) q.y -= H + 10;
  gradTitle('ГРАДЪТ Е СПАСЕН!', W / 2, 32, 28, ['#e8ffd0', '#7dff7d', '#1a8a2a']);
  txt('Костенурките празнуват с пица.', W / 2, 58, 7, '#eaffea', 'center', FP, 2);
  add(() => glow(W / 2, 198, 60, '#ffc060', 0.4));
  g.beginPath(); g.ellipse(W / 2, 201, 32, 11, 0, 0, TAU); outlineFill(vgrad(190, 212, [[0, '#ffffff'], [1, '#b8b0a0']]), 2);
  g.beginPath(); g.ellipse(W / 2, 199, 27, 8.5, 0, 0, TAU); outlineFill(vgrad(190, 208, [[0, '#f0b050'], [1, '#b06a20']]), 1.4);
  g.beginPath(); g.ellipse(W / 2, 198.5, 23, 6.8, 0, 0, TAU); g.fillStyle = vgrad(192, 205, [[0, '#ffe07a'], [1, '#f0a830']]); g.fill();
  for (let i = 0; i < 7; i++) { g.beginPath(); g.ellipse(W / 2 - 16 + i * 5.3, 197 + Math.sin(i * 2) * 3, 2.2, 1.2, 0, 0, TAU); g.fillStyle = '#c0392b'; g.fill(); }
  for (let i = 0; i < 4; i++) { const e = fakeTurtle(i, (G.t + i * 20) % 80 < 30 ? 'jump' : 'idle'); e.sc = 1.25; e.x = 120 + i * 80 + (i > 1 ? 20 : -20); e.y = 214; e.face = i < 2 ? 1 : -1; e.z = e.state === 'jump' ? Math.sin(((G.t + i * 20) % 80) / 30 * Math.PI) * 20 : 0; shadow(e.x, e.y, e.z, 24); drawChar(e, 0); }
  txt('Точки: ' + G.score + (G.conts ? '   Продължения: ' + G.conts : ''), W / 2, 80, 7, '#ffd23f', 'center', FP, 2);
  drawParts(0);
  UI.cols = 1;
  button(W / 2 - 50, H - 30, 100, 20, 'МЕНЮ', () => setScene('title'), 7);
}
function render() {
  g.setTransform(DPR * SC, 0, 0, DPR * SC, 0, 0);
  g.clearRect(0, 0, W, H);
  g.imageSmoothingQuality = 'high';
  UI.btns = []; UI.cols = 1;
  switch (G.scene) {
    case 'title': drawTitle(); break;
    case 'select': drawSelect(); break;
    case 'levels': drawLevels(); break;
    case 'play': drawWorld(); drawHUD(); break;
    case 'paused': drawWorld(); drawHUD(); drawPause(); break;
    case 'clear': drawWorld(); drawHUD(); drawClear(); break;
    case 'gameover': drawWorld(); drawGameOver(); break;
    case 'ending': drawEnding(); break;
  }
  if (G.sel >= UI.btns.length) G.sel = 0;
}
