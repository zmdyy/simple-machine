import { chromium } from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { localThree } from './local-three.mjs';

const OUT='qa-artifacts-neck';
fs.mkdirSync(OUT,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:900}});
await localThree(page);
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const snapshot=()=>page.evaluate(()=>Body3D.debugSnapshot());
async function setT(t) {
  await page.evaluate(t=>{
    const input=document.getElementById('bodyParamVal');
    input.value=t; input.dispatchEvent(new Event('input',{bubbles:true}));
  },t);
  await page.waitForTimeout(80);
  return snapshot();
}
async function snap(name) {
  await page.locator('#body3dStage').screenshot({path:OUT+'/'+name+'.png'});
}
function close(a,b,tolerance=1e-6) {
  assert(a.length===b.length && a.every((v,i)=>Math.abs(v-b[i])<tolerance),'pose or annotation drift');
}
async function projectionError() {
  return page.evaluate(()=>{
    const expected=Body3D.debugSnapshot().screenPoints;
    const svg=document.getElementById('bodySvg'),rect=svg.getBoundingClientRect();
    const point=(cx,cy)=>{
      const p=svg.createSVGPoint();p.x=Number(cx);p.y=Number(cy);
      const q=p.matrixTransform(svg.getScreenCTM());return {x:q.x-rect.x,y:q.y-rect.y};
    };
    const piv=document.querySelector('#bodyDraw circle'),actual=point(piv.getAttribute('cx'),piv.getAttribute('cy'));
    return Math.hypot(actual.x-expected.O.x,actual.y-expected.O.y);
  });
}

