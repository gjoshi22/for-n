import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

/* =====================================================================
   PERSONAL SETTINGS — edit these
   ===================================================================== */
const CONFIG = {
  name: 'Noush',
  age: 27,
  from: 'Gunjan',               // your name, for the sign-off on the letter (leave '' for none)
  letter: [
    'Happy 27th birthday, my love.',
    'You are the best thing that has ever happened to me. I love you more than I know how to put into words, so I built you a cake instead.',
    'This is our first birthday together. The first of many more to come… with our 12 kids.',
    'I love you, always.',
  ],
  room: 'nsh-k7q2-w9xf-3m8d',   // private channel for your watch view; any random string
  brokers: ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'],
};

/* ===================================================================== */
const gsap = window.gsap;
const $ = (s, r = document) => r.querySelector(s);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const r3 = v => Math.round(v * 1000) / 1000;
const wait = ms => new Promise(r => setTimeout(r, ms));
const uid = () => Math.random().toString(36).slice(2, 9);
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const params = new URLSearchParams(location.search);
const SPECTATOR = params.has('watch') || location.hash === '#watch';
if (SPECTATOR) document.body.classList.add('spectator');
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

/* ---------------- catalog ---------------- */
const TIER_IN = [10, 8, 6, 4], TIER_H = 0.5;
const tierR = i => TIER_IN[i] * 0.12;
const SPONGE = {
  vanilla: { n: 'Madagascar Vanilla', c: '#f0d496' },
  cocoa: { n: 'Dark Valrhona Cocoa', c: '#5a3223' },
  matcha: { n: 'Matcha Green Tea', c: '#9fb26a' },
  brownie: { n: 'Protein Greek Brownie', short: 'Protein Brownie', c: '#4a2a1c', secret: true },
};
const FROST = {
  ivory: { n: 'Swiss Ivory', c: '#f3e7d4' },
  pistachio: { n: 'Sage Pistachio', c: '#c3cf9c' },
  rose: { n: 'Dusty Rose', c: '#dea7a6' },
  espresso: { n: 'Warm Espresso', c: '#8b634a' },
};
const DRIP = {
  none: { n: 'None' },
  chocolate: { n: 'Chocolate', c: '#2b140c' },
  caramel: { n: 'Caramel', c: '#7a3c10' },
  matcha: { n: 'Matcha', c: '#5e7533' },
};
const TOPS = {
  strawberry: { n: 'Strawberry', pl: 'strawberries' },
  halfberry: { n: 'Half berry', a: 'a strawberry half', pl: 'strawberry halves' },
  raspberry: { n: 'Raspberry', pl: 'raspberries' },
  blueberry: { n: 'Blueberries', a: 'some blueberries', pl: 'blueberry clusters' },
  cherry: { n: 'Cherry', pl: 'cherries' },
  macaron: { n: 'Macaron', pl: 'macarons' },
  meringue: { n: 'Meringue', pl: 'meringue kisses' },
  truffle: { n: 'Truffle', pl: 'truffles' },
  shard: { n: 'Choc shard', a: 'a chocolate shard', pl: 'chocolate shards' },
  dragee: { n: 'Silver pearls', a: 'silver pearls', pl: 'handfuls of silver pearls' },
  rose: { n: 'Sugar rose', pl: 'sugar roses' },
  mint: { n: 'Mint', a: 'a sprig of mint', pl: 'sprigs of mint' },
  gold: { n: 'Gold leaf', a: 'gold leaf', pl: 'gold leaf flakes' },
  latte: { n: 'Iced latte', a: 'an iced latte', pl: 'iced lattes' },
  pick: { n: 'Guitar pick', pl: 'guitar picks' },
  vinyl: { n: 'Vinyl', pl: 'vinyl records' },
  topper: { n: 'Topper', a: 'a Happy Birthday topper', pl: 'toppers' },
};
const SHELF = { fruit: ['strawberry', 'halfberry', 'raspberry', 'blueberry', 'cherry'], sweets: ['macaron', 'meringue', 'truffle', 'shard', 'dragee'], flora: ['rose', 'gold', 'mint'], extra: ['topper', 'latte', 'vinyl', 'pick'] };
const PIPE = [
  { n: 'Ivory', c: '#f6ecda' }, { n: 'Rose', c: '#e7a3ad' }, { n: 'Pistachio', c: '#bcd096' }, { n: 'Cocoa', c: '#6a3e29' },
];
const MAC_COLORS = ['#f2b6c4', '#c7da9f', '#cfbde9', '#f5e19c'];
const WAX = ['#f6bfcd', '#f8e09d', '#bde2cf', '#d4c4f1', '#bad9f3', '#ffcfb0'];
const CHAPTERS = ['bake', 'decorate', 'candles', 'light'];

/* ---------------- state (everything the watch view needs) ---------------- */
const S = {
  chapter: 'intro', tiers: [], sel: 0, slice: false,
  tops: [], pipes: [], pv: 0, candles: [], lit: [], out: false, paid: false, log: [],
};
const UI = { bakeTab: 'tiers', decoTab: 'fruit', tool: 'strawberry', secretSponge: false, secretShelf: false, undo: [] };

/* =====================================================================
   AUDIO — all synthesized, no files
   ===================================================================== */
const Sound = (() => {
  let ctx = null, master, verb, muted = false, noiseBuf = null, sq = null;
  try { muted = localStorage.getItem('cake-muted') === '1'; } catch (e) {}
  function init() {
    if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.85;
    const comp = ctx.createDynamicsCompressor(); master.connect(comp); comp.connect(ctx.destination);
    verb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.4, b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    verb.buffer = b; const vg = ctx.createGain(); vg.gain.value = 0.32; verb.connect(vg); vg.connect(master);
  }
  function noise() {
    if (!noiseBuf) { const len = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1; }
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; return s;
  }
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  function out(g, wet) { g.connect(master); if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(verb); } }
  function tone(type, f0, f1, dur, peak, { wet = 0.2, delay = 0 } = {}) {
    if (!ctx) return; const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain(); env(g, t, 0.006, peak, dur); o.connect(g); out(g, wet); o.start(t); o.stop(t + dur + 0.1);
  }
  function burst(freq, q, dur, peak, { type = 'bandpass', delay = 0, wet = 0.1 } = {}) {
    if (!ctx) return; const t = ctx.currentTime + delay;
    const s = noise(); const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); env(g, t, 0.004, peak, dur); s.connect(f); f.connect(g); out(g, wet); s.start(t, Math.random()); s.stop(t + dur + 0.1);
  }
  function voice(type, f, { attack = 0.006, dur = 1, peak = 0.05, wet = 0.4, delay = 0, detune = 0, lp = 0 } = {}) {
    if (!ctx) return; const t = ctx.currentTime + delay;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    const g = ctx.createGain(); env(g, t, attack, peak, dur);
    if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; o.connect(fl); fl.connect(g); } else o.connect(g);
    out(g, wet); o.start(t); o.stop(t + attack + dur + 0.1);
  }
  // soft noise swell (breath / flare) with a slow attack
  function swell(freq, q, attack, dur, peak, { type = 'bandpass', delay = 0, wet = 0.25 } = {}) {
    if (!ctx) return; const t = ctx.currentTime + delay;
    const s = noise(); const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); env(g, t, attack, peak, dur); s.connect(f); f.connect(g); out(g, wet); s.start(t, Math.random()); s.stop(t + attack + dur + 0.1);
  }
  const chime = (f, peak = 0.03, delay = 0) => { voice('sine', f, { attack: 0.004, dur: 1.6, peak, wet: 0.65, delay }); voice('sine', f * 2.76, { attack: 0.002, dur: 0.35, peak: peak * 0.18, wet: 0.6, delay }); };
  const PENTA = [76, 79, 81, 83, 86, 88, 91, 93, 95, 98];
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  return {
    init, get ctx() { return ctx; }, get muted() { return muted; },
    setMuted(m) { muted = m; try { localStorage.setItem('cake-muted', m ? '1' : '0'); } catch (e) {} if (master) master.gain.setTargetAtTime(m ? 0 : 0.85, ctx.currentTime, 0.05); },
    tick() { tone('sine', 1900, 1100, 0.035, 0.06, { wet: 0 }); },
    pop() { tone('sine', 760, 190, 0.13, 0.32, { wet: 0.15 }); burst(2600, 1.2, 0.025, 0.1, { wet: 0 }); },
    thud(soft) { tone('sine', soft ? 220 : 140, soft ? 90 : 50, soft ? 0.18 : 0.38, soft ? 0.25 : 0.55, { wet: 0.2 }); burst(420, 0.8, 0.1, soft ? 0.1 : 0.22); },
    // match: a dry scratch across the strip, then a soft flare — no low thump
    strike() { for (let i = 0; i < 5; i++) burst(3200 + Math.random() * 2200, 1.2, 0.03, 0.16 + Math.random() * 0.08, { type: 'bandpass', delay: i * 0.028, wet: 0.02 }); swell(2200, 0.6, 0.06, 0.55, 0.09, { delay: 0.12, wet: 0.3 }); },
    // candle catching: a breathy "fff" plus a quiet glass chime that climbs with each candle
    ignite(n = 0) { swell(2600, 0.5, 0.03, 0.32, 0.045, { wet: 0.3 }); chime(mtof(PENTA[n % PENTA.length]), 0.028, 0.04); },
    puff() { burst(650, 0.6, 0.45, 0.3, { type: 'lowpass', wet: 0.2 }); },
    shutter() { burst(5200, 1, 0.025, 0.6, { wet: 0 }); burst(3000, 1, 0.045, 0.4, { delay: 0.09, wet: 0 }); },
    // celebration: harp glissando up a Cmaj9, a warm pad blooming underneath, a few sparkles on top
    chord() {
      [48, 55, 60, 64, 67, 71, 74, 76, 79, 83, 86, 88].forEach((m, i) => { const f = mtof(m), d = i * 0.06; voice('triangle', f, { attack: 0.003, dur: 2.4, peak: 0.05, wet: 0.55, delay: d, lp: 3200 }); voice('sine', f * 2, { attack: 0.003, dur: 0.9, peak: 0.012, wet: 0.55, delay: d }); });
      [48, 55, 64, 71].forEach(m => { voice('sine', mtof(m), { attack: 0.7, dur: 3.4, peak: 0.035, wet: 0.5, detune: -6, delay: 0.25 }); voice('sine', mtof(m), { attack: 0.7, dur: 3.4, peak: 0.035, wet: 0.5, detune: 6, delay: 0.25 }); });
      for (let i = 0; i < 7; i++) chime(mtof(PENTA[3 + Math.floor(Math.random() * 7)] + 12), 0.012, 0.8 + i * 0.17 + Math.random() * 0.1);
    },
    kiss() { burst(1900, 2.5, 0.05, 0.5, { wet: 0.1 }); tone('sine', 520, 1150, 0.11, 0.16, { delay: 0.03 }); burst(820, 4, 0.09, 0.22, { delay: 0.05 }); },
    paper() { for (let i = 0; i < 16; i++) burst(2400 + Math.random() * 1400, 3, 0.03, 0.06, { delay: i * 0.12, wet: 0 }); },
    squish(on) {
      if (!ctx) return;
      if (!sq) { const s = noise(); const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 650; f.Q.value = 2.5; const g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); out(g, 0.05); s.start(); sq = { f, g }; }
      sq.g.gain.setTargetAtTime(on ? 0.16 : 0, ctx.currentTime, on ? 0.03 : 0.08);
      if (on) sq.f.frequency.setTargetAtTime(500 + Math.random() * 400, ctx.currentTime, 0.05);
    },
    musicBox() {
      // "Happy Birthday to You" — public domain melody
      const N = [[67, .75], [67, .25], [69, 1], [67, 1], [72, 1], [71, 2], [67, .75], [67, .25], [69, 1], [67, 1], [74, 1], [72, 2],
        [67, .75], [67, .25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2], [77, .75], [77, .25], [76, 1], [72, 1], [74, 1], [72, 3]];
      // music-box timbre: sine fundamental + bright inharmonic tine partials, soft bass on downbeats
      let t = 0; const beat = 0.42; const bass = [48, 43, 43, 48, 48, 53, 48, 43, 48];
      N.forEach(([m, d], i) => { const f = mtof(m + 12); voice('sine', f, { attack: 0.002, dur: 1.5, peak: 0.06, wet: 0.5, delay: t }); voice('sine', f * 2.76, { attack: 0.001, dur: 0.22, peak: 0.01, wet: 0.45, delay: t }); voice('sine', f * 5.4, { attack: 0.001, dur: 0.08, peak: 0.004, wet: 0.4, delay: t }); if (d >= 1 && i % 3 === 2) voice('sine', mtof(bass[(i / 3 | 0) % bass.length]), { attack: 0.01, dur: 1.2, peak: 0.03, wet: 0.3, delay: t }); t += d * beat; });
    },
  };
})();

/* =====================================================================
   TEXTURES (procedural canvas)
   ===================================================================== */
function canvasTex(w, h, draw, { srgb = true, repeat = false } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
const TEX = {};
TEX.marble = canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = '#f5f1eb'; g.fillRect(0, 0, w, h);
  const R = mulberry(7);
  for (let i = 0; i < 2600; i++) { g.fillStyle = `rgba(${200 + R() * 40},${190 + R() * 40},${180 + R() * 40},${R() * 0.12})`; g.beginPath(); g.arc(R() * w, R() * h, R() * 18, 0, 7); g.fill(); }
  for (let v = 0; v < 18; v++) {
    let x = R() * w, y = R() * h, a = R() * 6.28; const gold = v % 5 === 0;
    g.strokeStyle = gold ? 'rgba(186,146,84,.5)' : `rgba(120,108,104,${0.12 + R() * 0.22})`; g.lineWidth = 0.6 + R() * (gold ? 1.6 : 2.4);
    g.shadowColor = g.strokeStyle; g.shadowBlur = 3; g.beginPath(); g.moveTo(x, y);
    for (let s = 0; s < 120; s++) { a += (R() - 0.5) * 0.5; x += Math.cos(a) * 9; y += Math.sin(a) * 9; g.lineTo(x, y); }
    g.stroke();
  }
}, { repeat: true });
TEX.floorAlpha = canvasTex(256, 256, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.22, '#d0d0d0'); gr.addColorStop(0.5, '#4a4a4a'); gr.addColorStop(0.8, '#0c0c0c'); gr.addColorStop(1, '#000');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, { srgb: false });
TEX.frostBump = canvasTex(512, 256, (g, w, h) => {
  const R = mulberry(11); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 220; i++) { const y = R() * h, x = R() * w, l = 30 + R() * 120; g.strokeStyle = R() > 0.5 ? `rgba(255,255,255,${R() * 0.18})` : `rgba(0,0,0,${R() * 0.16})`; g.lineWidth = 1 + R() * 5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y + (R() - 0.5) * 8, x + l, y + (R() - 0.5) * 6); g.stroke(); }
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(${R() > 0.5 ? 255 : 0},${R() > 0.5 ? 255 : 0},${R() > 0.5 ? 255 : 0},${R() * 0.06})`; g.fillRect(R() * w, R() * h, 2, 2); }
}, { srgb: false, repeat: true });
TEX.frostBump.repeat.set(5, 1);
TEX.ripple = canvasTex(256, 256, (g, w, h) => {
  const R = mulberry(19); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26; i++) { const x = R() * w, y = R() * h, rr = 20 + R() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, rr); const k = R() > 0.5 ? 255 : 0; gr.addColorStop(0, `rgba(${k},${k},${k},.10)`); gr.addColorStop(1, 'rgba(128,128,128,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
}, { srgb: false, repeat: true });
TEX.soft = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
TEX.glow = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,214,150,.95)'); gr.addColorStop(0.18, 'rgba(255,170,80,.5)'); gr.addColorStop(0.5, 'rgba(255,120,40,.12)'); gr.addColorStop(1, 'rgba(255,100,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
TEX.berry = canvasTex(256, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#e9f0b8'); gr.addColorStop(0.08, '#e2523f'); gr.addColorStop(0.3, '#d3172e'); gr.addColorStop(1, '#b30f24');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let row = 0; row < 14; row++) for (let col = 0; col < 16; col++) {
    const x = (col + (row % 2) * 0.5) / 16 * w, y = h - (row + 1.2) / 15 * h * 0.92;
    g.fillStyle = 'rgba(120,10,20,.55)'; g.beginPath(); g.ellipse(x, y, 4.5, 6, 0, 0, 7); g.fill();
    g.fillStyle = '#f3dc86'; g.beginPath(); g.ellipse(x, y - 1, 1.8, 2.8, 0, 0, 7); g.fill();
  }
});
TEX.berryBump = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#888'; g.fillRect(0, 0, w, h);
  for (let row = 0; row < 14; row++) for (let col = 0; col < 16; col++) { const x = (col + (row % 2) * 0.5) / 16 * w, y = h - (row + 1.2) / 15 * h * 0.92; g.fillStyle = '#333'; g.beginPath(); g.ellipse(x, y, 4.5, 6, 0, 0, 7); g.fill(); g.fillStyle = '#ddd'; g.beginPath(); g.arc(x, y - 1, 1.8, 0, 7); g.fill(); }
}, { srgb: false });
TEX.tortoise = canvasTex(256, 256, (g, w, h) => {
  const R = mulberry(5); g.fillStyle = '#c98232'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { const x = R() * w, y = R() * h, r = 8 + R() * 34; const gr = g.createRadialGradient(x, y, 0, x, y, r); const dark = R() > 0.35; gr.addColorStop(0, dark ? 'rgba(70,28,8,.85)' : 'rgba(240,180,90,.7)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(x, y, r, r * (0.5 + R() * 0.6), R() * 3, 0, 7); g.fill(); }
}, { repeat: true });
TEX.tortoise.repeat.set(9, 9); TEX.tortoise.offset.set(0.5, 0.5);
TEX.vinyl = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#0d0b0c'; g.fillRect(0, 0, w, h);
  for (let r = 80; r < 254; r += 1.6) { g.strokeStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.05})`; g.lineWidth = 0.7; g.beginPath(); g.arc(256, 256, r, 0, 7); g.stroke(); }
  const sh = g.createLinearGradient(0, 0, w, h); sh.addColorStop(0.35, 'rgba(255,255,255,0)'); sh.addColorStop(0.5, 'rgba(255,255,255,.07)'); sh.addColorStop(0.65, 'rgba(255,255,255,0)'); g.fillStyle = sh; g.beginPath(); g.arc(256, 256, 254, 0, 7); g.fill();
  g.fillStyle = '#c24e68'; g.beginPath(); g.arc(256, 256, 78, 0, 7); g.fill();
  g.fillStyle = '#fbe8d8'; g.font = 'italic 34px Georgia, serif'; g.textAlign = 'center'; g.fillText('Noush', 256, 238); g.font = '600 16px sans-serif'; g.fillText('SIDE A · 27', 256, 290);
  g.fillStyle = '#0d0b0c'; g.beginPath(); g.arc(256, 256, 7, 0, 7); g.fill();
});
TEX.stripes = canvasTex(64, 256, (g, w, h) => {
  g.fillStyle = '#fffaf3'; g.fillRect(0, 0, w, h); g.fillStyle = '#e796a8';
  for (let y = -h; y < h * 2; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + 40); g.lineTo(w, y + 58); g.lineTo(0, y + 18); g.fill(); }
}, { repeat: true });
const spongeCache = new Map();
function spongeTex(sp, fr, r) {
  const key = sp + fr + r; if (spongeCache.has(key)) return spongeCache.get(key);
  const sc = SPONGE[sp].c, fc = FROST[fr].c, band = 0.045 / r;
  const t = canvasTex(256, 256, (g, w, h) => {
    const R = mulberry(sp.length * 31 + 7);
    g.fillStyle = sc; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) { const d = R(); g.fillStyle = d > 0.5 ? `rgba(255,255,255,${R() * 0.18})` : `rgba(0,0,0,${R() * 0.2})`; g.beginPath(); g.arc(R() * w, R() * h, 0.5 + R() * 2.2, 0, 7); g.fill(); }
    const cream = sp === 'cocoa' || sp === 'brownie' ? '#f3e2cf' : fc;
    g.fillStyle = cream;[0.3, 0.62].forEach(y => { g.fillRect(0, h * (1 - y) - 9, w, 14); });
    g.fillStyle = fc; g.fillRect(0, 0, w, h * 0.075); g.fillRect(w * (1 - band), 0, w * band + 1, h);
  });
  spongeCache.set(key, t); return t;
}

