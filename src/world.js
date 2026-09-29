// ---------------------------------------------------------------- фонове: кеш на слоевете
// Статичните слоеве се рисуват веднъж на парчета по 256px и после само се копират – така фонът е детайлен, а играта е бърза.
const CHW = 256, BG = new Map(); let bgRS = 0;
function bgClear() { BG.clear(); }
if (document.fonts && document.fonts.ready) document.fonts.ready.then(bgClear).catch(() => { });
function layerBlit(key, f, y0, h, cam, draw) {
  const RS = Math.min(3, SC * DPR);
  if (Math.abs(RS - bgRS) > 0.01) { BG.clear(); bgRS = RS; }
  const off = cam * f, i0 = Math.floor(off / CHW), i1 = Math.floor((off + W) / CHW);
  for (let i = i0; i <= i1; i++) {
    const k = key + i; let c = BG.get(k);
    if (c) { BG.delete(k); BG.set(k, c); }
    else {
      c = document.createElement('canvas'); c.width = Math.ceil(CHW * RS) + 2; c.height = Math.ceil(h * RS);
      const keep = g; g = c.getContext('2d');
      g.setTransform(RS, 0, 0, RS, -i * CHW * RS, -y0 * RS);
      try { draw(i * CHW, (i + 1) * CHW + 2); } catch (err) { console.error(err); }
      g = keep; BG.set(k, c);
      while (BG.size > 48) BG.delete(BG.keys().next().value);
    }
    g.drawImage(c, i * CHW - off, y0, c.width / RS, c.height / RS);
  }
}
function each(x0, x1, sp, m, fn) { for (let k = Math.floor((x0 - m) / sp); k * sp <= x1 + m; k++) fn(k * sp, k); }
function speckle(x0, x1, y0, y1, cell, dens, cols, seed) {
  for (let cx = Math.floor(x0 / cell) * cell; cx < x1; cx += cell) for (let cy = y0; cy < y1; cy += cell) {
    const h = hash(seed + Math.round(cx / cell) * 7919 + Math.round(cy / cell) * 104729);
    if (h < dens) { const s = (h * 1e6) | 0; g.fillStyle = cols[s % cols.length]; g.fillRect(cx + hash(s) * cell, cy + hash(s + 1) * cell, 1, 1); }
  }
}
function bricks(x0, x1, y0, y1, bw, bh, base, mortar, seed, va = 16) {
  g.fillStyle = mortar; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  for (let r = 0; y0 + r * bh < y1; r++) {
    const y = y0 + r * bh, o = (r % 2) * bw / 2, hh = Math.min(bh, y1 - y);
    for (let bx = Math.floor((x0 - o) / bw) * bw + o; bx < x1; bx += bw) {
      const h = hash(seed + Math.round(bx) * 31 + r * 977);
      g.fillStyle = tone(base, Math.round((h - 0.5) * va)); g.fillRect(bx + 0.6, y + 0.6, bw - 1.2, hh - 1.2);
      g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(bx + 0.6, y + 0.6, bw - 1.2, 0.7);
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(bx + 0.6, y + hh - 1.3, bw - 1.2, 0.7);
    }
  }
}
function planks(x0, x1, rows, pal, seed, grain) {
  for (let r = 0; r < rows.length - 1; r++) {
    const ya = rows[r], yb = rows[r + 1], Lb = 58 + (r % 3) * 24, off = hash(seed + r * 17) * Lb;
    for (let k = Math.floor((x0 - off) / Lb) - 1; k * Lb + off < x1; k++) {
      const bx = k * Lb + off, h = hash(seed + r * 1000 + k), c = pal[(h * pal.length) | 0];
      g.fillStyle = vgrad(ya, yb, [[0, tone(c, 22)], [0.25, c], [1, tone(c, -30)]]); g.fillRect(bx, ya, Lb, yb - ya);
      g.strokeStyle = grain; g.lineWidth = 0.5; g.beginPath();
      for (let i = 1; i < 3; i++) { const yy = ya + (yb - ya) * i / 3 + (hash(seed + k * 3 + i) - 0.5); g.moveTo(bx + 3, yy); g.bezierCurveTo(bx + Lb * 0.3, yy - 0.8, bx + Lb * 0.6, yy + 0.8, bx + Lb - 3, yy); }
      g.stroke();
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(bx, ya, 1, yb - ya);
      g.fillStyle = 'rgba(0,0,0,.2)'; circ(bx + 3, (ya + yb) / 2, 0.6, 'rgba(20,10,5,.7)', null); circ(bx + Lb - 3, (ya + yb) / 2, 0.6, 'rgba(20,10,5,.7)', null);
    }
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x0, yb - 0.8, x1 - x0, 0.8);
  }
}
function rowsFrom(y0, y1, n) { const r = []; for (let i = 0; i <= n; i++) r.push(y0 + (y1 - y0) * Math.pow(i / n, 1.35)); return r; }
function softSpot(x, y, rx, ry, col, a) { g.save(); g.translate(x, y); g.scale(1, ry / rx); const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0)); g.fillStyle = gr; g.fillRect(-rx, -rx, rx * 2, rx * 2); g.restore(); }
function add(fn) { g.save(); g.globalCompositeOperation = 'lighter'; fn(); g.restore(); }
function perspLines(cam, sp, col, y0 = HOR) { g.strokeStyle = col; g.lineWidth = 1; g.beginPath(); each(cam, cam + W, sp, 400, x => { const sx = x - cam, xt = W / 2 + (sx - W / 2) * 0.8, xb = W / 2 + (sx - W / 2) * 1.45; g.moveTo(xt, y0); g.lineTo(xb, H); }); g.stroke(); }

