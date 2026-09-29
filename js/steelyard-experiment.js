/* 杆秤拓展：统一长度比例的理想杠杆模型；忽略杆重、摩擦和形变。 */
(function (global) {
  'use strict';
  const base = { poise: .5, arm: 100, travel: 480 };
  const choices = {
    precision: [
      {name: '换轻一点的秤砣', poise: .25, arm: 100, travel: 480},
      {name: '增大挂钩到支点的距离', poise: .5, arm: 150, travel: 480}
    ],
    range: [
      {name: '换更重的秤砣', poise: .75, arm: 100, travel: 480},
      {name: '加长秤砣可移动的秤杆', poise: .5, arm: 100, travel: 600},
      {name: '缩短挂钩到支点的距离', poise: .5, arm: 70, travel: 480}
    ]
  };
  let panel, mode, selected = 0, frame = 0, progress = 0;
  const limit = c => c.poise * c.travel / c.arm;
  const position = (c, mass) => mass * c.arm / c.poise;
  const clamp = v => Math.max(0, Math.min(1, v));
  const fmt = v => Number(v.toFixed(2)).toString();
  const line = (x,y,xx,yy,color,width=3,extra='') => `<line x1="${x}" y1="${y}" x2="${xx}" y2="${yy}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" ${extra}/>`;
  const text = (x,y,t,size=20,color='#334155',anchor='start') => `<text x="${x}" y="${y}" font-size="${size}" font-weight="650" fill="${color}" text-anchor="${anchor}">${t}</text>`;
  function sample(c, changed, p) {
    if (mode === 'precision') {
      const mass = p < .18 ? 1 : 1.1;
      const move = clamp((p-.35)/.5);
      return {mass, x:position(c,1)+position(c,.1)*move, old:position(c,1), done:p===1};
    }
    const start = limit(base), end = limit(choices.range[selected]);
    const mass = start + (end-start)*clamp((p-.18)/.65);
    // 最后明确将原秤恢复至其最大可称质量，随后展示各自上限。
    const restored = p >= .94 && !changed;
    const m = restored ? start : mass;
    return {mass:m, x:Math.min(c.travel,position(c,m)), over:m>limit(c)+1e-6, done:p===1};
  }
  function row(c, changed, y, p) {
    const a = sample(c,changed,p), ox=265, color=changed?'#0f766e':'#475569';
    const tilt = a.over ? -5 : mode==='precision' && p>=.18 && p<.85 ? -4*(1-clamp((p-.35)/.5)) : 0;
    const rad=tilt*Math.PI/180;
    const point = x => [ox+x*Math.cos(rad),y+x*Math.sin(rad)];
    const hook=point(-c.arm), poise=point(a.x), end=point(c.travel);
    let s = text(32,y-56,changed?'改变后的杆秤':'原来的杆秤',23,color);
    s += text(310,y-56,`秤砣 ${fmt(c.poise*1000)} g`,20,color);
    if(changed) s+=text(950,y-56,choices[mode][selected].name,20,color,'end');
    s+=line(ox,y-42,ox,y,'#64748b',4);
    s+=`<g transform="rotate(${tilt} ${ox} ${y})">`;
    s+=line(ox-170,y,ox+c.travel,y,'#a47545',12);
    if(changed && c.travel>base.travel)s+=line(ox+base.travel,y,ox+c.travel,y,'#0f766e',12);
    s+=line(ox+c.travel,y-12,ox+c.travel,y+12,color,4);
    s+=`</g><circle cx="${ox}" cy="${y}" r="7" fill="#0f766e"/>`;
    s+=text(ox-10,y-15,'支点',18,'#0f766e','end');
    const count = Math.max(1,Math.ceil(a.mass/.5));
    s+=line(hook[0],hook[1],hook[0],y+64-(count-1)*5,'#64748b');
    for(let i=0;i<count;i++) s+=`<rect x="${hook[0]-35}" y="${y+64-i*5}" width="70" height="5" rx="2" fill="${i%2?'#94a3b8':'#64748b'}"/>`;
    s+=text(hook[0],y+96,`${fmt(a.mass)} kg`,25,'#1e293b','middle');
    if(mode==='precision' && p>=.18)s+=text(hook[0],y+122,'＋100 g',18,'#c2410c','middle');
    const size=13*Math.sqrt(c.poise/.5);
    s+=line(poise[0],poise[1],poise[0],poise[1]+25,color);
    s+=`<path d="M${poise[0]-size} ${poise[1]+25} l${-size*.4} 26 q${size*1.4} 12 ${size*2.8} 0 l${-size*.4} -26 Z" fill="${color}"/>`;
    if(mode==='range') {
      s+=text(end[0],y-20,'移动终点',17,color,'middle');
      s+=text(950,y+95,a.over?'超过量程':a.done?`最多称 ${fmt(limit(c))} kg`:'平衡',a.done?27:22,a.over?'#b91c1c':color,'end');
    } else if(p>=.35) {
      const old=ox+a.old, now=ox+a.x;
      s+=line(old,y,old,y+50,'#94a3b8',2,'stroke-dasharray="4 4"');
      s+=`<path d="M${old-13} ${y+25} l-5 26 q18 12 36 0 l-5 -26 Z" fill="none" stroke="#94a3b8" stroke-dasharray="4 4"/>`;
      if(now-old>1)s+=line(old,y+78,now,y+78,color,4)+`<path d="M${now} ${y+78} l-7 -5 v10 Z" fill="${color}"/>`;
      if(a.done)s+=text(now+12,y+85,'移动距离',18,color);
    }
    if(c.arm!==base.arm || (selected===1 && mode==='precision') || (selected===2 && mode==='range')) {
      s+=line(ox-c.arm,y-30,ox,y-30,color,2);
      s+=text(ox-c.arm/2,y-35,changed?(c.arm>base.arm?'距离增大':'距离缩短'):'原距离',16,color,'middle');
    }
    return s;
  }
  function draw() {
    const changed=choices[mode][selected], done=progress===1;
    let graphic=row(base,false,75,progress)+row(changed,true,275,progress);
    if(mode==='precision' && done) {
      graphic+=text(32,429,'移动距离对比',20)+text(32,460,'两者均放大3倍',18);
      [base,changed].forEach((c,i)=>{
        const y=432+i*32, distance=position(c,.1)*3;
        graphic+=text(310,y+6,i?'改变后':'原来',18,'#475569','end');
        graphic+=line(330,y,330+distance,y,i?'#0f766e':'#475569',7);
        graphic+=text(350+distance,y+6,fmt(position(c,.1)/position(base,.1))+'份',19);
      });
    }
    panel.querySelector('svg').setAttribute('viewBox',mode==='precision'?'0 0 1000 490':'0 0 1000 410');
    panel.querySelector('svg').innerHTML=graphic;
    const phase=panel.querySelector('.experiment-phase');
    phase.textContent= mode==='precision'
      ? progress===0?'两把秤都已平衡：物体质量为1.0 kg':progress<.35?'同时增加100 g，原来的平衡被打破':!done?'移动秤砣，重新达到平衡':'同样增加100 g，哪把秤的秤砣移动得更远？'
      : progress===0?'原秤已到最大称量值；改进后的秤砣还能向外移动':progress<.94?'同步增加质量：观察哪把秤还能保持平衡':'恢复至各自最大可称质量，比较量程';
    panel.querySelector('.experiment-result').hidden=!done;
    panel.querySelector('.experiment-result').textContent=mode==='precision'
      ?'同样增加100 g，秤砣移动得更远，两个质量对应的位置就更容易分清。'
      :`最大可称质量：${fmt(limit(base))} kg → ${fmt(limit(changed))} kg`;
    const details=panel.querySelector('details'); details.hidden=!done;
    details.querySelector('summary').textContent=mode==='precision'?'为什么？':'对分辨能力有什么影响？';
    details.querySelector('p').textContent=mode==='precision'
      ?'增加的质量 × 挂钩到支点的距离 ＝ 秤砣质量 × 秤砣移动距离。在位置辨认能力相同的条件下，移动距离更大，更容易区分相近质量。秤砣可移动范围相同时，这样改动会减小量程。'
      :selected===1?'加长有效秤杆，量程增大；同样增加100 g，秤砣移动距离不变。':'量程增大；但同样增加100 g，秤砣移动距离变小，分辨相近质量更困难。';
  }
  function reset() {cancelAnimationFrame(frame);progress=0;panel.querySelector('details').open=false;draw();panel.querySelector('[data-play]').disabled=false;}
  function play() {
    reset();panel.querySelector('[data-play]').disabled=true;
    const start=performance.now(), duration=mode==='precision'?6500:9000;
    function tick(now) {
      if(!panel || !document.querySelector('#labLife.active')) { if(panel) reset(); return; }
      progress=clamp((now-start)/duration);draw();
      if(progress<1)frame=requestAnimationFrame(tick);else panel.querySelector('[data-play]').disabled=false;
    }
    frame=requestAnimationFrame(tick);
  }
  function mount(nextMode) {
    if(panel && mode===nextMode)return;
    close();mode=nextMode;selected=0;
    document.getElementById('labLife').classList.add('experiment-open');
    panel=document.createElement('section');panel.className='steelyard-experiment';
    panel.innerHTML=`<h2>${mode==='precision'?'怎样让杆秤更容易分辨质量的微小变化？':'怎样增大杆秤的量程？'}</h2>
      <div class="experiment-methods">${choices[mode].map((c,i)=>`<button class="btn" data-choice="${i}">${c.name}</button>`).join('')}</div>
      <p class="experiment-phase" aria-live="polite"></p>
      <svg viewBox="0 0 1000 460" role="img" aria-label="上下两把完整杆秤，按相同长度比例比较"></svg>
      <div class="experiment-actions"><button class="btn primary" data-play>${mode==='precision'?'增加100 g，观察变化':'开始比较'}</button><button class="btn" data-replay>重播</button></div>
      <p class="experiment-result" hidden></p><details hidden><summary></summary><p></p></details>
      <small>教学简化模型：忽略杆重、摩擦和形变；两把秤使用相同长度比例。</small>`;
    document.querySelector('#labLife .stage').appendChild(panel);
    const buttons=panel.querySelectorAll('[data-choice]');
    buttons.forEach(b=>b.onclick=()=>{selected=Number(b.dataset.choice);buttons.forEach(x=>x.classList.toggle('active-toggle',x===b));reset();});
    buttons[0].classList.add('active-toggle');
    panel.querySelector('[data-play]').onclick=play;panel.querySelector('[data-replay]').onclick=play;
    reset();
  }
  function close() {cancelAnimationFrame(frame);if(panel)panel.remove();panel=null;document.getElementById('labLife').classList.remove('experiment-open');}
  global.SteelyardExperiment={mount,close};
})(window);
