const fs = require('node:fs');
const path = require('node:path');
function browserOptions(env = process.env, platform = process.platform) {
  const channel = env.QA_BROWSER_CHANNEL || (platform === 'win32' ? 'msedge' : undefined);
  return { headless: true, ...(channel ? { channel } : {}) };
}
function outputDirectory(env = process.env) {
  const out = env.QA_OUTPUT || 'docs/phase-3';
  fs.mkdirSync(path.join(out, 'screenshots'), { recursive: true });
  return out;
}
function playwright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  if (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) return require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright'));
  return require('playwright');
}
module.exports = { browserOptions, outputDirectory, playwright };
