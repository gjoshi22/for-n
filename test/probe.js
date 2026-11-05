const { chromium } = require('playwright'); const path=require('path'); const http=require('http'); const fs=require('fs');
const NM=path.join(__dirname,'node_modules'); const DIST=path.join(__dirname,'..','dist');
(async()=>{
 const srv=http.createServer((q,s)=>{fs.readFile(path.join(DIST,'index.html'),(e,d)=>{s.writeHead(200,{'content-type':'text/html'});s.end(d)})}).listen(8001);
 const b=await chromium.launch({args:process.argv[2]==='gl'?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const ctx=await b.newContext({viewport:{width:800,height:600}});
 await ctx.route(/cdn\.jsdelivr\.net\/npm\/three@0\.160\.0\/(.*)/,r=>{const m=r.request().url().match(/three@0\.160\.0\/(.*)/);r.fulfill({path:path.join(NM,'three',m[1]),contentType:'text/javascript'})});
 await ctx.route(/cdnjs\.cloudflare\.com.*gsap/,r=>r.fulfill({path:path.join(NM,'gsap/dist/gsap.min.js'),contentType:'text/javascript'}));
 await ctx.route(/unpkg\.com\/mqtt/,r=>r.fulfill({path:path.join(NM,'mqtt/dist/mqtt.min.js'),contentType:'text/javascript'}));
 await ctx.route(/fonts\.(googleapis|gstatic)\.com/,r=>r.fulfill({body:'',contentType:'text/css'}));
 const p=await ctx.newPage(); p.on('console',m=>console.log('C',m.type(),m.text().slice(0,200))); p.on('pageerror',e=>console.log('PE',e.message));
 await p.goto('http://localhost:8001/',{waitUntil:'domcontentloaded'});
 await new Promise(r=>setTimeout(r,3000)); console.log('fps', await p.evaluate(()=>new Promise(res=>{let n=0;const t0=performance.now();const f=()=>{n++; if(performance.now()-t0<3000) requestAnimationFrame(f); else res(n/3)};requestAnimationFrame(f)}))); const t=Date.now(); await p.screenshot({path:'shots/probe.png',timeout:90000}); console.log('shot ms',Date.now()-t);
 await b.close(); srv.close();
})();
