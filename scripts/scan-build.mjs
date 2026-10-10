import {loadEnv} from 'vite';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const env=loadEnv('production',process.cwd(),'');
const files=(await readdir('dist/assets')).filter(f=>f.endsWith('.js'));
const privateValues=Object.entries(env).filter(([key,value])=>value && !key.startsWith('VITE_') && /ITCARE_TEST_|VAPID_PRIVATE|SERVICE_ROLE|SUPABASE_SECRET|CLOUDFLARE_/.test(key)).map(([,value])=>value);
for(const file of files){
 const source=await readFile('dist/assets/'+file,'utf8');
 assert(!/demo123|itcare-session|sb_secret_[A-Za-z0-9_-]{20,}/.test(source),'Forbidden demo/secret pattern in compiled artifact');
 assert(!privateValues.some(value=>source.includes(value)),'Private test/server credential in compiled artifact');
}
const report={passed:true,jsFiles:files.length,checks:['No demo credential/session shortcut','No secret key pattern','No configured server/test credential values'],publicSupabaseConfigExpected:true};
await writeFile('docs/phase-3/build-scan.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