/* =====================================================================
   RENDERER / SCENE
   ===================================================================== */
const stageEl = $('#stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
let DPR = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(DPR);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);
stageEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = envTex;

const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 80);
camera.position.set(0, 5.38, 10.44); // = frameFor("intro")
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.05; controls.enablePan = false;
controls.minPolarAngle = 0.32; controls.maxPolarAngle = 1.36; controls.minDistance = 3.2; controls.maxDistance = 13;
controls.rotateSpeed = 0.65; controls.zoomSpeed = 0.7;
controls.target.set(0, 0.32, 0);
controls.autoRotate = true; controls.autoRotateSpeed = 0.6;

const MATS = new Set(); let envK = 1;
function M(type, p = {}) { const env = p.envMapIntensity ?? 1; delete p.envMapIntensity; const m = new THREE[type](p); m.userData.env = env; if ('envMapIntensity' in m) m.envMapIntensity = env * envK; MATS.add(m); return m; }
function setEnv(k) { envK = k; MATS.forEach(m => { if ('envMapIntensity' in m) m.envMapIntensity = m.userData.env * k; }); }

// After-hours lighting: one soft key spot from above-front, a warm rim from behind, almost no fill.
const LIGHT = { hemi: 0.32, key: 300, rim: 2.4, rim2: 1.1, env: 0.5, exp: 1.05 };
const hemi = new THREE.HemisphereLight(0xffeadb, 0x2a1a16, LIGHT.hemi); scene.add(hemi);
const key = new THREE.SpotLight(0xfff0e0, LIGHT.key, 0, 0.36, 0.85, 2); key.position.set(2.2, 9.2, 5.6); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 4; key.shadow.camera.far = 20;
key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02; key.shadow.radius = 6;
key.target.position.set(0, 0.2, 0); scene.add(key, key.target);
const rim = new THREE.DirectionalLight(0xffc796, LIGHT.rim); rim.position.set(-3.5, 3.2, -6); scene.add(rim);
const rim2 = new THREE.DirectionalLight(0xffd9b8, LIGHT.rim2); rim2.position.set(4.5, 2.2, -4.5); scene.add(rim2);
const candleSpot = new THREE.SpotLight(0xff9a3c, 0, 9, 1.32, 1, 1.4);
candleSpot.castShadow = true; candleSpot.shadow.mapSize.set(512, 512); candleSpot.shadow.bias = -0.0006; candleSpot.shadow.normalBias = 0.03;
candleSpot.shadow.camera.near = 0.05; scene.add(candleSpot, candleSpot.target);
const candleFill = new THREE.PointLight(0xff8a30, 0, 7, 1.5); scene.add(candleFill);

/* ---------------- stand & table ---------------- */
const stand = new THREE.Group(); scene.add(stand);
const marbleMat = M('MeshPhysicalMaterial', { map: TEX.marble, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.1 });
const STAND_P = [[0.0001, -1.0], [0.78, -1.0], [0.81, -0.985], [0.79, -0.95], [0.52, -0.9], [0.24, -0.83], [0.15, -0.62], [0.135, -0.38], [0.18, -0.22], [0.42, -0.15], [1.48, -0.115], [1.62, -0.09], [1.65, -0.05], [1.62, -0.01], [1.56, 0], [0.0001, 0]];
const standMesh = new THREE.Mesh(new THREE.LatheGeometry(STAND_P.map(p => new THREE.Vector2(p[0], p[1])), 96), marbleMat);
standMesh.castShadow = true; standMesh.receiveShadow = true; standMesh.userData = { t: -1, w: 0 }; stand.add(standMesh);
// gold rims at the plate edge and the foot (thin lathe bands that sit just proud of the marble)
const goldMat = M('MeshPhysicalMaterial', { color: '#d9b886', metalness: 1, roughness: 0.26, clearcoat: 0.4, clearcoatRoughness: 0.2, envMapIntensity: 2.2 });
const GOLD_RIMS = [
  [[1.605, -0.094], [1.64, -0.084], [1.662, -0.062], [1.668, -0.045], [1.662, -0.028], [1.64, -0.008], [1.6, 0.002]],
  [[0.776, -1.001], [0.806, -0.996], [0.822, -0.984], [0.818, -0.968], [0.8, -0.952], [0.79, -0.948]],
  [[0.17, -0.236], [0.192, -0.226], [0.196, -0.214], [0.188, -0.204], [0.17, -0.198]],
];
GOLD_RIMS.forEach(P => { const g = new THREE.Mesh(new THREE.LatheGeometry(P.map(p => new THREE.Vector2(p[0], p[1])), 128), goldMat); g.castShadow = true; g.receiveShadow = true; stand.add(g); });
// dark floor: catches the spotlight pool and the shadow, fades to transparent so it melts into the CSS backdrop
const floor = new THREE.Mesh(new THREE.CircleGeometry(9, 72), M('MeshStandardMaterial', { color: '#3a2a27', alphaMap: TEX.floorAlpha, transparent: true, roughness: 0.82, metalness: 0, envMapIntensity: 0.15, depthWrite: false }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -1.0; floor.receiveShadow = true; floor.renderOrder = -1; scene.add(floor);

const cakeRoot = new THREE.Group(); scene.add(cakeRoot);
const candleRoot = new THREE.Group(); scene.add(candleRoot);

/* =====================================================================
   TIERS
   ===================================================================== */
const V2 = (x, y) => new THREE.Vector2(x, y);
const CORNER = 0.05;
function frostProfile(r, h) {
  const p = [V2(r - 0.006, 0), V2(r, 0.025), V2(r, h - CORNER)];
  for (let k = 1; k <= 7; k++) { const a = k / 7 * Math.PI / 2; p.push(V2(r - CORNER + Math.cos(a) * CORNER, h - CORNER + Math.sin(a) * CORNER)); }
  p.push(V2(r * 0.55, h + 0.004), V2(0.0001, h + 0.006)); return p;
}
function fixLatheU(geo, ps, pl) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (ps + uv.getX(i) * pl) / (Math.PI * 2)); return geo; }
const W0 = -Math.PI / 6, WL = Math.PI / 3; // wedge: 60° facing +z
// part: 'full' (360°, used while the slice is closed so there are no seams), 'main' (300°) or 'wedge' (60°)
const partRange = part => part === 'full' ? [Math.PI, Math.PI * 2] : part === 'wedge' ? [W0, WL] : [W0 + WL, Math.PI * 2 - WL];
function frostGeo(r, part) {
  const [ps, pl] = partRange(part);
  return fixLatheU(new THREE.LatheGeometry(frostProfile(r, TIER_H), part === 'wedge' ? 20 : part === 'full' ? 120 : 100, ps, pl), ps, pl);
}
function capGeo(r) {
  const s = new THREE.Shape(); const p = frostProfile(r, TIER_H); s.moveTo(0, 0); p.forEach(v => s.lineTo(v.x, v.y)); s.lineTo(0, 0);
  const g = new THREE.ShapeGeometry(s); const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / r, pos.getY(i) / TIER_H); return g;
}
function dripFn(seed) {
  const R = mulberry(seed * 977 + 13); const d = []; const n = 15;
  for (let i = 0; i < n; i++) d.push({ c: (i / n) * Math.PI * 2 + R() * 0.25, w: 0.1 + R() * 0.13, l: 0.05 + R() * 0.2 });
  return { drips: d, L(ph) { let L = 0.022; for (const q of d) { let x = ph - q.c; x = Math.atan2(Math.sin(x), Math.cos(x)) / q.w; if (Math.abs(x) < 1) { const b = Math.pow(Math.cos(x * Math.PI / 2), 2); L = Math.max(L, 0.022 + q.l * b); } } return L; } };
}
function dripGeo(r, seed, part) {
  const h = TIER_H, [ps, pl] = partRange(part), segs = part === 'wedge' ? 20 : 120;
  const F = dripFn(seed); const nu = Math.max(10, Math.ceil(pl / (Math.PI * 2) * 260)), nv = 12;
  const pos = [], idx = [];
  for (let i = 0; i <= nu; i++) {
    const ph = ps + pl * i / nu, len = F.L(ph), sx = Math.sin(ph), cz = Math.cos(ph);
    for (let j = 0; j <= nv; j++) { const v = j / nv; const y = h - 0.006 - v * len; const off = 0.011 * Math.sqrt(Math.max(0, 1 - Math.pow(v, 5))) + 0.0025; pos.push(sx * (r + off), y, cz * (r + off)); }
  }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = (i + 1) * (nv + 1) + j; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const sheet = new THREE.BufferGeometry(); sheet.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); sheet.setIndex(idx); sheet.computeVertexNormals();
  // thin, softly domed ganache cap with a rolled lip (reads as poured, not as a flat disk)
  const capP = [V2(r + 0.0135, h - 0.006), V2(r + 0.014, h + 0.0005), V2(r + 0.009, h + 0.0055), V2(r + 0.002, h + 0.0072), V2(r - 0.03, h + 0.0066), V2(r * 0.7, h + 0.0074), V2(r * 0.35, h + 0.0085), V2(0.0001, h + 0.009)];
  const top = new THREE.LatheGeometry(capP, segs, ps, pl);
  const parts = [sheet, top];
  for (const q of F.drips) {
    let c = q.c % (Math.PI * 2); if (c > Math.PI) c -= Math.PI * 2;
    let rel = c - ps; rel = ((rel % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (rel > pl || q.l < 0.1) continue;
    const sp = new THREE.SphereGeometry(0.0145, 12, 9); sp.scale(1, 1.35, 0.75);
    sp.rotateY(c); sp.applyMatrix4(new THREE.Matrix4().makeTranslation(Math.sin(c) * (r + 0.005), h - 0.006 - F.L(c) + 0.009, Math.cos(c) * (r + 0.005))); parts.push(sp);
  }
  parts.forEach(g => { g.deleteAttribute('uv'); if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]); });
  const geo = mergeGeometries(parts, false);
  // planar UVs for the ripple bump
  const P = geo.attributes.position, uv = new Float32Array(P.count * 2);
  for (let k = 0; k < P.count; k++) { uv[k * 2] = P.getX(k) / (2 * r) + 0.5; uv[k * 2 + 1] = P.getZ(k) / (2 * r) + 0.5 + P.getY(k) * 0.6; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.translate(0, -h, 0); return geo;
}
// piped pearl border at the base of a tier, split so the wedge part slides with the slice
const pearlGeo = new THREE.SphereGeometry(1, 14, 10);
function pearlBorder(r, mat, wedge) {
  const R = r + 0.016, n = Math.round(Math.PI * 2 * R / 0.037), pts = [];
  for (let k = 0; k < n; k++) { const a = (k + 0.5) / n * Math.PI * 2; const d = Math.atan2(Math.sin(a), Math.cos(a)); const inW = Math.abs(d) < WL / 2; if (inW === wedge) pts.push(a); }
  const im = new THREE.InstancedMesh(pearlGeo, mat, pts.length); const R2 = mulberry(Math.round(r * 1000));
  const q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), mx = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
  pts.forEach((a, k) => { const s = 0.0215 * (0.94 + R2() * 0.1); q.setFromAxisAngle(up, a + R2()); sc.set(s, s * 0.82, s); ps.set(Math.sin(a) * R, s * 0.72, Math.cos(a) * R); im.setMatrixAt(k, mx.compose(ps, q, sc)); });
  im.castShadow = true; im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; return im;
}

