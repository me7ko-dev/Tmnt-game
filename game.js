'use strict';
// Костенурките нинджи – фен beat 'em up за телефон. Всичко (графика, звук, музика) е генерирано в кода.
(() => {
const W = 480, H = 270, HOR = 150, FT = 172, FB = 262, GRAV = 0.34, TAU = Math.PI * 2;
const FP = '"Press Start 2P","Courier New",monospace';
const FT_T = '"Russo One",Impact,"Arial Black",sans-serif';
const OUT = '#15110d', CHS = 1.15;

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
const cv = document.getElementById('cv'), g = cv.getContext('2d');
let SC = 1, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
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
  god: location.hash === '#god', done: store.get('done', []), best: store.get('best', 0)
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
  if (e.pl) return { skin: '#5fae3e', legF: '#5fae3e', legB: '#4a8d2f', armF: '#5fae3e', armB: '#4a8d2f', torso: '#e3c25a', band: e.t.color, pad: '#8a5a2b', dual: e.t.weapon !== 'bo', weapon: e.t.weapon };
  if (e.boss) {
    const k = e.key;
    const skin = { rhino: '#8a929c', boar: '#9a6446', fly: '#a6b36a', samurai: '#2a2a36', blade: '#aeb4c2', brain: '#6f8fba' }[k];
    const torso = { rhino: '#5b3a1d', boar: '#5a2d73', fly: '#e8ece6', samurai: '#2a2a36', blade: '#8a90a0', brain: '#5a78a2' }[k];
    return { skin, legF: k === 'rhino' ? '#3e5d7a' : k === 'boar' ? '#3a3a52' : k === 'fly' ? '#595f6e' : skin, legB: shade(k === 'rhino' ? '#3e5d7a' : k === 'boar' ? '#3a3a52' : k === 'fly' ? '#595f6e' : skin.length === 7 ? skin : '#555555', -25),
      armF: skin, armB: shade(skin, -22), torso, weapon: e.def.weapon };
  }
  const d = e.def, s = d.suit || '#777777';
  return { suit: s, legF: s, legB: shade(s, -28), armF: s, armB: shade(s, -28), torso: s, mask: d.mask || '#1c1622', weapon: d.weapon };
}
function makePlayer(ti) {
  const p = { pl: true, t: TURTLES[ti], x: G.cam + 70, y: 214, z: 0, vx: 0, vz: 0, face: 1, state: 'idle', st: 0, anim: 0, hp: 100, inv: 60, combo: 0, comboT: 0, queued: false, hit: new Set(), jk: false, hw: 9, jvx: 0, jvy: 0 };
  p.C = colorsFor(p); return p;
}

// ---------------------------------------------------------------- ефекти
function shake(v) { G.shake = Math.max(G.shake, v); }
function spark(x, y, z, n, col) {
  for (let i = 0; i < n; i++) parts.push({ k: 'spark', x, y, z, vx: rnd(-2.6, 2.6), vy: rnd(-0.4, 0.4), vz: rnd(0.5, 3.6), life: rnd(10, 20), max: 20, col: col || '#fff6a0', sz: rnd(1, 2.2) });
  parts.push({ k: 'burst', x, y, z, vx: 0, vy: 0, vz: 0, life: 7, max: 7, col: col || '#fff' });
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
  return dx > -back - tgt.hw && dx < reach + tgt.hw && Math.abs(tgt.y - att.y) < depth + (tgt.boss ? 5 : 0) && Math.abs(tgt.z - att.z) < zr;
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
  p.state = 'special'; p.st = 0; p.hit.clear(); Snd.play('special');
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
  G.score += 5000; addText(e.x, e.y, 70, '+5000'); Snd.play('roar'); shake(6); G.stop = 12;
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
}

// ---------------------------------------------------------------- рисуване: помощни
function circ(x, y, r, fill, stroke = OUT, lw = 1.2) { g.beginPath(); g.arc(x, y, Math.max(0.1, r), 0, TAU); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); } }
function ell(x, y, rx, ry, rot, fill, stroke = OUT, lw = 1.2) { g.beginPath(); g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU); g.fillStyle = fill; g.fill(); if (stroke) { g.lineWidth = lw; g.strokeStyle = stroke; g.stroke(); } }
function rrect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function seg(x1, y1, x2, y2, w, c) {
  g.lineCap = 'round'; g.strokeStyle = OUT; g.lineWidth = w + 2.2; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  g.strokeStyle = c; g.lineWidth = w; g.stroke();
}
function limb(x, y, a1, l1, a2, l2, w, col) {
  const kx = x + Math.sin(a1) * l1, ky = y + Math.cos(a1) * l1, fx = kx + Math.sin(a2) * l2, fy = ky + Math.cos(a2) * l2;
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = OUT; g.lineWidth = w + 2.4; g.beginPath(); g.moveTo(x, y); g.lineTo(kx, ky); g.lineTo(fx, fy); g.stroke();
  g.strokeStyle = col; g.lineWidth = w; g.stroke();
  return [kx, ky, fx, fy];
}
function txt(s, x, y, size, col, align = 'center', font = FP, lw) {
  g.font = size + 'px ' + font; g.textAlign = align; g.textBaseline = 'middle';
  const w = lw !== undefined ? lw : Math.max(2, size * 0.32);
  if (w > 0) { g.lineJoin = 'round'; g.lineWidth = w; g.strokeStyle = '#0a0a0a'; g.strokeText(s, x, y); }
  g.fillStyle = col; g.fillText(s, x, y);
}

// ---------------------------------------------------------------- рисуване: оръжия
function weapon(type, hx, hy, a, t) {
  const dx = Math.sin(a), dy = Math.cos(a), L = n => [hx + dx * n, hy + dy * n], px = dy, py = -dx;
  switch (type) {
    case 'katana': case 'sword': case 'bigsword': {
      const len = type === 'katana' ? 21 : type === 'sword' ? 17 : 30, w = type === 'bigsword' ? 2.2 : 1.6;
      const [x0, y0] = L(-4), [x1, y1] = L(3), [x2, y2] = L(len);
      seg(x0, y0, x1, y1, 2.2, '#3a2a1a'); seg(x1, y1, x2, y2, w, '#e3ebf2');
      seg(x1 - px * 2.6, y1 - py * 2.6, x1 + px * 2.6, y1 + py * 2.6, 1.4, '#d8b040');
      break;
    }
    case 'sai': {
      const [x0, y0] = L(-3), [x1, y1] = L(2), [x2, y2] = L(13), [x3, y3] = L(6);
      seg(x0, y0, x1, y1, 2.2, '#a0302a'); seg(x1, y1, x2, y2, 1.5, '#d0d7df');
      g.strokeStyle = '#d0d7df'; g.lineWidth = 1.3; g.beginPath();
      g.moveTo(x3 + px * 3.2, y3 + py * 3.2); g.lineTo(x1 + px * 3, y1 + py * 3); g.lineTo(x1 - px * 3, y1 - py * 3); g.lineTo(x3 - px * 3.2, y3 - py * 3.2); g.stroke();
      break;
    }
    case 'bo': {
      const [x0, y0] = L(-20), [x1, y1] = L(24);
      seg(x0, y0, x1, y1, 2.5, '#a8743a');
      const [wx, wy] = L(1); circ(wx, wy, 1.6, '#6b4520', null);
      break;
    }
    case 'nunchaku': {
      const [x0, y0] = L(0), [x1, y1] = L(9); seg(x0, y0, x1, y1, 2.4, '#8b5a2b');
      const a2 = a + Math.sin(t * 0.45) * 1.1 + 0.4, x2 = x1 + Math.sin(a2) * 3, y2 = y1 + Math.cos(a2) * 3;
      g.strokeStyle = '#bbb'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      seg(x2, y2, x2 + Math.sin(a2) * 9, y2 + Math.cos(a2) * 9, 2.4, '#8b5a2b');
      break;
    }
    case 'gun': { const [x0, y0] = L(-2), [x1, y1] = L(12); seg(x0, y0, x1, y1, 3.6, '#40464f'); const [mx, my] = L(12); circ(mx, my, 1.4, '#ff4040', null); break; }
    case 'biggun': { const [x0, y0] = L(-6), [x1, y1] = L(20); seg(x0, y0, x1, y1, 5, '#3c3c44'); const [cx, cy] = L(4); circ(cx, cy, 4, '#55555f'); break; }
    case 'claws': for (const o of [-0.28, 0, 0.28]) { const b = a + o; seg(hx, hy, hx + Math.sin(b) * 13, hy + Math.cos(b) * 13, 1.2, '#e6ecf5'); } break;
  }
}
function swoosh(cx, cy, r, a0, a1, col) {
  g.save(); g.globalAlpha = 0.55; g.strokeStyle = col || '#ffffff'; g.lineCap = 'round';
  const t0 = Math.PI / 2 - a0, t1 = Math.PI / 2 - a1;
  g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, r, t0, t1, a1 > a0); g.stroke();
  g.globalAlpha = 0.9; g.lineWidth = 1.4; g.beginPath(); g.arc(cx, cy, r + 1, t0 + (t1 - t0) * 0.4, t1, a1 > a0); g.stroke();
  g.restore();
}