try {
  await page.goto('http://127.0.0.1:5500/index.html',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>AppNav.show('body'));
  await page.waitForFunction(()=>window.Body3D?.isReady(),{timeout:45000});
  await page.click('#bodyList [data-i="2"]');
  await page.waitForTimeout(400);
  const poses=[];
  for(let i=0;i<=10;i++) {
    const s=await setT(i/10),a=s.assembly;
    assert(s.ready && s.pointsFinite && a?.calibrated,'neck rig failed to initialise');
    assert.equal(a.muscleNames.length,2,'both splenius capitis muscles must participate');
    assert(a.muscleNames.every(n=>/^Splenius_capitis_muscle/.test(n)),'incorrect muscle selected');
    assert(a.attachmentError<1e-6 && a.surfaceAttachmentError<1e-6,'upper attachment left skull surface');
    assert(a.lowerSurfaceAttachmentError<1e-6,'lower tip left supporting bone surface');
    assert(a.fixedDrift<1e-6,'fixed neck attachment moved');
    assert(a.oppositeMoments && a.muscleMoment<0 && a.gravityMoment>0,'muscle and gravity must oppose each other');
    assert(s.arms.l1>0 && s.arms.l2>0 && s.arms.l1<s.arms.l2,'invalid sagittal moment arms');
    assert.equal(a.hiddenMovingBones,0,'parts of the skull, jaw or teeth were left hidden');
    if(poses.length) assert(a.muscleLength<poses.at(-1).assembly.muscleLength,'raising head did not shorten posterior muscle');
    poses.push(s);
    if(i===0||i===10) await snap(i===0?'neck-low-anatomy':'neck-level-anatomy');
  }
  close(poses[0].worldPoints.O,poses.at(-1).worldPoints.O);
  close(poses[0].assembly.origin,poses.at(-1).assembly.origin);
  assert(poses[0].worldPoints.p2[1]<poses.at(-1).worldPoints.p2[1],'front of head did not rise');
  await page.click('#bodySkip');
  assert(await projectionError()<1,'SVG pivot does not align with anatomy');
  await snap('neck-level-forces');
  const beforeAbstract=await snapshot();
  await page.click('#bodyAbstract');
  assert.equal(await page.locator('#bodyAbstract').textContent(),'恢复肌肉骨骼');
  assert.equal(await page.locator('#bodyDraw').evaluate(el=>el.childElementCount),0,'duplicate annotation layers in abstract view');
  close(beforeAbstract.worldPoints.p1,(await snapshot()).worldPoints.p1);
  await snap('neck-level-abstract');
  await setT(0); await snap('neck-low-abstract');
  await page.click('#bodyAbstract');
  assert.equal(await page.locator('#bodyAbstract').textContent(),'简化成杠杆');
  await snap('neck-low-forces');
  await page.click('#bodyToggleMuscle');
  assert.equal((await snapshot()).assembly.visibleMuscles,0);
  await page.click('#bodyToggleMuscle');
  assert.equal((await snapshot()).assembly.visibleMuscles,2);
  await page.click('#bodyToggleBone');
  const hidden=await snapshot();assert.equal(hidden.assembly.hiddenMovingBones,hidden.movableCount);
  await page.click('#bodyToggleBone');
  assert.equal((await snapshot()).assembly.hiddenMovingBones,0);

  const t=.6, beforeSwitch=await setT(t);
  for(const index of [1,0,3,2,1,2]) {
    await page.click('#bodyList [data-i="'+index+'"]');await page.waitForTimeout(80);
  }
  const returned=await setT(t);
  close(beforeSwitch.movableCenter,returned.movableCenter);
  close(beforeSwitch.movableSize,returned.movableSize);
  close(beforeSwitch.worldPoints.p1,returned.worldPoints.p1);
  assert(returned.assembly.surfaceAttachmentError<1e-6,'muscle binding was lost after action switches');

  await page.click('#bodySkip');
  const beforeOrbit=await snapshot(),box=await page.locator('#body3dCanvas').boundingBox();
  await page.mouse.move(box.x+box.width*.55,box.y+box.height*.45);
  await page.mouse.down();await page.mouse.move(box.x+box.width*.7,box.y+box.height*.4,{steps:10});await page.mouse.up();
  await page.waitForTimeout(350);
  const afterOrbit=await snapshot();
  assert(Math.abs(beforeOrbit.arms.l1-afterOrbit.arms.l1)<1e-10 && Math.abs(beforeOrbit.arms.l2-afterOrbit.arms.l2)<1e-10,'camera changed physical lever arms');
  assert(await projectionError()<1,'labels did not follow orbit camera');
  await snap('neck-orbit');
  await page.setViewportSize({width:1280,height:800});await page.waitForTimeout(250);
  assert(await projectionError()<1,'labels did not follow viewport resize');
  await snap('neck-resized');

  await page.click('#bodyPlay');
  const start=(await snapshot()).assembly.angleDegrees;await page.waitForTimeout(550);
  assert(Math.abs((await snapshot()).assembly.angleDegrees-start)>.2,'play control did not animate head');
  await page.click('#bodyPlay');
  await page.locator('#body3dStage').screenshot({path:OUT+'/neck-page-stage.png'});
  await page.screenshot({path:OUT+'/neck-page-1280.png',fullPage:true});
  assert.deepEqual(errors,[],'browser errors');
  const report={passed:true,poses:poses.map(s=>({angle:s.assembly.angleDegrees,
    length:s.assembly.muscleLength,l1:s.arms.l1,l2:s.arms.l2,
    upperError:s.assembly.surfaceAttachmentError,lowerError:s.assembly.lowerSurfaceAttachmentError,
    fixedDrift:s.assembly.fixedDrift,oppositeMoments:s.assembly.oppositeMoments})),
    controls:['abstraction/restore','bone/muscle visibility','play/pause','action switches','camera orbit','viewport resize'],errors};
  fs.writeFileSync(OUT+'/neck-report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({passed:true,poses:poses.length,maxUpperError:Math.max(...report.poses.map(s=>s.upperError)),maxLowerError:Math.max(...report.poses.map(s=>s.lowerError)),errors}));
} finally {
  await browser.close();
}