const rayTargets = new Set();
class Tier {
  constructor(i) {
    this.i = i; this.r = tierR(i);
    this.group = new THREE.Group(); this.group.position.y = i * TIER_H;
    this.main = new THREE.Group(); this.wedge = new THREE.Group(); this.group.add(this.main, this.wedge); cakeRoot.add(this.group);
    this.frostMat = M('MeshPhysicalMaterial', { color: '#ffffff', roughness: 0.6, clearcoat: 0.12, clearcoatRoughness: 0.5, bumpMap: TEX.frostBump, bumpScale: 1.4, sheen: 0.45, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ffffff'), envMapIntensity: 0.8 });
    this.capMat = M('MeshStandardMaterial', { roughness: 0.92, side: THREE.DoubleSide, envMapIntensity: 0.5 });
    this.dripMat = M('MeshPhysicalMaterial', { color: '#2b140c', roughness: 0.34, clearcoat: 0.55, clearcoatRoughness: 0.24, bumpMap: TEX.ripple, bumpScale: 0.6, sheen: 0.2, sheenRoughness: 0.4, sheenColor: new THREE.Color('#ffd7b0'), envMapIntensity: 0.8 });
    this.split = []; // meshes only shown while sliced (no seams when closed)
    for (const [grp, wedge] of [[this.main, false], [this.wedge, true]]) {
      const m = new THREE.Mesh(frostGeo(this.r, wedge ? 'wedge' : 'main'), this.frostMat); m.castShadow = m.receiveShadow = true; m.userData = { t: i, w: wedge ? 1 : 0, tier: this }; grp.add(m); rayTargets.add(m); this.split.push(m);
      const a0 = wedge ? W0 : W0 + WL, a1 = wedge ? W0 + WL : W0 + Math.PI * 2;
      for (const a of [a0, a1]) { const c = new THREE.Mesh(capGeo(this.r), this.capMat); c.rotation.y = a - Math.PI / 2; c.receiveShadow = true; grp.add(c); this.split.push(c); }
      grp.add(pearlBorder(this.r, this.frostMat, wedge));
    }
    this.full = new THREE.Mesh(frostGeo(this.r, 'full'), this.frostMat); this.full.castShadow = this.full.receiveShadow = true;
    this.full.userData = { t: i, w: -1, tier: this }; this.group.add(this.full); rayTargets.add(this.full);
    this.dripGroups = []; this.dripFull = null; this.dripSplit = []; this.cur = {}; this.opening = false;
  }
  apply(t, first) {
    if (t.fr !== this.cur.fr) {
      const c = new THREE.Color(FROST[t.fr].c);
      if (first) this.frostMat.color.copy(c); else gsap.to(this.frostMat.color, { r: c.r, g: c.g, b: c.b, duration: 0.6, ease: 'sine.out' });
    }
    if (t.sp !== this.cur.sp || t.fr !== this.cur.fr) { this.capMat.map = spongeTex(t.sp, t.fr, this.r); this.capMat.needsUpdate = true; }
    if (t.dr !== this.cur.dr) {
      this.dripGroups.forEach(g => { g.traverse(o => rayTargets.delete(o)); gsap.to(g.scale, { y: 0.01, duration: 0.35, ease: 'power2.in', onComplete: () => g.parent && g.parent.remove(g) }); });
      this.dripGroups = []; this.dripFull = null; this.dripSplit = [];
      if (t.dr !== 'none') {
        this.dripMat.color.set(DRIP[t.dr].c);
        for (const [grp, part] of [[this.main, 'main'], [this.wedge, 'wedge'], [this.group, 'full']]) {
          const g = new THREE.Group(); g.position.y = TIER_H; const m = new THREE.Mesh(dripGeo(this.r, this.i + 1, part), this.dripMat);
          m.castShadow = true; m.receiveShadow = true; m.userData = { t: this.i, w: part === 'wedge' ? 1 : part === 'full' ? -1 : 0, tier: this }; g.add(m); grp.add(g); rayTargets.add(m); this.dripGroups.push(g);
          if (part === 'full') this.dripFull = m; else this.dripSplit.push(m);
          if (!first) { g.scale.y = 0.02; gsap.to(g.scale, { y: 1, duration: 1.1, ease: 'power2.out' }); }
        }
      }
      this.vis();
    }
    this.cur = { ...t };
  }
  vis() { const sp = !!(this.sliced || this.opening); this.split.forEach(m => m.visible = sp); this.dripSplit.forEach(m => m.visible = sp); this.full.visible = !sp; if (this.dripFull) this.dripFull.visible = !sp; }
  setSlice(on, instant) {
    if (this.sliced === on) return; this.sliced = on;
    const d = { z: on ? this.r * 0.62 : 0, ry: on ? 0.12 : 0 };
    gsap.killTweensOf(this.wedge.position); gsap.killTweensOf(this.wedge.rotation);
    if (instant) { this.wedge.position.z = d.z; this.wedge.rotation.y = d.ry; this.opening = false; this.vis(); return; }
    // swap to the split meshes before sliding out; swap back to the seamless one once fully closed
    this.opening = true; this.vis();
    const done = () => { this.opening = false; this.vis(); };
    gsap.to(this.wedge.position, { z: d.z, duration: on ? 1.0 : 0.8, ease: on ? 'expo.out' : 'power3.inOut', delay: this.i * 0.06, onComplete: on ? null : done });
    gsap.to(this.wedge.rotation, { y: d.ry, duration: on ? 1.0 : 0.8, ease: on ? 'expo.out' : 'power3.inOut', delay: this.i * 0.06 });
  }
  drop() {
    const y = this.i * TIER_H;
    gsap.fromTo(this.group.position, { y: y + 2.8 }, { y, duration: 1.15, ease: 'elastic.out(1,0.5)' });
    gsap.fromTo(this.group.scale, { x: 0.94, y: 1.12, z: 0.94 }, { x: 1, y: 1, z: 1, duration: 1.2, ease: 'elastic.out(1,0.45)', delay: 0.08 });
    setTimeout(() => Sound.thud(), 110);
  }
  dispose(animate) {
    this.group.traverse(o => rayTargets.delete(o));
    if (!animate) { cakeRoot.remove(this.group); return; }
    gsap.to(this.group.position, { y: '+=0.6', duration: 0.4, ease: 'power2.in' });
    gsap.to(this.group.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.4, ease: 'power2.in', onComplete: () => cakeRoot.remove(this.group) });
  }
}
const tiers = [];

/* =====================================================================
   TOPPINGS (procedural, cached geometry)
   ===================================================================== */
const GC = new Map(); const gc = (k, f) => { if (!GC.has(k)) GC.set(k, f()); return GC.get(k); };
const TS = 2.1; // topping scale relative to cake
/* ---------- topping textures ---------- */
const STRAW_P = [[0.0001, 0], [0.032, 0.003], [0.054, 0.018], [0.061, 0.042], [0.057, 0.072], [0.044, 0.1], [0.024, 0.124], [0.007, 0.139], [0.0001, 0.142]];
TEX.halfBerry = canvasTex(256, 256, (g, w, h) => {
  const R0 = 0.061, H0 = 0.142, xy = (r, y, k = 1, cy = 0.5) => [w / 2 + (r / R0) * (w / 2) * k, h - (cy * H0 + (y - cy * H0) * k) / H0 * h];
  const outline = k => { g.beginPath(); STRAW_P.forEach((p, i) => { const [x, y] = xy(p[0], p[1], k); i ? g.lineTo(x, y) : g.moveTo(x, y); }); for (let i = STRAW_P.length - 1; i >= 0; i--) { const [x, y] = xy(-STRAW_P[i][0], STRAW_P[i][1], k); g.lineTo(x, y); } g.closePath(); };
  g.fillStyle = '#c4122b'; g.fillRect(0, 0, w, h);
  outline(0.84); const gr = g.createRadialGradient(w / 2, h * 0.5, 4, w / 2, h * 0.5, w * 0.45); gr.addColorStop(0, '#fff3ee'); gr.addColorStop(0.35, '#f7b9b4'); gr.addColorStop(0.8, '#e5505a'); gr.addColorStop(1, '#d42638'); g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(255,240,236,.55)'; g.lineWidth = 2; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.beginPath(); g.moveTo(w / 2, h * 0.52); g.lineTo(w / 2 + Math.cos(a) * w * 0.3, h * 0.52 + Math.sin(a) * h * 0.36); g.stroke(); }
  g.fillStyle = '#fff6f2'; g.beginPath(); g.ellipse(w / 2, h * 0.52, w * 0.08, h * 0.25, 0, 0, 7); g.fill();
  g.fillStyle = '#f3dc86'; const R = mulberry(9); for (let i = 0; i < 26; i++) { const p = STRAW_P[1 + Math.floor(R() * 7)]; const s = R() > 0.5 ? 1 : -1; const [x, y] = xy(s * p[0] * 0.92, p[1]); g.beginPath(); g.ellipse(x, y, 2.2, 3.2, 0, 0, 7); g.fill(); }
});
TEX.flake = canvasTex(256, 256, (g, w, h) => {
  const R = mulberry(23); g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.beginPath(); const n = 34;
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = w * (0.28 + R() * 0.2) * (i % 3 ? 1 : 0.8); const x = w / 2 + Math.cos(a) * r, y = h / 2 + Math.sin(a) * r * 0.85; i ? g.lineTo(x, y) : g.moveTo(x, y); }
  g.closePath(); g.fill(); g.fillStyle = '#000'; for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(w * (0.22 + R() * 0.56), h * (0.22 + R() * 0.56), 2 + R() * 7, 0, 7); g.fill(); }
}, { srgb: false });
TEX.cocoa = canvasTex(128, 128, (g, w, h) => { const R = mulberry(31); g.fillStyle = '#808080'; g.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { const k = R() > 0.5 ? 255 : 0; g.fillStyle = `rgba(${k},${k},${k},${R() * 0.35})`; g.fillRect(R() * w, R() * h, 1 + R() * 2, 1 + R() * 2); } }, { srgb: false, repeat: true });
TEX.latte = canvasTex(128, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, '#f1e6d6'); gr.addColorStop(0.45, '#ead7bf'); gr.addColorStop(0.62, '#b98a62'); gr.addColorStop(0.78, '#6e4126'); gr.addColorStop(1, '#4a2816'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 9; i++) { g.strokeStyle = i % 2 ? 'rgba(90,50,28,.55)' : 'rgba(245,232,214,.6)'; g.lineWidth = 3 + i % 3 * 2; g.beginPath(); for (let x = 0; x <= w; x += 4) { const y = h * (0.3 + i * 0.035) + Math.sin(x / w * Math.PI * 2 * (1 + i % 3) + i) * 16; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
});
const topperDraw = (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 7; g.lineJoin = 'round'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `italic 172px "Instrument Serif", Georgia, serif`; g.strokeText('Happy Birthday', w / 2, h * 0.52); g.fillText('Happy Birthday', w / 2, h * 0.52); };
TEX.topper = canvasTex(1024, 256, topperDraw, { srgb: false });
const fontsReady = document.fonts ? Promise.race([document.fonts.ready, wait(1800)]) : wait(0);
fontsReady.then(() => { const c = TEX.topper.image; topperDraw(c.getContext('2d'), c.width, c.height); TEX.topper.needsUpdate = true; });

const MAT = {
  berry: M('MeshPhysicalMaterial', { map: TEX.berry, bumpMap: TEX.berryBump, bumpScale: 2, roughness: 0.28, clearcoat: 0.9, clearcoatRoughness: 0.12 }),
  berryCut: M('MeshPhysicalMaterial', { map: TEX.halfBerry, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15, side: THREE.DoubleSide }),
  leaf: M('MeshPhysicalMaterial', { color: '#4f9a36', roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color('#c8f0a8'), side: THREE.DoubleSide }),
  rasp: M('MeshPhysicalMaterial', { color: '#b8183a', roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.7, sheenColor: new THREE.Color('#ff9fb4'), sheenRoughness: 0.4 }),
  cherry: M('MeshPhysicalMaterial', { color: '#7d0819', roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.4 }),
  stem: M('MeshStandardMaterial', { color: '#5f6b2a', roughness: 0.6 }),
  blue: M('MeshPhysicalMaterial', { color: '#2e3a66', roughness: 0.6, sheen: 1, sheenColor: new THREE.Color('#c8d0f0'), sheenRoughness: 0.35 }),
  blueCrown: M('MeshStandardMaterial', { color: '#171a2e', roughness: 0.8 }),
  gold: M('MeshPhysicalMaterial', { color: '#f0c062', metalness: 1, roughness: 0.26, side: THREE.DoubleSide, envMapIntensity: 1.8 }),
  goldLeaf: M('MeshPhysicalMaterial', { color: '#f2c766', metalness: 1, roughness: 0.22, alphaMap: TEX.flake, alphaTest: 0.5, side: THREE.DoubleSide, envMapIntensity: 2.2 }),
  silver: M('MeshPhysicalMaterial', { color: '#ebe6df', metalness: 1, roughness: 0.16, envMapIntensity: 2.2 }),
  meringue: M('MeshPhysicalMaterial', { color: '#fbf4e8', roughness: 0.78, sheen: 0.5, sheenColor: new THREE.Color('#ffffff') }),
  truffle: M('MeshStandardMaterial', { color: '#3d2117', roughness: 0.95, bumpMap: TEX.cocoa, bumpScale: 1.5, envMapIntensity: 0.4 }),
  dark: M('MeshPhysicalMaterial', { color: '#2b150d', roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
  white: M('MeshPhysicalMaterial', { color: '#f1e4cc', roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.25 }),
  mint: M('MeshPhysicalMaterial', { color: '#3f8a35', roughness: 0.5, sheen: 0.5, sheenColor: new THREE.Color('#b8f0a0'), side: THREE.DoubleSide }),
  glass: M('MeshPhysicalMaterial', { color: '#ffffff', transparent: true, opacity: 0.22, roughness: 0.04, clearcoat: 1, depthWrite: false, envMapIntensity: 1.6 }),
  latte: M('MeshStandardMaterial', { map: TEX.latte, roughness: 0.35 }),
  coffee: M('MeshStandardMaterial', { color: '#5e3620', roughness: 0.3 }),
  ice: M('MeshPhysicalMaterial', { color: '#f2fbff', transparent: true, opacity: 0.6, roughness: 0.08, clearcoat: 1, depthWrite: false, envMapIntensity: 1.6 }),
  straw: M('MeshStandardMaterial', { color: '#e9e2d6', roughness: 0.45 }),
  pick: M('MeshPhysicalMaterial', { map: TEX.tortoise, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 }),
  vinyl: M('MeshPhysicalMaterial', { map: TEX.vinyl, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
  vinylEdge: M('MeshStandardMaterial', { color: '#0d0b0c', roughness: 0.4 }),
  topper: M('MeshPhysicalMaterial', { color: '#f2cf8c', metalness: 1, roughness: 0.3, alphaMap: TEX.topper, alphaTest: 0.5, envMapIntensity: 3.4, emissive: new THREE.Color('#3a2508'), emissiveIntensity: 1 }),
};
const macMats = MAC_COLORS.map(c => M('MeshPhysicalMaterial', { color: c, roughness: 0.55, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffffff') }));
const macFill = ['#4a2318', '#fbf0e0', '#fbf0e0', '#b8304d'].map(c => M('MeshPhysicalMaterial', { color: c, roughness: 0.6, sheen: 0.3 }));
const roseMats = ['#d98e9a', '#c46b7e', '#e8b0b4'].map(c => M('MeshPhysicalMaterial', { color: c, roughness: 0.62, sheen: 0.8, sheenColor: new THREE.Color('#fff0f0'), sheenRoughness: 0.5, side: THREE.DoubleSide }));

function mesh(g, m, cast = true) { const o = new THREE.Mesh(g, m); o.castShadow = cast; o.receiveShadow = true; return o; }
const clean = g => { g.deleteAttribute('uv'); g.deleteAttribute('normal'); return g.index ? g.toNonIndexed() : g; };
const calyxGeo = half => gc('calyx' + half, () => {
  const parts = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + 0.2; if (half && Math.sin(a) < -0.25) continue; const l = new THREE.ConeGeometry(0.021, 0.078, 4, 1); l.scale(1, 1, 0.16); l.translate(0, 0.039, 0); l.rotateX(Math.PI / 2 + 0.42); l.rotateY(a); parts.push(clean(l)); }
  const st = new THREE.CylinderGeometry(0.0045, 0.006, 0.035, 6); st.translate(0, -0.015, 0); parts.push(clean(st));
  const g = mergeGeometries(parts); g.computeVertexNormals(); return g;
});
const leafGeo = () => gc('leafS', () => {
  const s = new THREE.Shape(), N = 18, pts = [];
  for (let i = 0; i <= N; i++) { const t = i / N; pts.push([Math.sin(Math.PI * Math.pow(t, 0.75)) * 0.02 * (i % 2 ? 1.12 : 1), t * 0.075]); }
  s.moveTo(0, 0); pts.forEach(p => s.lineTo(p[0], p[1])); for (let i = N - 1; i > 0; i--) s.lineTo(-pts[i][0], pts[i][1]);
  const g = new THREE.ShapeGeometry(s, 3); const P = g.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i); P.setZ(i, 14 * x * x - 1.2 * y * y); }
  g.computeVertexNormals(); g.rotateX(-Math.PI / 2 + 0.3); return g;
});

function makeTopping(k, v = 0) {
  const outer = new THREE.Group(), inner = new THREE.Group(); outer.add(inner); inner.scale.setScalar(TS);
  if (k === 'strawberry') {
    const body = gc('straw', () => new THREE.LatheGeometry(STRAW_P.map(p => V2(p[0], p[1])), 28));
    const piv = new THREE.Group(); piv.add(mesh(body, MAT.berry), mesh(calyxGeo(false), MAT.leaf));
    piv.rotation.x = 1.42; piv.position.set(0, 0.052, -0.066); inner.add(piv);
  } else if (k === 'halfberry') {
    const [body, face] = gc('halfb', () => {
      const b = new THREE.LatheGeometry(STRAW_P.map(p => V2(p[0], p[1])), 16, 0, Math.PI);
      const s = new THREE.Shape(); STRAW_P.forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1])); for (let i = STRAW_P.length - 2; i > 0; i--) s.lineTo(-STRAW_P[i][0], STRAW_P[i][1]);
      const f = new THREE.ShapeGeometry(s, 8); const uv = f.attributes.uv, pos = f.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 0.122 + 0.5, pos.getY(i) / 0.142);
      f.rotateY(-Math.PI / 2); return [b, f];
    });
    const piv = new THREE.Group(); piv.add(mesh(body, MAT.berry), mesh(face, MAT.berryCut, false), mesh(calyxGeo(true), MAT.leaf));
    piv.rotation.z = -Math.PI / 2; piv.position.set(-0.07, 0.05, 0);
    const tilt = new THREE.Group(); tilt.add(piv); tilt.rotation.x = 0.35; inner.add(tilt);
  } else if (k === 'raspberry') {
    const g = gc('rasp', () => {
      const parts = [], R = mulberry(41);
      for (let r = 0; r < 7; r++) { const th = r === 0 ? 0 : 0.18 + r * 0.33; const n = r === 0 ? 1 : Math.round(Math.sin(th) * 13) + 3;
        for (let j = 0; j < n; j++) { const ph = j / n * Math.PI * 2 + r * 0.45; const s = new THREE.SphereGeometry(0.0095 * (0.9 + R() * 0.2), 8, 6); s.translate(Math.sin(th) * Math.cos(ph) * 0.029, 0.034 + Math.cos(th) * 0.036, Math.sin(th) * Math.sin(ph) * 0.029); parts.push(s); } }
      return mergeGeometries(parts);
    });
    inner.add(mesh(g, MAT.rasp));
  } else if (k === 'macaron') {
    const shell = gc('shell', () => {
      const top = new THREE.SphereGeometry(0.062, 30, 10, 0, Math.PI * 2, 0, Math.PI / 2); top.scale(1, 0.42, 1); const bot = top.clone(); bot.rotateX(Math.PI); top.translate(0, 0.012, 0); bot.translate(0, -0.012, 0);
      const foot = () => { const f = new THREE.TorusGeometry(0.058, 0.0095, 6, 72); f.rotateX(Math.PI / 2); const p = f.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x); const k2 = 1 + 0.07 * Math.sin(a * 31) * Math.sin(a * 9 + 1); p.setX(i, x * k2); p.setZ(i, z * k2); p.setY(i, p.getY(i) * (1 + 0.5 * Math.abs(Math.sin(a * 31)))); } f.computeVertexNormals(); return f; };
      const f1 = foot(); f1.translate(0, 0.011, 0); const f2 = foot(); f2.translate(0, -0.011, 0);
      return mergeGeometries([top, bot, f1, f2].map(g => g.toNonIndexed()));
    });
    const fill = gc('fill', () => new THREE.CylinderGeometry(0.055, 0.055, 0.017, 32));
    const piv = new THREE.Group(); piv.add(mesh(shell, macMats[v % macMats.length]), mesh(fill, macFill[v % macFill.length]));
    piv.rotation.set(Math.PI / 2 - 0.4, 0, 0.08); piv.position.y = 0.05; inner.add(piv);
  } else if (k === 'cherry') {
    const ball = gc('cherry', () => { const g = new THREE.SphereGeometry(0.044, 28, 18); g.scale(1, 0.92, 1); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > 0.03) p.setY(i, y - (y - 0.03) * 0.6); } g.computeVertexNormals(); return g; });
    const stem = gc('cstem', () => new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0.07, 0), new THREE.Vector3(0.006, 0.15, 0.01), new THREE.Vector3(0.05, 0.2, 0.016)), 14, 0.0042, 6));
    const b = mesh(ball, MAT.cherry); b.position.y = 0.04; inner.add(b, mesh(stem, MAT.stem));
  } else if (k === 'blueberry') {
    const [berries, crowns] = gc('blue3', () => {
      const P = [[0.028, 0.027, 0.004, 1], [-0.017, 0.026, 0.026, 0.94], [-0.014, 0.027, -0.026, 1.04]]; const b = [], c = [];
      P.forEach(([x, y, z, s]) => { const g = new THREE.SphereGeometry(0.029 * s, 22, 14); g.scale(1, 0.9, 1); g.translate(x, y * s, z); b.push(g); const cr = new THREE.CylinderGeometry(0.008, 0.011, 0.006, 5); cr.translate(x, y * s + 0.026 * s, z); c.push(cr); });
      return [mergeGeometries(b), mergeGeometries(c)];
    });
    inner.add(mesh(berries, MAT.blue), mesh(crowns, MAT.blueCrown, false));
  } else if (k === 'meringue') {
    const g = gc('mer', () => {
      const prof = [[0.0001, 0], [0.036, 0.002], [0.042, 0.013], [0.037, 0.032], [0.026, 0.053], [0.013, 0.072], [0.004, 0.088], [0.0001, 0.094]];
      let l = new THREE.LatheGeometry(prof.map(p => V2(p[0], p[1])), 64); l.deleteAttribute('uv'); l.deleteAttribute('normal'); l = mergeVertices(l);
      const P = l.attributes.position; for (let i = 0; i < P.count; i++) { const x = P.getX(i), y = P.getY(i), z = P.getZ(i), a = Math.atan2(x, z); const kk = 1 + 0.17 * Math.cos(8 * a + y * 46); P.setX(i, x * kk); P.setZ(i, z * kk); }
      l.computeVertexNormals(); return l;
    });
    inner.add(mesh(g, MAT.meringue));
  } else if (k === 'truffle') {
    const b = mesh(gc('truf', () => new THREE.SphereGeometry(0.037, 24, 16)), MAT.truffle); b.position.y = 0.033;
    const f = mesh(gc('tflake', () => { const p = new THREE.PlaneGeometry(0.03, 0.026, 4, 4); const a = p.attributes.position; const R = mulberry(5); for (let j = 0; j < a.count; j++) a.setZ(j, (R() - 0.5) * 0.004); p.computeVertexNormals(); p.rotateX(-Math.PI / 2); return p; }), MAT.goldLeaf, false); f.position.y = 0.07; f.rotation.set(0.2, v, 0.15);
    inner.add(b, f);
  } else if (k === 'shard') {
    const g = gc('shard', () => { const s = new THREE.Shape(); [[-0.03, 0], [0.034, 0], [0.046, 0.05], [0.024, 0.1], [0.009, 0.15], [-0.012, 0.11], [-0.022, 0.085], [-0.042, 0.055]].forEach((p, i) => i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]));
      const e = new THREE.ExtrudeGeometry(s, { depth: 0.005, bevelEnabled: true, bevelThickness: 0.0012, bevelSize: 0.0012, bevelSegments: 1 }); e.translate(0, -0.02, -0.0025); return e; });
    const p = mesh(g, v % 3 === 0 ? MAT.white : MAT.dark); p.rotation.set(-0.32, 0, 0.18); inner.add(p);
  } else if (k === 'dragee') {
    const g = gc('drag', () => { const R = mulberry(17), parts = []; for (let i = 0; i < 8; i++) { const r = 0.006 + R() * 0.006, a = R() * 6.28, d = Math.sqrt(R()) * 0.04; const s = new THREE.SphereGeometry(r, 12, 8); s.translate(Math.cos(a) * d, r, Math.sin(a) * d); parts.push(s); } return mergeGeometries(parts); });
    inner.add(mesh(g, MAT.silver));
  } else if (k === 'rose') {
    const g = gc('rose', () => {
      const parts = [];
      // centre bud
      const bud = new THREE.LatheGeometry([[0.0001, 0.004], [0.008, 0.01], [0.01, 0.022], [0.007, 0.034], [0.0001, 0.038]].map(p => V2(p[0], p[1])), 12); parts.push(bud);
      // rings of cupped petals that lean further out as they grow (closed heart → open outer petals)
      [[3, 0.026, 0.03, 0.006, 0.12], [4, 0.032, 0.034, 0.011, 0.4], [5, 0.038, 0.036, 0.017, 0.72], [6, 0.044, 0.036, 0.024, 1.02], [7, 0.048, 0.034, 0.031, 1.3]].forEach(([n, w, h, r, tilt], ring) => {
        for (let j = 0; j < n; j++) {
          const pg = new THREE.PlaneGeometry(w, h, 6, 5); pg.translate(0, h / 2, 0); const P = pg.attributes.position;
          for (let q = 0; q < P.count; q++) { const x = P.getX(q), y = P.getY(q), t = y / h; const half = 1 - 0.35 * Math.pow(t - 0.55, 2) * 4; P.setX(q, x * Math.max(0.35, half) * (t < 0.15 ? 0.55 + t * 3 : 1)); P.setZ(q, -(x * x) / (w * 0.75) + 0.4 * h * Math.pow(t, 3)); }
          pg.translate(0, 0, r); pg.rotateX(tilt); pg.rotateY(j / n * Math.PI * 2 + ring * 0.7); pg.translate(0, 0.002 + ring * 0.0015, 0); parts.push(pg);
        }
      });
      parts.forEach(q => { q.deleteAttribute('uv'); });
      const m = mergeGeometries(parts.map(q => q.index ? q.toNonIndexed() : q)); m.computeVertexNormals(); return m;
    });
    inner.add(mesh(g, roseMats[v % roseMats.length]));
    for (const a of [0.6, 2.9]) { const l = mesh(leafGeo(), MAT.mint); l.rotation.y = a; l.position.y = 0.006; l.scale.setScalar(0.9); inner.add(l); }
    inner.scale.setScalar(TS * 1.1);
  } else if (k === 'mint') {
    for (const [a, s] of [[0.3, 1.45], [2.5, 1.25], [-1.6, 1.05]]) { const l = mesh(leafGeo(), MAT.mint); l.rotation.y = a; l.scale.setScalar(s); l.position.y = 0.004; inner.add(l); }
  } else if (k === 'gold') {
    const g = gc('gold' + (v % 3), () => {
      const R = mulberry(v * 13 + 3), parts = [];
      for (let i = 0; i < 2; i++) { const p = new THREE.PlaneGeometry(0.14 - i * 0.04, 0.115 - i * 0.03, 12, 10); const a = p.attributes.position;
        for (let j = 0; j < a.count; j++) { const x = a.getX(j), y = a.getY(j); a.setZ(j, Math.sin(x * 160 + R()) * 0.002 + Math.sin(y * 210) * 0.0018 + (R() - 0.5) * 0.004 + (x * x + y * y) * 1.4); }
        p.computeVertexNormals(); p.rotateX(-Math.PI / 2 + (R() - 0.5) * 0.7); p.rotateY(R() * 6); p.translate((R() - 0.5) * 0.03, 0.01 + i * 0.012, (R() - 0.5) * 0.03); parts.push(p); }
      return mergeGeometries(parts);
    });
    inner.add(mesh(g, MAT.goldLeaf, false));
  } else if (k === 'latte') {
    const cup = mesh(gc('cup', () => new THREE.CylinderGeometry(0.05, 0.041, 0.13, 28, 1, true)), MAT.glass, false); cup.position.y = 0.065; cup.renderOrder = 2;
    const base = mesh(gc('cupb', () => new THREE.CircleGeometry(0.041, 24).rotateX(-Math.PI / 2)), MAT.glass, false); base.position.y = 0.001;
    const liq = mesh(gc('liq', () => new THREE.CylinderGeometry(0.0475, 0.039, 0.104, 24)), MAT.latte); liq.position.y = 0.054;
    const top = mesh(gc('liqT', () => new THREE.CircleGeometry(0.0474, 24).rotateX(-Math.PI / 2)), MAT.coffee, false); top.position.y = 0.1065;
    inner.add(cup, base, liq, top);
    for (let i = 0; i < 4; i++) { const ic = mesh(gc('ice', () => new THREE.BoxGeometry(0.03, 0.028, 0.03)), MAT.ice, false); ic.position.set(Math.cos(i * 1.7) * 0.02, 0.108 + (i % 2) * 0.008, Math.sin(i * 1.7) * 0.02); ic.rotation.set(i, i * 0.7, i * 1.3); ic.renderOrder = 1; inner.add(ic); }
    const st = mesh(gc('strawT', () => new THREE.CylinderGeometry(0.0045, 0.0045, 0.21, 8)), MAT.straw); st.position.set(0.014, 0.135, -0.006); st.rotation.z = -0.22; inner.add(st);
    inner.scale.setScalar(TS * 1.5);
  } else if (k === 'pick') {
    const g = gc('pick', () => { const s = new THREE.Shape(); s.moveTo(0, -0.056); s.quadraticCurveTo(0.05, -0.012, 0.046, 0.024); s.quadraticCurveTo(0.036, 0.056, 0, 0.056); s.quadraticCurveTo(-0.036, 0.056, -0.046, 0.024); s.quadraticCurveTo(-0.05, -0.012, 0, -0.056);
      const e = new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 2, curveSegments: 18 }); e.translate(0, 0, -0.002); return e; });
    const p = mesh(g, MAT.pick); p.rotation.x = -0.45; p.position.y = 0.035; inner.add(p);
  } else if (k === 'vinyl') {
    const disc = mesh(gc('vin', () => new THREE.CylinderGeometry(0.125, 0.125, 0.005, 64)), MAT.vinylEdge);
    const face = gc('vface', () => new THREE.CircleGeometry(0.1249, 64));
    const top = mesh(face, MAT.vinyl, false); top.rotation.x = -Math.PI / 2; top.position.y = 0.0026;
    const bot = mesh(face, MAT.vinyl, false); bot.rotation.x = Math.PI / 2; bot.position.y = -0.0026;
    const piv = new THREE.Group(); piv.add(disc, top, bot); piv.rotation.x = -1.18; piv.position.y = 0.105; inner.add(piv);
  } else if (k === 'topper') {
    const sg = gc('topper', () => new THREE.PlaneGeometry(0.4, 0.1));
    const sign = mesh(sg, MAT.topper); sign.position.y = 0.175; const back = mesh(sg, MAT.topper); back.position.y = 0.175; back.rotation.y = Math.PI; back.position.z = -0.001; inner.add(back);
    const stick = gc('tstick', () => new THREE.CylinderGeometry(0.0032, 0.0032, 0.17, 6).translate(0, 0.045, 0));
    const s1 = mesh(stick, MAT.gold); s1.position.x = -0.085; const s2 = mesh(stick, MAT.gold); s2.position.x = 0.085;
    inner.add(sign, s1, s2); inner.scale.setScalar(TS * 0.95);
  }
  return outer;
}
const UP = new THREE.Vector3(0, 1, 0), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3(), _n = new THREE.Vector3();
function orient(obj, p, n, twist) { _n.set(n[0], n[1], n[2]).normalize(); _q.setFromUnitVectors(UP, _n); _q2.setFromAxisAngle(_n, twist); obj.quaternion.copy(_q2.multiply(_q)); obj.position.set(p[0], p[1], p[2]); }
function parentFor(t, w) { if (t < 0) return stand; const T = tiers[t]; return T ? (w ? T.wedge : T.main) : null; }
const topObjs = new Map();
function syncTops(animate = true) {
  const ids = new Set(S.tops.map(t => t.id));
  for (const [id, o] of topObjs) if (!ids.has(id)) { topObjs.delete(id); popOut(o); }
  for (const t of S.tops) {
    const parent = parentFor(t.t, t.w); if (!parent) continue;
    let o = topObjs.get(t.id);
    if (!o) { o = makeTopping(t.k, t.v); topObjs.set(t.id, o); parent.add(o); orient(o, t.p, t.n, t.r); if (animate) popIn(o); continue; }
    if (o.parent !== parent) parent.add(o);
    orient(o, t.p, t.n, t.r);
  }
}
function popIn(o) { o.scale.setScalar(0.01); gsap.to(o.scale, { x: 1, y: 1, z: 1, duration: 0.55, ease: 'back.out(2.4)' }); }
function popOut(o) { gsap.to(o.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.25, ease: 'power2.in', onComplete: () => o.parent && o.parent.remove(o) }); }

