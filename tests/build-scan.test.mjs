import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanBuild } from '../scripts/scan-build.mjs';

async function fixture(run) {
  const dir = await mkdtemp(join(tmpdir(), 'itcare-build-scan-'));
  try {
    await mkdir(join(dir, 'assets'));
    await writeFile(join(dir, 'assets/app.js'), 'console.log("ITCare")');
    await run(dir);
  } finally { await rm(dir, { recursive: true, force: true }); }
}
const jwt = role => 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.synthetic_signature';
test('build gate rejects legacy service-role JWT without printing its value', () => fixture(async dir => {
  const secret = jwt('service_role');
  await writeFile(join(dir, 'assets/app.js'), JSON.stringify(secret));
  await assert.rejects(scanBuild(dir), error => error.message.includes('Privileged legacy JWT') && !error.message.includes(secret));
}));
test('build gate scans HTML, maps and nested assets, not only top-level JS', () => fixture(async dir => {
  for (const name of ['index.html', 'assets/app.js.map', 'assets/nested/private.txt']) {
    await mkdir(join(dir, 'assets/nested'), { recursive: true });
    await writeFile(join(dir, name), 'sb_secret_synthetic_only');
    await assert.rejects(scanBuild(dir), /Forbidden/);
    await rm(join(dir, name));
  }
}));
test('build gate catches private values even when incorrectly VITE-prefixed', () => fixture(async dir => {
  await writeFile(join(dir, 'assets/app.js'), 'synthetic-private-value');
  await assert.rejects(scanBuild(dir, { VITE_SERVICE_ROLE_KEY: 'synthetic-private-value' }), /Private test\/server value/);
}));
test('build gate allows public publishable and legacy anon keys', () => fixture(async dir => {
  await writeFile(join(dir, 'assets/app.js'), JSON.stringify(['sb_publishable_synthetic', jwt('anon')]));
  assert.equal((await scanBuild(dir)).passed, true);
}));
