const path = require('path');
const fs = require('fs');

(async () => {
  const [, , input, output, w = '1920', h = '1080', scale = '2'] = process.argv;

  if (!input || !output) {
    console.error('Usage: node export.js <input-html> <output-png> [width] [height] [scale]');
    process.exit(1);
  }

  const resolvedInput = path.resolve(input);
  const resolvedOutput = path.resolve(output);

  // Ensure output directory exists
  const outDir = path.dirname(resolvedOutput);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Check if playwright or puppeteer is available
  let engine = null;
  try {
    engine = { type: 'playwright', mod: require('playwright') };
  } catch (e) {
    try {
      engine = { type: 'puppeteer', mod: require('puppeteer') };
    } catch (e2) {
      console.error('Error: Neither playwright nor puppeteer is installed.');
      process.exit(1);
    }
  }

  console.log(`Rendering with ${engine.type} (viewport: ${w}x${h}, scale: ${scale}x)...`);

  if (engine.type === 'playwright') {
    const browser = await engine.mod.chromium.launch();
    const page = await browser.newPage({
      viewport: { width: +w, height: +h },
      deviceScaleFactor: +scale,
    });
    await page.goto('file://' + resolvedInput);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
    await page.locator('.canvas').screenshot({ path: resolvedOutput, type: 'png' });
    await browser.close();
  } else {
    // Puppeteer
    const browser = await engine.mod.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setViewport({
      width: parseInt(w, 10),
      height: parseInt(h, 10),
      deviceScaleFactor: parseFloat(scale)
    });
    await page.goto('file:///' + resolvedInput.replace(/\\/g, '/'), {
      waitUntil: 'networkidle0'
    });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 600));

    const element = await page.$('.canvas');
    if (element) {
      await element.screenshot({ path: resolvedOutput, type: 'png' });
    } else {
      await page.screenshot({ path: resolvedOutput, type: 'png' });
    }
    await browser.close();
  }

  console.log(`Successfully exported to: ${resolvedOutput}`);
})();