// ---------------------------------------------------------------- рисуване: стойки
const STY = {
  turtle: { leg: 8, legW: 5.4, torso: 14, bodyW: 15, headR: 7.2, arm: 7, armW: 4.4 },
  ninja: { leg: 9, legW: 4.2, torso: 14, bodyW: 12, headR: 6, arm: 7.5, armW: 3.6 },
  soldier: { leg: 9, legW: 5, torso: 15, bodyW: 14, headR: 6.5, arm: 7.5, armW: 4.6 },
  rhino: { leg: 9, legW: 7, torso: 17, bodyW: 20, headR: 8, arm: 8.5, armW: 6.2 },
  boar: { leg: 9, legW: 6.6, torso: 17, bodyW: 20, headR: 8, arm: 8.5, armW: 6 },
  fly: { leg: 9, legW: 3.8, torso: 15, bodyW: 13, headR: 7, arm: 8, armW: 3.4 },
  samurai: { leg: 9, legW: 5.6, torso: 16, bodyW: 16, headR: 6.5, arm: 8, armW: 5 },
  blade: { leg: 9.5, legW: 5.6, torso: 16, bodyW: 16, headR: 6.5, arm: 8, armW: 5 },
  brain: { leg: 10, legW: 7, torso: 18, bodyW: 20, headR: 6, arm: 9, armW: 6.5 }
};
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

