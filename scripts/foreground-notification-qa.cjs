const { browserOptions, outputDirectory, playwright } = require('./qa-runtime.cjs');
const { chromium } = playwright();
const qaOutput = outputDirectory();
const fs=require('node:fs');const assert=require('node:assert/strict');
(async()=>{const {loadEnv}=await import('vite');const {createClient}=await import('@supabase/supabase-js');const env=loadEnv('development',process.cwd(),'');const browser=await chromium.launch(browserOptions());const report={browserAPI:'NOT TESTED',physicalOSDelivery:'NOT TESTED',backgroundPush:'BLOCKED'};let client;
 try{
  const base=process.env.FOREGROUND_QA_URL || process.env.LIVE_QA_URL || 'http://127.0.0.1:5175';const context=await browser.newContext({permissions:['notifications']});const page=await context.newPage();await page.goto(base+'/it/login');await page.getByLabel('Tên đăng nhập / email').fill(env.ITCARE_TEST_IT_EMAIL);await page.getByLabel('Mật khẩu',{exact:true}).fill(env.ITCARE_TEST_IT_PASSWORD);await page.getByRole('button',{name:'Đăng nhập',exact:true}).click();await page.waitForURL('**/it/inbox');await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.getByRole('button',{name:/^Thông báo/}).click();await page.getByText('Đang tải thông báo…',{exact:true}).waitFor({state:'hidden'});await page.getByRole('button',{name:'Bật thông báo khi đang mở app',exact:true}).click();await page.getByRole('button',{name:'Tắt thông báo trên thiết bị',exact:true}).waitFor();
  client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});assert(!(await client.auth.signInWithPassword({email:env.ITCARE_TEST_A_EMAIL,password:env.ITCARE_TEST_A_PASSWORD})).error);
  const prepare=await client.rpc('prepare_ticket',{p_request_id:crypto.randomUUID(),p_description:'PHASE3 QA: foreground notification',p_files:[]});assert(!prepare.error);assert(!(await client.rpc('finalize_ticket',{p_ticket_id:prepare.data.id})).error);
  let notifications=[];
  for(let attempt=0;attempt<40&&!notifications.length;attempt++){
    notifications=await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration('/');return (await r.getNotifications()).map(n=>({title:n.title,body:n.body,tag:n.tag}));});
    if(!notifications.length)await new Promise(r=>setTimeout(r,500));
  }
  report.observedCount=notifications.length;report.titleMatches=notifications.every(n=>n.title==='ITCare');report.bodyMatches=notifications.every(n=>n.body==='Có cập nhật hỗ trợ mới. Mở ITCare để xem.');assert.equal(notifications.length,1);assert.equal(notifications[0].title,'ITCare');assert.equal(notifications[0].body,'Có cập nhật hỗ trợ mới. Mở ITCare để xem.');assert(!notifications[0].body.includes(prepare.data.ticket_number));
  let deliveriesAfterReload=0;page.on('console',message=>{if(message.text()==='ITCare foreground notification delivered')deliveriesAfterReload++;});
  await page.reload();await page.getByRole('button',{name:/^Thông báo/}).waitFor();await new Promise(r=>setTimeout(r,6000));assert.equal(deliveriesAfterReload,0);
  report.browserAPI='PASSED';report.genericPayload=true;report.reloadDeduplication=true;report.passed=true;
 }catch(error){report.passed=false;report.browserAPI='FAILED';report.error='QA step failed; inspect locally without sharing credentials';process.exitCode=1;}finally{if(client)await client.auth.signOut({scope:'local'});await browser.close();fs.writeFileSync(qaOutput + '/foreground-notification-qa.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
})();
