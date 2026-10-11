// ---------------------------------------------------------------- рисуване: помощни
const TONES = new Map();
function tone(c, p) { if (!p) return c; const k = c + p; let v = TONES.get(k); if (v === undefined) { v = shade(c, p); TONES.set(k, v); } return v; }
function brighten(C) { const o = {}; for (const k in C) o[k] = typeof C[k] === 'string' && C[k][0] === '#' ? tone(C[k], 55) : C[k]; return o; }
function rgba(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }
function circ(x, y, r, fill, stroke = OUT, lw = 1.2) { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); } }
function ell(x, y, rx, ry, rot, fill, stroke = OUT, lw = 1.2) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); } }
function rrect(x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function seg(x1, y1, x2, y2, w, c) {
  g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = w + 2; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  g.strokeStyle = c; g.lineWidth = w; g.stroke();
}
function txt(s, x, y, size, col, align = 'center', font = FP, lw) {
  g.font = size + 'px ' + font; g.textAlign = align; g.textBaseline = 'middle';
  const w = lw !== undefined ? lw : Math.max(2, size * 0.32);
  if (w > 0) { g.lineJoin = 'round'; g.lineWidth = w; g.strokeStyle = '#0a0a0a'; g.strokeText(s, x, y); }
  g.fillStyle = col; g.fillText(s, x, y);
}
// светлините се рисуват от готова картинка за всеки цвят – много по-бързо от нов градиент всеки кадър
const GLOWS = new Map();
function glowSpr(col) {
  let c = GLOWS.get(col);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = 96; const x = c.getContext('2d');
    const gr = x.createRadialGradient(48, 48, 0, 48, 48, 48); gr.addColorStop(0, rgba(col, 1)); gr.addColorStop(0.4, rgba(col, 0.35)); gr.addColorStop(1, rgba(col, 0));
    x.fillStyle = gr; x.fillRect(0, 0, 96, 96); GLOWS.set(col, c);
  }
  return c;
}
function glow(x, y, r, col, a = 1) {
  if (!(a > 0) || !(r > 0)) return;
  const ga = g.globalAlpha; g.globalAlpha = ga * Math.min(1, a); g.drawImage(glowSpr(col), x - r, y - r, r * 2, r * 2); g.globalAlpha = ga;
}
function ball(x, y, r, col, dk = 0) {
  const gr = g.createRadialGradient(x + r * 0.25, y - r * 0.4, r * 0.1, x, y, r * 1.15);
  gr.addColorStop(0, tone(col, 42 - dk)); gr.addColorStop(0.55, tone(col, -dk)); gr.addColorStop(1, tone(col, -45 - dk));
  return gr;
}
function vgrad(y0, y1, stops) { const gr = g.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function hgrad(x0, x1, stops) { const gr = g.createLinearGradient(x0, 0, x1, 0); stops.forEach(([o, c]) => gr.addColorStop(o, c)); return gr; }
function outlineFill(fill, lw = 2.4) { g.lineJoin = 'round'; g.lineWidth = lw; g.strokeStyle = OUT; g.stroke(); g.fillStyle = fill; g.fill(); }

// ---------------------------------------------------------------- модели: крайници
function capPath(x1, y1, x2, y2, r1, r2) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  g.beginPath(); g.arc(x1, y1, r1, a + Math.PI / 2, a + Math.PI * 1.5); g.arc(x2, y2, r2, a - Math.PI / 2, a + Math.PI / 2); g.closePath();
}
function cyl(x1, y1, x2, y2, r, col, dk = 0) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1; let nx = -dy / L, ny = dx / L;
  if (ny > 0 || (ny === 0 && nx < 0)) { nx = -nx; ny = -ny; }
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, gr = g.createLinearGradient(mx + nx * r, my + ny * r, mx - nx * r, my - ny * r);
  gr.addColorStop(0, tone(col, 45 - dk * 2)); gr.addColorStop(0.3, tone(col, -dk)); gr.addColorStop(0.75, tone(col, -26 - dk)); gr.addColorStop(1, tone(col, -50 - dk));
  return gr;
}
function capsule(x1, y1, x2, y2, r1, r2, col, dk) { capPath(x1, y1, x2, y2, r1, r2); outlineFill(cyl(x1, y1, x2, y2, Math.max(r1, r2), col, dk)); }
function limb(x, y, a1, l1, a2, l2, r0, r1, r2, col, dk) {
  const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1, fx = kx + Math.sin(a2) * l2, fy = ky + Math.cos(a2) * l2;
  g.lineWidth = 2.4; g.strokeStyle = OUT; g.lineJoin = 'round';
  capPath(x, y, kx, ky, r0, r1); g.stroke(); capPath(kx, ky, fx, fy, r1 * 0.94, r2); g.stroke();
  capPath(x, y, kx, ky, r0, r1); g.fillStyle = cyl(x, y, kx, ky, r0, col, dk); g.fill();
  capPath(kx, ky, fx, fy, r1 * 0.94, r2); g.fillStyle = cyl(kx, ky, fx, fy, r1, col, dk); g.fill();
  return [kx, ky, fx, fy];
}
function wrapBand(L, t0, t1, r, col, dk) {
  const x1 = lerp(L[0], L[2], t0), y1 = lerp(L[1], L[3], t0), x2 = lerp(L[0], L[2], t1), y2 = lerp(L[1], L[3], t1);
  capPath(x1, y1, x2, y2, r, r); g.lineWidth = 1.6; g.strokeStyle = OUT; g.stroke(); g.fillStyle = cyl(x1, y1, x2, y2, r, col, dk); g.fill();
}
function foot(x, y, a2, len, h, col, dk, toes) {
  g.save(); g.translate(x, y); g.rotate(-a2);
  g.beginPath(); g.moveTo(-h * 0.7, -h * 0.7); g.lineTo(len * 0.5, -h * 0.8); g.quadraticCurveTo(len + 1, -h * 0.55, len, h * 0.45); g.lineTo(-h * 0.8, h * 0.45); g.quadraticCurveTo(-h * 1.15, 0, -h * 0.7, -h * 0.7); g.closePath();
  outlineFill(vgrad(-h, h, [[0, tone(col, 35 - dk)], [0.5, tone(col, -dk)], [1, tone(col, -45 - dk)]]), 2.2);
  if (toes === 2) { g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(len * 0.6, -h * 0.75); g.lineTo(len * 0.68, -h * 0.05); g.stroke(); }
  else if (toes) { g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(len * 0.6, -h * 0.25); g.lineTo(len * 0.97, -h * 0.1); g.moveTo(len * 0.58, h * 0.15); g.lineTo(len * 0.95, h * 0.2); g.stroke(); }
  g.restore();
}
function fist(x, y, r, col, dk, ang) {
  g.beginPath(); g.arc(x, y, r, 0, TAU); outlineFill(ball(x, y, r, col, dk), 2);
  const dx = Math.sin(ang), dy = Math.cos(ang), px = dy, py = -dx;
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.5; g.beginPath();
  for (const o of [-0.35, 0.2]) { g.moveTo(x + px * r * o + dx * r * 0.15, y + py * r * o + dy * r * 0.15); g.lineTo(x + px * r * o + dx * r * 0.85, y + py * r * o + dy * r * 0.85); }
  g.stroke();
}
function pad(x, y, r, col, dk) { g.beginPath(); g.ellipse(x, y, r, r * 0.85, 0, 0, TAU); outlineFill(ball(x, y, r, col, dk), 1.8); }
function torsoPath(shY, hipY, sw, ww, cx = 0) {
  g.beginPath(); g.moveTo(cx - sw / 2, shY + 3); g.quadraticCurveTo(cx - sw / 2, shY - 1.5, cx - sw / 2 + 4, shY - 1.5); g.lineTo(cx + sw / 2 - 4, shY - 1.5);
  g.quadraticCurveTo(cx + sw / 2, shY - 1.5, cx + sw / 2, shY + 3); g.quadraticCurveTo(cx + ww / 2 + 1, (shY + hipY) / 2, cx + ww / 2, hipY + 1);
  g.quadraticCurveTo(cx, hipY + 3.5, cx - ww / 2, hipY + 1); g.quadraticCurveTo(cx - ww / 2 - 1, (shY + hipY) / 2, cx - sw / 2, shY + 3); g.closePath();
}
function bodyGrad(sw, shY, hipY, col, dk = 0) {
  const gr = g.createLinearGradient(sw / 2, shY, -sw / 2, hipY);
  gr.addColorStop(0, tone(col, 35 - dk)); gr.addColorStop(0.45, tone(col, -dk)); gr.addColorStop(1, tone(col, -45 - dk)); return gr;
}