/* ---------------- piping (instanced fluted rosettes) ---------------- */
const blobGeo = (() => {
  const g = new THREE.SphereGeometry(1, 28, 14); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x); const flute = 1 + 0.2 * Math.cos(a * 8 + y * 2.2) * (1 - Math.abs(y) * 0.6);
    x *= flute; z *= flute; if (y < 0) y *= 0.25; else { y = y * 1.15; const tw = y * 0.9; const nx = x * Math.cos(tw) - z * Math.sin(tw), nz = x * Math.sin(tw) + z * Math.cos(tw); const tp = 1 - Math.pow(y / 1.15, 2) * 0.55; x = nx * tp; z = nz * tp; }
    p.setXYZ(i, x, y + 0.25, z);
  }
  g.computeVertexNormals(); return g;
})();
const pipeMat = M('MeshPhysicalMaterial', { color: '#ffffff', roughness: 0.58, clearcoat: 0.15, clearcoatRoughness: 0.5, sheen: 0.4, sheenColor: new THREE.Color('#ffffff'), envMapIntensity: 0.8 });
const pipeIMs = new Map(); let pipeVer = 0; const growing = [];
const BLOB = 0.046, PIPE_CAP = 1400;
function pipeIM(k) {
  if (pipeIMs.has(k)) return pipeIMs.get(k);
  const [t, w] = k.split(':').map(Number); const parent = parentFor(t, w); if (!parent) return null;
  const im = new THREE.InstancedMesh(blobGeo, pipeMat, PIPE_CAP); im.count = 0; im.castShadow = true; im.receiveShadow = true; im.frustumCulled = false;
  im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.setColorAt(0, new THREE.Color()); parent.add(im);
  const P = { im, n: 0 }; pipeIMs.set(k, P); return P;
}
const _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _c = new THREE.Color();
function blobMatrix(pt, scale) { _n.set(pt[5], pt[6], pt[7]).normalize(); _q.setFromUnitVectors(UP, _n); _q2.setFromAxisAngle(_n, pt[8]); _q2.multiply(_q); _s.setScalar(BLOB * pt[9] * scale); _v.set(pt[2], pt[3], pt[4]); return _m.compose(_v, _q2, _s); }
function syncPipes(animate = true) {
  const lists = new Map();
  for (const st of S.pipes) for (const pt of st.pts) { const k = pt[0] + ':' + pt[1]; if (!lists.has(k)) lists.set(k, []); lists.get(k).push([pt, st.c]); }
  const rebuild = S.pv !== pipeVer; pipeVer = S.pv;
  for (const [k, P] of pipeIMs) {
    const [t, w] = k.split(':').map(Number); const parent = parentFor(t, w);
    if (!parent || P.im.parent !== parent) { P.im.parent && P.im.parent.remove(P.im); pipeIMs.delete(k); continue; }
    if (!lists.has(k)) { P.n = 0; P.im.count = 0; }
  }
  for (const [k, list] of lists) {
    const P = pipeIM(k); if (!P) continue;
    if (rebuild || P.n > list.length) P.n = 0;
    for (let i = P.n; i < list.length; i++) {
      const [pt, c] = list[i];
      P.im.setMatrixAt(i, blobMatrix(pt, animate && !rebuild ? 0.01 : 1)); P.im.setColorAt(i, _c.set(PIPE[c].c));
      if (animate && !rebuild) growing.push({ P, i, pt, t0: performance.now() });
    }
    P.n = list.length; P.im.count = P.n; P.im.instanceMatrix.needsUpdate = true; if (P.im.instanceColor) P.im.instanceColor.needsUpdate = true;
  }
}
function updateGrowing(now) {
  for (let j = growing.length - 1; j >= 0; j--) {
    const g = growing[j]; const k = clamp((now - g.t0) / 200, 0, 1); const e = 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2);
    if (g.i < g.P.n) { g.P.im.setMatrixAt(g.i, blobMatrix(g.pt, Math.max(0.01, e))); g.P.im.instanceMatrix.needsUpdate = true; }
    if (k >= 1) growing.splice(j, 1);
  }
}

/* =====================================================================
   CANDLES
   ===================================================================== */
function arc(cx, cy, rx, ry, a0, a1, n = 18) { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return o; }
const PI = Math.PI;
const DIGITS = {
  0: { closed: true, s: [arc(.3, .5, .25, .45, PI / 2, PI / 2 + PI * 2, 40).slice(0, -1)] },
  1: { s: [[[.12, .74], [.3, .95], [.3, .05]]] },
  2: { s: [[...arc(.3, .7, .25, .25, PI * 0.92, -PI * 0.28, 20), [.06, .05], [.58, .05]]] },
  3: { s: [[...arc(.3, .74, .23, .21, PI * 0.85, -PI * 0.5, 18), ...arc(.3, .29, .26, .25, PI * 0.5, -PI * 0.88, 20).slice(1)]] },
  4: { s: [[[.44, .05], [.44, .95], [.05, .34], [.6, .34]]] },
  5: { s: [[[.56, .95], [.13, .95], [.09, .56], ...arc(.3, .32, .27, .27, PI * 0.72, -PI * 0.85, 20)]] },
  6: { s: [[[.52, .94], [.32, .86], [.14, .66], [.05, .34], ...arc(.31, .3, .26, .26, PI, -PI, 32)]] },
  7: { s: [[[.05, .95], [.58, .95], [.22, .05]]] },
  8: { closed: true, s: [arc(.3, .74, .2, .2, -PI / 2, PI * 1.5, 30).slice(0, -1), arc(.3, .29, .25, .25, PI / 2, PI * 2.5, 30).slice(0, -1)] },
  9: { s: [[...arc(.29, .7, .26, .26, 0, PI * 2, 32), [.55, .5], [.48, .24], [.32, .07], [.12, .05]]] },
};
function densify(pts) { const o = []; for (let i = 0; i < pts.length; i++) { const a = pts[i]; o.push(a); const b = pts[i + 1]; if (!b) break; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L > 0.12) { o.push([lerp(a[0], b[0], 0.12), lerp(a[1], b[1], 0.12)]); o.push([lerp(a[0], b[0], 0.88), lerp(a[1], b[1], 0.88)]); } } return o; }
const TUBE = 0.078;
function digitGeo(d) {
  return gc('digit' + d, () => {
    const D = DIGITS[d]; const parts = []; let top = [0, -1];
    for (const s of D.s) {
      const pts = D.closed ? s : densify(s);
      pts.forEach(p => { if (p[1] > top[1] + 0.005) top = [p[0], p[1]]; else if (Math.abs(p[1] - top[1]) < 0.005) top = [(top[0] + p[0]) / 2, top[1]]; });
      const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0] - 0.3, p[1], 0)), !!D.closed, 'centripetal');
      parts.push(new THREE.TubeGeometry(curve, Math.min(160, pts.length * 4), TUBE, 12, !!D.closed));
      if (!D.closed) for (const e of [pts[0], pts[pts.length - 1]]) { const sp = new THREE.SphereGeometry(TUBE, 12, 8); sp.translate(e[0] - 0.3, e[1], 0); parts.push(sp); }
    }
    const g = mergeGeometries(parts.map(p => p.toNonIndexed())); g.userData.top = [top[0] - 0.3, top[1] + TUBE]; return g;
  });
}
const wickMat = M('MeshStandardMaterial', { color: '#2a1f1b', roughness: 0.9 });
const wickGeo = new THREE.CylinderGeometry(0.0055, 0.0065, 0.045, 6).translate(0, 0.0225, 0);
const waxMats = WAX.map(c => M('MeshPhysicalMaterial', { color: c, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.3, sheen: 0.6, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.4, emissive: new THREE.Color(c), emissiveIntensity: 0 }));
const taperMat = M('MeshPhysicalMaterial', { map: TEX.stripes, roughness: 0.35, clearcoat: 0.4 });
const wireMat = M('MeshStandardMaterial', { color: '#9a9a9a', metalness: 1, roughness: 0.35 });
const coatMat = M('MeshStandardMaterial', { color: '#4a4744', roughness: 0.95 });
TEX.stripes.repeat.set(1, 2);

/* flame shader */
const flameGeo = new THREE.LatheGeometry([[0.0001, 0], [0.012, 0.006], [0.019, 0.02], [0.021, 0.036], [0.018, 0.06], [0.012, 0.086], [0.005, 0.112], [0.0001, 0.13]].map(p => V2(p[0], p[1])), 18);
const FLAME_VS = `uniform float uTime; uniform float uSeed; uniform float uBend; uniform float uAlive; uniform vec2 uDir;
varying float vH; varying vec3 vN; varying vec3 vV;
void main(){ vec3 p = position; float h = clamp(p.y/0.13,0.,1.); vH = h; float t = uTime;
 float sway = sin(t*6.3+uSeed)*.5 + sin(t*11.7+uSeed*1.7)*.3 + sin(t*23.+uSeed*3.1)*.2;
 p.x += sway*.008*h*h; p.z += cos(t*7.1+uSeed*2.3)*.006*h*h;
 p.y *= 1. + .07*sin(t*15.+uSeed) - uBend*.32;
 p.xz += uDir * uBend * pow(h,1.5) * .12;
 p *= uAlive;
 vec4 mv = modelViewMatrix*vec4(p,1.); vV = normalize(-mv.xyz); vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*mv; }`;
