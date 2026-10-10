const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    'C:/Users/nhutd/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright',
);
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const results = [];
  const currentDirectory = process.env.QA_COMPARE_DIRECTORY || 'docs/phase-2/screenshots';
  for (const name of fs.readdirSync(currentDirectory).filter((f) => f.endsWith('.png'))) {
    const old = path.join('docs/screenshots', name),
      current = path.join(currentDirectory, name);
    if (!fs.existsSync(old)) continue;
    const images = [old, current].map(
      (p) => 'data:image/png;base64,' + fs.readFileSync(p).toString('base64'),
    );
    const metrics = await page.evaluate(async (urls) => {
      const images = await Promise.all(
        urls.map(
          (src) =>
            new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = src;
            }),
        ),
      );
      const sizes = images.map((img) => ({ width: img.width, height: img.height }));
      if (sizes[0].width !== sizes[1].width || sizes[0].height !== sizes[1].height)
        return { sizes, changedPercent: null };
      const pixels = images.map((img) => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, img.width, img.height).data;
      });
      let changed = 0;
      for (let i = 0; i < pixels[0].length; i += 4)
        if ([0, 1, 2].some((c) => Math.abs(pixels[0][i + c] - pixels[1][i + c]) > 16)) changed++;
      return {
        sizes,
        changedPercent: Number(((100 * changed) / (pixels[0].length / 4)).toFixed(3)),
      };
    }, images);
    results.push({ name, ...metrics });
  }
  fs.writeFileSync(
    process.env.QA_RESULT_FILE || 'docs/phase-2/visual-comparison.json',
    JSON.stringify(
      {
        method:
          'RGB difference >16; dynamic timestamps/content and source screenshot variations are not masked; not a pixel-perfect assertion',
        screens: results,
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log(
    JSON.stringify(
      results.map((r) => ({ name: r.name, changed: r.changedPercent })),
      null,
      2,
    ),
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