// ---------------------------------------------------------------- модели: оръжия
function weapon(type, hx, hy, a, t) {
  if (!type) return;
  const dx = Math.sin(a), dy = Math.cos(a), px = dy, py = -dx, P = n => [hx + dx * n, hy + dy * n];
  const steel = (x0, y0, w) => { const gr = g.createLinearGradient(x0 + px * w, y0 + py * w, x0 - px * w, y0 - py * w); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#dfe8f0'); gr.addColorStop(0.6, '#9aa8b8'); gr.addColorStop(1, '#5d6878'); return gr; };
  switch (type) {
    case 'katana': case 'sword': case 'bigsword': {
      const len = type === 'katana' ? 23 : type === 'sword' ? 18 : 33, bw = type === 'bigsword' ? 1.7 : 1.2;
      const [a0x, a0y] = P(-5), [a1x, a1y] = P(2.5);
      capsule(a0x, a0y, a1x, a1y, 1.3, 1.3, '#2a1c14', 0);
      g.strokeStyle = '#c9a24a'; g.lineWidth = 0.45; g.beginPath();
      for (let i = -4.2; i < 2; i += 1.4) { const [x, y] = P(i); g.moveTo(x + px, y + py); g.lineTo(x - px + dx * 0.9, y - py + dy * 0.9); }
      g.stroke();
      const [tx, ty] = P(3); ell(tx, ty, 0.9, 3.2, Math.atan2(dy, dx), '#d8b040', OUT, 0.8);
      const [b0x, b0y] = P(3.6), [b1x, b1y] = P(len), [mx, my] = P(len * 0.6);
      g.beginPath(); g.moveTo(b0x + px * bw, b0y + py * bw); g.lineTo(mx + px * bw * 0.9, my + py * bw * 0.9); g.quadraticCurveTo(b1x + px * bw * 0.6, b1y + py * bw * 0.6, b1x, b1y);
      g.lineTo(mx - px * bw, my - py * bw); g.lineTo(b0x - px * bw, b0y - py * bw); g.closePath();
      outlineFill(steel(mx, my, bw), 1.4);
      g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(b0x + px * bw * 0.4, b0y + py * bw * 0.4); g.lineTo(mx + px * bw * 0.35, my + py * bw * 0.35); g.stroke();
      break;
    }
    case 'sai': {
      const [a0x, a0y] = P(-4), [a1x, a1y] = P(1);
      capsule(a0x, a0y, a1x, a1y, 1.2, 1.2, '#a0302a', 0);
      const [cx, cy] = P(1.2), [fx, fy] = P(5.5);
      g.lineCap = 'round';
      for (const w of [2.4, 1.1]) {
        g.strokeStyle = w > 2 ? OUT : '#c9d2dc'; g.lineWidth = w; g.beginPath();
        g.moveTo(fx + px * 3.2, fy + py * 3.2); g.quadraticCurveTo(cx + px * 3.6, cy + py * 3.6, cx, cy); g.quadraticCurveTo(cx - px * 3.6, cy - py * 3.6, fx - px * 3.2, fy - py * 3.2); g.stroke();
      }
      const [b1x, b1y] = P(15), [mx, my] = P(8);
      g.beginPath(); g.moveTo(cx + px * 0.9, cy + py * 0.9); g.lineTo(b1x, b1y); g.lineTo(cx - px * 0.9, cy - py * 0.9); g.closePath(); outlineFill(steel(mx, my, 0.9), 1.3);
      break;
    }
    case 'bo': {
      const [x0, y0] = P(-22), [x1, y1] = P(25);
      capsule(x0, y0, x1, y1, 1.35, 1.35, '#a8743a', 0);
      for (const n of [-3, 3, -20, 23]) { const [x, y] = P(n); const [x2, y2] = P(n + 1.6); capPath(x, y, x2, y2, 1.55, 1.55); g.fillStyle = cyl(x, y, x2, y2, 1.55, '#5a3a1a', 0); g.fill(); }
      break;
    }
    case 'nunchaku': {
      const [x0, y0] = P(-1), [x1, y1] = P(9);
      capsule(x0, y0, x1, y1, 1.35, 1.25, '#7a4a22', 0);
      const a2 = a + Math.sin(t * 0.45) * 1.1 + 0.4, ex = Math.sin(a2), ey = Math.cos(a2), cx = x1 + ex * 3.4, cy = y1 + ey * 3.4;
      g.fillStyle = '#c8c8d0'; for (let i = 0.5; i < 3.4; i += 0.9) { g.beginPath(); g.arc(lerp(x1, cx, i / 3.4), lerp(y1, cy, i / 3.4), 0.45, 0, TAU); g.fill(); }
      capsule(cx, cy, cx + ex * 10, cy + ey * 10, 1.25, 1.35, '#7a4a22', 0);
      break;
    }
    case 'gun': case 'biggun': {
      const big = type === 'biggun';
      g.save(); g.translate(hx, hy); g.rotate(Math.atan2(dy, dx)); if (big) g.scale(1.5, 1.5);
      rrect(-3, -2, 13, 4, 1.2); outlineFill(vgrad(-2, 2, [[0, '#8a93a0'], [0.5, '#4a505a'], [1, '#22262c']]), 1.8);
      rrect(9, -1.1, 7, 2.2, 0.8); outlineFill(vgrad(-1, 1, [[0, '#9aa3ad'], [1, '#3a3f48']]), 1.4);
      rrect(-1, 1.5, 3, 4, 1); outlineFill('#2a2d33', 1.4);
      if (big) { g.beginPath(); g.arc(3, 3, 3, 0, TAU); outlineFill(ball(3, 3, 3, '#5a5a66'), 1.4); }
      g.globalCompositeOperation = 'lighter'; glow(16.5, 0, 4, '#ff3a3a', 0.9); g.globalCompositeOperation = 'source-over';
      g.restore();
      break;
    }
    case 'club': { // тежка тояга с метални шипове
      const [h0x, h0y] = P(-4), [h1x, h1y] = P(6); capsule(h0x, h0y, h1x, h1y, 1.4, 1.4, '#3a2a1a', 0);
      const [c0x, c0y] = P(5), [c1x, c1y] = P(31); capsule(c0x, c0y, c1x, c1y, 2.2, 3.6, '#5a4a40', 0);
      for (let n = 9; n < 30; n += 3.4) for (const o of [-1, 1]) { const [x, y] = P(n), w = lerp(2.2, 3.6, (n - 5) / 26) * 0.7; circ(x + px * o * w, y + py * o * w, 0.65, '#d0d4dc', OUT, 0.35); }
      break;
    }
    case 'kusari': { // сърп; веригата се рисува отделно
      const [h0x, h0y] = P(-3), [h1x, h1y] = P(6); capsule(h0x, h0y, h1x, h1y, 1.1, 1.1, '#5a3a1a', 0);
      const [bx, by] = P(5.5);
      g.beginPath(); g.moveTo(bx, by); g.quadraticCurveTo(bx + px * 5 + dx * 3, by + py * 5 + dy * 3, bx + px * 9 - dx, by + py * 9 - dy); g.quadraticCurveTo(bx + px * 4 + dx * 1.2, by + py * 4 + dy * 1.2, bx - dx * 0.8, by - dy * 0.8); g.closePath();
      outlineFill(steel(bx + px * 4, by + py * 4, 1.2), 1.1);
      break;
    }
    case 'claws':
      for (const o of [-0.3, 0, 0.3]) {
        const b = a + o, ex = Math.sin(b), ey = Math.cos(b), qx = ey, qy = -ex;
        g.beginPath(); g.moveTo(hx + qx * 0.8, hy + qy * 0.8); g.lineTo(hx + ex * 14, hy + ey * 14); g.lineTo(hx - qx * 0.8, hy - qy * 0.8); g.closePath();
        outlineFill(steel(hx + ex * 6, hy + ey * 6, 0.8), 1.2);
      }
      break;
  }
}
function swoosh(cx, cy, r, a0, a1, col) {
  const t0 = Math.PI / 2 - a0, t1 = Math.PI / 2 - a1, acw = a1 > a0;
  g.save(); g.globalCompositeOperation = 'lighter';
  g.beginPath(); g.arc(cx, cy, r + 2.5, t0, t1, acw); g.arc(cx, cy, Math.max(1, r - 6), t1, t0, !acw); g.closePath();
  const gr = g.createRadialGradient(cx, cy, Math.max(0, r - 7), cx, cy, r + 3);
  gr.addColorStop(0, rgba(col, 0)); gr.addColorStop(0.65, rgba(col, 0.3)); gr.addColorStop(1, rgba(col, 0.85));
  g.fillStyle = gr; g.fill(); g.restore();
}

// ---------------------------------------------------------------- модели: глави
// ex – изражение: calm, scowl, smart, grin, angry, yell, ouch, blink; tr – коя костенурка (лунички, зъби...)
function headTurtle(x, y, r, C, t, ex = 'calm', tr = '', wind = 0) {
  const tw = Math.sin(t * 0.22) * (1.8 + wind), tw2 = Math.sin(t * 0.22 + 1.2) * (1.8 + wind), tl = 1 + wind * 0.35;
  // опашки на превръзката – при бягане и скок се развяват повече
  for (const [ex0, ey0, w, ph] of [[-r - 9 * tl, 2 + tw - wind * 2, 1.8, tw], [-r - 7.5 * tl, 7 - tw2 - wind * 2.5, 1.5, tw2]]) {
    const kx = x - r * 0.75, ky = y - 1.2;
    g.beginPath(); g.moveTo(kx, ky - w); g.quadraticCurveTo(x - r - 3, y - 3 + ph * 0.6, x + ex0, y + ey0 - w * 0.3);
    g.lineTo(x + ex0 - 0.6, y + ey0 + w * 0.9); g.quadraticCurveTo(x - r - 3, y - 0.5 + ph * 0.6, kx, ky + w); g.closePath();
    outlineFill(vgrad(y - 4, y + 8, [[0, tone(C.band, 30)], [1, tone(C.band, -35)]]), 1.8);
    g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(kx - 1, ky); g.quadraticCurveTo(x - r - 3, y - 1.8 + ph * 0.6, x + ex0 - 0.3, y + ey0 + w * 0.3); g.stroke();
  }
  g.beginPath(); g.arc(x - r * 0.78, y - 1.2, 1.9, 0, TAU); outlineFill(ball(x - r * 0.78, y - 1.2, 1.9, C.band), 1.5);
  // глава + муцуна
  const headPath = () => { g.beginPath(); g.ellipse(x + 0.6, y - 0.3, r * 1.02, r * 0.93, 0, 0, TAU); g.ellipse(x + r * 0.62, y + r * 0.34, r * 0.62, r * 0.5, 0.1, 0, TAU); };
  headPath(); g.lineWidth = 2.4; g.strokeStyle = OUT; g.stroke();
  headPath(); g.fillStyle = ball(x + 1, y, r * 1.05, C.skin); g.fill();
  g.save(); headPath(); g.clip();
  // превръзка с „вежди“
  g.beginPath(); g.moveTo(x - r * 1.2, y - r * 0.5); g.lineTo(x + r * 0.2, y - r * 0.48); g.lineTo(x + r * 0.42, y - r * 0.3); g.lineTo(x + r * 0.62, y - r * 0.52); g.lineTo(x + r * 1.4, y - r * 0.55);
  g.lineTo(x + r * 1.4, y + r * 0.1); g.lineTo(x - r * 1.2, y + r * 0.12); g.closePath();
  g.fillStyle = vgrad(y - r * 0.55, y + r * 0.12, [[0, tone(C.band, 30)], [0.5, C.band], [1, tone(C.band, -40)]]); g.fill();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - r * 1.2, y + r * 0.12); g.lineTo(x + r * 1.4, y + r * 0.1); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(x - r * 1.1, y - r * 0.42); g.lineTo(x + r * 0.15, y - r * 0.4); g.stroke();
  // гънки на превръзката до възела
  g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 0.45; g.beginPath();
  for (const o of [-0.3, 0, 0.3]) { g.moveTo(x - r * 0.62, y - r * 0.2 + o * r * 0.5); g.lineTo(x - r * 0.3, y - r * 0.2 + o * r * 0.35); }
  g.stroke();
  // бузи в сянка отдолу, отблясък на темето
  g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.ellipse(x + 1, y + r * 0.95, r * 1.1, r * 0.35, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.ellipse(x - r * 0.15, y - r * 0.72, r * 0.45, r * 0.16, -0.2, 0, TAU); g.fill();
  if (tr === 'mik') { g.fillStyle = 'rgba(70,110,30,.55)'; for (const [fx, fy] of [[0.3, 0.3], [0.45, 0.38], [0.36, 0.48], [0.95, 0.12]]) { g.beginPath(); g.arc(x + r * fx, y + r * fy, 0.42, 0, TAU); g.fill(); } }
  g.restore();
  // очи
  const ang = ex === 'angry' || ex === 'yell' || ex === 'scowl', cx = x + r * 0.4;
  for (const [ox, s] of [[r * 0.68, 1], [r * 0.12, 0.85]]) {
    const exx = x + ox, eyy = y - r * 0.2, inner = exx < cx ? 1 : -1;
    if (ex === 'blink') { g.strokeStyle = OUT; g.lineWidth = 0.7; g.beginPath(); g.moveTo(exx - 1.5 * s, eyy); g.quadraticCurveTo(exx, eyy + 0.9 * s, exx + 1.5 * s, eyy); g.stroke(); continue; }
    if (ex === 'ouch') { g.strokeStyle = OUT; g.lineWidth = 0.75; g.lineCap = 'round'; g.beginPath(); g.moveTo(exx - inner * 1.3 * s, eyy - 1 * s); g.lineTo(exx + inner * 0.9 * s, eyy); g.lineTo(exx - inner * 1.3 * s, eyy + 1 * s); g.stroke(); continue; }
    g.beginPath(); g.ellipse(exx, eyy, 1.55 * s, 1.15 * s, -0.15, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 0.6; g.strokeStyle = OUT; g.stroke();
    circ(exx + 0.45 * s, y - r * 0.18 + (ex === 'smart' ? -0.15 : 0), 0.62 * s, '#101010', null);
    circ(exx + 0.2 * s, y - r * 0.28, 0.25 * s, '#fff', null);
    if (ang) { // спуснат клепач към носа – ядосан поглед
      const yi = eyy - (ex === 'scowl' ? 0.35 : 0.1) * s, yo = eyy - 1.3 * s;
      g.beginPath(); g.moveTo(exx - 1.9 * s, eyy - 2 * s); g.lineTo(exx + 1.9 * s, eyy - 2 * s);
      g.lineTo(exx + 1.9 * s, inner > 0 ? yi : yo); g.lineTo(exx - 1.9 * s, inner > 0 ? yo : yi); g.closePath();
      g.fillStyle = tone(C.band, -10); g.fill();
      g.strokeStyle = OUT; g.lineWidth = 0.7; g.beginPath(); g.moveTo(exx + 1.7 * s, inner > 0 ? yi : yo); g.lineTo(exx - 1.7 * s, inner > 0 ? yo : yi); g.stroke();
    } else if (ex === 'grin') { // весели очи – долният клепач се вдига
      g.strokeStyle = tone(C.band, -30); g.lineWidth = 0.6; g.beginPath(); g.arc(exx, eyy + 1.4 * s, 1.5 * s, -2.4, -0.7); g.stroke();
    }
  }
  // уста
  const mx0 = x + r * 0.25, my0 = y + r * 0.5, mx1 = x + r * 1.13, my1 = y + r * 0.34;
  g.strokeStyle = OUT; g.lineWidth = 0.8; g.lineCap = 'round'; g.lineJoin = 'round';
  if (ex === 'yell') {
    g.beginPath(); g.moveTo(mx0, my0 - 0.4); g.quadraticCurveTo(x + r * 0.7, y + r * 0.42, mx1, my1); g.quadraticCurveTo(x + r * 0.95, y + r * 1.05, x + r * 0.5, y + r * 0.95); g.closePath();
    g.fillStyle = '#5a1418'; g.fill(); g.stroke();
    g.save(); g.clip(); g.fillStyle = '#fff'; g.fillRect(mx0, my0 - 1.6, r, 1.5); g.fillStyle = '#e86a6a'; g.beginPath(); g.ellipse(x + r * 0.7, y + r * 0.98, r * 0.3, r * 0.17, 0, 0, TAU); g.fill(); g.restore();
  } else if (ex === 'grin') {
    g.beginPath(); g.moveTo(mx0 - 0.4, my0 - 0.8); g.quadraticCurveTo(x + r * 0.7, y + r * 0.5, mx1 + 0.2, my1 - 0.6); g.quadraticCurveTo(x + r * 0.85, y + r * 1.0, mx0 - 0.4, my0 - 0.8); g.closePath();
    g.fillStyle = '#fff'; g.fill(); g.stroke();
    g.lineWidth = 0.4; g.beginPath(); g.moveTo(mx0 + 0.6, my0 - 0.3); g.quadraticCurveTo(x + r * 0.7, y + r * 0.7, mx1 - 0.3, my1 - 0.2); g.stroke();
  } else if (ex === 'ouch') {
    g.beginPath(); g.moveTo(mx0, my0); for (let i = 1; i <= 5; i++) g.lineTo(lerp(mx0, mx1, i / 5), lerp(my0, my1, i / 5) + (i % 2 ? 0.9 : -0.3)); g.stroke();
  } else if (ex === 'scowl' || ex === 'angry') {
    g.beginPath(); g.moveTo(mx0 + 0.5, my0 + 0.4); g.quadraticCurveTo(x + r * 0.75, y + r * 0.5, mx1, my1 + 0.6); g.stroke();
    g.lineWidth = 0.5; g.beginPath(); g.moveTo(mx0 + 0.5, my0 + 0.4); g.lineTo(mx0 + 0.1, my0 + 1.1); g.stroke();
  } else {
    g.beginPath(); g.moveTo(mx0, my0); g.quadraticCurveTo(x + r * 0.8, y + r * 0.72, mx1, my1); g.stroke();
    if (ex === 'smart' || tr === 'don') { g.fillStyle = '#fff'; g.lineWidth = 0.4; for (const o of [0.72, 0.86]) { g.beginPath(); g.rect(x + r * o, y + r * 0.56 - (o - 0.72) * 1.4, r * 0.11, 1.3); g.fill(); g.stroke(); } }
  }
  circ(x + r * 1.08, y + r * 0.05, 0.35, '#1a3a12', null);
}
function headNinja(x, y, r, C, t, d = {}) {
  const tw = Math.sin(t * 0.2) * 1.5;
  if (d.hair) { // опашка от коса
    const hw = Math.sin(t * 0.17) * 2;
    g.beginPath(); g.moveTo(x - r * 0.3, y - r * 0.95); g.quadraticCurveTo(x - r * 1.6, y - r * 1.5 + hw, x - r * 2.3, y + 1 + hw); g.quadraticCurveTo(x - r * 1.5, y - r * 0.3 + hw, x - r * 0.75, y - r * 0.35); g.closePath();
    outlineFill(vgrad(y - r * 1.5, y + 2, [[0, '#3a3040'], [1, '#0e0a12']]), 1.6);
    rrect(x - r * 0.75, y - r * 1.05, 3, 2.4, 0.8); outlineFill('#c9a24a', 1);
  }
  g.beginPath(); g.moveTo(x - r * 0.8, y - 2.4); g.quadraticCurveTo(x - r - 3, y - 2 + tw, x - r - 6, y + 1 + tw); g.lineTo(x - r - 5.5, y + 2.6 + tw); g.quadraticCurveTo(x - r - 2, y + tw, x - r * 0.8, y - 0.6); g.closePath();
  outlineFill(tone(C.suit, -20), 1.6);
  g.beginPath(); g.arc(x, y, r, 0, TAU); outlineFill(ball(x, y, r, C.suit));
  g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
  // процеп за очите и гънки на качулката
  g.fillStyle = vgrad(y - 3, y + 1.5, [[0, tone(C.mask, 20)], [1, tone(C.mask, -30)]]); g.fillRect(x - r * 0.15, y - 2.9, r * 1.3, 3.9);
  g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x - r, y + r * 0.45, r * 2, r);
  g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 0.5; g.beginPath();
  g.moveTo(x - r * 0.9, y - r * 0.2); g.quadraticCurveTo(x - r * 0.4, y + r * 0.1, x - r * 0.2, y + r * 0.8);
  g.moveTo(x + r * 0.1, y + r * 0.35); g.quadraticCurveTo(x + r * 0.5, y + r * 0.55, x + r * 0.95, y + r * 0.4); g.stroke();
  g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(x - r * 0.2, y - r * 0.62, r * 0.45, r * 0.18, -0.3, 0, TAU); g.fill();
  g.restore();
  // присвити очи
  for (const [ox, s] of [[r * 0.58, 1], [r * 0.1, 0.8]]) {
    g.beginPath(); g.moveTo(x + ox - 1.5 * s, y - 1.6 * s); g.lineTo(x + ox + 1.6 * s, y - 0.7 * s); g.quadraticCurveTo(x + ox + 0.2, y + 0.2 * s, x + ox - 1.5 * s, y - 0.5 * s); g.closePath();
    g.fillStyle = '#fff'; g.fill();
    circ(x + ox + 0.35 * s, y - 0.8 * s, 0.45 * s, '#111', null);
  }
  // челна плочка с отличителния знак (ромб – измислен знак)
  if (d.plate) {
    rrect(x - r * 0.2, y - r * 0.95, r * 1.05, r * 0.42, 0.8); outlineFill(hgrad(x - r * 0.2, x + r * 0.85, [[0, '#e8ecf2'], [0.5, '#9aa4b2'], [1, '#5a6270']]), 1.1);
    g.fillStyle = '#b02a2a'; g.beginPath(); g.moveTo(x + r * 0.33, y - r * 0.92); g.lineTo(x + r * 0.45, y - r * 0.74); g.lineTo(x + r * 0.33, y - r * 0.56); g.lineTo(x + r * 0.21, y - r * 0.74); g.closePath(); g.fill();
  }
}
function headBrute(x, y, r, C, t) {
  // шлем с рога и желязна маска със светещи очи
  for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s * 2 - 1, y - r * 0.7); g.quadraticCurveTo(x + s * r * 1.3, y - r * 1.2, x + s * r * 1.15, y - r * 2.1); g.quadraticCurveTo(x + s * r * 0.75, y - r * 1.25, x + s * 2 + 1.5, y - r * 0.45); g.closePath(); outlineFill(hgrad(x, x + s * r * 1.3, [[0, '#f0e6c8'], [1, '#a89a70']]), 1.3); }
  g.beginPath(); g.arc(x, y, r, 0, TAU); outlineFill(ball(x, y, r, tone(C.suit, -10)));
  g.beginPath(); g.arc(x, y - 0.6, r + 1.2, Math.PI * 1.02, -0.02); g.lineTo(x + r + 2, y + 0.8); g.lineTo(x - r - 2.4, y + 1.2); g.closePath();
  outlineFill(ball(x, y - 3, r + 2, '#4a4f5a'), 1.8);
  g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 0.6; g.beginPath(); g.arc(x, y - 0.6, r - 0.2, Math.PI + 0.4, -0.5); g.stroke();
  g.fillStyle = '#c42b2b'; for (let i = -2; i <= 2; i++) g.fillRect(x + i * 2.2 - 0.4, y - r - 0.4, 0.8, 1.4);
  rrect(x - 0.5, y - 0.6, r + 1.6, r * 0.9, 1.6); outlineFill(vgrad(y, y + r, [[0, '#7a2020'], [1, '#2a0808']]), 1.4);
  g.fillStyle = '#fff'; for (let i = 0; i < 3; i++) g.fillRect(x + 1.6 + i * 1.6, y + r * 0.55, 0.9, 1.4);
  g.save(); g.globalCompositeOperation = 'lighter'; glow(x + 3.5, y - 2.2, 4, '#ffb020', 0.9); g.restore();
  g.fillStyle = '#ffe070'; g.fillRect(x + 1.5, y - 2.8, 4.4, 1.1);
}
function turtleFace(e) {
  const s = e.state;
  if (s === 'hurt' || s === 'down' || s === 'dead' || s === 'getup') return 'ouch';
  if (s === 'special' || s === 'super' || s === 'throw' || (s === 'jump' && e.jk) || (s === 'attack' && e.combo === 3)) return 'yell';
  if (s === 'attack') return 'angry';
  if (e.anim % 210 > 202) return 'blink';
  return e.t.face;
}
function headOf(style, x, y, r, e, t) {
  const C = e.C;
  switch (style) {
    case 'turtle': return headTurtle(x, y, r, C, t, turtleFace(e), e.t.id, ['walk', 'jump', 'super', 'special', 'respawn'].includes(e.state) ? (e.state === 'walk' ? 1 : 2.5) : 0);
    case 'ninja': return headNinja(x, y, r, C, t, e.def);
    case 'brute': return headBrute(x, y, r, C, t);
    case 'soldier': {
      g.beginPath(); g.arc(x, y, r, 0, TAU); outlineFill(ball(x, y, r, '#6d7682'));
      rrect(x - 1, y - 2.8, r + 1.2, 3.8, 1.4); outlineFill(hgrad(x - 1, x + r, [[0, '#ff6a6a'], [1, '#a01010']]), 1.2);
      g.save(); g.globalCompositeOperation = 'lighter'; glow(x + r * 0.5, y - 1, 5, '#ff3030', 0.8); g.restore();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(x + 0.5, y - 2.3, 2.2, 0.8);
      seg(x - 2, y - r, x - 4, y - r - 4.5, 0.7, '#9aa3ad'); circ(x - 4, y - r - 4.8, 0.8, '#ff4040', null);
      break;
    }
    case 'rhino': {
      g.beginPath(); g.ellipse(x - r * 0.55, y - r * 0.75, 2.2, 3.4, -0.4, 0, TAU); outlineFill(ball(x - r * 0.55, y - r * 0.75, 3, C.skin, 10), 1.8);
      g.beginPath(); g.ellipse(x + 2.5, y + 1, r * 1.3, r * 0.88, 0.15, 0, TAU); outlineFill(ball(x + 3, y, r * 1.3, C.skin));
      g.beginPath(); g.moveTo(x + r * 1.15, y - 2); g.quadraticCurveTo(x + r * 1.45, y - r * 0.6, x + r * 1.5, y - r * 1.35); g.quadraticCurveTo(x + r * 1.1, y - r * 0.8, x + r * 0.62, y - 2.8); g.closePath();
      outlineFill(hgrad(x + r * 0.6, x + r * 1.5, [[0, '#cfc2a0'], [1, '#fffbe8']]), 1.8);
      g.beginPath(); g.moveTo(x + r * 0.35, y - r * 0.2); g.quadraticCurveTo(x + r * 0.52, y - r * 0.9, x + r * 0.75, y - r * 0.55); g.closePath(); outlineFill('#e8dcc0', 1.2);
      circ(x + 2.2, y - 2.3, 1.3, '#fff', OUT, 0.6); circ(x + 2.6, y - 2.2, 0.6, '#111', null);
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x - 1, y - 4); g.lineTo(x + 3.5, y - 3.6); g.moveTo(x + r * 0.7, y + 4); g.quadraticCurveTo(x + r * 1.1, y + 5, x + r * 1.45, y + 3); g.stroke();
      break;
    }
    case 'boar': {
      g.beginPath(); g.arc(x, y, r, 0, TAU); outlineFill(ball(x, y, r, C.skin));
      g.beginPath(); g.ellipse(x - r * 0.45, y - r * 0.85, 2, 3, -0.6, 0, TAU); outlineFill(ball(x, y, 3, C.skin, 15), 1.6);
      g.beginPath(); g.ellipse(x + r * 0.95, y + 2, 3.3, 3.8, 0, 0, TAU); outlineFill(ball(x + r * 0.95, y + 2, 3.8, '#e89a9a'), 1.8);
      circ(x + r * 1.05 + 0.6, y + 1.2, 0.7, '#5a2a2a', null); circ(x + r * 1.05 + 0.6, y + 3.2, 0.7, '#5a2a2a', null);
      g.beginPath(); g.moveTo(x + r * 0.45, y + 5.2); g.quadraticCurveTo(x + r * 0.95, y + 4, x + r * 0.85, y - 0.5); g.quadraticCurveTo(x + r * 0.75, y + 3, x + r * 0.35, y + 4); g.closePath(); outlineFill('#f7f0dc', 1.2);
      for (let i = 0; i < 5; i++) {
        const bx = x - r + i * 3, by = y - r * 0.65;
        g.beginPath(); g.moveTo(bx - 0.5, by); g.lineTo(bx + 1 + Math.sin(t * 0.2 + i) * 0.4, by - 5.5 - (i % 2) * 1.5); g.lineTo(bx + 3, by + 0.3); g.closePath();
        outlineFill(vgrad(by - 6, by, [[0, '#ff6a4a'], [1, '#a01a10']]), 1.2);
      }
      rrect(x - 1.5, y - 3.8, r + 2, 3.6, 1.4); outlineFill(hgrad(x, x + r, [[0, '#9a4ae0'], [1, '#3a0a6a']]), 1.2);
      g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(x + 1, y - 3.2, 2, 0.8);
      break;
    }
    case 'fly': {
      g.beginPath(); g.arc(x, y, r * 0.85, 0, TAU); outlineFill(ball(x, y, r * 0.85, C.skin));
      for (const [ox, oy, rx, ry, rot, sc] of [[-r * 0.25, -2, r * 0.45, r * 0.6, -0.2, 0.8], [r * 0.5, -1.5, r * 0.62, r * 0.76, 0.2, 1]]) {
        g.beginPath(); g.ellipse(x + ox, y + oy, rx, ry, rot, 0, TAU); outlineFill(ball(x + ox, y + oy, ry, '#c2261c', sc < 1 ? 15 : 0), 1.4);
        g.save(); g.beginPath(); g.ellipse(x + ox, y + oy, rx, ry, rot, 0, TAU); g.clip(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 0.35; g.beginPath();
        for (let i = -3; i <= 3; i++) { g.moveTo(x + ox + i * 1.3, y + oy - ry); g.lineTo(x + ox + i * 1.3 + 1, y + oy + ry); g.moveTo(x + ox - rx, y + oy + i * 1.3); g.lineTo(x + ox + rx, y + oy + i * 1.3 - 0.5); }
        g.stroke(); g.restore();
        circ(x + ox + rx * 0.35, y + oy - ry * 0.4, 1, 'rgba(255,255,255,.8)', null);
      }
      g.strokeStyle = OUT; g.lineWidth = 1; g.beginPath(); g.moveTo(x + r * 0.4, y + r * 0.6); g.lineTo(x + r * 0.7, y + r + 1.5); g.moveTo(x + r * 0.1, y + r * 0.7); g.lineTo(x + r * 0.2, y + r + 2); g.stroke();
      break;
    }
    case 'samurai': {
      g.beginPath(); g.arc(x, y + 0.5, r * 0.95, 0, TAU); outlineFill(ball(x, y, r, '#8c1d1d'));
      g.beginPath(); g.arc(x, y - 1, r + 1.4, Math.PI, 0); g.lineTo(x + r + 3, y + 2); g.lineTo(x - r - 3, y + 2.5); g.closePath(); outlineFill(ball(x, y - 3, r + 2, '#1e1e28'), 2);
      g.strokeStyle = '#c42b2b'; g.lineWidth = 0.7; g.beginPath(); g.arc(x, y - 1, r + 0.2, Math.PI + 0.3, -0.3); g.stroke();
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x + s, y - r); g.quadraticCurveTo(x + s * 7, y - r - 2, x + s * 8, y - r - 9); g.quadraticCurveTo(x + s * 5, y - r - 3, x + s * 0.2, y - r + 1); g.closePath(); outlineFill(hgrad(x, x + s * 8, [[0, '#fff0a0'], [1, '#b8860b']]), 1.2); }
      circ(x, y - r - 0.5, 1.6, '#e0b43a');
      g.fillStyle = '#fff'; for (let i = 0; i < 3; i++) g.fillRect(x + 1.5 + i * 1.4, y + 2.4, 0.9, 1.3);
      g.save(); g.globalCompositeOperation = 'lighter'; glow(x + 3, y - 0.4, 3, '#ffcc40', 0.8); g.restore();
      g.fillStyle = '#ffd24a'; g.fillRect(x + 1, y - 0.8, 4.2, 1.1);
      break;
    }
    case 'blade': {
      g.beginPath(); g.arc(x, y, r, 0, TAU); outlineFill(ball(x, y, r, '#c6ccd8'));
      rrect(x - 1, y - 2.6, r + 1.5, 5, 1.5); outlineFill('#1a1a22', 1.2);
      g.save(); g.globalCompositeOperation = 'lighter'; glow(x + 2, y - 1, 3.2, '#ff2020', 0.9); glow(x + 5, y - 1, 3.2, '#ff2020', 0.9); g.restore();
      g.fillStyle = '#ff5050'; g.fillRect(x + 1, y - 1.5, 2, 1); g.fillRect(x + 4, y - 1.5, 2, 1);
      g.strokeStyle = '#444'; g.lineWidth = 0.4; g.beginPath(); for (let i = 0; i < 4; i++) { g.moveTo(x + i * 1.6, y + 0.5); g.lineTo(x + i * 1.6, y + 2.2); } g.stroke();
      for (const o of [-4.5, -0.5, 3.5]) { g.beginPath(); g.moveTo(x + o - 1.6, y - r + 1.4); g.lineTo(x + o + 0.6, y - r - 6); g.lineTo(x + o + 1.6, y - r + 1.4); g.closePath(); outlineFill(hgrad(x + o - 2, x + o + 2, [[0, '#ffffff'], [1, '#7a8090']]), 1.2); }
      break;
    }
    case 'brain': {
      rrect(x - r, y - r, r * 2, r * 1.8, 2.5); outlineFill(ball(x, y - 2, r * 1.4, '#8fa9cc'));
      rrect(x - 1, y - 3.2, r + 1, 2.6, 1); outlineFill('#0a2030', 1);
      g.save(); g.globalCompositeOperation = 'lighter'; glow(x + 2.5, y - 2, 5, '#27e0ff', 0.9); g.restore();
      g.fillStyle = '#9ff4ff'; g.fillRect(x, y - 2.6, r - 0.5, 1.2);
      break;
    }
  }
}

