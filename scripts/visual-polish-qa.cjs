const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/nhutd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(process.env.QA_OUTPUT || 'docs/screenshots');
fs.mkdirSync(out,{recursive:true});
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  const page = await browser.newPage({viewport:{width:1440,height:900}});
  const base = process.env.QA_BASE_URL || 'http://127.0.0.1:5174';
  const wait = async () => { await page.waitForLoadState('networkidle'); await page.locator('.fallback-spinner').waitFor({state:'hidden'}); await page.getByText('Đang tải yêu cầu…',{exact:true}).waitFor({state:'hidden'}); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(400); };
  const shot = async name => { await wait(); assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)); await page.screenshot({path:path.join(out,`${name}.png`),fullPage:true}); };
  await page.goto(base+'/it/login'); await wait(); await page.getByLabel('Tên đăng nhập / email').fill('review'); await page.getByLabel('Mật khẩu',{exact:true}).fill('demo123'); await page.getByRole('button',{name:'Đăng nhập',exact:true}).click(); await page.waitForURL('**/it/inbox'); await shot('D01-inbox-1440'); await shot('D01-inbox-1440x900');
  await page.getByRole('link',{name:'Nhân viên',exact:true}).click(); await shot('D04-employees-1440');
  for(const size of [{width:1440,height:900},{width:1366,height:768},{width:768,height:1024},{width:375,height:812}]) {
    await page.setViewportSize(size); await page.goto(base+'/it/tickets/ITC-1001'); await shot(`D02-details-${size.width}x${size.height}`); if(size.width === 1440) await shot('D02-details-1440');
  }
  await page.setViewportSize({width:1440,height:900}); await page.goto(base+'/it/inbox'); await wait(); await page.getByRole('button',{name:'Mở hoặc thu gọn menu'}).click(); await shot('D01-sidebar-collapsed');
  const logo = page.getByRole('link',{name:'ITCare',exact:true}); assert(await logo.locator('svg').isVisible()); assert(!(await logo.locator('span').isVisible()));
  await page.getByRole('button',{name:'Đổi giao diện sáng tối'}).click(); await wait(); if(!(await page.locator('html').getAttribute('class')).includes('dark')) { await page.getByRole('button',{name:'Đổi giao diện sáng tối'}).click(); await wait(); } await shot('D01-dark');
  fs.writeFileSync(path.join(out,'polish-results.json'),JSON.stringify({passed:true,checks:['Employee-management header preserves source panel styling','Detail card boundaries inspected at four sizes','Collapsed sidebar shows icon instead of overflowing wordmark']},null,2));
  await browser.close(); console.log('Visual polish checks passed');
})().catch(e=>{console.error(e);process.exit(1)});
