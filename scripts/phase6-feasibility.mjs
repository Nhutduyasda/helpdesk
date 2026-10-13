// Real local workerd, simulated Supabase/Turnstile. No outbound/live calls.
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import assert from 'node:assert/strict';
const require = createRequire(new URL('../node_modules/.phase6-tools/package.json', import.meta.url));
const { Miniflare, convertV4MiniflareOptions } = require('miniflare');
const { build } = require('esbuild');
const handlerPath = resolve('supabase/functions/public-intake/handler.ts');
const instrument = (source) => {
  const edits = [
    ['const raw = await boundedBody(request);', "const raw = await __phase6Time('body_buffer', () => boundedBody(request));"],
    ['.formData();', ".formData());"], // expression is wrapped below, with checked source shape
    ['if (!validImage(photo.type, bytes))', "if (!(await __phase6Time('file_signature', () => validImage(photo.type, bytes))))"],
    ['sha256: await digest(bytes),', "sha256: await __phase6Time('file_hash', () => digest(bytes)),"],
    ['const hash = await digest(', "const hash = await __phase6Time('request_hash', () => digest("],
    ['const reservation = await client.rpc("prepare_public_ticket", {', "const reservation = await __phase6Time('reservation', () => client.rpc(\"prepare_public_ticket\", {"],
    ['const upload = await client.storage.from("incident-photos").upload(', "const upload = await __phase6Time('storage_upload', () => client.storage.from(\"incident-photos\").upload("],
    ['const existing = await client.storage.from("incident-photos")', "const existing = await __phase6Time('storage_retry_download', () => client.storage.from(\"incident-photos\")"],
    ['const receipt = await client.rpc("finalize_public_ticket", {', "const receipt = await __phase6Time('finalization', () => client.rpc(\"finalize_public_ticket\", {"],
  ];
  let transformed = source;
  const countOf = (value, needle) => value.split(needle).length - 1;
  for (const [needle, replacement] of edits.filter(([needle]) => needle !== '.formData();')) {
    assert.equal(countOf(transformed, needle), 1, `Instrumentation anchor must be unique: ${needle}`);
    transformed = transformed.replace(needle, replacement);
  }
  const multipartAnchor = 'const form = await new Request(request.url, {';
  assert.equal(countOf(transformed, multipartAnchor), 1);
  transformed = transformed.replace(multipartAnchor, "const form = await __phase6Time('multipart_parse', () => new Request(request.url, {");
  const closeForm = '      }).formData();';
  assert.equal(countOf(transformed, closeForm), 1);
  transformed = transformed.replace(closeForm, '      }).formData());');
  const closeHash = '        ),\n      );\n      const reservation =';
  assert.equal(countOf(transformed, closeHash), 1);
  transformed = transformed.replace(closeHash, '        ),\n      ));\n      const reservation =');
  const closeReservation = '        p_files: manifest,\n      });\n      if (reservation.error';
  assert.equal(countOf(transformed, closeReservation), 1);
  transformed = transformed.replace(closeReservation, '        p_files: manifest,\n      }));\n      if (reservation.error');
  const closeUpload = '            { contentType: blob.type, upsert: false },\n          );\n          if (upload.error';
  assert.equal(countOf(transformed, closeUpload), 1);
  transformed = transformed.replace(closeUpload, '            { contentType: blob.type, upsert: false },\n          ));\n          if (upload.error');
  const closeDownload = '              .download(a.path);\n            if (';
  assert.equal(countOf(transformed, closeDownload), 1);
  transformed = transformed.replace(closeDownload, '              .download(a.path));\n            if (');
  const closeFinalize = '        p_hash: hash,\n      });\n      if (receipt.error';
  assert.equal(countOf(transformed, closeFinalize), 1);
  transformed = transformed.replace(closeFinalize, '        p_hash: hash,\n      }));\n      if (receipt.error');
  const trailer = "\nasync function __phase6Time(label: string, operation: () => unknown) { const start = performance.now(); try { return await operation(); } finally { (globalThis as typeof globalThis & { __phase6Stages?: unknown[] }).__phase6Stages?.push({ label, ms: performance.now() - start }); } }\n";
  return trailer + transformed;
};
const bundle = await build({
  entryPoints: ['scripts/phase6-feasibility-worker.ts'], bundle: true, write: false, format: 'esm', platform: 'browser',
  plugins: [{ name: 'phase6-instrument-handler', setup(buildApi) {
    buildApi.onLoad({ filter: /handler\.ts$/ }, async (args) => {
      if (resolve(args.path) !== handlerPath) return;
      return { contents: instrument(await readFile(args.path, 'utf8')), loader: 'ts' };
    });
  } }],
});
const mf = new Miniflare(convertV4MiniflareOptions({
  script: bundle.outputFiles[0].text, modules: true, compatibilityDate: '2026-08-06', inspectorPort: 9238,
  unsafeModuleFallbackService: () => new Response('Local probe prohibits external HTTP', { status: 403 }),
}));
let socket;
try {
  await mf.ready;
  const inspector = await mf.getInspectorURL();
  const inspectorHttp = new URL(`http://${inspector.host}/json/list`);
  const targets = await (await fetch(inspectorHttp)).json();
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
      repetitions.push({ payloadBytes: payload.length, wallMs, sampledActiveMs: activeSampleUs / 1000, byFunctionUs, stages: result.stages, heapBefore, heapAfter, status: result.status, uploads: result.uploads });
    }
    cases.push({ images: count, bytesPerImage: size, repetitions });
  }
  const report = { runtime: require('miniflare/package.json').version, workerd: require('workerd/package.json').version, esbuild: require('esbuild/package.json').version, compatibilityDate: '2026-08-06', platform: process.platform, node: process.version, instrumentation: 'The exact checked-out handler source is instrumented in-memory at checked unique stage anchors before bundling; repository handler file is not modified.', backend: 'in-memory synthetic gateway/verifier; upload records lengths only, no byte copies; outbound HTTP is blocked; no real provider HTTP evidence', measurement: 'Inspector CPU sampling excludes idle/program/root. Sample estimate is not Cloudflare billed CPU. Stage durations are local wall intervals with synchronous fake dependencies, not Cloudflare per-function CPU; separate CPU samples identify hotspots. Heap/backing storage snapshots share one isolate with natural GC, not total isolate peak or per-request memory. Local runtime does not enforce hosted Free CPU.', cases };
  await writeFile('docs/phase-6/feasibility-results.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { socket?.close(); await mf.dispose(); }
