// Real local workerd, simulated Supabase/Turnstile. No outbound/live calls.
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../node_modules/.phase6-tools/package.json', import.meta.url));
const { Miniflare } = require('miniflare');
const { build } = require('esbuild');
const bundle = await build({ entryPoints: ['scripts/phase6-feasibility-worker.ts'], bundle: true, write: false, format: 'esm', platform: 'browser' });
const mf = new Miniflare({ modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-08-06', inspectorPort: 9238,
  outboundService: () => new Response('Local probe prohibits external HTTP', { status: 403 }),
});
let socket;
try {
  await mf.ready;
  const targets = await (await fetch('http://127.0.0.1:9238/json/list')).json();
  socket = new WebSocket(targets.find(t => t.id === 'core:user:').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) { const p = pending.get(message.id); pending.delete(message.id); if (message.error) p.reject(new Error(JSON.stringify(message.error))); else p.resolve(message.result); }
  });
  const command = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; const timer = setTimeout(() => reject(new Error(`Inspector timed out: ${method}`)), 10000); pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } }); socket.send(JSON.stringify({ id, method, params })); });
  await command('Runtime.enable');
  await command('Profiler.enable');
  await command('Profiler.setSamplingInterval', { interval: 100 });
  const cases = [];
  for (const [count, size] of [[0, 0], [1, 65536], [3, 65536], [1, 5242880], [3, 5242880]]) {
    const repetitions = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      const body = new FormData();
      for (const [key, value] of Object.entries({ name: 'S'.repeat(120), department: 'Synthetic QA', location: 'L'.repeat(200), description: 'D'.repeat(2000), requestId: crypto.randomUUID(), token: 'synthetic' })) body.append(key, value);
      for (let i = 0; i < count; i++) {
        const bytes = new Uint8Array(size);
        bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
        body.append('photos', new Blob([bytes], { type: 'image/png' }), 'synthetic.png');
      }
      const input = new Request('https://office.test/api/intake', { method: 'POST', headers: { origin: 'https://office.test' }, body });
      const payload = new Uint8Array(await input.arrayBuffer());
      const heapBefore = await command('Runtime.getHeapUsage');
      await command('Profiler.start');
      const start = performance.now();
      const response = await mf.dispatchFetch(input.url, { method: 'POST', headers: input.headers, body: payload });
      const result = await response.json();
      const wallMs = performance.now() - start;
      const { profile } = await command('Profiler.stop');
      const heapAfter = await command('Runtime.getHeapUsage');
      assert.equal(result.status, 200);
      assert.equal(result.uploads, count);
      assert.deepEqual(result.calls, ['intake_precheck', 'prepare_public_ticket', 'finalize_public_ticket']);
      const nodes = new Map(profile.nodes.map(n => [n.id, n]));
      let activeSampleUs = 0;
      const byFunctionUs = {};
      for (let i = 0; i < (profile.samples || []).length; i++) {
        const name = nodes.get(profile.samples[i])?.callFrame.functionName;
        if (!['(idle)', '(program)', '(root)'].includes(name)) {
          activeSampleUs += profile.timeDeltas[i];
          const label = name || '(anonymous)';
          byFunctionUs[label] = (byFunctionUs[label] || 0) + profile.timeDeltas[i];
        }
      }
      repetitions.push({ payloadBytes: payload.length, wallMs, sampledActiveMs: activeSampleUs / 1000, byFunctionUs, heapBefore, heapAfter, status: result.status, uploads: result.uploads });
    }
    cases.push({ images: count, bytesPerImage: size, repetitions });
  }
  const report = { runtime: require('miniflare/package.json').version, workerd: require('workerd/package.json').version, esbuild: require('esbuild/package.json').version, compatibilityDate: '2026-08-06', platform: process.platform, node: process.version, backend: 'in-memory synthetic gateway/verifier; upload records lengths only, no byte copies; no real HTTP dependency evidence', measurement: 'Inspector CPU sampling excludes idle/program/root. Sample estimate is not Cloudflare billed CPU. Heap/backing storage snapshots share one isolate with natural GC, not total isolate peak or per-request memory. Local runtime does not enforce the hosted Free CPU limit.', cases };
  await writeFile('docs/phase-6/feasibility-results.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { socket?.close(); await mf.dispose(); }
