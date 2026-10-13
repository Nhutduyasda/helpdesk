const { browserOptions, outputDirectory, playwright } = require('./qa-runtime.cjs');
const { chromium } = playwright();
const qaOutput = outputDirectory();
const base = process.env.LIVE_QA_URL || 'http://127.0.0.1:5174';
const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{
 const {loadEnv}=await import('vite');const env=loadEnv('development',process.cwd(),'');
 const browser=await chromium.launch(browserOptions());const report={checks:[],exceptions:0};let step='employee login';
 const pass=name=>report.checks.push({name,status:'PASSED'});
 try{
  const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();page.on('pageerror',()=>report.exceptions++);
  await page.goto(base + '/login');
  await page.getByLabel('Tên đăng nhập / email').fill(env.ITCARE_TEST_A_EMAIL);await page.getByLabel('Mật khẩu',{exact:true}).fill(env.ITCARE_TEST_A_PASSWORD);
  await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL('**/employee');pass(step);
  await page.goto(base + '/employee/report');
  step='invalid and oversized images';await page.getByLabel('Chọn ảnh có sẵn').setInputFiles({name:'invalid.txt',mimeType:'text/plain',buffer:Buffer.from('synthetic invalid')});
  await page.getByRole('alert').filter({hasText:'Chọn tối đa 3 ảnh'}).waitFor();
  await page.getByLabel('Chọn ảnh có sẵn').setInputFiles({name:'large.png',mimeType:'image/png',buffer:Buffer.alloc(5242881)});
  await page.getByRole('alert').filter({hasText:'Chọn tối đa 3 ảnh'}).waitFor();pass(step);
  step='offline form retained';await page.getByLabel('Mô tả (không bắt buộc nếu có ảnh)').fill('PHASE3 QA: browser offline retry');
  await page.getByLabel('Chọn ảnh có sẵn').setInputFiles('public/icons/itcare-192.png');await page.getByAltText('Ảnh sự cố 1',{exact:true}).waitFor();
  await context.setOffline(true);await page.getByRole('button',{name:'Gửi yêu cầu',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Mất kết nối'}).waitFor();assert.equal(await page.getByLabel('Mô tả (không bắt buộc nếu có ảnh)').inputValue(),'PHASE3 QA: browser offline retry');
  assert.equal(await page.getByAltText('Ảnh sự cố 1',{exact:true}).count(),1);await context.setOffline(false);pass(step);
  step='interrupted upload retry';let interrupted=false;await page.route('**/storage/v1/object/incident-photos/**',async route=>{if(route.request().method()==='POST'&&!interrupted){interrupted=true;await route.abort('failed');}else await route.continue();});
  await page.getByRole('button',{name:'Gửi yêu cầu',exact:true}).click();await page.getByRole('alert').filter({hasText:'Tải ảnh thất bại'}).waitFor();assert(interrupted);pass(step);
  step='successful retry and persistence';await page.getByRole('button',{name:'Gửi yêu cầu',exact:true}).click();await page.waitForURL('**/employee/submitted/*');
  await page.getByRole('heading',{name:'Đã gửi yêu cầu',exact:true}).waitFor();await page.reload();await page.getByRole('heading',{name:'Đã gửi yêu cầu',exact:true}).waitFor();pass(step);
  step='ticket detail';await page.locator('a[href]').filter({hasText:'Xem chi tiết yêu cầu'}).click();await page.getByText('PHASE3 QA: browser offline retry',{exact:true}).waitFor();
  await page.getByAltText('Ảnh sự cố 1',{exact:true}).evaluate(image=>image.decode());
  assert(await page.getByAltText('Ảnh sự cố 1',{exact:true}).evaluate(image=>image.naturalWidth>0));pass('Authorized private image decodes in browser after refresh');
  const ticketURL=page.url();await page.screenshot({path:qaOutput + '/screenshots/live-employee-ticket-390.png',fullPage:true,mask:[page.locator('header'),page.locator('[data-slot="card"]').first().locator('p').first()]});
  step='B direct UI denied';const b=await browser.newPage();await b.goto(base + '/login');await b.getByLabel('Tên đăng nhập / email').fill(env.ITCARE_TEST_B_EMAIL);await b.getByLabel('Mật khẩu',{exact:true}).fill(env.ITCARE_TEST_B_PASSWORD);await b.getByRole('button',{name:'Đăng nhập',exact:true}).click();await b.waitForURL('**/employee');await b.goto(ticketURL);
  await b.getByRole('heading',{name:'Không tìm thấy yêu cầu',exact:true}).waitFor();pass(step);
  step='logout protected route';await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();await page.waitForURL('**/login');await page.goto(ticketURL);await page.waitForURL('**/login');pass(step);
  assert.equal(report.exceptions,0);report.passed=true;
 }catch(error){report.passed=false;report.checks.push({name:step,status:'FAILED',error:'QA step failed; inspect locally without sharing credentials'});process.exitCode=1;}
 finally{await browser.close();fs.writeFileSync(qaOutput + '/live-browser.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
})();
