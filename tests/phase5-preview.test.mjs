import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from 'node:module';
import {
  previewHeaders,
  validatePreview,
} from "../scripts/phase5-preview-config.mjs";
const env = {
  APPROVED_COMMIT: "a".repeat(40),
  GITHUB_SHA: "a".repeat(40),
  VITE_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_TestOnly",
  VITE_ITCARE_DEPARTMENTS: "Synthetic QA",
  VITE_TURNSTILE_SITE_KEY: "test-widget",
  VITE_ITCARE_DEMO: "false",
};
test("isolated preview refuses Phase 4, mismatched commits and frontend secrets", () => {
  assert.equal(validatePreview(env), "abcdefghijklmnopqrst.supabase.co");
  for (
    const override of [
      { VITE_SUPABASE_URL: "https://agcoboeswdvnumzyrtbu.supabase.co" },
      { GITHUB_SHA: "b".repeat(40) },
      { VITE_SUPABASE_PUBLISHABLE_KEY: "sb_secret_test" },
      { VITE_SERVICE_ROLE_KEY: "test" },
      { VITE_ITCARE_DEMO: "true" },
    ]
  ) assert.throws(() => validatePreview({ ...env, ...override }));
});

test('request workflow YAML guards both jobs against missing approval, other refs/events and changed commits', async () => {
  const yaml = createRequire(import.meta.url)('js-yaml');
  const w = yaml.load(await readFile(new URL('../.github/workflows/itcare-phase5-preview.yml', import.meta.url), 'utf8'));
  assert.deepEqual(w.on, {push:{branches:['codex/phase-5-preview-request']}});
  assert.deepEqual(w.permissions,{contents:'read'});
  assert.equal(w.jobs.deploy.needs,'prepare');
  assert.deepEqual(w.jobs.deploy.permissions,{contents:'read',deployments:'write'});
  assert(!w.jobs.prepare.permissions);
  assert(!JSON.stringify(w.jobs.prepare).includes('secrets.'));
  const github={event:{deleted:false},event_name:'push',ref:'refs/heads/codex/phase-5-preview-request',sha:'a'.repeat(40)};
  const vars={ITCARE_PHASE5_DEPLOY_ENABLED:'true',ITCARE_PHASE5_DEPLOY_APPROVAL:'DEPLOY_ISOLATED_PHASE5',ITCARE_PHASE5_APPROVED_SHA:github.sha};
  for (const job of Object.values(w.jobs)) {
    assert.equal(job.environment,'itcare-phase5-preview');
    const allowed = new Function('github','vars',`return (${job.if});`);
    assert(allowed(github,vars));
    for (const override of [{ITCARE_PHASE5_DEPLOY_ENABLED:'false'},{ITCARE_PHASE5_DEPLOY_APPROVAL:''},{ITCARE_PHASE5_APPROVED_SHA:''},{ITCARE_PHASE5_APPROVED_SHA:'b'.repeat(40)}]) assert(!allowed(github,{...vars,...override}));
    for (const override of [{event:{deleted:true}},{event_name:'pull_request'},{event_name:'workflow_dispatch'},{ref:'refs/heads/main'},{ref:'refs/heads/codex/phase-5-passwordless-reporting'},{ref:'refs/tags/codex/phase-5-preview-request'}]) assert(!allowed({...github,...override},vars));
  }
  const checkout=w.jobs.prepare.steps.find(step=>step.uses==='actions/checkout@v4');
  assert.equal(checkout.with.ref,'${{ github.sha }}');
  assert.equal(checkout.with['persist-credentials'],false);
});
test("isolated CSP preserves private caching and restrictive directives", async () => {
  const source = await readFile(
    new URL("../public/_headers", import.meta.url),
    "utf8",
  );
  const rewritten = previewHeaders(source, "abcdefghijklmnopqrst.supabase.co");
  assert(!rewritten.includes("agcoboeswdvnumzyrtbu"));
  assert(rewritten.includes("https://abcdefghijklmnopqrst.supabase.co"));
  assert(rewritten.includes("wss://abcdefghijklmnopqrst.supabase.co"));
  assert(
    rewritten.includes("geolocation=()") &&
      rewritten.includes("Cache-Control: no-store"),
  );
  assert(rewritten.includes("frame-src https://challenges.cloudflare.com"));
});
test("preview request is approval-gated, environment-gated and separate from Phase 4; no database deployment", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/itcare-phase5-preview.yml", import.meta.url),
    "utf8",
  );
  assert(
    workflow.includes("branches: [codex/phase-5-preview-request]") &&
      !/workflow_dispatch:|pull_request:/.test(workflow),
  );
  assert(workflow.includes("environment: itcare-phase5-preview"));
  assert(workflow.includes("ITCARE_PHASE5_DEPLOY_ENABLED"));
  assert(workflow.includes('vars.ITCARE_PHASE5_APPROVED_SHA == github.sha'));
  assert(workflow.includes('vars.ITCARE_PHASE5_DEPLOY_APPROVAL'));
  assert(workflow.includes('ref: ${{ github.sha }}'));
  assert(workflow.includes('persist-credentials: false'));
  assert(!workflow.includes('inputs.'));
  assert(
    workflow.includes(
      "--project-name=itcare-phase5-test --branch=phase5-preview",
    ),
  );
  assert(workflow.includes("phase5-production-disabled"));
  assert(
    !/secrets\.[^\s}]*SUPABASE|db push|functions deploy|auth\.admin/.test(
      workflow,
    ),
  );
});