// ---------------------------------------------------------------- теми
const TH = {};
TH.fire = {
  grade: ['#ff6a20', 0.14],
  behind(cam, t) {
    g.fillStyle = vgrad(0, HOR, [[0, '#1a0400'], [0.5, '#7a1e06'], [1, '#e0641a']]); g.fillRect(0, 0, W, HOR);
    each(cam, cam + W, 160, 80, (wx, k) => {
      const sx = wx - cam;
      add(() => glow(sx + 68, 70, 60, '#ff4010', 0.3 + 0.08 * Math.sin(t * 0.2 + k)));
      g.fillStyle = 'rgba(40,6,0,.45)'; g.fillRect(sx + 40, 28, 56, 40);
      for (let i = 0; i < 5; i++) flameShape(sx + 40 + i * 13, 102, 30 + hash(k * 5 + i) * 20, t + k * 13 + i * 7);
    });
  },
  layers: [['fw', 1, 0, HOR + 2, (x0, x1) => {
    g.fillStyle = vgrad(0, HOR, [[0, '#1e0e0a'], [0.6, '#4a2518'], [1, '#381a10']]); g.fillRect(x0, 0, x1 - x0, HOR + 2);
    for (let x = Math.floor(x0 / 12) * 12; x < x1; x += 12) { g.fillStyle = 'rgba(255,200,150,.045)'; g.fillRect(x, 14, 5, 90); for (let y = 20; y < 102; y += 12) { g.fillStyle = 'rgba(255,210,160,.07)'; g.beginPath(); g.moveTo(x + 8.5, y - 2); g.lineTo(x + 10.5, y); g.lineTo(x + 8.5, y + 2); g.lineTo(x + 6.5, y); g.fill(); } }
    g.fillStyle = vgrad(106, HOR, [[0, '#5a2e1a'], [1, '#2a140a']]); g.fillRect(x0, 106, x1 - x0, HOR - 106);
    each(x0, x1, 40, 40, px => { rrect(px + 4, 112, 32, HOR - 119, 1.5); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1.2; g.stroke(); g.strokeStyle = 'rgba(255,180,120,.13)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(px + 5, HOR - 7.5); g.lineTo(px + 35, HOR - 7.5); g.lineTo(px + 35, 113); g.stroke(); });
    g.fillStyle = vgrad(102, 108, [[0, '#9a6040'], [0.4, '#6a3a22'], [1, '#2a1208']]); g.fillRect(x0, 102, x1 - x0, 6);
    each(x0, x1, 160, 160, (wx, k) => {
      const gr = g.createRadialGradient(wx + 68, 20, 2, wx + 68, 20, 64); gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(wx + 4, -44, 128, 128);
      g.clearRect(wx + 40, 28, 56, 70);
      g.lineWidth = 5; g.strokeStyle = '#140804'; g.strokeRect(wx + 38, 26, 60, 74); g.lineWidth = 2.2; g.strokeStyle = '#7a4424'; g.strokeRect(wx + 38, 26, 60, 74);
      g.fillStyle = '#1c0c06'; g.fillRect(wx + 66.5, 28, 3, 70); g.fillRect(wx + 40, 58, 56, 3);
      rrect(wx + 33, 99, 70, 5, 1); g.fillStyle = vgrad(99, 104, [[0, '#9a6a4a'], [1, '#3a1c10']]); g.fill();
      g.fillStyle = 'rgba(210,235,255,.35)'; g.beginPath(); g.moveTo(wx + 40, 28); g.lineTo(wx + 53, 28); g.lineTo(wx + 40, 45); g.fill(); g.beginPath(); g.moveTo(wx + 96, 97); g.lineTo(wx + 83, 97); g.lineTo(wx + 96, 79); g.fill();
      g.fillStyle = hgrad(wx + 126, wx + 144, [[0, '#1a0a06'], [0.35, '#4a2414'], [1, '#100402']]); g.fillRect(wx + 126, 0, 18, HOR);
      if (hash(k * 7 + 3) < 0.4) {
        rrect(wx + 101, 56, 22, HOR - 60, 1); g.fillStyle = hgrad(wx + 101, wx + 123, [[0, '#4a2210'], [1, '#2a1006']]); g.fill(); g.strokeStyle = '#140804'; g.lineWidth = 2; g.stroke();
        for (const yy of [62, 96]) { g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1; g.strokeRect(wx + 104, yy, 16, 28); }
        circ(wx + 119, 102, 1.3, '#d8b040', '#3a2a10', 0.6);
      } else {
        g.save(); g.translate(wx + 112, 48); g.rotate((hash(k) - 0.5) * 0.25);
        g.fillStyle = '#3a200e'; g.fillRect(-11, -9, 22, 18); g.fillStyle = vgrad(-7, 7, [[0, '#6a8ab0'], [0.6, '#c09050'], [1, '#4a6a2a']]); g.fillRect(-8, -6, 16, 12);
        g.strokeStyle = '#c9a24a'; g.lineWidth = 1; g.strokeRect(-11, -9, 22, 18); g.restore();
      }
    });
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 0.7; each(x0, x1, 90, 30, (cx, k) => { if (hash(k + 44) < 0.5) return; g.beginPath(); g.moveTo(cx, 16); g.lineTo(cx + 4, 26); g.lineTo(cx + 1, 34); g.lineTo(cx + 6, 44); g.stroke(); });
    g.fillStyle = vgrad(0, 15, [[0, '#080201'], [1, '#2a140a']]); g.fillRect(x0, 0, x1 - x0, 15);
    each(x0, x1, 64, 20, bx => { g.fillStyle = hgrad(bx, bx + 10, [[0, '#1a0a04'], [1, '#3a1a0c']]); g.fillRect(bx, 0, 10, 18); });
    g.fillStyle = vgrad(HOR - 6, HOR + 2, [[0, '#3a1a0c'], [1, '#080200']]); g.fillRect(x0, HOR - 6, x1 - x0, 8);
  }]],
  floor: ['ff', HOR, (x0, x1) => {
    planks(x0, x1, rowsFrom(HOR, H + 2, 12), ['#6a4226', '#5e3a20', '#74492a', '#553318', '#6e4424'], 11, 'rgba(40,20,8,.35)');
    each(x0, x1, 120, 60, (x, k) => { if (hash(k * 3 + 1) < 0.5) softSpot(x + hash(k) * 80, HOR + 20 + hash(k + 9) * 90, 24 + hash(k + 5) * 20, 8 + hash(k + 2) * 6, '#000000', 0.45); });
    g.fillStyle = vgrad(HOR, HOR + 34, [[0, 'rgba(0,0,0,.55)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(x0, HOR, x1 - x0, 34);
  }],
  front(cam, t) {
    add(() => each(cam, cam + W, 160, 100, (wx, k) => softSpot(wx - cam + 68, HOR + 34, 80, 26, '#ff7020', 0.28 + 0.08 * Math.sin(t * 0.25 + k * 2))));
  },
  over(cam, t) {
    g.fillStyle = vgrad(0, 70, [[0, 'rgba(15,6,4,.85)'], [1, 'rgba(15,6,4,0)']]); g.fillRect(0, 0, W, 70);
    for (let i = 0; i < 6; i++) { const x = ((hash(i) * 900 - cam * 0.3 + t * (0.15 + hash(i + 3) * 0.2)) % 600 + 600) % 600 - 60; softSpot(x, 20 + hash(i + 7) * 30, 60, 22, '#1a1010', 0.5); }
    add(() => { for (let i = 0; i < 26; i++) { const x = ((hash(i) * W + t * (0.3 + hash(i + 9)) - cam * 0.2) % W + W) % W, y = H - ((t * (0.5 + hash(i + 3) * 0.7) + hash(i + 5) * H) % H); g.fillStyle = i % 2 ? '#ffb040' : '#ff6020'; g.fillRect(x, y, 1.6, 1.6); glow(x, y, 4, '#ff7020', 0.4); } });
  }
};
TH.street = {
  grade: ['#4050c0', 0.14],
  behind(cam, t) {
    g.fillStyle = vgrad(0, HOR, [[0, '#050720'], [0.55, '#1c1a4a'], [1, '#5a2a5a']]); g.fillRect(0, 0, W, HOR);
    g.fillStyle = '#fff'; for (let i = 0; i < 50; i++) { g.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(G.t * 0.03 + i)); g.fillRect(hash(7 + i) * W, hash(507 + i) * 80, 1, 1); } g.globalAlpha = 1;
    add(() => glow(W - 70, 34, 50, '#c8d0ff', 0.35)); g.beginPath(); g.arc(W - 70, 34, 13, 0, TAU); g.fillStyle = ball(W - 70, 34, 13, '#f4f0d8'); g.fill();
    g.fillStyle = 'rgba(200,200,180,.25)'; g.beginPath(); g.arc(W - 74, 31, 3, 0, TAU); g.arc(W - 64, 38, 2, 0, TAU); g.fill();
    add(() => { g.fillStyle = vgrad(90, HOR, [[0, 'rgba(255,120,80,0)'], [1, 'rgba(255,120,80,.25)']]); g.fillRect(0, 90, W, HOR - 90); });
  },
  layers: [
    ['sf', 0.12, 30, HOR - 28, (x0, x1) => each(x0, x1, 28, 60, (bx, k) => {
      const h = 34 + hash(100 + k) * 60, w = 24 + hash(k * 3 + 100) * 22, top = HOR - h;
      g.fillStyle = vgrad(top, HOR, [[0, '#23224a'], [1, '#141432']]); g.fillRect(bx, top, w, h + 2);
      g.fillStyle = 'rgba(255,220,130,.75)'; for (let wy = top + 5; wy < HOR - 5; wy += 6) for (let wx = bx + 3; wx < bx + w - 3; wx += 5) if (hash(k * 131 + wx * 7 + wy) > 0.72) g.fillRect(wx, wy, 1.6, 2.4);
      if (hash(k + 7) > 0.7) { g.fillStyle = '#141432'; g.fillRect(bx + w / 2 - 5, top - 9, 10, 8); g.fillRect(bx + w / 2 - 6, top - 10, 12, 2); g.fillRect(bx + w / 2 - 4, top - 1, 1, 2); g.fillRect(bx + w / 2 + 3, top - 1, 1, 2); }
      if (hash(k + 9) > 0.8) { g.fillStyle = '#141432'; g.fillRect(bx + w / 2, top - 16, 1, 16); g.fillStyle = '#ff3030'; g.fillRect(bx + w / 2 - 0.5, top - 17, 2, 2); }
    })],
    ['sm', 0.35, 10, HOR - 8, (x0, x1) => each(x0, x1, 70, 80, (bx, k) => {
      const h = 60 + hash(200 + k) * 70, w = 52 + hash(k * 5 + 200) * 30, top = HOR - h;
      g.fillStyle = hgrad(bx, bx + w, [[0, '#2c2a5c'], [1, '#1c1a40']]); g.fillRect(bx, top, w, h + 2);
      g.fillStyle = '#35336a'; g.fillRect(bx - 1, top, w + 2, 3);
      for (let wy = top + 8; wy < HOR - 8; wy += 10) for (let wx = bx + 5; wx < bx + w - 7; wx += 9) {
        const lit = hash(k * 311 + wx * 13 + wy) > 0.55; g.fillStyle = lit ? (hash(wx + wy) > 0.3 ? '#ffd88a' : '#9ad0ff') : '#16143a'; g.fillRect(wx, wy, 5, 6);
        if (lit) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(wx, wy + 3, 5, 3); }
      }
      if (hash(k + 3) > 0.5) { g.strokeStyle = '#0e0c26'; g.lineWidth = 0.8; for (let wy = top + 16; wy < HOR - 10; wy += 20) { g.strokeRect(bx + w * 0.3, wy, 16, 1); g.beginPath(); g.moveTo(bx + w * 0.3, wy); g.lineTo(bx + w * 0.3 + 16, wy + 20); g.stroke(); } }
    })],
    ['sn', 1, 0, HOR + 2, (x0, x1) => each(x0, x1, 200, 200, (bx, k) => {
      const pal = ['#7a3428', '#4e3e62', '#6a5230', '#34506a', '#6a2a3a'], col = pal[((k % 5) + 5) % 5], top = 22 + hash(k * 3) * 18;
      bricks(bx, bx + 198, top, HOR - 44, 10, 5, col, tone(col, -45), k * 50);
      g.fillStyle = vgrad(top - 8, top, [[0, '#c8b8a0'], [1, '#6a5a48']]); g.fillRect(bx - 2, top - 8, 202, 8);
      g.fillStyle = 'rgba(0,0,0,.35)'; for (let i = 0; i < 40; i++) g.fillRect(bx + i * 5, top - 3, 2.5, 3);
      for (let i = 0; i < 4; i++) {
        const wx = bx + 14 + i * 46, wy = top + 14, lit = hash(k * 11 + i) > 0.4;
        g.fillStyle = '#b8a890'; g.fillRect(wx - 3, wy - 4, 30, 4); g.fillRect(wx - 2, wy + 24, 28, 3);
        g.fillStyle = lit ? vgrad(wy, wy + 24, [[0, '#ffe0a0'], [1, '#e09040']]) : vgrad(wy, wy + 24, [[0, '#2a3050'], [1, '#101428']]); g.fillRect(wx, wy, 24, 24);
        if (lit) { g.fillStyle = 'rgba(120,40,40,.55)'; g.fillRect(wx, wy, 7, 24); g.fillRect(wx + 17, wy, 7, 24); if (hash(k + i * 3) > 0.6) { g.fillStyle = 'rgba(40,20,20,.6)'; g.beginPath(); g.arc(wx + 12, wy + 12, 3, 0, TAU); g.fill(); g.fillRect(wx + 8, wy + 15, 8, 9); } }
        else { g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(wx, wy + 16); g.lineTo(wx + 14, wy); g.lineTo(wx + 20, wy); g.lineTo(wx, wy + 22); g.fill(); }
        g.fillStyle = '#1a1420'; g.fillRect(wx + 11, wy, 2, 24); g.fillRect(wx, wy + 11, 24, 2);
      }
      if (hash(k + 17) > 0.45) { g.strokeStyle = '#141018'; g.lineWidth = 1.4; const fx = bx + 58, fw = 60; for (let yy = top + 44; yy < HOR - 52; yy += 26) { g.strokeRect(fx, yy, fw, 1.5); g.lineWidth = 0.6; for (let r = 0; r < fw; r += 4) { g.beginPath(); g.moveTo(fx + r, yy); g.lineTo(fx + r, yy - 6); g.stroke(); } g.lineWidth = 1.4; g.beginPath(); g.moveTo(fx + 6, yy); g.lineTo(fx + fw - 6, yy + 26); g.stroke(); } }
      g.fillStyle = vgrad(HOR - 58, HOR - 46, [[0, '#2a2632'], [1, '#141018']]); g.fillRect(bx + 16, HOR - 58, 140, 12); g.strokeStyle = '#6a6070'; g.lineWidth = 1; g.strokeRect(bx + 16, HOR - 58, 140, 12);
      const aw = hash(k) > 0.5 ? '#c8342f' : '#2f8a4f';
      for (let i = 0; i < 10; i++) { g.fillStyle = vgrad(HOR - 46, HOR - 36, [[0, tone(i % 2 ? aw : '#e8e0d0', 20)], [1, tone(i % 2 ? aw : '#e8e0d0', -40)]]); g.fillRect(bx + 12 + i * 15, HOR - 46, 15, 9); g.beginPath(); g.arc(bx + 19.5 + i * 15, HOR - 37, 7.5, 0, Math.PI); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(bx + 12, HOR - 29, 150, 3);
      g.fillStyle = vgrad(HOR - 32, HOR - 2, [[0, '#101828'], [1, '#243048']]); g.fillRect(bx + 18, HOR - 32, 100, 30);
      g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(bx + 30, HOR - 2); g.lineTo(bx + 55, HOR - 32); g.lineTo(bx + 66, HOR - 32); g.lineTo(bx + 41, HOR - 2); g.fill();
      g.fillStyle = 'rgba(20,20,30,.8)'; for (let i = 0; i < 4; i++) g.fillRect(bx + 26 + i * 22, HOR - 12 - hash(k + i) * 10, 12, 10 + hash(k + i) * 10);
      g.strokeStyle = '#3a3440'; g.lineWidth = 2; g.strokeRect(bx + 18, HOR - 32, 100, 30);
      g.fillStyle = vgrad(HOR - 34, HOR - 2, [[0, '#3a2a1a'], [1, '#1a1008']]); g.fillRect(bx + 124, HOR - 34, 26, 32); g.fillStyle = 'rgba(255,220,150,.35)'; g.fillRect(bx + 128, HOR - 30, 18, 12); circ(bx + 145, HOR - 16, 1, '#d8b040', null);
      g.fillStyle = hgrad(bx + 196, bx + 204, [[0, '#8a7a6a'], [1, '#3a3228']]); g.fillRect(bx + 196, top - 8, 6, HOR - top + 8);
      g.fillStyle = hgrad(bx + 175, bx + 180, [[0, '#4a4a58'], [1, '#141418']]); g.fillRect(bx + 175, 62, 4, HOR - 62); g.fillRect(bx + 172, HOR - 6, 10, 6);
      g.beginPath(); g.moveTo(bx + 170, 64); g.lineTo(bx + 184, 64); g.lineTo(bx + 181, 57); g.lineTo(bx + 173, 57); g.closePath(); g.fillStyle = '#2a2a33'; g.fill();
    })]
  ],
  floor: ['sfl', HOR - 2, (x0, x1) => {
    g.fillStyle = vgrad(HOR - 2, FT - 4, [[0, '#5a5866'], [1, '#7a7888']]); g.fillRect(x0, HOR - 2, x1 - x0, FT - HOR - 2);
    g.strokeStyle = 'rgba(40,40,50,.6)'; g.lineWidth = 0.8; g.beginPath(); each(x0, x1, 32, 10, x => { g.moveTo(x, HOR - 2); g.lineTo(x - 4, FT - 4); }); g.moveTo(x0, 160); g.lineTo(x1, 160); g.stroke();
    speckle(x0, x1, HOR - 2, FT - 4, 3, 0.35, ['#4a4856', '#8a8898', '#6a6878'], 3);
    g.fillStyle = vgrad(FT - 4, FT + 1, [[0, '#c0bccc'], [0.4, '#8a8898'], [1, '#3a3842']]); g.fillRect(x0, FT - 4, x1 - x0, 5);
    g.fillStyle = vgrad(FT, H, [[0, '#1e1e26'], [1, '#34343e']]); g.fillRect(x0, FT, x1 - x0, H - FT);
    speckle(x0, x1, FT, H, 2, 0.5, ['#44444e', '#16161c', '#56565f', '#2a2a32'], 7);
    each(x0, x1, 150, 80, (x, k) => { if (hash(k + 31) < 0.5) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x + hash(k) * 60, FT + 10 + hash(k + 1) * 60, 30 + hash(k + 2) * 40, 10 + hash(k + 3) * 14); } });
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 0.6; each(x0, x1, 110, 40, (x, k) => { if (hash(k + 71) < 0.5) return; const y = FT + 16 + hash(k) * 70; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y + 3); g.lineTo(x + 14, y + 1); g.lineTo(x + 22, y + 5); g.stroke(); });
    each(x0, x1, 60, 40, x => { g.fillStyle = '#d8c040'; g.fillRect(x, 215, 32, 2.4); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(x, 215, 32, 0.6); });
    each(x0, x1, 520, 40, x => { g.beginPath(); g.ellipse(x + 200, 244, 15, 4.5, 0, 0, TAU); g.fillStyle = vgrad(240, 249, [[0, '#56565e'], [1, '#26262c']]); g.fill(); g.strokeStyle = '#141418'; g.lineWidth = 1; g.stroke(); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 0.5; g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(x + 200 + i * 5, 240.5); g.lineTo(x + 200 + i * 5, 247.5); } g.stroke(); });
    each(x0, x1, 300, 30, x => { g.fillStyle = '#101014'; g.fillRect(x + 90, FT, 18, 4); g.fillStyle = '#3a3a44'; for (let i = 0; i < 5; i++) g.fillRect(x + 91 + i * 3.5, FT + 0.5, 1.4, 3); });
    each(x0, x1, 340, 60, (x, k) => { const px = x + hash(k + 5) * 200, py = 190 + hash(k + 6) * 60; g.beginPath(); g.ellipse(px, py, 22 + hash(k) * 16, 4 + hash(k + 1) * 3, 0, 0, TAU); g.fillStyle = vgrad(py - 5, py + 5, [[0, '#2a3a6a'], [1, '#121830']]); g.fill(); g.fillStyle = 'rgba(180,200,255,.2)'; g.fillRect(px - 10, py - 1, 14, 0.8); });
  }],
  front(cam, t) {
    add(() => each(cam, cam + W, 200, 100, x => { const lx = x - cam + 177; softSpot(lx, FT + 4, 70, 14, '#ffe0a0', 0.3); g.fillStyle = vgrad(FT, H, [[0, 'rgba(255,220,150,.18)'], [1, 'rgba(255,220,150,0)']]); g.fillRect(lx - 3, FT, 6, H - FT); }));
    const names = ['ПИЦА', 'КИНО', 'ГАРАЖ', 'ХОТЕЛ', 'ЗАКУСКИ', 'МУЗИКА'], cols = ['#ff5af0', '#5af0ff', '#ffe05a', '#ff6a5a', '#7aff7a', '#b08aff'];
    each(cam, cam + W, 200, 200, (x, k) => {
      const i = ((k % 6) + 6) % 6, on = ((t >> 3) + k * 5) % 23 !== 0, sx = x - cam + 86;
      g.save(); if (on) { g.shadowColor = cols[i]; g.shadowBlur = 10; } txt(names[i], sx, HOR - 51.5, 8, on ? tone(cols[i], 45) : '#4a3a4a', 'center', FP, 0); g.restore();
      if (on) add(() => softSpot(sx, HOR - 52, 70, 14, cols[i], 0.25));
      add(() => glow(x - cam + 177, 62, 26, '#fff0c0', 0.8));
    });
  },
  over(cam, t) {
    add(() => each(cam, cam + W, 200, 100, x => { const lx = x - cam + 177; g.fillStyle = vgrad(62, FT, [[0, 'rgba(255,230,170,.2)'], [1, 'rgba(255,230,170,0)']]); g.beginPath(); g.moveTo(lx - 4, 62); g.lineTo(lx + 4, 62); g.lineTo(lx + 44, FT + 6); g.lineTo(lx - 44, FT + 6); g.closePath(); g.fill(); }));
  }
};
TH.sewer = {
  grade: ['#30ff90', 0.1],
  behind(cam, t) {
    g.fillStyle = '#020605'; g.fillRect(0, 0, W, HOR);
    add(() => each(cam, cam + W, 360, 200, (x, k) => { glow(x - cam + 110, 96, 44, '#6affc0', 0.25 + 0.05 * Math.sin(t * 0.05 + k)); softSpot(x - cam + 110, 132, 40, 8, '#6affc0', 0.2); }));
  },
  layers: [['sw', 1, 0, HOR - 3, (x0, x1) => {
    bricks(x0, x1, 0, HOR - 3, 20, 9, '#1f3d36', '#0c1a17', 21, 20);
    each(x0, x1, 70, 30, (x, k) => { const h = hash(k + 3); g.fillStyle = vgrad(40, HOR, [[0, 'rgba(0,0,0,0)'], [1, `rgba(0,0,0,${(0.2 + h * 0.3).toFixed(2)})`]]); g.fillRect(x + h * 40, 30 + h * 30, 3 + h * 6, HOR); });
    g.fillStyle = vgrad(HOR - 40, HOR - 3, [[0, 'rgba(60,140,60,0)'], [1, 'rgba(60,140,60,.45)']]); g.fillRect(x0, HOR - 40, x1 - x0, 37);
    each(x0, x1, 360, 200, (x) => {
      g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.moveTo(x + 62, HOR); g.lineTo(x + 62, 88); g.arc(x + 110, 88, 48, Math.PI, 0); g.lineTo(x + 158, HOR); g.fill(); g.restore();
      for (let i = 0; i <= 12; i++) { const a = Math.PI + i * Math.PI / 12, r0 = 48, r1 = 58; g.beginPath(); g.moveTo(x + 110 + Math.cos(a) * r0, 88 + Math.sin(a) * r0); g.lineTo(x + 110 + Math.cos(a) * r1, 88 + Math.sin(a) * r1); g.lineTo(x + 110 + Math.cos(a + Math.PI / 12) * r1, 88 + Math.sin(a + Math.PI / 12) * r1); g.lineTo(x + 110 + Math.cos(a + Math.PI / 12) * r0, 88 + Math.sin(a + Math.PI / 12) * r0); g.closePath(); g.fillStyle = tone('#3a5a50', Math.round((hash(i + x) - 0.5) * 20)); g.fill(); g.strokeStyle = '#0a1612'; g.lineWidth = 0.8; g.stroke(); }
      for (const s of [-1, 1]) { g.fillStyle = hgrad(x + 110 + s * 58 - 5, x + 110 + s * 58 + 5, [[0, '#2a4a42'], [1, '#122420']]); g.fillRect(x + 110 + s * 53 - (s > 0 ? 0 : 10), 88, 10, HOR - 88); }
      g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x + 214, 52, 26, 18); g.strokeStyle = '#4a5a52'; g.lineWidth = 1.2; g.strokeRect(x + 214, 52, 26, 18); g.beginPath(); for (let i = 1; i < 6; i++) { g.moveTo(x + 214 + i * 4.3, 52); g.lineTo(x + 214 + i * 4.3, 70); } g.stroke();
      capsule(x + 280, 20, x + 280, HOR - 16, 5, 5, '#4a5a52', 0); g.fillStyle = 'rgba(140,60,20,.5)'; g.fillRect(x + 276, 60, 8, 6); g.fillRect(x + 277, 100, 6, 10);
      rrect(x + 272, HOR - 22, 16, 8, 2); outlineFill(vgrad(HOR - 22, HOR - 14, [[0, '#6a7a72'], [1, '#2a3632']]), 1.4);
      g.fillStyle = '#0a1210'; g.beginPath(); g.ellipse(x + 280, HOR - 14.5, 5, 1.8, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(120,220,90,.6)'; g.fillRect(x + 278, HOR - 14, 4, 12);
    });
    capPath(x0 - 10, 26, x1 + 10, 26, 6, 6); outlineFill(cyl(x0, 26, x1, 26, 6, '#566a60', 0), 1.8);
    each(x0, x1, 90, 20, x => { rrect(x, 18.5, 7, 15, 1.5); outlineFill(hgrad(x, x + 7, [[0, '#8a9a90'], [1, '#3a4a42']]), 1.2); circ(x + 3.5, 20.5, 0.8, '#222', null); circ(x + 3.5, 31.5, 0.8, '#222', null); });
    each(x0, x1, 150, 20, (x, k) => { g.fillStyle = 'rgba(140,70,20,.45)'; g.fillRect(x + hash(k) * 80, 29, 10, 3); });
    g.fillStyle = vgrad(0, 14, [[0, '#000000'], [1, 'rgba(0,0,0,0)']]); g.fillRect(x0, 0, x1 - x0, 14);
  }]],
  mid(cam, t) {
    g.fillStyle = vgrad(HOR - 4, FT - 2, [[0, '#0c2a1e'], [1, '#1f5d3a']]); g.fillRect(0, HOR - 4, W, FT - HOR + 2);
    add(() => {
      g.strokeStyle = 'rgba(150,255,170,.3)'; g.lineWidth = 0.8; g.beginPath();
      for (let i = 0; i < 4; i++) { const y = HOR - 1 + i * 5; for (let x = -((cam * 1.1 + t * (0.5 + i * 0.15) + i * 23) % 36); x < W; x += 36) { g.moveTo(x, y); g.quadraticCurveTo(x + 9, y - 1.5, x + 18, y); } }
      g.stroke();
      each(cam, cam + W, 360, 200, x => softSpot(x - cam + 110, HOR + 6, 40, 5, '#8affc0', 0.3));
    });
    for (let i = 0; i < 4; i++) { const x = ((hash(i + 40) * 700 - cam - t * 0.3) % 700 + 700) % 700 - 60; g.fillStyle = ['#5a4a2a', '#3a3a3a', '#6a5a4a', '#2a4a2a'][i]; g.fillRect(x, HOR + 2 + i * 3, 6, 2); }
  },
  floor: ['sfl', FT - 6, (x0, x1) => {
    g.fillStyle = vgrad(FT - 6, FT, [[0, '#8a9a90'], [0.35, '#5a6a62'], [1, '#26302c']]); g.fillRect(x0, FT - 6, x1 - x0, 6);
    each(x0, x1, 28, 10, (x, k) => { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(x, FT - 6, 1, 6); });
    const rows = rowsFrom(FT, H + 2, 6);
    for (let r = 0; r < rows.length - 1; r++) {
      const ya = rows[r], yb = rows[r + 1], sw = 36 + r * 8, off = hash(r + 90) * sw;
      for (let k = Math.floor((x0 - off) / sw) - 1; k * sw + off < x1; k++) { const x = k * sw + off, c = tone('#46544e', Math.round((hash(r * 99 + k) - 0.5) * 22)); g.fillStyle = c; g.fillRect(x + 0.6, ya + 0.6, sw - 1.2, yb - ya - 1.2); g.fillStyle = 'rgba(255,255,255,.06)'; g.fillRect(x + 0.6, ya + 0.6, sw - 1.2, 1); }
    }
    speckle(x0, x1, FT, H, 3, 0.4, ['#2a3430', '#5a6a62', '#3a5a3a'], 13);
    g.fillStyle = 'rgba(60,120,60,.35)'; for (const y of rows) g.fillRect(x0, y - 0.6, x1 - x0, 1);
    each(x0, x1, 260, 60, (x, k) => { const px = x + hash(k + 5) * 160, py = 200 + hash(k + 6) * 50; g.beginPath(); g.ellipse(px, py, 20 + hash(k) * 14, 4 + hash(k + 1) * 3, 0, 0, TAU); g.fillStyle = vgrad(py - 5, py + 5, [[0, '#1a3a2a'], [1, '#0a1a12']]); g.fill(); g.fillStyle = 'rgba(160,255,190,.2)'; g.fillRect(px - 8, py - 1, 12, 0.8); });
    g.fillStyle = vgrad(FT, FT + 20, [[0, 'rgba(0,0,0,.45)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(x0, FT, x1 - x0, 20);
  }],
  front(cam, t) {
    each(cam, cam + W, 360, 60, (x, k) => { const sx = x - cam + 280, p = ((t * 1.4 + k * 17) % 26); g.fillStyle = 'rgba(140,240,110,.8)'; g.beginPath(); g.ellipse(sx, HOR - 6 + p * 0.8, 1.2, 2, 0, 0, TAU); g.fill(); });
  },
  over(cam, t) {
    add(() => each(cam, cam + W, 360, 120, (x, k) => {
      const sx = x - cam + 227; g.fillStyle = vgrad(60, H, [[0, 'rgba(180,255,220,.22)'], [1, 'rgba(180,255,220,0)']]);
      g.beginPath(); g.moveTo(sx - 12, 62); g.lineTo(sx + 12, 62); g.lineTo(sx + 70, H); g.lineTo(sx + 20, H); g.closePath(); g.fill();
      for (let i = 0; i < 8; i++) { const yy = 70 + ((t * 0.3 + i * 23) % 150); g.fillStyle = 'rgba(220,255,230,.6)'; g.fillRect(sx + (yy - 62) * 0.4 + hash(i + k) * 20 - 4, yy, 1, 1); }
    }));
    g.fillStyle = vgrad(HOR - 20, FT + 10, [[0, 'rgba(120,255,170,0)'], [0.5, 'rgba(120,255,170,.12)'], [1, 'rgba(120,255,170,0)']]); g.fillRect(0, HOR - 20, W, FT - HOR + 30);
  }
};
TH.site = {
  grade: ['#ff7a50', 0.12],
  behind(cam, t) {
    g.fillStyle = vgrad(0, HOR, [[0, '#2a1a5a'], [0.35, '#7a3a7a'], [0.7, '#e0704a'], [1, '#ffc070']]); g.fillRect(0, 0, W, HOR);
    const sx = W * 0.72 - cam * 0.02;
    add(() => { glow(sx, 106, 110, '#ff9a50', 0.5); glow(sx, 106, 40, '#ffe0a0', 0.8); });
    g.beginPath(); g.arc(sx, 106, 24, 0, TAU); g.fillStyle = vgrad(82, 130, [[0, '#fff0b0'], [1, '#ffa050']]); g.fill();
    for (let i = 0; i < 6; i++) {
      const cx = ((hash(i + 60) * 900 - cam * 0.06 + t * 0.04) % 700 + 700) % 700 - 110, cy = 20 + hash(i + 61) * 50, s = 0.7 + hash(i + 62) * 0.8;
      g.fillStyle = vgrad(cy - 12 * s, cy + 8 * s, [[0, 'rgba(255,190,200,.55)'], [1, 'rgba(255,120,90,.75)']]);
      g.beginPath(); for (const [ox, oy, r] of [[0, 0, 12], [14, -5, 10], [26, 0, 9], [-12, 2, 8], [10, 4, 11]]) { g.moveTo(cx + ox * s + r * s, cy + oy * s); g.arc(cx + ox * s, cy + oy * s, r * s, 0, TAU); } g.fill();
    }
  },
  layers: [
    ['cf', 0.1, 50, HOR - 48, (x0, x1) => each(x0, x1, 30, 60, (bx, k) => { const h = 20 + hash(300 + k) * 50, w = 22 + hash(k * 3 + 300) * 20; g.fillStyle = vgrad(HOR - h, HOR, [[0, '#7a3a70'], [1, '#4a2050']]); g.fillRect(bx, HOR - h, w, h + 2); g.fillStyle = 'rgba(255,210,140,.6)'; for (let wy = HOR - h + 4; wy < HOR - 3; wy += 6) for (let wx = bx + 3; wx < bx + w - 3; wx += 5) if (hash(k * 71 + wx + wy * 3) > 0.85) g.fillRect(wx, wy, 1.4, 2); })],
    ['cc', 0.25, 0, HOR + 2, (x0, x1) => each(x0, x1, 700, 300, x => {
      g.strokeStyle = '#3a1a3a'; g.lineWidth = 1.6; g.strokeRect(x + 100, 22, 12, HOR - 22); g.lineWidth = 0.9; g.beginPath(); for (let y = 22; y < HOR; y += 10) { g.moveTo(x + 100, y); g.lineTo(x + 112, y + 10); g.moveTo(x + 112, y); g.lineTo(x + 100, y + 10); } g.stroke();
      g.lineWidth = 1.6; g.beginPath(); g.moveTo(x + 40, 22); g.lineTo(x + 290, 22); g.moveTo(x + 40, 28); g.lineTo(x + 290, 28); g.moveTo(x + 106, 22); g.lineTo(x + 106, 6); g.lineTo(x + 40, 22); g.moveTo(x + 106, 6); g.lineTo(x + 290, 22); g.stroke();
      g.lineWidth = 0.7; g.beginPath(); for (let i = 40; i < 290; i += 8) { g.moveTo(x + i, 22); g.lineTo(x + i + 4, 28); } g.stroke();
      g.fillStyle = '#3a1a3a'; g.fillRect(x + 44, 28, 16, 12); seg(x + 250, 28, x + 250, 76, 0.4, '#3a1a3a'); g.fillRect(x + 244, 76, 12, 6);
    })],
    ['cg', 0.55, 20, HOR - 18, (x0, x1) => each(x0, x1, 240, 120, (x, k) => {
      const top = 34 + hash(k + 50) * 24, floors = 4, fh = (HOR - top) / floors;
      g.fillStyle = 'rgba(80,40,60,.35)'; g.fillRect(x, top, 96, HOR - top);
      for (let f = 0; f <= floors; f++) { const y = top + f * fh; g.fillStyle = vgrad(y - 2.5, y + 2.5, [[0, '#e06a3a'], [1, '#6a2410']]); g.fillRect(x - 4, y - 2.5, 104, 5); if (f < floors && hash(k * 7 + f) > 0.5) { g.fillStyle = 'rgba(120,110,130,.6)'; g.fillRect(x + 2, y + 3, 44, fh - 5); } }
      for (const cx of [0, 45, 90]) { g.fillStyle = hgrad(x + cx - 2.5, x + cx + 2.5, [[0, '#e06a3a'], [1, '#6a2410']]); g.fillRect(x + cx - 2.5, top, 5, HOR - top); }
      g.strokeStyle = '#8a3418'; g.lineWidth = 1.2; g.beginPath(); for (let f = 0; f < floors; f++) { const y = top + f * fh; g.moveTo(x + 45, y); g.lineTo(x + 90, y + fh); } g.stroke();
      g.fillStyle = '#3a1408'; for (let f = 0; f <= floors; f++) for (let i = 0; i < 12; i++) g.fillRect(x - 2 + i * 8.5, top + f * fh - 0.5, 1, 1);
    })],
    ['cn', 1, 88, HOR - 86, (x0, x1) => {
      each(x0, x1, 48, 20, (x, k) => {
        g.fillStyle = vgrad(100, HOR - 4, [[0, '#c8a070'], [1, '#8a6a44']]); g.fillRect(x + 1, 100, 46, HOR - 104);
        g.strokeStyle = 'rgba(90,60,30,.5)'; g.lineWidth = 0.5; g.beginPath(); for (let i = 0; i < 5; i++) { g.moveTo(x + 4, 106 + i * 9); g.bezierCurveTo(x + 16, 104 + i * 9, x + 30, 108 + i * 9, x + 44, 106 + i * 9); } g.stroke();
        g.fillStyle = hgrad(x - 1.5, x + 2, [[0, '#6a4a2a'], [1, '#3a2410']]); g.fillRect(x - 1.5, 96, 3.5, HOR - 94);
        if (k % 4 === 1) { g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(x + 24, 106); g.lineTo(x + 34, 124); g.lineTo(x + 14, 124); g.closePath(); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 1.2; g.stroke(); g.fillStyle = '#111'; g.fillRect(x + 23.3, 111, 1.4, 7); g.fillRect(x + 23.3, 120, 1.4, 1.6); g.font = 'bold 5px Arial'; g.textAlign = 'center'; g.fillText('ВНИМАНИЕ', x + 24, 130); }
      });
      each(x0, x1, 320, 120, (x, k) => {
        for (let r = 0; r < 3; r++) for (let i = 0; i < 4 - r; i++) { const cx = x + 180 + i * 9 + r * 4.5, cy = HOR - 5 - r * 8; g.beginPath(); g.arc(cx, cy, 4.3, 0, TAU); outlineFill(ball(cx, cy, 4.3, '#8a9aa8'), 1.2); circ(cx, cy, 2, '#2a2a30', null); }
        g.fillStyle = vgrad(HOR - 22, HOR - 2, [[0, '#b04a2a'], [1, '#6a2410']]); for (let r = 0; r < 4; r++) for (let i = 0; i < 4; i++) g.fillRect(x + 240 + i * 8 + (r % 2) * 3, HOR - 6 - r * 4.5, 7.3, 4);
        g.fillStyle = '#6a4a2a'; g.fillRect(x + 238, HOR - 2, 38, 3);
      });
    }]
  ],
  floor: ['cfl', HOR, (x0, x1) => {
    g.fillStyle = vgrad(HOR, H, [[0, '#6e5a44'], [1, '#9a8264']]); g.fillRect(x0, HOR, x1 - x0, H - HOR);
    each(x0, x1, 180, 90, (x, k) => { if (hash(k + 5) < 0.5) { const y = HOR + 20 + hash(k) * 60; g.fillStyle = vgrad(y, y + 30, [[0, '#b0a898'], [1, '#8a8274']]); g.fillRect(x + hash(k + 1) * 40, y, 90, 30); g.strokeStyle = 'rgba(60,50,40,.5)'; g.lineWidth = 0.6; g.strokeRect(x + hash(k + 1) * 40, y, 90, 30); g.beginPath(); g.moveTo(x + hash(k + 1) * 40 + 45, y); g.lineTo(x + hash(k + 1) * 40 + 45, y + 30); g.stroke(); } });
    speckle(x0, x1, HOR, H, 2, 0.55, ['#5a4a38', '#b8a888', '#7a6a52', '#4a3a2a', '#a09070'], 17);
    g.strokeStyle = 'rgba(50,38,26,.45)'; g.lineWidth = 3; for (const y of [212, 236]) { g.beginPath(); g.moveTo(x0, y); for (let x = x0; x <= x1; x += 16) g.lineTo(x, y + Math.sin(x * 0.02) * 3); g.stroke(); }
    each(x0, x1, 300, 80, (x, k) => { const px = x + hash(k + 3) * 200, py = 190 + hash(k + 4) * 60; g.beginPath(); g.ellipse(px, py, 24, 5, 0, 0, TAU); g.fillStyle = vgrad(py - 5, py + 5, [[0, '#e08a70'], [1, '#7a3a5a']]); g.fill(); g.strokeStyle = 'rgba(60,40,30,.5)'; g.lineWidth = 0.8; g.stroke(); });
    each(x0, x1, 230, 60, (x, k) => { const py = 180 + hash(k + 8) * 70; g.save(); g.translate(x + hash(k) * 100, py); g.rotate((hash(k + 1) - 0.5) * 0.3); g.fillStyle = vgrad(-2, 2, [[0, '#d8b080'], [1, '#8a6a40']]); g.fillRect(-20, -2, 40, 4); g.strokeStyle = '#4a3420'; g.lineWidth = 0.6; g.strokeRect(-20, -2, 40, 4); g.restore(); });
    g.fillStyle = vgrad(HOR, HOR + 24, [[0, 'rgba(40,20,30,.5)'], [1, 'rgba(40,20,30,0)']]); g.fillRect(x0, HOR, x1 - x0, 24);
  }],
  front() { },
  over(cam, t) {
    const sx = W * 0.72 - cam * 0.02;
    add(() => { for (const [k, r, a] of [[0.4, 8, 0.25], [0.8, 14, 0.15], [1.3, 5, 0.3]]) glow(sx + (W / 2 - sx) * k * 1.4, 106 + (H / 2 - 106) * k * 1.4, r, '#ffc080', a); });
    g.fillStyle = vgrad(H - 60, H, [[0, 'rgba(255,150,90,0)'], [1, 'rgba(255,150,90,.15)']]); g.fillRect(0, H - 60, W, 60);
  }
};
TH.docks = {
  grade: ['#3a70d0', 0.14],
  behind(cam, t) {
    g.fillStyle = vgrad(0, 92, [[0, '#040a1c'], [1, '#1f2f5a']]); g.fillRect(0, 0, W, 92);
    g.fillStyle = '#fff'; for (let i = 0; i < 60; i++) { g.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(G.t * 0.02 + i * 3)); g.fillRect(hash(77 + i) * W, hash(577 + i) * 70, 1, 1); } g.globalAlpha = 1;
    const mx = 110 - cam * 0.03;
    add(() => glow(mx, 38, 60, '#b8c8ff', 0.4)); g.beginPath(); g.arc(mx, 38, 14, 0, TAU); g.fillStyle = ball(mx, 38, 14, '#f4f0d8'); g.fill();
    g.fillStyle = vgrad(92, HOR, [[0, '#0a1e38'], [1, '#12304e']]); g.fillRect(0, 92, W, HOR - 92);
    add(() => {
      g.fillStyle = vgrad(92, HOR, [[0, 'rgba(230,230,200,.5)'], [1, 'rgba(230,230,200,.1)']]);
      for (let i = 0; i < 14; i++) { const y = 94 + i * 4, w = 18 - i * 0.6 + Math.sin(t * 0.08 + i * 1.7) * 5; g.fillRect(mx - w / 2 + Math.sin(t * 0.05 + i) * 3, y, w, 1.2); }
      g.strokeStyle = 'rgba(140,180,255,.25)'; g.lineWidth = 0.7; g.beginPath();
      for (let i = 0; i < 6; i++) { const y = 96 + i * 8; for (let x = -((cam * 0.2 + t * 0.3 + i * 17) % 40); x < W; x += 40) { g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 1.5, x + 20, y); } }
      g.stroke();
    });
  },
  layers: [
    ['df', 0.2, 40, HOR - 38, (x0, x1) => each(x0, x1, 600, 300, x => {
      g.fillStyle = '#0a1426'; g.beginPath(); g.moveTo(x + 30, 94); g.lineTo(x + 52, 110); g.lineTo(x + 250, 110); g.lineTo(x + 270, 90); g.closePath(); g.fill();
      g.fillRect(x + 190, 62, 50, 30); g.fillRect(x + 212, 46, 8, 16);
      for (let i = 0; i < 5; i++) { g.fillStyle = ['#8a2a2a', '#2a6a4a', '#2a4a8a'][i % 3]; g.globalAlpha = 0.5; g.fillRect(x + 60 + i * 24, 80, 22, 12); g.globalAlpha = 1; }
      g.fillStyle = '#ffd88a'; for (let i = 0; i < 6; i++) g.fillRect(x + 194 + i * 7, 68, 2, 2);
      g.strokeStyle = '#0a1426'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 380, 110); g.lineTo(x + 400, 50); g.lineTo(x + 420, 110); g.moveTo(x + 360, 52); g.lineTo(x + 480, 52); g.stroke();
      g.fillStyle = '#ff4040'; g.fillRect(x + 399, 46, 2, 2);
    })],
    ['dn', 1, 36, HOR - 34, (x0, x1) => each(x0, x1, 260, 200, (x, k) => {
      if (hash(k + 5) >= 0.28) {
        const cols = ['#b33a3a', '#2a8a5a', '#2a5a9a', '#c8801a', '#6a3a8a'];
        for (let j = 0; j < 2; j++) {
          if (j && hash(k + 99) < 0.45) break;
          const c = cols[Math.floor(hash(k * 7 + j) * 5)], y = HOR - 38 - j * 38, cx = x + j * 12, w = 116;
          g.fillStyle = vgrad(y, y + 38, [[0, tone(c, 18)], [1, tone(c, -38)]]); g.fillRect(cx, y, w, 38);
          for (let rx = cx + 4; rx < cx + w - 4; rx += 6) { g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(rx, y + 3, 2, 32); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(rx + 2.5, y + 3, 2, 32); }
          g.fillStyle = tone(c, -30); g.fillRect(cx, y, w, 3); g.fillRect(cx, y + 35, w, 3);
          g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(cx + w - 30, y + 4, 1.2, 30); g.fillRect(cx + w - 18, y + 4, 1.2, 30);
          g.fillStyle = 'rgba(140,60,20,.35)'; g.fillRect(cx + hash(k + j) * 80, y + 20, 14, 16);
          g.fillStyle = 'rgba(255,255,255,.55)'; g.font = 'bold 6px Arial'; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(['ЛОГ-7', 'ПРИСТАН', 'ТОВАР', 'КРАН-3'][(k + j + 8) % 4], cx + 8, y + 10);
          g.strokeStyle = OUT; g.lineWidth = 1; g.strokeRect(cx, y, w, 38);
        }
      }
      g.fillStyle = hgrad(x + 214, x + 219, [[0, '#4a4a58'], [1, '#141418']]); g.fillRect(x + 214, 56, 4, HOR - 56);
      g.fillStyle = '#2a2a33'; g.beginPath(); g.moveTo(x + 210, 58); g.lineTo(x + 222, 58); g.lineTo(x + 219, 51); g.lineTo(x + 213, 51); g.closePath(); g.fill();
    })]
  ],
  floor: ['dfl', HOR, (x0, x1) => {
    g.fillStyle = '#0a0806'; g.fillRect(x0, HOR, x1 - x0, H - HOR);
    planks(x0, x1, rowsFrom(HOR + 5, H + 2, 11), ['#6a5a48', '#5a4c3c', '#746250', '#4e4234'], 29, 'rgba(30,24,18,.4)');
    g.fillStyle = vgrad(HOR, HOR + 6, [[0, '#8a7a64'], [1, '#2a2218']]); g.fillRect(x0, HOR, x1 - x0, 6);
    each(x0, x1, 150, 20, x => { const bx = x + 40; g.beginPath(); g.moveTo(bx - 5, HOR + 5); g.lineTo(bx - 4, HOR - 5); g.quadraticCurveTo(bx, HOR - 9, bx + 4, HOR - 5); g.lineTo(bx + 5, HOR + 5); g.closePath(); outlineFill(hgrad(bx - 5, bx + 5, [[0, '#3a3a44'], [0.4, '#6a6a78'], [1, '#141418']]), 1.4); });
    each(x0, x1, 450, 60, (x, k) => { const cx = x + 200, cy = HOR + 30 + hash(k) * 30; for (let r = 7; r > 1; r -= 1.6) { g.beginPath(); g.ellipse(cx, cy, r * 1.6, r * 0.6, 0, 0, TAU); g.strokeStyle = OUT; g.lineWidth = 2.2; g.stroke(); g.strokeStyle = '#c8a870'; g.lineWidth = 1.4; g.stroke(); } });
    g.fillStyle = vgrad(HOR + 6, HOR + 30, [[0, 'rgba(0,0,0,.4)'], [1, 'rgba(0,0,0,0)']]); g.fillRect(x0, HOR + 6, x1 - x0, 24);
  }],
  front(cam, t) { add(() => each(cam, cam + W, 260, 100, x => { const lx = x - cam + 216; glow(lx, 56, 26, '#fff0c0', 0.8); softSpot(lx, HOR + 22, 70, 16, '#ffe0a0', 0.25); })); },
  over(cam, t) {
    for (let i = 0; i < 3; i++) { const y = 170 + i * 30, off = ((t * (0.2 + i * 0.1) - cam * 0.5) % 300 + 300) % 300; for (let x = -off; x < W; x += 300) softSpot(x + 150, y, 180, 16, '#a0b8e0', 0.12); }
  }
};
TH.tech = {
  grade: ['#b050ff', 0.12],
  behind(cam, t) {
    g.fillStyle = vgrad(0, HOR, [[0, '#0a0418'], [1, '#1a0a30']]); g.fillRect(0, 0, W, HOR);
    each(cam, cam + W, 400, 200, (x, k) => {
      const cx = x - cam + 200, p = 0.6 + 0.4 * Math.sin(t * 0.1 + k);
      add(() => { glow(cx, 70, 40, '#d060ff', 0.7 * p); glow(cx, 70, 14, '#ffffff', 0.8 * p); });
      g.strokeStyle = 'rgba(255,200,255,.6)'; g.lineWidth = 1; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(cx, 70, 8 + i * 5, t * 0.05 * (i + 1), t * 0.05 * (i + 1) + 2); g.stroke(); }
    });
  },
  layers: [['tw', 1, 0, HOR + 2, (x0, x1) => {
    for (let r = 0; r < 3; r++) each(x0, x1, 80, 10, (x, k) => {
      const y = 6 + r * 46, c = hash(k * 3 + r) > 0.8 ? '#2e2050' : '#241840';
      g.fillStyle = vgrad(y, y + 44, [[0, tone(c, 12)], [1, tone(c, -25)]]); g.fillRect(x + 1, y, 78, 44);
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x + 1, y, 78, 1.2); g.fillRect(x + 1, y, 1.2, 44); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x + 1, y + 42.8, 78, 1.2); g.fillRect(x + 77.8, y, 1.2, 44);
      for (const [rx, ry] of [[4, 4], [75, 4], [4, 40], [75, 40]]) circ(x + rx, y + ry, 0.9, '#5a4a80', null);
      if (hash(k * 5 + r) > 0.7) { g.fillStyle = '#0c0818'; for (let i = 0; i < 6; i++) g.fillRect(x + 14, y + 10 + i * 4.5, 52, 2); }
    });
    each(x0, x1, 400, 200, x => {
      g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x + 200, 70, 25, 0, TAU); g.fill(); g.restore();
      g.beginPath(); g.arc(x + 200, 70, 29, 0, TAU); g.arc(x + 200, 70, 25, 0, TAU, true); g.fillStyle = ball(x + 200, 70, 30, '#6a6a8a'); g.fill();
      g.strokeStyle = OUT; g.lineWidth = 1.2; g.beginPath(); g.arc(x + 200, 70, 29, 0, TAU); g.stroke(); g.beginPath(); g.arc(x + 200, 70, 25, 0, TAU); g.stroke();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; circ(x + 200 + Math.cos(a) * 27, 70 + Math.sin(a) * 27, 0.9, '#2a2a3a', null); }
    });
    each(x0, x1, 240, 60, (x, k) => { if (k % 2) return; rrect(x + 22, 58, 50, 30, 2); outlineFill('#050a14', 2); });
    for (const y of [51, 97]) { capPath(x0 - 10, y, x1 + 10, y, 2.6, 2.6); outlineFill(cyl(x0, y, x1, y, 2.6, '#4a4a6a', 0), 1.4); }
    g.fillStyle = vgrad(HOR - 8, HOR + 2, [[0, '#3a2a5a'], [1, '#0a0614']]); g.fillRect(x0, HOR - 8, x1 - x0, 10);
  }]],
  floor: ['tfl', HOR, (x0, x1) => {
    const rows = rowsFrom(HOR + 8, H + 2, 7);
    g.fillStyle = '#0a0614'; g.fillRect(x0, HOR, x1 - x0, H - HOR);
    for (let r = 0; r < rows.length - 1; r++) {
      const ya = rows[r], yb = rows[r + 1], sw = 44 + r * 6;
      for (let x = Math.floor(x0 / sw) * sw; x < x1; x += sw) {
        g.fillStyle = vgrad(ya, yb, [[0, '#2e2448'], [1, '#1a1230']]); g.fillRect(x + 0.8, ya + 0.8, sw - 1.6, yb - ya - 1.6);
        g.fillStyle = 'rgba(255,255,255,.09)'; g.fillRect(x + 0.8, ya + 0.8, sw - 1.6, 0.8);
        if (hash(r * 77 + Math.round(x)) > 0.8) { g.fillStyle = 'rgba(0,0,0,.4)'; for (let i = 2; i < sw - 2; i += 3) g.fillRect(x + i, ya + 2, 1.4, yb - ya - 4); }
      }
    }
    for (let x = Math.floor(x0 / 12) * 12; x < x1; x += 12) { g.fillStyle = '#e8c030'; g.beginPath(); g.moveTo(x, HOR + 7); g.lineTo(x + 6, HOR + 1); g.lineTo(x + 12, HOR + 1); g.lineTo(x + 6, HOR + 7); g.fill(); }
    g.fillStyle = '#1a1a1a'; g.fillRect(x0, HOR, x1 - x0, 1);
  }],
  front(cam, t) {
    add(() => {
      g.globalAlpha = 0.5; perspLines(cam, 50, 'rgba(80,240,255,.35)', HOR + 8); g.globalAlpha = 1;
      for (let i = 0; i < 3; i++) { const y = HOR + 20 + ((t * 0.8 + i * 40) % (H - HOR - 20)); g.fillStyle = vgrad(y - 3, y + 3, [[0, 'rgba(80,240,255,0)'], [0.5, 'rgba(80,240,255,.3)'], [1, 'rgba(80,240,255,0)']]); g.fillRect(0, y - 3, W, 6); }
    });
  },
  over(cam, t) {
    add(() => { for (const [y, c] of [[51, '#50f0ff'], [97, '#ff50dc']]) { const p = 0.5 + 0.5 * Math.sin(t * 0.08 + y); g.fillStyle = vgrad(y - 6, y + 6, [[0, rgba(c, 0)], [0.5, rgba(c, 0.35 * p)], [1, rgba(c, 0)]]); g.fillRect(0, y - 6, W, 12); } });
    each(cam, cam + W, 240, 60, (x, k) => {
      if (k % 2) return; const sx = x - cam + 24;
      g.save(); g.beginPath(); g.rect(sx, 60, 46, 26); g.clip();
      g.fillStyle = '#041a14'; g.fillRect(sx, 60, 46, 26);
      g.fillStyle = '#3af0a0'; for (let i = 0; i < 6; i++) g.fillRect(sx + 3, 62 + ((i * 5 + t * 0.3) % 30) - 2, 6 + hash(k + i + (t >> 4)) * 34, 1.6);
      g.fillStyle = 'rgba(255,255,255,.06)'; for (let y = 60; y < 86; y += 2) g.fillRect(sx, y, 46, 0.6);
      g.restore(); add(() => softSpot(sx + 23, 73, 40, 20, '#3af0a0', 0.2));
    });
  }
};
function drawBG(theme, cam) {
  const T = TH[theme], t = G.t;
  T.behind(cam, t);
  for (const [key, f, y0, h, draw] of T.layers) layerBlit(key, f, y0, h, cam, draw);
  if (T.mid) T.mid(cam, t);
  const [fk, fy, fdraw] = T.floor; layerBlit(fk, 1, fy, H - fy, cam, fdraw);
  T.front(cam, t);
}
function drawOver(theme, cam) {
  const T = TH[theme];
  T.over(cam, G.t);
  g.fillStyle = rgba(T.grade[0], T.grade[1] * 0.5); g.fillRect(0, 0, W, H);
  const v = g.createRadialGradient(W / 2, H * 0.55, H * 0.45, W / 2, H * 0.55, W * 0.72); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
}
const THUMBS = new Map();
function thumb(theme, cam) {
  const RS = Math.min(2, SC * DPR), k = theme + RS;
  let c = THUMBS.get(k);
  if (!c) {
    c = document.createElement('canvas'); c.width = Math.ceil(W * RS * 0.5); c.height = Math.ceil(H * RS * 0.5);
    const keep = g; g = c.getContext('2d'); g.setTransform(RS * 0.5, 0, 0, RS * 0.5, 0, 0);
    try { drawBG(theme, cam); drawOver(theme, cam); } catch (e) { console.error(e); }
    g = keep; THUMBS.set(k, c);
  }
  return c;
}