const FLAME_FS = `uniform float uAlive; varying float vH; varying vec3 vN; varying vec3 vV;
void main(){ float fr = clamp(dot(normalize(vN), normalize(vV)),0.,1.);
 vec3 core = vec3(1.,.97,.86), mid = vec3(1.,.7,.24), edge = vec3(1.,.36,.07), blue = vec3(.3,.45,1.);
 vec3 col = mix(edge, mid, smoothstep(.1,.6,fr)); col = mix(col, core, smoothstep(.5,.95,fr)*(1.-vH*.55));
 col = mix(col, blue, smoothstep(.2,.0,vH)*.55);
 float a = smoothstep(0.,.4,fr) * (1. - smoothstep(.7,1.,vH)*.6) * (smoothstep(0.,.1,vH)*.6+.4);
 gl_FragColor = vec4(col*a*1.5, a*min(uAlive*2.,1.)); }`;
function makeFlame(scale = 1) {
  const mat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uSeed: { value: Math.random() * 100 }, uBend: { value: 0 }, uAlive: { value: 0 }, uDir: { value: new THREE.Vector2(0, -1) } }, vertexShader: FLAME_VS, fragmentShader: FLAME_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const g = new THREE.Group(); const core = new THREE.Mesh(flameGeo, mat); core.scale.setScalar(scale); g.add(core);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: TEX.glow, color: 0xffb060, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  glow.scale.setScalar(0.34 * scale); glow.position.y = 0.05 * scale; g.add(glow);
  g.userData = { mat, glow, alive: 0 }; g.visible = false; return g;
}
const flames = new Set();

const candleObjs = new Map();
function makeCandle(c, idx) {
  const g = new THREE.Group(); const o = { id: c.id, k: c.k, group: g, lit: false, health: 1, res: 0.6 + Math.random() * 0.9, d: c.d };
  let wick;
  if (c.k === 'd') {
    const geo = digitGeo(c.d); const m = mesh(geo, waxMats[idx % waxMats.length]); m.scale.setScalar(0.34); g.add(m); o.wax = m.material;
    wick = new THREE.Vector3(geo.userData.top[0] * 0.34, geo.userData.top[1] * 0.34 - 0.006, 0);
  } else if (c.k === 't') {
    const m = mesh(gc('taper', () => new THREE.CylinderGeometry(0.019, 0.023, 0.42, 18).translate(0, 0.21, 0)), taperMat); g.add(m);
    wick = new THREE.Vector3(0, 0.418, 0);
  } else {
    const w = mesh(gc('wire', () => new THREE.CylinderGeometry(0.0035, 0.0035, 0.52, 6).translate(0, 0.26, 0)), wireMat); const co = mesh(gc('coat', () => new THREE.CylinderGeometry(0.0105, 0.0105, 0.27, 8).translate(0, 0.37, 0)), coatMat);
    g.add(w, co); wick = new THREE.Vector3(0, 0.5, 0); o.spark = true;
  }
  if (!o.spark) { const wk = mesh(wickGeo, wickMat, false); wk.position.copy(wick); g.add(wk); }
  o.wick = wick.clone().add(new THREE.Vector3(0, o.spark ? 0 : 0.04, 0));
  o.flame = makeFlame(o.spark ? 0.6 : 1); o.flame.position.copy(o.wick).add(new THREE.Vector3(0, o.spark ? 0 : -0.006, 0)); g.add(o.flame);
  if (o.spark) o.flame.userData.mat.uniforms.uSeed.value = 0;
  return o;
}
function candleLayout() {
  const n = S.tiers.length || 1; const R = tierR(n - 1); let s = clamp(R / 0.72, 0.62, 1.1);
  const digits = S.candles.filter(c => c.k === 'd'), others = S.candles.filter(c => c.k !== 'd');
  let dw = 0.25 * s; if (digits.length * dw > R * 1.5) { s *= (R * 1.5) / (digits.length * dw); dw = 0.25 * s; }
  const pos = new Map();
  digits.forEach((c, i) => pos.set(c.id, { x: (i - (digits.length - 1) / 2) * dw, z: others.length ? R * 0.1 : 0, s }));
  const m = others.length;
  others.forEach((c, j) => {
    let a, rr;
    if (digits.length) { a = 0.95 + (j + 0.5) * (Math.PI * 2 - 1.9) / m; rr = R * 0.7; } else { a = j * Math.PI * 2 / m + (m > 1 ? Math.PI : 0); rr = m === 1 ? 0 : R * 0.55; }
    pos.set(c.id, { x: Math.sin(a) * rr, z: Math.cos(a) * rr, s: clamp(s, 0.7, 1.05) });
  });
  return pos;
}
function syncCandles(animate = true) {
  const ids = new Set(S.candles.map(c => c.id));
  for (const [id, o] of candleObjs) if (!ids.has(id)) { candleObjs.delete(id); flames.delete(o.flame); popOut(o.group); }
  S.candles.forEach((c, i) => {
    if (!candleObjs.has(c.id)) { const o = makeCandle(c, i); candleObjs.set(c.id, o); candleRoot.add(o.group); o.isNew = true; }
  });
  const L = candleLayout();
  for (const [id, o] of candleObjs) {
    const p = L.get(id); if (!p) continue;
    if (o.isNew) {
      o.isNew = false; o.group.position.set(p.x, animate ? 1.4 : 0, p.z); o.group.scale.setScalar(p.s);
      if (animate) { gsap.to(o.group.position, { y: 0, duration: 0.9, ease: 'elastic.out(1,0.55)' }); setTimeout(() => Sound.thud(true), 90); }
    } else gsap.to(o.group.position, { x: p.x, z: p.z, y: 0, duration: 0.6, ease: 'power3.out' });
    if (!o.isNew) gsap.to(o.group.scale, { x: p.s, y: p.s, z: p.s, duration: 0.5 });
  }
  const topY = S.tiers.length * TIER_H - 0.012;
  if (Math.abs(candleRoot.position.y - topY) > 0.001) { if (animate) gsap.to(candleRoot.position, { y: topY, duration: 0.8, ease: 'power3.out' }); else candleRoot.position.y = topY; }
  // flames
  const lit = new Set(S.lit);
  for (const [id, o] of candleObjs) { const want = lit.has(id); if (want !== o.lit) want ? igniteVisual(o, animate) : extinguishVisual(o, animate); }
}
function igniteVisual(o, animate) {
  o.lit = true; o.health = 1; const f = o.flame; f.visible = true; flames.add(f);
  gsap.killTweensOf(f.userData); f.userData.alive = animate ? 0 : 1;
  if (animate) gsap.to(f.userData, { alive: 1, duration: 0.9, ease: 'elastic.out(1,0.4)' });
  if (o.wax) gsap.to(o.wax, { emissiveIntensity: 0.06, duration: 1 });
  if (animate) Sound.ignite([...candleObjs.values()].filter(c => c.lit).length - 1);
}
function extinguishVisual(o, animate) {
  o.lit = false; const f = o.flame;
  gsap.killTweensOf(f.userData);
  if (!animate) { f.userData.alive = 0; f.visible = false; flames.delete(f); return; }
  gsap.to(f.userData, { alive: 0, duration: 0.22, ease: 'power2.in', onComplete: () => { f.visible = false; flames.delete(f); } });
  if (o.wax) gsap.to(o.wax, { emissiveIntensity: 0, duration: 0.6 });
  o.group.updateMatrixWorld(); const wp = o.group.localToWorld(o.wick.clone()); smokeAt(wp); Sound.puff();
}

/* =====================================================================
   PARTICLES: sparks, smoke, confetti
   ===================================================================== */
const SPARK_N = 700;
const sparkGeo = new THREE.BufferGeometry();
const spP = new Float32Array(SPARK_N * 3), spC = new Float32Array(SPARK_N * 3), spV = new Float32Array(SPARK_N * 3), spL = new Float32Array(SPARK_N);
sparkGeo.setAttribute('position', new THREE.BufferAttribute(spP, 3)); sparkGeo.setAttribute('color', new THREE.BufferAttribute(spC, 3));
const sparks = new THREE.Points(sparkGeo, new THREE.PointsMaterial({ size: 0.03, map: TEX.soft, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
sparks.frustumCulled = false; scene.add(sparks); let spI = 0;
function emitSpark(p) { const i = spI++ % SPARK_N; spP[i * 3] = p.x; spP[i * 3 + 1] = p.y; spP[i * 3 + 2] = p.z; const a = Math.random() * 6.28, u = Math.random() * 2 - 1, sp = 0.6 + Math.random() * 1.4; const k = Math.sqrt(1 - u * u); spV[i * 3] = Math.cos(a) * k * sp; spV[i * 3 + 1] = u * sp + 0.4; spV[i * 3 + 2] = Math.sin(a) * k * sp; spL[i] = 0.25 + Math.random() * 0.35; }
function updateSparks(dt) {
  for (let i = 0; i < SPARK_N; i++) { if (spL[i] <= 0) { spC[i * 3] = spC[i * 3 + 1] = spC[i * 3 + 2] = 0; continue; } spL[i] -= dt; spV[i * 3 + 1] -= 2.2 * dt; spP[i * 3] += spV[i * 3] * dt; spP[i * 3 + 1] += spV[i * 3 + 1] * dt; spP[i * 3 + 2] += spV[i * 3 + 2] * dt; const k = clamp(spL[i] * 3, 0, 1); spC[i * 3] = 1 * k; spC[i * 3 + 1] = 0.8 * k; spC[i * 3 + 2] = 0.45 * k; }
  sparkGeo.attributes.position.needsUpdate = true; sparkGeo.attributes.color.needsUpdate = true;
}
const smokes = [];
const smokeMat = new THREE.SpriteMaterial({ map: TEX.soft, color: 0xb8aea8, transparent: true, depthWrite: false, opacity: 0 });
function smokeAt(p) { for (let i = 0; i < 7; i++) { const s = new THREE.Sprite(smokeMat.clone()); s.position.copy(p); s.scale.setScalar(0.04); scene.add(s); smokes.push({ s, t: -i * 0.12, seed: Math.random() * 10, life: 2.4 + Math.random() }); } }
function updateSmoke(dt) {
  for (let i = smokes.length - 1; i >= 0; i--) {
    const m = smokes[i]; m.t += dt; if (m.t < 0) continue; const k = m.t / m.life;
    m.s.position.y += dt * (0.22 + k * 0.1); m.s.position.x += Math.sin(m.t * 2.2 + m.seed) * dt * 0.05; m.s.position.z += Math.cos(m.t * 1.7 + m.seed) * dt * 0.04;
    m.s.scale.setScalar(0.04 + k * 0.42); m.s.material.opacity = Math.sin(Math.min(1, k) * Math.PI) * 0.32 * (1 - k * 0.4); m.s.material.rotation += dt * 0.3;
    if (k >= 1) { scene.remove(m.s); m.s.material.dispose(); smokes.splice(i, 1); }
  }
}
const CONF_N = 320;
const confetti = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.055, 0.032), M('MeshStandardMaterial', { side: THREE.DoubleSide, roughness: 0.5, metalness: 0.15 }), CONF_N);
confetti.count = 0; confetti.frustumCulled = false; confetti.castShadow = true; scene.add(confetti);
const CONF_COL = ['#f4b6c1', '#f6d585', '#b8d9c4', '#cbb9ee', '#ffffff', '#e9849f', '#d9b25a'];
const conf = []; for (let i = 0; i < CONF_N; i++) { conf.push({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3(), rest: false }); confetti.setColorAt(i, _c.set(CONF_COL[i % CONF_COL.length])); }
let confOn = false;
function confettiBurst() {
  const top = S.tiers.length * TIER_H + 0.4; confOn = true; confetti.count = CONF_N;
  conf.forEach(c => { const a = Math.random() * 6.28, sp = 1.2 + Math.random() * 2.6; c.p.set(Math.cos(a) * 0.2, top, Math.sin(a) * 0.2); c.v.set(Math.cos(a) * sp * 0.55, 3 + Math.random() * 3, Math.sin(a) * sp * 0.55); c.r.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); c.w.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14); c.rest = false; });
}
function updateConfetti(dt) {
  if (!confOn) return; let moving = 0;
  conf.forEach((c, i) => {
    if (!c.rest) {
      moving++; c.v.y -= 5.5 * dt; c.v.multiplyScalar(1 - 1.8 * dt); c.v.y = Math.max(c.v.y, -1.1);
      c.v.x += Math.sin(c.r.x * 2) * dt * 0.8; c.p.addScaledVector(c.v, dt); c.r.x += c.w.x * dt; c.r.y += c.w.y * dt; c.r.z += c.w.z * dt;
      const rr = Math.hypot(c.p.x, c.p.z); let floor = -0.995; if (rr < 1.56) floor = 0.004; if (rr < tierR(0) + 0.02 && S.tiers.length) floor = S.tiers.length * TIER_H + 0.02;
      for (let t = S.tiers.length - 1; t >= 0; t--) { if (rr < tierR(t)) { floor = (t + 1) * TIER_H + 0.02; break; } }
      if (c.p.y < floor) { c.p.y = floor; c.rest = true; c.r.x = -Math.PI / 2 + (Math.random() - 0.5) * 0.3; c.r.y = 0; }
    }
    _q.setFromEuler(c.r); _s.setScalar(1); confetti.setMatrixAt(i, _m.compose(c.p, _q, _s));
  });
  confetti.instanceMatrix.needsUpdate = true; if (!moving) confOn = false;
}

/* ---------------- 3D match ---------------- */
const match3 = new THREE.Group(); match3.visible = false; scene.add(match3);
(() => {
  const dir = new THREE.Vector3(0.18, -0.72, 0.67).normalize();
  const stick = mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.36, 6), M('MeshStandardMaterial', { color: '#e3c592', roughness: 0.8 }));
  stick.quaternion.setFromUnitVectors(UP, dir); stick.position.copy(dir.clone().multiplyScalar(0.19));
  const head = mesh(new THREE.SphereGeometry(0.016, 14, 10).scale(1, 1.3, 1), M('MeshStandardMaterial', { color: '#a81e2a', roughness: 0.55 }));
  head.quaternion.copy(stick.quaternion);
  const fl = makeFlame(0.85); fl.position.set(0, 0.008, 0); fl.visible = true; flames.add(fl); fl.userData.alive = 1;
  match3.add(stick, head, fl); match3.userData.flame = fl;
})();
const matchTarget = new THREE.Vector3();

/* =====================================================================
   AMBIENCE (day ↔ candlelight)
   ===================================================================== */
const AMB = { night: 0, candle: 0 };
function applyAmb() {
  const n = AMB.night; hemi.intensity = lerp(LIGHT.hemi, 0.012, n); key.intensity = lerp(LIGHT.key, 0, n); rim.intensity = lerp(LIGHT.rim, 0.06, n); rim2.intensity = lerp(LIGHT.rim2, 0, n);
  setEnv(lerp(LIGHT.env, 0.025, n)); renderer.toneMappingExposure = lerp(LIGHT.exp, 1.15, n);
}
let nightOn = false;
function setNight(on, dur = 1.8) {
  if (nightOn === on) return; nightOn = on;
  gsap.to(AMB, { night: on ? 1 : 0, duration: dur, ease: 'sine.inOut', onUpdate: applyAmb });
  $('#bgNight').style.transition = `opacity ${dur}s cubic-bezier(.22,1,.36,1)`; $('#bgNight').style.opacity = on ? 1 : 0;
  $('#hint').classList.toggle('night', on); $('#top').style.color = on ? '#f6dcc0' : '';
}

/* =====================================================================
   CAMERA FRAMING
   ===================================================================== */
const VIEW = { shift: 0 };
function frameFor(ch) {
  const n = Math.max(1, S.tiers.length), H = n * TIER_H, asp = innerWidth / innerHeight;
  const k = Math.max(1, 1.45 / asp) * (innerWidth < 700 ? 1.15 : 1);
  const F = {
    intro: { r: 11.6, phi: 1.12, ty: 0.32 },
    bake: { r: 7.2 + n * 0.45, phi: 1.13, ty: H * 0.5 - 0.15 },
    decorate: { r: 6.2 + n * 0.4, phi: 1.02, ty: H * 0.55 },
    candles: { r: 6.0 + n * 0.4, phi: 0.88, ty: H * 0.8 },
    light: { r: 5.8 + n * 0.4, phi: 1.02, ty: H * 0.85 + 0.1 },
    finale: { r: 6.4 + n * 0.45, phi: 1.08, ty: H * 0.55 },
  }[ch] || { r: 7, phi: 1.1, ty: H * 0.5 };
  return { ...F, r: F.r * k, front: ch === 'candles' || ch === 'light' || ch === 'finale' };
}
let camTween = null;
function frameCamera(ch, dur = 1.5) {
  const F = frameFor(ch); const off = camera.position.clone().sub(controls.target); const sph = new THREE.Spherical().setFromVector3(off);
  let th = sph.theta; let tTh = th; if (F.front) { tTh = th - Math.atan2(Math.sin(th), Math.cos(th)); }
  const o = { r: sph.radius, phi: sph.phi, th, ty: controls.target.y };
  camTween && camTween.kill(); controls.enabled = false;
  camTween = gsap.to(o, {
    r: F.r, phi: F.phi, th: tTh, ty: F.ty, duration: dur, ease: 'power3.inOut',
    onUpdate: () => { controls.target.set(0, o.ty, 0); camera.position.setFromSpherical(new THREE.Spherical(o.r, o.phi, o.th)).add(controls.target); camera.lookAt(controls.target); },
    onComplete: () => { controls.enabled = !SPECTATOR || !follow; camTween = null; },
  });
}
function setShift(px) { gsap.to(VIEW, { shift: px, duration: 0.9, ease: 'power3.inOut', onUpdate: applyView }); }
function applyView() { const w = innerWidth, h = innerHeight; camera.aspect = w / h; if (VIEW.shift) camera.setViewOffset(w, h, 0, VIEW.shift, w, h); else camera.clearViewOffset(); camera.updateProjectionMatrix(); }

/* =====================================================================
   PICKING
   ===================================================================== */
