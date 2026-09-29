'use strict';
// Костенурките нинджи – фен beat 'em up за телефон. Всичко (графика, звук, музика) е генерирано в кода.
(() => {
const W = 480, H = 270, HOR = 150, FT = 172, FB = 262, GRAV = 0.34, TAU = Math.PI * 2;
const FP = '"Press Start 2P","Courier New",monospace';
const FT_T = '"Russo One",Impact,"Arial Black",sans-serif';
const OUT = '#16120e', CHS = 1.3;

const rnd = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const sgn = v => v < 0 ? -1 : 1;
const ease = t => { t = clamp(t, 0, 1); return 1 - (1 - t) * (1 - t); };
function hash(n) { n = n | 0; n = Math.imul(n ^ 61 ^ (n >>> 16), 9); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; }
function shade(h, p) {
  const n = parseInt(h.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255];
  return 'rgb(' + c.map(v => Math.round(clamp(p < 0 ? v * (1 + p / 100) : v + (255 - v) * p / 100, 0, 255))).join(',') + ')';
}
const store = {
  get(k, d) { try { const v = localStorage.getItem('kn_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('kn_' + k, JSON.stringify(v)); } catch (e) { } }
};

// ---------------------------------------------------------------- екран
const cv = document.getElementById('cv');
let g = cv.getContext('2d');
let SC = 1, DPR = 1, qual = 0;
const QCAP = [2, 1.5, 1.1]; // ако телефонът не смогва, рисуваме с по-малко пиксели
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, QCAP[qual]);
  const vw = innerWidth, vh = innerHeight, portrait = vh > vw * 1.05;
  const s = Math.min(vw / W, (portrait ? vh * 0.58 : vh) / H);
  const cw = Math.floor(W * s), ch = Math.floor(H * s);
  SC = s;
  cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
  cv.style.left = Math.floor((vw - cw) / 2) + 'px';
  cv.style.top = (portrait ? Math.max(8, Math.floor(vh * 0.05)) : Math.floor((vh - ch) / 2)) + 'px';
  cv.width = Math.round(cw * DPR); cv.height = Math.round(ch * DPR);
  document.body.classList.toggle('portrait', portrait);
}
addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- звук
const Snd = {
  ac: null, out: null, mus: null, noise: null, muted: store.get('muted', false),
  init() {
    try {
      if (!this.ac) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ac = new AC();
        this.out = this.ac.createGain(); this.out.gain.value = this.muted ? 0 : 0.55; this.out.connect(this.ac.destination);
        this.mus = this.ac.createGain(); this.mus.gain.value = 0.2; this.mus.connect(this.out);
        const n = this.ac.sampleRate, b = this.ac.createBuffer(1, n, n), d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        this.noise = b;
        if (Music.want) { const w = Music.want; Music.want = null; Music.start(w); }
      }
      if (this.ac.state === 'suspended') this.ac.resume();
    } catch (e) { }
  },
  setMuted(m) { this.muted = m; store.set('muted', m); if (this.out) this.out.gain.value = m ? 0 : 0.55; },
  osc(type, f0, f1, dur, vol, delay = 0, dest) {
    const ac = this.ac, t = ac.currentTime + delay, o = ac.createOscillator(), gn = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(gn); gn.connect(dest || this.out); o.start(t); o.stop(t + dur + 0.03);
  },
  nz(dur, vol, f0, f1, type = 'bandpass', delay = 0, dest) {
    const ac = this.ac, t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), gn = ac.createGain();
    s.buffer = this.noise; f.type = type; f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(gn); gn.connect(dest || this.out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
  },
  play(n) {
    if (!this.ac || this.muted) return;
    try {
      switch (n) {
        case 'swing': this.nz(0.09, 0.22, 3200, 900); break;
        case 'hit': this.nz(0.08, 0.5, 1800, 400, 'lowpass'); this.osc('square', 180, 60, 0.09, 0.22); break;
        case 'hit2': this.nz(0.15, 0.6, 1300, 200, 'lowpass'); this.osc('square', 150, 40, 0.16, 0.28); break;
        case 'hurt': this.osc('sawtooth', 420, 110, 0.22, 0.22); break;
        case 'jump': this.osc('square', 260, 640, 0.12, 0.1); break;
        case 'land': this.nz(0.06, 0.2, 400, 200, 'lowpass'); break;
        case 'pickup': [0, 4, 7, 12].forEach((s, i) => this.osc('square', 523 * 2 ** (s / 12), 523 * 2 ** (s / 12), 0.08, 0.13, i * 0.06)); break;
        case 'special': this.osc('sawtooth', 200, 1200, 0.35, 0.16); this.nz(0.35, 0.3, 500, 4000); break;
        case 'shoot': this.osc('square', 1100, 300, 0.08, 0.1); break;
        case 'laser': this.osc('sawtooth', 1500, 200, 0.4, 0.12); break;
        case 'boom': this.nz(0.5, 0.8, 900, 60, 'lowpass'); this.osc('sine', 90, 30, 0.4, 0.4); break;
        case 'break': this.nz(0.2, 0.5, 2500, 300); break;
        case 'horn': this.osc('square', 392, 392, 0.3, 0.1); this.osc('square', 311, 311, 0.3, 0.1, 0.02); break;
        case 'warn': this.osc('square', 880, 880, 0.08, 0.09); this.osc('square', 880, 880, 0.08, 0.09, 0.14); break;
        case 'select': this.osc('square', 660, 990, 0.06, 0.1); break;
        case 'roar': this.osc('sawtooth', 160, 70, 0.6, 0.22); this.nz(0.6, 0.3, 600, 200, 'lowpass'); break;
        case 'die': this.osc('square', 400, 50, 0.6, 0.18); break;
        case 'clear': [0, 4, 7, 12, 7, 12].forEach((s, i) => this.osc('square', 440 * 2 ** (s / 12), 440 * 2 ** (s / 12), 0.14, 0.12, i * 0.12)); break;
      }
    } catch (e) { }
  }
};

// Прост чиптюн секвенсер. Мелодиите са оригинални, в минорна пентатоника.
const PENT = [0, 3, 5, 7, 10];
const deg = d => PENT[((d % 5) + 5) % 5] + 12 * Math.floor(d / 5);
const SONGS = {
  title: { bpm: 126, root: 57, prog: [0, 0, -4, -2], bass: '1.1.o.1.1.1.o.1.', lead: '7.5.7.9.a...9.7.5.7.5.3...5.3.2.0.2.3...2.0.2.3.5...7.9.a.9.7.....', kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.' },
  l0: { bpm: 140, root: 57, prog: [0, 0, 3, -2], bass: '1.o.1.o.1.o.1.o.', lead: '5.5.7.5.8.7.5...5.5.7.9.a.9.7...a.9.7.5.7.5.3.5.2.3.5...........', kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
  l1: { bpm: 136, root: 55, prog: [0, -2, -4, -2], bass: '1..1..o.1..1..o.', lead: '0.2.3.5.7...5.3.5...3.2.0.......7.8.7.5.3.5.7...a.9.7.5.........', kick: 'x..x..x...x.....', snare: '....x.......x..x', hat: 'x.xxx.xxx.xxx.xx' },
  l2: { bpm: 118, root: 52, prog: [0, 0, 1, 0], bass: '1...1.1.o...1...', lead: '5.....7.5...3.....2.3.5.......0...2.3.2.0.....3.2.0.-1...........', kick: 'x.......x.x.....', snare: '....x.......x...', hat: '..x...x...x...x.' },
  l3: { bpm: 146, root: 59, prog: [0, 3, 5, 3], bass: '1.1o1.1o1.1o1.1o', lead: '7.7.a.7.9.7.5...7.7.a.c.a.9.7...5.7.8.7.5.3.2.3.5.......7.......', kick: 'x...x...x...x...', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx' },
  l4: { bpm: 132, root: 54, prog: [0, -4, -2, 0], bass: '1.o.1...1.o.1...', lead: '3...5.7.8...7.5.3...2.0.2.3.....5.7.8.a.8.7.5.3.2.3.5.....0.....', kick: 'x.......x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
  l5: { bpm: 152, root: 50, prog: [0, 1, -1, 0], bass: '1o1o1o1o1o1o1o1o', lead: 'a.9.7.9.a...c.a.9.7.5.7.9...7.5.a.9.7.5.3.5.7.......5.3.2.0.....', kick: 'x..x..x.x..x..x.', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx' },
  boss: { bpm: 156, root: 52, prog: [0, 0, 1, -1], bass: '1o1o1o1o1o1o1o1o', lead: '5...5...6...5...8.7.5.3.5...........a...9...7...5.6.5.3.2.3.....', kick: 'x.x.x.x.x.x.x.x.', snare: '....x.......x...', hat: '..x...x...x...x.' },
  end: { bpm: 112, root: 60, prog: [0, 5, 7, 5], bass: '1...o...1...o...', lead: '5.7.9.a.c...a.9.7...5...7...9.7.5.3.5.......7.9.a.c.a.9.7.5.....', kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.' }
};
const Music = {
  timer: null, want: null, cur: null, step: 0, next: 0, song: null,
  start(name) {
    if (!Snd.ac) { this.want = name; return; }
    if (this.cur === name && this.timer) return;
    this.stop(); this.cur = name; this.song = SONGS[name]; this.step = 0; this.next = Snd.ac.currentTime + 0.08;
    this.timer = setInterval(() => this.tick(), 40);
  },
  stop() { clearInterval(this.timer); this.timer = null; this.cur = null; },
  tick() {
    const ac = Snd.ac; if (!ac || Snd.muted) { if (ac) this.next = ac.currentTime + 0.05; return; }
    const sp = 60 / this.song.bpm / 4;
    if (this.next < ac.currentTime - 0.3) this.next = ac.currentTime + 0.02;
    while (this.next < ac.currentTime + 0.15) { this.playStep(this.step, this.next - ac.currentTime, sp); this.next += sp; this.step++; }
  },
  playStep(i, dl, sp) {
    const s = this.song, st = i % 16, bar = Math.floor(i / 16) % s.prog.length, root = s.root + s.prog[bar], M = Snd.mus;
    const f = m => 440 * 2 ** ((m - 69) / 12);
    const b = s.bass[st];
    if (b === '1') Snd.osc('triangle', f(root - 12), f(root - 12), sp * 1.7, 0.9, dl, M);
    else if (b === 'o') Snd.osc('triangle', f(root), f(root), sp * 1.5, 0.8, dl, M);
    const L = s.lead, li = (i * 2) % L.length, c = L[li];
    if (c !== '.' && c !== '-') { const d = parseInt(c, 36); if (!isNaN(d)) Snd.osc('square', f(s.root + 12 + deg(d)), f(s.root + 12 + deg(d)), sp * 1.8, 0.22, dl, M); }
    if (s.kick[st] === 'x') Snd.osc('sine', 150, 40, 0.14, 0.9, dl, M);
    if (s.snare[st] === 'x') Snd.nz(0.12, 0.45, 2500, 1200, 'highpass', dl, M);
    if (s.hat[st] === 'x') Snd.nz(0.03, 0.18, 8000, 8000, 'highpass', dl, M);
  }
};

// ---------------------------------------------------------------- данни
const TURTLES = [
  { id: 'leo', name: 'ЛЕО', color: '#2f6fe0', weapon: 'katana', spd: 1.55, dmg: [7, 7, 12], atkT: 17, reach: 38, desc: 'Катани', stat: [3, 3, 3] },
  { id: 'raf', name: 'РАФ', color: '#e0342f', weapon: 'sai', spd: 1.6, dmg: [9, 9, 14], atkT: 14, reach: 30, desc: 'Саи', stat: [5, 3, 1] },
  { id: 'don', name: 'ДОН', color: '#8a45d6', weapon: 'bo', spd: 1.42, dmg: [7, 7, 12], atkT: 20, reach: 50, desc: 'Бо тояга', stat: [3, 2, 5] },
  { id: 'mik', name: 'МАЙК', color: '#f08a1c', weapon: 'nunchaku', spd: 1.72, dmg: [6, 6, 11], atkT: 12, reach: 33, desc: 'Нунчаку', stat: [2, 5, 2] }
];
const EDEF = {
  n: { style: 'ninja', suit: '#6b3fa0', hp: 22, spd: 0.9, dmg: 6, reach: 24, windup: 22, score: 100 },
  o: { style: 'ninja', suit: '#d0622a', hp: 26, spd: 1.25, dmg: 7, reach: 24, windup: 16, score: 150 },
  w: { style: 'ninja', suit: '#d8d8e0', mask: '#b02a2a', hp: 20, spd: 0.95, dmg: 5, reach: 24, windup: 18, ranged: { type: 'star', cd: 120 }, score: 150 },
  y: { style: 'ninja', suit: '#d6b928', hp: 34, spd: 1.0, dmg: 9, reach: 34, windup: 20, weapon: 'sword', dash: true, score: 200 },
  r: { style: 'robot', hp: 10, spd: 1.35, dmg: 4, reach: 16, windup: 16, leap: true, score: 80 },
  s: { style: 'soldier', suit: '#7d8794', hp: 40, spd: 0.8, dmg: 9, reach: 26, windup: 24, weapon: 'gun', ranged: { type: 'laser', cd: 140 }, score: 250 }
};
const BDEF = {
  rhino: { name: 'РОГАЧ', hp: 250, spd: 1.0, scale: 1.35, dmg: 12, reach: 34, weapon: 'biggun', shot: 'bullet', minion: 'n', moves: { melee: 3, charge: 2, shoot: 2 } },
  boar: { name: 'ГЛИГАНА', hp: 270, spd: 1.1, scale: 1.3, dmg: 12, reach: 32, shot: 'bullet', minion: 'o', moves: { melee: 3, charge: 2, slam: 2, summon: 1 } },
  fly: { name: 'МУХАТА', hp: 290, spd: 1.3, scale: 1.15, dmg: 10, reach: 30, shot: 'acid', minion: 'r', moves: { melee: 2, teleport: 2, shoot: 2, summon: 1 } },
  samurai: { name: 'ЧЕРНИЯТ САМУРАЙ', hp: 330, spd: 1.25, scale: 1.2, dmg: 14, reach: 46, weapon: 'bigsword', shot: 'knife', minion: 'y', moves: { melee: 3, charge: 2, teleport: 1, shoot: 1 } },
  blade: { name: 'ОСТРИЕТО', hp: 370, spd: 1.3, scale: 1.2, dmg: 14, reach: 40, weapon: 'claws', shot: 'blade', minion: 'w', moves: { melee: 3, teleport: 2, shoot: 2, summon: 1, charge: 1 } },
  brain: { name: 'МОЗЪКЪТ', hp: 450, spd: 0.8, scale: 1.7, dmg: 16, reach: 40, shot: 'orb', minion: 's', moves: { melee: 2, laser: 2, slam: 2, shoot: 1, summon: 1 } }
};
const LEVELS = [
  { name: 'ГОРЯЩАТА СГРАДА', sub: 'Спаси репортерката от пожара', theme: 'fire', len: 2600, hazard: 'fire', maxAlive: 3, maxEng: 2, prop: 'crate',
    waves: [[180, 'nnn'], [620, 'nnnw'], [1080, 'nnwnn'], [1540, 'onwnn'], [2000, 'nonwn']], boss: ['rhino'] },
  { name: 'УЛИЦИТЕ', sub: 'Нощна гонка из града', theme: 'street', len: 3000, hazard: 'car', maxAlive: 3, maxEng: 2, prop: 'barrel',
    waves: [[180, 'nno'], [600, 'nnwo'], [1040, 'onwno'], [1480, 'nnoww'], [1920, 'oonnw'], [2360, 'nwono']], boss: ['boar'] },
  { name: 'КАНАЛИТЕ', sub: 'Роботите-хапльовци нападат', theme: 'sewer', len: 3000, hazard: 'drip', maxAlive: 4, maxEng: 2, prop: 'barrel',
    waves: [[180, 'rrr'], [600, 'nnrr'], [1040, 'ownrr'], [1480, 'rrrrn'], [1920, 'oonwr'], [2360, 'nrrwor']], boss: ['fly'] },
  { name: 'СТРОЕЖЪТ', sub: 'Опасност отгоре', theme: 'site', len: 3200, hazard: 'beam', maxAlive: 4, maxEng: 3, prop: 'crate',
    waves: [[180, 'nny'], [620, 'onsy'], [1080, 'ywnno'], [1540, 'ssnr'], [2000, 'yyowr'], [2500, 'soynw']], boss: ['samurai'] },
  { name: 'ПРИСТАНИЩЕТО', sub: 'Двамата мутанти се завръщат', theme: 'docks', len: 3200, hazard: 'crate', maxAlive: 4, maxEng: 3, prop: 'crate',
    waves: [[180, 'noyw'], [620, 'ssoyn'], [1080, 'rrrnoy'], [1540, 'ywsno'], [2000, 'yysoow'], [2500, 'nsyrwo']], boss: ['rhino', 'boar'] },
  { name: 'ТЕХНО-КРЕПОСТТА', sub: 'Последната битка', theme: 'tech', len: 3400, hazard: 'laser', maxAlive: 4, maxEng: 3, prop: 'barrel',
    waves: [[180, 'ssy'], [620, 'yyoow'], [1080, 'sssr'], [1540, 'ywyws'], [2000, 'rrrsyo'], [2500, 'yyssow'], [2900, 'soyws']], boss: ['blade'], boss2: ['brain'] }
];

// ---------------------------------------------------------------- вход
const keys = {};
const inp = { x: 0, y: 0, a: false, b: false, s: false, pa: false, pb: false, ps: false, ba: 0, bb: 0, bs: 0, up: 0, down: 0, left: 0, right: 0, ok: 0, _u: 0, _d: 0, _l: 0, _r: 0, _ok: 0, _st: 0 };
const stick = { id: null, ox: 0, oy: 0, dx: 0, dy: 0 };
const tb = { a: false, b: false, s: false }, tbHit = { a: false, b: false, s: false };
addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  if (!keys[e.code]) {
    if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    if (e.code === 'KeyM') Snd.setMuted(!Snd.muted);
  }
  keys[e.code] = true; Snd.init();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
function readInput() {
  let x = 0, y = 0;
  if (keys.ArrowLeft || keys.KeyA) x -= 1; if (keys.ArrowRight || keys.KeyD) x += 1;
  if (keys.ArrowUp || keys.KeyW) y -= 1; if (keys.ArrowDown || keys.KeyS) y += 1;
  if (stick.id !== null) { x += stick.dx; y += stick.dy; }
  let ga = false, gb = false, gs = false, gst = false;
  const gps = navigator.getGamepads ? navigator.getGamepads() : [];
  for (const gp of gps) {
    if (!gp) continue;
    const bt = i => gp.buttons[i] && gp.buttons[i].pressed;
    if (Math.abs(gp.axes[0]) > 0.3) x += gp.axes[0]; if (Math.abs(gp.axes[1]) > 0.3) y += gp.axes[1];
    if (bt(14)) x -= 1; if (bt(15)) x += 1; if (bt(12)) y -= 1; if (bt(13)) y += 1;
    ga = ga || bt(2) || bt(1); gb = gb || bt(0); gs = gs || bt(3); gst = gst || bt(9);
  }
  inp.x = clamp(x, -1, 1); inp.y = clamp(y, -1, 1);
  const a = !!(keys.KeyJ || keys.KeyZ || tb.a || tbHit.a || ga), b = !!(keys.KeyK || keys.KeyX || keys.Space || tb.b || tbHit.b || gb), s = !!(keys.KeyL || keys.KeyC || tb.s || tbHit.s || gs);
  tbHit.a = tbHit.b = tbHit.s = false;
  inp.pa = a && !inp.a; inp.pb = b && !inp.b; inp.ps = s && !inp.s; inp.a = a; inp.b = b; inp.s = s;
  inp.ba = inp.pa ? 8 : Math.max(0, inp.ba - 1); inp.bb = inp.pb ? 8 : Math.max(0, inp.bb - 1); inp.bs = inp.ps ? 8 : Math.max(0, inp.bs - 1);
  const u = inp.y < -0.5, d = inp.y > 0.5, l = inp.x < -0.5, r = inp.x > 0.5, ok = !!(keys.Enter || gst);
  inp.up = u && !inp._u; inp.down = d && !inp._d; inp.left = l && !inp._l; inp.right = r && !inp._r; inp.ok = (ok && !inp._ok) || inp.pa;
  inp._u = u; inp._d = d; inp._l = l; inp._r = r; inp._ok = ok;
  if (gst && !inp._st) togglePause(); inp._st = gst;
}
const take = k => { if (inp['b' + k] > 0) { inp['b' + k] = 0; return true; } return false; };

const $ = id => document.getElementById(id);
const ctl = $('ctl'), zone = $('stickZone'), base = $('stickBase'), knob = $('knob');
zone.addEventListener('pointerdown', e => {
  e.preventDefault(); Snd.init();
  if (stick.id !== null) return;
  stick.id = e.pointerId; try { zone.setPointerCapture(e.pointerId); } catch (_) { }
  stick.ox = e.clientX; stick.oy = e.clientY; stick.dx = stick.dy = 0;
  base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px'; base.classList.add('on');
  knob.style.transform = 'translate(-50%,-50%)';
});
zone.addEventListener('pointermove', e => {
  if (e.pointerId !== stick.id) return;
  const R = 46; let dx = e.clientX - stick.ox, dy = e.clientY - stick.oy; const d = Math.hypot(dx, dy);
  if (d > R) { stick.ox += dx * (1 - R / d); stick.oy += dy * (1 - R / d); dx = e.clientX - stick.ox; dy = e.clientY - stick.oy; base.style.left = stick.ox + 'px'; base.style.top = stick.oy + 'px'; }
  const m = Math.hypot(dx, dy);
  stick.dx = m < 8 ? 0 : clamp(dx / (R * 0.7), -1, 1); stick.dy = m < 8 ? 0 : clamp(dy / (R * 0.7), -1, 1);
  knob.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px))`;
});
const endStick = e => {
  if (e.pointerId !== stick.id) return;
  stick.id = null; stick.dx = stick.dy = 0; base.classList.remove('on'); knob.style.transform = 'translate(-50%,-50%)';
  base.style.left = ''; base.style.top = '';
};
zone.addEventListener('pointerup', endStick); zone.addEventListener('pointercancel', endStick); zone.addEventListener('lostpointercapture', endStick);
for (const [id, k] of [['btnA', 'a'], ['btnB', 'b'], ['btnS', 's']]) {
  const el = $(id);
  el.addEventListener('pointerdown', e => { e.preventDefault(); Snd.init(); tb[k] = true; tbHit[k] = true; el.classList.add('down'); try { el.setPointerCapture(e.pointerId); } catch (_) { } });
  const off = () => { tb[k] = false; el.classList.remove('down'); };
  el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off);
}
$('btnP').addEventListener('pointerdown', e => { e.preventDefault(); togglePause(); });
addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden && G.scene === 'play') togglePause(); });

const UI = { btns: [], cols: 1 };
cv.addEventListener('pointerdown', e => {
  Snd.init();
  if (G.scene === 'play') return;
  const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
  UI.btns.forEach((b, i) => { if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { G.sel = i; Snd.play('select'); b.fn(); } });
});

// ---------------------------------------------------------------- състояние
const G = {
  scene: 'title', sel: 0, lvl: 0, startLvl: 0, cam: 0, lock: null, waveI: 0, wave: null, spawnT: 0, bossStage: 0, bosses: [], b2T: 0,
  t: 0, shake: 0, stop: 0, score: 0, lives: 2, turtle: 0, hazT: 300, goT: 0, clearT: 0, introT: 0, bonus: 0, conts: 0,
  flash: 0, god: location.hash === '#god', done: store.get('done', []), best: store.get('best', 0)
};
let P = null, ents = [], projs = [], items = [], props = [], parts = [], hazards = [], texts = [];
window.__G = G;

function setScene(s) {
  G.scene = s; G.sel = 0; ctl.hidden = s !== 'play';
  tb.a = tb.b = tb.s = false; stick.id = null; stick.dx = stick.dy = 0; base.classList.remove('on'); base.style.left = base.style.top = '';
  for (const id of ['btnA', 'btnB', 'btnS']) $(id).classList.remove('down');
}
function togglePause() {
  if (G.scene === 'play') { setScene('paused'); Music.stop(); }
  else if (G.scene === 'paused') { setScene('play'); Music.start(G.bossStage === 1 || G.bossStage === 3 ? 'boss' : 'l' + G.lvl); }
}
let wakeLock = null;
function keepAwake() { try { if (navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(w => { wakeLock = w; w.addEventListener('release', () => { wakeLock = null; }); }).catch(() => { }); } catch (e) { } }

function colorsFor(e) {
  if (e.pl) return { skin: '#55a83a', shell: '#7a5226', plas: '#e6c35c', pad: '#7d4f24', band: e.t.color, belt: '#6b4220', dual: e.t.weapon !== 'bo', weapon: e.t.weapon, leg: '#55a83a', arm: '#55a83a' };
  if (e.boss) {
    const B = {
      rhino: { skin: '#8c949e', leg: '#3e5d7a', arm: '#8c949e', torso: '#5b3a1d', acc: '#c9a33a' },
      boar: { skin: '#9a6446', leg: '#3a3a52', arm: '#9a6446', torso: '#5a2d73', acc: '#d02a2a' },
      fly: { skin: '#a6b36a', leg: '#595f6e', arm: '#a6b36a', torso: '#e8ece6', acc: '#c2261c' },
      samurai: { skin: '#2a2a36', leg: '#2a2a36', arm: '#2a2a36', torso: '#2a2a36', acc: '#c42b2b' },
      blade: { skin: '#aeb4c2', leg: '#8a90a0', arm: '#aeb4c2', torso: '#9aa0ae', acc: '#5a1f78' },
      brain: { skin: '#6f8fba', leg: '#5a78a2', arm: '#6f8fba', torso: '#5a78a2', acc: '#f08ab0' }
    }[e.key];
    return Object.assign({ weapon: e.def.weapon }, B);
  }
  const d = e.def, s = d.suit || '#777777';
  return { suit: s, leg: s, arm: s, torso: s, mask: d.mask || '#1c1622', weapon: d.weapon };
}
function makePlayer(ti) {
  const p = { pl: true, t: TURTLES[ti], x: G.cam + 70, y: 214, z: 0, vx: 0, vz: 0, face: 1, state: 'idle', st: 0, anim: 0, hp: 100, inv: 60, combo: 0, comboT: 0, queued: false, hit: new Set(), jk: false, hw: 10, jvx: 0, jvy: 0 };
  p.C = colorsFor(p); return p;
}

// ---------------------------------------------------------------- ефекти
function shake(v) { G.shake = Math.max(G.shake, v); }
function spark(x, y, z, n, col) {
  for (let i = 0; i < n; i++) parts.push({ k: 'spark', x, y, z, vx: rnd(-2.6, 2.6), vy: rnd(-0.4, 0.4), vz: rnd(0.5, 3.6), life: rnd(10, 20), max: 20, col: col || '#fff6a0', sz: rnd(1, 2.2) });
  parts.push({ k: 'burst', x, y, z, vx: 0, vy: 0, vz: 0, life: 8, max: 8, col: col || '#fff' });
  if (n >= 8) parts.push({ k: 'ring', x, y, z, vx: 0, vy: 0, vz: 0, life: 12, max: 12, col: col || '#fff' });
}
function dust(x, y, n) { for (let i = 0; i < n; i++) parts.push({ k: 'dust', x: x + rnd(-6, 6), y: y + rnd(-2, 2), z: 1, vx: rnd(-0.8, 0.8), vy: 0, vz: rnd(0, 0.5), life: rnd(18, 30), max: 30, col: 'rgba(200,190,170,', sz: rnd(3, 6) }); }
function debris(x, y, z, col, n) { for (let i = 0; i < n; i++) parts.push({ k: 'chunk', x, y, z, vx: rnd(-2.5, 2.5), vy: rnd(-0.6, 0.6), vz: rnd(1.5, 4.5), life: rnd(25, 45), max: 45, col, sz: rnd(2, 4), rot: rnd(TAU) }); }
function addText(x, y, z, txt, col) { texts.push({ x, y, z, txt, col: col || '#ffd23f', life: 50 }); }

// ---------------------------------------------------------------- физика и удари
function physics(e) {
  if (e.z > 0 || e.vz > 0) {
    e.vz -= GRAV; e.z += e.vz;
    if (e.z <= 0) { const v = e.vz; e.z = 0; e.vz = 0; onLand(e, v); }
  }
}
function onLand(e, v) {
  if (e.state === 'down' || e.state === 'dying') {
    if (v < -2.6) { e.vz = -v * 0.32; e.z = 0.1; dust(e.x, e.y, 3); Snd.play('land'); }
    return;
  }
  if (e.pl) {
    if (e.state === 'jump' || e.state === 'respawn') { e.state = 'idle'; e.st = 0; dust(e.x, e.y, 3); Snd.play('land'); }
    return;
  }
  if (e.state === 'leap') { e.state = 'recover'; e.st = 0; }
  else if (e.state === 'drop') { e.state = 'idle'; e.st = 0; dust(e.x, e.y, 5); if (e.boss) { shake(8); Snd.play('boom'); e.think = 40; } }
  else if (e.boss && e.move === 'slam' && e.phase === 1) { e.phase = 2; e.st = 0; }
}
function canHit(att, tgt, reach, back = 6, depth = 13, zr = 30) {
  const dx = (tgt.x - att.x) * att.face;
  return dx > -back - tgt.hw && dx < reach * 1.1 + tgt.hw && Math.abs(tgt.y - att.y) < depth + (tgt.boss ? 5 : 0) && Math.abs(tgt.z - att.z) < zr;
}
const hittable = e => !e.ghost && e.hp > 0 && !['down', 'getup', 'dead', 'dying', 'enter', 'drop'].includes(e.state);
function playerStrike(p, reach, dmg, knock, around) {
  for (const e of ents) {
    if (!hittable(e) || p.hit.has(e)) continue;
    const ok = around ? (Math.abs(e.x - p.x) < reach + e.hw && Math.abs(e.y - p.y) < 16 && Math.abs(e.z - p.z) < 34) : canHit(p, e, reach);
    if (ok) { p.hit.add(e); hurtEnemy(e, dmg, knock, e.x >= p.x ? 1 : -1); G.score += 10; }
  }
  for (const o of props) {
    if (o.broken || p.hit.has(o)) continue;
    const ok = around ? Math.abs(o.x - p.x) < reach + o.hw && Math.abs(o.y - p.y) < 16 : canHit(p, o, reach, 6, 14, 40);
    if (ok) { p.hit.add(o); hitProp(o); }
  }
}
function hurtEnemy(e, dmg, knock, dir, quiet) {
  e.hp -= dmg; e.flash = 8;
  if (!quiet) { G.stop = Math.max(G.stop, knock ? 5 : 3); Snd.play(knock ? 'hit2' : 'hit'); shake(knock ? 3 : 1.5); }
  spark(e.x - dir * 4, e.y, e.z + (e.boss ? 26 * e.sc : 20), knock ? 9 : 5);
  if (e.boss) {
    if (e.hp <= 0) { killBoss(e); return; }
    if ((e.state === 'idle' || e.state === 'walk') && e.flinchCd <= 0) { e.state = 'hurt'; e.st = 0; e.flinchCd = 50; e.vx = dir * 1.5; }
    return;
  }
  if (e.hp <= 0 || knock) {
    e.state = 'down'; e.st = 0; e.vx = dir * (knock ? 3.2 : 2.2); e.vz = knock ? 3.4 : 2.6; e.z = Math.max(e.z, 0.1); e.face = -dir;
    if (e.hp <= 0) { G.score += e.def.score; addText(e.x, e.y, 46, '+' + e.def.score); }
  } else {
    e.state = 'hurt'; e.st = 0; e.vx = dir * 1.2; e.face = -dir; if (e.z > 0) e.vz = Math.max(e.vz, 1.2);
  }
}
function hurtPlayer(p, dmg, knock, dir) {
  if (p.inv > 0 || ['down', 'getup', 'special', 'dead', 'respawn'].includes(p.state)) return false;
  if (G.god) dmg = 0;
  p.hp = Math.max(0, p.hp - dmg); p.flash = 8;
  Snd.play('hurt'); shake(knock ? 4 : 2); G.stop = Math.max(G.stop, 4); spark(p.x, p.y, p.z + 22, 6, '#ff7a50');
  if (p.hp <= 0 || knock) { p.state = 'down'; p.st = 0; p.vx = dir * 2.6; p.vz = 3.2; p.z = Math.max(p.z, 0.1); p.face = -dir; }
  else { p.state = 'hurt'; p.st = 0; p.vx = dir * 1.4; p.face = -dir; }
  p.combo = 0; p.jk = false; return true;
}
function strikeOnce(e, reach, dmg, knock) {
  if (e.hitDone || !P) return;
  if (canHit(e, P, reach) && hurtPlayer(P, dmg, knock, e.face)) e.hitDone = true;
}
const PROJ = { star: [3.6, 5], laser: [5, 8], bullet: [4.6, 6], acid: [3, 7], knife: [4.8, 8], blade: [4, 8], orb: [2.6, 10] };
function shoot(x, y, z, face, type, vy = 0) {
  const [sp, dmg] = PROJ[type];
  projs.push({ type, x, y, z, vx: face * sp, vy, life: 240, dmg, t: 0 });
}

// ---------------------------------------------------------------- играч
function startAttack(p) {
  const cont = (p.state === 'attack' || p.comboT > 0) && p.combo < 3;
  p.combo = cont ? p.combo + 1 : 1; p.state = 'attack'; p.st = 0; p.queued = false; p.hit.clear();
}
function startSpecial(p) {
  p.hp = Math.max(1, p.hp - Math.min(6, p.hp - 1));
  p.state = 'special'; p.st = 0; p.hit.clear(); Snd.play('special'); G.flash = 4;
}
function updPlayer(p) {
  p.st++; p.anim++; if (p.inv > 0) p.inv--; if (p.flash > 0) p.flash--;
  if (p.comboT > 0) p.comboT--; else if (p.state !== 'attack') p.combo = 0;
  const T = p.t, sp = T.spd;
  physics(p);
  switch (p.state) {
    case 'idle': case 'walk': {
      const mx = inp.x, my = inp.y;
      p.x += mx * sp; p.y += my * sp * 0.62;
      if (Math.abs(mx) > 0.2) p.face = mx > 0 ? 1 : -1;
      p.state = (Math.abs(mx) > 0.15 || Math.abs(my) > 0.15) ? 'walk' : 'idle';
      if (take('s')) startSpecial(p);
      else if (take('a')) startAttack(p);
      else if (take('b')) { p.state = 'jump'; p.st = 0; p.vz = 5.6; p.z = 0.1; p.jk = false; p.jvx = mx * sp * 1.05; p.jvy = my * sp * 0.45; Snd.play('jump'); }
      break;
    }
    case 'jump':
      p.x += p.jvx + inp.x * 0.35; p.y += p.jvy;
      if (!p.jk && Math.abs(inp.x) > 0.3) p.face = sgn(inp.x);
      if (!p.jk && take('a')) { p.jk = true; p.hit.clear(); Snd.play('swing'); }
      if (p.jk) playerStrike(p, 30, T.dmg[2] + 2, true);
      break;
    case 'attack': {
      const d = T.atkT + (p.combo === 3 ? 5 : 0), a0 = Math.floor(d * 0.3), a1 = Math.floor(d * 0.68);
      if (p.st === a0) Snd.play('swing');
      if (p.st >= a0 && p.st <= a1) playerStrike(p, T.reach + (p.combo === 3 ? 6 : 0), T.dmg[p.combo - 1], p.combo === 3);
      if (p.st > d * 0.3 && take('a')) p.queued = true;
      if (p.st < a1) p.x += p.face * 0.35;
      if (p.st >= d) {
        if (p.queued && p.combo < 3) startAttack(p);
        else { p.state = 'idle'; p.st = 0; p.comboT = p.combo >= 3 ? 0 : 16; if (p.combo >= 3) p.combo = 0; }
      }
      break;
    }
    case 'special':
      if (p.st % 5 === 0) p.face *= -1;
      p.x += inp.x * sp * 0.6; p.y += inp.y * sp * 0.4;
      if (p.st >= 4 && p.st <= 32) { if (p.st % 10 === 4) p.hit.clear(); playerStrike(p, 34, 9, true, true); }
      if (p.st % 9 === 0) Snd.play('swing');
      if (p.st >= 38) { p.state = 'idle'; p.st = 0; p.inv = Math.max(p.inv, 12); }
      break;
    case 'hurt': p.x += p.vx; p.vx *= 0.85; if (p.st >= 16) { p.state = 'idle'; p.st = 0; } break;
    case 'down':
      p.x += p.vx; p.vx *= p.z > 0 ? 0.99 : 0.8;
      if (p.st >= 55 && p.z <= 0) { if (p.hp <= 0) loseLife(p); else { p.state = 'getup'; p.st = 0; } }
      break;
    case 'getup': if (p.st >= 18) { p.state = 'idle'; p.st = 0; p.inv = 70; } break;
    case 'respawn': p.x += inp.x * sp * 0.5; break;
  }
  p.y = clamp(p.y, FT, FB); p.x = clamp(p.x, G.cam + 12, G.cam + W - 12);
}
function loseLife(p) {
  Snd.play('die');
  if (G.lives <= 0) { p.state = 'dead'; p.st = 0; setScene('gameover'); Music.stop(); return; }
  G.lives--; p.hp = 100; p.state = 'respawn'; p.st = 0; p.z = 190; p.vz = 0; p.x = G.cam + W * 0.3; p.inv = 150; p.combo = 0;
  addText(p.x, p.y, 60, 'ОЩЕ ВЕДНЪЖ!', '#7dff7d');
}

// ---------------------------------------------------------------- врагове
function spawnEnemy(code, side, drop) {
  const d = EDEF[code];
  const e = { def: d, code, x: side < 0 ? G.cam - 26 : G.cam + W + 26, y: rnd(FT + 4, FB - 4), z: 0, vx: 0, vz: 0, face: side < 0 ? 1 : -1, state: 'enter', st: 0, anim: rnd(100) | 0, hp: d.hp, maxhp: d.hp, atkCd: rnd(30, 90), hw: 9, off: rnd(-30, 30), flash: 0, sc: 1 };
  if (drop) { e.x = G.cam + rnd(60, W - 60); e.z = 170; e.state = 'drop'; }
  e.C = colorsFor(e); ents.push(e); return e;
}
function updEnemy(e, engaged) {
  e.st++; e.anim++; if (e.flash > 0) e.flash--; e.atkCd--;
  physics(e);
  const d = e.def, p = P, dx = p.x - e.x, dy = p.y - e.y, adx = Math.abs(dx), ady = Math.abs(dy);
  const pOK = !['down', 'dead', 'respawn', 'getup'].includes(p.state);
  const faceP = () => { if (adx > 2) e.face = dx > 0 ? 1 : -1; };
  const wu = Math.round(d.windup * (1 - G.lvl * 0.04));
  switch (e.state) {
    case 'enter': {
      faceP(); const tx = e.x < G.cam + W / 2 ? G.cam + 30 : G.cam + W - 30;
      e.x += sgn(tx - e.x) * Math.max(1, d.spd * 1.2);
      if (Math.abs(tx - e.x) < 3) { e.state = 'idle'; e.st = 0; }
      break;
    }
    case 'drop': break;
    case 'idle': case 'walk': {
      if (d.ranged && e.atkCd <= 0 && pOK && adx > 50 && adx < 280 && ady < 10) { faceP(); e.state = 'shoot'; e.st = 0; break; }
      if (d.leap && engaged && pOK && e.atkCd <= 0 && adx < 100 && adx > 30 && ady < 12) { faceP(); e.state = 'leapw'; e.st = 0; break; }
      if (d.dash && engaged && pOK && e.atkCd <= 0 && adx > 70 && adx < 170 && ady < 8) { faceP(); e.state = 'dashw'; e.st = 0; break; }
      const side = e.x < p.x ? -1 : 1;
      let gx, gy;
      if (engaged && pOK) { gx = p.x + side * (d.reach * 0.8 + 6); gy = p.y; }
      else if (d.ranged) { gx = p.x + side * 150 + e.off; gy = e.atkCd < 50 ? p.y : p.y + Math.sin(e.anim * 0.02 + e.off) * 24; }
      else { gx = p.x + side * (90 + Math.abs(e.off)); gy = p.y + Math.sin(e.anim * 0.013 + e.off) * 30; }
      gx = clamp(gx, G.cam + 14, G.cam + W - 14); gy = clamp(gy, FT, FB);
      const mx = gx - e.x, my = gy - e.y, spd = d.spd * (engaged ? 1 : 0.7);
      let moving = false;
      if (Math.abs(mx) > 3) { e.x += sgn(mx) * Math.min(spd, Math.abs(mx)); moving = true; }
      if (Math.abs(my) > 2) { e.y += sgn(my) * Math.min(spd * 0.6, Math.abs(my)); moving = true; }
      e.state = moving ? 'walk' : 'idle';
      faceP();
      if (engaged && pOK && e.atkCd <= 0 && adx < d.reach + 12 && ady < 9) { e.state = 'windup'; e.st = 0; }
      break;
    }
    case 'windup': if (e.st >= wu) { e.state = 'attack'; e.st = 0; e.hitDone = false; Snd.play('swing'); } break;
    case 'attack': if (e.st <= 6) strikeOnce(e, d.reach, d.dmg, false); if (e.st >= 20) { e.state = 'idle'; e.st = 0; e.atkCd = rnd(50, 100) * (1 - G.lvl * 0.05); } break;
    case 'shoot':
      if (e.st === 18) { shoot(e.x + e.face * 12, e.y, e.z + 22, e.face, d.ranged.type); Snd.play(d.ranged.type === 'laser' ? 'laser' : 'shoot'); }
      if (e.st >= 34) { e.state = 'idle'; e.st = 0; e.atkCd = d.ranged.cd * rnd(0.7, 1.3); }
      break;
    case 'leapw': if (e.st >= 16) { e.state = 'leap'; e.st = 0; e.vz = 3.6; e.z = 0.1; e.vx = e.face * 2.8; e.hitDone = false; } break;
    case 'leap': e.x += e.vx; strikeOnce(e, 14, d.dmg, false); break;
    case 'dashw': if (e.st >= 24) { e.state = 'dash'; e.st = 0; e.hitDone = false; Snd.play('swing'); } break;
    case 'dash': e.x += e.face * 4.6; strikeOnce(e, 20, d.dmg, true); if (e.st >= 24 || e.x < G.cam + 10 || e.x > G.cam + W - 10) { e.state = 'recover'; e.st = 0; } break;
    case 'recover': if (e.st >= 24) { e.state = 'idle'; e.st = 0; e.atkCd = rnd(60, 120); } break;
    case 'hurt': e.x += e.vx; e.vx *= 0.8; if (e.st >= 14) { e.state = 'idle'; e.st = 0; e.atkCd = Math.max(e.atkCd, 16); } break;
    case 'down': e.x += e.vx; e.vx *= e.z > 0 ? 0.99 : 0.82; if (e.st >= 48 && e.z <= 0) { e.state = e.hp <= 0 ? 'dead' : 'getup'; e.st = 0; } break;
    case 'getup': if (e.st >= 16) { e.state = 'idle'; e.st = 0; e.atkCd = 30; } break;
    case 'dead': if (e.st >= 36) e.remove = true; break;
  }
  if (e.state !== 'enter') { e.y = clamp(e.y, FT, FB); if (!['dead', 'down'].includes(e.state)) e.x = clamp(e.x, G.cam - 10, G.cam + W + 10); }
}

// ---------------------------------------------------------------- шефове
function spawnBoss(key, k) {
  const d = BDEF[key], hp = Math.round(d.hp * (G.duo ? 0.65 : 1));
  const e = { boss: true, key, def: d, sc: d.scale, x: k ? G.cam - 40 : G.cam + W + 40, y: k ? FT + 18 : FB - 22, z: 0, vx: 0, vz: 0, face: k ? 1 : -1, state: 'enter', st: 0, anim: 0, hp, maxhp: hp, hw: 11 * d.scale, think: 60, flinchCd: 0, move: null, phase: 0, flash: 0, fly: key === 'fly' };
  if (key === 'brain') { e.x = G.cam + W * 0.68; e.y = (FT + FB) / 2; e.z = 230; e.state = 'drop'; }
  if (e.fly) e.z = 22;
  e.C = colorsFor(e); ents.push(e); return e;
}
function killBoss(e) {
  e.hp = 0; e.state = 'dying'; e.st = 0; e.vx = -e.face * 2; e.ghost = false; e.move = null;
  G.score += 5000; addText(e.x, e.y, 70, '+5000'); Snd.play('roar'); shake(6); G.stop = 12; G.flash = 10;
  if (G.bosses.every(b => b.hp <= 0)) for (const m of ents) if (!m.boss && m.hp > 0) hurtEnemy(m, 999, true, m.x > e.x ? 1 : -1, true);
}
function pickMove(e) {
  const mv = e.def.moves; let tot = 0; for (const k in mv) tot += mv[k];
  let r = Math.random() * tot, m = 'melee';
  for (const k in mv) { r -= mv[k]; if (r <= 0) { m = k; break; } }
  if (m === 'summon' && ents.filter(x => !x.boss && x.hp > 0).length >= 2) m = 'melee';
  e.state = 'move'; e.move = m; e.phase = 0; e.st = 0; e.hitDone = false; e.shots = 0;
}
function updBoss(e) {
  e.st++; e.anim++; if (e.flash > 0) e.flash--; if (e.flinchCd > 0) e.flinchCd--;
  const d = e.def, p = P, rage = e.hp < e.maxhp * 0.5 ? 1.25 : 1;
  if (e.fly && e.state !== 'dying') { const tz = e.move === 'melee' && e.phase === 2 ? 8 : 22 + Math.sin(e.anim * 0.08) * 5; e.z += (tz - e.z) * 0.12; }
  else if (e.fly) { e.z = Math.max(0, e.z - 1.5); }
  else physics(e);
  const dx = p.x - e.x, dy = p.y - e.y, adx = Math.abs(dx);
  const pOK = !['down', 'dead', 'respawn', 'getup'].includes(p.state);
  switch (e.state) {
    case 'enter': {
      if (adx > 4) e.face = dx > 0 ? 1 : -1;
      const tx = e.x < G.cam + W / 2 ? G.cam + 70 : G.cam + W - 70;
      e.x += sgn(tx - e.x) * 1.3;
      if (Math.abs(tx - e.x) < 3) { e.state = 'idle'; e.st = 0; e.think = 50; }
      break;
    }
    case 'drop': break;
    case 'idle': case 'walk': {
      if (adx > 4) e.face = dx > 0 ? 1 : -1;
      e.think -= rage;
      const gx = p.x - sgn(dx || 1) * (d.reach + 30), gy = p.y;
      let mv = false;
      if (Math.abs(gx - e.x) > 6) { e.x += sgn(gx - e.x) * d.spd * 0.6 * rage; mv = true; }
      if (Math.abs(gy - e.y) > 3) { e.y += sgn(gy - e.y) * d.spd * 0.4 * rage; mv = true; }
      e.state = mv ? 'walk' : 'idle';
      if (e.think <= 0 && pOK) pickMove(e);
      break;
    }
    case 'hurt': e.x += e.vx; e.vx *= 0.8; if (e.st >= 12) { e.state = 'idle'; e.st = 0; e.think = Math.min(e.think, 24); } break;
    case 'move': doMove(e, rage); break;
    case 'dying':
      e.x += e.vx; e.vx *= 0.92;
      if (e.st % 8 === 0) { spark(e.x + rnd(-20, 20), e.y, e.z + rnd(10, 50), 8, '#ffb040'); Snd.play('hit2'); }
      if (e.st >= 90) { for (let i = 0; i < 4; i++) spark(e.x + rnd(-24, 24), e.y, rnd(10, 60), 12, '#ff9030'); dust(e.x, e.y, 10); Snd.play('boom'); shake(8); e.gone = true; e.remove = true; }
      break;
  }
  e.y = clamp(e.y, FT, FB); if (e.state !== 'enter') e.x = clamp(e.x, G.cam + 16, G.cam + W - 16);
}
function doMove(e, rage) {
  const d = e.def, p = P, dx = p.x - e.x, dy = p.y - e.y, adx = Math.abs(dx), ady = Math.abs(dy);
  const end = cool => { e.state = 'idle'; e.st = 0; e.think = cool / rage + rnd(0, 30); e.move = null; e.ghost = false; };
  const next = () => { e.phase++; e.st = 0; };
  const faceP = () => { if (adx > 4) e.face = dx > 0 ? 1 : -1; };
  switch (e.move) {
    case 'melee':
      if (e.phase === 0) {
        faceP();
        const gx = p.x - e.face * (d.reach * 0.7 + e.hw * 0.4);
        if (Math.abs(gx - e.x) > 4) e.x += sgn(gx - e.x) * d.spd * 1.4 * rage;
        if (ady > 3) e.y += sgn(dy) * d.spd * 0.8;
        if ((Math.abs(gx - e.x) < 8 && ady < 8) || e.st > 110) next();
      } else if (e.phase === 1) { if (e.st >= Math.round(22 / rage)) { next(); e.hitDone = false; Snd.play('swing'); } }
      else if (e.phase === 2) { if (e.st <= 8) strikeOnce(e, d.reach, d.dmg, true); if (e.st >= 28) end(40); }
      break;
    case 'charge':
      if (e.phase === 0) {
        if (ady > 2) e.y += sgn(dy) * 1.2; faceP();
        if (e.st % 10 === 0) dust(e.x - e.face * 10, e.y, 2);
        if (e.st >= 42) { next(); e.hitDone = false; Snd.play('roar'); }
      } else if (e.phase === 1) {
        e.x += e.face * 5.2 * rage; strikeOnce(e, 20, d.dmg, true);
        if (e.st % 4 === 0) dust(e.x - e.face * 12, e.y, 1);
        if (e.x <= G.cam + 18 || e.x >= G.cam + W - 18 || e.st > 120) { shake(4); next(); }
      } else if (e.st >= 32) end(40);
      break;
    case 'shoot':
      if (e.phase === 0) { faceP(); if (ady > 2) e.y += sgn(dy) * 1; if (e.st >= 26) next(); }
      else if (e.phase === 1) {
        const n = e.key === 'rhino' || e.key === 'boar' ? 5 : 3, iv = 12;
        if (e.st % iv === 1 && e.shots < n) {
          const k = e.shots++, vy = n === 3 ? (k - 1) * 0.5 : clamp((p.y - e.y) / 80, -0.5, 0.5);
          shoot(e.x + e.face * e.hw, e.y, e.z + 24 * e.sc, e.face, d.shot, vy); Snd.play('shoot');
        }
        if (e.shots >= n && e.st > iv * n) next();
      } else if (e.st >= 26) end(50);
      break;
    case 'slam':
      if (e.phase === 0) { if (e.st === 18) { e.vz = 7.5; e.z = 0.1; e.tx = p.x; e.ty = p.y; next(); } }
      else if (e.phase === 1) { e.x += (e.tx - e.x) * 0.06; e.y += (e.ty - e.y) * 0.06; if (e.st > 120) { e.phase = 2; e.st = 0; } }
      else {
        if (e.st === 1) {
          shake(7); Snd.play('boom'); dust(e.x, e.y, 14);
          if (p.z < 8 && Math.abs(p.x - e.x) < 72 && Math.abs(p.y - e.y) < 28) hurtPlayer(p, d.dmg, true, p.x > e.x ? 1 : -1);
        }
        if (e.st >= 36) end(50);
      }
      break;
    case 'summon':
      if (e.st === 30) { spawnEnemy(d.minion, 1, false); spawnEnemy(d.minion, -1, false); Snd.play('roar'); }
      if (e.st >= 52) end(60);
      break;
    case 'teleport':
      if (e.phase === 0) {
        e.ghost = e.st > 16;
        if (e.st >= 28) {
          const side = Math.random() < 0.5 ? -1 : 1;
          e.x = clamp(p.x + side * (d.reach * 0.7 + e.hw), G.cam + 20, G.cam + W - 20); e.y = p.y; e.face = p.x > e.x ? 1 : -1; next();
        }
      } else { e.ghost = e.st < 8; if (e.st >= 20) { e.move = 'melee'; e.phase = 2; e.st = 0; e.hitDone = false; e.ghost = false; Snd.play('swing'); } }
      break;
    case 'laser':
      if (e.phase === 0) { if (ady > 2) e.y += sgn(dy) * 1.1; faceP(); if (e.st >= 22) { next(); Snd.play('warn'); } }
      else if (e.phase === 1) { if (e.st >= 36) { next(); e.hitDone = false; Snd.play('laser'); shake(3); } }
      else {
        if (!e.hitDone && Math.abs(p.y - e.y) < 9 && p.z < 30 && (p.x - e.x) * e.face > 0 && hurtPlayer(p, d.dmg, true, e.face)) e.hitDone = true;
        if (e.st >= 30) end(50);
      }
      break;
  }
}

// ---------------------------------------------------------------- предмети, опасности
function hitProp(o) {
  o.hp--; o.shake = 8; Snd.play('break');
  debris(o.x, o.y, 12, o.type === 'crate' ? '#9b6a35' : '#4a6fa8', 4);
  if (o.hp <= 0) {
    o.broken = true; debris(o.x, o.y, 14, o.type === 'crate' ? '#b07a40' : '#5a80b8', 10); G.score += 50;
    if (o.drop) items.push({ type: o.drop, x: o.x, y: o.y, z: 10, vz: 2.5, life: 900 });
  }
}
function spawnHazard(k) {
  if (!P) return;
  if (k === 'car') {
    const y = clamp(P.y + rnd(-6, 6), FT + 6, FB - 6), dir = Math.random() < 0.5 ? 1 : -1;
    hazards.push({ k: 'car', y, dir, t: 0, warn: 85, x: dir > 0 ? G.cam - 90 : G.cam + W + 90, hit: new Set(), col: ['#c33', '#dc3', '#39c', '#ddd'][rnd(4) | 0] });
    Snd.play('horn');
  } else if (k === 'laser') {
    hazards.push({ k: 'laser', y: clamp(P.y + rnd(-4, 4), FT + 4, FB - 4), t: 0, warn: 70, dur: 36, hit: new Set() }); Snd.play('warn');
  } else {
    const x = clamp(P.x + rnd(-50, 50), G.cam + 20, G.cam + W - 20), y = clamp(P.y + rnd(-14, 14), FT, FB);
    hazards.push({ k: 'fall', vis: k, x, y, t: 0, warn: 62, z: 230, done: false });
  }
}
function hazardHits(h, test, dmg, dir) {
  if (P && test(P) && !h.hit?.has(P)) { if (hurtPlayer(P, dmg, true, dir(P))) h.hit?.add(P); }
  for (const e of ents) if (!e.boss && hittable(e) && test(e) && !h.hit?.has(e)) { h.hit?.add(e); hurtEnemy(e, 14, true, dir(e), true); }
}
function updHazards() {
  for (const h of hazards) {
    h.t++;
    if (h.k === 'fall') {
      if (h.t > h.warn) h.z -= 7;
      if (h.z <= 0 && !h.done) {
        h.done = true; h.z = 0; shake(4); Snd.play(h.vis === 'drip' ? 'hit' : 'boom');
        const col = { fire: '#ff8a2a', drip: '#7fd14a', beam: '#c0502a', crate: '#a0703a' }[h.vis] || '#999';
        debris(h.x, h.y, 4, col, 10); dust(h.x, h.y, 5);
        hazardHits(h, e => Math.abs(e.x - h.x) < 18 && Math.abs(e.y - h.y) < 11 && e.z < 20, h.vis === 'drip' ? 8 : 14, e => e.x >= h.x ? 1 : -1);
      }
      if (h.t > h.warn + 60) h.remove = true;
    } else if (h.k === 'car') {
      if (h.t > h.warn) {
        h.x += h.dir * 9;
        hazardHits(h, e => Math.abs(e.y - h.y) < 11 && Math.abs(e.x - h.x) < 38 && e.z < 22, 18, () => h.dir);
        if ((h.dir > 0 && h.x > G.cam + W + 120) || (h.dir < 0 && h.x < G.cam - 120)) h.remove = true;
      }
    } else if (h.k === 'laser') {
      if (h.t > h.warn && h.t < h.warn + h.dur) hazardHits(h, e => Math.abs(e.y - h.y) < 8 && e.z < 26, 12, e => e.x > G.cam + W / 2 ? 1 : -1);
      if (h.t === h.warn) { Snd.play('laser'); shake(2); }
      if (h.t >= h.warn + h.dur) h.remove = true;
    }
  }
  hazards = hazards.filter(h => !h.remove);
}

// ---------------------------------------------------------------- рундове
function startGame(ti, lvl) { G.turtle = ti; G.score = 0; G.lives = 3; G.conts = 0; startLevel(lvl); }
function startLevel(i) {
  const L = LEVELS[i];
  G.lvl = i; ents = []; projs = []; items = []; props = []; parts = []; hazards = []; texts = [];
  G.cam = 0; G.lock = null; G.waveI = 0; G.wave = null; G.bossStage = 0; G.bosses = []; G.duo = L.boss.length > 1;
  G.hazT = 420; G.goT = 0; G.clearT = 0; G.introT = 170; G.b2T = 0; G.shake = 0; G.stop = 0;
  P = makePlayer(G.turtle);
  L.waves.forEach((w, k) => {
    const x = w[0] + 330 + hash(i * 37 + k) * 60;
    if (x < L.len - 200) props.push({ type: L.prop, x, y: FT + 8 + hash(i * 91 + k) * (FB - FT - 16), z: 0, hp: 2, hw: 11, shake: 0, drop: k % 3 === 2 ? 'pizza' : 'slice' });
  });
  setScene('play'); Music.start('l' + i); keepAwake();
}
function updPlay() {
  const L = LEVELS[G.lvl];
  if (G.introT > 0) G.introT--;
  updPlayer(P);
  const dist = e => Math.abs(e.x - P.x) + Math.abs(e.y - P.y) * 2;
  const cands = ents.filter(e => !e.boss && e.hp > 0 && e.state !== 'enter' && e.state !== 'drop').sort((a, b) => dist(a) - dist(b));
  const eng = new Set(); let n = 0;
  for (const e of cands) { if (e.def.ranged && Math.abs(e.x - P.x) > 50) continue; if (n < L.maxEng) { eng.add(e); n++; } }
  for (const e of ents) e.boss ? updBoss(e) : updEnemy(e, eng.has(e));
  ents = ents.filter(e => !e.remove);

  for (const pr of projs) {
    pr.t++; pr.x += pr.vx; pr.y += pr.vy; pr.z += (20 - pr.z) * 0.04; pr.life--;
    if (pr.y < FT - 4 || pr.y > FB + 4) pr.life = 0;
    if (Math.abs(pr.x - P.x) < 10 && Math.abs(pr.y - P.y) < 9 && Math.abs(P.z + 20 - pr.z) < 24) {
      if (hurtPlayer(P, pr.dmg, pr.type === 'orb' || pr.type === 'blade', sgn(pr.vx))) pr.life = 0;
    }
    if (pr.x < G.cam - 30 || pr.x > G.cam + W + 30) pr.life = 0;
  }
  projs = projs.filter(p => p.life > 0);
  for (const it of items) {
    if (it.z > 0 || it.vz > 0) { it.vz -= GRAV; it.z += it.vz; if (it.z <= 0) { it.z = 0; it.vz = 0; } }
    it.life--;
    if (P.state !== 'down' && P.state !== 'dead' && P.z < 12 && Math.abs(it.x - P.x) < 15 && Math.abs(it.y - P.y) < 11) {
      it.life = 0; const heal = it.type === 'pizza' ? 100 : 35; P.hp = Math.min(100, P.hp + heal);
      Snd.play('pickup'); addText(it.x, it.y, 30, it.type === 'pizza' ? 'ПИЦА!' : '+' + heal, '#7dff7d'); G.score += 100;
    }
  }
  items = items.filter(i => i.life > 0);
  for (const o of props) if (o.shake > 0) o.shake--;
  props = props.filter(o => !o.broken);
  for (const q of parts) {
    q.life--; q.x += q.vx; q.y += q.vy;
    if (q.k === 'dust') { q.z += q.vz; q.sz += 0.15; }
    else if (q.k !== 'burst') { q.z += q.vz; q.vz -= 0.18; if (q.z < 0) { q.z = 0; q.vz *= -0.4; q.vx *= 0.6; } }
  }
  parts = parts.filter(q => q.life > 0);
  for (const t of texts) { t.life--; t.z += 0.5; }
  texts = texts.filter(t => t.life > 0);
  updHazards();

  // камера
  let maxCam = L.len - W; if (G.lock !== null) maxCam = Math.min(maxCam, G.lock);
  const want = P.x - W * 0.45;
  if (want > G.cam) G.cam = Math.min(G.cam + 2.6, want, maxCam);
  G.cam = Math.max(0, G.cam);
  if (G.goT > 0) G.goT--;

  // вълни
  if (!G.wave) {
    if (G.waveI < L.waves.length) {
      const at = Math.min(L.waves[G.waveI][0], L.len - W);
      if (G.cam >= at) { G.wave = { q: L.waves[G.waveI][1].split(''), n: 0 }; G.lock = G.cam; G.spawnT = 0; G.goT = 0; }
    } else if (G.bossStage === 0 && G.cam >= L.len - W - 1) startBoss(L.boss);
  } else {
    G.spawnT--;
    const alive = ents.filter(e => e.hp > 0).length;
    if (G.wave.q.length && alive < L.maxAlive && G.spawnT <= 0) {
      const c = G.wave.q.shift(), k = G.wave.n++;
      spawnEnemy(c, k % 2 ? -1 : 1, c !== 'r' && hash(G.lvl * 131 + G.waveI * 17 + k) < 0.18);
      G.spawnT = k < L.maxAlive ? 14 : 50;
    }
    if (!G.wave.q.length && alive === 0) { G.wave = null; G.lock = null; G.waveI++; G.goT = 170; }
  }
  // шефове
  if ((G.bossStage === 1 || G.bossStage === 3) && G.bosses.every(b => b.gone)) {
    for (const m of ents) if (m.hp > 0) hurtEnemy(m, 999, true, 1, true);
    if (G.bossStage === 1 && L.boss2) { G.bossStage = 2; G.b2T = 150; Music.stop(); }
    else { G.bossStage = 4; G.clearT = 0; Music.stop(); Snd.play('clear'); }
  }
  if (G.bossStage === 2 && --G.b2T <= 0) startBoss(L.boss2);
  if (G.bossStage === 4 && ++G.clearT >= 150) finishLevel();

  if (L.hazard && G.introT <= 0 && P.state !== 'dead' && G.bossStage !== 4) {
    if (--G.hazT <= 0) { spawnHazard(L.hazard); G.hazT = rnd(280, 480) * (G.bossStage ? 1.4 : 1); }
  }
}
function startBoss(list) {
  G.bossStage = G.bossStage === 2 ? 3 : 1; G.lock = LEVELS[G.lvl].len - W;
  G.bosses = list.map((b, k) => spawnBoss(b, k));
  G.banner = { txt: list.map(b => BDEF[b].name).join(' И '), t: 160 };
  Music.start('boss'); Snd.play('roar');
}
function finishLevel() {
  G.bonus = P.hp * 20 + G.lives * 500; G.score += G.bonus;
  if (!G.done.includes(G.lvl)) { G.done.push(G.lvl); store.set('done', G.done); }
  if (G.score > G.best) { G.best = G.score; store.set('best', G.best); }
  setScene('clear');
}

// ---------------------------------------------------------------- тикове
function updMenu() {
  const n = UI.btns.length; if (!n) return;
  const c = UI.cols || 1;
  if (inp.right) G.sel = (G.sel + 1) % n;
  if (inp.left) G.sel = (G.sel - 1 + n) % n;
  if (inp.down) G.sel = Math.min(n - 1, G.sel + c);
  if (inp.up) G.sel = Math.max(0, G.sel - c);
  if (inp.ok && UI.btns[G.sel]) { Snd.play('select'); UI.btns[G.sel].fn(); }
}
function tick() {
  if (window.__bot) window.__bot();
  readInput(); G.t++;
  if (G.scene === 'play') {
    if (G.stop > 0) G.stop--; else updPlay();
  } else if (G.scene !== 'intro') {
    updMenu();
    if (G.scene === 'ending' || G.scene === 'title') for (const q of parts) { q.life--; q.x += q.vx; q.y += q.vy; }
  }
  if (G.banner && G.banner.t > 0) G.banner.t--;
  G.shake *= 0.86; if (G.shake < 0.2) G.shake = 0;
  if (G.flash > 0) G.flash--;
}


function pose(e) {
  const t = e.anim, P = { lf: 0.22, kf: 0.25, lb: -0.22, kb: 0.25, af: 0.55, ef: 1.1, ab: -0.3, eb: 1.0, wf: 2.3, wb: 2.0, lean: 0, crouch: 0, rot: 0, hx: 0, trail: null };
  let st = e.state, q = 0;
  if (e.boss && st === 'move') {
    const m = e.move, ph = e.phase;
    st = m === 'melee' ? (ph === 0 ? 'walk' : ph === 1 ? 'windup' : 'attack')
      : m === 'charge' ? (ph === 0 ? 'windup' : ph === 1 ? 'run' : 'recover')
      : m === 'shoot' || m === 'laser' ? 'aim'
      : m === 'slam' ? (ph === 1 ? 'jump' : 'recover')
      : m === 'summon' ? 'summon' : 'idle';
  }
  const walk = (spd, amp) => { const s = Math.sin(t * spd); P.lf = s * amp; P.lb = -s * amp; P.kf = 0.3 + Math.max(0, -s) * 0.8; P.kb = 0.3 + Math.max(0, s) * 0.8; P.af = 0.5 - s * 0.4; P.ab = -0.2 + s * 0.5; P.crouch = Math.abs(Math.cos(t * spd)) * 1.2; };
  switch (st) {
    case 'idle': P.crouch = 1 + Math.sin(t * 0.08) * 0.6; break;
    case 'walk': case 'enter': walk(0.22, 0.7); break;
    case 'run': walk(0.45, 0.9); P.lean = 0.35; P.af = 1.2; P.wf = 1.6; break;
    case 'attack':
      if (e.pl) {
        const d = e.t.atkT + (e.combo === 3 ? 5 : 0); q = e.st / d; const k = e.combo, w = e.t.weapon;
        P.lf = 0.7; P.kf = 0.6; P.lb = -0.6; P.kb = 0.25; P.crouch = 1.5;
        if (w === 'bo' && k === 1) { P.af = lerp(1.1, 1.57, ease(q * 2)); P.ef = lerp(0.7, 0, ease(q * 2)); P.wf = 1.57; P.ab = 1.2; P.eb = 0.3; P.hx = lerp(0, 4, ease(q * 2)); }
        else if (k === 1) { P.af = lerp(2.9, 1.1, ease(q * 1.7)); P.ef = 0.25; P.wf = P.af + 0.5; P.lean = lerp(-0.1, 0.15, q); if (q > 0.25 && q < 0.72) P.trail = [2.9 + 0.5, P.wf]; }
        else if (k === 2) { P.af = lerp(0.6, 2.7, ease(q * 1.7)); P.ef = 0.2; P.wf = P.af + 0.3; P.ab = lerp(-0.4, 1.6, ease(q * 1.7)); P.eb = 0.2; P.wb = P.ab + 0.4; if (q > 0.25 && q < 0.72) P.trail = [0.9, P.wf]; }
        else {
          if (w === 'bo') { P.af = lerp(3.1, 1.2, ease(q * 1.6)); P.ef = 0.1; P.wf = P.af + 0.1; P.lean = 0.2; if (q > 0.25 && q < 0.72) P.trail = [3.2, P.wf]; }
          else { P.lf = lerp(0.2, 1.7, ease(q * 2.2)); P.kf = lerp(1.2, 0.05, ease(q * 2.2)); P.lb = -0.3; P.lean = -0.3; P.af = 2.3; P.wf = 2.9; P.ab = -1.4; P.wb = -1.2; if (q > 0.25 && q < 0.72) P.trail = [2.9, 1.2]; }
        }
      } else {
        q = e.boss ? e.st / 28 : e.st / 20;
        P.af = lerp(2.7, 1.4, ease(q * 3)); P.ef = 0.1; P.wf = P.af + 0.3; P.lean = 0.15; P.lf = 0.6; P.kf = 0.4; P.lb = -0.5;
        if (e.boss && q < 0.4) P.trail = [3.0, P.wf];
      }
      break;
    case 'windup': case 'dashw': case 'leapw':
      P.lean = -0.2; P.af = st === 'dashw' ? -0.6 : 2.8; P.ef = 0.5; P.wf = st === 'dashw' ? -1.1 : 3.1; P.crouch = 2.5; P.lf = 0.5; P.lb = -0.5; P.hx = Math.sin(t * 1.3) * 0.6; break;
    case 'dash': walk(0.5, 0.9); P.lean = 0.45; P.af = 1.6; P.ef = 0; P.wf = 1.6; break;
    case 'recover': P.crouch = 2.5; P.af = 1.2; P.wf = 1.8; break;
    case 'shoot': q = e.st / 34; P.af = q < 0.5 ? 2.8 : 1.4; P.ef = 0.1; P.wf = P.af + 0.2; P.lean = q < 0.5 ? -0.15 : 0.15; break;
    case 'aim': P.af = 1.57; P.ef = 0; P.wf = 1.57; P.ab = 1.3; P.eb = 0.2; P.lf = 0.4; P.lb = -0.4; P.crouch = 1; break;
    case 'summon': P.af = 3.0; P.ab = 2.9; P.ef = 0.2; P.eb = 0.2; P.wf = 3.1; P.crouch = Math.sin(t * 0.3) * 1.5 + 1; break;
    case 'jump': case 'respawn': case 'drop': case 'leap':
      if (e.pl && e.jk) { P.lf = 1.65; P.kf = 0.05; P.lb = -0.4; P.kb = 1.4; P.lean = -0.25; P.af = 2.4; P.ab = -1.8; P.wf = 3.0; P.wb = -1.4; }
      else if (st === 'leap') { P.lf = 1.3; P.kf = 0.1; P.lb = -0.5; P.kb = 1.0; P.af = 1.6; P.ef = 0; }
      else { P.lf = 0.9; P.kf = 1.7; P.lb = 0.3; P.kb = 1.5; P.af = 2.3; P.ef = 0.6; P.wf = 2.8; P.ab = 2.0; }
      break;
    case 'special': P.af = 1.57; P.ef = 0; P.wf = 1.57; P.ab = -1.57; P.eb = 0; P.wb = -1.57; P.lf = 0.45; P.lb = -0.45; P.crouch = 2; P.trail = [-1.57, 4.71]; break;
    case 'hurt': P.lean = -0.4; P.af = 2.4; P.ef = 0.8; P.ab = 2.0; P.lf = -0.3; P.lb = 0.3; P.hx = -2; P.wf = 2.8; break;
    case 'down': case 'dead': case 'dying':
      if (e.boss && st === 'dying' && e.st < 30) { P.lean = -0.5; P.af = 2.6; P.ab = 2.2; break; }
      P.rot = -Math.PI / 2; P.lf = 0.1; P.lb = -0.1; P.kf = 0.2; P.kb = 0.2; P.af = 2.8; P.ab = 3.0; P.wf = 3.2; break;
    case 'getup': q = e.st / (e.pl ? 18 : 16); P.rot = -Math.PI / 2 * (1 - q); P.crouch = 4 * (1 - q); break;
  }
  return P;
}


// ---------------------------------------------------------------- рисуване: помощни
const TONES = new Map();
function tone(c, p) { if (!p) return c; const k = c + p; let v = TONES.get(k); if (v === undefined) { v = shade(c, p); TONES.set(k, v); } return v; }
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
function glow(x, y, r, col, a = 1) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, rgba(col, a)); gr.addColorStop(0.4, rgba(col, a * 0.35)); gr.addColorStop(1, rgba(col, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
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
  if (toes) { g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(len * 0.6, -h * 0.25); g.lineTo(len * 0.97, -h * 0.1); g.moveTo(len * 0.58, h * 0.15); g.lineTo(len * 0.95, h * 0.2); g.stroke(); }
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
function headTurtle(x, y, r, C, t) {
  const tw = Math.sin(t * 0.22) * 1.8, tw2 = Math.sin(t * 0.22 + 1.2) * 1.8;
  // опашки на превръзката
  for (const [ex, ey, w, ph] of [[-r - 9, 2 + tw, 1.8, tw], [-r - 7.5, 7 - tw2, 1.5, tw2]]) {
    const kx = x - r * 0.75, ky = y - 1.2;
    g.beginPath(); g.moveTo(kx, ky - w); g.quadraticCurveTo(x - r - 3, y - 3 + ph * 0.6, x + ex, y + ey - w * 0.3);
    g.lineTo(x + ex - 0.6, y + ey + w * 0.9); g.quadraticCurveTo(x - r - 3, y - 0.5 + ph * 0.6, kx, ky + w); g.closePath();
    outlineFill(vgrad(y - 4, y + 8, [[0, tone(C.band, 30)], [1, tone(C.band, -35)]]), 1.8);
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
  // бузи в сянка отдолу
  g.fillStyle = 'rgba(0,0,0,.14)'; g.beginPath(); g.ellipse(x + 1, y + r * 0.95, r * 1.1, r * 0.35, 0, 0, TAU); g.fill();
  g.restore();
  // очи
  for (const [ox, s] of [[r * 0.68, 1], [r * 0.12, 0.85]]) {
    g.beginPath(); g.ellipse(x + ox, y - r * 0.2, 1.55 * s, 1.15 * s, -0.15, 0, TAU); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 0.6; g.strokeStyle = OUT; g.stroke();
    circ(x + ox + 0.45 * s, y - r * 0.18, 0.62 * s, '#101010', null);
    circ(x + ox + 0.2 * s, y - r * 0.28, 0.25 * s, '#fff', null);
  }
  // уста и ноздра
  g.strokeStyle = OUT; g.lineWidth = 0.8; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x + r * 0.25, y + r * 0.52); g.quadraticCurveTo(x + r * 0.8, y + r * 0.72, x + r * 1.12, y + r * 0.36); g.stroke();
  circ(x + r * 1.08, y + r * 0.05, 0.35, '#1a3a12', null);
}
function headNinja(x, y, r, C, t) {
  const tw = Math.sin(t * 0.2) * 1.5;
  g.beginPath(); g.moveTo(x - r * 0.8, y - 2.4); g.quadraticCurveTo(x - r - 3, y - 2 + tw, x - r - 6, y + 1 + tw); g.lineTo(x - r - 5.5, y + 2.6 + tw); g.quadraticCurveTo(x - r - 2, y + tw, x - r * 0.8, y - 0.6); g.closePath();
  outlineFill(tone(C.suit, -20), 1.6);
  g.beginPath(); g.arc(x, y, r, 0, TAU); outlineFill(ball(x, y, r, C.suit));
  g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
  g.fillStyle = vgrad(y - 3, y + 1.5, [[0, tone(C.mask, 20)], [1, tone(C.mask, -30)]]); g.fillRect(x - r, y - 2.9, r * 2, 3.9);
  g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(x - r, y + r * 0.45, r * 2, r);
  g.restore();
  for (const [ox, s] of [[r * 0.55, 1], [r * 0.08, 0.8]]) {
    g.beginPath(); g.ellipse(x + ox, y - 1, 1.5 * s, 0.75 * s, -0.12, 0, TAU); g.fillStyle = '#fff'; g.fill();
    circ(x + ox + 0.3 * s, y - 1, 0.45 * s, '#111', null);
  }
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 0.6; g.beginPath(); g.arc(x - r * 0.2, y + 0.5, r * 0.75, 1.7, 2.9); g.stroke();
}
function headOf(style, x, y, r, e, t) {
  const C = e.C;
  switch (style) {
    case 'turtle': return headTurtle(x, y, r, C, t);
    case 'ninja': return headNinja(x, y, r, C, t);
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
    g.save(); g.translate(-bw * 0.3, my + 0.6); g.rotate(-0.1);
    const rx = bw * 0.52, ry = th * 0.68;
    g.beginPath(); g.ellipse(0, 0, rx, ry, 0, 0, TAU);
    const sg = g.createRadialGradient(-rx * 0.2, -ry * 0.5, 1, 0, 0, Math.max(rx, ry) * 1.1);
    sg.addColorStop(0, tone(C.shell, 40)); sg.addColorStop(0.5, C.shell); sg.addColorStop(1, tone(C.shell, -50)); outlineFill(sg);
    g.beginPath(); g.ellipse(0, 0, rx * 0.8, ry * 0.82, 0, 0, TAU); g.lineWidth = 1.1; g.strokeStyle = tone(C.shell, 30); g.stroke();
    g.strokeStyle = tone(C.shell, -40); g.lineWidth = 0.7; g.beginPath();
    const hx = -rx * 0.35, hr = ry * 0.32;
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5; const x1 = hx + Math.cos(a) * hr, y1 = Math.sin(a) * hr; if (i === 0) g.moveTo(x1, y1); else g.lineTo(x1, y1); }
    g.closePath();
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.5; g.moveTo(hx + Math.cos(a) * hr, Math.sin(a) * hr); g.lineTo(hx + Math.cos(a) * rx * 0.78, Math.sin(a) * ry * 0.8); }
    g.stroke();
    g.restore();
    torsoPath(shY, hipY, bw, bw * 0.82); outlineFill(bodyGrad(bw, shY, hipY, C.skin));
    g.save(); g.beginPath(); g.ellipse(bw * 0.12, my + 0.6, bw * 0.37, th * 0.52, 0, 0, TAU);
    outlineFill(vgrad(shY, hipY, [[0, tone(C.plas, 35)], [0.5, C.plas], [1, tone(C.plas, -35)]]), 1.8);
    g.clip(); g.strokeStyle = tone(C.plas, -40); g.lineWidth = 0.7; g.beginPath();
    for (let i = 1; i < 4; i++) { const yy = shY + th * i / 4 + 1; g.moveTo(-bw * 0.3, yy); g.lineTo(bw * 0.6, yy + 0.6); }
    g.moveTo(bw * 0.12, shY); g.lineTo(bw * 0.14, hipY); g.stroke();
    g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.ellipse(bw * 0.22, shY + th * 0.25, bw * 0.12, th * 0.12, -0.3, 0, TAU); g.fill();
    g.restore();
    rrect(-bw / 2 + 0.5, hipY - 3, bw - 1, 3.4, 1.2); outlineFill(vgrad(hipY - 3, hipY, [[0, tone(C.belt, 30)], [1, tone(C.belt, -35)]]), 1.6);
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
    case 'ninja':
      g.beginPath(); g.moveTo(-bw * 0.3, shY - 1); g.lineTo(bw * 0.12, my); g.lineTo(bw * 0.42, shY - 1); g.closePath(); g.fillStyle = tone(C.suit, -45); g.fill();
      g.strokeStyle = tone(C.suit, 25); g.lineWidth = 0.8; g.beginPath(); g.moveTo(-bw * 0.3, shY - 1); g.lineTo(bw * 0.12, my); g.stroke();
      rrect(-bw / 2, hipY - 3, bw, 3.2, 1); outlineFill(vgrad(hipY - 3, hipY, [[0, '#3a3040'], [1, '#141018']]), 1.4);
      g.beginPath(); g.moveTo(bw * 0.3, hipY - 1); g.lineTo(bw * 0.2, hipY + 5); g.lineTo(bw * 0.4, hipY + 4.5); g.closePath(); outlineFill('#221c28', 1.2);
      break;
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
  if (style !== 'samurai') return;
  const bw = S.bodyW;
  for (let i = 0; i < 3; i++) {
    const x = -bw / 2 + 1 + i * (bw / 3);
    rrect(x, hipY - 1, bw / 3 - 0.5, 7, 1); outlineFill(vgrad(hipY, hipY + 7, [[0, '#3a3a48'], [1, '#101016']]), 1.4);
    g.strokeStyle = e.C.acc; g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, hipY + 2.5); g.lineTo(x + bw / 3 - 0.5, hipY + 2.5); g.moveTo(x, hipY + 5); g.lineTo(x + bw / 3 - 0.5, hipY + 5); g.stroke();
  }
}

// ---------------------------------------------------------------- модели: сглобяване
const STY = {
  turtle: { leg: 8, torso: 14, bodyW: 15.5, headR: 7.4, arm: 7, lr: [3.6, 3.0, 2.4], ar: [3.0, 2.6, 2.1], hand: 2.6, foot: [6, 2.8] },
  ninja: { leg: 9, torso: 14, bodyW: 12, headR: 6, arm: 7.5, lr: [2.8, 2.3, 1.9], ar: [2.3, 1.9, 1.6], hand: 2.0, foot: [5, 2.2] },
  soldier: { leg: 9, torso: 15, bodyW: 14, headR: 6.4, arm: 7.5, lr: [3.2, 2.7, 2.3], ar: [2.8, 2.3, 2.0], hand: 2.3, foot: [5.5, 2.6] },
  rhino: { leg: 9, torso: 17, bodyW: 20, headR: 8, arm: 8.5, lr: [4.3, 3.6, 3.0], ar: [4.1, 3.5, 3.0], hand: 3.5, foot: [6.5, 3.2] },
  boar: { leg: 9, torso: 17, bodyW: 20, headR: 8, arm: 8.5, lr: [4.2, 3.5, 3.0], ar: [4.0, 3.4, 3.0], hand: 3.4, foot: [6.5, 3.2] },
  fly: { leg: 9, torso: 15, bodyW: 13, headR: 7, arm: 8, lr: [2.4, 2.0, 1.6], ar: [2.0, 1.7, 1.4], hand: 1.9, foot: [5, 2] },
  samurai: { leg: 9, torso: 16, bodyW: 16, headR: 6.5, arm: 8, lr: [3.3, 2.9, 2.5], ar: [3.0, 2.6, 2.2], hand: 2.5, foot: [5.5, 2.6] },
  blade: { leg: 9.5, torso: 16, bodyW: 16, headR: 6.5, arm: 8, lr: [3.3, 2.9, 2.5], ar: [3.0, 2.6, 2.2], hand: 2.5, foot: [5.5, 2.6] },
  brain: { leg: 10, torso: 18, bodyW: 21, headR: 6, arm: 9, lr: [4.5, 3.8, 3.2], ar: [4.3, 3.7, 3.2], hand: 3.9, foot: [7, 3.4] }
};
const XTRA = {
  turtle: { foot: null, hand: null }, ninja: { foot: '#241c2a', hand: '#2a2230' }, soldier: { foot: '#3a3f48', hand: '#3a3f48' },
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
  if (e.pl && e.inv > 0 && (e.inv & 4) && e.state !== 'respawn') return;
  const S = STY[style], X = XTRA[style], sc = (e.sc || 1) * CHS, Q = pose(e), C = e.C, t = e.anim;
  g.save();
  if (e.ghost) g.globalAlpha = 0.2 + ((G.t & 2) ? 0.1 : 0);
  if (e.flash > 3) g.filter = 'brightness(1.9)';
  g.translate(e.x - cam, e.y - e.z); g.scale(e.face * sc, sc);
  if (e.flash > 0 && (e.flash & 2)) g.translate(1, 0);
  if (Q.rot) { g.translate(0, -3); g.rotate(Q.rot); }
  const hipY = -S.leg * 2 - 1.5 + Q.crouch, shY = hipY - S.torso + 2, tur = style === 'turtle';
  const [l0, l1, l2] = S.lr, [a0, a1, a2] = S.ar, legC = C.leg, armC = C.arm;
  let L = limb(-2.5, hipY, Q.lb, S.leg, Q.lb - Q.kb, S.leg, l0, l1, l2, legC, 16);
  foot(L[2], L[3], Q.lb - Q.kb, S.foot[0], S.foot[1], X.foot || legC, 16, tur);
  if (tur) pad(L[0], L[1], 2.7, C.pad, 16);
  g.save(); g.translate(0, hipY); g.rotate(Q.lean); g.translate(0, -hipY);
  const A = limb(-S.bodyW * 0.28, shY + 2.5, Q.ab, S.arm, Q.ab + Q.eb, S.arm, a0, a1, a2, armC, 16);
  if (tur) wrapBand([A[0], A[1], A[2], A[3]], 0.62, 0.85, a2 + 0.45, C.pad, 16);
  if (C.weapon && C.dual) weapon(C.weapon, A[2], A[3], Q.wb, t);
  fist(A[2], A[3], S.hand, X.hand || armC, 16, Q.ab + Q.eb);
  torsoOf(style, S, hipY, shY, e, t);
  g.restore();
  L = limb(2.5, hipY, Q.lf, S.leg, Q.lf - Q.kf, S.leg, l0, l1, l2, legC, 0);
  foot(L[2], L[3], Q.lf - Q.kf, S.foot[0], S.foot[1], X.foot || legC, 0, tur);
  if (tur) pad(L[0], L[1], 2.8, C.pad, 0);
  overLegs(style, S, hipY, e);
  g.save(); g.translate(0, hipY); g.rotate(Q.lean); g.translate(0, -hipY);
  headOf(style, 1 + Q.hx * 0.5, shY - S.headR + 1, S.headR, e, t);
  const sx = S.bodyW * 0.22 + Q.hx;
  const F = limb(sx, shY + 2.5, Q.af, S.arm, Q.af + Q.ef, S.arm, a0, a1, a2, armC, 0);
  if (tur) { wrapBand([F[0], F[1], F[2], F[3]], 0.62, 0.85, a2 + 0.45, C.pad, 0); pad(F[0], F[1], 2.1, C.pad, 0); }
  if (Q.trail && C.weapon) swoosh(sx, shY + 2.5, S.arm * 2 + (C.weapon === 'bo' ? 22 : 15), Q.trail[0], Q.trail[1], e.pl ? '#e8f4ff' : '#ffb0a0');
  if (C.weapon) weapon(C.weapon, F[2], F[3], Q.wf, t);
  fist(F[2], F[3], S.hand, X.hand || armC, 0, Q.af + Q.ef);
  if (style === 'samurai' || style === 'blade') { g.beginPath(); g.ellipse(sx, shY + 1.5, 4.2, 3.4, 0.3, 0, TAU); outlineFill(ball(sx, shY, 4.2, style === 'samurai' ? '#2a2a36' : '#c6ccd8'), 1.8); }
  if (style === 'rhino' || style === 'boar') { g.beginPath(); g.ellipse(sx - 0.5, shY + 1.5, 4.5, 3.6, 0, 0, TAU); outlineFill(ball(sx, shY, 4.5, C.torso), 1.8); }
  g.restore();
  g.restore();
  if (e.state === 'windup' || (e.boss && e.move && e.phase === (e.move === 'charge' ? 0 : 1) && ['melee', 'charge', 'laser'].includes(e.move))) {
    if (G.t & 4) txt('!', e.x - cam, e.y - e.z - (S.leg * 2 + S.torso + S.headR * 2 + 10) * sc, 11, '#ff4030');
  }
}
function shadow(x, y, z, w) {
  const k = 1 - Math.min(z, 120) / 200, r = Math.max(1, w * k);
  g.save(); g.translate(x, y); g.scale(1, 0.3);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r);
  gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,.32)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill(); g.restore();
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
  const gc = { star: '#c0d0ff', blade: '#e0e8ff', laser: '#ff3030', bullet: '#ffd060', acid: '#8ee04a', knife: '#e0e8ff', orb: '#c070ff' }[p.type];
  glow(x, y, p.type === 'orb' ? 16 : 9, gc, 0.6); g.restore();
  switch (p.type) {
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
    else if (q.k === 'confetti') { g.fillStyle = q.col; g.save(); g.translate(q.x, q.y); g.rotate(q.y * 0.05); g.fillRect(-1.5, -1, 3, 2); g.restore(); }
  }
  g.globalAlpha = 1;
}

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
