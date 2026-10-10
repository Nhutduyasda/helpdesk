const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    'C:/Users/nhutd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
);
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const out = path.resolve('docs/screenshots');
fs.mkdirSync(out, { recursive: true });
const base = 'http://127.0.0.1:5174';
const report = { screens: [], checks: [], errors: [] };
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'light',
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => report.errors.push(e.message));
  const wait = async () => {
    await page.waitForLoadState('networkidle');
    await page.locator('.fallback-spinner').waitFor({ state: 'hidden' });
    await page.getByText('Đang tải yêu cầu…', { exact: true }).waitFor({ state: 'hidden' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
  };
  const shot = async (name) => {
    await wait();
    const metrics = await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    assert(
      metrics.scroll <= metrics.width,
      `${name}: horizontal page overflow ${JSON.stringify(metrics)}`,
    );
    await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true });
    report.screens.push({ name, ...metrics });
  };
  const goto = async (route) => {
    await page.goto(base + route);
    await wait();
  };
  const login = async (it) => {
    await goto(it ? '/it/login' : '/login');
    await page.getByLabel('Tên đăng nhập / email').fill('review');
    await page.getByLabel('Mật khẩu', { exact: true }).fill('demo123');
    await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
    await page.waitForURL(it ? '**/it/inbox' : '**/employee');
    await wait();
  };
  await goto('/login');
  await shot('M00-login-390');
  await page.getByLabel('Tên đăng nhập / email').fill('review');
  await page.getByLabel('Mật khẩu', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.getByRole('alert').waitFor();
  await shot('M00-login-error');
  await login(false);
  await shot('M01-home-390');
  await page.getByRole('link', { name: 'Báo sự cố', exact: true }).click();
  await shot('M02-report-390');
  await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
  await page.getByRole('alert').waitFor();
  await shot('M02-validation-error');
  await page
    .locator('#photos')
    .setInputFiles({
      name: 'bad.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('not an image'),
    });
  assert((await page.getByRole('alert').textContent()).includes('5 MB'));
  report.checks.push('Empty report and invalid file rejected');
  const imagePage = await context.newPage();
  await imagePage.goto(base + '/images/itcare/printer.svg');
  const image = await imagePage.locator('svg').screenshot();
  await imagePage.close();
  const chooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Chọn ảnh', exact: true }).click();
  const chooser = await chooserPromise;
  await chooser.setFiles({ name: 'printer.png', mimeType: 'image/png', buffer: image });
  await page.getByAltText('Ảnh sự cố 1').waitFor();
  await shot('M02-photo-preview');
  await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
  await page.getByRole('button', { name: 'Đang gửi yêu cầu…', exact: true }).waitFor();
  await page.screenshot({ path: path.join(out, 'M02-submission-loading.png'), fullPage: true });
  await page.waitForURL('**/employee/submitted/*');
  await shot('M03-result-390');
  report.checks.push('Photo-only submission awaits mock completion');
  await page.getByRole('link', { name: 'Xem chi tiết yêu cầu' }).click();
  await shot('M05-details-photo-390');
  await page.getByLabel('Thêm phản hồi').fill('Tôi đã gửi ảnh, nhờ IT kiểm tra giúp.');
  await page.getByRole('button', { name: 'Gửi phản hồi', exact: true }).click();
  await page.getByText('Tôi đã gửi ảnh, nhờ IT kiểm tra giúp.', { exact: true }).waitFor();
  report.checks.push('Employee reply saved');
  await page.getByRole('link', { name: 'Yêu cầu của tôi', exact: true }).click();
  await shot('M04-requests-390');
  await page.getByRole('link', { name: 'Trang chủ', exact: true }).click();
  await page.getByRole('link', { name: 'Báo sự cố', exact: true }).click();
  await page.getByLabel('Mô tả (không bắt buộc nếu có ảnh)').fill('Excel không mở được bảng tính mẫu.');
  await page.evaluate(() => { window.__qaFetch = window.fetch; window.fetch = (input, init) => init?.method === 'POST' ? Promise.reject(new TypeError('Injected submission failure')) : window.__qaFetch(input, init); });
  await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByLabel('Mô tả (không bắt buộc nếu có ảnh)').inputValue(), 'Excel không mở được bảng tính mẫu.');
  await shot('M02-submission-error');
  await page.evaluate(() => { window.fetch = window.__qaFetch; });
  await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
  await page.waitForURL('**/employee/submitted/*');
  report.checks.push('Description-only submission works; failure preserves entered content');
  await goto('/employee/requests/ITC-1002');
  await page.getByText('Không tìm thấy yêu cầu', { exact: true }).waitFor();
  report.checks.push('Employee cannot view another employee request');
  for (const size of [
    { width: 375, height: 812 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(size);
    await goto('/employee');
    await shot(`M01-home-${size.width}x${size.height}`);
    await page.getByRole('link', { name: 'Báo sự cố', exact: true }).click();
    await shot(`M02-report-${size.width}x${size.height}`);
    await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: path.join(out, `M02-submit-visible-${size.width}.png`) });
    await page.getByRole('link', { name: 'Yêu cầu của tôi', exact: true }).click();
    await shot(`M04-requests-${size.width}x${size.height}`);
    await page.getByRole('link', { name: /ITC-1001/ }).click();
    await shot(`M05-details-${size.width}x${size.height}`);
  }
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await page.waitForURL('**/login');
  report.checks.push('Employee logout redirects to login');
  await page.setViewportSize({ width: 1440, height: 900 });
  await goto('/it/login');
  await shot('D00-login-1440');
  await login(true);
  await shot('D01-inbox-1440');
  await page.getByRole('link', { name: 'Chi tiết', exact: true }).first().click();
  await shot('D02-details-1440');
  await page.getByRole('button', { name: 'Tiếp nhận yêu cầu', exact: true }).click();
  await page
    .getByRole('button', { name: 'Tiếp nhận yêu cầu', exact: true })
    .waitFor({ state: 'visible' });
  await wait();
  assert(await page.getByRole('button', { name: 'Tiếp nhận yêu cầu', exact: true }).isDisabled());
  await page.getByRole('button', { name: 'Yêu cầu hỗ trợ từ xa', exact: true }).click();
  await page.getByText('Từ xa', { exact: true }).waitFor();
  await page.getByLabel('Thêm phản hồi').fill('IT đã tiếp nhận và đang kiểm tra.');
  await page.getByRole('button', { name: 'Gửi phản hồi', exact: true }).click();
  await page.getByText('IT đã tiếp nhận và đang kiểm tra.', { exact: true }).waitFor();
  await page
    .getByLabel('Kết quả xử lý', { exact: true })
    .fill('Đã kiểm tra kết nối và khởi động lại.');
  await page.getByRole('button', { name: 'Đánh dấu đã giải quyết', exact: true }).click();
  await page.getByText('Đã kiểm tra kết nối và khởi động lại.', { exact: true }).waitFor();
  report.checks.push('IT acknowledgement, remote method, reply and resolution saved');
  await shot('D02-resolved');
  await page.getByRole('button', { name: 'Ghi nhận hỗ trợ tại chỗ', exact: true }).click();
  await page.getByText('Tại chỗ', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Chờ nhân viên phản hồi', exact: true }).click();
  await wait();
  assert(await page.getByRole('button', { name: 'Chờ nhân viên phản hồi', exact: true }).isDisabled());
  await page.getByRole('button', { name: 'Đóng yêu cầu', exact: true }).click();
  await wait();
  assert(await page.getByRole('button', { name: 'Đóng yêu cầu', exact: true }).isDisabled());
  report.checks.push('On-site, waiting and closed actions work');
  await page.getByRole('link', { name: 'Lịch sử yêu cầu', exact: true }).click();
  await shot('D03-history-1440');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải CSV', exact: true }).click();
  assert.equal((await downloadPromise).suggestedFilename(), 'table-data.csv');
  await page.getByRole('button', { name: 'Sau', exact: true }).click();
  await page.getByText('Trang 2 / 2', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Trước', exact: true }).click();
  report.checks.push('History pagination and CSV export work');
  await page.getByRole('combobox', { name: 'Tất cả trạng thái' }).click();
  await page.getByRole('option', { name: 'Đã giải quyết', exact: true }).click();
  await wait();
  assert((await page.getByRole('table').textContent()).includes('Đã giải quyết'));
  report.checks.push('History status filter works');
  await page.getByRole('link', { name: 'Nhân viên', exact: true }).click();
  await shot('D04-employees-1440');
  await page.getByRole('button', { name: 'Tạm khóa mẫu', exact: true }).first().click();
  await page.getByRole('button', { name: 'Kích hoạt mẫu', exact: true }).first().waitFor();
  report.checks.push('Mock employee account toggle works');
  for (const size of [
    { width: 1366, height: 768 },
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 375, height: 812 },
  ]) {
    await page.setViewportSize(size);
    await goto('/it/inbox');
    await shot(`D01-inbox-${size.width}x${size.height}`);
    await page.getByRole('link', { name: 'Chi tiết', exact: true }).first().click();
    await shot(`D02-details-${size.width}x${size.height}`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await goto('/it/inbox');
  await page.getByLabel('Tìm yêu cầu', { exact: true }).fill('no-match-qa');
  await shot('D01-empty-filter');
  await page.getByLabel('Tìm yêu cầu', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Mở hoặc thu gọn menu' }).click();
  await shot('D01-sidebar-collapsed');
  await page.getByRole('button', { name: 'Đổi giao diện sáng tối' }).click();
  await wait();
  if (!(await page.locator('html').getAttribute('class')).includes('dark')) {
    await page.getByRole('button', { name: 'Đổi giao diện sáng tối' }).click();
    await wait();
  }
  await shot('D01-dark');
  await page.getByRole('button', { name: 'Đổi giao diện sáng tối' }).click();
  await wait();
  await page.setViewportSize({ width: 375, height: 812 });
  await goto('/it/inbox');
  await page.getByRole('button', { name: 'Mở hoặc thu gọn menu' }).click();
  await page.getByRole('dialog').waitFor();
  await shot('D01-mobile-sidebar-open');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  report.checks.push('Mobile sidebar opens and closes; dark theme works');
  await page.setViewportSize({ width: 1440, height: 900 });
  await goto('/apps/tickets');
  await shot('reference-source-tickets-1440');
  await goto('/auth/auth2/login');
  await shot('reference-source-login-1440');
  const statesContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await statesContext.addInitScript(() => {
    sessionStorage.setItem(
      'itcare-session',
      JSON.stringify({
        id: 'e1',
        name: 'Nguyễn Minh Anh',
        department: 'Kế toán',
        role: 'employee',
        active: true,
      }),
    );
    const originalFetch = window.fetch.bind(window);
    window.__qaState = 'error';
    window.fetch = (input, options) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
      if (url.includes('/api/itcare/tickets') && window.__qaState === 'error')
        return Promise.reject(new TypeError('Injected QA network failure'));
      if (url.includes('/api/itcare/tickets') && window.__qaState === 'empty')
        return Promise.resolve(
          new Response('[]', { headers: { 'Content-Type': 'application/json' } }),
        );
      return originalFetch(input, options);
    };
  });
  const statesPage = await statesContext.newPage();
  await statesPage.goto(base + '/employee/requests');
  await statesPage.getByRole('alert').waitFor();
  await statesPage.screenshot({ path: path.join(out, 'M04-data-error.png'), fullPage: true });
  await statesPage.evaluate(() => {
    window.__qaState = 'empty';
  });
  await statesPage.getByRole('button', { name: 'Thử lại', exact: true }).click();
  await statesPage.getByText('Chưa có yêu cầu', { exact: true }).waitFor();
  await statesPage.screenshot({ path: path.join(out, 'M04-empty.png'), fullPage: true });
  report.checks.push('Injected fetch failure displays retry; retry to empty state works');
  await statesContext.close();
  assert.equal(report.errors.length, 0, 'Unhandled browser errors');
  fs.writeFileSync(path.join(out, 'qa-results.json'), JSON.stringify(report, null, 2));
  await browser.close();
  console.log(JSON.stringify(report, null, 2));
})().catch((e) => {
  fs.writeFileSync(
    path.join(out, 'qa-failure.json'),
    JSON.stringify({ error: e.stack, report }, null, 2),
  );
  console.error(e);
  process.exit(1);
});