const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
function setRay(x, y) { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); }
function decorHit(x, y) {
  setRay(x, y); const hits = ray.intersectObjects([...rayTargets, standMesh], false);
  for (const h of hits) {
    if (!h.object.visible) continue; // Raycaster does not skip invisible meshes
    const n = h.face.normal.clone().transformDirection(h.object.matrixWorld);
    if (h.object.userData.w === -1) { const T = h.object.userData.tier; const lp = T.group.worldToLocal(h.point.clone()); return { point: h.point, n, obj: h.object, t: T.i, w: Math.abs(Math.atan2(lp.x, lp.z)) < WL / 2 ? 1 : 0 }; }
    if (h.object === standMesh) { const rr = Math.hypot(h.point.x, h.point.z); if (n.y < 0.7 || rr > 1.55 || rr < (S.tiers.length ? tierR(0) - 0.02 : 0)) return null; }
    return { point: h.point, n, obj: h.object, t: h.object.userData.t, w: h.object.userData.w };
  }
  return null;
}
function hitToLocal(h) {
  const parent = parentFor(h.t, h.w); if (!parent) return null;
  const lp = parent.worldToLocal(h.point.clone()); const wq = new THREE.Quaternion(); parent.getWorldQuaternion(wq); const ln = h.n.clone().applyQuaternion(wq.invert());
  return { t: h.t, w: h.w, p: [r3(lp.x), r3(lp.y), r3(lp.z)], n: [r3(ln.x), r3(ln.y), r3(ln.z)] };
}

/* =====================================================================
   ACTIONS (player)
   ===================================================================== */
function act(key, text, merge) {
  const now = Date.now(), L = S.log, last = L[L.length - 1];
  if (merge && last && last[1] === key && now - last[0] < 12000) { last[3]++; last[0] = now; last[2] = merge(last[3]); }
  else L.push([now, key, text, 1]);
  if (L.length > 80) L.splice(0, L.length - 80);
}
function reconcile(animate = true) { syncTiers(animate); syncTops(animate); syncPipes(animate); syncCandles(animate); }
function commit() { reconcile(); Sync.state(); save(); }
function syncTiers(animate) {
  const n = S.tiers.length;
  while (tiers.length > n) { const T = tiers.pop(); T.dispose(animate); }
  while (tiers.length < n) { const T = new Tier(tiers.length); tiers.push(T); T.apply(S.tiers[T.i], true); T.setSlice(S.slice, true); if (animate) T.drop(); }
  tiers.forEach((T, i) => { T.apply(S.tiers[i]); T.setSlice(S.slice); });
}
function addTier() {
  if (S.tiers.length >= 4) return;
  const n = S.tiers.length; const nr = tierR(n);
  const fr = ['ivory', 'rose', 'pistachio', 'espresso'][n % 4], sp = ['vanilla', 'cocoa', 'matcha', 'vanilla'][n % 4];
  S.tops = S.tops.filter(t => !(t.t === n - 1 && t.p[1] > TIER_H - 0.03 && Math.hypot(t.p[0], t.p[2]) < nr + 0.06));
  let removed = false; S.pipes.forEach(st => { const before = st.pts.length; st.pts = st.pts.filter(p => !(p[0] === n - 1 && p[3] > TIER_H - 0.03 && Math.hypot(p[2], p[4]) < nr + 0.05)); if (st.pts.length !== before) removed = true; });
  if (removed) { S.pipes = S.pipes.filter(s => s.pts.length); S.pv++; }
  S.tiers.push({ sp, fr, dr: 'none' }); S.sel = n;
  act('tier', `Added a ${TIER_IN[n]}″ tier`); commit(); renderDock(false); updateNext(); frameCamera(S.chapter, 1.2);
}
function removeTier() {
  if (S.tiers.length <= 1) return; const n = S.tiers.length - 1;
  S.tiers.pop(); S.tops = S.tops.filter(t => t.t < n);
  const before = S.pipes.reduce((a, s) => a + s.pts.length, 0); S.pipes.forEach(st => st.pts = st.pts.filter(p => p[0] < n)); S.pipes = S.pipes.filter(s => s.pts.length);
  if (S.pipes.reduce((a, s) => a + s.pts.length, 0) !== before) S.pv++;
  S.sel = Math.min(S.sel, n - 1); Sound.pop(); act('tier', `Removed the top tier`); commit(); renderDock(false); frameCamera(S.chapter, 1.2);
}
function setTierProp(prop, v) {
  const T = S.tiers[S.sel]; if (!T || T[prop] === v) return; T[prop] = v; Sound.tick();
  const label = prop === 'sp' ? SPONGE[v].n + ' sponge' : prop === 'fr' ? FROST[v].n + ' buttercream' : (v === 'none' ? 'no drip' : DRIP[v].n.toLowerCase() + ' drip');
  act('prop' + prop + S.sel, `${TIER_IN[S.sel]}″ tier: ${label}`, () => `${TIER_IN[S.sel]}″ tier: ${label}`);
  commit(); renderDock(false); pulseTier(S.sel);
}
function pulseTier(i) { const T = tiers[i]; if (!T) return; gsap.fromTo(T.group.scale, { y: 1.04, x: 0.985, z: 0.985 }, { y: 1, x: 1, z: 1, duration: 0.7, ease: 'elastic.out(1,0.4)' }); }
function toggleSlice() { S.slice = !S.slice; Sound.tick(); act('slice', S.slice ? 'Cut a slice to peek inside' : 'Put the slice back'); commit(); renderDock(false); if (S.slice) setTimeout(() => Sound.thud(true), 120); }

let pendingTop = null;
function placeTop(h) {
  const L = hitToLocal(h); if (!L) return null;
  const k = UI.tool; const t = { id: uid(), k, ...L, r: r3(k === 'topper' ? Math.atan2(camera.position.x, camera.position.z) : Math.random() * 6.28), v: (S.tops.length * 7 + Math.floor(Math.random() * 4)) % 4 };
  S.tops.push(t); UI.undo.push({ type: 'top', id: t.id }); Sound.pop();
  const T = TOPS[k]; act('top' + k, `Placed ${T.a || 'a ' + T.n.toLowerCase()}`, c => `Placed ${c} ${T.pl}`);
  reconcile(); Sync.state(); return t;
}
function moveTop(t, h) { const L = hitToLocal(h); if (!L) return; Object.assign(t, L); syncTops(); Sync.state(); }

let stroke = null, lastPipe = null, lastScreen = null;
function pipeAt(h) {
  const L = hitToLocal(h); if (!L) return;
  const total = S.pipes.reduce((a, s) => a + s.pts.length, 0); if (total >= 1800) { if (!stroke.full) { toast('That’s a lot of buttercream. Piping bag is empty.'); stroke.full = true; } return; }
  stroke.pts.push([L.t, L.w, ...L.p, ...L.n, r3(Math.random() * 6.28), r3(0.85 + Math.random() * 0.3)]);
  lastPipe = h.point.clone();
}
function startPipe(h, x, y) { const c = Number(UI.tool.slice(4)); stroke = { id: uid(), c, pts: [] }; S.pipes.push(stroke); UI.undo.push({ type: 'pipe', id: stroke.id }); pipeAt(h); lastScreen = [x, y]; syncPipes(); Sound.squish(true); }
function continuePipe(x, y) {
  const [lx, ly] = lastScreen; const d = Math.hypot(x - lx, y - ly); const steps = Math.max(1, Math.ceil(d / 5));
  for (let i = 1; i <= steps; i++) { const sx = lerp(lx, x, i / steps), sy = lerp(ly, y, i / steps); const h = decorHit(sx, sy); if (!h) continue; if (!lastPipe || h.point.distanceTo(lastPipe) > 0.03) pipeAt(h); }
  lastScreen = [x, y]; syncPipes(); Sync.state(); Sound.squish(true);
}
function endPipe() {
  Sound.squish(false); if (!stroke) return;
  if (!stroke.pts.length) { S.pipes = S.pipes.filter(s => s !== stroke); UI.undo.pop(); }
  else { const n = stroke.pts.length; act('pipe', `Piped ${n} rosettes in ${PIPE[stroke.c].n.toLowerCase()}`, () => `Piping buttercream (${S.pipes.reduce((a, s) => a + s.pts.length, 0)} rosettes so far)`); }
  stroke = null; lastPipe = null; commit();
}
function undo() {
  const u = UI.undo.pop(); if (!u) return; Sound.tick();
  if (u.type === 'top') S.tops = S.tops.filter(t => t.id !== u.id);
  else if (u.type === 'pipe') { S.pipes = S.pipes.filter(s => s.id !== u.id); S.pv++; }
  else if (u.type === 'candle') S.candles = S.candles.filter(c => c.id !== u.id);
  act('undo', 'Undid the last thing', c => `Undid ${c} things`); commit(); renderDock(false); updateNext();
}
function addCandle(k, d) {
  if (S.candles.length >= 12) { toast('That’s a lot of candles. Twelve is the limit.'); return; }
  if (k === 'd' && S.candles.filter(c => c.k === 'd').length >= 4) { toast('Four digits max on one cake.'); return; }
  const c = { id: uid(), k, d }; S.candles.push(c); UI.undo.push({ type: 'candle', id: c.id });
  const digits = S.candles.filter(c => c.k === 'd').map(c => c.d).join('');
  if (k === 'd') act('digits', `Number candles: "${digits}"`, () => `Number candles: "${digits}"`);
  else act('cand' + k, k === 't' ? 'Added a taper candle' : 'Added a sparkler', n => k === 't' ? `Added ${n} taper candles` : `Added ${n} sparklers`);
  commit(); updateNext(); renderDock(false);
  if (k === 'd' && digits === String(CONFIG.age)) setTimeout(() => toast(`${CONFIG.age} looks good on you.`), 500);
}

/* =====================================================================
   LIGHT & BLOW
   ===================================================================== */
const matchState = { lit: false, dragging: false, done: false };
let wishReady = false;
function wickWorld(o) { o.group.updateMatrixWorld(); return o.group.localToWorld(o.wick.clone()); }
function maxWickY() { let y = candleRoot.position.y + 0.3; for (const o of candleObjs.values()) y = Math.max(y, wickWorld(o).y); return y; }
function moveMatchTo(x, y) {
  setRay(x, y - 70); const plane = new THREE.Plane(UP, -(maxWickY() + 0.012)); const p = new THREE.Vector3();
  if (ray.ray.intersectPlane(plane, p)) { const lim = 2.2; p.x = clamp(p.x, -lim, lim); p.z = clamp(p.z, -lim, lim); matchTarget.copy(p); if (!match3.visible) { match3.visible = true; match3.position.copy(p); match3.scale.setScalar(0.01); gsap.to(match3.scale, { x: 1, y: 1, z: 1, duration: 0.4, ease: 'back.out(2)' }); } }
}
const _lastMatch = new THREE.Vector3(); let _hasLastMatch = false;
// distance in xz from point p to segment a→b (so a quick swipe across a wick still lights it)
function segDistXZ(p, a, b) { const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz; let t = L2 ? ((p.x - a.x) * dx + (p.z - a.z) * dz) / L2 : 0; t = clamp(t, 0, 1); return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t)); }
// Ignition is judged in SCREEN space: if the flame looks like it touches the wick, it lights.
// (The match floats at the tallest wick's height, so a pure 3D xz test misses shorter candles through parallax.)
const _sp = new THREE.Vector3();
function toScreen(v) { _sp.copy(v).project(camera); return { x: (_sp.x * 0.5 + 0.5) * innerWidth, z: (1 - (_sp.y * 0.5 + 0.5)) * innerHeight }; }
let _lastMatchS = null;
function checkIgnite() {
  if (!matchState.lit || !match3.visible) { _hasLastMatch = false; _lastMatchS = null; return; }
  const a = _hasLastMatch ? _lastMatch : match3.position; const b = match3.position;
  const flameS = toScreen(_v.copy(match3.position).add(_n.set(0, 0.03, 0))); const lastS = _lastMatchS || flameS;
  const tol = clamp(Math.min(innerWidth, innerHeight) * 0.035, 18, 34);
  for (const o of candleObjs.values()) {
    if (o.lit) continue; const w = wickWorld(o); const ws = toScreen(w);
    if (segDistXZ(ws, lastS, flameS) < tol || segDistXZ(w, a, b) < 0.1) {
      if (!S.lit.includes(o.id)) S.lit.push(o.id);
      if (S.lit.length === 1) setNight(true);
      act('light', 'Lit a candle', c => `Lit ${c} candle${c > 1 ? 's' : ''}`);
      commit();
      if (S.lit.length === S.candles.length) allLit();
    }
  }
  _lastMatch.copy(match3.position); _hasLastMatch = true; _lastMatchS = flameS;
}
function allLit() {
  matchState.done = true; matchState.lit = false; setHint('');
  gsap.to(match3.userData.flame.userData, { alive: 0, duration: 0.3, delay: 0.5 });
  gsap.to(match3.position, { y: '+=0.4', x: '+=0.6', duration: 0.9, delay: 0.7, ease: 'power2.in' });
  gsap.to(match3.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.9, delay: 0.7, ease: 'power2.in', onComplete: () => { match3.visible = false; } });
  act('lit', 'All candles are lit');
  setTimeout(showWish, 1300);
}
function showWish() {
  if (S.chapter !== 'light') return;
  $('#wishT').innerHTML = `Make a wish, <em>${CONFIG.name}</em>.`; $('#wishP').textContent = 'Close your eyes. Take your time.';
  $('#wish').classList.add('show'); wishReady = true;
  setTimeout(() => { if (wishReady) { $('#wishP').style.opacity = 0; setTimeout(() => { $('#wishP').textContent = 'Now blow.'; $('#wishP').style.opacity = 1; }, 450); } }, 3200);
  act('wish', 'Is making a wish…'); Sync.state();
}
const Blow = { I: 0, hold: false, holdT: 0, analyser: null, stream: null, buf: null, floor: 0, cal: 0 };
function stopMic() { if (Blow.stream) Blow.stream.getTracks().forEach(t => t.stop()); Blow.stream = null; Blow.analyser = null; }
function updateBlow(dt, t) {
  let target = 0;
  if (Blow.analyser) {
    Blow.analyser.getFloatTimeDomainData(Blow.buf); let s = 0; for (let i = 0; i < Blow.buf.length; i++) s += Blow.buf[i] * Blow.buf[i]; const rms = Math.sqrt(s / Blow.buf.length);
    if (Blow.cal < 25) { Blow.floor = (Blow.floor * Blow.cal + rms) / (Blow.cal + 1); Blow.cal++; }
    else target = clamp((rms - Blow.floor * 2 - 0.012) / 0.09, 0, 1);
  }
  if (Blow.hold) { Blow.holdT += dt; target = Math.max(target, Math.min(0.95, 0.35 + Blow.holdT * 0.9) * (0.88 + 0.12 * Math.sin(t * 31))); }
  Blow.I = lerp(Blow.I, target, 1 - Math.exp(-dt * (target > Blow.I ? 12 : 4)));
  $('#meter').style.width = (Blow.I * 100).toFixed(0) + '%'; $('#holdBtn .fill').style.width = (Blow.I * 100).toFixed(0) + '%';
  if (!wishReady) return;
  if (Blow.I > 0.3) for (const o of candleObjs.values()) {
    if (!o.lit) continue; o.health -= dt * (Blow.I - 0.2) * 1.7 / o.res;
    if (o.health <= 0) { S.lit = S.lit.filter(id => id !== o.id); act('blow', 'Blowing out the candles', () => 'Blowing out the candles'); commit(); if (!S.lit.length) { celebrate(); break; } }
  }
}

/* =====================================================================
   FINALE
   ===================================================================== */
