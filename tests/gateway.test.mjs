import test from 'node:test';
import assert from 'node:assert/strict';
import { supabaseGateway } from '../src/integrations/supabase/gateway.ts';
const gatewayFor = error => supabaseGateway({storage:{from:()=>({upload:async()=>({error})})}});
test('Storage duplicate 400/409 allows immutable retry to continue to verified finalization',async()=>{
 for(const statusCode of ['400','409'])await gatewayFor({statusCode,message:'The resource already exists'}).upload('reserved/path',new Blob(['x'],{type:'image/png'}));
});
test('Storage rejects permission, MIME and network errors without masking them as retries',async()=>{
 for(const error of [{statusCode:'403',message:'Permission denied'},{statusCode:'400',message:'Invalid MIME type'},{statusCode:'409',message:'Resource locked'}])await assert.rejects(gatewayFor(error).upload('reserved/path',new Blob(['x'])),/Tải ảnh thất bại/);
});
