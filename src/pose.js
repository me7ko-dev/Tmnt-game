// стойката на удара на костенурка: k – кой удар от комбото, q – докъде е стигнал (0..1)
function atkPose(P, k, q, w) {
  P.lf = 0.7; P.kf = 0.6; P.lb = -0.6; P.kb = 0.25; P.crouch = 1.5;
  if (w === 'bo' && k === 1) { P.af = lerp(1.1, 1.57, ease(q * 2)); P.ef = lerp(0.7, 0, ease(q * 2)); P.wf = 1.57; P.ab = 1.2; P.eb = 0.3; P.hx = lerp(0, 4, ease(q * 2)); }
  else if (k === 1) { P.af = lerp(2.9, 1.1, ease(q * 1.7)); P.ef = 0.25; P.wf = P.af + 0.5; P.lean = lerp(-0.1, 0.15, q); if (q > 0.25 && q < 0.72) P.trail = [2.9 + 0.5, P.wf]; }
  else if (k === 2) { P.af = lerp(0.6, 2.7, ease(q * 1.7)); P.ef = 0.2; P.wf = P.af + 0.3; P.ab = lerp(-0.4, 1.6, ease(q * 1.7)); P.eb = 0.2; P.wb = P.ab + 0.4; if (q > 0.25 && q < 0.72) P.trail = [0.9, P.wf]; }
  else if (w === 'bo') { P.af = lerp(3.1, 1.2, ease(q * 1.6)); P.ef = 0.1; P.wf = P.af + 0.1; P.lean = 0.2; if (q > 0.25 && q < 0.72) P.trail = [3.2, P.wf]; }
  else { P.lf = lerp(0.2, 1.7, ease(q * 2.2)); P.kf = lerp(1.2, 0.05, ease(q * 2.2)); P.lb = -0.3; P.lean = -0.3; P.af = 2.3; P.wf = 2.9; P.ab = -1.4; P.wb = -1.2; if (q > 0.25 && q < 0.72) P.trail = [2.9, 1.2]; }
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
    case 'idle': P.crouch = 1 + Math.sin(t * 0.08) * 0.6; P.af = 0.55 + Math.sin(t * 0.08) * 0.06; break;
    case 'walk': case 'enter': walk(0.22, 0.7); break;
    case 'run': walk(0.45, 0.9); P.lean = 0.35; P.af = 1.2; P.wf = 1.6; break;
    case 'attack':
      if (e.pl) { const d = e.t.atkT + (e.combo === 3 ? 5 : 0); atkPose(P, e.combo, e.st / d, e.t.weapon); }
      else if (e.def && e.def.style === 'brute') { // тежък удар отгоре с тоягата
        q = e.st / 14; P.af = lerp(3.3, 0.9, ease(q * 1.4)); P.ef = 0.05; P.wf = P.af + 0.1; P.ab = P.af - 0.2; P.eb = 0.1; P.wb = P.wf; P.lean = lerp(-0.25, 0.35, ease(q)); P.lf = 0.8; P.kf = 0.7; P.lb = -0.6; P.crouch = lerp(0, 3, ease(q));
        if (q > 0.2 && q < 0.8) P.trail = [3.4, P.wf];
      } else {
        q = e.boss ? e.st / 28 : e.st / 20;
        P.af = lerp(2.7, 1.4, ease(q * 3)); P.ef = 0.1; P.wf = P.af + 0.3; P.lean = 0.15; P.lf = 0.6; P.kf = 0.4; P.lb = -0.5;
        if (e.boss && q < 0.4) P.trail = [3.0, P.wf];
      }
      break;
    case 'windup': case 'dashw': case 'leapw':
      P.lean = -0.2; P.af = st === 'dashw' ? -0.6 : 2.8; P.ef = 0.5; P.wf = st === 'dashw' ? -1.1 : 3.1; P.crouch = 2.5; P.lf = 0.5; P.lb = -0.5; P.hx = Math.sin(t * 1.3) * 0.6;
      if (e.def && e.def.style === 'brute') { P.af = 3.4; P.ab = 3.1; P.ef = 0.1; P.eb = 0.1; P.wf = 3.5; P.wb = 3.5; P.lean = -0.3; }
      break;
    case 'dash': walk(0.5, 0.9); P.lean = 0.45; P.af = 1.6; P.ef = 0; P.wf = 1.6; break;
    case 'recover': P.crouch = 2.5; P.af = 1.2; P.wf = 1.8; break;
    case 'shoot': q = e.st / 34; P.af = q < 0.5 ? 2.8 : 1.4; P.ef = 0.1; P.wf = P.af + 0.2; P.lean = q < 0.5 ? -0.15 : 0.15; break;
    case 'aim': P.af = 1.57; P.ef = 0; P.wf = 1.57; P.ab = 1.3; P.eb = 0.2; P.lf = 0.4; P.lb = -0.4; P.crouch = 1; break;
    case 'summon': P.af = 3.0; P.ab = 2.9; P.ef = 0.2; P.eb = 0.2; P.wf = 3.1; P.crouch = Math.sin(t * 0.3) * 1.5 + 1; break;
    case 'jump': case 'respawn': case 'drop': case 'leap':
      if (e.pl && e.jk) { P.lf = 1.65; P.kf = 0.05; P.lb = -0.4; P.kb = 1.4; P.lean = -0.25; P.af = 2.4; P.ab = -1.8; P.wf = 3.0; P.wb = -1.4; }
      else if (st === 'leap') { P.lf = 1.3; P.kf = 0.1; P.lb = -0.5; P.kb = 1.0; P.af = 1.6; P.ef = 0; P.lean = -0.15; }
      else { P.lf = 0.9; P.kf = 1.7; P.lb = 0.3; P.kb = 1.5; P.af = 2.3; P.ef = 0.6; P.wf = 2.8; P.ab = 2.0; }
      break;
    case 'special': P.af = 1.57; P.ef = 0; P.wf = 1.57; P.ab = -1.57; P.eb = 0; P.wb = -1.57; P.lf = 0.45; P.lb = -0.45; P.crouch = 2; P.trail = [-1.57, 4.71]; break;
    case 'throw': // вдигане над главата и хвърляне напред
      q = e.st;
      if (q < 16) { const k = ease(q / 14); P.af = lerp(1.0, 3.1, k); P.ab = lerp(1.0, 2.9, k); P.ef = 0.3; P.eb = 0.3; P.wf = P.af + 0.4; P.wb = P.ab + 0.4; P.lean = lerp(0.2, -0.3, k); P.crouch = lerp(3, 0.5, k); P.lf = 0.5; P.lb = -0.5; }
      else { const k = ease((q - 16) / 6); P.af = lerp(3.1, 1.3, k); P.ab = lerp(2.9, 1.1, k); P.ef = 0.1; P.eb = 0.1; P.wf = P.af + 0.3; P.wb = P.ab + 0.3; P.lean = lerp(-0.3, 0.35, k); P.lf = 0.8; P.kf = 0.5; P.lb = -0.6; P.crouch = 2; }
      break;
    case 'super': {
      const s = e.st;
      switch (e.t.id) {
        case 'leo':
          if (s < 14) { P.lean = -0.25; P.af = -0.6; P.ef = 0.5; P.wf = -1.1; P.ab = -0.9; P.wb = -1.3; P.crouch = 3.5; P.lf = 0.7; P.lb = -0.7; P.kf = 0.9; }
          else if (s <= 40) { walk(0.6, 1.0); P.lean = 0.5; P.af = 1.7; P.ef = 0; P.wf = 1.7; P.ab = 1.3; P.eb = 0; P.wb = 1.4; P.trail = [3.4, 1.4]; }
          else { P.crouch = 3; P.af = 2.4; P.wf = 3.0; P.ab = -1.2; P.wb = -1.6; P.lf = 0.8; P.lb = -0.8; }
          break;
        case 'raf':
          if (s < 8) { P.crouch = 4; P.af = 1.0; P.ab = 0.8; P.lf = 0.8; P.lb = -0.8; P.kf = 1.0; P.kb = 1.0; }
          else if (s < 30) { P.af = 3.0; P.ab = 2.9; P.ef = 0.3; P.eb = 0.3; P.wf = 3.3; P.wb = 3.3; P.lf = 0.9; P.kf = 1.6; P.lb = 0.2; P.kb = 1.5; P.lean = -0.15; }
          else { P.crouch = 5; P.af = 1.3; P.ab = 1.1; P.ef = 0; P.eb = 0; P.wf = 1.4; P.wb = 1.2; P.lf = 1.0; P.kf = 1.2; P.lb = -0.9; P.kb = 1.0; P.lean = 0.35; }
          break;
        case 'don': P.af = 1.57; P.ef = 0; P.wf = 1.57; P.ab = -1.57; P.eb = 0; P.wb = -1.57; P.lf = 0.5; P.lb = -0.5; P.crouch = 2.4; P.trail = [-1.57, 4.71]; break;
        default: atkPose(P, (Math.floor(s / 5) % 2) + 1, (s % 5) / 5, e.t.weapon); if (s >= 48) atkPose(P, 3, (s - 48) / 10, e.t.weapon); P.trail = P.trail || [2.6, 0.9];
      }
      break;
    }
    case 'held': P.lean = -0.3; P.af = 2.6; P.ef = 0.9; P.ab = 2.3; P.eb = 0.8; P.lf = 0.5; P.kf = 0.9; P.lb = -0.1; P.kb = 1.0; P.hx = -1; P.wf = 2.8; break;
    case 'hurt': P.lean = -0.4; P.af = 2.4; P.ef = 0.8; P.ab = 2.0; P.lf = -0.3; P.lb = 0.3; P.hx = -2; P.wf = 2.8; break;
    case 'down': case 'dead': case 'dying':
      if (e.boss && st === 'dying' && e.st < 30) { P.lean = -0.5; P.af = 2.6; P.ab = 2.2; break; }
      P.rot = -Math.PI / 2; P.lf = 0.1; P.lb = -0.1; P.kf = 0.2; P.kb = 0.2; P.af = 2.8; P.ab = 3.0; P.wf = 3.2; break;
    case 'getup': q = e.st / (e.pl ? 18 : 16); P.rot = -Math.PI / 2 * (1 - q); P.crouch = 4 * (1 - q); break;
  }
  return P;
}