// ---------------------------------------------------------------- рисуване: глави и тела
function headTurtle(x, y, r, C, t) {
  const tw = Math.sin(t * 0.25) * 2;
  g.lineCap = 'round';
  for (const [ex, ey] of [[-r - 8, 1 + tw], [-r - 7, 6 - tw]]) {
    g.strokeStyle = OUT; g.lineWidth = 4; g.beginPath(); g.moveTo(x - r * 0.6, y - 1); g.quadraticCurveTo(x - r - 2, y - 2 + tw * 0.5, x + ex, y + ey); g.stroke();
    g.strokeStyle = C.band; g.lineWidth = 2.4; g.stroke();
  }
  ell(x + 1, y + 0.5, r * 1.02, r * 0.92, 0, C.skin);
  g.save(); g.beginPath(); g.ellipse(x + 1, y + 0.5, r * 1.02, r * 0.92, 0, 0, TAU); g.clip();
  g.fillStyle = C.band; g.fillRect(x - r, y - 3.3, r * 2.2, 4.6);
  g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x - r, y + 1.1, r * 2.2, 0.8);
  g.restore();
  ell(x + r * 0.55, y - 1, 1.7, 1.4, 0, '#fff', null); ell(x + r * 0.05, y - 1, 1.4, 1.3, 0, '#fff', null);
  circ(x + r * 0.7, y - 0.9, 0.7, '#111', null); circ(x + r * 0.18, y - 0.9, 0.6, '#111', null);
  g.strokeStyle = OUT; g.lineWidth = 0.9; g.beginPath(); g.arc(x + r * 0.45, y + 2.4, 2.2, 0.2, 1.6); g.stroke();
}
function headNinja(x, y, r, C, t) {
  g.strokeStyle = OUT; g.lineWidth = 3.4; g.lineCap = 'round';
  const tw = Math.sin(t * 0.2) * 1.5;
  g.beginPath(); g.moveTo(x - r * 0.7, y - 2); g.lineTo(x - r - 5, y + 1 + tw); g.stroke();
  g.strokeStyle = C.suit; g.lineWidth = 1.8; g.stroke();
  circ(x, y, r, C.suit);
  g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
  g.fillStyle = C.mask; g.fillRect(x - r, y - 2.6, r * 2, 3.4);
  g.restore();
  ell(x + r * 0.5, y - 1, 1.5, 0.9, 0, '#fff', null); ell(x + r * 0.05, y - 1, 1.2, 0.8, 0, '#fff', null);
}
function headOf(style, x, y, r, e, t) {
  const C = e.C;
  switch (style) {
    case 'turtle': return headTurtle(x, y, r, C, t);
    case 'ninja': return headNinja(x, y, r, C, t);
    case 'soldier':
      circ(x, y, r, '#5d6570'); g.fillStyle = '#ff3838'; g.fillRect(x - 1, y - 2.5, r + 0.5, 3); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x, y - 2.3, 2, 1);
      seg(x - 2, y - r, x - 4, y - r - 4, 0.8, '#999'); break;
    case 'rhino':
      ell(x + 3, y + 1, r * 1.25, r * 0.85, 0.15, C.skin);
      g.beginPath(); g.moveTo(x + r * 1.2, y - 2); g.lineTo(x + r * 1.55, y - r * 1.2); g.lineTo(x + r * 0.7, y - 3); g.closePath(); g.fillStyle = '#efe6cf'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
      ell(x - r * 0.6, y - r * 0.7, 2, 3, -0.4, shade(C.skin, -15));
      circ(x + 2, y - 2, 1.2, '#111', null); g.strokeStyle = OUT; g.beginPath(); g.moveTo(x + r * 0.8, y + 4); g.lineTo(x + r * 1.5, y + 3); g.stroke();
      break;
    case 'boar':
      circ(x, y, r, C.skin);
      ell(x + r * 0.9, y + 2, 3.2, 3.6, 0, '#e89a9a'); circ(x + r * 0.9 + 0.8, y + 1.4, 0.7, '#5a2a2a', null); circ(x + r * 0.9 + 0.8, y + 3.2, 0.7, '#5a2a2a', null);
      g.strokeStyle = '#f2ecd8'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x + r * 0.5, y + 5); g.quadraticCurveTo(x + r * 0.9, y + 3, x + r * 0.8, y); g.stroke();
      g.fillStyle = '#d02a2a'; for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(x - r + i * 3.4, y - r * 0.6); g.lineTo(x - r + 1 + i * 3.4, y - r - 5); g.lineTo(x - r + 3.4 + i * 3.4, y - r * 0.7); g.fill(); }
      g.fillStyle = '#7a2ab0'; rrect(x - 1, y - 3.5, r + 1.5, 3.4, 1.2); g.fill(); g.strokeStyle = OUT; g.lineWidth = 0.8; g.stroke();
      break;
    case 'fly':
      circ(x, y, r * 0.85, C.skin);
      ell(x + r * 0.5, y - 1.5, r * 0.62, r * 0.75, 0.2, '#c2261c'); ell(x + r * 0.7, y - 3, 1.2, 1.4, 0, 'rgba(255,255,255,.7)', null);
      ell(x - r * 0.25, y - 2, r * 0.45, r * 0.6, -0.2, '#a01e16');
      g.strokeStyle = OUT; g.lineWidth = 1; g.beginPath(); g.moveTo(x + r * 0.4, y + r * 0.6); g.lineTo(x + r * 0.7, y + r + 1); g.moveTo(x + r * 0.1, y + r * 0.7); g.lineTo(x + r * 0.2, y + r + 1.5); g.stroke();
      break;
    case 'samurai':
      circ(x, y, r, '#8c1d1d');
      g.fillStyle = '#1b1b22'; g.beginPath(); g.arc(x, y - 1, r + 1.2, Math.PI, 0); g.lineTo(x + r + 2, y + 1); g.lineTo(x - r - 2, y + 1); g.closePath(); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
      g.strokeStyle = '#e0b43a'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x - 1, y - r); g.lineTo(x - 6, y - r - 7); g.moveTo(x + 1, y - r); g.lineTo(x + 6, y - r - 7); g.stroke();
      g.fillStyle = '#ffd24a'; g.fillRect(x + 1, y - 0.5, 4, 1.2);
      break;
    case 'blade':
      circ(x, y, r, '#c6ccd8');
      g.fillStyle = '#23232d'; g.fillRect(x - 1, y - 2.5, r + 1, 5);
      g.fillStyle = '#ff3030'; g.fillRect(x + 1, y - 1.6, 2, 1.2); g.fillRect(x + 4, y - 1.6, 2, 1.2);
      g.fillStyle = '#c6ccd8'; for (const o of [-4, 0, 4]) { g.beginPath(); g.moveTo(x + o - 1.5, y - r + 1); g.lineTo(x + o, y - r - 5); g.lineTo(x + o + 1.5, y - r + 1); g.fill(); }
      break;
    case 'brain':
      rrect(x - r, y - r, r * 2, r * 1.8, 2); g.fillStyle = '#8fa9cc'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
      g.fillStyle = '#27e0ff'; g.fillRect(x - 1, y - 3, r + 1, 2.4);
      break;
  }
}
function torsoOf(style, S, hipY, shY, e, t) {
  const bw = S.bodyW, C = e.C;
  if (style === 'turtle') {
    ell(-bw * 0.36, (hipY + shY) / 2 + 1, bw * 0.46, S.torso * 0.66, 0, '#6d4f22');
    g.strokeStyle = '#4b3515'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-bw * 0.7, (hipY + shY) / 2); g.lineTo(-bw * 0.1, (hipY + shY) / 2); g.stroke();
    rrect(-bw / 2 + 1, shY - 1, bw - 1, hipY - shY + 3, 5); g.fillStyle = '#5fae3e'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke();
    ell(bw * 0.1, (hipY + shY) / 2 + 0.5, bw * 0.36, S.torso * 0.52, 0, C.torso);
    g.strokeStyle = '#b8942e'; g.lineWidth = 0.7; g.beginPath();
    for (let i = 1; i < 4; i++) { const yy = shY + (hipY - shY) * i / 4 + 1; g.moveTo(bw * 0.1 - bw * 0.28, yy); g.lineTo(bw * 0.1 + bw * 0.28, yy); }
    g.stroke();
    g.fillStyle = '#7a4a1e'; g.fillRect(-bw / 2 + 1, hipY - 2.5, bw - 1, 2.8);
    circ(bw * 0.18, hipY - 1.1, 2.1, '#d8b040', OUT, 0.7);
    return;
  }
  if (style === 'blade') {
    const wv = Math.sin(t * 0.12) * 2;
    g.fillStyle = '#5a1f78'; g.beginPath(); g.moveTo(-bw * 0.3, shY); g.lineTo(-bw * 0.9 + wv, hipY + S.leg * 1.8); g.lineTo(-bw * 0.1 + wv, hipY + S.leg * 1.9); g.closePath(); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1; g.stroke();
  }
  if (style === 'fly') {
    const fl = Math.sin(t * 0.9) * 0.35;
    g.globalAlpha = 0.45; ell(-bw * 0.6, shY + 2, 12, 4.5, -0.6 + fl, '#d8f0ff'); ell(-bw * 0.4, shY + 5, 10, 3.5, -0.2 - fl, '#d8f0ff'); g.globalAlpha = 1;
  }
  rrect(-bw / 2, shY - 1, bw, hipY - shY + 3, style === 'brain' ? 3 : 4.5); g.fillStyle = C.torso; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke();
  const my = (hipY + shY) / 2;
  switch (style) {
    case 'ninja': g.fillStyle = shade(C.suit, -35); g.fillRect(-bw / 2, hipY - 2.5, bw, 2.5); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(-1, shY, 2.5, hipY - shY - 2); break;
    case 'soldier': g.strokeStyle = '#4d545e'; g.lineWidth = 1; g.beginPath(); g.moveTo(-bw / 2, my); g.lineTo(bw / 2, my); g.moveTo(0, shY); g.lineTo(0, hipY); g.stroke(); break;
    case 'rhino': g.fillStyle = C.skin; g.fillRect(-1, shY, bw / 2, hipY - shY); g.strokeStyle = '#c9a33a'; g.lineWidth = 2; g.beginPath(); g.moveTo(-bw / 2, shY + 1); g.lineTo(bw / 2, hipY - 2); g.stroke(); break;
    case 'boar': g.fillStyle = C.skin; g.beginPath(); g.moveTo(0, shY); g.lineTo(bw / 2, shY); g.lineTo(bw / 2, hipY); g.lineTo(3, hipY); g.closePath(); g.fill(); break;
    case 'fly': g.fillStyle = '#b7c0c8'; g.fillRect(-1, shY, 1.2, hipY - shY); g.fillStyle = '#6aa0d8'; g.fillRect(2, shY + 3, 3, 4); break;
    case 'samurai':
      g.strokeStyle = '#c42b2b'; g.lineWidth = 1; g.beginPath(); for (let i = 1; i < 5; i++) { const yy = shY + (hipY - shY) * i / 5; g.moveTo(-bw / 2, yy); g.lineTo(bw / 2, yy); } g.stroke();
      rrect(-bw / 2 - 3, shY - 2, 7, 8, 1.5); g.fillStyle = '#1b1b22'; g.fill(); g.strokeStyle = '#c42b2b'; g.stroke(); break;
    case 'blade':
      g.fillStyle = '#e6ecf5'; for (const o of [-4, 2]) { g.beginPath(); g.moveTo(o, shY); g.lineTo(o + 2, shY - 6); g.lineTo(o + 4, shY); g.fill(); }
      g.strokeStyle = '#6a7080'; g.lineWidth = 1; g.beginPath(); g.moveTo(-bw / 2 + 2, my); g.lineTo(bw / 2 - 2, my); g.stroke(); break;
    case 'brain': {
      const pul = Math.sin(t * 0.15) * 0.6;
      circ(1, my + 1, 6.3, '#bfe8ff'); ell(1, my + 1.5, 4.6 + pul, 3.6 + pul * 0.5, 0, '#f08ab0', '#a04870', 0.8);
      g.strokeStyle = '#a04870'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(-2, my); g.quadraticCurveTo(1, my + 3, 4, my); g.stroke();
      circ(3, my + 0.5, 0.9, '#fff', null); circ(3.3, my + 0.5, 0.45, '#111', null);
      g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 0.8; g.beginPath(); g.arc(1, my + 1, 5, 3.6, 4.4); g.stroke();
      break;
    }
  }
}
function drawRobot(e, cam) {
  const sx = e.x - cam, sy = e.y - e.z, t = e.anim;
  g.save(); g.translate(sx, sy); g.scale(e.face * CHS, CHS);
  if (['down', 'dead'].includes(e.state)) { g.translate(0, -2); g.rotate(-Math.PI / 2); }
  if (e.flash > 0 && (e.flash & 2)) g.translate(1, 0);
  const open = e.state === 'leap' || e.state === 'attack' || e.state === 'leapw' ? 1 : (Math.sin(t * 0.3) + 1) * 0.2;
  const s = e.state === 'walk' || e.state === 'enter' ? Math.sin(t * 0.5) * 3 : 0;
  seg(-3, -6, -4 + s, 0, 1.6, '#6a7078'); seg(3, -6, 4 - s, 0, 1.6, '#6a7078');
  seg(-8, -12, -12, -16 + Math.sin(t * 0.3), 1, '#888');
  circ(0, -12, 8, '#9aa3ad');
  g.beginPath(); g.moveTo(0, -12); g.arc(0, -12, 8.2, -open * 0.8, open * 0.8); g.closePath(); g.fillStyle = '#3a0c0c'; g.fill();
  g.fillStyle = '#fff';
  for (let i = 0; i < 3; i++) {
    const a = -open * 0.8 + 0.001, r0 = 3 + i * 1.8;
    const x = Math.cos(a) * r0, y = -12 + Math.sin(a) * r0;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 1.2, y + 2); g.lineTo(x + 2, y - 0.2); g.fill();
    const b = open * 0.8, x2 = Math.cos(b) * r0, y2 = -12 + Math.sin(b) * r0;
    g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 + 1.2, y2 - 2); g.lineTo(x2 + 2, y2 + 0.2); g.fill();
  }
  circ(1, -17, 1.6, '#ff3030', OUT, 0.7);
  g.restore();
}
function drawChar(e, cam = G.cam) {
  const style = e.pl ? 'turtle' : e.boss ? e.key : e.def.style;
  if (style === 'robot') return drawRobot(e, cam);
  if ((e.state === 'dead' || e.state === 'dying') && e.st > 20 && (e.st & 4)) return;
  if (e.pl && e.inv > 0 && (e.inv & 4) && e.state !== 'respawn') return;
  const S = STY[style], sc = e.sc || 1, Q = pose(e), C = e.C, t = e.anim;
  g.save();
  if (e.ghost) g.globalAlpha = 0.18 + (G.t & 2 ? 0.1 : 0);
  g.translate(e.x - cam, e.y - e.z); g.scale(e.face * sc * CHS, sc * CHS);
  if (e.flash > 0 && (e.flash & 2)) g.translate(1.2, 0);
  if (Q.rot) { g.translate(0, -3); g.rotate(Q.rot); }
  const hipY = -S.leg * 2 + Q.crouch, shY = hipY - S.torso + 2;
  limb(-2, hipY, Q.lb, S.leg, Q.lb - Q.kb, S.leg, S.legW, C.legB);
  g.save(); g.translate(0, hipY); g.rotate(Q.lean); g.translate(0, -hipY);
  const bA = limb(-S.bodyW * 0.25, shY + 2, Q.ab, S.arm, Q.ab + Q.eb, S.arm, S.armW, C.armB);
  if (C.weapon && (C.dual || C.weapon === 'bo')) weapon(C.weapon === 'bo' ? null : C.weapon, bA[2], bA[3], Q.wb, t);
  torsoOf(style, S, hipY, shY, e, t);
  g.restore();
  const fL = limb(2, hipY, Q.lf, S.leg, Q.lf - Q.kf, S.leg, S.legW, C.legF);
  if (style === 'turtle') circ(fL[0], fL[1], 2.3, C.pad, OUT, 0.8);
  g.save(); g.translate(0, hipY); g.rotate(Q.lean); g.translate(0, -hipY);
  headOf(style, 1 + Q.hx * 0.5, shY - S.headR + 1, S.headR, e, t);
  const sx = S.bodyW * 0.2 + Q.hx;
  const fA = limb(sx, shY + 2, Q.af, S.arm, Q.af + Q.ef, S.arm, S.armW, C.armF);
  if (Q.trail && C.weapon) swoosh(sx, shY + 2, S.arm * 2 + (C.weapon === 'bo' ? 20 : 14), Q.trail[0], Q.trail[1], e.pl ? '#ffffff' : '#ffb0a0');
  if (C.weapon) weapon(C.weapon, fA[2], fA[3], Q.wf, t);
  circ(fA[2], fA[3], S.armW * 0.55, C.armF, OUT, 0.8);
  if (style === 'turtle') circ(fA[0], fA[1], 1.9, C.pad, OUT, 0.7);
  g.restore();
  g.restore();
  if (e.state === 'windup' || (e.boss && e.move && e.phase === (e.move === 'charge' ? 0 : 1) && ['melee', 'charge', 'laser'].includes(e.move))) {
    if (G.t & 4) txt('!', e.x - cam, e.y - e.z - (S.leg * 2 + S.torso + S.headR * 2 + 8) * sc * CHS, 10, '#ff4030');
  }
}
function shadow(x, y, z, w) {
  const k = 1 - Math.min(z, 120) / 200;
  g.fillStyle = 'rgba(0,0,0,.34)'; g.beginPath(); g.ellipse(x, y, Math.max(1, w * k), 3 * k + 0.5, 0, 0, TAU); g.fill();
}

