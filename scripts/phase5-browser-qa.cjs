const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/nhutd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const assert = require("node:assert/strict");
const fs = require("node:fs");
const qaOutput = process.env.QA_OUTPUT || 'docs/phase-5';
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  fs.mkdirSync(`${qaOutput}/screenshots`, { recursive: true });
  const results = [];
  try {
    for (const width of [390, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      // Synthetic bot/HTTP boundary, never a live ticket or live bot bypass.
      await page.route(
        "https://challenges.cloudflare.com/**",
        (route) =>
          route.fulfill({
            contentType: "application/javascript",
            body:
              "window.turnstile={render:(el,options)=>{options.callback('synthetic-token');return 'qa'},remove:()=>{}};",
          }),
      );
      const requests = [];
      let fail = true;
      await page.route("**/functions/v1/public-intake", async (route) => {
        requests.push(route.request().postDataBuffer().toString());
        await route.fulfill({
          status: fail ? 503 : 200,
          contentType: "application/json",
          body: JSON.stringify(
            fail
              ? { error: "synthetic failure" }
              : { ticketNumber: "ITC-QA-ONLY" },
          ),
        });
        fail = false;
      });
      await page.goto("http://127.0.0.1:5176/");
      await page.getByRole("heading", { name: "Báo sự cố", exact: true })
        .waitFor();
      assert.equal(
        await page.locator("#full-name").evaluate((el) => el.required),
        true,
      );
      assert.equal(
        await page.locator("#department").evaluate((el) => el.required),
        true,
      );
      await page.locator("#full-name").fill("Synthetic QA Reporter");
      await page.locator("#department").selectOption("Synthetic QA");
      await page.locator("#location").fill("Test workstation");
      await page.locator("#description").fill("Synthetic browser QA");
      await page.getByRole("button", { name: "Gửi yêu cầu", exact: true })
        .click();
      await page.getByRole("alert").waitFor();
      assert.equal(
        await page.locator("#description").inputValue(),
        "Synthetic browser QA",
      );
      await page.getByRole("button", { name: "Gửi yêu cầu", exact: true })
        .click();
      await page.getByText("ITC-QA-ONLY", { exact: true }).waitFor();
      const ids = requests.map((body) =>
        body.match(/name="requestId"\r\n\r\n([^\r]+)/)[1]
      );
      assert.equal(ids[0], ids[1]);
      await page.screenshot({
        path: `${qaOutput}/screenshots/confirmation-${width}.png`,
        fullPage: true,
      });
      await page.goto("http://127.0.0.1:5176/report");
      await page.getByRole("heading", { name: "Báo sự cố", exact: true })
        .waitFor();
      assert(
        await page.evaluate(() =>
          document.documentElement.scrollWidth <= innerWidth
        ),
      );
      await page.screenshot({
        path: `${qaOutput}/screenshots/form-${width}.png`,
        fullPage: true,
      });
      const beforeEmpty = requests.length;
      await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
      assert.equal(requests.length, beforeEmpty);
      await page.locator('#full-name').fill('Synthetic Image Reporter');
      await page.locator('#department').selectOption('Synthetic QA');
      await page.locator('#photos').setInputFiles({ name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('invalid') });
      await page.getByRole('alert').waitFor();
      assert((await page.getByRole('alert').innerText()).includes('JPG'));
      assert.equal(await page.locator('#camera').getAttribute('capture'), 'environment');
      await page.locator('#photos').setInputFiles({ name: 'test.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aCuoAAAAASUVORK5CYII=', 'base64') });
      await page.getByRole('img', { name: 'Ảnh sự cố 1' }).waitFor();
      assert.equal(await page.locator('#description').inputValue(), '');
      await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
      await page.getByText('ITC-QA-ONLY', { exact: true }).waitFor();
      await page.goto('http://127.0.0.1:5176/report');
      await page.getByRole("link", { name: "Quản trị IT" }).click();
      await page.waitForURL("**/it/login");
      await page.goto("http://127.0.0.1:5176/it/inbox");
      await page.waitForURL("**/it/login");
      for (
        const path of ["/login", "/employee", "/employee/requests/guessed"]
      ) {
        await page.goto(`http://127.0.0.1:5176${path}`);
        await page.waitForURL("**/report");
      }
      assert.deepEqual(errors, []);
      results.push({
        width,
        passed: true,
        retrySameId: true,
        anonymousAdminBlocked: true,
        legacyRoutesRetired: true,
        submission: "mock HTTP boundary",
        imageOnly: true,
        invalidAttachmentRejected: true,
      });
      await page.close();
    }
    fs.writeFileSync(
      `${qaOutput}/browser-results.json`,
      JSON.stringify(results, null, 2),
    );
    console.log(JSON.stringify(results));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
