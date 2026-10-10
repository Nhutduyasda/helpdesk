const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/nhutd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
 fs.mkdirSync('public/icons',{recursive:true});
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:512,height:512},deviceScaleFactor:1});
 for(const size of [192,512]){
  await page.setViewportSize({width:size,height:size});
  // Code-native ticket glyph consistent with the existing monochrome icon system.
  await page.setContent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}"><rect width="512" height="512" rx="96" fill="#171717"/><g transform="translate(136 136) scale(10)" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a3 3 0 0 1 0-6V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z"/><path d="M13 5v2m0 4v2m0 4v2"/></g></svg><style>html,body{margin:0}</style>`);
  await page.screenshot({path:`public/icons/itcare-${size}.png`});
 }
 fs.copyFileSync('public/icons/itcare-512.png','public/icons/itcare-maskable-512.png');
 await browser.close();console.log('PWA icons generated from the existing ticket glyph.');
})().catch(()=>{console.error('Icon generation failed.');process.exit(1)});
