// End-to-end run: player (iPad landscape) + spectator, local MQTT broker, CDN routed to node_modules.
const { chromium } = require('playwright');
const http = require('http'); const fs = require('fs'); const path = require('path');
const aedesMod = require('aedes'); const { WebSocketServer, createWebSocketStream } = require('ws');
const DIST = path.join(__dirname, '..', 'dist'); const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const NM = path.join(__dirname, 'node_modules');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const aedes = aedesMod.createBroker ? await aedesMod.createBroker() : aedesMod();
  const wss = new WebSocketServer({ port: 8888 }); wss.on('connection', ws => aedes.handle(createWebSocketStream(ws)));
  const srv = http.createServer((q, s) => { const f = path.join(DIST, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : q.url.split('?')[0]); fs.readFile(f, (e, d) => { if (e) { s.writeHead(404); s.end(); } else { s.writeHead(200, { 'content-type': 'text/html' }); s.end(d); } }); }).listen(8000);

  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const mk = async (url, vp) => {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: false });
    await ctx.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/, (r) => { const m = r.request().url().match(/three@0\.160\.0\/(.*)/); r.fulfill({ path: path.join(NM, 'three', m[1]), contentType: 'text/javascript' }); });
    await ctx.route(/cdnjs\.cloudflare\.com.*gsap/, r => r.fulfill({ path: path.join(NM, 'gsap/dist/gsap.min.js'), contentType: 'text/javascript' }));
    await ctx.route(/unpkg\.com\/mqtt/, r => r.fulfill({ path: path.join(NM, 'mqtt/dist/mqtt.min.js'), contentType: 'text/javascript' }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ body: '', contentType: 'text/css' }));
    const p = await ctx.newPage(); p.setDefaultTimeout(120000); const errs = [];
    p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
    p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
    p.on('requestfailed', r => errs.push('REQFAIL ' + r.url().slice(0,90))); await p.goto(url, { waitUntil: 'domcontentloaded' }); return { p, errs };
  };
  const B = '?broker=ws://localhost:8888';
  const spec = await mk('http://localhost:8000/index.html' + B + '&watch', { width: 1280, height: 800 });
  const pl = await mk('http://localhost:8000/index.html' + B, { width: 1024, height: 768 });
  const P = pl.p; const shot = async (n, page = P) => { await page.screenshot({ path: path.join(OUT, n + '.png') }); console.log('shot', n); };
  await sleep(2500); await shot('01-intro');
  await P.click('#start'); await sleep(2600); await shot('02-bake');
  await P.click('[data-act="tab"][data-v="drip"]'); await sleep(300);
  await P.click('[data-act="dr"][data-v="caramel"]'); await sleep(200);
  await P.click('[data-act="tab"][data-v="tiers"]'); await P.click('[data-act="tier-add"]'); await sleep(1800);
  await P.click('[data-act="tab"][data-v="sponge"]'); await sleep(300);
  await P.click('[data-act="secret-sponge"]'); await sleep(300); await P.click('[data-act="sp"][data-v="matcha"]');
  await P.click('[data-act="slice"]'); await sleep(1500); await shot('03-bake-slice');
  await P.click('[data-act="slice"]'); await sleep(900);
  await P.click('#next'); await sleep(1900);
  // place toppings by projecting points on the top tier
  const proj = async (x, y, z) => P.evaluate(([x, y, z]) => { const c = window.__cake; const THREE_V = c.camera.position.clone().set(x, y, z).project(c.camera); return [(THREE_V.x * .5 + .5) * innerWidth, (1 - (THREE_V.y * .5 + .5)) * innerHeight]; }, [x, y, z]);
  const topY = 3 * 0.5 + 0.005;
  for (const [a, rr] of [[0, .5], [1.2, .55], [2.4, .5], [3.6, .55], [4.8, .5]]) { const [sx, sy] = await proj(Math.sin(a) * rr, topY, Math.cos(a) * rr); await P.mouse.click(sx, sy); await sleep(120); }
  await P.click('[data-act="tool"][data-v="macaron"]');
  for (const a of [0.6, 1.8, 3.0, 4.2, 5.4]) { const [sx, sy] = await proj(Math.sin(a) * 0.98, 1.0 + 0.005, Math.cos(a) * 0.98); await P.mouse.click(sx, sy); await sleep(100); }
  await P.click('[data-act="tab"][data-v="piping"]'); await sleep(200);
  // pipe a ring on the bottom tier's top edge
  let pts = []; for (let i = 0; i <= 40; i++) { const a = -0.9 + i / 40 * 1.8; pts.push(await proj(Math.sin(a) * 1.12, 0.505, Math.cos(a) * 1.12)); }
  await P.mouse.move(...pts[0]); await P.mouse.down(); for (const q of pts) { await P.mouse.move(q[0], q[1], { steps: 2 }); } await P.mouse.up(); await sleep(400);
  await P.click('[data-act="tab"][data-v="extra"]'); await sleep(200);
  for (const [k, a] of [['latte', 2.2], ['vinyl', 3.4], ['pick', -0.6]]) { await P.click(`[data-act="tool"][data-v="${k}"]`); const [sx, sy] = await proj(Math.sin(a) * 1.3, 0.005, Math.cos(a) * 1.3); await P.mouse.click(sx, sy); await sleep(100); }
  await sleep(800); await shot('04-decorate');
  await shot('04s-spectator', spec.p);
  await P.click('#next'); await sleep(1800);
  await P.click('[data-act="digit"][data-v="2"]'); await sleep(200); await P.click('[data-act="digit"][data-v="7"]'); await sleep(200);
  await P.click('[data-act="taper"]'); await P.click('[data-act="taper"]'); await P.click('[data-act="spark"]'); await sleep(1400); await shot('05-candles');
  await P.click('#next'); await sleep(2200); await shot('06-light');
  // strike: drag match down onto strip and rub
  const mb = await P.locator('#match .head').boundingBox(); const strip = await P.locator('.strip').boundingBox();
  await P.mouse.move(mb.x + 8, mb.y + 8); await P.mouse.down();
  const sy = strip.y + strip.height / 2; await P.mouse.move(mb.x + 8, sy, { steps: 6 });
  for (let i = 0; i < 6; i++) { await P.mouse.move(strip.x + 40, sy, { steps: 3 }); await P.mouse.move(strip.x + strip.width - 30, sy, { steps: 3 }); }
  await sleep(500);
  const wicks = await P.evaluate(() => { const c = window.__cake; const out = []; for (const o of c.candleObjs.values()) { o.group.updateMatrixWorld(); const w = o.group.localToWorld(o.wick.clone()); const v = w.clone().project(c.camera); out.push([(v.x * .5 + .5) * innerWidth, (1 - (v.y * .5 + .5)) * innerHeight]); } return out; });
  for (const [x, y] of wicks) { await P.mouse.move(x, y + 70, { steps: 8 }); await sleep(250); }
  await P.mouse.up(); await sleep(600); await shot('07-lit'); await shot('07s-spectator', spec.p);
  console.log('lit', await P.evaluate(() => window.__cake.S.lit.length), 'of', wicks.length);
  await sleep(1500); await shot('08-wish');
  const hb = await P.locator('#holdBtn').boundingBox(); await P.mouse.move(hb.x + 30, hb.y + 20); await P.mouse.down(); await sleep(700); await shot('09-blowing'); await sleep(2600); await P.mouse.up();
  console.log('out?', await P.evaluate(() => window.__cake.S.out));
  await sleep(2600); await shot('10-celebrate');
  await sleep(4500); await shot('11-finale');
  await sleep(2500); await shot('12-finale-dev');
  await P.click('#pay'); await sleep(1800); await shot('13-paid'); await shot('13s-spectator', spec.p);
  await P.click('#envelope'); await sleep(6500); await shot('14-letter');
  console.log('PLAYER ERRORS', pl.errs.slice(0, 20)); console.log('SPEC ERRORS', spec.errs.slice(0, 20));
  console.log('spec log', await spec.p.evaluate(() => window.__cake.S.log.length), 'spec tiers', await spec.p.evaluate(() => window.__cake.S.tiers.length));
  await browser.close(); srv.close(); wss.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