// ---------------------------------------------------------------- модели: тела
function torsoOf(style, S, hipY, shY, e, t) {
  const bw = S.bodyW, C = e.C, my = (hipY + shY) / 2, th = hipY - shY;
  if (style === 'turtle') {
    const id = e.t.id;
    // ножниците на Лео стърчат зад рамото
    if (id === 'leo') for (const [x0, y0, x1, y1] of [[-bw * 0.62, my, -bw * 0.12, shY - 8], [-bw * 0.8, my + 2, -bw * 0.5, shY - 7]]) {
      capsule(x0, y0, x1, y1, 1.3, 1.2, '#5a4a6a', 0);
      const ax = lerp(x0, x1, 0.85), ay = lerp(y0, y1, 0.85); capPath(ax, ay, x1, y1, 1.45, 1.35); g.fillStyle = '#d8b040'; g.fill();
    }
    g.save(); g.translate(-bw * 0.3, my + 0.6); g.rotate(-0.1);
    const rx = bw * 0.52, ry = th * 0.68;
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU);
    const sg = g.createRadialGradient(-rx * 0.2, -ry * 0.5, 1, 0, 0, Math.max(rx, ry) * 1.1);
    sg.addColorStop(0, tone(C.shell, 40)); sg.addColorStop(0.5, C.shell); sg.addColorStop(1, tone(C.shell, -50)); outlineFill(sg);
    // ръбови плочки по края на черупката
    g.beginPath(); g.ellipse(0, 0, rx * 0.8, ry * 0.82, 0, 0, TAU); g.lineWidth = 1.1; g.strokeStyle = tone(C.shell, 30); g.stroke();
    g.strokeStyle = tone(C.shell, -45); g.lineWidth = 0.6; g.beginPath();
    for (let i = 0; i < 14; i++) { const a = i * TAU / 14; g.moveTo(Math.cos(a) * rx * 0.8, Math.sin(a) * ry * 0.82); g.lineTo(Math.cos(a) * rx, Math.sin(a) * ry); }
    g.stroke();
    // средни шестоъгълни плочки
    const hx = -rx * 0.35, hr = ry * 0.32;
    g.beginPath();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5; const x1 = hx + Math.cos(a) * hr, y1 = Math.sin(a) * hr; if (i === 0) g.moveTo(x1, y1); else g.lineTo(x1, y1); }
    g.closePath(); g.fillStyle = 'rgba(255,255,255,.07)'; g.fill();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5; g.moveTo(hx + Math.cos(a) * hr, Math.sin(a) * hr); g.lineTo(hx + Math.cos(a) * rx * 0.78, Math.sin(a) * ry * 0.8); }
    g.lineWidth = 0.8; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.22)'; g.beginPath(); g.ellipse(-rx * 0.35, -ry * 0.55, rx * 0.35, ry * 0.12, -0.3, 0, TAU); g.fill();
    if (id === 'raf') { g.strokeStyle = 'rgba(30,15,5,.7)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-rx * 0.7, ry * 0.2); g.lineTo(-rx * 0.5, ry * 0.32); g.lineTo(-rx * 0.58, ry * 0.45); g.stroke(); }
    g.restore();
    torsoPath(shY, hipY, bw, bw * 0.82); outlineFill(bodyGrad(bw, shY, hipY, C.skin));
    // ръб на черупката отстрани (мостът между черупката и пластрона)
    g.beginPath(); g.moveTo(-bw * 0.48, shY + 2); g.quadraticCurveTo(-bw * 0.56, my, -bw * 0.4, hipY - 1); g.lineWidth = 2.2; g.strokeStyle = OUT; g.stroke(); g.lineWidth = 1.2; g.strokeStyle = tone(C.shell, 15); g.stroke();
    // пластрон – щит с плочки
    const px0 = -bw * 0.22, px1 = bw * 0.47, pcx = (px0 + px1) / 2;
    g.save(); g.beginPath(); g.moveTo(px0, shY + 0.6); g.quadraticCurveTo(pcx, shY - 1, px1, shY + 0.6);
    g.quadraticCurveTo(px1 + 1, my + 2, pcx + 1, hipY + 1); g.quadraticCurveTo(px0 - 1, my + 2, px0, shY + 0.6); g.closePath();
    outlineFill(vgrad(shY, hipY, [[0, tone(C.plas, 35)], [0.5, C.plas], [1, tone(C.plas, -35)]]), 1.8);
    g.clip(); g.strokeStyle = tone(C.plas, -40); g.lineWidth = 0.7; g.beginPath();
    for (let i = 1; i < 4; i++) { const yy = shY + th * i / 4 + 1; g.moveTo(px0 - 2, yy - 0.6); g.quadraticCurveTo(pcx, yy + 0.8, px1 + 2, yy - 0.2); }
    g.moveTo(pcx, shY); g.lineTo(pcx + 0.5, hipY + 1); g.stroke();
    g.strokeStyle = tone(C.plas, 40); g.lineWidth = 0.5; g.beginPath(); g.moveTo(px0 + 1.2, shY + 2); g.quadraticCurveTo(px0, my, pcx, hipY - 1); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(bw * 0.22, shY + th * 0.25, bw * 0.12, th * 0.12, -0.3, 0, TAU); g.fill();
    if (id === 'raf') { g.fillStyle = tone(C.plas, -55); g.beginPath(); g.moveTo(px1 + 1, shY + th * 0.4); g.lineTo(px1 - 2.2, shY + th * 0.48); g.lineTo(px1 + 1, shY + th * 0.58); g.fill(); }
    g.restore();
    // ремък през гърдите (Лео има два – кръстосани)
    const strap = (x0, y0, x1, y1) => {
      capPath(x0, y0, x1, y1, 1.25, 1.25); outlineFill(cyl(x0, y0, x1, y1, 1.25, C.belt, 0), 1.3);
      g.strokeStyle = 'rgba(255,220,160,.3)'; g.lineWidth = 0.35; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
    };
    strap(bw * 0.44, shY + 0.5, -bw * 0.4, hipY - 2.5);
    if (id === 'leo') { strap(-bw * 0.36, shY + 0.5, bw * 0.46, hipY - 2.5); circ(bw * 0.04, my - 0.6, 1.5, '#d8b040', OUT, 0.8); }
    rrect(-bw / 2 + 0.5, hipY - 3, bw - 1, 3.4, 1.2); outlineFill(vgrad(hipY - 3, hipY, [[0, tone(C.belt, 30)], [1, tone(C.belt, -35)]]), 1.6);
    if (id === 'don') { rrect(-bw * 0.42, hipY - 2, 4.2, 4.6, 0.8); outlineFill(vgrad(hipY - 2, hipY + 3, [[0, '#8a6a40'], [1, '#4a3418']]), 1.2); seg(-bw * 0.42 + 2.1, hipY - 2.5, -bw * 0.42 + 2.1, hipY - 4.5, 0.5, '#9aa3ad'); }
    if (id === 'raf') { capsule(-bw * 0.45, hipY - 1.5, -bw * 0.15, hipY + 4, 0.9, 0.9, '#a0302a', 0); }
    g.beginPath(); g.arc(bw * 0.2, hipY - 1.3, 2.2, 0, TAU); outlineFill(ball(bw * 0.2, hipY - 1.3, 2.2, '#d8b040'), 1.2);
    g.font = 'bold 3px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#5a3a10'; g.fillText(e.t.name[0], bw * 0.2, hipY - 1.2);
    return;
  }
  if (style === 'blade') {
    const wv = Math.sin(t * 0.12) * 2.5;
    g.beginPath(); g.moveTo(-bw * 0.2, shY); g.quadraticCurveTo(-bw * 0.8, my, -bw * 1.0 + wv, hipY + S.leg * 1.9); g.lineTo(-bw * 0.35 + wv * 0.5, hipY + S.leg * 2); g.quadraticCurveTo(-bw * 0.1, my + 4, bw * 0.1, shY);
    outlineFill(hgrad(-bw, 0, [[0, '#2a0a3a'], [0.6, C.acc], [1, tone(C.acc, 25)]]), 1.8);
  }
  if (style === 'fly') {
    const fl = Math.sin(t * 0.9) * 0.35;
    g.save(); g.globalAlpha = 0.5;
    for (const [ox, oy, rx, ry, rot] of [[-bw * 0.7, shY + 2, 13, 4.8, -0.6 + fl], [-bw * 0.5, shY + 6, 11, 3.8, -0.2 - fl]]) {
      g.beginPath(); g.ellipse(ox, oy, rx, ry, rot, 0, TAU); g.fillStyle = vgrad(oy - ry, oy + ry, [[0, '#ffffff'], [1, '#9ad0ff']]); g.fill(); g.lineWidth = 0.6; g.strokeStyle = '#3a4a5a'; g.stroke();
      g.beginPath(); g.moveTo(ox + Math.cos(rot) * rx, oy + Math.sin(rot) * rx); g.lineTo(ox - Math.cos(rot) * rx, oy - Math.sin(rot) * rx); g.stroke();
    }
    g.restore();
  }
  const col = style === 'ninja' ? C.suit : style === 'soldier' ? '#7d8794' : C.torso;
  torsoPath(shY, hipY, bw, bw * 0.84); outlineFill(bodyGrad(bw, shY, hipY, col));
  switch (style) {
    case 'ninja': {
      const d = e.def, fl = Math.sin(t * 0.25) * 1.2;
      // запазка на кимоното с мрежеста риза отдолу
      g.beginPath(); g.moveTo(-bw * 0.3, shY - 1); g.lineTo(bw * 0.12, my); g.lineTo(bw * 0.42, shY - 1); g.closePath(); g.fillStyle = tone(C.suit, -45); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.13)'; g.lineWidth = 0.3; g.beginPath(); g.moveTo(-bw * 0.1, shY); g.lineTo(bw * 0.2, shY + 3); g.moveTo(bw * 0.3, shY); g.lineTo(bw * 0.05, shY + 3); g.stroke();
      g.strokeStyle = tone(C.suit, 25); g.lineWidth = 0.8; g.beginPath(); g.moveTo(-bw * 0.3, shY - 1); g.lineTo(bw * 0.12, my); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(-bw * 0.36, my + 1); g.quadraticCurveTo(-bw * 0.1, my + 3, bw * 0.02, hipY - 3); g.moveTo(bw * 0.38, my - 1); g.quadraticCurveTo(bw * 0.28, my + 2, bw * 0.4, hipY - 3); g.stroke();
      if (d.plate) {
        rrect(-bw * 0.12, shY + 2, bw * 0.56, th * 0.42, 1.6); outlineFill(vgrad(shY + 2, shY + 2 + th * 0.42, [[0, '#c8ced8'], [0.5, '#8a929e'], [1, '#4a505a']]), 1.2);
        g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(-bw * 0.12, shY + 2 + th * 0.21); g.lineTo(bw * 0.44, shY + 2 + th * 0.21); g.stroke();
      }
      // измислен знак на клана – червен ромб
      const ex = bw * 0.24, ey = shY + th * (d.plate ? 0.3 : 0.42);
      g.beginPath(); g.moveTo(ex, ey - 2.2); g.lineTo(ex + 1.7, ey); g.lineTo(ex, ey + 2.2); g.lineTo(ex - 1.7, ey); g.closePath(); outlineFill('#c42b2b', 0.8);
      circ(ex, ey, 0.55, '#ffe0d0', null);
      // пояс с възел и развяващи се краища
      rrect(-bw / 2, hipY - 3, bw, 3.2, 1); outlineFill(vgrad(hipY - 3, hipY, [[0, '#3a3040'], [1, '#141018']]), 1.4);
      for (const [dx, len] of [[0, 6], [1.6, 5]]) { g.beginPath(); g.moveTo(bw * 0.28 + dx, hipY - 1); g.quadraticCurveTo(bw * 0.25 + dx - fl, hipY + len * 0.5, bw * 0.18 + dx - fl * 1.6, hipY + len); g.lineTo(bw * 0.3 + dx - fl * 1.6, hipY + len - 0.5); g.quadraticCurveTo(bw * 0.34 + dx - fl, hipY + len * 0.5, bw * 0.36 + dx, hipY - 1); g.closePath(); outlineFill('#221c28', 1); }
      circ(bw * 0.32, hipY - 1.5, 1.3, '#2a2230', OUT, 0.8);
      if (d.bag) { // торбичка с бомби
        rrect(-bw * 0.62, hipY - 2.5, 5.4, 5.6, 1.2); outlineFill(vgrad(hipY - 2.5, hipY + 3, [[0, '#9a7a4a'], [1, '#4a3418']]), 1.2);
        circ(-bw * 0.62 + 2.7, hipY - 3, 2, '#24242a', OUT, 0.9); seg(-bw * 0.62 + 3.4, hipY - 4.8, -bw * 0.62 + 4.6, hipY - 6.2, 0.4, '#c9a24a');
      }
      break;
    }
    case 'brute': {
      // ламеларна броня: редове плочки, вързани с червени шнурове
      g.save(); torsoPath(shY, hipY, bw, bw * 0.84); g.clip();
      const rh = (th - 3) / 4;
      for (let r = 0; r < 4; r++) {
        const yy = shY + 1 + r * rh; rrect(-bw / 2 - 1, yy, bw + 2, rh + 0.8, 1);
        g.fillStyle = vgrad(yy, yy + rh, [[0, '#7a808e'], [0.5, '#525866'], [1, '#2a2e36']]); g.fill(); g.strokeStyle = OUT; g.lineWidth = 0.6; g.stroke();
        g.strokeStyle = '#b02a2a'; g.lineWidth = 0.55; g.beginPath(); for (let i = -2; i <= 2; i++) { g.moveTo(i * bw * 0.2, yy + 0.8); g.lineTo(i * bw * 0.2, yy + rh - 0.4); } g.stroke();
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(-bw / 2, yy + 0.4, bw, 0.6);
      }
      g.restore();
      g.beginPath(); g.arc(bw * 0.15, shY + th * 0.35, 3, 0, TAU); outlineFill(ball(bw * 0.15, shY + th * 0.35, 3, '#c9a24a'), 1.1);
      g.fillStyle = '#7a1414'; g.beginPath(); g.moveTo(bw * 0.15, shY + th * 0.35 - 1.8); g.lineTo(bw * 0.15 + 1.4, shY + th * 0.35); g.lineTo(bw * 0.15, shY + th * 0.35 + 1.8); g.lineTo(bw * 0.15 - 1.4, shY + th * 0.35); g.fill();
      rrect(-bw / 2, hipY - 3.8, bw, 4.2, 1.6); outlineFill(vgrad(hipY - 3.8, hipY, [[0, '#d8b060'], [1, '#6a4a20']]), 1.4);
      g.strokeStyle = 'rgba(60,30,0,.55)'; g.lineWidth = 0.5; g.beginPath(); for (let i = -bw / 2 + 1; i < bw / 2; i += 1.8) { g.moveTo(i, hipY - 3.6); g.lineTo(i + 1.4, hipY); } g.stroke();
      break;
    }
    case 'soldier':
      rrect(-bw * 0.38, shY + 1, bw * 0.8, th * 0.55, 2); outlineFill(vgrad(shY, my, [[0, '#c0c8d2'], [1, '#6a727e']]), 1.4);
      g.save(); g.globalCompositeOperation = 'lighter'; glow(bw * 0.05, shY + th * 0.3, 4, '#ff4040', 0.7); g.restore(); circ(bw * 0.05, shY + th * 0.3, 1, '#ff8080', null);
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * bw * 0.4, shY + 1, 3.5, 2.6, 0, 0, TAU); outlineFill(ball(s * bw * 0.4, shY, 3.5, '#8a94a2'), 1.4); }
      rrect(-bw / 2, hipY - 2.6, bw, 2.8, 1); outlineFill('#3a3f48', 1.2);
      break;
    case 'rhino':
      torsoPath(shY, hipY, bw * 0.5, bw * 0.45, bw * 0.15); outlineFill(bodyGrad(bw * 0.5, shY, hipY, C.skin), 1.2);
      g.strokeStyle = OUT; g.lineWidth = 3.2; g.beginPath(); g.moveTo(-bw / 2 + 1, shY + 1); g.lineTo(bw / 2 - 1, hipY - 2); g.stroke();
      g.strokeStyle = '#6b4a1a'; g.lineWidth = 2.2; g.stroke();
      for (let i = 0; i < 6; i++) { const q = (i + 0.5) / 6; const bx = lerp(-bw / 2 + 1, bw / 2 - 1, q), by = lerp(shY + 1, hipY - 2, q); g.fillStyle = '#e8c040'; g.fillRect(bx - 0.5, by - 1.8, 1, 2.2); }
      rrect(-bw / 2, hipY - 3.2, bw, 3.4, 1); outlineFill(vgrad(hipY - 3, hipY, [[0, '#5a3a1a'], [1, '#2a1a0a']]), 1.4);
      g.beginPath(); g.arc(bw * 0.1, hipY - 1.5, 2.4, 0, TAU); outlineFill(ball(bw * 0.1, hipY - 1.5, 2.4, C.acc), 1.2);
      break;
    case 'boar':
      g.beginPath(); g.moveTo(-1, shY - 1); g.lineTo(bw / 2 - 1, shY - 1); g.quadraticCurveTo(bw / 2 + 1.5, my, bw / 2 - 1, hipY); g.lineTo(3, hipY); g.closePath();
      outlineFill(bodyGrad(bw * 0.5, shY, hipY, C.skin), 1.2);
      g.fillStyle = '#e0e0e8'; for (let i = 0; i < 4; i++) circ(-1.5, shY + 2 + i * 3.5, 0.7, '#d8d8e0', OUT, 0.4);
      rrect(-bw / 2, hipY - 3, bw, 3.2, 1); outlineFill('#2a1a10', 1.4);
      break;
    case 'fly':
      g.beginPath(); g.moveTo(-1, shY - 1); g.lineTo(bw * 0.2, my); g.lineTo(bw * 0.45, shY - 1); g.closePath(); outlineFill(C.skin, 1);
      g.strokeStyle = '#9aa2aa'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-1, shY); g.lineTo(-1, hipY + 3); g.stroke();
      rrect(1.5, my, 4, 4, 0.8); outlineFill('#dfe6ee', 0.8); seg(2.5, my - 1.4, 2.5, my + 1, 0.5, '#2a6ad0'); seg(4, my - 1, 4, my + 1, 0.5, '#d02a2a');
      break;
    case 'samurai':
      g.strokeStyle = C.acc; g.lineWidth = 0.9; g.beginPath(); for (let i = 1; i < 5; i++) { const yy = shY + th * i / 5; g.moveTo(-bw / 2 + 1, yy); g.lineTo(bw / 2 - 1, yy); } g.stroke();
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(bw * 0.05, shY, 2, th);
      for (const s of [-1]) { rrect(s * bw * 0.35 - 4, shY - 2.5, 8.5, 9, 1.6); outlineFill(vgrad(shY - 2, shY + 7, [[0, '#3a3a48'], [1, '#101016']]), 1.8); g.strokeStyle = C.acc; g.lineWidth = 0.7; g.beginPath(); for (let i = 1; i < 4; i++) { g.moveTo(s * bw * 0.35 - 4, shY - 2.5 + i * 2.2); g.lineTo(s * bw * 0.35 + 4.5, shY - 2.5 + i * 2.2); } g.stroke(); }
      break;
    case 'blade':
      g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(bw * 0.1, shY + 1, 2, th - 3);
      for (const o of [-5, 1]) { g.beginPath(); g.moveTo(o, shY); g.lineTo(o + 2.2, shY - 7); g.lineTo(o + 4.4, shY); g.closePath(); outlineFill(hgrad(o, o + 4, [[0, '#ffffff'], [1, '#7a8090']]), 1.2); }
      g.strokeStyle = '#5a6070'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-bw / 2 + 2, my); g.lineTo(bw / 2 - 2, my); g.moveTo(0, shY + 1); g.lineTo(0, hipY - 1); g.stroke();
      rrect(-bw / 2, hipY - 3, bw, 3.2, 1); outlineFill('#2a1a36', 1.4);
      break;
    case 'brain': {
      const pul = Math.sin(t * 0.15) * 0.6;
      g.beginPath(); g.arc(1, my + 1, 7, 0, TAU); outlineFill(ball(1, my + 1, 7, '#3a4a66'), 1.8);
      g.beginPath(); g.ellipse(1, my + 1.5, 5 + pul, 4 + pul * 0.5, 0, 0, TAU); outlineFill(ball(1, my + 1, 5, C.acc), 1);
      g.strokeStyle = tone(C.acc, -45); g.lineWidth = 0.6; g.beginPath(); g.moveTo(-3, my); g.quadraticCurveTo(0, my + 3, 3, my - 1); g.moveTo(-2, my + 3.5); g.quadraticCurveTo(1, my + 1.5, 4.5, my + 3); g.stroke();
      circ(3.2, my + 0.5, 1, '#fff', OUT, 0.4); circ(3.5, my + 0.5, 0.5, '#111', null);
      g.beginPath(); g.arc(1, my + 1, 6.3, 0, TAU); g.fillStyle = 'rgba(180,230,255,.22)'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 0.9; g.beginPath(); g.arc(1, my + 1, 5.4, 3.7, 4.5); g.stroke();
      break;
    }
  }
}
// детайли пред предния крак (поли на броня, колан)
function overLegs(style, S, hipY, e) {
  if (style !== 'samurai' && style !== 'brute') return;
  const bw = S.bodyW, br = style === 'brute', top = br ? '#6a707c' : '#3a3a48', bot = br ? '#2a2e36' : '#101016', lace = br ? '#b02a2a' : e.C.acc;
  for (let i = 0; i < 3; i++) {
    const x = -bw / 2 + 1 + i * (bw / 3);
    rrect(x, hipY - 1, bw / 3 - 0.5, 7, 1); outlineFill(vgrad(hipY, hipY + 7, [[0, top], [1, bot]]), 1.4);
    g.strokeStyle = lace; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, hipY + 2.5); g.lineTo(x + bw / 3 - 0.5, hipY + 2.5); g.moveTo(x, hipY + 5); g.lineTo(x + bw / 3 - 0.5, hipY + 5); g.stroke();
  }
}
// превръзки на ръцете и краката на нинджите
function wraps(L, t0, t1, r, col) {
  const x1 = lerp(L[0], L[2], t0), y1 = lerp(L[1], L[3], t0), x2 = lerp(L[0], L[2], t1), y2 = lerp(L[1], L[3], t1);
  g.lineCap = 'butt'; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2);
  g.strokeStyle = OUT; g.lineWidth = r * 2 + 1.4; g.stroke(); g.strokeStyle = col; g.lineWidth = r * 2 - 0.2; g.stroke();
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.4; g.beginPath();
  for (let k = 1; k < 4; k++) { const q = lerp(t0, t1, k / 4), x = lerp(L[0], L[2], q), y = lerp(L[1], L[3], q); g.moveTo(x - r, y - 0.6); g.lineTo(x + r, y + 0.6); }
  g.stroke();
}
// веригата на сърпа: в покой виси, при засилване се върти, при удар се изстрелва напред
function kusariChain(e, F, S, sc) {
  let ex, ey;
  const hx = F[2], hy = F[3];
  if (e.state === 'attack') { const q = e.st <= 6 ? ease(e.st / 6) : clamp(1 - (e.st - 6) / 10, 0, 1); ex = hx + q * (e.def.reach / sc - hx + 4); ey = hy + q * 2; }
  else if (e.state === 'windup') { const a = e.st * 0.7; ex = hx + Math.cos(a) * 9; ey = hy - 7 + Math.sin(a) * 4; }
  else { ex = hx - 1 + Math.sin(e.anim * 0.1) * 1.2; ey = hy + 9; }
  const n = Math.max(3, Math.round(Math.hypot(ex - hx, ey - hy) / 1.6)), sag = e.state === 'attack' ? 0.5 : 2;
  g.fillStyle = '#9aa3ad'; g.strokeStyle = OUT; g.lineWidth = 0.3;
  for (let i = 1; i < n; i++) { const q = i / n, x = lerp(hx, ex, q), y = lerp(hy, ey, q) + Math.sin(q * Math.PI) * sag; g.beginPath(); g.ellipse(x, y, 0.8, 0.5, i % 2 ? 0.8 : -0.8, 0, TAU); g.fill(); g.stroke(); }
  circ(ex, ey, 1.9, ball(ex, ey, 1.9, '#6a707c'), OUT, 1);
}

