import {chromium} from 'playwright';import {localThree} from './local-three.mjs';import fs from 'node:fs';
fs.mkdirSync('qa-artifacts-lift-grip',{recursive:true});
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:1000}});await localThree(p);p.on('pageerror',e=>console.log('ERROR',e.message));
await p.goto('http://127.0.0.1:5500');await p.evaluate(()=>AppNav.show('body'));await p.waitForFunction(()=>window.Body3D?.isReady(),{timeout:45000});await p.click('#bodyList [data-i="3"]');await p.click('#bodySkip');
for(const style of ['stoop','squat']){await p.click('[data-lift-style="'+style+'"]');for(const t of [0,.5,1]){
await p.locator('#bodyParamVal').evaluate((e,t)=>{e.value=t;e.dispatchEvent(new Event('input',{bubbles:true}));},t);
const s=await p.evaluate(()=>Body3D.debugSnapshot());console.log(JSON.stringify({style,t,focus:s.assembly.focus,l:s.arms,handError:s.assembly.handError,maxReachError:s.assembly.maxReachError}));await p.locator('#body3dStage').screenshot({path:`qa-artifacts-lift-grip/${style}-${t}.png`});}}
await p.selectOption('#bodyLiftFocus','hip');await p.locator('#bodyParamVal').evaluate(e=>{e.value=0;e.dispatchEvent(new Event('input',{bubbles:true}));});await p.screenshot({path:'qa-artifacts-lift-grip/hip.png',fullPage:true});
await p.selectOption('#bodyLiftFocus','knee');await p.screenshot({path:'qa-artifacts-lift-grip/knee.png',fullPage:true});
console.log('hands',JSON.stringify(await p.evaluate(()=>Body3D.debugSnapshot().assembly.hands)));
await p.click('#bodyList [data-i="0"]');await p.click('#bodySkip');
for(const t of [0,.5,1]){await p.locator('#bodyParamVal').evaluate((e,t)=>{e.value=t;e.dispatchEvent(new Event('input',{bubbles:true}));},t);console.log('calf',t,JSON.stringify(await p.evaluate(()=>Body3D.debugSnapshot().assembly)));await p.locator('#body3dStage').screenshot({path:`qa-artifacts-lift-grip/calf-${t}.png`});}
await b.close();
