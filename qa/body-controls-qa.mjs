import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { localThree } from './local-three.mjs';

const out = 'qa-artifacts-controls';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await localThree(page);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const stage = page.locator('#body3dStage');
const abstract = page.locator('#bodyAbstract');
async function checkMode(expected) {
  assert.equal(await stage.evaluate(el => el.classList.contains('abstract-mode')), expected);
  assert.equal(await abstract.textContent(), expected ? '恢复肌肉骨骼' : '简化成杠杆');
  assert.equal(await abstract.getAttribute('aria-pressed'), String(expected));
  if (!expected) {
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#body3dCanvas').evaluate(el => getComputedStyle(el).opacity), '1');
    assert.equal(await page.locator('#bodyUi > *').count(), 0);
  }
}
try {
  await page.goto('http://127.0.0.1:5500/index.html');
  await page.getByRole('button', { name: '人体杠杆', exact: true }).click();
  await page.waitForFunction(() => window.Body3D?.isReady(), { timeout: 45000 });
  await page.waitForTimeout(300);
  assert.equal(await page.locator('#bodyExplode').count(), 0);
  // Direct toggles must work both before and after reaching teaching step 7.
  await checkMode(false);
  await abstract.click(); await checkMode(true);
  await abstract.click(); await checkMode(false);
  for (let i = 0; i < 6; i++) await page.locator('#bodyNext').click();
  await checkMode(true);
  const before = await page.evaluate(() => Body3D.debugSnapshot().worldPoints);
  for (let i = 0; i < 3; i++) {
    await abstract.click(); await checkMode(false);
    await abstract.click(); await checkMode(true);
  }
  assert.deepEqual(await page.evaluate(() => Body3D.debugSnapshot().worldPoints), before);
  await page.locator('#bodyPrev').click(); await checkMode(false);
  await page.locator('#bodyNext').click(); await checkMode(true);
  await page.locator('#bodySkip').click(); await checkMode(false);
  // Real pointer clicks, including narrow windows: do not invoke handlers with evaluate().
  const actions = ['calf', 'curl', 'neck', 'lift'];
  for (const width of [1440, 1024, 900, 768]) {
    await page.setViewportSize({ width, height: 800 });
    for (let i = 0; i < actions.length; i++) {
      const button = page.locator(`#bodyList [data-i="${i}"]`);
      const box = await button.boundingBox();
      assert(box && box.x >= 0 && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= 800,
        `${actions[i]} action button outside viewport at ${width}`);
      await button.click();
      await checkMode(false);
      const s = await page.evaluate(() => Body3D.debugSnapshot());
      assert.equal(s.actionId, actions[i]);
      assert(s.pointsFinite && s.focusCount > 0, `${actions[i]} did not render`);
      assert.equal(await page.locator('#bodyStepBadge').textContent(), '步骤 1 / 7');
      const canvas = await page.locator('#body3dCanvas').boundingBox();
      assert(canvas && canvas.height >= 280 && canvas.width > 0, 'model collapsed in narrow layout');
    }
    await page.locator('#bodyList [data-i="1"]').click();
    await page.screenshot({ path: `${out}/actions-${width}.png` });
  }
  await page.locator('#bodyPlay').click();
  await page.locator('#bodyList [data-i="0"]').click();
  assert.equal(await page.locator('#bodyPlay').textContent(), '播放动作');
  assert.equal(errors.length, 0, errors.join('\n'));
  const report = { passed: true, widths: [1440, 1024, 900, 768], actions,
    abstractRoundTrips: 4, seventhStepRecovery: true, explodeRemoved: true,
    switchingStopsPlayback: true, pageErrors: errors };
  fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
}
