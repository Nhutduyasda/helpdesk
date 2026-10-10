const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/nhutd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const { loadEnv } = await import('vite');
  const env = loadEnv('development', process.cwd(), '');
  const out = 'docs/phase-3';
  fs.mkdirSync(out + '/screenshots', { recursive: true });
  const report = { project: 'agcoboeswdvnumzyrtbu', mode: 'live', checks: [], exceptions: 0 };
  let browser;
  let step = 'configuration';
  try {
    assert(new URL(env.VITE_SUPABASE_URL).hostname === 'agcoboeswdvnumzyrtbu.supabase.co');
    assert(env.ITCARE_TEST_IT_EMAIL && env.ITCARE_TEST_IT_PASSWORD);
    browser = await chromium.launch({ channel: 'msedge', headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', () => report.exceptions++);
    const base = process.env.LIVE_QA_URL || 'http://127.0.0.1:5174';
    step = 'invalid-password';
    await page.goto(base + '/it/login');
    await page.getByLabel('Tên đăng nhập / email').fill('invalid-phase3@example.test');
    await page.getByLabel('Mật khẩu', { exact: true }).fill('SyntheticInvalidPasswordOnly');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Email hoặc mật khẩu không đúng' }).waitFor();
    report.checks.push({ name: step, status: 'PASSED' });
    step = 'IT-login';
    await page.getByLabel('Tên đăng nhập / email').fill(env.ITCARE_TEST_IT_EMAIL);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(env.ITCARE_TEST_IT_PASSWORD);
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL('**/it/inbox');
    await page.getByRole('heading', { name: 'Hộp thư yêu cầu', exact: true }).waitFor();
    await page.getByText('Đang tải yêu cầu…', { exact: true }).waitFor({ state: 'hidden' });
    assert(!(await page.locator('body').innerText()).includes('demo123'));
    assert(!(await page.locator('body').innerText()).includes('Không tải được dữ liệu'));
    report.checks.push({ name: step, status: 'PASSED' });
    step = 'IT-refresh-session';
    await page.reload();
    await page.getByRole('heading', { name: 'Hộp thư yêu cầu', exact: true }).waitFor();
    await page.getByText('Đang tải yêu cầu…', { exact: true }).waitFor({ state: 'hidden' });
    report.checks.push({ name: step, status: 'PASSED' });
    await page.screenshot({ path: out + '/screenshots/live-it-inbox-1440.png', fullPage: true, mask: [page.locator('header'), page.locator('[data-slot="sidebar-footer"]')] });
    step = 'IT-logout';
    await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
    await page.waitForURL('**/it/login');
    await page.goto(base + '/it/inbox');
    await page.waitForURL('**/it/login');
    report.checks.push({ name: step, status: 'PASSED' });
    assert.equal(report.exceptions, 0);
    report.passed = true;
  } catch {
    report.passed = false;
    report.checks.push({ name: step, status: 'FAILED' });
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync(out + '/live-auth.json', JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  }
})();
