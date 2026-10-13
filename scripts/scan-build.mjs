import { loadEnv } from 'vite';
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

export async function scanBuild(directory, env = {}) {
  const privateValues = Object.entries(env)
    .filter(([key, value]) => value && /ITCARE_TEST_|VAPID_PRIVATE|SERVICE_ROLE|SUPABASE_SECRET|CLOUDFLARE_|TURNSTILE_SECRET|INTAKE_RATE_SECRET/.test(key))
    .map(([, value]) => value);
  let filesScanned = 0;
  let jsFiles = 0;
  async function visit(path) {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const file = resolve(path, entry.name);
      assert(!entry.isSymbolicLink(), 'Unexpected symlink in distributable');
      if (entry.isDirectory()) { await visit(file); continue; }
      const source = (await readFile(file)).toString('utf8');
      assert(!/demo123|itcare-session|sb_secret_[A-Za-z0-9_-]+/.test(source), 'Forbidden demo/secret pattern in distributable');
      assert(!privateValues.some(value => source.includes(value)), 'Private test/server value in distributable');
      for (const match of source.matchAll(/[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
        let payload;
        try { payload = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8')); } catch { continue; }
        assert(payload?.role !== 'service_role', 'Privileged legacy JWT in distributable');
      }
      filesScanned++;
      if (file.endsWith('.js')) jsFiles++;
    }
  }
  await visit(resolve(directory));
  assert(filesScanned > 0 && jsFiles > 0, 'Empty or incomplete distributable');
  return { passed: true, filesScanned, jsFiles, checks: ['All distributable files scanned', 'No demo credential/session shortcut', 'No secret key or privileged legacy JWT', 'No configured private values, including mis-prefixed VITE values'], publicSupabaseConfigExpected: true };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await scanBuild('dist', loadEnv('production', process.cwd(), ''));
  const output = process.env.BUILD_SCAN_REPORT || 'docs/phase-3/build-scan.json';
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}
