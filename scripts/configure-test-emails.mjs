import {loadEnv} from 'vite';
import {createClient} from '@supabase/supabase-js';
import {appendFile} from 'node:fs/promises';
const env=loadEnv('development',process.cwd(),'');
const emails=JSON.parse(process.env.ITCARE_CANDIDATE_EMAILS || '[]');
const used=new Set();
for(const label of ['A','B']){
 let match;
 for(const email of emails){
  if(used.has(email))continue;
  const client=createClient(env.VITE_SUPABASE_URL,env.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await client.auth.signInWithPassword({email,password:env[`ITCARE_TEST_${label}_PASSWORD`]});
  if(!error && data.user){match=email;await client.auth.signOut();break;}
 }
 if(!match)throw new Error(`Test account ${label}: no matching login`);
 used.add(match);
 await appendFile('.env.local',`\nITCARE_TEST_${label}_EMAIL=${match}\n`);
 console.log(`Test account ${label}: login verified, local email configured`);
}
