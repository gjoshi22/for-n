const { chromium } = require('playwright'); const http=require('http'),fs=require('fs'),path=require('path');
const NM=path.join(__dirname,'node_modules'); const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const srv=http.createServer((q,s)=>fs.readFile(path.join(__dirname,'..','dist','index.html'),(e,d)=>{s.writeHead(200,{'content-type':'text/html'});s.end(d)})).listen(8004);
 const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}); const ctx=await b.newContext({viewport:{width:600,height:400}});
 await ctx.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/,r=>{const m=r.request().url().match(/three@0\.160\.0\/(.*)/);r.fulfill({path:path.join(NM,'three',m[1]),contentType:'text/javascript'})});
 await ctx.route(/cdnjs\.cloudflare\.com.*gsap/,r=>r.fulfill({path:path.join(NM,'gsap/dist/gsap.min.js'),contentType:'text/javascript'}));
 await ctx.route(/unpkg\.com\/mqtt/,r=>r.abort());
 const P=await ctx.newPage(); P.on('pageerror',e=>console.log('PE',e.message)); P.on('console',m=>console.log('C',m.text().slice(0,200)));
 await P.goto('http://localhost:8004/'); await sleep(2000); await P.click('#start'); await sleep(2000);
 const st=()=>P.evaluate(()=>window.__cake.tiers.map(T=>[T.sliced,T.opening,T.wedge.position.z.toFixed(2),T.full.visible].join(',')));
 await P.click('[data-act="slice"]'); await sleep(2500); console.log('open',await st());
 await P.click('[data-act="slice"]'); await sleep(300); console.log('closing',await st()); await sleep(2500); console.log('closed',await st());
 await b.close(); srv.close(); process.exit(0);
})();