// ---------------------------------------------------------------- модели: сглобяване
const STY = {
  turtle: { leg: 8, torso: 14, bodyW: 15.5, headR: 7.4, arm: 7, lr: [3.6, 3.0, 2.4], ar: [3.0, 2.6, 2.1], hand: 2.6, foot: [6, 2.8] },
  ninja: { leg: 9, torso: 14, bodyW: 12, headR: 6, arm: 7.5, lr: [2.8, 2.3, 1.9], ar: [2.3, 1.9, 1.6], hand: 2.0, foot: [5, 2.2] },
  brute: { leg: 9.5, torso: 18, bodyW: 23, headR: 6.8, arm: 9, lr: [4.6, 3.9, 3.3], ar: [4.4, 3.8, 3.3], hand: 3.8, foot: [7, 3.4] },
  soldier: { leg: 9, torso: 15, bodyW: 14, headR: 6.4, arm: 7.5, lr: [3.2, 2.7, 2.3], ar: [2.8, 2.3, 2.0], hand: 2.3, foot: [5.5, 2.6] },
  rhino: { leg: 9, torso: 17, bodyW: 20, headR: 8, arm: 8.5, lr: [4.3, 3.6, 3.0], ar: [4.1, 3.5, 3.0], hand: 3.5, foot: [6.5, 3.2] },
  boar: { leg: 9, torso: 17, bodyW: 20, headR: 8, arm: 8.5, lr: [4.2, 3.5, 3.0], ar: [4.0, 3.4, 3.0], hand: 3.4, foot: [6.5, 3.2] },
  fly: { leg: 9, torso: 15, bodyW: 13, headR: 7, arm: 8, lr: [2.4, 2.0, 1.6], ar: [2.0, 1.7, 1.4], hand: 1.9, foot: [5, 2] },
  samurai: { leg: 9, torso: 16, bodyW: 16, headR: 6.5, arm: 8, lr: [3.3, 2.9, 2.5], ar: [3.0, 2.6, 2.2], hand: 2.5, foot: [5.5, 2.6] },
  blade: { leg: 9.5, torso: 16, bodyW: 16, headR: 6.5, arm: 8, lr: [3.3, 2.9, 2.5], ar: [3.0, 2.6, 2.2], hand: 2.5, foot: [5.5, 2.6] },
  brain: { leg: 10, torso: 18, bodyW: 21, headR: 6, arm: 9, lr: [4.5, 3.8, 3.2], ar: [4.3, 3.7, 3.2], hand: 3.9, foot: [7, 3.4] }
};
const XTRA = {
  turtle: { foot: null, hand: null }, ninja: { foot: '#241c2a', hand: '#2a2230', wrap: '#cfc8c0' }, brute: { foot: '#22202a', hand: '#3a3040', wrap: '#5a4a3a' }, soldier: { foot: '#3a3f48', hand: '#3a3f48' },
  rhino: { foot: '#3a2a1a', hand: null }, boar: { foot: '#2a1a10', hand: null }, fly: { foot: '#1a1a20', hand: null },
  samurai: { foot: '#141418', hand: '#1b1b22' }, blade: { foot: '#23232d', hand: '#23232d' }, brain: { foot: '#34425a', hand: '#34425a' }
};
function drawRobot(e, cam) {
  const sx = e.x - cam, sy = e.y - e.z, t = e.anim;
  g.save(); g.translate(sx, sy); g.scale(e.face * CHS, CHS);
  if (['down', 'dead'].includes(e.state)) { g.translate(0, -2); g.rotate(-Math.PI / 2); }
  if (e.flash > 0 && (e.flash & 2)) g.translate(1, 0);
  const open = e.state === 'leap' || e.state === 'attack' || e.state === 'leapw' ? 1 : (Math.sin(t * 0.3) + 1) * 0.2;
  const s = e.state === 'walk' || e.state === 'enter' ? Math.sin(t * 0.5) * 3 : 0;
  capsule(-3, -7, -4 + s, -0.5, 1.1, 0.9, '#6a7078', 10); capsule(3, -7, 4 - s, -0.5, 1.1, 0.9, '#6a7078', 0);
  ell(-4 + s, 0, 2.2, 1, 0, '#3a3f48', OUT, 1); ell(4 - s, 0, 2.2, 1, 0, '#3a3f48', OUT, 1);
  seg(-7, -13, -11, -18 + Math.sin(t * 0.3), 0.7, '#9aa'); circ(-11, -18 + Math.sin(t * 0.3), 1, '#ff4040', null);
  g.beginPath(); g.arc(0, -12, 8.3, 0, TAU); outlineFill(ball(0, -12, 8.3, '#a2abb6'));
  g.beginPath(); g.moveTo(0, -12); g.arc(0, -12, 8.4, -open * 0.8, open * 0.8); g.closePath();
  g.fillStyle = vgrad(-18, -6, [[0, '#5a1010'], [1, '#200404']]); g.fill(); g.lineWidth = 0.8; g.strokeStyle = OUT; g.stroke();
  g.fillStyle = '#fff';
  for (let i = 0; i < 3; i++) {
    const r0 = 3 + i * 1.8;
    for (const sg of [-1, 1]) {
      const a = sg * open * 0.8, x = Math.cos(a) * r0, y = -12 + Math.sin(a) * r0;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1, y - sg * 2); g.lineTo(x + 2, y + sg * 0.2); g.closePath(); g.fill();
    }
  }
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.6; g.beginPath(); g.arc(0, -12, 6, 3.6, 5.2); g.stroke();
  g.save(); g.globalCompositeOperation = 'lighter'; glow(1.5, -17.5, 4, '#ff2020', 0.9); g.restore();
  circ(1.5, -17.5, 1.5, '#ff5050', OUT, 0.6);
  g.restore();
}
function drawChar(e, cam = G.cam) {
  const style = e.pl ? 'turtle' : e.boss ? e.key : e.def.style;
  if (style === 'robot') return drawRobot(e, cam);
  if ((e.state === 'dead' || e.state === 'dying') && e.st > 20 && (e.st & 4)) return;
  if (e.pl && e.inv > 0 && (e.inv & 4) && e.state !== 'respawn' && e.state !== 'super') return;
  const S = e.pl ? (e.t.S || (e.t.S = Object.assign({}, STY.turtle, e.t.body))) : STY[style];
  const X = XTRA[style], sc = (e.sc || 1) * CHS, Q = pose(e), t = e.anim; let C = e.C;
  if (e.state === 'held') Q.rot = -Math.min(1, e.z / 30) * Math.PI / 2;
  g.save();
  if (e.ghost) g.globalAlpha = 0.2 + ((G.t & 2) ? 0.1 : 0);
  const C0 = e.C; if (e.flash > 3) e.C = C = e.Cf || (e.Cf = brighten(C0));
  g.translate(e.x - cam, e.y - e.z); g.scale(e.face * sc, sc);
  if (e.flash > 0 && (e.flash & 2)) g.translate(1, 0);
  if (e.armorT > 0) g.translate((e.armorT & 2) ? 0.8 : -0.8, 0);
  if (Q.rot) { g.translate(0, -3); g.rotate(Q.rot); }
  const hipY = -S.leg * 2 - 1.5 + Q.crouch, shY = hipY - S.torso + 2, tur = style === 'turtle', wr = X.wrap;
  const [l0, l1, l2] = S.lr, [a0, a1, a2] = S.ar, legC = C.leg, armC = C.arm;
  let L = limb(-2.5, hipY, Q.lb, S.leg, Q.lb - Q.kb, S.leg, l0, l1, l2, legC, 16);
  if (wr) wraps([L[0], L[1], L[2], L[3]], 0.45, 0.9, l2 + 0.35, tone(wr, -25));
  foot(L[2], L[3], Q.lb - Q.kb, S.foot[0], S.foot[1], X.foot || legC, 16, tur ? 1 : wr ? 2 : 0);
  if (tur) pad(L[0], L[1], 2.7, C.pad, 16);
  g.save(); g.translate(0, hipY); g.rotate(Q.lean); g.translate(0, -hipY);
  const A = limb(-S.bodyW * 0.28, shY + 2.5, Q.ab, S.arm, Q.ab + Q.eb, S.arm, a0, a1, a2, armC, 16);
  if (tur) wrapBand([A[0], A[1], A[2], A[3]], 0.62, 0.85, a2 + 0.45, C.pad, 16);
  else if (wr) wraps([A[0], A[1], A[2], A[3]], 0.55, 0.92, a2 + 0.3, tone(wr, -25));
  if (C.weapon && (C.dual || style === 'brute')) weapon(C.weapon === 'club' ? null : C.weapon, A[2], A[3], Q.wb, t);
  fist(A[2], A[3], S.hand, X.hand || armC, 16, Q.ab + Q.eb);
  torsoOf(style, S, hipY, shY, e, t);
  g.restore();
  L = limb(2.5, hipY, Q.lf, S.leg, Q.lf - Q.kf, S.leg, l0, l1, l2, legC, 0);
  if (wr) wraps([L[0], L[1], L[2], L[3]], 0.45, 0.9, l2 + 0.35, wr);
  foot(L[2], L[3], Q.lf - Q.kf, S.foot[0], S.foot[1], X.foot || legC, 0, tur ? 1 : wr ? 2 : 0);
  if (tur) pad(L[0], L[1], 2.8, C.pad, 0);
  overLegs(style, S, hipY, e);
  g.save(); g.translate(0, hipY); g.rotate(Q.lean); g.translate(0, -hipY);
  headOf(style, 1 + Q.hx * 0.5, shY - S.headR + 1, S.headR, e, t);
  const sx = S.bodyW * 0.22 + Q.hx;
  const F = limb(sx, shY + 2.5, Q.af, S.arm, Q.af + Q.ef, S.arm, a0, a1, a2, armC, 0);
  if (tur) { wrapBand([F[0], F[1], F[2], F[3]], 0.62, 0.85, a2 + 0.45, C.pad, 0); pad(F[0], F[1], 2.1, C.pad, 0); }
  else if (wr) wraps([F[0], F[1], F[2], F[3]], 0.55, 0.92, a2 + 0.3, wr);
  if (Q.trail && C.weapon) swoosh(sx, shY + 2.5, S.arm * 2 + (C.weapon === 'bo' ? 22 : C.weapon === 'club' ? 26 : 15), Q.trail[0], Q.trail[1], e.pl ? (e.powT > 0 ? '#ffc060' : '#e8f4ff') : '#ffb0a0');
  if (C.weapon) weapon(C.weapon, F[2], F[3], Q.wf, t);
  fist(F[2], F[3], S.hand, X.hand || armC, 0, Q.af + Q.ef);
  if (C.weapon === 'kusari') kusariChain(e, F, S, sc);
  if (style === 'samurai' || style === 'blade') { g.beginPath(); g.ellipse(sx, shY + 1.5, 4.2, 3.4, 0.3, 0, TAU); outlineFill(ball(sx, shY, 4.2, style === 'samurai' ? '#2a2a36' : '#c6ccd8'), 1.8); }
  if (style === 'rhino' || style === 'boar') { g.beginPath(); g.ellipse(sx - 0.5, shY + 1.5, 4.5, 3.6, 0, 0, TAU); outlineFill(ball(sx, shY, 4.5, C.torso), 1.8); }
  if (style === 'brute') { // голяма раменна броня
    g.beginPath(); g.moveTo(sx - 5, shY - 1.5); g.quadraticCurveTo(sx + 1, shY - 5, sx + 6.5, shY - 0.5); g.lineTo(sx + 6, shY + 5); g.quadraticCurveTo(sx, shY + 6.5, sx - 5.5, shY + 4.5); g.closePath();
    outlineFill(vgrad(shY - 4, shY + 6, [[0, '#9aa0ac'], [0.5, '#5a606c'], [1, '#2a2e36']]), 1.8);
    g.strokeStyle = '#b02a2a'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(sx - 5, shY + 1.5); g.quadraticCurveTo(sx, shY - 0.5, sx + 6.2, shY + 2); g.stroke();
  }
  if (style === 'ninja' && (e.def.plate || e.def.hair)) { g.beginPath(); g.ellipse(sx, shY + 1.2, 3.4, 2.7, 0.3, 0, TAU); outlineFill(ball(sx, shY, 3.4, e.def.plate ? '#9aa2ae' : tone(C.suit, -30)), 1.5); }
  g.restore();
  g.restore();
  e.C = C0;
  if (e.state === 'windup' || (e.boss && e.move && e.phase === (e.move === 'charge' ? 0 : 1) && ['melee', 'charge', 'laser'].includes(e.move))) {
    if (G.t & 4) txt('!', e.x - cam, e.y - e.z - (S.leg * 2 + S.torso + S.headR * 2 + 10) * sc, 11, '#ff4030');
  }
}
let SHD = null;
function shadow(x, y, z, w) {
  const k = 1 - Math.min(z, 120) / 200, r = Math.max(1, w * k);
  if (!SHD) {
    SHD = document.createElement('canvas'); SHD.width = SHD.height = 64; const c = SHD.getContext('2d');
    const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
  }
  g.drawImage(SHD, x - r, y - r * 0.3, r * 2, r * 0.6);
}

