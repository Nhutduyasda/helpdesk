import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
test("preview is manual, environment-gated and separate from Phase 4; no database deployment", async () => {
  const workflow = await readFile(
    new URL("../.github/workflows/itcare-phase5-preview.yml", import.meta.url),
    "utf8",
  );
  assert(
    workflow.includes("workflow_dispatch:") &&
      !/^  (push|pull_request):/m.test(workflow),
  );
  assert(workflow.includes("environment: itcare-phase5-preview"));
  assert(workflow.includes("ITCARE_PHASE5_DEPLOY_ENABLED"));
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
