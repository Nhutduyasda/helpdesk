const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    'C:/Users/nhutd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
);
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  const assets = fs.readdirSync('dist/assets').filter((f) => f.endsWith('.js'));
  for (const file of assets) {
    const source = fs.readFileSync(path.join('dist/assets', file), 'utf8');
    assert(
      !/demo123|itcare-session|sb_secret_[A-Za-z0-9_-]{20,}/.test(source),
      `Unexpected demo/secret in ${file}`,
    );
  }
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [],
    requests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => requests.push(r.url()));
  await page.addInitScript(() =>
    sessionStorage.setItem(
      'itcare-session',
      JSON.stringify({ id: 'forged', role: 'it', active: true }),
    ),
  );
  await page.goto('http://127.0.0.1:5175/it/inbox');
  await page.waitForURL('**/it/login');
  await page.getByRole('alert').waitFor();
  assert(await page.getByRole('button', { name: 'Đăng nhập', exact: true }).isDisabled());
  assert(!(await page.locator('body').innerText()).includes('demo123'));
  assert.equal(
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length),
    0,
  );
  assert(!requests.some((u) => u.includes('/api/itcare') || u.includes('mockServiceWorker')));
  assert.deepEqual(errors, []);
  await page.screenshot({
    path: 'docs/phase-2/screenshots/production-config-error-390.png',
    fullPage: true,
  });
  await page.goto('http://127.0.0.1:5175/employee/requests');
  await page.waitForURL('**/login');
  fs.writeFileSync(
    'docs/phase-2/production-qa.json',
    JSON.stringify(
      {
        passed: true,
        checks: [
          'No demo credentials/session shortcut/secret-key marker in compiled JS',
          'Forged demo identity cannot open IT/employee protected routes',
          'Missing configuration disables login and displays error',
          'No MSW registration or mock API requests',
        ],
        errors,
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log('Production configuration and isolation checks passed');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
