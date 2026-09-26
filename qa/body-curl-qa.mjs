import { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = 'qa-artifacts';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const consoleErrors = [];
page.on('pageerror', (err) => consoleErrors.push('pageerror: ' + err.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push('console: ' + msg.text());
});

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function dist(a, b) {
  return Math.hypot(...a.map((v, i) => v - b[i]));
}
function closeVec(a, b, eps = 1e-4) {
  return a && b && a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) <= eps);
}
async function setT(v) {
  await page.evaluate((value) => {
    const el = document.getElementById('bodyParamVal');
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }, v);
  await page.waitForTimeout(450);
}
async function snap(name) {
  const s = await page.evaluate(() => window.Body3D.debugSnapshot());
  fs.writeFileSync(OUT + '/' + name + '.json', JSON.stringify(s, null, 2));
  await page.locator('#body3dStage').screenshot({ path: OUT + '/' + name + '.png' });
  return s;
}

try {
  await page.goto('http://127.0.0.1:5500/index.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.evaluate(() => window.AppNav.show('body'));
  await page.waitForFunction(() => window.Body3D && Body3D.isReady(), { timeout: 120000 });
  await page.waitForTimeout(2500);

  // 进入第 5 步，让 O/F/l 的教学标注都出现。
  await page.click('#bodySkip');
  await page.waitForTimeout(500);

  const poses = [];
  for (const [name, t] of [['curl-low', 0.08], ['curl-mid', 0.50], ['curl-high', 0.92]]) {
    await setT(t);
    const s = await snap(name);
    poses.push({ name, t, s });

    assert(s.ready, name + ': Body3D not ready');
    assert(s.actionId === 'curl', name + ': actionId is not curl');
    assert(s.focusCount > 0, name + ': no focused meshes');
    assert(s.movableCount > 0, name + ': no movable meshes');
    assert(s.pivotChildCount === s.movableCount,
      name + ': pivot children (' + s.pivotChildCount + ') != movable (' + s.movableCount + ')');
    assert(s.pointsFinite, name + ': O/P1/P2 projection contains non-finite values');
    assert(s.arms && Number.isFinite(s.arms.l1) && Number.isFinite(s.arms.l2),
      name + ': invalid arm lengths');
    assert(s.arms.l1 > 0 && s.arms.l2 > 0, name + ': arm length <= 0');
    assert(s.arms.l1 < s.arms.l2, name + ': curl sample should have l1 < l2');
    assert(s.focusCenter && s.cameraTarget && dist(s.focusCenter, s.cameraTarget) < 0.08,
      name + ': camera target is not focused on local arm bounds');
    assert(s.movableSideXs.length === s.movableCount, name + ': side diagnostic incomplete');
    assert(Math.min(...s.movableSideXs) > -0.06,
      name + ': movable set leaks substantially into opposite body side');
  }

  // 相机旋转不应改变三维计算得到的力臂。
  await setT(0.50);
  const beforeCamera = await page.evaluate(() => window.Body3D.debugSnapshot());
  const box = await page.locator('#body3dCanvas').boundingBox();
  assert(box, 'body3dCanvas has no bounding box');
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.74, box.y + box.height * 0.38, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const afterCamera = await page.evaluate(() => window.Body3D.debugSnapshot());
  assert(Math.abs(beforeCamera.arms.l1 - afterCamera.arms.l1) < 1e-9,
    'camera rotation changed l1');
  assert(Math.abs(beforeCamera.arms.l2 - afterCamera.arms.l2) < 1e-9,
    'camera rotation changed l2');
  await snap('curl-camera-rotated');

  // 动作切换再返回：同一 t 下可动肢体包围盒必须回到同一位置，防止姿态被烘焙。
  await setT(0.80);
  const beforeSwitch = await page.evaluate(() => window.Body3D.debugSnapshot());
  await page.evaluate(() => document.querySelector('#bodyList [data-i="0"]').click());
  await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('#bodyList [data-i="1"]').click());
  await page.waitForTimeout(700);
  await setT(0.80);
  const afterSwitch = await page.evaluate(() => window.Body3D.debugSnapshot());
  assert(closeVec(beforeSwitch.movableCenter, afterSwitch.movableCenter, 2e-4),
    'curl -> calf -> curl changed movable center; possible pose bake/drift');
  assert(closeVec(beforeSwitch.movableSize, afterSwitch.movableSize, 2e-4),
    'curl -> calf -> curl changed movable bounds; possible pose bake/drift');
  await snap('curl-after-switch');

  // 最终抽象视图截图。
  await page.click('#bodyAbstract');
  await page.waitForTimeout(350);
  await page.locator('#body3dStage').screenshot({ path: OUT + '/curl-abstract.png' });

  const report = {
    passed: true,
    consoleErrors,
    poses: poses.map(({ name, t, s }) => ({
      name, t,
      focusCount: s.focusCount,
      movableCount: s.movableCount,
      pivotChildCount: s.pivotChildCount,
      arms: s.arms,
      cameraTargetDistance: dist(s.focusCenter, s.cameraTarget),
      minMovableX: Math.min(...s.movableSideXs),
    })),
    switchStable: true,
    cameraInvariant: true,
  };
  fs.writeFileSync(OUT + '/report.json', JSON.stringify(report, null, 2));

  // WebGL/Three can emit harmless warnings, but page exceptions are not acceptable.
  assert(!consoleErrors.some((x) => x.startsWith('pageerror:')), 'page errors: ' + consoleErrors.join('\n'));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