// ---------------------------------------------------------------- рисуване: предмети
function drawProp(o, cam) {
  const x = o.x - cam + (o.shake ? Math.sin(o.shake * 2) * 1.5 : 0), y = o.y;
  if (o.type === 'crate') {
    rrect(x - 11, y - 20, 22, 20, 1.5); g.fillStyle = '#a5763e'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke();
    g.strokeStyle = '#6b4520'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x - 9, y - 18); g.lineTo(x + 9, y - 2); g.moveTo(x + 9, y - 18); g.lineTo(x - 9, y - 2); g.stroke();
    g.strokeRect(x - 9, y - 18, 18, 16);
  } else {
    rrect(x - 9, y - 24, 18, 24, 3); g.fillStyle = '#3f67a8'; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#2d4c80'; g.fillRect(x - 9, y - 17, 18, 2); g.fillRect(x - 9, y - 8, 18, 2);
    ell(x, y - 24, 9, 2.4, 0, '#5a80b8'); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x - 6, y - 22, 2.5, 20);
  }
}
function drawItem(it, cam) {
  if (it.life < 180 && (it.life & 8)) return;
  const x = it.x - cam, y = it.y - it.z - 3 - Math.abs(Math.sin(G.t * 0.08)) * 2;
  if (it.type === 'pizza') {
    ell(x, y, 11, 5, 0, '#f0e0c0'); ell(x, y - 0.5, 9.5, 4.2, 0, '#e8a03a', '#b06a20', 0.8); ell(x, y - 0.7, 8, 3.4, 0, '#f2c94c', null);
    for (const [px, py] of [[-4, -1], [3, -2], [0, 1], [5, 0.5], [-2, -2.5]]) ell(x + px, y + py, 1.4, 0.8, 0, '#c0392b', null);
  } else {
    g.beginPath(); g.moveTo(x - 7, y - 1); g.lineTo(x + 7, y - 3); g.lineTo(x + 6, y + 3); g.closePath(); g.fillStyle = '#f2c94c'; g.fill(); g.strokeStyle = '#b06a20'; g.lineWidth = 1.4; g.stroke();
    circ(x + 2, y, 1.1, '#c0392b', null); circ(x - 2, y - 1, 1, '#c0392b', null);
  }
}
function drawProj(p, cam) {
  const x = p.x - cam, y = p.y - p.z;
  switch (p.type) {
    case 'star': case 'blade': {
      g.save(); g.translate(x, y); g.rotate(p.t * 0.5);
      g.fillStyle = p.type === 'blade' ? '#e6ecf5' : '#cfd6de'; g.strokeStyle = OUT; g.lineWidth = 0.8; g.beginPath();
      const r = p.type === 'blade' ? 6 : 4.5;
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r; g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      g.closePath(); g.fill(); g.stroke(); g.restore(); break;
    }
    case 'laser': g.save(); g.shadowColor = '#ff3030'; g.shadowBlur = 6; seg(x - 7, y, x + 7, y, 1.6, '#ff6a6a'); g.restore(); break;
    case 'bullet': seg(x - sgn(p.vx) * 6, y, x, y, 1.2, 'rgba(255,220,120,.7)'); circ(x, y, 1.8, '#ffe070'); break;
    case 'acid': circ(x, y, 3.4 + Math.sin(p.t * 0.4) * 0.6, '#8ee04a', '#3a6a1a'); break;
    case 'knife': seg(x - 5, y, x + 5, y, 1.2, '#e3ebf2'); break;
    case 'orb': g.save(); g.shadowColor = '#d05aff'; g.shadowBlur = 10; circ(x, y, 5 + Math.sin(p.t * 0.3), '#c070ff', '#fff', 1); g.restore(); break;
  }
}
function drawHazard(h, cam) {
  if (h.k === 'fall') {
    const x = h.x - cam, k = clamp(h.t / h.warn, 0, 1);
    if (!h.done) { g.fillStyle = `rgba(${G.t & 4 ? '255,40,40' : '0,0,0'},${0.25 + k * 0.3})`; g.beginPath(); g.ellipse(x, h.y, 6 + k * 12, 2 + k * 3, 0, 0, TAU); g.fill(); }
    if (h.t > h.warn && !h.done) {
      const y = h.y - h.z;
      if (h.vis === 'fire') { rrect(x - 14, y - 6, 28, 6, 1); g.fillStyle = '#5a3218'; g.fill(); for (let i = 0; i < 4; i++) ell(x - 10 + i * 7, y - 9 + Math.sin(G.t * 0.6 + i) * 1.5, 3, 5, 0, i % 2 ? '#ffb030' : '#ff6a20', null); }
      else if (h.vis === 'drip') { ell(x, y - 4, 4, 6, 0, '#7fd14a', '#3a6a1a'); }
      else if (h.vis === 'beam') { g.fillStyle = '#c0502a'; g.fillRect(x - 18, y - 7, 36, 7); g.strokeStyle = OUT; g.lineWidth = 1; g.strokeRect(x - 18, y - 7, 36, 7); g.fillStyle = '#8a3418'; g.fillRect(x - 18, y - 4.5, 36, 2); }
      else { rrect(x - 12, y - 22, 24, 22, 1.5); g.fillStyle = '#a5763e'; g.fill(); g.strokeStyle = OUT; g.stroke(); g.strokeStyle = '#6b4520'; g.beginPath(); g.moveTo(x - 10, y - 20); g.lineTo(x + 10, y - 2); g.stroke(); seg(x, y - 22, x, y - 60, 0.8, '#333'); }
    }
  } else if (h.k === 'car') {
    if (h.t <= h.warn) {
      if (G.t & 8) { const ex = h.dir > 0 ? 16 : W - 16; g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(ex, h.y - 30); g.lineTo(ex + 10, h.y - 12); g.lineTo(ex - 10, h.y - 12); g.closePath(); g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.2; g.stroke(); txt('!', ex, h.y - 18, 9, '#111', 'center', FP, 0); }
      g.fillStyle = 'rgba(255,210,63,.12)'; g.fillRect(0, h.y - 9, W, 18);
      return;
    }
    const x = h.x - cam, y = h.y;
    g.save(); g.translate(x, y); g.scale(h.dir, 1);
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 0, 40, 5, 0, 0, TAU); g.fill();
    rrect(-38, -20, 76, 16, 4); g.fillStyle = h.col; g.fill(); g.strokeStyle = OUT; g.lineWidth = 1.4; g.stroke();
    rrect(-20, -32, 38, 14, 5); g.fill(); g.stroke();
    g.fillStyle = '#9ad0ff'; g.fillRect(-16, -29, 14, 9); g.fillRect(1, -29, 13, 9);
    circ(-24, -3, 6, '#222'); circ(24, -3, 6, '#222'); circ(-24, -3, 2.4, '#aaa', null); circ(24, -3, 2.4, '#aaa', null);
    g.fillStyle = '#fff6a0'; g.fillRect(34, -16, 4, 4); g.fillStyle = 'rgba(255,246,160,.25)'; g.beginPath(); g.moveTo(38, -16); g.lineTo(90, -26); g.lineTo(90, 0); g.lineTo(38, -12); g.fill();
    g.restore();
  } else if (h.k === 'laser') {
    const y = h.y - 14;
    if (h.t < h.warn) { if (G.t & 4) { g.strokeStyle = 'rgba(255,60,60,.8)'; g.setLineDash([6, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); g.setLineDash([]); } }
    else { g.save(); g.shadowColor = '#ff2a6a'; g.shadowBlur = 12; g.fillStyle = '#ff5a8a'; g.fillRect(0, y - 3, W, 6); g.fillStyle = '#fff'; g.fillRect(0, y - 1, W, 2); g.restore(); }
    for (const ex of [4, W - 4]) { rrect(ex - 4, y - 7, 8, 14, 2); g.fillStyle = '#3a2a5a'; g.fill(); g.strokeStyle = '#ff5a8a'; g.lineWidth = 1; g.stroke(); }
  }
}
function drawParts(cam) {
  for (const q of parts) {
    const x = q.x - cam, y = q.y - q.z, a = q.life / q.max;
    if (q.k === 'spark') { g.fillStyle = q.col; g.globalAlpha = a; g.fillRect(x - q.sz / 2, y - q.sz / 2, q.sz, q.sz); }
    else if (q.k === 'burst') {
      g.globalAlpha = a; g.fillStyle = '#fff'; g.beginPath(); const r = (1 - a) * 10 + 5;
      for (let i = 0; i < 8; i++) { const an = i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r; g.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
      g.closePath(); g.fill();
    } else if (q.k === 'dust') { g.fillStyle = q.col + (a * 0.45) + ')'; g.beginPath(); g.arc(x, y, q.sz, 0, TAU); g.fill(); }
    else if (q.k === 'chunk') { g.globalAlpha = Math.min(1, a * 2); g.fillStyle = q.col; g.save(); g.translate(x, y); g.rotate(q.rot + q.life * 0.2); g.fillRect(-q.sz / 2, -q.sz / 2, q.sz, q.sz * 0.7); g.restore(); }
    else if (q.k === 'confetti') { g.globalAlpha = 1; g.fillStyle = q.col; g.fillRect(q.x, q.y, 3, 2); }
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- фонове
function skyGrad(a, b, y1 = HOR) { const gr = g.createLinearGradient(0, 0, 0, y1); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, W, y1); }
function stars(n, seed) { g.fillStyle = '#fff'; for (let i = 0; i < n; i++) { const a = 0.3 + 0.7 * Math.abs(Math.sin(G.t * 0.03 + i)); g.globalAlpha = a; g.fillRect(hash(seed + i) * W, hash(seed + i + 500) * 90, 1, 1); } g.globalAlpha = 1; }
function repeat(cam, f, spacing, fn) { const off = cam * f, k0 = Math.floor((off - spacing) / spacing); for (let k = k0; k <= k0 + Math.ceil(W / spacing) + 2; k++) fn(k * spacing - off, k); }
function floorRows(col, rows, alpha = 1) { g.strokeStyle = col; g.globalAlpha = alpha; g.lineWidth = 1; g.beginPath(); for (let i = 1; i <= rows; i++) { const y = HOR + (H - HOR) * Math.pow(i / rows, 1.5); g.moveTo(0, y); g.lineTo(W, y); } g.stroke(); g.globalAlpha = 1; }
function floorCols(cam, spacing, col, alpha = 1, y0 = HOR) {
  g.strokeStyle = col; g.globalAlpha = alpha; g.lineWidth = 1; g.beginPath();
  repeat(cam, 1, spacing, sx => { const xt = W / 2 + (sx - W / 2) * 0.8, xb = W / 2 + (sx - W / 2) * 1.4; g.moveTo(xt, y0); g.lineTo(xb, H); });
  g.stroke(); g.globalAlpha = 1;
}
function skyline(cam, f, col, seed, hmin, hmax, base, lit) {
  repeat(cam, f, 34, (sx, k) => {
    const h = hmin + hash(seed + k) * (hmax - hmin), w = 26 + hash(seed + k * 3) * 16;
    g.fillStyle = col; g.fillRect(sx, base - h, w, h + 2);
    if (lit) { g.fillStyle = lit; for (let wy = base - h + 5; wy < base - 4; wy += 7) for (let wx = sx + 4; wx < sx + w - 4; wx += 6) if (hash(seed + k * 131 + wx * 7 + wy) > 0.62) g.fillRect(wx, wy, 2, 3); }
  });
}
function flame(x, y, s, t) {
  for (let i = 0; i < 3; i++) {
    const h = s * (1 - i * 0.28) * (0.85 + 0.15 * Math.sin(t * 0.3 + i + x));
    g.fillStyle = ['#ff5a1a', '#ff9a2a', '#ffe070'][i];
    g.beginPath(); g.moveTo(x - s * 0.45 * (1 - i * 0.25), y); g.quadraticCurveTo(x - s * 0.3, y - h * 0.6, x + Math.sin(t * 0.2 + x) * 3, y - h); g.quadraticCurveTo(x + s * 0.3, y - h * 0.6, x + s * 0.45 * (1 - i * 0.25), y); g.fill();
  }
}
function drawBG(theme, cam) {
  const t = G.t;
  switch (theme) {
    case 'fire': {
      const gr = g.createLinearGradient(0, 0, 0, HOR); gr.addColorStop(0, '#1a0c0a'); gr.addColorStop(1, '#4a2216'); g.fillStyle = gr; g.fillRect(0, 0, W, HOR);
      repeat(cam, 1, 160, (sx, k) => {
        g.fillStyle = '#26110c'; g.fillRect(sx + 36, 30, 56, 70); g.fillStyle = `rgba(255,${Math.round(120 + 60 * Math.sin(t * 0.2 + k))},40,.9)`; g.fillRect(sx + 40, 34, 48, 62);
        flame(sx + 52, 96, 26, t + k * 9); flame(sx + 74, 96, 20, t + k * 5);
        g.strokeStyle = '#26110c'; g.lineWidth = 3; g.beginPath(); g.moveTo(sx + 64, 34); g.lineTo(sx + 64, 96); g.moveTo(sx + 40, 64); g.lineTo(sx + 88, 64); g.stroke();
        g.fillStyle = '#1b0b08'; g.fillRect(sx + 128, 0, 16, HOR);
        if (k % 3 === 0) { g.fillStyle = '#140807'; g.fillRect(sx + 100, 70, 22, HOR - 70); g.fillStyle = '#2d1610'; g.fillRect(sx + 102, 72, 18, HOR - 72); }
      });
      g.fillStyle = '#120806'; g.fillRect(0, 0, W, 14); g.fillStyle = '#0c0504'; g.fillRect(0, HOR - 4, W, 5);
      g.fillStyle = '#5b3a22'; g.fillRect(0, HOR, W, H - HOR); floorRows('#3d2614', 7); floorCols(cam, 48, '#3d2614', 0.8);
      g.fillStyle = 'rgba(255,90,20,.08)'; g.fillRect(0, HOR, W, H - HOR);
      for (let i = 0; i < 18; i++) { const x = (hash(i) * W + t * (0.3 + hash(i + 9))) % W, y = H - ((t * (0.4 + hash(i + 3) * 0.6) + hash(i + 5) * H) % H); g.fillStyle = i % 2 ? '#ffb040' : '#ff6020'; g.fillRect(x, y, 1.5, 1.5); }
      const sm = g.createLinearGradient(0, 0, 0, 60); sm.addColorStop(0, 'rgba(20,10,10,.8)'); sm.addColorStop(1, 'rgba(20,10,10,0)'); g.fillStyle = sm; g.fillRect(0, 0, W, 60);
      break;
    }
    case 'street': {
      skyGrad('#0c1030', '#3a2150'); stars(40, 7); circ(W - 70, 36, 12, '#f4f0d8', null);
      skyline(cam, 0.18, '#1b1a3c', 100, 30, 80, 130, 'rgba(255,220,120,.6)');
      repeat(cam, 1, 200, (sx, k) => {
        const col = ['#6a2e2a', '#4a3a5a', '#5a4a2a', '#2e4a5a'][((k % 4) + 4) % 4];
        g.fillStyle = col; g.fillRect(sx, 44, 198, HOR - 44);
        g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 48; y < HOR - 40; y += 6) g.fillRect(sx, y, 198, 1);
        for (let i = 0; i < 4; i++) { const lit = hash(k * 11 + i) > 0.4; g.fillStyle = lit ? '#ffd88a' : '#1c1a2a'; g.fillRect(sx + 16 + i * 46, 54, 24, 22); }
        g.fillStyle = '#16141f'; g.fillRect(sx + 20, HOR - 36, 120, 34);
        g.fillStyle = hash(k) > 0.5 ? '#d0342f' : '#2f8a4f'; for (let i = 0; i < 8; i++) { g.globalAlpha = i % 2 ? 1 : 0.7; g.fillRect(sx + 16 + i * 16, HOR - 44, 16, 8); } g.globalAlpha = 1;
        const names = ['ПИЦА', 'КИНО', 'ГАРАЖ', 'ХОТЕЛ', 'ЗАКУСКИ', 'МУЗИКА'];
        const nm = names[((k % 6) + 6) % 6], on = (t >> 4) % 7 !== k % 7;
        g.save(); if (on) { g.shadowColor = '#ff4af0'; g.shadowBlur = 8; } txt(nm, sx + 80, 34 + 50, 7, on ? '#ffb0f8' : '#6a3a6a', 'center', FP, 0); g.restore();
        g.fillStyle = '#2a2a33'; g.fillRect(sx + 176, 60, 3, HOR - 60); g.save(); g.shadowColor = '#fff2a0'; g.shadowBlur = 12; circ(sx + 177, 60, 4, '#fff6c0', null); g.restore();
      });
      g.fillStyle = '#6d6a78'; g.fillRect(0, HOR - 2, W, FT - HOR); g.strokeStyle = '#5a5866'; g.beginPath(); repeat(cam, 1, 40, sx => { g.moveTo(sx, HOR); g.lineTo(sx - 6, FT - 2); }); g.stroke();
      g.fillStyle = '#a9a6b4'; g.fillRect(0, FT - 4, W, 3);
      g.fillStyle = '#2c2c34'; g.fillRect(0, FT - 1, W, H - FT + 1);
      g.fillStyle = '#e8d44a'; repeat(cam, 1, 60, sx => g.fillRect(sx, 218, 30, 2));
      repeat(cam, 1, 520, sx => { ell(sx + 200, 244, 14, 4, 0, '#3a3a44', '#1a1a20'); });
      break;
    }
    case 'sewer': {
      g.fillStyle = '#0d1f1d'; g.fillRect(0, 0, W, HOR);
      repeat(cam, 1, 24, (sx, k) => { for (let r = 0; r < 14; r++) { const y = 10 + r * 10, o = r % 2 ? 12 : 0; g.fillStyle = hash(k * 31 + r) > 0.5 ? '#1e3a34' : '#1a332e'; g.fillRect(sx + o, y, 23, 9); } });
      repeat(cam, 1, 360, sx => {
        g.fillStyle = '#050c0b'; g.beginPath(); g.moveTo(sx + 60, HOR); g.lineTo(sx + 60, 80); g.arc(sx + 110, 80, 50, Math.PI, 0); g.lineTo(sx + 160, HOR); g.fill();
        g.strokeStyle = '#2d4a44'; g.lineWidth = 4; g.beginPath(); g.arc(sx + 110, 80, 52, Math.PI, 0); g.stroke();
        g.fillStyle = '#4a5a52'; g.fillRect(sx + 250, 20, 10, 110); g.fillStyle = '#7fd14a'; ell(sx + 255, 132 + ((t * 0.8) % 16), 2, 3, 0, '#7fd14a', null);
      });
      g.fillStyle = '#3e4e48'; g.fillRect(0, 24, W, 8); g.fillStyle = '#566860'; repeat(cam, 1, 90, sx => g.fillRect(sx, 22, 6, 12));
      const cg = g.createLinearGradient(0, 0, 0, 40); cg.addColorStop(0, '#020605'); cg.addColorStop(1, 'rgba(2,6,5,0)'); g.fillStyle = cg; g.fillRect(0, 0, W, 40);
      g.fillStyle = '#1f5d3a'; g.fillRect(0, HOR - 6, W, FT - HOR + 2);
      g.strokeStyle = 'rgba(160,255,160,.35)'; g.lineWidth = 1; g.beginPath();
      for (let i = 0; i < 3; i++) { const y = HOR - 2 + i * 6; for (let x = -((cam * 1.2 + t * 0.6 + i * 20) % 40); x < W; x += 40) { g.moveTo(x, y); g.quadraticCurveTo(x + 10, y - 2, x + 20, y); } }
      g.stroke();
      g.fillStyle = '#3b4a44'; g.fillRect(0, FT - 4, W, H - FT + 4); g.fillStyle = '#56685f'; g.fillRect(0, FT - 5, W, 3);
      floorRows('#2c3833', 6); floorCols(cam, 60, '#2c3833', 1, FT - 4);
      break;
    }
    case 'site': {
      const gr = g.createLinearGradient(0, 0, 0, HOR); gr.addColorStop(0, '#4a2a6e'); gr.addColorStop(0.6, '#d0604a'); gr.addColorStop(1, '#ffae5a'); g.fillStyle = gr; g.fillRect(0, 0, W, HOR);
      circ(W * 0.72 - cam * 0.02, 104, 26, '#ffd27a', null);
      skyline(cam, 0.15, '#5a2a4a', 300, 20, 60, HOR, null);
      repeat(cam, 0.3, 700, sx => { g.strokeStyle = '#3a1a2a'; g.lineWidth = 2; g.strokeRect(sx + 100, 20, 10, HOR - 20); g.beginPath(); for (let y = 20; y < HOR; y += 10) { g.moveTo(sx + 100, y); g.lineTo(sx + 110, y + 10); } g.moveTo(sx + 60, 24); g.lineTo(sx + 260, 24); g.stroke(); seg(sx + 230, 24, sx + 230, 60, 0.6, '#3a1a2a'); });
      repeat(cam, 0.6, 240, (sx, k) => {
        g.strokeStyle = '#b8472a'; g.lineWidth = 4; const top = 30 + hash(k + 50) * 30;
        g.beginPath(); g.moveTo(sx, HOR); g.lineTo(sx, top); g.moveTo(sx + 90, HOR); g.lineTo(sx + 90, top); g.moveTo(sx - 4, top); g.lineTo(sx + 94, top); g.moveTo(sx - 4, top + 44); g.lineTo(sx + 94, top + 44); g.stroke();
        g.lineWidth = 1.5; g.beginPath(); g.moveTo(sx, top); g.lineTo(sx + 90, top + 44); g.moveTo(sx + 90, top); g.lineTo(sx, top + 44); g.stroke();
      });
      g.fillStyle = '#8a7560'; g.fillRect(0, HOR, W, H - HOR); floorRows('#72604c', 6, 0.7); floorCols(cam, 70, '#72604c', 0.6);
      repeat(cam, 1, 300, sx => { for (let i = 0; i < 6; i++) { g.fillStyle = i % 2 ? '#fff' : '#f07a1c'; g.fillRect(sx + i * 8, HOR - 14, 8, 6); } g.fillStyle = '#333'; g.fillRect(sx + 2, HOR - 8, 2, 10); g.fillRect(sx + 42, HOR - 8, 2, 10); });
      repeat(cam, 1, 380, sx => ell(sx + 120, 200, 22, 5, 0, '#76634f', null));
      break;
    }
    case 'docks': {
      skyGrad('#060d20', '#1f2f5a', 96); stars(50, 77); circ(110 - cam * 0.03, 40, 14, '#f4f0d8', null);
      g.fillStyle = '#0c2440'; g.fillRect(0, 96, W, HOR - 96);
      g.strokeStyle = 'rgba(244,240,216,.45)'; g.lineWidth = 1; g.beginPath(); for (let i = 0; i < 8; i++) { const y = 100 + i * 6, x = 110 - cam * 0.03 + Math.sin(t * 0.05 + i) * 6; g.moveTo(x - 12 + i, y); g.lineTo(x + 12 - i, y); } g.stroke();
      repeat(cam, 0.25, 600, sx => { g.fillStyle = '#081222'; g.beginPath(); g.moveTo(sx + 40, 96); g.lineTo(sx + 60, 110); g.lineTo(sx + 220, 110); g.lineTo(sx + 240, 96); g.fill(); g.fillRect(sx + 90, 76, 60, 20); g.fillRect(sx + 160, 60, 10, 36); });
      repeat(cam, 1, 260, (sx, k) => {
        if (hash(k + 5) < 0.3) return;
        const cols = ['#b33a3a', '#2a8a5a', '#2a5a9a', '#c8801a'];
        for (let j = 0; j < 2; j++) { const c = cols[Math.floor(hash(k * 7 + j) * 4)], y = HOR - 36 - j * 36; if (j && hash(k + 99) < 0.5) break; g.fillStyle = c; g.fillRect(sx + j * 10, y, 110, 36); g.fillStyle = 'rgba(0,0,0,.22)'; for (let x = sx + j * 10 + 6; x < sx + j * 10 + 108; x += 8) g.fillRect(x, y + 3, 3, 30); g.strokeStyle = OUT; g.lineWidth = 1; g.strokeRect(sx + j * 10, y, 110, 36); }
      });
      g.fillStyle = '#5a4632'; g.fillRect(0, HOR, W, H - HOR); floorRows('#3e2f20', 9); floorCols(cam, 90, '#3e2f20', 0.6);
      repeat(cam, 1, 150, sx => { g.fillStyle = '#222'; rrect(sx, HOR - 6, 8, 10, 2); g.fill(); });
      break;
    }
    case 'tech': {
      g.fillStyle = '#140a24'; g.fillRect(0, 0, W, HOR);
      repeat(cam, 1, 80, (sx, k) => {
        for (let r = 0; r < 3; r++) { g.fillStyle = '#23163c'; g.fillRect(sx + 2, 8 + r * 46, 76, 42); g.strokeStyle = '#3a2766'; g.lineWidth = 1; g.strokeRect(sx + 2, 8 + r * 46, 76, 42); }
        const on = 0.5 + 0.5 * Math.sin(t * 0.08 + k);
        g.fillStyle = `rgba(80,240,255,${0.3 + on * 0.6})`; g.fillRect(sx + 8, 50, 64, 2);
        g.fillStyle = `rgba(255,80,220,${0.3 + (1 - on) * 0.6})`; g.fillRect(sx + 8, 96, 64, 2);
        if (k % 3 === 0) { g.fillStyle = '#0a1a2a'; g.fillRect(sx + 14, 60, 50, 30); g.fillStyle = '#3af0a0'; for (let i = 0; i < 5; i++) g.fillRect(sx + 18, 64 + i * 5, 10 + hash(k + i + (t >> 3)) * 36, 2); }
      });
      repeat(cam, 1, 400, sx => { g.save(); g.shadowColor = '#c070ff'; g.shadowBlur = 16; circ(sx + 200, 70, 22, '#2a1050', '#c070ff', 3); g.restore(); circ(sx + 200, 70, 10 + Math.sin(t * 0.1) * 3, '#c070ff', null); });
      g.fillStyle = '#1a1030'; g.fillRect(0, HOR, W, H - HOR); floorRows('rgba(80,240,255,.35)', 8); floorCols(cam, 50, 'rgba(80,240,255,.35)');
      g.fillStyle = '#3af0ff'; g.globalAlpha = 0.6; g.fillRect(0, HOR, W, 1.5); g.globalAlpha = 1;
      break;
    }
  }
}

// ---------------------------------------------------------------- рисуване: сцени
function drawWorld() {
  const L = LEVELS[G.lvl], cam = Math.round(G.cam * 2) / 2;
  g.save();
  if (G.shake) g.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake) * 0.6);
  drawBG(L.theme, cam);
  for (const h of hazards) if (h.k === 'laser' || (h.k === 'car' && h.t <= h.warn)) drawHazard(h, cam);
  const list = [];
  for (const o of props) { list.push([o.y, () => { shadow(o.x - cam, o.y, 0, 11); drawProp(o, cam); }]); }
  for (const it of items) list.push([it.y, () => { shadow(it.x - cam, it.y, it.z, 9); drawItem(it, cam); }]);
  for (const e of ents) list.push([e.y, () => { if (!e.ghost) shadow(e.x - cam, e.y, e.z, e.hw * 1.2); drawChar(e, cam); }]);
  if (P && P.state !== 'dead') list.push([P.y + 0.01, () => { shadow(P.x - cam, P.y, P.z, 11); drawChar(P, cam); }]);
  for (const p of projs) list.push([p.y, () => { shadow(p.x - cam, p.y, p.z, 3); drawProj(p, cam); }]);
  for (const h of hazards) if (h.k === 'fall') list.push([h.y, () => drawHazard(h, cam)]); else if (h.k === 'car' && h.t > h.warn) list.push([h.y, () => drawHazard(h, cam)]);
  list.sort((a, b) => a[0] - b[0]);
  for (const [, fn] of list) fn();
  // лазерите на Мозъка
  for (const e of ents) if (e.boss && e.move === 'laser' && e.phase > 0) {
    const y = e.y - e.z - 26 * e.sc, x0 = e.x - cam + e.face * 18, x1 = e.face > 0 ? W : 0;
    if (e.phase === 1) { if (G.t & 4) { g.strokeStyle = 'rgba(255,60,200,.8)'; g.setLineDash([5, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); g.setLineDash([]); } }
    else { g.save(); g.shadowColor = '#ff40d0'; g.shadowBlur = 14; g.fillStyle = '#ff70e0'; g.fillRect(Math.min(x0, x1), y - 4, Math.abs(x1 - x0), 8); g.fillStyle = '#fff'; g.fillRect(Math.min(x0, x1), y - 1.5, Math.abs(x1 - x0), 3); g.restore(); }
  }
  drawParts(cam);
  for (const t of texts) { g.globalAlpha = Math.min(1, t.life / 20); txt(t.txt, t.x - cam, t.y - t.z, 7, t.col); g.globalAlpha = 1; }
  g.restore();
  if (L.theme === 'sewer' || L.theme === 'tech') { const v = g.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 300); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = v; g.fillRect(0, 0, W, H); }
}
function hpBar(x, y, w, h, v, col) {
  g.fillStyle = '#0a0a0a'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = '#3a1010'; g.fillRect(x, y, w, h);
  g.fillStyle = v > 0.5 ? col : v > 0.25 ? '#ffd23f' : '#ff4a3a'; g.fillRect(x, y, w * clamp(v, 0, 1), h);
  g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x, y, w * clamp(v, 0, 1), 1);
}
function drawHUD() {
  const T = TURTLES[G.turtle];
  g.fillStyle = 'rgba(0,0,0,.45)'; rrect(4, 4, 150, 30, 4); g.fill();
  g.save(); g.translate(18, 19); g.scale(1.4, 1.4); headTurtle(0, 0, 6.5, P.C, G.t); g.restore();
  txt(T.name, 34, 12, 7, T.color === '#8a45d6' ? '#c9a0ff' : T.color, 'left');
  txt('x' + G.lives, 148, 12, 7, '#fff', 'right');
  hpBar(34, 19, 114, 6, P.hp / 100, '#5fe05f');
  txt(String(G.score).padStart(7, '0'), 150, 29, 6, '#ffd23f', 'right', FP, 2);
  const bs = ents.filter(e => e.boss && e.hp > 0);
  bs.forEach((b, i) => {
    const y = 8 + i * 22;
    txt(b.def.name, W - 8, y + 2, 7, '#ff7a6a', 'right');
    hpBar(W - 158, y + 9, 150, 6, b.hp / b.maxhp, '#ff5a3a');
  });
  if (G.goT > 0 && !G.wave && (G.t & 16)) { txt('НАПРЕД', W - 60, H / 2 - 30, 12, '#ffd23f'); g.fillStyle = '#ffd23f'; g.beginPath(); g.moveTo(W - 14, H / 2 - 30); g.lineTo(W - 26, H / 2 - 40); g.lineTo(W - 26, H / 2 - 20); g.closePath(); g.fill(); g.strokeStyle = '#000'; g.lineWidth = 1.5; g.stroke(); }
  if (G.introT > 0) {
    const L = LEVELS[G.lvl], k = G.introT > 140 ? (170 - G.introT) / 30 : G.introT < 30 ? G.introT / 30 : 1;
    g.fillStyle = `rgba(0,0,0,${0.7 * k})`; g.fillRect(0, H / 2 - 36, W, 72);
    g.globalAlpha = k; txt('РУНД ' + (G.lvl + 1), W / 2, H / 2 - 16, 10, '#ffd23f'); txt(L.name, W / 2, H / 2 + 6, 22, '#7dff7d', 'center', FT_T, 5); txt(L.sub, W / 2, H / 2 + 26, 6, '#eaffea', 'center', FP, 2); g.globalAlpha = 1;
  }
  if (G.banner && G.banner.t > 0) {
    const k = Math.min(1, G.banner.t / 20, (160 - G.banner.t) / 15);
    g.globalAlpha = k; g.fillStyle = 'rgba(80,0,0,.7)'; g.fillRect(0, H / 2 - 22, W, 44);
    txt('ШЕФ', W / 2, H / 2 - 9, 8, '#ffd23f'); txt(G.banner.txt, W / 2, H / 2 + 8, 18, '#ff7a6a', 'center', FT_T, 4); g.globalAlpha = 1;
  }
  if (G.bossStage === 2) txt('НЕЩО ИДВА...', W / 2, H / 2, 12, '#c070ff');
  if (G.bossStage === 4) txt('ПОБЕДА!', W / 2, H / 2 - 10, 26, '#7dff7d', 'center', FT_T, 6);
}
function button(x, y, w, h, label, fn, size = 8) {
  const i = UI.btns.length; UI.btns.push({ x, y, w, h, fn });
  const sel = G.sel === i;
  rrect(x, y, w, h, 5); g.fillStyle = sel ? '#ffd23f' : 'rgba(10,24,14,.88)'; g.fill();
  g.lineWidth = 2; g.strokeStyle = sel ? '#fff' : '#5fae3e'; g.stroke();
  txt(label, x + w / 2, y + h / 2 + 1, size, sel ? '#111' : '#eaffea', 'center', FP, 0);
}
function logo(y, s = 1) {
  g.save(); g.translate(W / 2, y); g.scale(s, s);
  g.save(); g.rotate(-0.03);
  txt('КОСТЕНУРКИТЕ', 0, 0, 36, '#6fd04a', 'center', FT_T, 9);
  g.restore();
  g.fillStyle = '#d0342f'; g.beginPath(); g.moveTo(-96, 20); g.lineTo(96, 16); g.lineTo(90, 44); g.lineTo(-90, 46); g.closePath(); g.fill(); g.strokeStyle = '#111'; g.lineWidth = 3; g.stroke();
  txt('НИНДЖИ', 0, 31, 24, '#fff', 'center', FT_T, 0);
  g.restore();
}
function fakeTurtle(i, st = 'idle') { const e = { pl: true, t: TURTLES[i], x: 0, y: 0, z: 0, face: 1, state: st, st: G.t % 30, anim: G.t + i * 13, inv: 0, combo: 1, jk: false }; e.C = colorsFor(e); return e; }
function drawTitle() {
  drawBG('street', G.t * 0.6);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, W, H);
  logo(56);
  for (let i = 0; i < 4; i++) { const e = fakeTurtle(i); e.x = 150 + i * 60; e.y = 196; e.face = i < 2 ? 1 : -1; shadow(e.x, e.y, 0, 12); g.save(); drawChar(e, 0); g.restore(); }
  UI.cols = 1;
  button(W / 2 - 70, 206, 140, 22, 'ИГРАЙ', () => { G.startLvl = 0; setScene('select'); }, 10);
  button(W / 2 - 70, 232, 66, 18, 'РУНДОВЕ', () => setScene('levels'), 6);
  button(W / 2 + 4, 232, 66, 18, Snd.muted ? 'ЗВУК: НЕ' : 'ЗВУК: ДА', () => { Snd.setMuted(!Snd.muted); if (!Snd.muted) Music.start('title'); }, 6);
  button(W - 74, 8, 66, 16, 'ЦЯЛ ЕКРАН', goFull, 5);
  if (G.best) txt('РЕКОРД ' + G.best, 8, 14, 6, '#ffd23f', 'left', FP, 2);
  txt('Фен игра. Не е официален продукт.', W / 2, H - 8, 5, '#9ab09a', 'center', FP, 0);
  Music.start('title');
}
function goFull() {
  const d = document.documentElement;
  try {
    const p = (d.requestFullscreen || d.webkitRequestFullscreen || (() => Promise.reject())).call(d);
    if (p && p.then) p.then(() => { try { screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } }).catch(() => { });
  } catch (e) { }
}
function drawSelect() {
  drawBG('sewer', G.t * 0.3);
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, W, H);
  txt('ИЗБЕРИ КОСТЕНУРКА', W / 2, 20, 11, '#ffd23f');
  txt('РУНД ' + (G.startLvl + 1) + ': ' + LEVELS[G.startLvl].name, W / 2, 36, 6, '#9ad09a', 'center', FP, 2);
  UI.cols = 4;
  for (let i = 0; i < 4; i++) {
    const T = TURTLES[i], x = 16 + i * 114, y = 46, w = 106, h = 186, sel = G.sel === i;
    UI.btns.push({ x, y, w, h, fn: () => startGame(i, G.startLvl) });
    rrect(x, y, w, h, 6); g.fillStyle = sel ? 'rgba(255,210,63,.18)' : 'rgba(10,20,14,.85)'; g.fill(); g.lineWidth = sel ? 3 : 1.5; g.strokeStyle = sel ? '#ffd23f' : T.color; g.stroke();
    const e = fakeTurtle(i, sel && (G.t % 60) < 20 ? 'attack' : 'idle'); if (e.state === 'attack') e.st = G.t % 20; e.sc = 2.1; e.x = x + w / 2; e.y = y + 116;
    shadow(e.x, e.y, 0, 20); drawChar(e, 0);
    txt(T.name, x + w / 2, y + 132, 11, T.color === '#8a45d6' ? '#c9a0ff' : T.color);
    txt(T.desc, x + w / 2, y + 146, 6, '#eaffea', 'center', FP, 2);
    ['СИЛА', 'БЪРЗ', 'ОБХВАТ'].forEach((lb, j) => {
      txt(lb, x + 8, y + 158 + j * 9, 5, '#9ab09a', 'left', FP, 0);
      for (let k = 0; k < 5; k++) { g.fillStyle = k < T.stat[j] ? '#5fe05f' : '#2a3a2a'; g.fillRect(x + 54 + k * 9, y + 155 + j * 9, 7, 5); }
    });
  }
  const bi = UI.btns.length; UI.btns.push({ x: 6, y: 6, w: 56, h: 18, fn: () => setScene('title') });
  rrect(6, 6, 56, 18, 4); g.fillStyle = G.sel === bi ? '#ffd23f' : 'rgba(10,24,14,.88)'; g.fill(); g.strokeStyle = '#5fae3e'; g.lineWidth = 1.5; g.stroke();
  txt('< НАЗАД', 34, 16, 5, G.sel === bi ? '#111' : '#eaffea', 'center', FP, 0);
  txt('Докосни костенурка, за да започнеш', W / 2, H - 16, 6, '#eaffea', 'center', FP, 2);
}
function drawLevels() {
  drawBG('tech', G.t * 0.3);
  g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, W, H);
  txt('ИЗБЕРИ РУНД', W / 2, 20, 11, '#ffd23f');
  UI.cols = 3;
  LEVELS.forEach((L, i) => {
    const x = 18 + (i % 3) * 150, y = 40 + Math.floor(i / 3) * 104, w = 142, h = 96, sel = G.sel === i;
    UI.btns.push({ x, y, w, h, fn: () => { G.startLvl = i; setScene('select'); } });
    g.save(); rrect(x, y, w, h, 6); g.clip();
    g.translate(x, y); g.scale(w / W, h / H); drawBG(L.theme, 400 + i * 200); g.restore();
    g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(x, y + h - 40, w, 40);
    rrect(x, y, w, h, 6); g.lineWidth = sel ? 3 : 1.5; g.strokeStyle = sel ? '#ffd23f' : '#5fae3e'; g.stroke();
    txt('РУНД ' + (i + 1), x + 8, y + 12, 7, '#ffd23f', 'left');
    txt(L.name, x + w / 2, y + h - 28, 7, '#7dff7d', 'center', FP, 2);
    txt('Шеф: ' + [...L.boss, ...(L.boss2 || [])].map(b => BDEF[b].name).join(', '), x + w / 2, y + h - 12, 5, '#ffb0a0', 'center', FP, 0);
    if (G.done.includes(i)) txt('ПРЕМИНАТ', x + w - 8, y + 12, 5, '#7dff7d', 'right', FP, 2);
  });
  const bi = UI.btns.length; UI.btns.push({ x: 6, y: 6, w: 56, h: 18, fn: () => setScene('title') });
  rrect(6, 6, 56, 18, 4); g.fillStyle = G.sel === bi ? '#ffd23f' : 'rgba(10,24,14,.88)'; g.fill(); g.strokeStyle = '#5fae3e'; g.lineWidth = 1.5; g.stroke();
  txt('< НАЗАД', 34, 16, 5, G.sel === bi ? '#111' : '#eaffea', 'center', FP, 0);
}
function panel(h) { g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(0, 0, W, H); rrect(W / 2 - 130, H / 2 - h / 2, 260, h, 8); g.fillStyle = 'rgba(12,26,16,.95)'; g.fill(); g.strokeStyle = '#5fae3e'; g.lineWidth = 2; g.stroke(); }
function drawPause() {
  panel(130); UI.cols = 1;
  txt('ПАУЗА', W / 2, H / 2 - 42, 16, '#ffd23f');
  button(W / 2 - 80, H / 2 - 20, 160, 22, 'ПРОДЪЛЖИ', togglePause, 8);
  button(W / 2 - 80, H / 2 + 8, 76, 20, Snd.muted ? 'ЗВУК: НЕ' : 'ЗВУК: ДА', () => Snd.setMuted(!Snd.muted), 6);
  button(W / 2 + 4, H / 2 + 8, 76, 20, 'МЕНЮ', () => { setScene('title'); }, 6);
  txt('Стрелки/джойстик: ход  J/УДАР  K/СКОК  L/СПЕЦ', W / 2, H / 2 + 46, 5, '#9ab09a', 'center', FP, 0);
}
function drawClear() {
  panel(140); UI.cols = 1;
  txt('РУНД ' + (G.lvl + 1) + ' ПРЕМИНАТ!', W / 2, H / 2 - 48, 12, '#7dff7d');
  txt('Бонус: ' + G.bonus, W / 2, H / 2 - 24, 8, '#ffd23f');
  txt('Точки: ' + G.score, W / 2, H / 2 - 8, 8, '#eaffea');
  const last = G.lvl >= LEVELS.length - 1;
  button(W / 2 - 80, H / 2 + 10, 160, 24, last ? 'ФИНАЛ' : 'СЛЕДВАЩ РУНД', () => { if (last) { setScene('ending'); Music.start('end'); confetti(); } else startLevel(G.lvl + 1); }, 8);
  button(W / 2 - 50, H / 2 + 40, 100, 18, 'МЕНЮ', () => setScene('title'), 6);
}
function drawGameOver() {
  panel(130); UI.cols = 1;
  txt('КРАЙ НА ИГРАТА', W / 2, H / 2 - 40, 14, '#ff5a4a');
  txt('Точки: ' + G.score, W / 2, H / 2 - 18, 8, '#ffd23f');
  button(W / 2 - 80, H / 2 - 2, 160, 24, 'ПРОДЪЛЖИ РУНДА', () => { G.lives = 3; G.conts++; G.score = Math.floor(G.score / 2); startLevel(G.lvl); }, 7);
  button(W / 2 - 50, H / 2 + 30, 100, 18, 'МЕНЮ', () => setScene('title'), 6);
}
function confetti() { parts = []; for (let i = 0; i < 120; i++) parts.push({ k: 'confetti', x: rnd(W), y: rnd(-H, 0), vx: rnd(-0.4, 0.4), vy: rnd(0.6, 1.6), vz: 0, z: 0, life: 99999, max: 99999, col: ['#ffd23f', '#e0342f', '#2f6fe0', '#8a45d6', '#f08a1c', '#5fe05f'][i % 6] }); }
function drawEnding() {
  drawBG('street', 900 + G.t * 0.2);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, W, H);
  for (const q of parts) if (q.y > H) q.y -= H + 10;
  txt('ГРАДЪТ Е СПАСЕН!', W / 2, 32, 26, '#7dff7d', 'center', FT_T, 6);
  txt('Костенурките празнуват с пица.', W / 2, 58, 7, '#eaffea', 'center', FP, 2);
  ell(W / 2, 200, 30, 10, 0, '#f0e0c0'); ell(W / 2, 199, 26, 8, 0, '#e8a03a', '#b06a20'); ell(W / 2, 198.5, 22, 6.5, 0, '#f2c94c', null);
  for (let i = 0; i < 7; i++) ell(W / 2 - 16 + i * 5.3, 197 + Math.sin(i * 2) * 3, 2, 1.1, 0, '#c0392b', null);
  for (let i = 0; i < 4; i++) { const e = fakeTurtle(i, (G.t + i * 20) % 80 < 30 ? 'jump' : 'idle'); e.sc = 1.5; e.x = 120 + i * 80 + (i > 1 ? 20 : -20); e.y = 210; e.face = i < 2 ? 1 : -1; e.z = e.state === 'jump' ? Math.sin(((G.t + i * 20) % 80) / 30 * Math.PI) * 20 : 0; shadow(e.x, e.y, e.z, 16); drawChar(e, 0); }
  txt('Точки: ' + G.score + (G.conts ? '   Продължения: ' + G.conts : ''), W / 2, 80, 7, '#ffd23f', 'center', FP, 2);
  drawParts(0);
  UI.cols = 1;
  button(W / 2 - 50, H - 30, 100, 20, 'МЕНЮ', () => setScene('title'), 7);
}
function render() {
  g.setTransform(DPR * SC, 0, 0, DPR * SC, 0, 0);
  g.clearRect(0, 0, W, H);
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
let last = performance.now(), acc = 0;
function frame(now) {
  requestAnimationFrame(frame);
  acc += Math.min(100, now - last); last = now;
  let n = 0;
  while (acc >= 1000 / 60 && n < 4) { tick(); acc -= 1000 / 60; n++; }
  if (n === 4) acc = 0;
  for (let i = 1; i < (window.__turbo | 0); i++) tick();
  render();
}
if (document.fonts && document.fonts.load) { document.fonts.load('10px "Press Start 2P"').catch(() => { }); document.fonts.load('20px "Russo One"').catch(() => { }); }
setScene('title');
requestAnimationFrame(frame);
window.__dbg = { startGame, startLevel, get P() { return P; }, get ents() { return ents; }, inp, keys, LEVELS };
})();
