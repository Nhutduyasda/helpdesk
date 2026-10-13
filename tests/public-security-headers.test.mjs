import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('public intake headers keep geolocation blocked and private content uncached',async()=>{
 const headers=await readFile(new URL('../public/_headers',import.meta.url),'utf8');
 assert(headers.includes('Cache-Control: no-store'));
 assert(headers.includes('geolocation=()'));
 assert(headers.includes("frame-src https://challenges.cloudflare.com"));
 assert(headers.includes("script-src 'self' https://challenges.cloudflare.com"));
 assert(headers.includes("object-src 'none'"));
 const worker=await readFile(new URL('../public/itcare-sw.js',import.meta.url),'utf8');
 assert(worker.includes("event.request.method !== 'GET' || url.origin !== self.location.origin"));
 assert(!worker.includes("'/report'"));
 assert(worker.includes("self.clients.openWindow('/it/login')"));
});