let captureCb = null;
async function celebrate() {
  wishReady = false; Blow.hold = false; stopMic(); S.out = true; act('out', 'Blew out every candle 🎂'); commit();
  $('#wish').classList.remove('show');
  await wait(1000); setNight(false, 2.4); Sound.chord(); confettiBurst();
  await wait(1500); frameCamera('finale', 1.8); setShift(0);
  await wait(2300);
  captureCb = data => {
    Sound.shutter(); gsap.fromTo('#flash', { opacity: 0.95 }, { opacity: 0, duration: 0.9, ease: 'power2.out' });
    setTimeout(() => showFinale(data), 650);
  };
}
function capture() {
  const c = renderer.domElement, W = c.width, H = c.height;
  const ctr = new THREE.Vector3(0, S.tiers.length * TIER_H * 0.6, 0).project(camera);
  const side = Math.min(W, H) * 0.8; let cx = (ctr.x * 0.5 + 0.5) * W, cy = (1 - (ctr.y * 0.5 + 0.5)) * H;
  let sx = clamp(cx - side / 2, 0, W - side), sy = clamp(cy - side / 2, 0, H - side);
  const out = document.createElement('canvas'); out.width = out.height = 900; const g = out.getContext('2d');
  const gr = g.createRadialGradient(450, 380, 40, 450, 450, 700); gr.addColorStop(0, '#3a2a27'); gr.addColorStop(0.5, '#241918'); gr.addColorStop(1, '#110b0c');
  g.fillStyle = gr; g.fillRect(0, 0, 900, 900); g.drawImage(c, sx, sy, side, side, 0, 0, 900, 900);
  return out.toDataURL('image/jpeg', 0.9);
}
function fmtDate() { return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function receiptHTML() {
  const now = new Date(); const time = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const row = (a, b) => `<div class="row"><span>${a}</span><i></i><span>${b}</span></div>`;
  let h = `<div class="sub">Patisserie</div><h3>Noush &amp; Co.</h3><div class="sub">Made to order · Est. ${now.getFullYear() - CONFIG.age}</div><hr>`;
  h += row(fmtDate(), time) + row('Order', '#' + String(CONFIG.age).padStart(4, '0')) + row('Baker', CONFIG.name) + '<hr>';
  h += `<div>CAKE · ${S.tiers.length} TIER${S.tiers.length > 1 ? 'S' : ''}</div>`;
  S.tiers.forEach((t, i) => { h += row(`${TIER_IN[i]}″ ${SPONGE[t.sp].short || SPONGE[t.sp].n}`, '1'); h += `<div class="indent">${FROST[t.fr].n}${t.dr !== 'none' ? ' · ' + DRIP[t.dr].n.toLowerCase() + ' drip' : ''}</div>`; });
  const counts = {}; S.tops.forEach(t => counts[t.k] = (counts[t.k] || 0) + 1);
  const rose = S.pipes.reduce((a, s) => a + s.pts.length, 0);
  if (Object.keys(counts).length || rose) { h += '<hr>'; for (const k in counts) h += row(TOPS[k].n, '×' + counts[k]); if (rose) h += row('Piped rosettes', '×' + rose); }
  const dg = S.candles.filter(c => c.k === 'd').map(c => c.d).join(''), tp = S.candles.filter(c => c.k === 't').length, spk = S.candles.filter(c => c.k === 's').length;
  h += '<hr>'; if (dg) h += row('Number candles', `"${dg}"`); if (tp) h += row('Tapers', '×' + tp); if (spk) h += row('Sparklers', '×' + spk);
  h += row('Wishes made', '1') + `<div class="indent">contents classified</div>`;
  h += '<hr>' + row('Subtotal', '$0.00') + row('Labor', 'by the birthday girl') + '<hr>';
  h += `<div class="due"><small>Amount due</small><b>1 big fat kiss</b><em>on the lips</em></div>`;
  h += `<button class="paybtn" id="pay">Pay with a kiss 💋</button><div class="paid-line" id="paidLine">PAID IN FULL · ${fmtDate().toUpperCase()}</div>`;
  h += `<div class="barcode"></div><div class="tiny">Payment accepted in person only</div><div class="tiny">No refunds · kisses non-transferable</div><div class="tiny" style="margin-top:6px">Thank you for being born ♡</div>`;
  return h;
}
let photoData = null;
function showFinale(data) {
  photoData = data || photoData; S.chapter = 'finale'; act('finale', 'Got her Polaroid and receipt'); commit(); updateSteps();
  $('#foot').classList.add('away'); setHint(''); $('#reopen').classList.remove('show');
  const fin = $('#finale'); fin.classList.add('show');
  const img = $('#photo'); img.classList.remove('dev'); img.src = photoData; $('#cap').textContent = `${CONFIG.name}, ${CONFIG.age} · ${fmtDate()}`;
  $('#paper').innerHTML = receiptHTML(); $('#pay').addEventListener('click', payKiss);
  if (S.paid) markPaid(false);
  requestAnimationFrame(() => {
    $('#polaroid').classList.add('in'); setTimeout(() => img.classList.add('dev'), 1100);
    setTimeout(() => { $('#receipt').classList.add('in'); Sound.paper(); gsap.fromTo('#paper', { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 2.2, ease: 'steps(18)' }); }, 700);
    setTimeout(() => Sound.musicBox(), 1500);
  });
  controls.autoRotate = true; controls.autoRotateSpeed = 0.35;
}
function payKiss() {
  Sound.kiss(); markPaid(true); S.paid = true; act('paid', 'Paid with a kiss 💋 Go collect it.'); commit();
  const hearts = $('#hearts'); for (let i = 0; i < 16; i++) { const e = document.createElement('i'); e.textContent = '♥'; e.style.left = (30 + Math.random() * 40) + '%'; e.style.setProperty('--dx', (Math.random() * 240 - 120) + 'px'); e.style.setProperty('--r', (Math.random() * 90 - 45) + 'deg'); e.style.animationDelay = (Math.random() * 0.6) + 's'; e.style.fontSize = (16 + Math.random() * 22) + 'px'; hearts.appendChild(e); setTimeout(() => e.remove(), 4200); }
  setTimeout(() => $('#envelope').classList.add('in'), 1400);
}
function markPaid(anim) {
  $('#kiss').classList.add('on'); $('#stampPaid').classList.add('on'); const p = $('#pay'); if (p) p.style.display = 'none'; $('#paidLine').style.display = 'block';
  if (!anim) $('#envelope').classList.add('in');
}
function openLetter() {
  Sound.tick(); act('letter', 'Is reading your note'); Sync.state();
  const note = $('#note');
  note.innerHTML = `<div class="to">${CONFIG.name},</div>` + CONFIG.letter.map(p => `<p>${p}</p>`).join('') + `<div class="sig">${CONFIG.from ? '— ' + CONFIG.from : '— Yours, always'}</div><div class="close"><button class="pill" id="closeLetter">Back to my cake</button></div>`;
  note.querySelector('.sig').style.opacity = 0;
  $('#letter').classList.add('show'); requestAnimationFrame(() => note.classList.add('in'));
  const ps = [...note.querySelectorAll('p')]; ps.forEach((p, i) => setTimeout(() => p.classList.add('on'), 700 + i * 1300));
  setTimeout(() => gsap.to(note.querySelector('.sig'), { opacity: 1, duration: 1.2 }), 700 + ps.length * 1300);
  $('#closeLetter').addEventListener('click', () => { note.classList.remove('in'); setTimeout(() => $('#letter').classList.remove('show'), 500); });
}

/* =====================================================================
   UI: steps, dock, hints, toast
   ===================================================================== */
const HINTS = {
  bake: 'Tap a tier to choose it, then pick its sponge, frosting and drip.',
  decorate: 'Tap the cake to place, or drag to pipe. Drag the empty space to turn it.',
  candles: 'Spell out your age. Tapers and sparklers are welcome too.',
  light: '',
};
let hintT;
function setHint(t) { const h = $('#hint'); clearTimeout(hintT); h.style.opacity = 0; hintT = setTimeout(() => { h.textContent = t; h.style.opacity = t ? 1 : 0; }, 250); }
let toastT; function toast(t) { const e = $('#toast'); e.textContent = t; e.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => e.classList.remove('show'), 2600); }
function updateSteps() {
  const idx = CHAPTERS.indexOf(S.chapter); const fin = S.chapter === 'finale';
  document.querySelectorAll('#steps li').forEach((li, i) => { li.classList.toggle('on', i === idx); li.classList.toggle('done', fin || (idx > -1 && i < idx)); });
  $('#top').style.opacity = S.chapter === 'intro' && !SPECTATOR ? 0 : 1;
}
const NEXT = { bake: 'Decorate', decorate: 'Candles', candles: 'Light them' };
function updateNext() {
  const ch = S.chapter; $('#next').classList.toggle('hide', !NEXT[ch]); $('#nextLbl').textContent = NEXT[ch] || '';
  $('#back').classList.toggle('hide', ch === 'bake' || !NEXT[ch]);
  $('#next').disabled = ch === 'candles' && !S.candles.length;
}
const tab = (id, label, cur, cls = '') => `<button class="tab ${cls} ${cur === id ? 'on' : ''}" data-act="tab" data-v="${id}">${label}</button>`;
const swatch = (act, v, name, color, on, cls = '') => `<button class="sw-btn ${on ? 'on' : ''}" data-act="${act}" data-v="${v}"><span class="chip ${cls}" style="background-color:${color}"></span><span>${name}</span></button>`;
const THUMB = {};
const toolBtn = (v, name, on) => `<button class="tool ${on ? 'on' : ''}" data-act="tool" data-v="${v}">${THUMB[v] ? `<img src="${THUMB[v]}" alt="">` : '<span class="ph"></span>'}<span>${name}</span></button>`;
function tierSeg() { return `<div class="seg">${S.tiers.map((t, i) => i).reverse().map(i => `<button class="${S.sel === i ? 'on' : ''}" data-act="sel" data-v="${i}">${TIER_IN[i]}″${i === S.tiers.length - 1 && S.tiers.length > 1 ? ' top' : ''}</button>`).join('')}</div><span class="vr"></span>`; }
function renderDock(anim = true) {
  const ch = S.chapter; let T = '', P = '';
  if (ch === 'bake') {
    T = tab('tiers', 'Tiers', UI.bakeTab) + tab('sponge', 'Sponge', UI.bakeTab) + tab('frost', 'Frosting', UI.bakeTab) + tab('drip', 'Drip', UI.bakeTab) + `<span class="sp"></span><button class="toggle ${S.slice ? 'on' : ''}" data-act="slice">Cut a slice<span class="sw"></span></button>`;
    const cur = S.tiers[S.sel] || {};
    if (UI.bakeTab === 'tiers') {
      const n = S.tiers.length;
      P = `<div class="stack-ico">${S.tiers.map((t, i) => `<i style="width:${20 + (3 - i) * 13}px;background:${FROST[t.fr].c};box-shadow:inset 0 -2px 0 rgba(0,0,0,.15)"></i>`).join('')}</div>
        <div class="stepper"><button class="round" data-act="tier-rem" aria-label="Remove a tier" ${n <= 1 ? 'disabled' : ''}>−</button>
        <div class="val"><b>${['One tier', 'Two tiers', 'Three tiers', 'Four tiers'][n - 1]}</b><small>${S.tiers.map((t, i) => TIER_IN[i] + '″').join(' · ')}</small></div>
        <button class="round" data-act="tier-add" aria-label="Add a tier" ${n >= 4 ? 'disabled' : ''}>+</button></div><span class="vr"></span><div class="aside">Up to four. Each one gets its own sponge, frosting and drip.</div>`;
    } else if (UI.bakeTab === 'sponge') {
      P = tierSeg() + Object.entries(SPONGE).filter(([k, v]) => !v.secret || UI.secretSponge).map(([k, v]) => swatch('sp', k, v.short || v.n.replace('Madagascar ', '').replace('Dark Valrhona ', 'Valrhona ').replace(' Green Tea', ''), v.c, cur.sp === k, 'crumb')).join('')
        + (UI.secretSponge ? '' : `<button class="sw-btn" data-act="secret-sponge"><span class="chip lock">✦</span><span>Secret menu</span></button>`);
    } else if (UI.bakeTab === 'frost') {
      P = tierSeg() + Object.entries(FROST).map(([k, v]) => swatch('fr', k, v.n.split(' ')[1], v.c, cur.fr === k)).join('');
    } else {
      P = tierSeg() + Object.entries(DRIP).map(([k, v]) => swatch('dr', k, v.n, v.c || '#fff', cur.dr === k, k === 'none' ? 'none' : '')).join('');
    }
  } else if (ch === 'decorate') {
    T = tab('fruit', 'Fruit', UI.decoTab) + tab('sweets', 'Sweets', UI.decoTab) + tab('flora', 'Flowers & gold', UI.decoTab) + tab('piping', 'Piping bag', UI.decoTab) + tab('extra', 'Something extra ✦', UI.decoTab, 'secret') + `<span class="sp"></span><button class="ghost" data-act="undo" ${UI.undo.some(u => u.type !== 'candle') ? '' : 'disabled'}>Undo</button>`;
    if (SHELF[UI.decoTab] && UI.decoTab !== 'extra') P = SHELF[UI.decoTab].map(k => toolBtn(k, TOPS[k].n, UI.tool === k)).join('');
    else if (UI.decoTab === 'piping') P = PIPE.map((p, i) => toolBtn('pipe' + i, p.n, UI.tool === 'pipe' + i)).join('') + `<span class="vr"></span><div class="aside">Draw along the cake with a finger to pipe.</div>`;
    else P = SHELF.extra.map(k => toolBtn(k, TOPS[k].n, UI.tool === k)).join('');
  } else if (ch === 'candles') {
    T = `<span class="tab on" style="cursor:default">Candles</span><span class="sp"></span><button class="ghost" data-act="undo" ${UI.undo.length && UI.undo[UI.undo.length - 1].type === 'candle' ? '' : 'disabled'}>Undo</button>`;
    P = `<div class="digits">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<button class="digit" data-act="digit" data-v="${d}">${d}</button>`).join('')}</div><span class="vr"></span>`
      + `<button class="tool" data-act="taper">${THUMB.taper ? `<img src="${THUMB.taper}" alt="">` : '<span class="ph"></span>'}<span>Taper</span></button>`
      + `<button class="tool" data-act="spark">${THUMB.spark ? `<img src="${THUMB.spark}" alt="">` : '<span class="ph"></span>'}<span>Sparkler</span></button>`;
  }
  $('#tabs').innerHTML = T; const panel = $('#panel'); panel.innerHTML = P;
  panel.classList.remove('fade'); if (anim) { void panel.offsetWidth; panel.classList.add('fade'); }
}
$('#dock').addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el || SPECTATOR) return; const a = el.dataset.act, v = el.dataset.v; Sound.init();
  if (a === 'tab') { if (S.chapter === 'bake') UI.bakeTab = v; else { UI.decoTab = v; if (SHELF[v] && !SHELF[v].includes(UI.tool)) UI.tool = SHELF[v][0]; if (v === 'piping' && !(UI.tool || '').startsWith('pipe')) UI.tool = 'pipe0'; if (v === 'extra') { if (!UI.secretShelf) { UI.secretShelf = true; toast('You found the secret shelf.'); act('shelf', 'Found the secret shelf ✦'); Sync.state(); } } } Sound.tick(); renderDock(); }
  else if (a === 'slice') toggleSlice();
  else if (a === 'tier-add') addTier();
  else if (a === 'tier-rem') removeTier();
  else if (a === 'sel') { S.sel = Number(v); Sound.tick(); pulseTier(S.sel); renderDock(false); Sync.state(); }
  else if (a === 'sp' || a === 'fr' || a === 'dr') setTierProp(a, v);
  else if (a === 'secret-sponge') { UI.secretSponge = true; Sound.tick(); toast('Secret menu: flourless protein brownie, whey + banana.'); act('secret', 'Unlocked the secret sponge ✦'); renderDock(false); Sync.state(); }
  else if (a === 'tool') { UI.tool = UI.tool === v ? null : v; Sound.tick(); renderDock(false); }
  else if (a === 'undo') undo();
  else if (a === 'digit') addCandle('d', Number(v));
  else if (a === 'taper') addCandle('t');
  else if (a === 'spark') addCandle('s');
});
function goto(ch) {
  const prev = S.chapter; if (prev === ch) return;
  if (ch === 'candles' || ch === 'decorate' || ch === 'bake') { if (S.lit.length) { S.lit = []; } setNight(false); matchState.lit = false; matchState.done = false; match3.visible = false; $('#matchbox').classList.add('away'); $('#wish').classList.remove('show'); wishReady = false; stopMic(); }
  S.chapter = ch;
  const label = { bake: 'Baking the cake', decorate: 'Decorating', candles: 'Choosing candles', light: 'Lighting the candles' }[ch];
  if (label) act('ch', label);
  if (ch === 'decorate' && !UI.tool) { UI.tool = SHELF[UI.decoTab] ? SHELF[UI.decoTab][0] : 'strawberry'; }
  updateSteps(); updateNext(); renderDock(); setHint(HINTS[ch] || '');
  $('#foot').classList.toggle('away', ch === 'light' || ch === 'finale' || ch === 'intro');
  if (ch === 'bake' || ch === 'decorate' || ch === 'candles') setShift(Math.round(innerHeight * 0.09)); else if (ch === 'light') setShift(Math.round(innerHeight * 0.1)); else setShift(0);
  controls.autoRotate = false;
  frameCamera(ch);
  if (ch === 'light') enterLight();
  commit();
}
function enterLight() {
  S.lit = []; S.out = false; matchState.lit = false; matchState.done = false; wishReady = false; Blow.I = 0;
  candleObjs.forEach(o => o.health = 1);
  const m = $('#match'); m.classList.remove('lit'); m.style.transform = ''; m.style.opacity = 1;
  setTimeout(() => $('#matchbox').classList.remove('away'), 600);
}
$('#next').addEventListener('click', () => { Sound.init(); Sound.tick(); const i = CHAPTERS.indexOf(S.chapter); if (i > -1 && i < 3) goto(CHAPTERS[i + 1]); });
$('#back').addEventListener('click', () => { Sound.tick(); const i = CHAPTERS.indexOf(S.chapter); if (i > 0) goto(CHAPTERS[i - 1]); });
$('#steps').addEventListener('click', e => { if (SPECTATOR) return; const li = e.target.closest('li.done'); if (!li) return; const ch = li.dataset.ch; if (S.chapter === 'finale') return; goto(ch); });
const soundBtn = $('#sound');
function paintSound() { soundBtn.querySelectorAll('.w1,.w2').forEach(p => p.style.opacity = Sound.muted ? 0 : 1); soundBtn.setAttribute('aria-label', Sound.muted ? 'Sound off' : 'Sound on'); }
soundBtn.addEventListener('click', () => { Sound.init(); Sound.setMuted(!Sound.muted); paintSound(); }); paintSound();

/* ---------------- pointer input (player) ---------------- */
let drag = null, down = null; const pointers = new Set();
stageEl.addEventListener('pointerdown', e => {
  if (SPECTATOR) return; Sound.init(); pointers.add(e.pointerId);
  if (pointers.size > 1) { endDrag(); controls.enabled = true; return; }
  down = [e.clientX, e.clientY];
  if (S.chapter === 'decorate' && UI.tool) {
    const h = decorHit(e.clientX, e.clientY);
    if (h) { controls.enabled = false; if (UI.tool.startsWith('pipe')) { startPipe(h, e.clientX, e.clientY); drag = { type: 'pipe' }; } else { const t = placeTop(h); if (t) drag = { type: 'top', t }; } }
  } else if (S.chapter === 'light' && matchState.lit) { controls.enabled = false; drag = { type: 'match' }; moveMatchTo(e.clientX, e.clientY); }
}, { capture: true });
let lastPW = null;
window.addEventListener('pointermove', e => {
  if (SPECTATOR) return;
  if (matchState.dragging || (drag && drag.type === 'match')) moveMatchTo(e.clientX, e.clientY);
  if (!drag) { if (S.chapter !== 'intro' && e.target === renderer.domElement) { const h = decorHit(e.clientX, e.clientY); lastPW = h ? h.point.clone() : null; } return; }
  if (drag.type === 'pipe') continuePipe(e.clientX, e.clientY);
  else if (drag.type === 'top') { const h = decorHit(e.clientX, e.clientY); if (h) { moveTop(drag.t, h); lastPW = h.point.clone(); } }
});
function endDrag() { if (!drag) return; if (drag.type === 'pipe') endPipe(); else if (drag.type === 'top') commit(); drag = null; }
function onUp(e) {
  if (SPECTATOR) return; pointers.delete(e.pointerId); const wasDrag = !!drag; endDrag(); matchState.dragging = false;
  if (!wasDrag && down && S.chapter === 'bake' && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 8 && e.target === renderer.domElement) {
    const h = decorHit(e.clientX, e.clientY); if (h && h.t >= 0) { S.sel = h.t; if (UI.bakeTab === 'tiers') UI.bakeTab = 'sponge'; Sound.tick(); pulseTier(h.t); renderDock(); Sync.state(); }
  }
  down = null; if (!camTween) controls.enabled = !(S.chapter === 'light' && matchState.lit);
}
window.addEventListener('pointerup', onUp); window.addEventListener('pointercancel', onUp);

/* ---------------- HTML matchbox strike ---------------- */
(() => {
  const m = $('#match'), box = $('#matchbox'); let md = null; // the whole matchbox is the grab target (fingers are big)
  box.addEventListener('pointerdown', e => {
    if (matchState.lit || matchState.done) return; e.preventDefault(); e.stopPropagation(); Sound.init();
    try { box.setPointerCapture(e.pointerId); } catch (er) {}
    md = { x0: e.clientX, y0: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), rub: 0 }; m.style.cursor = 'grabbing';
  });
  box.addEventListener('pointermove', e => {
    if (!md || matchState.lit) return;
    const dx = e.clientX - md.x0, dy = e.clientY - md.y0; m.style.transform = `translate(${dx}px,${dy}px) rotate(${clamp(dx * 0.04, -10, 10)}deg)`;
    const head = m.querySelector('.head').getBoundingClientRect(), strip = $('.strip').getBoundingClientRect();
    const now = performance.now(), dist = Math.hypot(e.clientX - md.lx, e.clientY - md.ly), v = dist / Math.max(1, now - md.lt); md.lx = e.clientX; md.ly = e.clientY; md.lt = now;
    const over = head.right > strip.left && head.left < strip.right && head.bottom > strip.top - 10 && head.top < strip.bottom + 10;
    if (over) md.rub += dist * (v > 0.25 ? 1.6 : 0.5);
    if (md.rub > 90) strike(e);
  });
  const up = () => { md = null; m.style.cursor = ''; if (!matchState.lit) gsap.to(m, { x: 0, y: 0, rotate: 0, duration: 0.5, ease: 'back.out(2)', onComplete: () => { m.style.transform = ''; } }); };
  box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
  function strike(e) {
    matchState.lit = true; matchState.dragging = true; md = null; m.classList.add('lit'); Sound.strike();
    act('match', 'Struck the match 🔥'); Sync.state(); setHint('Touch the flame to each wick.');
    setTimeout(() => { $('#matchbox').classList.add('away'); m.style.opacity = 0; moveMatchTo(e.clientX, e.clientY); controls.enabled = false; }, 260);
  }
})();
let gustT = null, holdStart = 0;
$('#holdBtn').addEventListener('pointerdown', e => { e.preventDefault(); Sound.init(); clearTimeout(gustT); Blow.hold = true; Blow.holdT = 0; holdStart = performance.now(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (er) {} if (!Blow.usedHold) { Blow.usedHold = true; act('hold', 'Blowing out the candles'); Sync.state(); } });
// a quick tap still gives a short gust, so she doesn't need to know to hold
['pointerup', 'pointercancel'].forEach(ev => $('#holdBtn').addEventListener(ev, () => { if (!Blow.hold) return; const held = performance.now() - holdStart; if (held < 900) gustT = setTimeout(() => { Blow.hold = false; }, 900 - held); else Blow.hold = false; }));
$('#envelope').addEventListener('click', openLetter);
$('#seeCake').addEventListener('click', () => { Sound.tick(); $('#finale').classList.remove('show'); $('#reopen').classList.add('show'); controls.enabled = true; });
$('#openFin').addEventListener('click', () => { Sound.tick(); showFinale(); });
$('#relight').addEventListener('click', () => { Sound.tick(); $('#reopen').classList.remove('show'); S.out = false; S.chapter = 'candles'; goto('light'); });

/* =====================================================================
   SAVE / RESTORE (iPad Safari can reload heavy tabs)
   ===================================================================== */
function save() { if (SPECTATOR) return; try { localStorage.setItem('cake-state', JSON.stringify({ ...S, log: S.log.slice(-30) })); } catch (e) {} }
function loadSaved() { try { const s = JSON.parse(localStorage.getItem('cake-state') || 'null'); if (s && s.tiers && s.tiers.length && s.chapter !== 'intro') return s; } catch (e) {} return null; }

/* =====================================================================
   SYNC — hidden watch view over public MQTT brokers (no accounts)
   ===================================================================== */
const Sync = (() => {
  const clients = []; const sid = uid(); let seq = 0, lastSent = 0, timer = null, started = false;
  const base = `cake4noush/${CONFIG.room}`;
  function lib() { return new Promise((res, rej) => { if (window.mqtt) return res(window.mqtt); const s = document.createElement('script'); s.src = 'https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js'; s.onload = () => window.mqtt ? res(window.mqtt) : rej(); s.onerror = rej; document.head.appendChild(s); }); }
  function snapshot() { return { chapter: S.chapter, tiers: S.tiers, sel: S.sel, slice: S.slice, tops: S.tops, pipes: S.pipes.map(p => ({ id: p.id, c: p.c, pts: p.pts })), pv: S.pv, candles: S.candles, lit: S.lit, out: S.out, paid: S.paid, log: S.log.slice(-40) }; }
  function pub(t, obj, retain) { const msg = JSON.stringify(obj); clients.forEach(c => { if (c.connected) try { c.publish(base + '/' + t, msg, { qos: 0, retain }); } catch (e) {} }); }
  function sendState() { lastSent = Date.now(); pub('state', { sid, seq: ++seq, t: Date.now(), s: snapshot() }, true); }
  return {
    async start(onMsg) {
      if (started) return; started = true;
      let mq; try { mq = await lib(); } catch (e) { return; }
      const urls = params.get('broker') ? params.get('broker').split(',') : CONFIG.brokers;
      urls.forEach(u => {
        try {
          const c = mq.connect(u, { clientId: 'c' + uid() + uid(), clean: true, connectTimeout: 8000, reconnectPeriod: 4000, keepalive: 30 });
          c.on('connect', () => { if (onMsg) c.subscribe([base + '/state', base + '/live']); else { sendState(); } });
          if (onMsg) c.on('message', (topic, buf) => { try { onMsg(topic.endsWith('/state') ? 'state' : 'live', JSON.parse(new TextDecoder().decode(buf))); } catch (e) {} });
          c.on('error', () => {}); clients.push(c);
        } catch (e) {}
      });
    },
    state() { if (SPECTATOR) return; clearTimeout(timer); const dt = Date.now() - lastSent; if (dt > 250) sendState(); else timer = setTimeout(sendState, 250 - dt); },
    live(obj) { if (!SPECTATOR) pub('live', { sid, t: Date.now(), ...obj }, false); },
  };
})();

/* =====================================================================
   SPECTATOR
   ===================================================================== */
let follow = true; const SP = { lastT: 0, liveAt: 0, cam: null, p: null, m: null, b: 0, first: true, prevOut: false, prevPaid: false, ch: null };
function chapterVerb(ch) { return { intro: 'just opened it', bake: 'is baking', decorate: 'is decorating', candles: 'is choosing candles', light: 'is lighting the candles', finale: 'is looking at her Polaroid' }[ch] || ''; }
function onSpecMsg(kind, msg) {
  if (kind === 'state') {
    if (msg.t <= SP.lastT) return; SP.lastT = msg.t; const s = msg.s;
    const animate = !SP.first;
    Object.assign(S, s); reconcile(animate);
    if (S.lit.length && !S.out) setNight(true); else if (!S.lit.length) setNight(false);
    if (S.chapter !== SP.ch) { SP.ch = S.chapter; updateSteps(); }
    if (S.out && !SP.prevOut && animate) { confettiBurst(); Sound.chord(); banner('She made a wish 🎂', 'And blew out every candle.'); }
    if (S.paid && !SP.prevPaid && animate) { Sound.kiss(); banner('She paid with a kiss 💋', 'Go collect it.'); }
    SP.prevOut = S.out; SP.prevPaid = S.paid; SP.first = false; renderFeed(); renderLive();
  } else {
    if (msg.t < SP.liveAt) return; SP.liveAt = Date.now(); SP.cam = msg.cam; SP.p = msg.p; SP.m = msg.m; SP.b = msg.b || 0; renderLive();
  }
}
function renderFeed() {
  const ol = $('#feed'); ol.innerHTML = S.log.slice().reverse().map(([t, , text]) => `<li><time>${new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).replace(/ [AP]M/, '')}</time><span></span></li>`).join('');
  [...ol.querySelectorAll('li span')].forEach((sp, i) => sp.textContent = S.log[S.log.length - 1 - i][2]);
}
function renderLive() {
  const on = Date.now() - SP.liveAt < 9000; const el = $('#live'); el.classList.toggle('on', on);
  $('#liveT').innerHTML = on ? `Live <small>· ${CONFIG.name} ${chapterVerb(S.chapter)}</small>` : SP.lastT ? `${CONFIG.name} is away <small>· last seen ${new Date(SP.lastT).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</small>` : `Waiting for ${CONFIG.name} <small>· keep this open</small>`;
}
let bannerT; function banner(t, s) { const b = $('#banner'); b.innerHTML = `${t}<small>${s}</small>`; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); clearTimeout(bannerT); bannerT = setTimeout(() => b.classList.remove('show'), 9000); }
$('#follow').addEventListener('click', () => { follow = !follow; $('#follow').textContent = follow ? 'Following her view' : 'Free look'; controls.enabled = !follow; Sound.init(); });
if (SPECTATOR) { document.addEventListener('pointerdown', () => Sound.init(), { once: true }); setInterval(renderLive, 2000); }

/* =====================================================================
   THUMBNAILS (real 3D renders of each tool)
   ===================================================================== */
function makeThumbs() {
  let tr; try { tr = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true }); } catch (e) { return; }
  tr.setPixelRatio(1); tr.setSize(128, 128); tr.toneMapping = THREE.ACESFilmicToneMapping; tr.setClearColor(0, 0);
  const sc = new THREE.Scene(); const pm = new THREE.PMREMGenerator(tr); sc.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  sc.add(new THREE.HemisphereLight(0xffffff, 0x886655, 1.2)); const dl = new THREE.DirectionalLight(0xffffff, 2.2); dl.position.set(2, 4, 3); sc.add(dl);
  const cam = new THREE.PerspectiveCamera(28, 1, 0.01, 10);
  const shoot = (obj, name, dir = [0.9, 0.8, 1.4]) => {
    sc.add(obj); obj.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(obj); const c = box.getCenter(new THREE.Vector3()); const sz = box.getSize(new THREE.Vector3()).length();
    cam.position.copy(c).add(new THREE.Vector3(...dir).normalize().multiplyScalar(sz * 2.05)); cam.lookAt(c); tr.render(sc, cam); THUMB[name] = tr.domElement.toDataURL('image/png'); sc.remove(obj);
  };
  Object.keys(TOPS).forEach(k => shoot(makeTopping(k, k === 'macaron' ? 0 : 1), k, k === 'topper' ? [0.15, 0.25, 1.4] : k === 'vinyl' ? [0.6, 0.5, 1.4] : undefined));
  PIPE.forEach((p, i) => { const g = new THREE.Group(); for (let j = 0; j < 3; j++) { const b = new THREE.Mesh(blobGeo, pipeMat.clone()); b.material.color.set(p.c); b.scale.setScalar(BLOB); b.position.x = (j - 1) * BLOB * 1.5; g.add(b); } shoot(g, 'pipe' + i, [0.2, 1, 1.5]); });
  const tp = makeCandle({ id: 'x', k: 't' }, 0); shoot(tp.group, 'taper', [0.3, 0.3, 1.4]);
  const spk = makeCandle({ id: 'y', k: 's' }, 0); shoot(spk.group, 'spark', [0.3, 0.3, 1.4]);
  pm.dispose(); tr.dispose(); try { tr.forceContextLoss(); } catch (e) {}
  if (!SPECTATOR) renderDock(false);
}

/* =====================================================================
   LOOP
   ===================================================================== */
const clock = new THREE.Clock(); let frames = 0, ftAcc = 0, lastLiveSent = 0, lastLiveKey = '';
const _cd = new THREE.Vector3();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime, now = performance.now();
  if (!camTween) controls.update();
  if (SPECTATOR && follow && SP.cam && !camTween) {
    const k = 1 - Math.exp(-dt * 6); camera.position.lerp(_v.set(SP.cam[0], SP.cam[1], SP.cam[2]), k); controls.target.lerp(_n.set(SP.cam[3], SP.cam[4], SP.cam[5]), k); camera.lookAt(controls.target);
  }
  // selected tier glow in bake
  tiers.forEach((T, i) => { const on = !SPECTATOR && S.chapter === 'bake' && UI.bakeTab !== 'tiers' && i === S.sel && S.tiers.length > 1; T.frostMat.emissive.copy(T.frostMat.color).multiplyScalar(on ? 0.06 + 0.05 * Math.sin(t * 3.2) : 0); });
  updateGrowing(now);
  // match follow
  if (!SPECTATOR && match3.visible) { match3.position.lerp(matchTarget, 1 - Math.exp(-dt * 16)); }
  if (SPECTATOR) { if (SP.m) { if (!match3.visible) { match3.visible = true; match3.scale.setScalar(1); match3.position.set(...SP.m); } match3.position.lerp(_v.set(...SP.m), 1 - Math.exp(-dt * 10)); match3.userData.flame.userData.alive = 1; } else if (match3.visible && !SP.m) match3.visible = false; }
  if (match3.visible) { const az = Math.atan2(camera.position.x - match3.position.x, camera.position.z - match3.position.z); match3.rotation.y = az; }
  // blow
  if (!SPECTATOR && S.chapter === 'light') { checkIgnite(); updateBlow(dt, t); }
  const bend = SPECTATOR ? SP.b : Blow.I;
  // flames
  let litN = 0; const cen = new THREE.Vector3();
  for (const o of candleObjs.values()) if (o.lit) { litN++; cen.add(wickWorld(o)); }
  for (const f of flames) {
    const u = f.userData.mat.uniforms; u.uTime.value = t; u.uAlive.value = f.userData.alive;
    f.getWorldPosition(_cd); const dx = _cd.x - camera.position.x, dz = _cd.z - camera.position.z, L = Math.hypot(dx, dz) || 1;
    // convert world blow direction to the flame's local space (candles may be scaled/rotated)
    u.uDir.value.set(dx / L, dz / L);
    const isMatch = f === match3.userData.flame; u.uBend.value = isMatch ? 0.15 : bend * (0.7 + 0.3 * Math.sin(t * 9 + u.uSeed.value));
    f.userData.glow.material.opacity = f.userData.alive * (0.42 + 0.12 * Math.sin(t * 17 + u.uSeed.value) + 0.06 * Math.sin(t * 31)) * (isMatch ? 0.8 : 1) * (1 - bend * 0.5);
  }
  // sparkler emission
  for (const o of candleObjs.values()) if (o.lit && o.spark) { const w = wickWorld(o); for (let i = 0; i < 4; i++) emitSpark(w); }
  // candle light
  const flick = 0.86 + 0.08 * Math.sin(t * 13.1) + 0.05 * Math.sin(t * 27.3 + 1.3) + 0.04 * Math.random();
  const target = litN ? Math.sqrt(litN / Math.max(1, S.candles.length)) : 0; AMB.candle = lerp(AMB.candle, target, 1 - Math.exp(-dt * 4));
  if (litN) { cen.divideScalar(litN); candleSpot.position.set(cen.x, cen.y + 0.24, cen.z); candleSpot.target.position.set(cen.x, cen.y - 3, cen.z); candleFill.position.set(cen.x, cen.y + 0.15, cen.z + 0.1); }
  candleSpot.intensity = AMB.candle * 7 * flick * (1 - bend * 0.35); candleFill.intensity = AMB.candle * 4 * flick * (1 - bend * 0.35);
  candleSpot.castShadow = AMB.candle > 0.02;
  updateSparks(dt); updateSmoke(dt); updateConfetti(dt);
  renderer.render(scene, camera);
  if (captureCb) { const cb = captureCb; captureCb = null; cb(capture()); }
  // spectator cursor
  if (SPECTATOR) { const cur = $('#cursor'); if (SP.p && Date.now() - SP.liveAt < 2500) { _v.set(...SP.p).project(camera); cur.style.opacity = 1; cur.style.transform = `translate(${(_v.x * 0.5 + 0.5) * innerWidth}px,${(1 - (_v.y * 0.5 + 0.5)) * innerHeight}px)`; } else cur.style.opacity = 0; }
  // live publish
  if (!SPECTATOR && S.chapter !== 'intro') {
    const p = drag && drag.type !== 'match' ? lastPW : lastPW; const m = match3.visible ? match3.position : null;
    const live = { cam: [camera.position.x, camera.position.y, camera.position.z, controls.target.x, controls.target.y, controls.target.z].map(r3), p: p ? [r3(p.x), r3(p.y), r3(p.z)] : null, m: m ? [r3(m.x), r3(m.y), r3(m.z)] : null, b: r3(Blow.I) };
    const k = JSON.stringify(live);
    if ((k !== lastLiveKey && now - lastLiveSent > 90) || now - lastLiveSent > 3000) { lastLiveKey = k; lastLiveSent = now; Sync.live(live); }
  }
  // adaptive resolution for older iPads
  frames++; ftAcc += dt; if (frames === 120) { const avg = ftAcc / frames; if (avg > 0.021 && DPR > 1) { DPR = Math.max(1, DPR - 0.25); renderer.setPixelRatio(DPR); } frames = 0; ftAcc = 0; }
}

/* =====================================================================
   BOOT
   ===================================================================== */
function onResize() { renderer.setSize(innerWidth, innerHeight); applyView(); }
window.addEventListener('resize', onResize); window.addEventListener('orientationchange', () => setTimeout(onResize, 300));
applyView(); applyAmb(); updateSteps();
fontsReady.then(() => setTimeout(makeThumbs, 30));
loop();
window.__cake = { S, goto, camera, controls, tiers, candleObjs, decorHit, Blow, celebrate, renderer };

if (SPECTATOR) {
  $('#intro').classList.add('gone'); updateSteps(); renderLive(); controls.autoRotate = false; controls.enabled = false;
  Sync.start(onSpecMsg);
} else {
  const saved = loadSaved();
  if (saved) { $('#start').textContent = 'Continue your cake'; const s = document.createElement('button'); s.className = 'ghost'; s.textContent = 'Start a new one'; s.style.margin = '16px auto 0'; s.style.display = 'flex'; s.id = 'fresh'; $('#intro small').before(s); s.addEventListener('click', () => { try { localStorage.removeItem('cake-state'); } catch (e) {} begin(null); }); }
  act('open', 'Opened the cake 💌'); Sync.start(null);
  $('#start').addEventListener('click', () => begin(saved));
  function begin(sv) {
    Sound.init(); Sound.tick(); $('#intro').classList.add('gone');
    if (sv) {
      const log = S.log; Object.assign(S, sv); S.log = [...(sv.log || []), ...log]; S.lit = []; S.out = false;
      let ch = sv.chapter; if (!CHAPTERS.includes(ch)) ch = 'candles'; if (ch === 'light') ch = 'candles';
      S.chapter = 'intro'; reconcile(true); act('resume', 'Came back to her cake'); goto(ch);
    } else {
      S.tiers = [{ sp: 'vanilla', fr: 'ivory', dr: 'none' }, { sp: 'cocoa', fr: 'rose', dr: 'chocolate' }]; S.sel = 1; S.tops = []; S.pipes = []; S.candles = []; S.lit = []; S.out = false; S.paid = false;
      act('start', 'Started baking'); goto('bake');
    }
  }
}
