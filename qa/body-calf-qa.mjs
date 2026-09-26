// 踮脚样板：自动验证第二类杠杆关系、局部聚焦、足部转动和小腿随动。\nimport { chromium } from 'playwright';
import fs from 'node:fs';

const OUT = 'qa-artifacts-calf';
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
function closeVec(a, b, eps = 2e-4) {
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
  await page.waitForTimeout(1800);

  await page.evaluate(() => document.querySelector('#bodyList [data-i="0"]').click());
  await page.waitForTimeout(700);
  await page.click('#bodySkip');
  await page.waitForTimeout(400);

  const poses = [];
  for (const [name, t] of [['calf-low', 0.08], ['calf-mid', 0.50], ['calf-high', 0.92]]) {
    await setT(t);
    const s = await snap(name);
    poses.push({ name, t, s });

    assert(s.ready, name + ': Body3D not ready');
    assert(s.actionId === 'calf', name + ': actionId is not calf');
    assert(s.focusCount > 0, name + ': no focused meshes');
    assert(s.movableCount > 0, name + ': no movable foot meshes');
    assert(s.followCount > 0, name + ': no lower-leg follower meshes');
    assert(s.pivotChildCount === s.movableCount,
      name + ': pivot children (' + s.pivotChildCount + ') != movable (' + s.movableCount + ')');
    assert(s.pointsFinite, name + ': O/P1/P2 projection contains non-finite values');
    assert(s.arms && Number.isFinite(s.arms.l1) && Number.isFinite(s.arms.l2),
      name + ': invalid arm lengths');
    assert(s.arms.l1 > 0 && s.arms.l2 > 0, name + ': arm length <= 0');
    assert(s.arms.l1 > s.arms.l2, name + ': tiptoe sample should have l1 > l2');
    assert(s.focusCenter && s.cameraTarget && dist(s.focusCenter, s.cameraTarget) < 0.09,
      name + ': camera target is not focused on calf/foot bounds');
    assert(s.movableSideXs.length === s.movableCount, name + ': side diagnostic incomplete');
    assert(Math.min(...s.movableSideXs) > -0.07,
      name + ': movable foot leaks substantially into opposite body side');
  }

  assert(dist(poses[0].s.followOffset, poses[2].s.followOffset) > 0.005,
    'lower-leg follower did not move as heel-rise changed');

  // 相机旋转不能改变三维力臂。
  await setT(0.50);
  const beforeCamera = await page.evaluate(() => window.Body3D.debugSnapshot());
  const box = await page.locator('#body3dCanvas').boundingBox();
  assert(box, 'body3dCanvas has no bounding box');
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.36, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  const afterCamera = await page.evaluate(() => window.Body3D.debugSnapshot());
  assert(Math.abs(beforeCamera.arms.l1 - afterCamera.arms.l1) < 1e-9, 'camera rotation changed l1');
  assert(Math.abs(beforeCamera.arms.l2 - afterCamera.arms.l2) < 1e-9, 'camera rotation changed l2');
  await snap('calf-camera-rotated');

  // 动作切换后必须回到同一姿态，避免足部/小腿漂移。
  await setT(0.76);
  const beforeSwitch = await page.evaluate(() => window.Body3D.debugSnapshot());
  await page.evaluate(() => document.querySelector('#bodyList [data-i="1"]').click());
  await page.waitForTimeout(700);
  await page.evaluate(() => document.querySelector('#bodyList [data-i="0"]').click());
  await page.waitForTimeout(700);
  await setT(0.76);
  const afterSwitch = await page.evaluate(() => window.Body3D.debugSnapshot());
  assert(closeVec(beforeSwitch.movableCenter, afterSwitch.movableCenter),
    'calf -> curl -> calf changed foot center; possible pose drift');
  assert(closeVec(beforeSwitch.movableSize, afterSwitch.movableSize),
    'calf -> curl -> calf changed foot bounds; possible pose drift');
  assert(closeVec(beforeSwitch.followOffset, afterSwitch.followOffset),
    'calf -> curl -> calf changed follower offset; possible pose drift');
  await snap('calf-after-switch');

  await page.click('#bodyAbstract');
  await page.waitForTimeout(350);
  await page.locator('#body3dStage').screenshot({ path: OUT + '/calf-abstract.png' });

  const report = {
    passed: true,
    consoleErrors,
    poses: poses.map(({ name, t, s }) => ({
      name, t,
      focusCount: s.focusCount,
      movableCount: s.movableCount,
      followCount: s.followCount,
      arms: s.arms,
      followOffset: s.followOffset,
      cameraTargetDistance: dist(s.focusCenter, s.cameraTarget),
    })),
    switchStable: true,
    cameraInvariant: true,
    secondClassRelation: true,
  };
  fs.writeFileSync(OUT + '/report.json', JSON.stringify(report, null, 2));
  assert(!consoleErrors.some((x) => x.startsWith('pageerror:')), 'page errors: ' + consoleErrors.join('\n'));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
