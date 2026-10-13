import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
export function validatePreview(env) {
  assert(
    /^[0-9a-f]{40}$/.test(env.APPROVED_COMMIT || "") &&
      env.APPROVED_COMMIT === env.GITHUB_SHA,
    "Approved commit must match dispatched revision",
  );
  const url = new URL(env.VITE_SUPABASE_URL || "");
  assert(
    url.protocol === "https:" &&
      /^[a-z0-9]{20}\.supabase\.co$/.test(url.hostname) &&
      url.origin + "/" === url.href,
    "Use an isolated Supabase project origin",
  );
  assert(
    url.hostname !== "agcoboeswdvnumzyrtbu.supabase.co",
    "Phase 4 Supabase project is forbidden",
  );
  assert(
    /^sb_publishable_[A-Za-z0-9_-]+$/.test(
      env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
    ) && !/REPLACE|synthetic/i.test(env.VITE_SUPABASE_PUBLISHABLE_KEY),
    "Use only the isolated project publishable key",
  );
  assert(
    env.VITE_ITCARE_DEPARTMENTS?.trim() &&
      env.VITE_TURNSTILE_SITE_KEY?.trim() && env.VITE_ITCARE_DEMO === "false",
    "Configure departments and the isolated Turnstile widget; demo must be off",
  );
  assert(
    !Object.keys(env).some((k) =>
      /^VITE_.*(SERVICE_ROLE|SECRET|PRIVATE|PASSWORD|TOKEN)/i.test(k)
    ),
    "Server secrets must not be passed to the frontend build",
  );
  return url.hostname;
}
export function previewHeaders(source, host) {
  assert(
    /^[a-z0-9]{20}\.supabase\.co$/.test(host) &&
      host !== "agcoboeswdvnumzyrtbu.supabase.co",
  );
  return source.replaceAll("agcoboeswdvnumzyrtbu.supabase.co", host);
}
if (
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const host = validatePreview(process.env);
  if (process.argv[2] === "headers") {
    const path = "dist/_headers";
    await writeFile(path, previewHeaders(await readFile(path, "utf8"), host));
  } else assert(process.argv[2] === "validate");
  console.log("Isolated Phase 5 preview configuration verified.");
}
