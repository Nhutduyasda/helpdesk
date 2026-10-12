import test from 'node:test';
import assert from 'node:assert/strict';
import runtime from '../scripts/qa-runtime.cjs';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
test('browser QA uses available Chromium on Linux and retains Edge on Windows', () => {
  assert.deepEqual(runtime.browserOptions({}, 'linux'), { headless: true });
  assert.deepEqual(runtime.browserOptions({}, 'win32'), { headless: true, channel: 'msedge' });
  assert.deepEqual(runtime.browserOptions({ QA_BROWSER_CHANNEL: 'chrome' }, 'linux'), { headless: true, channel: 'chrome' });
});
test('QA_OUTPUT isolates new staging evidence from historical Phase 3 output', () => {
  const dir = mkdtempSync(join(tmpdir(), 'itcare-qa-output-'));
  try {
    const out = join(dir, 'phase4-staging');
    assert.equal(runtime.outputDirectory({ QA_OUTPUT: out }), out);
    assert(existsSync(join(out, 'screenshots')));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
