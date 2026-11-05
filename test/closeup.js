// Close-up of a 3-tier cake with chocolate drip, slice closed + open. Usage: node closeup.js [prefix]
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const DIST = path.join(__dirname, '..', 'dist'); const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const NM = path.join(__dirname, 'node_modules'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const PFX = process.argv[2] || 'cu';
(async () => {
  const srv = http.createServer((q, s) => fs.readFile(path.join(DIST, 'index.html'), (e, d) => { s.writeHead(200, { 'content-type': 'text/html' }); s.end(d); })).listen(8003);
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 1180, height: 820 } });
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/, r => { const m = r.request().url().match(/three@0\.160\.0\/(.*)/); r.fulfill({ path: path.join(NM, 'three', m[1]), contentType: 'text/javascript' }); });
  await ctx.route(/cdnjs\.cloudflare\.com.*gsap/, r => r.fulfill({ path: path.join(NM, 'gsap/dist/gsap.min.js'), contentType: 'text/javascript' }));
  await ctx.route(/unpkg\.com\/mqtt/, r => r.abort());
  const P = await ctx.newPage(); P.setDefaultTimeout(120000);
  P.on('pageerror', e => console.log('PAGEERROR', e.message));
  await P.goto('http://localhost:8003/', { waitUntil: 'load' });
  await P.evaluate(() => gsap.ticker.lagSmoothing(0));
  const shot = async n => { await P.screenshot({ path: path.join(OUT, `${PFX}-${n}.png`) }); console.log('shot', n); };
  await sleep(2500); await P.click('#start'); await sleep(2500);
  await P.click('[data-act="tier-add"]'); await sleep(2200);
  await P.click('[data-act="tab"][data-v="drip"]'); await sleep(300);
  await P.click('[data-act="sel"][data-v="0"]'); await P.click('[data-act="dr"][data-v="caramel"]'); await sleep(1500);
  // close-up camera, slightly from the right so the wedge seam line (front, ±30°) is visible if present
  await P.evaluate(() => { const c = window.__cake; c.controls.autoRotate = false; c.camera.position.set(2.2, 2.4, 4.4); c.controls.target.set(0, 0.75, 0); c.camera.lookAt(c.controls.target); });
  await sleep(1500); await shot('1-closed');
  await P.click('[data-act="slice"]'); await sleep(2500); await shot('2-open');
  await P.click('[data-act="slice"]'); await sleep(2500); console.log(await P.evaluate(() => JSON.stringify([window.__cake.S.slice, window.__cake.tiers.map(T => [T.sliced, T.opening, T.wedge.position.z.toFixed(2), T.full.visible])]))); await shot('3-reclosed'); console.log(await P.evaluate(() => JSON.stringify(window.__cake.tiers.map(T => T.wedge.position.z.toFixed(2)))));
  await b.close(); srv.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
