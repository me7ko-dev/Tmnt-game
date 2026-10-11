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
  const top = portrait ? Math.max(8, Math.floor((vh * 0.6 - ch) / 2)) : Math.floor((vh - ch) / 2);
  cv.style.top = top + 'px';
  const rot = document.getElementById('rot'); if (rot) { rot.hidden = !portrait; rot.style.top = (top + ch + 14) + 'px'; }
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
        case 'super': this.osc('sawtooth', 110, 880, 0.5, 0.18); this.osc('square', 220, 1760, 0.45, 0.08, 0.05); this.nz(0.6, 0.35, 300, 6000); break;
        case 'ready': [7, 12, 19].forEach((s, i) => this.osc('triangle', 523 * 2 ** (s / 12), 523 * 2 ** (s / 12), 0.1, 0.16, i * 0.05)); break;
        case 'throw': this.nz(0.18, 0.3, 600, 2400); this.osc('square', 300, 120, 0.15, 0.1); break;
        case 'armor': this.osc('square', 1400, 900, 0.06, 0.08); this.nz(0.05, 0.25, 5000, 3000, 'highpass'); break;
        case 'fuse': this.nz(0.25, 0.12, 6000, 3000, 'highpass'); break;
        case 'power': [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => this.osc('square', 392 * 2 ** (s / 12), 392 * 2 ** (s / 12), 0.07, 0.11, i * 0.045)); break;
        case 'combo': this.osc('triangle', 1046, 1568, 0.12, 0.14); break;
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
// body: разлики в тялото спрямо общия модел; face: характер на лицето; sup: името на супер удара
const TURTLES = [
  { id: 'leo', name: 'ЛЕО', color: '#2f6fe0', weapon: 'katana', spd: 1.55, dmg: [7, 7, 12], atkT: 17, reach: 38, desc: 'Катани', stat: [3, 3, 3], skin: '#4ea437', face: 'calm', body: {}, sup: 'ВИХРЕН УДАР' },
  { id: 'raf', name: 'РАФ', color: '#e0342f', weapon: 'sai', spd: 1.6, dmg: [9, 9, 14], atkT: 14, reach: 30, desc: 'Саи', stat: [5, 3, 1], skin: '#3f9238', face: 'scowl', body: { bodyW: 17, torso: 14.4, ar: [3.4, 2.9, 2.3], lr: [3.9, 3.2, 2.5], hand: 2.9 }, sup: 'ЗЕМЕТРЕСЕНИЕ' },
  { id: 'don', name: 'ДОН', color: '#8a45d6', weapon: 'bo', spd: 1.42, dmg: [7, 7, 12], atkT: 20, reach: 50, desc: 'Бо тояга', stat: [3, 2, 5], skin: '#6aa23c', face: 'smart', body: { leg: 8.9, torso: 14.8, bodyW: 14.6, ar: [2.8, 2.4, 2.0], lr: [3.4, 2.8, 2.3] }, sup: 'БО ТОРНАДО' },
  { id: 'mik', name: 'МАЙК', color: '#f08a1c', weapon: 'nunchaku', spd: 1.72, dmg: [6, 6, 11], atkT: 12, reach: 33, desc: 'Нунчаку', stat: [2, 5, 2], skin: '#79b83d', face: 'grin', body: { leg: 7.6, torso: 13.6, bodyW: 15.6, headR: 7.7 }, sup: 'НУНЧАКУ БУРЯ' }
];
// armor: не се спира от обикновени удари; sc: размер; lob: хвърля бомби по дъга
const EDEF = {
  n: { style: 'ninja', suit: '#6b3fa0', hp: 22, spd: 0.9, dmg: 6, reach: 24, windup: 22, score: 100 },
  o: { style: 'ninja', suit: '#d0622a', hp: 26, spd: 1.25, dmg: 7, reach: 24, windup: 16, leap: true, score: 150 },
  w: { style: 'ninja', suit: '#d8d8e0', mask: '#b02a2a', hp: 20, spd: 0.95, dmg: 5, reach: 24, windup: 18, ranged: { type: 'star', cd: 120 }, score: 150 },
  y: { style: 'ninja', suit: '#d6b928', hp: 34, spd: 1.0, dmg: 9, reach: 34, windup: 20, weapon: 'sword', dash: true, plate: true, score: 200 },
  k: { style: 'ninja', suit: '#a8283a', mask: '#241a22', hp: 28, spd: 1.15, dmg: 8, reach: 54, windup: 20, weapon: 'kusari', hair: true, score: 250 },
  b: { style: 'ninja', suit: '#3f7a4a', mask: '#e0b830', hp: 22, spd: 0.95, dmg: 10, reach: 24, windup: 20, ranged: { type: 'bomb', cd: 170 }, bag: true, score: 200 },
  h: { style: 'brute', suit: '#4a3a5e', hp: 72, spd: 0.62, dmg: 13, reach: 36, windup: 30, weapon: 'club', armor: true, sc: 1.16, score: 400 },
  r: { style: 'robot', hp: 10, spd: 1.35, dmg: 4, reach: 16, windup: 16, leap: true, score: 80 },
  s: { style: 'soldier', suit: '#7d8794', hp: 40, spd: 0.8, dmg: 9, reach: 26, windup: 24, weapon: 'gun', ranged: { type: 'laser', cd: 140 }, score: 250 }
};
const DIFF = [
  { name: 'ЛЕСНО', dmg: 0.6, wu: 1.25, lives: 4, boss: 0.8, haz: 1.4 },
  { name: 'СРЕДНО', dmg: 1, wu: 1, lives: 3, boss: 1, haz: 1 },
  { name: 'ТРУДНО', dmg: 1.35, wu: 0.82, lives: 2, boss: 1.2, haz: 0.8 }
];
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
    waves: [[180, 'nno'], [600, 'nnwo'], [1040, 'onwno'], [1480, 'nnokw'], [1920, 'oonnw'], [2360, 'nwkno']], boss: ['boar'] },
  { name: 'КАНАЛИТЕ', sub: 'Роботите-хапльовци нападат', theme: 'sewer', len: 3000, hazard: 'drip', maxAlive: 4, maxEng: 2, prop: 'barrel',
    waves: [[180, 'rrr'], [600, 'nnrr'], [1040, 'ownrr'], [1480, 'rrbrn'], [1920, 'oonkr'], [2360, 'nrrwbr']], boss: ['fly'] },
  { name: 'СТРОЕЖЪТ', sub: 'Опасност отгоре', theme: 'site', len: 3200, hazard: 'beam', maxAlive: 4, maxEng: 3, prop: 'crate',
    waves: [[180, 'nny'], [620, 'onsy'], [1080, 'ywnbo'], [1540, 'ssnh'], [2000, 'yyowr'], [2500, 'sokhw']], boss: ['samurai'] },
  { name: 'ПРИСТАНИЩЕТО', sub: 'Двамата мутанти се завръщат', theme: 'docks', len: 3200, hazard: 'crate', maxAlive: 4, maxEng: 3, prop: 'crate',
    waves: [[180, 'noyw'], [620, 'ssokn'], [1080, 'rrrnoy'], [1540, 'ywhbo'], [2000, 'yysoow'], [2500, 'nsykhw']], boss: ['rhino', 'boar'] },
  { name: 'ТЕХНО-КРЕПОСТТА', sub: 'Последната битка', theme: 'tech', len: 3400, hazard: 'laser', maxAlive: 4, maxEng: 3, prop: 'barrel',
    waves: [[180, 'ssy'], [620, 'yykow'], [1080, 'sssr'], [1540, 'ywhws'], [2000, 'rrrsyb'], [2500, 'yyhsbk'], [2900, 'sohwk']], boss: ['blade'], boss2: ['brain'] }
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
  flash: 0, god: location.hash === '#god', done: store.get('done', []), best: store.get('best', 0),
  diff: store.get('diff', 1), vib: store.get('vib', true), chain: 0, chainT: 0, cut: null, tint: 0,
  stats: { kills: 0, maxChain: 0, dmg: 0, t: 0 }
};
const D_ = () => DIFF[G.diff] || DIFF[1];
function buzz(ms) { if (G.vib && navigator.vibrate) try { navigator.vibrate(ms); } catch (e) { } }
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
// бутон „Инсталирай“ (Android/Chrome) – играта става приложение на телефона
let installEvt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
addEventListener('appinstalled', () => { installEvt = null; });
function installApp() { const ev = installEvt; if (!ev) return; installEvt = null; try { ev.prompt(); } catch (e) { } }
let wakeLock = null;
function keepAwake() { try { if (navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(w => { wakeLock = w; w.addEventListener('release', () => { wakeLock = null; }); }).catch(() => { }); } catch (e) { } }

function colorsFor(e) {
  if (e.pl) { const s = e.t.skin; return { skin: s, shell: '#7a5226', plas: '#e6c35c', pad: '#7d4f24', band: e.t.color, belt: '#6b4220', dual: e.t.weapon !== 'bo', weapon: e.t.weapon, leg: s, arm: s }; }
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
function makePlayer(ti, pow = 0) {
  const p = { pl: true, t: TURTLES[ti], x: G.cam + 70, y: 214, z: 0, vx: 0, vz: 0, face: 1, state: 'idle', st: 0, anim: 0, hp: 100, inv: 60, combo: 0, comboT: 0, queued: false, hit: new Set(), jk: false, hw: 10, jvx: 0, jvy: 0, pow, powT: 0, held: null };
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
    if (e.thrown) {
      e.thrown = false; e.hp -= 14; e.hpT = 100; e.flash = 8; shake(5); G.stop = Math.max(G.stop, 4); Snd.play('hit2'); buzz(25);
      dust(e.x, e.y, 9); spark(e.x, e.y, 8, 8, '#ffe0a0'); if (e.hp <= 0) onKill(e);
    }
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
const hittable = e => !e.ghost && e.hp > 0 && !['down', 'getup', 'dead', 'dying', 'enter', 'drop', 'held'].includes(e.state);
function playerStrike(p, reach, dmg, knock, around, depth = 16) {
  let n = 0;
  for (const e of ents) {
    if (!hittable(e) || p.hit.has(e)) continue;
    const ok = around ? (Math.abs(e.x - p.x) < reach + e.hw && Math.abs(e.y - p.y) < depth && Math.abs(e.z - p.z) < 34 + (e.boss ? 20 : 0)) : canHit(p, e, reach);
    if (ok) { p.hit.add(e); hurtEnemy(e, dmg, knock, e.x >= p.x ? 1 : -1); G.score += 10; n++; }
  }
  for (const o of props) {
    if (o.broken || p.hit.has(o)) continue;
    const ok = around ? Math.abs(o.x - p.x) < reach + o.hw && Math.abs(o.y - p.y) < depth : canHit(p, o, reach, 6, 14, 40);
    if (ok) { p.hit.add(o); hitProp(o); if (p.state !== 'super') p.pow = Math.min(100, p.pow + 2); }
  }
  return n;
}
function onKill(e) {
  if (e.counted) return; e.counted = true;
  G.score += e.def.score; G.stats.kills++; addText(e.x, e.y, 46, '+' + e.def.score);
}
// поредица от удари без да те ударят – дава точки и пълни метъра за супер удар
function chainHit() {
  G.chain++; G.chainT = 110; if (G.chain > G.stats.maxChain) G.stats.maxChain = G.chain;
  if (G.chain % 10 === 0) Snd.play('combo');
  if (P && P.state !== 'super') { const was = P.pow; P.pow = Math.min(100, P.pow + 4); if (was < 100 && P.pow >= 100) { Snd.play('ready'); addText(P.x, P.y, 62, 'СУПЕР!', '#ffd23f'); } }
}
function hurtEnemy(e, dmg, knock, dir, quiet) {
  if (!quiet && P && P.powT > 0) dmg = Math.round(dmg * 1.5);
  e.hp -= dmg; e.flash = 8; e.hpT = 110;
  if (!quiet) { G.stop = Math.max(G.stop, knock ? 5 : 3); Snd.play(knock ? 'hit2' : 'hit'); shake(knock ? 3 : 1.5); chainHit(); }
  // бронираните не се спират от обикновени удари – трябва трети удар от комбото, ритник или супер
  if (!e.boss && e.def.armor && !knock && e.hp > 0) {
    spark(e.x - dir * 6, e.y, e.z + 24 * e.sc, 4, '#a8d8ff'); Snd.play('armor'); e.x += dir * 1.2; e.armorT = 10;
    return;
  }
  spark(e.x - dir * 4, e.y, e.z + (e.boss ? 26 * e.sc : 20), knock ? 9 : 5);
  if (e.boss) {
    if (e.hp <= 0) { killBoss(e); return; }
    if ((e.state === 'idle' || e.state === 'walk') && e.flinchCd <= 0) { e.state = 'hurt'; e.st = 0; e.flinchCd = 50; e.vx = dir * 1.5; }
    return;
  }
  if (e.hp <= 0 || knock) {
    e.state = 'down'; e.st = 0; e.vx = dir * (knock ? 3.2 : 2.2); e.vz = knock ? 3.4 : 2.6; e.z = Math.max(e.z, 0.1); e.face = -dir;
    if (e.hp <= 0) onKill(e);
  } else {
    e.state = 'hurt'; e.st = 0; e.vx = dir * 1.2; e.face = -dir; if (e.z > 0) e.vz = Math.max(e.vz, 1.2);
  }
}
function hurtPlayer(p, dmg, knock, dir) {
  if (p.inv > 0 || p.powT > 0 || ['down', 'getup', 'special', 'super', 'throw', 'dead', 'respawn'].includes(p.state)) return false;
  dmg = Math.round(dmg * D_().dmg);
  if (G.god) dmg = 0;
  p.hp = Math.max(0, p.hp - dmg); p.flash = 8; G.stats.dmg += dmg;
  Snd.play('hurt'); shake(knock ? 4 : 2); G.stop = Math.max(G.stop, 4); spark(p.x, p.y, p.z + 22, 6, '#ff7a50'); buzz(knock ? 45 : 25);
  if (p.held) dropHeld(p);
  if (p.hp <= 0 || knock) { p.state = 'down'; p.st = 0; p.vx = dir * 2.6; p.vz = 3.2; p.z = Math.max(p.z, 0.1); p.face = -dir; }
  else { p.state = 'hurt'; p.st = 0; p.vx = dir * 1.4; p.face = -dir; }
  p.combo = 0; p.jk = false; p.pow = Math.min(100, p.pow + 5); G.chain = 0; G.chainT = 0; return true;
}
function strikeOnce(e, reach, dmg, knock) {
  if (e.hitDone || !P) return;
  if (canHit(e, P, reach) && hurtPlayer(P, dmg, knock, e.face)) e.hitDone = true;
}
const PROJ = { star: [3.6, 5], laser: [5, 8], bullet: [4.6, 6], acid: [3, 7], knife: [4.8, 8], blade: [4, 8], orb: [2.6, 10], bomb: [0, 12] };
function shoot(x, y, z, face, type, vy = 0) {
  const [sp, dmg] = PROJ[type];
  projs.push({ type, x, y, z, vx: face * sp, vy, life: 240, dmg, t: 0 });
}
// бомба по дъга: каца точно там, където е бил играчът, после избухва
function lob(x, y, z, tx, ty) {
  const T = 52, gb = GRAV * 0.55;
  projs.push({ type: 'bomb', x, y, z, tx, ty, vx: (tx - x) / T, vy: (ty - y) / T, vz: (0.5 * gb * T * T - z) / T, gb, life: 400, dmg: PROJ.bomb[1], t: 0, fuse: -1 });
}
function explode(pr) {
  Snd.play('boom'); shake(5); buzz(30);
  for (let i = 0; i < 3; i++) spark(pr.x + rnd(-10, 10), pr.y, rnd(4, 18), 8, i ? '#ffb040' : '#fff0a0');
  dust(pr.x, pr.y, 10); parts.push({ k: 'ring', x: pr.x, y: pr.y, z: 2, vx: 0, vy: 0, vz: 0, life: 16, max: 16, col: '#ffb040' });
  const near = e => Math.abs(e.x - pr.x) < 30 && Math.abs(e.y - pr.y) < 14 && e.z < 24;
  if (P && near(P)) hurtPlayer(P, pr.dmg, true, P.x >= pr.x ? 1 : -1);
  for (const e of ents) if (!e.boss && hittable(e) && near(e)) hurtEnemy(e, 14, true, e.x >= pr.x ? 1 : -1, true);
}

// ---------------------------------------------------------------- играч
function startAttack(p) {
  const cont = (p.state === 'attack' || p.comboT > 0) && p.combo < 3;
  p.combo = cont ? p.combo + 1 : 1; p.state = 'attack'; p.st = 0; p.queued = false; p.hit.clear();
}
// враг плътно до теб + джойстик в обратна посока + УДАР = хвърляне през рамо натам, накъдето държиш
function tryThrow(p, mx) {
  if (Math.abs(mx) < 0.4) return false;
  const dir = sgn(mx); let best = null, bd = 1e9;
  for (const e of ents) {
    if (e.boss || !hittable(e) || e.z > 6 || e.def.armor) continue;
    const dx = (p.x - e.x) * dir, dy = Math.abs(e.y - p.y);
    if (dx > -3 && dx < 26 + e.hw && dy < 11 && dx + dy < bd) { best = e; bd = dx + dy; }
  }
  if (!best) return false;
  p.face = dir; p.state = 'throw'; p.st = 0; p.held = best; p.combo = 0;
  best.state = 'held'; best.st = 0; best.face = dir; best.vx = 0; best.vz = 0; Snd.play('throw');
  return true;
}
function dropHeld(p) { const e = p.held; p.held = null; if (e && e.state === 'held') { e.state = 'down'; e.st = 20; e.vz = 1; e.z = Math.max(e.z, 0.1); } }
function startSpecial(p) {
  p.hp = Math.max(1, p.hp - Math.min(6, p.hp - 1));
  p.state = 'special'; p.st = 0; p.hit.clear(); Snd.play('special'); G.flash = 4;
}
function startSuper(p) {
  p.pow = 0; p.state = 'super'; p.st = 0; p.hit.clear(); p.inv = Math.max(p.inv, 10);
  Snd.play('super'); G.flash = 8; G.stop = 14; G.tint = 60; shake(5); buzz(70);
  G.cut = { t: 56, T: p.t };
}
function updPlayer(p) {
  p.st++; p.anim++; if (p.inv > 0) p.inv--; if (p.flash > 0) p.flash--;
  if (p.powT > 0) { p.powT--; if (p.powT % 4 === 0) parts.push({ k: 'mote', x: p.x + rnd(-8, 8), y: p.y, z: p.z + rnd(4, 34), vx: 0, vy: 0, vz: 0.8, life: 16, max: 16, col: ['#ffd23f', '#ff7040', '#7dff7d', '#60c0ff'][(p.powT >> 2) % 4], sz: 1.6 }); }
  if (p.comboT > 0) p.comboT--; else if (p.state !== 'attack') p.combo = 0;
  const T = p.t, sp = T.spd * (p.powT > 0 ? 1.15 : 1);
  physics(p);
  switch (p.state) {
    case 'idle': case 'walk': {
      const mx = inp.x, my = inp.y;
      p.x += mx * sp; p.y += my * sp * 0.62;
      if (Math.abs(mx) > 0.2) p.face = mx > 0 ? 1 : -1;
      p.state = (Math.abs(mx) > 0.15 || Math.abs(my) > 0.15) ? 'walk' : 'idle';
      if (take('s')) { if (p.pow >= 100) startSuper(p); else startSpecial(p); }
      else if (take('a')) { if (!tryThrow(p, mx)) startAttack(p); }
      else if (take('b')) { p.state = 'jump'; p.st = 0; p.vz = 5.6; p.z = 0.1; p.jk = false; p.jvx = mx * sp * 1.05; p.jvy = my * sp * 0.45; Snd.play('jump'); }
      break;
    }
    case 'throw': {
      const e = p.held;
      if (!e || e.state !== 'held') { p.held = null; if (p.st > 4) { p.state = 'idle'; p.st = 0; } break; }
      // вдига врага над главата и го хвърля напред (вече сме обърнати)
      const k = clamp(p.st / 14, 0, 1);
      e.x = p.x - p.face * lerp(14, -6, k); e.y = p.y + 0.5; e.z = lerp(4, 34, k);
      if (p.st === 16) {
        p.held = null; e.state = 'down'; e.st = 0; e.thrown = true; e.x = p.x + p.face * 10; e.z = 30; e.vx = p.face * 4.4; e.vz = 2.6; e.face = -p.face;
        e.hp -= 4; e.hpT = 110; Snd.play('swing'); shake(2); chainHit();
      }
      if (p.st >= 28) { p.state = 'idle'; p.st = 0; }
      break;
    }
    case 'super': doSuper(p); break;
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
// супер ударите – всяка костенурка има свой
function doSuper(p) {
  const s = p.st, sp = p.t.spd;
  const end = n => { if (s >= n) { p.state = 'idle'; p.st = 0; p.inv = Math.max(p.inv, 30); p.z = 0; p.vz = 0; } };
  switch (p.t.id) {
    case 'leo': // засилване и вихрен удар през екрана
      if (s >= 14 && s <= 40) {
        p.x += p.face * 6.2; p.y += inp.y * 0.9;
        if (s % 7 === 0) p.hit.clear();
        playerStrike(p, 24, 11, s >= 33, true, 22);
        parts.push({ k: 'streak', x: p.x - p.face * 8, y: p.y, z: p.z + 18 + rnd(-8, 8), vx: 0, vy: 0, vz: 0, life: 14, max: 14, col: '#9ad0ff', w: rnd(18, 36) * p.face });
      }
      end(56); break;
    case 'raf': { // скок и удар в земята – вълната поваля всички
      if (s >= 8 && s <= 30) { p.z = Math.sin((s - 8) / 22 * Math.PI) * 46; p.vz = 0; }
      if (s === 30) {
        p.z = 0; shake(11); Snd.play('boom'); buzz(90); G.flash = 6; dust(p.x, p.y, 16);
        parts.push({ k: 'wave', x: p.x, y: p.y, z: 0, vx: 0, vy: 0, vz: 0, life: 26, max: 26, col: '#ffb060' });
        for (const e of ents) if (hittable(e) && Math.abs(e.x - p.x) < 210 && e.z < 40) hurtEnemy(e, e.boss ? 30 : 34, true, e.x >= p.x ? 1 : -1);
        for (const o of props) if (!o.broken && Math.abs(o.x - p.x) < 210) { hitProp(o); if (!o.broken) hitProp(o); }
      }
      end(52); break;
    }
    case 'don': // вихрушка с бо-то, която се движи с джойстика
      p.x += inp.x * sp * 0.9; p.y += inp.y * sp * 0.55;
      if (s % 4 === 0) p.face *= -1;
      if (s >= 4 && s <= 66) { if (s % 9 === 4) p.hit.clear(); playerStrike(p, 60, s >= 60 ? 14 : 8, s >= 60, true, 26); }
      if (s % 3 === 0) parts.push({ k: 'dust', x: p.x + rnd(-40, 40), y: p.y + rnd(-6, 6), z: 1, vx: rnd(-1.5, 1.5), vy: 0, vz: 0.4, life: 22, max: 22, col: 'rgba(210,190,255,', sz: rnd(4, 7) });
      if (s % 8 === 0) Snd.play('swing');
      end(74); break;
    case 'mik': // буря от удари с нунчакуто
      if (s >= 6 && s <= 54) {
        p.x += p.face * 0.5 + inp.x * 0.4; p.y += inp.y * 0.6;
        if (s % 5 === 0) { p.hit.clear(); Snd.play('swing'); }
        playerStrike(p, 46, s >= 50 ? 14 : 5, s >= 50, false);
      }
      end(62); break;
  }
}
function loseLife(p) {
  Snd.play('die'); buzz(120);
  if (G.lives <= 0) { p.state = 'dead'; p.st = 0; setScene('gameover'); Music.stop(); return; }
  G.lives--; p.hp = 100; p.state = 'respawn'; p.st = 0; p.z = 190; p.vz = 0; p.x = G.cam + W * 0.3; p.inv = 150; p.combo = 0;
  addText(p.x, p.y, 60, 'ОЩЕ ВЕДНЪЖ!', '#7dff7d');
}

// ---------------------------------------------------------------- врагове
function spawnEnemy(code, side, drop) {
  const d = EDEF[code];
  const sc = d.sc || 1;
  const e = { def: d, code, x: side < 0 ? G.cam - 26 : G.cam + W + 26, y: rnd(FT + 4, FB - 4), z: 0, vx: 0, vz: 0, face: side < 0 ? 1 : -1, state: 'enter', st: 0, anim: rnd(100) | 0, hp: d.hp, maxhp: d.hp, atkCd: rnd(30, 90), hw: 9 * sc, off: rnd(-30, 30), flash: 0, sc, hpT: 0 };
  if (drop) { e.x = G.cam + rnd(60, W - 60); e.z = 170; e.state = 'drop'; }
  e.C = colorsFor(e); ents.push(e); return e;
}
function updEnemy(e, engaged) {
  e.st++; e.anim++; if (e.flash > 0) e.flash--; e.atkCd--; if (e.hpT > 0) e.hpT--; if (e.armorT > 0) e.armorT--;
  if (e.state === 'held') { if (!P || P.held !== e) { e.state = 'down'; e.st = 20; e.z = Math.max(e.z, 0.1); } return; }
  physics(e);
  const d = e.def, p = P, dx = p.x - e.x, dy = p.y - e.y, adx = Math.abs(dx), ady = Math.abs(dy);
  const pOK = !['down', 'dead', 'respawn', 'getup'].includes(p.state);
  const faceP = () => { if (adx > 2) e.face = dx > 0 ? 1 : -1; };
  const wu = Math.round(d.windup * (1 - G.lvl * 0.04) * D_().wu);
  const bomb = d.ranged && d.ranged.type === 'bomb';
  switch (e.state) {
    case 'enter': {
      faceP(); const tx = e.x < G.cam + W / 2 ? G.cam + 30 : G.cam + W - 30;
      e.x += sgn(tx - e.x) * Math.max(1, d.spd * 1.2);
      if (Math.abs(tx - e.x) < 3) { e.state = 'idle'; e.st = 0; }
      break;
    }
    case 'drop': break;
    case 'idle': case 'walk': {
      if (d.ranged && e.atkCd <= 0 && pOK && (bomb ? adx > 40 && adx < 230 && ady < 70 : adx > 50 && adx < 280 && ady < 10)) { faceP(); e.state = 'shoot'; e.st = 0; e.tx = p.x; e.ty = p.y; break; }
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
    case 'attack': {
      const heavy = d.style === 'brute';
      if (heavy ? e.st >= 4 && e.st <= 9 : e.st <= 6) strikeOnce(e, d.reach, d.dmg, heavy);
      if (heavy && e.st === 6) { shake(4); dust(e.x + e.face * 30, e.y, 6); Snd.play('boom'); }
      if (e.st >= (heavy ? 32 : 20)) { e.state = 'idle'; e.st = 0; e.atkCd = rnd(50, 100) * (1 - G.lvl * 0.05) * (heavy ? 1.4 : 1); }
      break;
    }
    case 'shoot':
      if (e.st === 18) {
        if (bomb) { lob(e.x + e.face * 6, e.y, e.z + 30, clamp(p.x + p.vx * 0, G.cam + 10, G.cam + W - 10), p.y); Snd.play('fuse'); }
        else { shoot(e.x + e.face * 12, e.y, e.z + 22, e.face, d.ranged.type); Snd.play(d.ranged.type === 'laser' ? 'laser' : 'shoot'); }
      }
      if (e.st >= 34) { e.state = 'idle'; e.st = 0; e.atkCd = d.ranged.cd * rnd(0.7, 1.3); }
      break;
    case 'leapw': if (e.st >= 16) { e.state = 'leap'; e.st = 0; e.vz = 3.6; e.z = 0.1; e.vx = e.face * 2.8; e.hitDone = false; } break;
    case 'leap': e.x += e.vx; strikeOnce(e, 14, d.dmg, false); break;
    case 'dashw': if (e.st >= 24) { e.state = 'dash'; e.st = 0; e.hitDone = false; Snd.play('swing'); } break;
    case 'dash': e.x += e.face * 4.6; strikeOnce(e, 20, d.dmg, true); if (e.st >= 24 || e.x < G.cam + 10 || e.x > G.cam + W - 10) { e.state = 'recover'; e.st = 0; } break;
    case 'recover': if (e.st >= 24) { e.state = 'idle'; e.st = 0; e.atkCd = rnd(60, 120); } break;
    case 'hurt': e.x += e.vx; e.vx *= 0.8; if (e.st >= 14) { e.state = 'idle'; e.st = 0; e.atkCd = Math.max(e.atkCd, 16); } break;
    case 'down':
      e.x += e.vx; e.vx *= e.z > 0 ? 0.99 : 0.82;
      if (e.thrown) { // хвърленият враг поваля всички по пътя си
        e.thrownHit = e.thrownHit || new Set();
        for (const o of ents) if (o !== e && !o.boss && hittable(o) && !e.thrownHit.has(o) && Math.abs(o.x - e.x) < 18 && Math.abs(o.y - e.y) < 12) { e.thrownHit.add(o); hurtEnemy(o, 12, true, sgn(e.vx)); }
        for (const o of props) if (!o.broken && !e.thrownHit.has(o) && Math.abs(o.x - e.x) < 18 && Math.abs(o.y - e.y) < 12) { e.thrownHit.add(o); hitProp(o); }
      }
      if (e.st >= 48 && e.z <= 0) { e.state = e.hp <= 0 ? 'dead' : 'getup'; e.st = 0; if (e.hp <= 0) onKill(e); }
      break;
    case 'getup': if (e.st >= 16) { e.state = 'idle'; e.st = 0; e.atkCd = 30; } break;
    case 'dead': if (e.st >= 36) e.remove = true; break;
  }
  if (e.state !== 'enter') { e.y = clamp(e.y, FT, FB); if (!['dead', 'down'].includes(e.state)) e.x = clamp(e.x, G.cam - 10, G.cam + W + 10); }
}

// ---------------------------------------------------------------- шефове
function spawnBoss(key, k) {
  const d = BDEF[key], hp = Math.round(d.hp * (G.duo ? 0.65 : 1) * D_().boss);
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
function startGame(ti, lvl) { G.turtle = ti; G.score = 0; G.lives = D_().lives; G.conts = 0; P = null; startLevel(lvl); }
function startLevel(i) {
  const L = LEVELS[i];
  G.lvl = i; ents = []; projs = []; items = []; props = []; parts = []; hazards = []; texts = [];
  G.cam = 0; G.lock = null; G.waveI = 0; G.wave = null; G.bossStage = 0; G.bosses = []; G.duo = L.boss.length > 1;
  G.hazT = 420; G.goT = 0; G.clearT = 0; G.introT = 170; G.b2T = 0; G.shake = 0; G.stop = 0;
  G.chain = 0; G.chainT = 0; G.cut = null; G.tint = 0; G.stats = { kills: 0, maxChain: 0, dmg: 0, t: 0 };
  P = makePlayer(G.turtle, P ? P.pow : 0);
  L.waves.forEach((w, k) => {
    const x = w[0] + 330 + hash(i * 37 + k) * 60;
    if (x < L.len - 200) props.push({ type: L.prop, x, y: FT + 8 + hash(i * 91 + k) * (FB - FT - 16), z: 0, hp: 2, hw: 11, shake: 0, drop: k === 3 ? 'power' : k % 3 === 2 ? 'pizza' : 'slice' });
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
    if (pr.type === 'bomb') {
      pr.t++; pr.life--;
      if (pr.fuse < 0) { pr.x += pr.vx; pr.y += pr.vy; pr.vz -= pr.gb; pr.z += pr.vz; if (pr.z <= 0) { pr.z = 0; pr.fuse = 26; Snd.play('land'); } }
      else if (--pr.fuse <= 0) { pr.life = 0; explode(pr); }
      continue;
    }
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
      it.life = 0; G.score += 100;
      if (it.type === 'power') { P.powT = 540; P.hp = Math.min(100, P.hp + 20); Snd.play('power'); G.flash = 6; buzz(40); addText(it.x, it.y, 34, 'ЯРОСТНА ПИЦА!', '#ffb030'); }
      else { const heal = it.type === 'pizza' ? 100 : 35; P.hp = Math.min(100, P.hp + heal); Snd.play('pickup'); addText(it.x, it.y, 30, it.type === 'pizza' ? 'ПИЦА!' : '+' + heal, '#7dff7d'); }
    }
  }
  items = items.filter(i => i.life > 0);
  for (const o of props) if (o.shake > 0) o.shake--;
  props = props.filter(o => !o.broken);
  for (const q of parts) {
    q.life--; q.x += q.vx; q.y += q.vy;
    if (q.k === 'dust') { q.z += q.vz; q.sz += 0.15; }
    else if (q.k === 'mote') q.z += q.vz;
    else if (q.k === 'spark' || q.k === 'chunk') { q.z += q.vz; q.vz -= 0.18; if (q.z < 0) { q.z = 0; q.vz *= -0.4; q.vx *= 0.6; } }
  }
  parts = parts.filter(q => q.life > 0);
  for (const t of texts) { t.life--; t.z += 0.5; }
  texts = texts.filter(t => t.life > 0);
  updHazards();
  G.stats.t++;
  if (G.tint > 0) G.tint--;
  if (G.chainT > 0 && --G.chainT === 0) {
    if (G.chain >= 8) { const b = G.chain * 25; G.score += b; addText(P.x, P.y, 70, G.chain + ' УДАРА +' + b, '#ffd23f'); }
    G.chain = 0;
  }
  for (const e of ents) if (e.boss && e.hp > 0 && e.hp < e.maxhp * 0.5 && G.t % 7 === 0) parts.push({ k: 'dust', x: e.x + rnd(-12, 12), y: e.y, z: e.z + rnd(20, 50) * e.sc, vx: rnd(-0.3, 0.3), vy: 0, vz: 0.9, life: 26, max: 26, col: 'rgba(255,110,80,', sz: rnd(3, 5) });

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
    if (--G.hazT <= 0) { spawnHazard(L.hazard); G.hazT = rnd(280, 480) * (G.bossStage ? 1.4 : 1) * D_().haz; }
  }
}
function startBoss(list) {
  G.bossStage = G.bossStage === 2 ? 3 : 1; G.lock = LEVELS[G.lvl].len - W;
  G.bosses = list.map((b, k) => spawnBoss(b, k));
  G.banner = { txt: list.map(b => BDEF[b].name).join(' И '), t: 160 };
  Music.start('boss'); Snd.play('roar');
}
// оценка за рунда според понесените щети
const GRADES = [['S', 30, 5000, '#ffd23f'], ['A', 90, 2500, '#7dff7d'], ['B', 180, 1000, '#60c0ff'], ['C', 1e9, 0, '#c0a0a0']];
function finishLevel() {
  const gr = GRADES.find(r => G.stats.dmg <= r[1]);
  G.grade = gr; G.bonus = P.hp * 20 + G.lives * 500 + gr[2]; G.score += G.bonus;
  if (!G.done.includes(G.lvl)) { G.done.push(G.lvl); store.set('done', G.done); }
  if (G.score > G.best) { G.best = G.score; store.set('best', G.best); }
  G.clearAt = G.t; setScene('clear');
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
  if (G.cut && --G.cut.t <= 0) G.cut = null;
  G.shake *= 0.86; if (G.shake < 0.2) G.shake = 0;
  if (G.flash > 0) G.flash--;
}

