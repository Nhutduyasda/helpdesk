const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/nhutd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();const errors=[];page.on('pageerror',()=>errors.push('JavaScript exception'));
 const base=process.env.PWA_QA_URL || 'http://127.0.0.1:5175';
 await page.goto(base+'/login');await page.getByRole('heading',{name:'Chào mừng bạn',exact:true}).waitFor();
 const manifest=await (await page.request.get(base+'/manifest.webmanifest')).json();
 assert.equal(manifest.name,'ITCare — Hỗ trợ IT văn phòng');assert.equal(manifest.display,'standalone');
 for(const size of ['192x192','512x512'])assert(manifest.icons.some(i=>i.sizes===size));
 for(const icon of manifest.icons){const response=await page.request.get(base+icon.src);assert(response.ok());const bytes=await response.body();assert.equal(bytes.readUInt32BE(16),parseInt(icon.sizes));assert.equal(bytes.readUInt32BE(20),parseInt(icon.sizes));}
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.reload();await page.getByRole('heading',{name:'Chào mừng bạn',exact:true}).waitFor();
 const registration=await page.evaluate(async()=>({controller:navigator.serviceWorker.controller?.scriptURL,registrations:(await navigator.serviceWorker.getRegistrations()).map(r=>r.active?.scriptURL)}));
 assert(registration.controller?.endsWith('/itcare-sw.js'));assert(!registration.registrations.some(url=>url?.includes('mockServiceWorker')));
 const client=await context.newCDPSession(page);await client.send('Page.enable');
 const {installabilityErrors}=await client.send('Page.getInstallabilityErrors');
 const cacheURLs=await page.evaluate(async()=>{const urls=[];for(const name of await caches.keys()){if(name.startsWith('itcare-'))for(const request of await (await caches.open(name)).keys())urls.push(request.url);}return urls;});
 assert(cacheURLs.every(url=>new URL(url).origin===new URL(base).origin));
 assert(!cacheURLs.some(url=>/supabase|\/rest\/|\/auth\/|\/storage\/|\/employee|\/it\/tickets/.test(url)));
 await page.screenshot({path:'docs/phase-3/screenshots/pwa-login-390.png',fullPage:true});
 await context.setOffline(true);await page.goto(base+'/employee/report');
 await page.getByRole('heading',{name:'ITCare đang mất kết nối',exact:true}).waitFor();
 await context.setOffline(false);await page.reload();await page.waitForURL('**/login');
 assert.equal(errors.length,0);
 const report={passed:true,manifest:true,iconSizes:true,serviceWorker:true,privateCacheEntries:0,offlineNavigation:true,installabilityErrors,physicalAndroid:'NOT TESTED',physicalIPhone:'NOT TESTED',realHomeScreenInstallation:'NOT TESTED'};
 fs.writeFileSync('docs/phase-3/pwa-qa.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify(report,null,2));
})().catch(error=>{console.error('PWA browser QA failed:', error.message);process.exit(1)});
