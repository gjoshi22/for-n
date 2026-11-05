// Move / remove toppings and candles (incl. sparklers) by dragging; screenshots the new toppings.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const DIST = path.join(__dirname, '..', 'dist'); const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const NM = path.join(__dirname, 'node_modules'); const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = http.createServer((q, s) => fs.readFile(path.join(DIST, 'index.html'), (e, d) => { s.writeHead(200, { 'content-type': 'text/html' }); s.end(d); })).listen(8007);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 } });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/, r => { const m = r.request().url().match(/three@0\.160\.0\/(.*)/); r.fulfill({ path: path.join(NM, 'three', m[1]), contentType: 'text/javascript' }); });
  await ctx.route(/cdnjs\.cloudflare\.com.*gsap/, r => r.fulfill({ path: path.join(NM, 'gsap/dist/gsap.min.js'), contentType: 'text/javascript' }));
  await ctx.route(/unpkg\.com\/mqtt/, r => r.abort());
  const P = await ctx.newPage(); P.setDefaultTimeout(180000); const errs = [];
  P.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); });
  P.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) { errs.push(m.text()); console.log('ERR', m.text().slice(0, 300)); } });
  await P.goto('http://localhost:8007/', { waitUntil: 'load' }); await P.evaluate(() => gsap.ticker.lagSmoothing(0));
  const shot = async (n, clip) => { await P.screenshot({ path: path.join(OUT, `d-${n}.png`), clip }); console.log('shot', n); };
  const proj = (x, y, z) => P.evaluate(([x, y, z]) => { const c = window.__cake; const v = c.camera.position.clone().set(x, y, z).project(c.camera); return [(v.x * .5 + .5) * innerWidth, (1 - (v.y * .5 + .5)) * innerHeight]; }, [x, y, z]);
  const drag = async (from, to) => { const a = await proj(...from), c = await proj(...to); await P.mouse.move(...a); await P.mouse.down(); await sleep(200); for (let i = 1; i <= 8; i++) { await P.mouse.move(a[0] + (c[0] - a[0]) * i / 8, a[1] + (c[1] - a[1]) * i / 8); await sleep(60); } await P.mouse.up(); await sleep(500); };
  const S = () => P.evaluate(() => JSON.parse(JSON.stringify(window.__cake.S)));
  await sleep(2500); await P.click('#start'); await sleep(2500); await P.click('#next'); await sleep(2600);
  const sel = async (tab, k) => { await P.click(`[data-act="tab"][data-v="${tab}"]`); await sleep(500); if (!(await P.$eval(`[data-act="tool"][data-v="${k}"]`, e => e.classList.contains('on')))) await P.click(`[data-act="tool"][data-v="${k}"]`); await sleep(150); };
  const tap = async (x, y, z) => { const [sx, sy] = await proj(x, y, z); await P.mouse.click(sx, sy); await sleep(300); };
  // new toppings
  await sel('fruit', 'fig'); await tap(-0.4, 1.005, 0.3); await sel('fruit', 'orange'); await tap(0.0, 1.005, 0.55);
  await sel('sweets', 'heart'); await tap(0.4, 1.005, 0.3); await sel('sweets', 'sprinkles'); await tap(0.25, 1.005, -0.2);
  await sel('flora', 'pansy'); await tap(-0.3, 1.005, -0.25); await sel('extra', 'bow'); await tap(-1.05, 0.505, 0.45);
  await sleep(800); const sc = () => P.evaluate(() => [scrollY, document.querySelector('#app').scrollTop]); console.log('scroll after placing', await sc());
  let st = await S(); console.log('placed', st.tops.map(t => t.k).join(','));
  // move the heart from the top tier to the lower ledge
  const heart = st.tops.find(t => t.k === 'heart');
  await drag([0.4, 1.03, 0.3], [0.75, 0.505, 0.78]); console.log('scroll after drag', await sc());
  st = await S(); const h2 = st.tops.find(t => t.id === heart.id); console.log('heart moved: tier', heart.t, '->', h2 && h2.t, 'count', st.tops.length);
  // drag the pansy off the cake to remove it
  const before = st.tops.length; await drag([-0.3, 1.01, -0.25], [-3.2, 1.2, 0]);
  st = await S(); console.log('removed by dragging off:', before - st.tops.length === 1, 'pansy left?', st.tops.some(t => t.k === 'pansy'));
  await P.evaluate(() => { const c = window.__cake; c.controls.autoRotate = false; c.camera.position.set(0.9, 2.5, 3.8); c.controls.target.set(0, 0.75, 0); c.camera.lookAt(c.controls.target); });
  await sleep(1500); await shot('1-new-toppings');
  for (const tab of ['fruit', 'sweets', 'flora', 'extra']) { await P.click(`[data-act="tab"][data-v="${tab}"]`); await sleep(1200); const dk = await P.locator('#dock').boundingBox(); await shot('dock-' + tab, dk); }
  // candles: 2, 7, two sparklers, then drag a sparkler and the 7 to the bottom tier ledge
  await P.click('#next'); await sleep(2600);
  await P.click('[data-act="digit"][data-v="2"]'); await sleep(300); await P.click('[data-act="digit"][data-v="7"]'); await sleep(300);
  await P.click('[data-act="spark"]'); await sleep(300); await P.click('[data-act="spark"]'); await sleep(1500);
  const wpos = () => P.evaluate(() => [...window.__cake.candleObjs.values()].map(o => { const w = new o.group.position.constructor(); o.group.getWorldPosition(w); return { id: o.id, k: o.k, x: w.x, y: w.y, z: w.z }; }));
  let cw = await wpos(); console.log('candles', cw.map(c => c.k + '@' + c.y.toFixed(2)).join(' '));
  const spk = cw.find(c => c.k === 's'), seven = cw.filter(c => c.k === 'd')[1];
  await drag([spk.x, spk.y + 0.15, spk.z], [-0.6, 0.505, 0.85]);
  await drag([seven.x, seven.y + 0.08, seven.z], [0.62, 0.505, 0.85]);
  st = await S(); console.log('placed candles', JSON.stringify(st.candles.map(c => ({ k: c.k, d: c.d, t: c.pos ? c.pos.t : 'auto' }))));
  await sleep(1200); await shot('2-candles-moved');
  // drag the other sparkler off to remove it
  cw = await wpos(); const spk2 = cw.filter(c => c.k === 's').find(c => c.y > 0.9);
  if (spk2) { const n0 = st.candles.length; await drag([spk2.x, spk2.y + 0.15, spk2.z], [3.2, 1.2, 0]); st = await S(); console.log('candle removed by dragging off:', n0 - st.candles.length === 1); }
  // light chapter still works with candles spread across tiers
  await P.click('#next'); await sleep(3500); await shot('3-light');
  console.log('ERRORS', errs.length, errs.slice(0, 5));
  await b.close(); srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
