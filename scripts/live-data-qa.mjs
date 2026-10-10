import {loadEnv} from 'vite';
import {createClient} from '@supabase/supabase-js';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {supabaseGateway} from '../src/integrations/supabase/gateway.ts';
import {createCareService} from '../src/services/itcare/service.ts';
const env=loadEnv('development',process.cwd(),'');
const report={mode:'live',checks:[]};let step='login';const clients={};
const pass=name=>report.checks.push({name,status:'PASSED'});
try{
 for(const label of ['A','B','IT']){
  const c=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await c.auth.signInWithPassword({email:env[`ITCARE_TEST_${label}_EMAIL`],password:env[`ITCARE_TEST_${label}_PASSWORD`]});
  assert(!error&&data.user);clients[label]={c,id:data.user.id,g:supabaseGateway(c)};
  const p=await c.from('profiles').select('role,active').eq('id',data.user.id).single();
  assert.equal(p.data?.role,label==='IT'?'it':'employee');assert.equal(p.data?.active,true);
 }pass('A/B/IT real login and active roles');
 const {A,B,IT}=clients;const service=createCareService(A.g);
 step='description ticket';const request=crypto.randomUUID();
 const description='PHASE3 QA: synthetic description '+request;
 const [ticket,duplicate]=await Promise.all([service.create(description,[],request),service.create(description,[],request)]);
 assert.equal(ticket.id,duplicate.id);assert(ticket.submitted_at);pass('Description ticket persists; concurrent duplicate is idempotent');
 step='photo ticket';const image=(await readFile('public/icons/itcare-192.png')).toString('base64');
 const photo=await service.create('PHASE3 QA: synthetic image',['data:image/png;base64,'+image],crypto.randomUUID());
 const attachments=(await A.g.attachments()).filter(x=>x.ticket_id===photo.id);assert.equal(attachments.length,1);assert(attachments[0].ready);pass('Private image upload and verified finalization');
 step='cross-owner';for(const table of ['tickets','ticket_comments','ticket_events','ticket_attachments']){
  const result=await B.c.from(table).select('*').eq(table==='tickets'?'id':'ticket_id',photo.id);assert(!result.error);assert.equal(result.data.length,0);
 }
 const denied=await B.c.storage.from('incident-photos').createSignedUrl(attachments[0].storage_path,60);assert(denied.error);pass('B cannot read A ticket, comments, history, metadata or generate image URL');
 assert((await B.c.rpc('finalize_ticket',{p_ticket_id:photo.id})).error);
 assert((await A.c.rpc('update_ticket',{p_ticket_id:ticket.id,p_operation_id:crypto.randomUUID(),p_changes:{status:'resolved'}})).error);
 assert((await A.c.from('profiles').update({role:'it'}).eq('id',A.id)).error);pass('Employee cannot mutate IT status, another owner ticket or own role');
 step='IT workflow';await IT.g.change(ticket.id,crypto.randomUUID(),{status:'acknowledged'});
 await IT.g.change(ticket.id,crypto.randomUUID(),{support_method:'remote'});
 const operation=crypto.randomUUID();await IT.g.change(ticket.id,operation,{reply:'PHASE3 QA: synthetic IT reply'});await IT.g.change(ticket.id,operation,{reply:'PHASE3 QA: synthetic IT reply'});
 await IT.g.change(ticket.id,crypto.randomUUID(),{status:'resolved',resolution:'PHASE3 QA: synthetic resolution'});
 const refreshed=(await service.list()).find(x=>x.databaseId===ticket.id);assert.equal(refreshed.replies.length,1);assert.equal(refreshed.resolution,'PHASE3 QA: synthetic resolution');
 assert.equal((await A.c.from('ticket_comments').select('id').eq('ticket_id',ticket.id)).data.length,1);
 assert.equal((await B.c.from('ticket_comments').select('id').eq('ticket_id',ticket.id)).data.length,0);
 pass('IT acknowledge, method, reply deduplication and resolution visible to A');
 await IT.g.change(ticket.id,crypto.randomUUID(),{status:'closed'});
 assert((await IT.c.rpc('update_ticket',{p_ticket_id:ticket.id,p_operation_id:crypto.randomUUID(),p_changes:{reply:'Must reject closed'}})).error);pass('Closed ticket rejects subsequent changes');
 step='inactive existing session';
 const bPhoto=await createCareService(B.g).create('PHASE3 QA: B active baseline',['data:image/png;base64,'+image],crypto.randomUUID());
 const bPath=(await B.g.attachments()).find(x=>x.ticket_id===bPhoto.id).storage_path;
 assert((await B.g.tickets()).some(t=>t.id===bPhoto.id));
 assert(!(await B.c.storage.from('incident-photos').createSignedUrl(bPath,60)).error);
 await IT.g.setActive(B.id,false);
 try{
  assert.equal((await B.g.tickets()).length,0);
  assert((await B.c.rpc('prepare_ticket',{p_request_id:crypto.randomUUID(),p_description:'Must reject inactive',p_files:[]})).error);
  assert((await B.c.storage.from('incident-photos').createSignedUrl(bPath,60)).error);
 }finally{await IT.g.setActive(B.id,true);}
 assert((await B.g.tickets()).some(t=>t.id===bPhoto.id));
 pass('Deactivation blocks previously accessible own ticket/storage and RPC with existing JWT; reactivation restores access');
 step='signed URL expiry';const signed=await A.c.storage.from('incident-photos').createSignedUrl(attachments[0].storage_path,2);assert(!signed.error);
 assert.equal((await fetch(signed.data.signedUrl)).status,200);await new Promise(r=>setTimeout(r,3500));assert(!(await fetch(signed.data.signedUrl)).ok);pass('Signed URL works then expires');
 step='anonymous';const anon=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false}});
 assert((await anon.from('tickets').select('*')).error);assert((await anon.rpc('finalize_ticket',{p_ticket_id:photo.id})).error);pass('Anonymous direct API and RPC denied');
 report.testTicketNumbers=[ticket.ticket_number,photo.ticket_number];report.passed=true;
}catch{report.passed=false;report.checks.push({name:step,status:'FAILED'});process.exitCode=1;}
finally{for(const {c} of Object.values(clients))await c.auth.signOut();await writeFile('docs/phase-3/live-data.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}
