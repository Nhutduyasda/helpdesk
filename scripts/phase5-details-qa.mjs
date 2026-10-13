// Actual Details component in Chromium; synthetic context, no backend or credentials.
import assert from 'node:assert/strict';
import { createServer, normalizePath } from 'vite';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const harnessId = normalizePath(process.cwd())+'/details-qa.tsx';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ||
  'C:/Users/nhutd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const harness = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route, Link } from 'react-router';
import { CareContext } from '/src/context/itcare/context.ts';
import { Details } from '/src/views/itcare/Desktop.tsx';
const tickets = ['A','B'].map(id => ({id, employeeId:'it', description:'Synthetic '+id,
  created:'2026-10-13T00:00:00Z', status:'Đang xử lý', photos:[], history:[], replies:[]}));
window.calls=[]; window.pending=[];
function Harness() {
  const [revision, refresh] = useState(0);
  const value={tickets:tickets.map(t=>({...t})),employees:[],user:{id:'it',role:'it',active:true},
    loading:false,error:null,demo:false,update:(id,input,operationId)=>new Promise((resolve,reject)=>{
      window.calls.push({id,input,operationId}); window.pending.push({resolve,reject});
    })};
  return <CareContext.Provider value={value}><MemoryRouter initialEntries={['/ticket/A']}>
    <Link to='/ticket/A'>Ticket A</Link><Link to='/ticket/B'>Ticket B</Link>
    <button onClick={()=>refresh(revision+1)}>Refresh same ticket</button>
    <Routes><Route path='/ticket/:id' element={<Details/>}/></Routes>
  </MemoryRouter></CareContext.Provider>;
}
createRoot(document.getElementById('root')).render(<Harness/>);
`;
const server = await createServer({ server:{host:'127.0.0.1',port:0}, plugins:[{
  name:'details-regression-harness',
  configureServer(server) {
    server.middlewares.use(async (req,res,next)=>{
      if(req.url==='/__details_qa') {
        res.setHeader('Content-Type','text/html');
        res.end(await server.transformIndexHtml(req.url, '<div id="root"></div><script type="module" src="/details-qa.tsx"></script>'));
      } else next();
    });
  },
  resolveId(id) { if(id==='/details-qa.tsx' || id===harnessId) return harnessId; },
  load(id) { if(id===harnessId) return harness; },
}] });
let browser;
const checks=[];
try {
  await server.listen();
  browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>{errors.push(e.message); console.error('Harness error: '+e.message);});
  await page.goto(server.resolvedUrls.local[0]+'__details_qa');
  const reply=page.locator('#reply'), resolution=page.locator('#resolution');
  const send=page.getByRole('button',{name:'Gửi phản hồi',exact:true});
  const navigate=async id=>{await page.getByRole('link',{name:'Ticket '+id,exact:true}).click();await page.getByRole('heading',{name:id,exact:true}).waitFor();};
  await resolution.fill('Unsaved resolution A'); await reply.fill('Unsaved reply A');
  await page.getByRole('button',{name:'Refresh same ticket'}).click();
  assert.equal(await resolution.inputValue(),'Unsaved resolution A');
  assert.equal(await reply.inputValue(),'Unsaved reply A');
  checks.push('Same-ticket data refresh preserves both unsaved drafts');
  await navigate('B');
  assert.equal(await resolution.inputValue(),''); assert.equal(await reply.inputValue(),'');
  assert(await page.getByRole('button',{name:'Đánh dấu đã giải quyết'}).isDisabled());
  await navigate('A'); assert.equal(await reply.inputValue(),'');
  checks.push('A → B → A resets drafts and prevents stale-resolution submission');
  await reply.fill('Pending A'); await send.click();
  assert(await reply.isDisabled());
  await navigate('B'); await reply.fill('Pending B'); await send.click();
  await page.evaluate(()=>window.pending[0].resolve());
  assert.equal(await reply.inputValue(),'Pending B'); assert(await reply.isDisabled());
  await page.evaluate(()=>window.pending[1].reject(new Error('B synthetic failure')));
  await page.getByRole('alert').waitFor();
  const calls=await page.evaluate(()=>window.calls);
  assert.deepEqual(calls.map(c=>c.id),['A','B']);
  assert.notEqual(calls[0].operationId,calls[1].operationId);
  await send.click();
  const retry=await page.evaluate(()=>window.calls[2]);
  assert.equal(retry.operationId,calls[1].operationId);
  checks.push('Pending A success cannot clear B draft/unlock B; B retry preserves operation ID');
  await navigate('A'); await reply.fill('Fresh A');
  await page.evaluate(()=>window.pending[2].reject(new Error('Late B failure')));
  assert.equal(await page.getByRole('alert').count(),0); assert.equal(await reply.inputValue(),'Fresh A');
  assert(await send.isEnabled()); await send.click();
  const fresh=await page.evaluate(()=>window.calls[3]);
  assert.equal(fresh.id,'A'); assert.notEqual(fresh.operationId,calls[0].operationId);
  await page.evaluate(()=>window.pending[3].reject(new Error('A synthetic failure')));
  await page.getByRole('alert').waitFor(); await navigate('B');
  assert.equal(await page.getByRole('alert').count(),0); assert.equal(await reply.inputValue(),'');
  checks.push('Late failure cannot set another ticket error; navigation clears error and operation refs');
  assert.deepEqual(errors,[]);
  const report={passed:true,checks,backend:'synthetic context; actual React component and browser'};
  await mkdir('docs/phase-5/final-acceptance',{recursive:true});
  await writeFile('docs/phase-5/final-acceptance/details-browser.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
} finally { await browser?.close(); await server.close(); }
