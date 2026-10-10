import {PGlite} from '@electric-sql/pglite';
import {readFile,writeFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();
try {
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb default '{}');`);
 const files=await readdir('supabase/migrations');
 const initial=files.find(f=>f.endsWith('_itcare.sql') || f.endsWith('_itcare_initial.sql'));
 await db.exec(await readFile('supabase/migrations/'+initial,'utf8'));
 const local=(await db.query(await readFile('scripts/schema-digest.sql','utf8'))).rows[0].digest;
 const remote=JSON.parse(await readFile('docs/phase-3/schema-remote.json','utf8'));
 assert.deepEqual(local,remote);
 await writeFile('docs/phase-3/schema-comparison.json',JSON.stringify({passed:true,initial,scope:Object.keys(local),digests:local},null,2));
 console.log('Initial migration matches live constraints, columns, function bodies, policies and enum values.');
} finally {await db.close();}
