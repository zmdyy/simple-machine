import {chromium} from 'playwright';
import {localThree} from './local-three.mjs';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const out='qa-artifacts-lift';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});await localThree(page);
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const snapshot=()=>page.evaluate(()=>Body3D.debugSnapshot());
async function input(id,value){await page.locator('#'+id).evaluate((e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);}
async function photo(name){await page.screenshot({path:out+'/'+name+'.png',fullPage:true});}
const near=(a,b,tol=1e-6)=>assert(Math.abs(a-b)<tol,`${a} differs from ${b}`);
try{
  await page.goto('http://127.0.0.1:5500');await page.evaluate(()=>AppNav.show('body'));
  await page.waitForFunction(()=>window.Body3D?.isReady(),{timeout:45000});
  await page.click('#bodyList [data-i="3"]');
  assert(await page.locator('#bodyLiftControls').isVisible());assert(!await page.locator('#body3dBoot').isVisible(),'loading error overlay visible');
  const samples=[];
  for(const style of ['stoop','squat']){
    await page.click('[data-lift-style="'+style+'"]');await page.selectOption('#bodyLiftFocus','lumbar');
    for(const distance of [.2,.35,.4]){
      await input('bodyLiftDistance',distance);
      for(const t of [0,.25,.49,.5,.51,.75,1]){
        await input('bodyParamVal',t);const s=await snapshot(),a=s.assembly;
        assert(s.pointsFinite&&a.calibrated);assert.equal(a.style,style);
        assert(a.jointError<1e-6,'disconnected joints');assert(a.handError<1e-5,'hand detached from box');
        assert(a.maxReachError<1e-5,'unreachable box');assert(a.attachmentError<1e-6,'muscle detached');
        assert(a.momentResidual<1e-7,'unbalanced moments');assert(a.muscleForce>0,'negative extensor force');
        near(s.arms.l1,.05);near(s.arms.l2,a.distance);near(a.loadMoment,100*a.distance);
        assert(a.distance<=distance&&a.distance>=.18-1e-9);
        near(a.distance,Math.abs(s.worldPoints.p2[2]-s.worldPoints.O[2]));
        assert(a.fingerJointError<1e-6);assert(a.hands.every(h=>h.minHandleRadius>.013),'handle penetrates finger bone');assert(a.hands.every(h=>h.boxPenetrations===0),'hand penetrates box');
        assert.equal(a.muscleNames.length,14);assert.equal(a.footBones,54);
        samples.push({style,t,distance,...a});
      }
    }
  }
  for(const style of ['stoop','squat'])for(const focus of ['hip','knee']){
    await page.click('[data-lift-style="'+style+'"]');await page.selectOption('#bodyLiftFocus',focus);
    const arms=[];
    for(const t of [0,.25,.5,.75,1]){
      await input('bodyParamVal',t);const q=await snapshot(),a=q.assembly;
      assert.equal(a.focus,focus);assert(a.oppositeMoments,'muscle torque reversed');
      assert(a.muscleForce>0&&a.muscleForce<10000,'singular muscle force');
      near(q.arms.l1,a.muscleArm);near(q.arms.l2,a.loadArm);
      near(a.muscleForce*q.arms.l1,a.totalMoment);assert(a.momentResidual<1e-7);
      arms.push(q.arms.l1);
    }
    assert(Math.abs(arms[0]-arms.at(-1))>(style==='stoop'&&focus==='knee'?.0001:.005),'joint moment arm did not vary');
  }
  await page.selectOption('#bodyLiftFocus','lumbar');
  // Same progress/distance comparison: adding upper-body weight changes the
  // total, but cannot change the box's own torque.
  await input('bodyParamVal',0);await input('bodyLiftDistance',.35);
  await page.click('#bodySkip');await photo('squat-forces');
  await page.click('[data-lift-style="stoop"]');await photo('stoop-forces');
  const initial=await snapshot();const rows=initial.assembly.comparison;
  near(rows[0].loadMoment,rows[1].loadMoment);assert(rows[0].bodyMoment>rows[1].bodyMoment);
  await page.uncheck('#bodyLiftBody');let a=(await snapshot()).assembly;
  near(a.bodyMoment,0);near(a.comparison[0].muscleForce,a.comparison[1].muscleForce);near(a.muscleForce,700);
  await input('bodyLiftDistance',.2);near((await snapshot()).assembly.muscleForce,400);
  await page.check('#bodyLiftBody');await input('bodyLiftDistance',.35);
  await page.click('#bodyAbstract');assert.equal(await page.locator('#bodyAbstract').textContent(),'恢复肌肉骨骼');
  assert.equal(await page.locator('#bodyDraw').evaluate(e=>e.childElementCount),0);
  await photo('stoop-abstract');
  await page.click('#bodyAbstract');assert.equal(await page.locator('#bodyAbstract').textContent(),'简化成杠杆');
  await page.click('#bodyToggleMuscle');assert.equal((await snapshot()).assembly.visibleMuscles,0);await page.click('#bodyToggleMuscle');
  assert.equal((await snapshot()).assembly.visibleMuscles,14);
  // Force results are independent of observation direction.
  const canvas=await page.locator('#body3dCanvas').boundingBox();
  await page.mouse.move(canvas.x+canvas.width*.5,canvas.y+canvas.height*.4);await page.mouse.down();
  await page.mouse.move(canvas.x+canvas.width*.65,canvas.y+canvas.height*.5,{steps:6});await page.mouse.up();
  near((await snapshot()).assembly.muscleForce,initial.assembly.muscleForce);
  // Rebinding restores original geometry when revisiting all four actions.
  for(const index of [1,2,0,3,2,3]){await page.click('#bodyList [data-i="'+index+'"]');assert((await snapshot()).pointsFinite);}
  await input('bodyParamVal',0);const returned=await snapshot();
  initial.worldPoints.O.forEach((v,i)=>near(v,returned.worldPoints.O[i]));
  near(returned.assembly.attachmentError,initial.assembly.attachmentError);
  await page.click('#bodyPlay');await page.waitForTimeout(400);assert((await snapshot()).assembly.trunkDegrees<75);await page.click('#bodyPlay');
  await input('bodyParamVal',1);near((await snapshot()).assembly.trunkDegrees,0);await photo('standing');
  await page.setViewportSize({width:390,height:844});await page.click('[data-lift-style="squat"]');await input('bodyParamVal',0);
  await page.click('#bodySkip');await photo('mobile-squat');
  assert(await page.locator('[data-lift-style="squat"]').isVisible());
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'horizontal overflow');
  assert.equal(errors.length,0,errors.join('\n'));
  fs.writeFileSync(out+'/report.json',JSON.stringify({samples:samples.length,jointSamples:20,minHandleBoneClearance:Math.min(...samples.flatMap(s=>s.hands.map(h=>h.minHandleRadius-.013))),maxFingerJointError:Math.max(...samples.map(s=>s.fingerJointError)),maxJointError:Math.max(...samples.map(s=>s.jointError)),maxHandError:Math.max(...samples.map(s=>s.handError)),maxAttachmentError:Math.max(...samples.map(s=>s.attachmentError)),maxMomentResidual:Math.max(...samples.map(s=>s.momentResidual)),errors,initial:initial.assembly},null,2));
  console.log('PASS: 42 lumbar poses, 20 joint poses, force balance, distance/body controls, abstract restore, layers, orbit, navigation, playback and mobile');
}finally{await browser.close();}
