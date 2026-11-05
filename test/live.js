// Real-internet spectator check against the live GitHub Pages site and public MQTT brokers.
const { chromium } = require('playwright'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL = 'https://gjoshi22.github.io/for-n/';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const mk = async (u) => { const c = await b.newContext({ viewport: { width: 900, height: 640 } }); const p = await c.newPage(); p.setDefaultTimeout(120000); const log = [];
    p.on('console', m => log.push(m.type() + ': ' + m.text().slice(0, 160))); p.on('pageerror', e => log.push('PE ' + e.message)); await p.goto(u, { waitUntil: 'load' }); return { p, log }; };
  const spec = await mk(URL + '?watch'); await sleep(4000);
  const pl = await mk(URL + '?t=' + Date.now()); await sleep(4000);
  await pl.p.evaluate(() => localStorage.clear());
  await pl.p.click('#start'); await sleep(6000);
  await pl.p.click('[data-act="tier-add"]'); await sleep(5000);
  const r = await spec.p.evaluate(() => ({ chapter: window.__cake.S.chapter, tiers: window.__cake.S.tiers.length, log: window.__cake.S.log.slice(-4).map(l => l[2]), live: document.querySelector('#liveT').textContent }));
  console.log('PLAYER tiers', await pl.p.evaluate(() => window.__cake.S.tiers.length));
  console.log('SPECTATOR sees', JSON.stringify(r));
  await spec.p.screenshot({ path: 'shots/live-spectator.png' });
  console.log('spec console errors', spec.log.filter(l => /error|PE/.test(l)).slice(0, 5));
  await b.close(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
