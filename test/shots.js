// Quick visual pass: intro → bake → decorate → candles → light. Usage: node shots.js [width] [height] [prefix]
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const DIST = path.join(__dirname, '..', 'dist'); const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const NM = path.join(__dirname, 'node_modules'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const W = +process.argv[2] || 1180, H = +process.argv[3] || 820, PFX = process.argv[4] || 'v';
const ONLY = process.argv[5] || 'all';
(async () => {
  const srv = http.createServer((q, s) => fs.readFile(path.join(DIST, 'index.html'), (e, d) => { s.writeHead(200, { 'content-type': 'text/html' }); s.end(d); })).listen(8002);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: W, height: H } });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/, r => { const m = r.request().url().match(/three@0\.160\.0\/(.*)/); r.fulfill({ path: path.join(NM, 'three', m[1]), contentType: 'text/javascript' }); });
  await ctx.route(/cdnjs\.cloudflare\.com.*gsap/, r => r.fulfill({ path: path.join(NM, 'gsap/dist/gsap.min.js'), contentType: 'text/javascript' }));
  await ctx.route(/unpkg\.com\/mqtt/, r => r.abort());
  const P = await ctx.newPage(); P.setDefaultTimeout(120000);
  P.on('pageerror', e => console.log('PAGEERROR', e.message)); P.on('console', m => { if (m.type() === 'error') console.log('ERR', m.text().slice(0, 200)); });
  await P.goto('http://localhost:8002/', { waitUntil: 'load' });
  await P.evaluate(() => window.gsap && gsap.ticker.lagSmoothing(0));
  const shot = async n => { await P.screenshot({ path: path.join(OUT, `${PFX}-${n}.png`) }); console.log('shot', n); };
  await sleep(3000); await shot('1-intro'); if (ONLY === 'intro') return done();
  await P.click('#start'); await sleep(3500); await shot('2-bake');
  await P.click('[data-act="tab"][data-v="frost"]'); await sleep(800); await shot('2b-bake-frost');
  await P.click('#next'); await sleep(2500);
  const proj = (x, y, z) => P.evaluate(([x, y, z]) => { const c = window.__cake; const v = c.camera.position.clone().set(x, y, z).project(c.camera); return [(v.x * .5 + .5) * innerWidth, (1 - (v.y * .5 + .5)) * innerHeight]; }, [x, y, z]);
  for (const [a, rr] of [[0, .45], [2.1, .45], [4.2, .45]]) { const [sx, sy] = await proj(Math.sin(a) * rr, 1.005, Math.cos(a) * rr); await P.mouse.click(sx, sy); await sleep(150); }
  await sleep(1200); await shot('3-decorate');
  await P.click('#next'); await sleep(2200);
  await P.click('[data-act="digit"][data-v="2"]'); await sleep(200); await P.click('[data-act="digit"][data-v="7"]'); await sleep(1600); await shot('4-candles');
  await P.click('#next'); await sleep(3000); await shot('5-light');
  const mb = await P.locator('#match .head').boundingBox(); const strip = await P.locator('.strip').boundingBox();
  await P.mouse.move(mb.x + 8, mb.y + 8); await P.mouse.down(); const sy = strip.y + strip.height / 2; await P.mouse.move(mb.x + 8, sy, { steps: 6 });
  for (let i = 0; i < 6; i++) { await P.mouse.move(strip.x + 40, sy, { steps: 3 }); await P.mouse.move(strip.x + strip.width - 30, sy, { steps: 3 }); }
  await sleep(500);
  const wicks = await P.evaluate(() => { const c = window.__cake; const out = []; for (const o of c.candleObjs.values()) { o.group.updateMatrixWorld(); const w = o.group.localToWorld(o.wick.clone()); const v = w.clone().project(c.camera); out.push([(v.x * .5 + .5) * innerWidth, (1 - (v.y * .5 + .5)) * innerHeight]); } return out; });
  for (const [x, y] of wicks) { await P.mouse.move(x, y + 70, { steps: 8 }); await sleep(300); }
  await P.mouse.up(); await sleep(2500); await shot('6-lit');
  console.log('lit', await P.evaluate(() => window.__cake.S.lit.length), 'of', wicks.length);
  done();
  async function done() { await b.close(); srv.close(); process.exit(0); }
})().catch(e => { console.error(e); process.exit(1); });
