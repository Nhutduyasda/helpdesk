import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
const db = new PGlite();
const a = '00000000-0000-4000-8000-000000000001',
  b = '00000000-0000-4000-8000-000000000002',
  it = '00000000-0000-4000-8000-000000000003',
  inactive = '00000000-0000-4000-8000-000000000004';
let ticketA, ticketB;
async function asUser(id, fn, role = 'authenticated') {
  await db.exec(
    `begin; set local role ${role}; select set_config('request.jwt.claim.sub','${id || ''}',true);`,
  );
  try {
    const result = await fn();
    await db.exec('commit');
    return result;
  } catch (e) {
    await db.exec('rollback');
    throw e;
  }
}
async function prepare(description, files = [], requestId = crypto.randomUUID()) {
  const r = await db.query('select (public.prepare_ticket($1,$2,$3::jsonb)).*', [
    requestId,
    description,
    JSON.stringify(files),
  ]);
  return r.rows[0];
}
async function change(id, input, op = crypto.randomUUID()) {
  return db.query('select public.update_ticket($1,$2,$3::jsonb)', [id, op, JSON.stringify(input)]);
}
before(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb default '{}',unique(bucket_id,name));
 alter table storage.objects enable row level security; grant usage on schema storage to authenticated,anon; grant select,insert,update,delete on storage.objects to authenticated;`);
  await db.exec(
    await readFile(
      new URL('../supabase/migrations/20261010075402_itcare_initial.sql', import.meta.url),
      'utf8',
    ),
  );
  await db.query('insert into auth.users(id) values($1),($2),($3),($4)', [a, b, it, inactive]);
  await db.query(
    "update public.profiles set active=true,full_name='Synthetic employee' where id<>$1",
    [inactive],
  );
  await db.query("update public.profiles set role='it' where id=$1", [it]);
  ticketA = await asUser(a, () => prepare('Employee A incident'));
  await asUser(a, () => db.query('select public.finalize_ticket($1)', [ticketA.id]));
  ticketB = await asUser(b, () =>
    prepare('Employee B incident', [
      { content_type: 'image/png', file_size: 10, sha256: 'a'.repeat(64) },
    ]),
  );
  const snapshotSQL = `select jsonb_build_object('tickets',(select jsonb_agg(to_jsonb(t)-array['reporter_name','reporter_department','reporter_location'] order by id) from public.tickets t),'attachments',(select jsonb_agg(to_jsonb(a) order by id) from public.ticket_attachments a),'events',(select jsonb_agg(to_jsonb(e) order by id) from public.ticket_events e),'profiles',(select jsonb_agg(to_jsonb(p) order by id) from public.profiles p)) as snapshot`;
  const beforeMigration = (await db.query(snapshotSQL)).rows[0].snapshot;
  await db.exec(await readFile(new URL('../supabase/migrations/20261013023844_public_incident_intake.sql', import.meta.url), 'utf8'));
  await db.exec(await readFile(new URL('../supabase/migrations/20261013031245_intake_availability_hardening.sql', import.meta.url), 'utf8'));
  const afterMigration = (await db.query(snapshotSQL)).rows[0].snapshot;
  assert.deepEqual(afterMigration, beforeMigration, 'Additive migration preserves every existing row value');
});
after(() => db.close());
test('A: employee reads own submitted ticket but not another employee draft', async () => {
  const rows = await asUser(a, () => db.query('select * from public.tickets'));
  assert.equal(rows.rows.length, 1);
  assert.equal(rows.rows[0].id, ticketA.id);
});
test('B: reserved upload path is private and rejects guessed/cross-owner uploads', async () => {
  const attachment = (await asUser(b, () => db.query('select * from public.ticket_attachments')))
    .rows[0];
  await assert.rejects(
    asUser(a, () =>
      db.query("insert into storage.objects(bucket_id,name) values('incident-photos',$1)", [
        attachment.storage_path,
      ]),
    ),
    /row-level security/,
  );
  await assert.rejects(
    asUser(b, () =>
      db.query("insert into storage.objects(bucket_id,name) values('incident-photos','guessed')"),
    ),
    /row-level security/,
  );
  await asUser(b, () =>
    db.query(
      "insert into storage.objects(bucket_id,name,metadata) values('incident-photos',$1,$2::jsonb)",
      [attachment.storage_path, JSON.stringify({ size: 10, mimetype: 'image/png' })],
    ),
  );
  assert.equal((await asUser(a, () => db.query('select * from storage.objects'))).rows.length, 0);
  assert.equal(
    (await asUser(it, () => db.query('select * from storage.objects'))).rows.length,
    0,
    'IT cannot inspect unfinished drafts',
  );
  await asUser(b, () => db.query('select public.finalize_ticket($1)', [ticketB.id]));
  assert.equal((await asUser(it, () => db.query('select * from storage.objects'))).rows.length, 1);
  assert.equal((await asUser(a, () => db.query('select * from storage.objects'))).rows.length, 0);
});
test('C/D/J: browser cannot change ownership, status, role, history or disable accounts directly', async () => {
  for (const sql of [
    "update public.tickets set employee_id='" + a + "'",
    "update public.profiles set role='it'",
    'delete from public.ticket_events',
    "update public.ticket_events set event_type='tampered'",
  ]) {
    await assert.rejects(
      asUser(a, () => db.exec(sql)),
      /permission denied/,
    );
  }
  await assert.rejects(
    asUser(a, () => change(ticketA.id, { status: 'resolved', resolution: 'fake' })),
    /IT role required/,
  );
  await assert.rejects(
    asUser(a, () => db.query('select public.set_employee_active($1,false)', [b])),
    /IT role required/,
  );
});
test('E: inactive user cannot query business data or invoke mutations', async () => {
  assert.equal(
    (await asUser(inactive, () => db.query('select * from public.tickets'))).rows.length,
    0,
  );
  await assert.rejects(
    asUser(inactive, () => prepare('x')),
    /inactive/,
  );
});
test('F/M: IT can read all submitted tickets and update atomically; comments/events are IT-only', async () => {
  assert.equal((await asUser(it, () => db.query('select * from public.tickets'))).rows.length, 2);
  await asUser(it, () => change(ticketA.id, { status: 'acknowledged', reply: 'IT received' }));
  await asUser(it, () => change(ticketA.id, { status: 'in_progress', support_method: 'remote' }));
  await assert.rejects(asUser(a, () => change(ticketA.id, { reply: 'Thank you' })), /IT role required/);
  assert.equal(
    (await asUser(a, () => db.query('select * from public.ticket_comments'))).rows.length,
    0,
  );
  assert.equal(
    (await asUser(b, () => db.query('select * from public.ticket_comments'))).rows.length,
    0,
  );
  assert.equal(
    (
      await asUser(b, () =>
        db.query('select * from public.ticket_events where ticket_id=$1', [ticketA.id]),
      )
    ).rows.length,
    0,
  );
});
test('G: unauthenticated roles have no table/RPC access', async () => {
  await assert.rejects(
    asUser(null, () => db.exec('select * from public.tickets'), 'anon'),
    /permission denied/,
  );
  await assert.rejects(
    asUser(null, () => prepare('x'), 'anon'),
    /permission denied/,
  );
});
test('H: repeated request IDs and operation IDs do not duplicate records', async () => {
  const id = crypto.randomUUID();
  const first = await asUser(a, () => prepare('Retry incident', [], id));
  const second = await asUser(a, () => prepare('Retry incident', [], id));
  assert.equal(first.id, second.id);
  await assert.rejects(
    asUser(a, () => prepare('Changed', [], id)),
    /content changed/,
  );
  const op = crypto.randomUUID();
  await asUser(it, () => change(ticketA.id, { reply: 'Once only' }, op));
  await asUser(it, () => change(ticketA.id, { reply: 'Once only' }, op));
  assert.equal(
    (
      await asUser(it, () =>
        db.query("select * from public.ticket_comments where message='Once only'"),
      )
    ).rows.length,
    1,
  );
});
test('I: missing upload or wrong MIME/size cannot finalize; retry remains a draft', async () => {
  const t = await asUser(a, () =>
    prepare('', [{ content_type: 'image/png', file_size: 20, sha256: 'b'.repeat(64) }]),
  );
  await assert.rejects(
    asUser(a, () => db.query('select public.finalize_ticket($1)', [t.id])),
    /incomplete/,
  );
  const record = (
    await asUser(a, () => db.query('select * from public.tickets where id=$1', [t.id]))
  ).rows[0];
  assert.equal(record.submitted_at, null);
  const attachment = (
    await asUser(a, () =>
      db.query('select * from public.ticket_attachments where ticket_id=$1', [t.id]),
    )
  ).rows[0];
  await asUser(a, () =>
    db.query(
      'insert into storage.objects(bucket_id,name,metadata) values(\'incident-photos\',$1,\'{"size":21,"mimetype":"image/png"}\')',
      [attachment.storage_path],
    ),
  );
  await assert.rejects(
    asUser(a, () => db.query('select public.finalize_ticket($1)', [t.id])),
    /incomplete/,
  );
  assert.equal(
    (
      await asUser(a, () =>
        db.query('select * from public.ticket_events where ticket_id=$1', [t.id]),
      )
    ).rows.length,
    0,
  );
});
test('failed IT mutation rolls back comment and history; resolve then closed is read-only', async () => {
  const before = (
    await asUser(it, () =>
      db.query('select * from public.ticket_events where ticket_id=$1', [ticketA.id]),
    )
  ).rows.length;
  await assert.rejects(
    asUser(it, () => change(ticketA.id, { status: 'resolved', reply: 'Must rollback' })),
    /Resolution required/,
  );
  assert.equal(
    (
      await asUser(it, () =>
        db.query("select * from public.ticket_comments where message='Must rollback'"),
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await asUser(it, () =>
        db.query('select * from public.ticket_events where ticket_id=$1', [ticketA.id]),
      )
    ).rows.length,
    before,
  );
  await asUser(it, () =>
    change(ticketA.id, { status: 'resolved', resolution: 'Synthetic repair' }),
  );
  await asUser(it, () => change(ticketA.id, { status: 'closed' }));
  await assert.rejects(
    asUser(it, () => change(ticketA.id, { reply: 'Closed reply' })),
    /read-only/,
  );
  await assert.rejects(
    asUser(it, () => change(ticketA.id, { status: 'in_progress' })),
    /read-only/,
  );
});
test('account deactivation is enforced immediately even with an existing user identity', async () => {
  await asUser(it, () => db.query('select public.set_employee_active($1,false)', [b]));
  assert.equal((await asUser(b, () => db.query('select * from public.tickets'))).rows.length, 0);
  assert.equal((await asUser(b, () => db.query('select * from storage.objects'))).rows.length, 0);
  await assert.rejects(
    asUser(b, () => change(ticketB.id, { reply: 'denied' })),
    /Not authorized|IT role required/,
  );
});
test('private bucket, size/type limits and all business tables have RLS enabled', async () => {
  const buckets = await db.query('select * from storage.buckets');
  assert.equal(buckets.rows[0].public, false);
  assert.equal(Number(buckets.rows[0].file_size_limit), 5242880);
  const r = await db.query(
    "select relname,relrowsecurity from pg_class where relname in ('profiles','tickets','ticket_attachments','ticket_comments','ticket_events')",
  );
  assert.equal(r.rows.length, 5);
  assert(r.rows.every((x) => x.relrowsecurity));
});

test('A: other employee submitted ticket is hidden, not just their draft', async () => {
  assert.equal((await asUser(a, () => db.query('select * from public.tickets where id=$1', [ticketB.id]))).rows.length, 0);
});

test('metadata cannot provision IT privileges; distinct requests have unique server numbers', async () => {
  const id=crypto.randomUUID();
  await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2::jsonb)',[id,JSON.stringify({role:'it',active:true,full_name:'Synthetic attacker'})]);
  const profile=(await db.query('select role,active from public.profiles where id=$1',[id])).rows[0];
  assert.deepEqual(profile,{role:'employee',active:false});
  const first=await asUser(a,()=>prepare('Distinct request 1'));
  const second=await asUser(a,()=>prepare('Distinct request 2'));
  assert.notEqual(first.id,second.id);assert.notEqual(first.ticket_number,second.ticket_number);
});

const publicRequest = crypto.randomUUID(), publicHash = 'b'.repeat(64);
let publicTicket;
async function publicPrepare(id=publicRequest,hash=publicHash,files=[]) {
 return db.query('select public.prepare_public_ticket($1,$2,$3,$4,$5,$6,$7::jsonb) as value',[id,hash,'Synthetic public reporter','Synthetic QA','Desk QA',files.length ? '' : 'Public incident',JSON.stringify(files)]);
}
test('Phase 5: only server can reserve; retry is stable and changed content rejected', async () => {
 for (const role of ['anon','authenticated']) await assert.rejects(asUser(a,()=>publicPrepare(),role),/permission denied/);
 const first = await asUser(null,()=>publicPrepare(),'service_role'); publicTicket=first.rows[0].value;
 const retry=await asUser(null,()=>publicPrepare(),'service_role'); assert.equal(retry.rows[0].value.id,publicTicket.id);
 await assert.rejects(asUser(null,()=>publicPrepare(publicRequest,'c'.repeat(64)),'service_role'),/Retry content changed/);
 await asUser(null,()=>db.query('select public.finalize_public_ticket($1,$2)',[publicRequest,publicHash]),'service_role');
 await asUser(null,()=>db.query('select public.finalize_public_ticket($1,$2)',[publicRequest,publicHash]),'service_role');
 assert.equal((await db.query("select count(*)::int as n from public.ticket_events where ticket_id=$1 and event_type='submitted'",[publicTicket.id])).rows[0].n,1);
});
test('Phase 5: anonymous cannot list/read/write tickets or invoke IT operations', async () => {
 for(const table of ['tickets','profiles','ticket_attachments','ticket_comments','ticket_events']) {
  await assert.rejects(asUser(null,()=>db.query(`select * from public.${table}`),'anon'),/permission denied/);
  await assert.rejects(asUser(null,()=>db.query(`delete from public.${table}`),'anon'),/permission denied/);
 }
 await assert.rejects(asUser(null,()=>db.query('update public.tickets set description=$1 where id=$2',['attack',publicTicket.id]),'anon'),/permission denied/);
 await assert.rejects(asUser(null,()=>change(publicTicket.id,{status:'acknowledged'}),'anon'),/permission denied/);
 await assert.rejects(asUser(a,()=>change(publicTicket.id,{reply:'attack'})),/IT role required/);
 assert.equal((await asUser(a,()=>db.query('select id from public.tickets where id=$1',[publicTicket.id]))).rows.length,0);
});
test('Phase 5: Admin receives public submission, lifecycle works and old ownership is intact', async () => {
 const rows=await asUser(it,()=>db.query('select * from public.tickets where id=$1',[publicTicket.id])); assert.equal(rows.rows[0].reporter_location,'Desk QA');
 for(const changes of [{status:'acknowledged'},{status:'in_progress',support_method:'remote'},{status:'in_progress',support_method:'onsite'},{status:'resolved',resolution:'Synthetic resolution'},{status:'closed'}]) await asUser(it,()=>change(publicTicket.id,changes));
 const old=await db.query('select employee_id from public.tickets where id=$1',[ticketA.id]); assert.equal(old.rows[0].employee_id,a);
 const events=await asUser(it,()=>db.query("select * from public.ticket_events where ticket_id=$1 and event_type='submitted'",[publicTicket.id])); assert.equal(events.rows[0].actor_id,null);
});
test('Phase 5: image-only finalization waits for private object; employee and anon cannot read it', async () => {
 const id=crypto.randomUUID(); const result=await asUser(null,()=>publicPrepare(id,publicHash,[{content_type:'image/png',file_size:8,sha256:'d'.repeat(64)}]),'service_role');
 const t=result.rows[0].value,path=t.attachments[0].path;
 await assert.rejects(asUser(null,()=>db.query('select public.finalize_public_ticket($1,$2)',[id,publicHash]),'service_role'),/Attachments incomplete/);
 await db.query("insert into storage.objects(bucket_id,name,metadata) values('incident-photos',$1,$2::jsonb)",[path,JSON.stringify({size:8,mimetype:'image/png'})]);
 await asUser(null,()=>db.query('select public.finalize_public_ticket($1,$2)',[id,publicHash]),'service_role');
 assert.equal((await asUser(a,()=>db.query('select * from storage.objects where name=$1',[path]))).rows.length,0);
 await assert.rejects(asUser(null,()=>db.query('select * from storage.objects where name=$1',[path]),'anon'),/permission denied/);
 assert.equal((await asUser(it,()=>db.query('select * from storage.objects where name=$1',[path]))).rows.length,1);
});
test('Phase 5: layered ingress limiter is persistent and server-only',async()=>{
 for(const role of ['anon','authenticated']) await assert.rejects(asUser(null,()=>db.query('select public.intake_precheck()'),role),/permission denied/);
 await assert.rejects(asUser(null,()=>db.query("select public.intake_allow('qa')"),'service_role'),/permission denied/);
 for(let i=0;i<120;i++) assert.equal((await asUser(null,()=>db.query('select public.intake_precheck() as allowed'),'service_role')).rows[0].allowed,true);
 assert.equal((await asUser(null,()=>db.query('select public.intake_precheck() as allowed'),'service_role')).rows[0].allowed,false);
 await db.exec("update itcare_private.intake_limits set window_start=now()-interval '1 minute' where bucket='ingress:minute'; update itcare_private.intake_limits set attempts=1000 where bucket='ingress:hour';");
 assert.equal((await asUser(null,()=>db.query('select public.intake_precheck() as allowed'),'service_role')).rows[0].allowed,false);
});
test('Phase 5: only new reservations use office capacity; retries work at capacity and invalid input rolls back',async()=>{
 const count=()=>db.query("select attempts from itcare_private.intake_limits where bucket='verified:hour'");
 const before=(await count()).rows[0].attempts;
 await asUser(null,()=>publicPrepare(),'service_role');assert.equal((await count()).rows[0].attempts,before);
 await assert.rejects(asUser(null,()=>publicPrepare(crypto.randomUUID(),publicHash,[{content_type:'image/svg+xml',file_size:1,sha256:'d'.repeat(64)}]),'service_role'),/Invalid attachment/);
 assert.equal((await count()).rows[0].attempts,before);
 await db.exec("update itcare_private.intake_limits set attempts=9 where bucket='verified:hour'");
 const id=crypto.randomUUID();await asUser(null,()=>publicPrepare(id),'service_role');assert.equal((await count()).rows[0].attempts,10);
 await assert.rejects(asUser(null,()=>publicPrepare(crypto.randomUUID()),'service_role'),/Intake capacity reached/);
 assert.equal((await count()).rows[0].attempts,10);
 await asUser(null,()=>publicPrepare(id),'service_role');assert.equal((await count()).rows[0].attempts,10);
 await db.exec("update itcare_private.intake_limits set window_start=now()-interval '1 hour' where bucket='verified:hour'");
 await asUser(null,()=>publicPrepare(crypto.randomUUID()),'service_role');assert.equal((await count()).rows[0].attempts,1);
});
