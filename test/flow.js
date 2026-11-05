// Full flow: decorate with every topping → candles → strike + light every wick → blow (hold) → finale → pay → letter.
// Usage: node flow.js [prefix]
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const DIST = path.join(__dirname, '..', 'dist'); const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const NM = path.join(__dirname, 'node_modules'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const PFX = process.argv[2] || 'f';
(async () => {
  const srv = http.createServer((q, s) => fs.readFile(path.join(DIST, 'index.html'), (e, d) => { s.writeHead(200, { 'content-type': 'text/html' }); s.end(d); })).listen(8005);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 } });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/, r => { const m = r.request().url().match(/three@0\.160\.0\/(.*)/); r.fulfill({ path: path.join(NM, 'three', m[1]), contentType: 'text/javascript' }); });
  await ctx.route(/cdnjs\.cloudflare\.com.*gsap/, r => r.fulfill({ path: path.join(NM, 'gsap/dist/gsap.min.js'), contentType: 'text/javascript' }));
  await ctx.route(/unpkg\.com\/mqtt/, r => r.abort());
  const P = await ctx.newPage(); P.setDefaultTimeout(180000); const errs = [];
  P.on('pageerror', e => { errs.push(e.message); console.log('PAGEERROR', e.message); });
  P.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) { errs.push(m.text()); console.log('ERR', m.text().slice(0, 300)); } });
  await P.goto('http://localhost:8005/', { waitUntil: 'load' });
  await P.evaluate(() => gsap.ticker.lagSmoothing(0));
  const shot = async (n, clip) => { await P.screenshot({ path: path.join(OUT, `${PFX}-${n}.png`), clip }); console.log('shot', n); };
  const proj = (x, y, z) => P.evaluate(([x, y, z]) => { const c = window.__cake; const v = c.camera.position.clone().set(x, y, z).project(c.camera); return [(v.x * .5 + .5) * innerWidth, (1 - (v.y * .5 + .5)) * innerHeight]; }, [x, y, z]);
  const tapAt = async (x, y, z) => { const [sx, sy] = await proj(x, y, z); await P.mouse.click(sx, sy); await sleep(250); };
  await sleep(2500); await P.click('#start'); await sleep(3000);
  await P.click('#next'); await sleep(2600);
  const dock = await P.locator('#dock').boundingBox();
  const place = { // [x, y, z] targets per topping
    strawberry: [-0.55, 1.005, 0.25], halfberry: [-0.25, 1.005, 0.55], raspberry: [0.1, 1.005, 0.62], blueberry: [0.42, 1.005, 0.45], cherry: [0.6, 1.005, 0.12],
    macaron: [-1.06, 0.505, 0.35], meringue: [-0.75, 0.505, 0.75], truffle: [-0.3, 0.505, 1.03], shard: [0.35, 0.505, 1.02], dragee: [0.8, 0.505, 0.7],
    rose: [-0.2, 1.005, -0.35], gold: [0.25, 1.005, 0.2], mint: [0.3, 1.005, -0.35],
    topper: [0, 1.005, -0.15], latte: [-1.32, 0.005, 0.55], vinyl: [1.25, 0.005, 0.5], pick: [0.4, 0.005, 1.38],
  };
  for (const tab of ['fruit', 'sweets', 'flora', 'extra']) {
    await P.click(`[data-act="tab"][data-v="${tab}"]`); await sleep(900);
    await shot('dock-' + tab, { x: dock.x, y: dock.y, width: dock.width, height: dock.height });
    const tools = await P.$$eval('#panel [data-act="tool"]', els => els.map(e => e.dataset.v));
    for (const k of tools) { if (!(await P.$eval(`[data-act="tool"][data-v="${k}"]`, e => e.classList.contains("on")))) await P.click(`[data-act="tool"][data-v="${k}"]`); await sleep(150); if (place[k]) await tapAt(...place[k]); }
  }
  await sleep(1500); await shot('1-decorated');
  console.log('tops placed', await P.evaluate(() => window.__cake.S.tops.map(t => t.k).join(',')));
  await P.evaluate(() => { const c = window.__cake; c.controls.autoRotate = false; c.camera.position.set(0.9, 2.6, 3.9); c.controls.target.set(0, 0.75, 0); c.camera.lookAt(c.controls.target); });
  await sleep(1500); await shot('2-toppings-close');
  await P.evaluate(() => { const c = window.__cake; c.camera.position.set(-2.6, 2.2, 3.0); c.camera.lookAt(c.controls.target); });
  await sleep(1500); await shot('3-toppings-close2');
  await P.click('#next'); await sleep(2600);
  await P.click('[data-act="digit"][data-v="2"]'); await sleep(250); await P.click('[data-act="digit"][data-v="7"]'); await sleep(250);
  await P.click('[data-act="taper"]'); await sleep(250); await P.click('[data-act="spark"]'); await sleep(1600); await shot('4-candles');
  await P.click('#next'); await sleep(3500);
  for (let i = 0, prev = ''; i < 40; i++) { const bb = JSON.stringify(await P.locator('#match .head').boundingBox()); const away = await P.$eval('#matchbox', e => e.classList.contains('away')); if (!away && bb === prev) break; prev = bb; await sleep(500); }
  const mb = await P.locator('#match .head').boundingBox(); const strip = await P.locator('.strip').boundingBox();
  await P.mouse.move(mb.x + 8, mb.y + 8); await P.mouse.down(); const sy = strip.y + strip.height / 2; await P.mouse.move(mb.x + 8, sy, { steps: 6 });
  for (let i = 0; i < 6; i++) { await P.mouse.move(strip.x + 40, sy, { steps: 3 }); await P.mouse.move(strip.x + strip.width - 30, sy, { steps: 3 }); }
  await sleep(1200);
  console.log('match lit?', await P.evaluate(() => document.querySelector('#match').classList.contains('lit')));
  const wicks = await P.evaluate(() => { const c = window.__cake; const out = []; for (const o of c.candleObjs.values()) { o.group.updateMatrixWorld(); const w = o.group.localToWorld(o.wick.clone()); const v = w.clone().project(c.camera); out.push([(v.x * .5 + .5) * innerWidth, (1 - (v.y * .5 + .5)) * innerHeight]); } return out; });
  // swipe quickly through each wick (tests the swept hit), pausing briefly
  for (const [x, y] of wicks) { await P.mouse.move(x - 40, y + 70, { steps: 3 }); await P.mouse.move(x + 40, y + 70, { steps: 3 }); await sleep(600); }
  await sleep(800); await shot('5-lighting');
  console.log('lit', await P.evaluate(() => window.__cake.S.lit.length), 'of', wicks.length);
  await P.mouse.up(); await sleep(3500); await shot('6-wish');
  const hb = await P.locator('#holdBtn').boundingBox(); await P.mouse.move(hb.x + 30, hb.y + 20); await P.mouse.down(); await sleep(1200); await shot('7-blowing');
  for (let i = 0; i < 20; i++) { await sleep(500); if (await P.evaluate(() => window.__cake.S.out)) break; }
  await P.mouse.up();
  console.log('out?', await P.evaluate(() => window.__cake.S.out), 'remaining lit', await P.evaluate(() => window.__cake.S.lit.length));
  await sleep(3000); await shot('8-celebrate');
  for (let i = 0; i < 30; i++) { await sleep(500); if (await P.evaluate(() => document.querySelector('#finale').classList.contains('show'))) break; }
  await sleep(4500); await shot('9-finale');
  await P.click('#pay'); await sleep(2500); await shot('10-paid');
  await P.click('#envelope'); await sleep(7500); await shot('11-letter');
  console.log('ERRORS', errs.length, errs.slice(0, 10));
  await b.close(); srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