// ---------------------------------------------------------------- предмети
function drawProp(o, cam) {
  const x = o.x - cam + (o.shake ? Math.sin(o.shake * 2) * 1.5 : 0), y = o.y;
  if (o.type === 'crate') {
    g.beginPath(); g.moveTo(x - 12, y - 22); g.lineTo(x - 7, y - 27); g.lineTo(x + 15, y - 27); g.lineTo(x + 10, y - 22); g.closePath(); outlineFill(vgrad(y - 27, y - 22, [[0, '#d8a868'], [1, '#b0803e']]), 1.6);
    g.beginPath(); g.moveTo(x + 10, y - 22); g.lineTo(x + 15, y - 27); g.lineTo(x + 15, y - 5); g.lineTo(x + 10, y); g.closePath(); outlineFill('#7a5024', 1.6);
    rrect(x - 12, y - 22, 22, 22, 1); outlineFill(vgrad(y - 22, y, [[0, '#c08a48'], [1, '#8a5a28']]), 1.6);
    g.strokeStyle = 'rgba(60,30,10,.55)'; g.lineWidth = 0.6; g.beginPath(); for (let i = 1; i < 4; i++) { g.moveTo(x - 12, y - 22 + i * 5.5); g.lineTo(x + 10, y - 22 + i * 5.5); } g.stroke();
    g.strokeStyle = OUT; g.lineWidth = 3.2; g.beginPath(); g.moveTo(x - 10, y - 20); g.lineTo(x + 8, y - 2); g.stroke(); g.strokeStyle = '#a06a30'; g.lineWidth = 1.8; g.stroke();
    g.strokeStyle = OUT; g.lineWidth = 1.2; g.strokeRect(x - 10, y - 20, 18, 18);
    for (const [nx, ny] of [[-10, -20], [8, -20], [-10, -2], [8, -2]]) circ(x + nx, y + ny, 0.6, '#3a3a3a', null);
  } else {
    capPath(x, y - 24, x, y - 1, 9.5, 9.5);
    g.beginPath(); g.moveTo(x - 9.5, y - 24); g.lineTo(x - 9.5, y - 1); g.ellipse(x, y - 1, 9.5, 2.6, 0, Math.PI, 0, true); g.lineTo(x + 9.5, y - 24); g.closePath();
    outlineFill(hgrad(x - 9.5, x + 9.5, [[0, '#1e3a6a'], [0.3, '#5a86c8'], [0.55, '#3a64a8'], [1, '#162c52']]), 1.8);
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - 9.5, y - 18, 19, 1.6); g.fillRect(x - 9.5, y - 8, 19, 1.6);
    g.fillStyle = '#e8c030'; g.fillRect(x - 9.5, y - 15, 19, 5); g.fillStyle = '#1a1a1a'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x - 8 + i * 5, y - 15); g.lineTo(x - 6 + i * 5, y - 15); g.lineTo(x - 8 + i * 5 + 3, y - 10); g.lineTo(x - 10 + i * 5 + 3, y - 10); g.closePath(); g.fill(); }
    g.beginPath(); g.ellipse(x, y - 24, 9.5, 2.6, 0, 0, TAU); outlineFill(vgrad(y - 27, y - 21, [[0, '#8ab0e0'], [1, '#3a64a8']]), 1.6);
    circ(x + 4, y - 24.3, 1.2, '#2a2a2a', null);
    g.fillStyle = 'rgba(160,80,30,.5)'; g.beginPath(); g.ellipse(x - 4, y - 4, 3, 2, 0.4, 0, TAU); g.fill();
  }
}
function drawItem(it, cam) {
  if (it.life < 180 && (it.life & 8)) return;
  const x = it.x - cam, y = it.y - it.z - 3 - Math.abs(Math.sin(G.t * 0.08)) * 2;
  g.save(); g.globalCompositeOperation = 'lighter'; glow(x, y, 16, '#ffd060', 0.25 + Math.sin(G.t * 0.15) * 0.1); g.restore();
  if (it.type === 'pizza') {
    g.beginPath(); g.ellipse(x, y + 1, 12, 5.4, 0, 0, TAU); outlineFill(vgrad(y - 4, y + 6, [[0, '#ffffff'], [1, '#b8b0a0']]), 1.6);
    g.beginPath(); g.ellipse(x, y, 10, 4.4, 0, 0, TAU); outlineFill(vgrad(y - 4, y + 4, [[0, '#f0b050'], [1, '#b06a20']]), 1.2);
    g.beginPath(); g.ellipse(x, y - 0.3, 8.2, 3.5, 0, 0, TAU); g.fillStyle = vgrad(y - 4, y + 3, [[0, '#ffe07a'], [1, '#f0a830']]); g.fill();
    for (const [px, py] of [[-4, -1], [3, -2], [0, 1], [5, 0.5], [-2, -2.5], [-5.5, 0.8]]) { g.beginPath(); g.ellipse(x + px, y + py, 1.5, 0.85, 0, 0, TAU); g.fillStyle = '#c0392b'; g.fill(); g.fillStyle = 'rgba(255,255,255,.45)'; g.fillRect(x + px - 0.6, y + py - 0.5, 0.8, 0.3); }
    g.strokeStyle = 'rgba(160,90,20,.5)'; g.lineWidth = 0.4; g.beginPath(); g.moveTo(x - 8, y); g.lineTo(x + 8, y - 0.6); g.moveTo(x, y - 3.5); g.lineTo(x, y + 3.5); g.stroke();
  } else {
    g.beginPath(); g.moveTo(x - 8, y - 1); g.lineTo(x + 7, y - 4); g.quadraticCurveTo(x + 8.5, y, x + 6, y + 3.5); g.closePath();
    outlineFill(vgrad(y - 4, y + 4, [[0, '#ffe07a'], [1, '#e89a30']]), 1.4);
    g.strokeStyle = '#b06a20'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x + 7, y - 4); g.quadraticCurveTo(x + 8.5, y, x + 6, y + 3.5); g.stroke();
    circ(x + 2, y, 1.2, '#c0392b', null); circ(x - 2, y - 1, 1, '#c0392b', null); circ(x + 4.5, y - 1.5, 0.9, '#c0392b', null);
  }
}
function drawProj(p, cam) {
  const x = p.x - cam, y = p.y - p.z;
  g.save(); g.globalCompositeOperation = 'lighter';
  const gc = { star: '#c0d0ff', blade: '#e0e8ff', laser: '#ff3030', bullet: '#ffd060', acid: '#8ee04a', knife: '#e0e8ff', orb: '#c070ff', bomb: '#ff8040' }[p.type];
  glow(x, y, p.type === 'orb' ? 16 : 9, gc, p.type === 'bomb' ? (p.fuse >= 0 && (p.fuse & 4) ? 0.9 : 0.3) : 0.6); g.restore();
  switch (p.type) {
    case 'bomb': {
      const r = 3.6, blink = p.fuse >= 0 && (p.fuse & 4);
      g.beginPath(); g.arc(x, y - r, r, 0, TAU); outlineFill(ball(x, y - r, r, blink ? '#a02020' : '#2a2a32'), 1.2);
      rrect(x - 1.2, y - r * 2 - 1.2, 2.4, 1.6, 0.4); outlineFill('#6a6a72', 0.8);
      const fx = x + 1.6 + Math.sin(p.t * 0.3) * 0.4, fy = y - r * 2 - 2.8;
      g.strokeStyle = '#c9a24a'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, y - r * 2 - 1); g.quadraticCurveTo(x + 1.5, y - r * 2 - 1.5, fx, fy); g.stroke();
      add(() => glow(fx, fy, 3 + (p.t & 2), '#ffd060', 1));
      circ(x - 1.2, y - r - 1.2, 0.9, 'rgba(255,255,255,.7)', null);
      break;
    }
    case 'star': case 'blade': {
      g.save(); g.translate(x, y); g.rotate(p.t * 0.5);
      const r = p.type === 'blade' ? 6.5 : 5; g.beginPath();
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.32 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); outlineFill(ball(0, 0, r, '#c8d2de'), 1.2); circ(0, 0, 1, '#333', null); g.restore(); break;
    }
    case 'laser': g.save(); g.globalCompositeOperation = 'lighter'; seg(x - 8, y, x + 8, y, 2, '#ff6a6a'); g.strokeStyle = '#fff'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x - 7, y); g.lineTo(x + 7, y); g.stroke(); g.restore(); break;
    case 'bullet': g.strokeStyle = 'rgba(255,220,120,.6)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - sgn(p.vx) * 9, y); g.lineTo(x, y); g.stroke(); g.beginPath(); g.ellipse(x, y, 2.4, 1.4, 0, 0, TAU); outlineFill('#ffe070', 1); break;
    case 'acid': g.beginPath(); g.arc(x, y, 3.8 + Math.sin(p.t * 0.4) * 0.6, 0, TAU); outlineFill(ball(x, y, 4, '#8ee04a'), 1.2); break;
    case 'knife': seg(x - 6, y, x + 6, y, 1.3, '#e3ebf2'); break;
    case 'orb': g.beginPath(); g.arc(x, y, 5.2 + Math.sin(p.t * 0.3), 0, TAU); outlineFill(ball(x, y, 6, '#c070ff'), 1.2); circ(x - 1.5, y - 1.5, 1.4, 'rgba(255,255,255,.8)', null); break;
  }
}
function drawHazard(h, cam) {
  if (h.k === 'fall') {
    const x = h.x - cam, k = clamp(h.t / h.warn, 0, 1);
    if (!h.done) { g.fillStyle = `rgba(${G.t & 4 ? '255,40,40' : '0,0,0'},${(0.25 + k * 0.3).toFixed(2)})`; g.beginPath(); g.ellipse(x, h.y, 6 + k * 12, 2 + k * 3, 0, 0, TAU); g.fill(); }
    if (h.t > h.warn && !h.done) {
      const y = h.y - h.z;
      if (h.vis === 'fire') {
        rrect(x - 15, y - 6, 30, 6, 1); outlineFill(vgrad(y - 6, y, [[0, '#6a4020'], [1, '#2a1408']]), 1.6);
        g.save(); g.globalCompositeOperation = 'lighter'; glow(x, y - 8, 20, '#ff7020', 0.6); g.restore();
        for (let i = 0; i < 4; i++) flameShape(x - 10 + i * 7, y - 5, 9, G.t + i * 7);
      } else if (h.vis === 'drip') { g.beginPath(); g.ellipse(x, y - 4, 4.5, 6.5, 0, 0, TAU); outlineFill(ball(x, y - 4, 6, '#7fd14a'), 1.4); }
      else if (h.vis === 'beam') { rrect(x - 20, y - 8, 40, 8, 0.5); outlineFill(vgrad(y - 8, y, [[0, '#e07040'], [0.5, '#b0401a'], [1, '#6a2008']]), 1.6); g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x - 20, y - 5, 40, 2); for (let i = 0; i < 5; i++) circ(x - 16 + i * 8, y - 6.5, 0.6, '#3a1a0a', null); }
      else { rrect(x - 12, y - 22, 24, 22, 1); outlineFill(vgrad(y - 22, y, [[0, '#c08a48'], [1, '#8a5a28']]), 1.6); g.strokeStyle = '#6b4520'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - 10, y - 20); g.lineTo(x + 10, y - 2); g.stroke(); seg(x, y - 22, x, y - 70, 0.7, '#444'); }
    }
  } else if (h.k === 'car') {
    if (h.t <= h.warn) {
      if (G.t & 8) { const ex = h.dir > 0 ? 18 : W - 18; g.beginPath(); g.moveTo(ex, h.y - 32); g.lineTo(ex + 11, h.y - 12); g.lineTo(ex - 11, h.y - 12); g.closePath(); outlineFill(vgrad(h.y - 32, h.y - 12, [[0, '#ffe680'], [1, '#e0a010']]), 2); txt('!', ex, h.y - 18.5, 9, '#111', 'center', FP, 0); }
      g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = hgrad(h.dir > 0 ? 0 : W, h.dir > 0 ? W : 0, [[0, 'rgba(255,230,120,.35)'], [1, 'rgba(255,230,120,0)']]); g.fillRect(0, h.y - 10, W, 20); g.restore();
      return;
    }
    const x = h.x - cam, y = h.y;
    g.save(); g.translate(x, y); g.scale(h.dir, 1);
    shadow(0, 1, 0, 46);
    g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = hgrad(38, 110, [[0, 'rgba(255,246,190,.45)'], [1, 'rgba(255,246,190,0)']]); g.beginPath(); g.moveTo(38, -16); g.lineTo(110, -30); g.lineTo(110, 2); g.lineTo(38, -10); g.fill(); g.restore();
    rrect(-40, -21, 80, 17, 5); outlineFill(vgrad(-21, -4, [[0, tone(h.col, 40)], [0.5, h.col], [1, tone(h.col, -45)]]), 2);
    g.beginPath(); g.moveTo(-24, -20); g.lineTo(-16, -33); g.lineTo(14, -33); g.lineTo(24, -20); g.closePath(); outlineFill(vgrad(-33, -20, [[0, tone(h.col, 25)], [1, tone(h.col, -20)]]), 2);
    g.beginPath(); g.moveTo(-20, -21); g.lineTo(-14, -30.5); g.lineTo(-2, -30.5); g.lineTo(-2, -21); g.closePath(); g.fillStyle = vgrad(-31, -21, [[0, '#cfe8ff'], [1, '#4a7aa8']]); g.fill();
    g.beginPath(); g.moveTo(1, -21); g.lineTo(1, -30.5); g.lineTo(12, -30.5); g.lineTo(20, -21); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-12, -29); g.lineTo(-16, -23); g.moveTo(8, -29); g.lineTo(4, -23); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-36, -18, 72, 1.2);
    for (const wx of [-24, 24]) { g.beginPath(); g.arc(wx, -4, 6.5, 0, TAU); outlineFill('#1a1a1e', 1.6); g.beginPath(); g.arc(wx, -4, 3, 0, TAU); outlineFill(ball(wx, -4, 3, '#b8bcc4'), 0.8); }
    rrect(35, -17, 5, 4, 1); outlineFill('#fff6c0', 1); rrect(-40, -17, 3, 4, 1); outlineFill('#ff4040', 1);
    g.restore();
  } else if (h.k === 'laser') {
    const y = h.y - 14;
    if (h.t < h.warn) { if (G.t & 4) { g.strokeStyle = 'rgba(255,60,90,.85)'; g.setLineDash([6, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); g.setLineDash([]); } }
    else {
      g.save(); g.globalCompositeOperation = 'lighter';
      g.fillStyle = vgrad(y - 10, y + 10, [[0, 'rgba(255,40,120,0)'], [0.5, 'rgba(255,40,120,.6)'], [1, 'rgba(255,40,120,0)']]); g.fillRect(0, y - 10, W, 20);
      g.fillStyle = '#ff7ab0'; g.fillRect(0, y - 2.5, W, 5); g.fillStyle = '#fff'; g.fillRect(0, y - 1, W, 2); g.restore();
    }
    for (const ex of [5, W - 5]) { rrect(ex - 5, y - 8, 10, 16, 2); outlineFill(vgrad(y - 8, y + 8, [[0, '#6a5a8a'], [1, '#2a1a4a']]), 1.6); circ(ex, y, 2, '#ff5a8a', null); }
  }
}
function flameShape(x, y, s, t) {
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const h = s * (1 - i * 0.25) * (0.85 + 0.15 * Math.sin(t * 0.3 + i + x)), w = s * 0.45 * (1 - i * 0.22);
    g.fillStyle = ['rgba(255,70,20,.85)', 'rgba(255,150,40,.8)', 'rgba(255,240,150,.9)'][i];
    g.beginPath(); g.moveTo(x - w, y); g.quadraticCurveTo(x - w * 0.7, y - h * 0.6, x + Math.sin(t * 0.2 + x) * s * 0.12, y - h); g.quadraticCurveTo(x + w * 0.7, y - h * 0.6, x + w, y); g.fill();
  }
  g.restore();
}
function drawParts(cam) {
  for (const q of parts) {
    const x = q.x - cam, y = q.y - q.z, a = q.life / q.max;
    if (q.k === 'spark') { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.strokeStyle = q.col; g.lineWidth = q.sz; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - q.vx * 1.6, y + q.vz * 1.6); g.stroke(); g.restore(); }
    else if (q.k === 'burst') {
      g.save(); g.globalCompositeOperation = 'lighter'; glow(x, y, 16 * (1.2 - a * 0.4), '#fff4c0', a * 0.9);
      g.globalAlpha = a; g.fillStyle = '#ffffff'; g.beginPath(); const r = (1 - a) * 10 + 6;
      for (let i = 0; i < 10; i++) { const an = i * Math.PI / 5 + 0.3, rr = i % 2 ? r * 0.3 : r; g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr * 0.8); }
      g.closePath(); g.fill(); g.restore();
    } else if (q.k === 'ring') { g.save(); g.globalAlpha = a; g.strokeStyle = '#fff'; g.lineWidth = 2 * a + 0.5; g.beginPath(); g.ellipse(x, y, (1 - a) * 26 + 4, ((1 - a) * 26 + 4) * 0.6, 0, 0, TAU); g.stroke(); g.restore(); }
    else if (q.k === 'dust') { const r = q.sz; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, q.col + (a * 0.45).toFixed(3) + ')'); gr.addColorStop(1, q.col + '0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
    else if (q.k === 'chunk') { g.globalAlpha = Math.min(1, a * 2); g.save(); g.translate(x, y); g.rotate(q.rot + q.life * 0.2); g.fillStyle = q.col; g.fillRect(-q.sz / 2, -q.sz / 2, q.sz, q.sz * 0.7); g.fillStyle = 'rgba(255,255,255,.3)'; g.fillRect(-q.sz / 2, -q.sz / 2, q.sz, q.sz * 0.2); g.restore(); g.globalAlpha = 1; }
    else if (q.k === 'mote') { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.fillStyle = q.col; g.beginPath(); g.arc(x, y, q.sz * (0.6 + a * 0.6), 0, TAU); g.fill(); g.restore(); }
    else if (q.k === 'streak') { g.save(); g.globalCompositeOperation = 'lighter'; g.globalAlpha = a; g.fillStyle = hgrad(x, x - q.w, [[0, rgba(q.col, 0.9)], [1, rgba(q.col, 0)]]); g.fillRect(Math.min(x, x - q.w), y - 1.2, Math.abs(q.w), 2.4); g.restore(); }
    else if (q.k === 'wave') {
      const k = 1 - a, rx = 20 + k * 200, ry = rx * 0.22;
      g.save(); g.globalAlpha = a; g.lineWidth = 3 * a + 1; g.strokeStyle = q.col; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU); g.stroke();
      g.globalCompositeOperation = 'lighter'; g.lineWidth = 1; g.strokeStyle = '#fff4d0'; g.beginPath(); g.ellipse(x, y, rx * 0.92, ry * 0.92, 0, 0, TAU); g.stroke(); g.restore();
    }
    else if (q.k === 'confetti') { g.fillStyle = q.col; g.save(); g.translate(q.x, q.y); g.rotate(q.y * 0.05); g.fillRect(-1.5, -1, 3, 2); g.restore(); }
  }
  g.globalAlpha = 1;
}
