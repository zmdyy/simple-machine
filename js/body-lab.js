/**
 * 人体杠杆 · 观察理解版
 * 目标：真实解剖结构 → 关节支点 → 肌肉动力 → 重物阻力 → 三维力臂 → 简化杠杆。
 * 本模块不再提供“你来画”，先把观察、动作和物理关系做准确。
 */
(function (global) {
  'use strict';

  const K = global.LeverKernel;
  const S = global.LeverSVG;
  const C = K.COLORS;
  const STEPS = 7;

  const EXAMPLES = [
    {
      id: 'calf',
      presetId: 'calf',
      name: '踮脚（样板）',
      sample: true,
      leverType: '第二类杠杆（省力）',
      abstractSummary: '前脚掌 O｜跟腱拉力 F₁｜身体重力 F₂｜阻力点位于 O 与动力点之间 → 第二类杠杆',
      action: '观察：踮起脚跟（前脚掌着地）',
      whyO: '前脚掌着地点可简化为支点 O；小腿三头肌经跟腱向上拉跟骨，身体重力经踝部向下。',
      anatomy: '自动聚焦：胫骨、腓骨、距骨、跟骨、跖骨与趾骨；重点高亮腓肠肌和比目鱼肌。',
      paramLabel: '踮起幅度',
      filmTip: '侧拍整脚与小腿；慢慢踮起脚跟，前脚掌保持接触地面。',
      fallback(t) {
        const gy = 360;
        const O = K.v(390, gy);
        const heel = K.v(318, gy - 12 - t * 58);
        const ankle = K.v(408, gy - 88);
        return {
          O, bar: [O, heel],
          p1: K.v(heel.x + 6, heel.y - 8), d1: K.norm(K.v(0.12, -1)),
          p2: ankle, d2: K.v(0, 1), f2: 600,
        };
      },
    },
    {
      id: 'curl',
      presetId: 'curl',
      name: '举哑铃（样板）',
      sample: true,
      leverType: '第三类杠杆（费力）',
      abstractSummary: '肘关节 O｜肱二头肌 F₁｜哑铃重力 F₂｜动力点位于 O 与阻力点之间 → 第三类杠杆',
      action: '观察：屈肘举哑铃',
      whyO: '肘关节是转动枢纽 O；肱二头肌在靠近肘部的位置牵拉桡骨，哑铃重力作用在手部。',
      anatomy: '自动聚焦：肱骨、尺骨、桡骨、手部骨骼；重点高亮肱二头肌和肱肌。',
      paramLabel: '屈肘角度',
      filmTip: '侧拍肩、肘、手和哑铃；只慢屈肘，身体不要明显晃动。',
      fallback(t) {
        const O = K.v(260, 248);
        const len = 150;
        const th = 0.10 + t * 1.25;
        const grip = K.v(O.x + len * Math.cos(th), O.y + len * Math.sin(th));
        const ins = K.v(O.x + len * 0.24 * Math.cos(th), O.y + len * 0.24 * Math.sin(th) - 10);
        const belly = K.v(O.x - 4, O.y - 86);
        return {
          O,
          bar: [O, grip],
          p1: ins,
          d1: K.norm(K.sub(belly, ins)),
          p2: grip,
          d2: K.v(0, 1),
          f2: 50,
        };
      },
    },
    {
      id: 'neck',
      presetId: 'neck',
      name: '低头 / 抬头',
      sample: true,
      leverType: '第一类杠杆（支点居中）',
      abstractSummary: '后侧肌肉拉力 F₁｜支点 O｜前侧头部重力 G；两个力产生相反的转动作用。',
      action: '观察：颈后肌怎样让头部保持平衡？',
      whyO: '头部简化为杠杆：颈后肌牵拉后脑，产生抬头作用；头部重力产生低头作用。',
      anatomy: '局部聚焦：头骨与颈部支撑骨骼；重点显示左右头夹肌及其附着关系。',
      paramLabel: '头位（低头 → 平视 → 抬头）',
      filmTip: '侧拍头颈肩；慢低头再抬头，身体不要转动。',
      fallback(t) {
        const O = K.v(328, 228);
        const ang = -0.55 + t * 1.1;
        const headR = 36;
        const cx = O.x + headR * Math.sin(ang);
        const cy = O.y - headR * Math.cos(ang) * 0.85;
        const com = K.v(cx, cy + 12);
        const nape = K.v(O.x - 18, O.y - 32);
        return {
          O, bar: [O, com],
          p1: nape, d1: K.norm(K.v(0.25, 1)),
          p2: com, d2: K.v(0, 1), f2: 50,
        };
      },
    },
    {
      id: 'lift',
      presetId: 'lift',
      name: '弯腰 vs 蹲举',
      sample: true,
      leverType: '腰部等效杠杆（费力）',
      abstractSummary: '同一重物、同一动力臂：比较重物距离与上身倾斜产生的转动作用。',
      action: '对比：同一重物，直腿弯腰与屈膝蹲举',
      whyO: '腰骶部附近简化为支点 O。重物与上身重力产生前倾作用，腰背伸肌提供相反的转动作用。',
      anatomy: '红色显示腰背肌、臀大肌与股四头肌；切换观察腰、髋、膝的作用。',
      paramLabel: '提起进度',
      filmTip: '观察同一进度与重物距离下的两种姿态；课堂使用模型，不要求学生负重模仿。',
      fallback() {
        // Loading-only placeholder. Never show the former mixed-posture model.
        return {O:K.v(400,220),p1:K.v(380,180),p2:K.v(490,240),
          d1:K.v(0,1),d2:K.v(0,1),f2:100,bar:[]};
      },
    },
  ];

  let state = {
    idx: 1,
    step: 1,
    t: 0.35,
    tPrev: null,
    abstract: false,
    playing: false,
    bound3d: false,
    liftStyle: 'stoop', liftFocus:'lumbar', liftDistance: .35, liftBody: true,
  };

  let motionRaf = 0;
  let motionDir = 1;
  let lastMotionTs = 0;

  function ex() {
    return EXAMPLES[state.idx];
  }

  function svg() {
    return document.getElementById('bodySvg');
  }

  function rigInfo() {
    return global.AnatomyRigs && AnatomyRigs.RIGS ? AnatomyRigs.RIGS[ex().id] : null;
  }

  function sync3d() {
    const B = global.Body3D;
    if (!B || !B.isReady()) return;
    if (ex().id === 'lift') B.setLiftOptions({style:state.liftStyle,focus:state.liftFocus,distance:state.liftDistance,includeBody:state.liftBody});
    B.setAction(ex().id, state.t);
    B.setStepReveal(state.step, false);
  }

  function geom() {
    let g = null;
    if (global.Body3D && Body3D.isReady()) g = Body3D.getLandmarks();
    if (!g && global.BodyScenes) g = BodyScenes.layout(ex().id, state.t);
    if (!g || !g.O) g = ex().fallback(state.t);

    if (!g.a1) g.a1 = K.forceArm(g.O, g.p1, g.d1);
    if (!g.a2) g.a2 = K.forceArm(g.O, g.p2, g.d2);

    g.f1 = (g.totalMoment ?? (g.f2 * g.a2.armLen)) / Math.max(g.a1.armLen, 1e-6);
    g.cls = K.classifyLever(g.a1.armLen, g.a2.armLen);
    return g;
  }

  function renderList() {
    const box = document.getElementById('bodyList');
    if (!box) return;
    box.innerHTML = EXAMPLES.map((e, i) => {
      const tag = e.sample
        ? '<span class="tag key">样板</span>'
        : '<span class="tag eq">待完善</span>';
      return '<button type="button" class="life-item' + (i === state.idx ? ' active' : '') +
        '" data-i="' + i + '">' + e.name + tag + '</button>';
    }).join('');
  }

  function setJudge(msg, ok) {
    const el = document.getElementById('bodyJudge');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'judge-msg' + (ok === true ? ' ok' : ok === false ? ' bad' : '');
  }

  function stepHint(e, step, g) {
    const ratio = g.a1.armLen > 1e-6 ? g.a2.armLen / g.a1.armLen : Infinity;

    if (e.id === 'lift' && state.liftFocus!=='lumbar') {
      const knee=state.liftFocus==='knee';
      return [null,'观察红色肌肉：'+(knee?'大腿前方的股四头肌经髌骨和髌腱牵拉胫骨。':'臀大肌位于髋部后方，起身时参与伸髋。'),
        '支点 O 位于'+(knee?'膝关节':'髋关节')+'。此处与腰部分析使用不同的受力对象。',
        '红箭头表示'+(knee?'髌腱作用于胫骨的拉力':'臀大肌对骨盆的等效拉力')+'。',
        knee?'蓝箭头为地面的向上支持力，局部示意取 350 N。':'单侧分担一半重物和所选上身自重。',
        '力臂为支点到作用线的垂直距离，随姿态重新计算。',
        '播放起身动作，观察动力臂、外力臂和肌肉拉力的同步变化。',
        '这是单关节的准静态力矩示意，省略关节反力及其他肌肉共同作用。'][step];
    }
    if (e.id === 'lift') {
      return [null,
        '先看姿态：髋、膝与躯干共同改变位置；腰部的等效支点仍是同一解剖区域。',
        'O 是腰骶部附近的等效支点；不是膝关节，也不是髋关节。',
        'F₁ 表示腰背伸肌的合力，动力臂按 5 cm 简化。',
        '重物重力为 100 N。计入上身自重时，另一个向下的力也产生前倾作用。',
        '只改重物距离：保持重力不变，距离越大，前倾力矩越大。',
        '在同一提起进度切换两种姿态，再比较相同重物距离。蹲举本身不保证腰部受力更小。',
        '两种姿态共用 O 与同一套平衡关系；简化杠杆中的点位与人体模型对应。'][step];
    }
    if (e.id === 'curl') {
      const hints = {
        1: '先观察局部解剖：前臂会绕肘关节运动，肱二头肌被重点高亮。',
        2: '支点 O：肘关节。先只确认“绕哪里转”。',
        3: '动力 F₁：肱二头肌经肌腱牵拉桡骨。红色箭头表示肌肉拉力方向。',
        4: '阻力 F₂：哑铃重力竖直向下。这里按约 5 kg、50 N 做示意。',
        5: '现在看两条力臂：l₁、l₂ 都是从 O 到对应作用线的垂直距离。',
        6: '拖动屈肘角度或点“播放动作”，观察肌肉方向、l₁、l₂ 与所需 F₁ 如何一起变化。',
        7: '简化成杠杆后，只保留 O、F₁、F₂、l₁、l₂。真实人体结构与抽象杠杆在同一位置对应。',
      };
      let msg = hints[step] || '';
      if (step >= 5 && isFinite(ratio)) {
        msg += ' 当前 l₂/l₁ ≈ ' + ratio.toFixed(2) +
          '，维持平衡所需 F₁ ≈ ' + g.f1.toFixed(0) + ' N（简化示意）。';
      }
      return msg;
    }

    if (e.id === 'calf') {
      const hints = {
        1: '先观察局部解剖：前脚掌保持着地，脚跟抬起；腓肠肌和比目鱼肌被重点高亮。',
        2: '支点 O：前脚掌着地点（跖趾关节附近）。这是足部绕地面转动的简化枢轴。',
        3: '动力 F₁：小腿三头肌经跟腱向上拉跟骨。红色箭头表示跟腱拉力的方向。',
        4: '阻力 F₂：身体重力经踝部向下作用。这里取约 600 N 作课堂示意。',
        5: '比较两条力臂：动力臂 l₁ 大于阻力臂 l₂，因此这是典型的第二类杠杆。',
        6: '拖动“踮起幅度”或播放动作，观察脚跟升高时两条作用线、力臂和所需 F₁ 的变化。',
        7: '简化成杠杆后，只保留前脚掌 O、跟腱 F₁、身体重力 F₂ 和两条力臂，仍能对应真实人体结构。',
      };
      let msg = hints[step] || '';
      if (step >= 5 && isFinite(ratio)) {
        msg += ' 当前 l₂/l₁ ≈ ' + ratio.toFixed(2) +
          '，维持平衡所需 F₁ ≈ ' + g.f1.toFixed(0) + ' N；F₁ 小于 F₂，体现“省力但费距离”。';
      }
      return msg;
    }

    if (e.id === 'neck') {
      const hints = {
        1: '红色的是颈后肌（以头夹肌为例）：上端附着在耳后、后脑区域，下方连接颈背部。抬头时缩短，缓慢低头时受控拉长。',
        2: '支点 O：枕寰关节附近的等效支点。把头部看作一个整体，绕 O 转动。',
        3: '动力 F₁：左右头夹肌牵拉头部，简化为一个等效拉力；B 表示等效作用点，箭头沿肌肉方向指向颈背部。',
        4: '阻力 G：头部重力从重心 A 竖直向下。重力使头部有低头趋势，颈后肌拉力产生抬头作用。',
        5: 'l₁、l₂ 都是 O 到力的作用线的垂直距离，不能直接把 OB、OA 当作力臂。平衡时 F₁l₁＝Gl₂。',
        6: '拖动头位或播放动作：肌肉上端随头骨移动，下方附着区域保持稳定；肌肉方向与两条力臂一起变化。',
        7: '人体与杠杆使用同一套 O、A、B 和作用线。向下拉后脑，可以使前面的脸抬起来。',
      };
      let msg=hints[step] || '';
      if (step>=5 && isFinite(ratio)) msg+=' 当前姿态保持平衡所需 F₁≈'+g.f1.toFixed(0)+' N（教学示意）。';
      return msg;
    }
    return '当前动作保留为后续模板。';
  }

  function updateTemplateCard() {
    const e = ex();
    const rig = rigInfo();
    let t = rig && rig.teaching;
    if(e.id==='lift'&&state.liftFocus!=='lumbar'){
      const knee=state.liftFocus==='knee';
      t={joint:knee?'膝关节':'髋关节',bones:knee?'股骨、髌骨、胫骨':'骨盆、股骨',
        muscles:knee?'股四头肌（股直肌、股内侧肌、股外侧肌、股中间肌）':'臀大肌',
        effort:knee?'股四头肌经髌腱牵拉胫骨，形成伸膝力矩':'臀大肌在髋后方牵拉骨盆，形成伸髋力矩',
        load:knee?'支持力向上，取 350 N 作单侧局部示意':'单侧分担重物 50 N 和所选上身自重的一半',
        note:'力与力臂随姿态更新；肌肉路径和载荷取教学设定，不是个体肌力测量。省略其他肌肉、下肢自重及动态惯性。'};
    }
    const title = document.getElementById('bodyTemplateTitle');
    const anatomy = document.getElementById('bodyTemplateAnatomy');
    const lever = document.getElementById('bodyTemplateLever');
    const note = document.getElementById('bodyTemplateNote');
    if (title) title.textContent = e.sample ? e.name.replace('（样板）', '') + ' · 人体杠杆动作模板' : e.name + ' · 待完善模板';
    if (anatomy) anatomy.textContent = t
      ? '骨骼：' + t.bones + '；肌肉：' + t.muscles + '；关节：' + t.joint + '。'
      : e.anatomy;
    if (lever) lever.textContent = t
      ? t.effort + '；' + t.load + '。'
      : e.whyO;
    if (note) note.textContent = t
      ? t.note
      : '该动作将在“举哑铃”样板稳定后按同一模板重构。';
  }

  function drawDumbbell(layer, p) {
    if (!p || ex().id !== 'curl') return;
    S.el('line', {
      x1: p.x - 22, y1: p.y, x2: p.x + 22, y2: p.y,
      stroke: '#111827', 'stroke-width': 7, 'stroke-linecap': 'round',
    }, layer);
    S.el('rect', { x: p.x - 34, y: p.y - 11, width: 12, height: 22, rx: 3, fill: '#334155' }, layer);
    S.el('rect', { x: p.x + 22, y: p.y - 11, width: 12, height: 22, rx: 3, fill: '#334155' }, layer);
  }

  function outlinedLabel(layer, x, y, text, color, anchor, size) {
    const fs = size || 15;
    const ta = anchor || 'middle';
    S.el('text', {
      x, y, fill: '#fff', stroke: '#fff', 'stroke-width': fs * 0.30,
      'font-size': fs, 'font-weight': 800, 'text-anchor': ta,
      'paint-order': 'stroke',
    }, layer).textContent = text;
    S.el('text', {
      x, y, fill: color, 'font-size': fs, 'font-weight': 800,
      'text-anchor': ta,
    }, layer).textContent = text;
  }

  function drawCalfArmLabels(layer, g) {
    const m1 = K.add(g.O, K.scale(K.sub(g.a1.foot, g.O), 0.58));
    const m2 = K.add(g.O, K.scale(K.sub(g.a2.foot, g.O), 0.52));
    outlinedLabel(layer, m1.x, m1.y - 24, 'l₁', C.arm1, 'middle', 16);
    outlinedLabel(layer, m2.x, m2.y + 30, 'l₂', C.arm2, 'middle', 16);
  }

  function drawNeckArmLabels(layer,g) {
    const m1=K.add(g.O,K.scale(K.sub(g.a1.foot,g.O),.6));
    const m2=K.add(g.O,K.scale(K.sub(g.a2.foot,g.O),.6));
    outlinedLabel(layer,m1.x+12,m1.y+28,'l₁',C.arm1,'start',16);
    outlinedLabel(layer,m2.x-8,m2.y+28,'l₂',C.arm2,'end',16);
  }

  function drawAbstractModel(layer, g) {
    S.el('rect', {
      x: 24, y: 20, width: 752, height: 372, rx: 18,
      fill: 'rgba(255,255,255,0.88)', stroke: '#cbd5e1', 'stroke-width': 1.2,
    }, layer);

    // 把真实人体上得到的 O / P₁ / P₂ 原位置保留下来，只去掉解剖细节。
    // 杠杆主体延伸到离 O 更远的作用点：举哑铃是阻力端，踮脚则是跟腱动力端。
    const leverEnd = K.dist(g.O, g.p1) > K.dist(g.O, g.p2) ? g.p1 : g.p2;
    S.el(ex().id === 'neck' ? 'polyline' : 'line', {
      points: ex().id === 'neck' ? [g.p1,g.O,g.p2].map(p=>p.x+','+p.y).join(' ') : undefined,
      fill: 'none', x1: g.O.x, y1: g.O.y, x2: leverEnd.x, y2: leverEnd.y,
      stroke: '#475569', 'stroke-width': 10, 'stroke-linecap': 'round', opacity: 0.88,
    }, layer);
    S.el('circle', { cx: g.p1.x, cy: g.p1.y, r: 6, fill: C.F1 }, layer);
    S.el('circle', { cx: g.p2.x, cy: g.p2.y, r: 6, fill: C.F2 }, layer);
    S.drawPivot(layer, g.O, ex().id==='neck' ? ' ' : undefined);
    if (ex().id==='neck') outlinedLabel(layer,g.O.x-4,g.O.y+40,'O','#111827','middle',16);

    const px1 = 52 + Math.min(96, Math.sqrt(Math.max(g.f1, 1)) * 4.0);
    S.drawForceArrow(layer, g.p1, g.d1, px1, C.F1, 'F₁', { O: g.O, scale: 1.08 });
    S.drawForceArrow(layer, g.p2, g.d2, 72, C.F2, ex().id === 'neck' ? 'G' : 'F₂', { O: g.O });
    S.drawForceLine(layer, g.p1, g.d1, ex().id==='neck' ? 110 : 190);
    S.drawForceLine(layer, g.p2, g.d2, ex().id==='neck' ? 110 : 190);
    const calf = ex().id === 'calf', neck=ex().id==='neck';
    S.drawArm(layer, g.O, g.a1.foot, calf || neck ? '' : 'l₁', false, C.arm1, g.d1);
    S.drawArm(layer, g.O, g.a2.foot, calf || neck ? '' : 'l₂', false, C.arm2, g.d2);
    if (calf) drawCalfArmLabels(layer, g);
    if (neck) drawNeckArmLabels(layer,g);
    if (ex().id === 'neck') {
      outlinedLabel(layer,g.p1.x+14,g.p1.y-14,'B',C.F1,'start',16);
      outlinedLabel(layer,g.p2.x-14,g.p2.y-14,'A',C.F2,'end',16);
    }

    S.el('text', {
      x: 44, y: 52, fill: '#0f766e', 'font-size': 20, 'font-weight': 800,
    }, layer).textContent = '从人体结构抽象成杠杆';
    S.el('text', {
      x: 44, y: 78, fill: '#475569', 'font-size': 13, 'font-weight': 600,
    }, layer).textContent = ex().abstractSummary || 'O、F₁、F₂ 与两条力臂保持和真实结构中的位置对应。';
  }

  function renderLiftControls(g) {
    const active = ex().id === 'lift';
    document.getElementById('labBody').classList.toggle('lift-active', active);
    document.getElementById('bodyLiftControls').hidden = !active;
    document.getElementById('bodyLiftReadout').hidden = !active;
    if (!active) return;
    document.querySelectorAll('[data-lift-style]').forEach(b => {
      const on = b.dataset.liftStyle === state.liftStyle;
      b.classList.toggle('active-toggle', on); b.setAttribute('aria-pressed', String(on));
    });
    document.getElementById('bodyLiftDistance').value = state.liftDistance;
    document.getElementById('bodyLiftDistanceOut').textContent = Math.round(state.liftDistance*100)+' cm';
    document.getElementById('bodyLiftBody').checked = state.liftBody;
    if (!g.lift) return;
    const q = g.lift;
    document.getElementById('bodyLiftFocus').value=state.liftFocus;
    const local=q.focus!=='lumbar';
    document.getElementById('bodyLiftCompare').hidden=local;
    document.getElementById('bodyLiftJointInfo').hidden=!local;
    document.getElementById('bodyLiftReadoutTitle').textContent=local?q.effortLabel+' · 单侧局部杠杆':'同一重物 · 同一进度 · 同一靠近路径';
    document.getElementById('bodyLiftJointInfo').textContent=local?'动力臂 '+(g.a1.armLen*100).toFixed(1)+' cm；外力臂 '+(g.a2.armLen*100).toFixed(1)+' cm。'+(q.focus==='knee'?'支持力固定取 350 N；观察肌肉拉力随起身变化。':'单侧分担重物 50 N，以及所选上身自重的一半。'):'';
    document.getElementById('bodyLiftDistanceNow').textContent = (local?'当前箱子距腰部 ':'当前重物力臂 ')+(q.distance*100).toFixed(1)+' cm';
    document.getElementById('bodyLiftFormula').textContent = state.liftBody
      ? 'F₁ × 0.05 ≈ 100 × '+q.distance.toFixed(3)+' + 300 × '+q.bodyArm.toFixed(3)
      : 'F₁ × 0.05 = 100 × '+q.distance.toFixed(3);
    if(local) document.getElementById('bodyLiftFormula').textContent='F₁ × '+g.a1.armLen.toFixed(3)+' ≈ '+q.totalMoment.toFixed(1)+' N·m';
    document.getElementById('bodyLiftResult').textContent = (local?'平衡外力矩 ':'前倾力矩 ')+q.totalMoment.toFixed(1)+' N·m → 肌肉合力约 '+Math.round(q.muscleForce)+' N';
    document.getElementById('bodyLiftCompareRows').innerHTML = q.comparison.map(p=>'<tr'+(p.style===state.liftStyle?' class="current"':'')+'><th scope="row">'+(p.style==='stoop'?'弯腰':'蹲举')+'</th><td>'+p.loadMoment.toFixed(1)+'</td><td>'+p.bodyMoment.toFixed(1)+'</td><td>'+Math.round(p.muscleForce)+'</td></tr>').join('');
  }

  function drawLiftOverlay(layer, g, step, abstract) {
    if (!g.lift) return;
    if (abstract) {
      S.el('rect',{x:12,y:8,width:776,height:404,rx:14,fill:'rgba(255,255,255,.92)'},layer);
      if (g.bodyWeight) S.el('line',{x1:g.O.x,y1:g.O.y,x2:g.bodyCOM.x,y2:g.bodyCOM.y,stroke:'#94a3b8','stroke-width':3,'stroke-dasharray':'5 4'},layer);
      S.el('polyline',{points:[g.p1,g.O,g.p2].map(p=>p.x+','+p.y).join(' '),fill:'none',stroke:'#475569','stroke-width':7},layer);
      outlinedLabel(layer,28,34,g.lift.pivotLabel+' · '+(state.liftStyle==='stoop'?'弯腰':'蹲举'),'#0f766e','start',17);
    }
    const sign=g.p2.x>=g.O.x?1:-1;
    if (step>=2) {
      S.drawPivot(layer,g.O,' ');
      outlinedLabel(layer,g.O.x-sign*20,g.O.y+(g.lift.focus==='lumbar'?28:43),g.lift.pivotLabel,'#17212b',sign>0?'end':'start',14);
    }
    if (step>=3) {
      S.drawForceArrow(layer,g.p1,g.d1,Math.min(95,35+Math.sqrt(g.f1/100)*12),C.F1,'',{O:g.O});
      S.el('circle',{cx:g.p1.x,cy:g.p1.y,r:4,fill:C.F1},layer);
      outlinedLabel(layer,g.p1.x-sign*24,g.p1.y-(g.lift.focus==='lumbar'?28:65),g.lift.effortLabel+' F₁≈'+Math.round(g.f1)+' N',C.F1,sign>0?'end':'start',14);
    }
    if (step>=4) {
      S.drawForceArrow(layer,g.p2,g.d2,65,C.F2,'',{O:g.O});
      S.el('circle',{cx:g.p2.x,cy:g.p2.y,r:4,fill:C.F2},layer);
      outlinedLabel(layer,g.p2.x+sign*15,g.p2.y+(g.d2.y>0?72:-20),g.lift.loadLabel,C.F2,sign>0?'start':'end',14);
      if(g.bodyWeight) {
        S.drawForceArrow(layer,g.bodyCOM,g.d2,58,'#b45309','',{O:g.O});
        S.el('circle',{cx:g.bodyCOM.x,cy:g.bodyCOM.y,r:4,fill:'#b45309'},layer);
        outlinedLabel(layer,g.bodyCOM.x+sign*22,g.bodyCOM.y-12,'上身 '+g.bodyWeight+' N','#b45309',sign>0?'start':'end',13);
      }
    }
    if (step>=5) {
      S.drawForceLine(layer,g.p1,g.d1,100);
      S.drawForceLine(layer,g.p2,g.d2,135);
      S.drawArm(layer,g.O,g.a1.foot,'',false,C.arm1,g.d1);
      S.drawArm(layer,g.O,g.a2.foot,'',false,C.arm2,g.d2);
      const mid=K.add(g.O,K.scale(K.sub(g.a2.foot,g.O),.5));
      outlinedLabel(layer,mid.x,mid.y-30,(g.lift.focus==='lumbar'?'重物力臂 ':'外力臂 ')+(g.a2.armLen*100).toFixed(1)+' cm',C.arm2,'middle',13);
      outlinedLabel(layer,g.a1.foot.x-sign*16,g.a1.foot.y+(g.lift.focus==='lumbar'?-8:16),(g.lift.focus==='lumbar'?'等效 5 cm（固定）':(g.a1.armLen*100).toFixed(1)+' cm'),C.arm1,sign>0?'end':'start',12);
    }
  }

  function render() {
    const root = svg();
    if (!root) return;
    const Lbar = root.querySelector('#bodyBar');
    const Ldraw = root.querySelector('#bodyDraw');
    const Lui = root.querySelector('#bodyUi');
    S.ensureDefs(root);
    S.clear(Lbar);
    S.clear(Ldraw);
    S.clear(Lui);

    const e = ex();
    const step = state.step;
    const abstractNow = state.abstract;
    const stage = document.getElementById('body3dStage');
    if (stage) stage.classList.toggle('abstract-mode', abstractNow);

    const ready3d = !!(global.Body3D && Body3D.isReady());
    const canvas = document.getElementById('body3dCanvas');
    if (canvas) canvas.style.visibility = ready3d ? 'visible' : 'hidden';
    if (ready3d) sync3d();

    if (e.id === 'lift' && !ready3d) {
      document.getElementById('body3dStatus').textContent = '正在加载搬举解剖模型…';
      return;
    }
    const g = geom();
    renderLiftControls(g);

    const action = document.getElementById('bodyAction');
    const why = document.getElementById('bodyWhy');
    const film = document.getElementById('bodyFilmTip');
    const badge = document.getElementById('bodyStepBadge');
    if (action) action.textContent = e.action;
    if (why) why.textContent = e.id==='lift'&&state.liftFocus!=='lumbar' ? (state.liftFocus==='knee'?'股四头肌位于大腿前方，经过髌骨与髌腱牵拉胫骨，使膝关节伸展。':'臀大肌位于髋部后方，连接骨盆和股骨，参与起身时的伸髋。') : e.whyO;
    if (film) film.textContent = e.filmTip || '';
    if (badge) badge.textContent = '步骤 ' + step + ' / ' + STEPS;

    updateTemplateCard();

    if (!ready3d && global.BodyScenes) BodyScenes.draw(Lbar, e.id, state.t);
    const status = document.getElementById('body3dStatus');
    if (status && ready3d) status.textContent = e.anatomy;

    // 分步揭示：1 解剖；2 O；3 F₁；4 F₂；5 力臂；6 动态；7 抽象。
    if (step >= 2) {
      // 已有解剖名称的支点不再重复绘制默认的 O。
      S.drawPivot(Ldraw, g.O, e.id === 'calf' || e.id === 'curl' || e.id === 'neck' ? ' ' : undefined);
      if (e.id === 'neck') outlinedLabel(Ldraw,g.O.x-4,g.O.y+40,'支点 O','#111827','middle',15);
      if (e.id === 'curl' || e.id === 'calf') {
        S.el('text', {
          x: e.id === 'calf' ? g.O.x - 28 : g.O.x + 34,
          y: e.id === 'calf' ? g.O.y - 22 : g.O.y - 28,
          fill: '#111827', 'font-size': 15, 'font-weight': 800,
          stroke: '#fff', 'stroke-width': 4, 'paint-order': 'stroke',
          'text-anchor': e.id === 'calf' ? 'end' : 'start',
        }, Ldraw).textContent = e.id === 'curl' ? '肘关节 O' : '前脚掌 O';
      }
    }

    if (step >= 3) {
      const px1 = 46 + Math.min(92, Math.sqrt(Math.max(g.f1, 1)) * 4.2);
      S.drawForceArrow(
        Ldraw, g.p1, g.d1, px1, C.F1,
        e.id === 'calf' || e.id === 'neck' ? '' : ('F₁≈' + g.f1.toFixed(0) + ' N'),
        { O: g.O, scale: 1.05, labelOffset: 68 }
      );
      if (e.id === 'calf') {
        outlinedLabel(Ldraw, g.p1.x + 74, g.p1.y - 92,
          'F₁≈' + g.f1.toFixed(0) + ' N', C.F1, 'start', 15);
      }
      if (e.id === 'neck') {
        S.el('circle',{cx:g.p1.x,cy:g.p1.y,r:5,fill:C.F1,stroke:'#fff','stroke-width':2},Ldraw);
        outlinedLabel(Ldraw,g.p1.x+14,g.p1.y-14,'B',C.F1,'start',16);
        const tip=K.add(g.p1,K.scale(g.d1,px1));
        outlinedLabel(Ldraw,tip.x+18,tip.y+8,'肌肉拉力 F₁',C.F1,'start',15);
      }
      if (e.id === 'curl' || e.id === 'calf') {
        S.el('circle', {
          cx: g.p1.x, cy: g.p1.y, r: 5,
          fill: C.F1, stroke: '#fff', 'stroke-width': 2,
        }, Ldraw);
        if (e.id === 'curl' || step === 3) {
          S.el('text', {
            x: e.id === 'calf' ? g.p1.x + 18 : g.p1.x + 12,
            y: e.id === 'calf' ? g.p1.y + 30 : g.p1.y + 18,
            fill: C.F1, 'font-size': 13, 'font-weight': 800,
            stroke: '#fff', 'stroke-width': 4, 'paint-order': 'stroke',
          }, Ldraw).textContent = e.id === 'curl' ? '动力点' : '跟腱动力点';
        }
      }
    }

    if (step >= 4) {
      const px2 = 72;
      S.drawForceArrow(
        Ldraw, g.p2, g.d2, px2, C.F2,
        e.id === 'calf' || e.id === 'neck' ? '' : ('F₂=' + g.f2 + ' N'),
        { O: g.O, labelOffset: 62 }
      );
      if (e.id === 'calf') {
        outlinedLabel(Ldraw, g.p2.x + 54, g.p2.y + 60,
          'F₂=' + g.f2 + ' N', C.F2, 'start', 15);
      }
      if (e.id === 'neck') {
        S.el('circle',{cx:g.p2.x,cy:g.p2.y,r:5,fill:C.F2,stroke:'#fff','stroke-width':2},Ldraw);
        outlinedLabel(Ldraw,g.p2.x-14,g.p2.y-14,'重心 A',C.F2,'end',15);
        const tip=K.add(g.p2,K.scale(g.d2,px2));
        outlinedLabel(Ldraw,tip.x-14,tip.y+18,'重力 G',C.F2,'end',15);
      }
      drawDumbbell(Ldraw, g.p2);
      if (e.id === 'curl' || e.id === 'calf') {
        S.el('circle', {
          cx: g.p2.x, cy: g.p2.y, r: 5,
          fill: C.F2, stroke: '#fff', 'stroke-width': 2,
        }, Ldraw);
        if (e.id === 'curl' || step === 4) {
          S.el('text', {
            x: e.id === 'calf' ? g.p2.x - 24 : g.p2.x + 16,
            y: e.id === 'calf' ? g.p2.y - 24 : g.p2.y - 14,
            fill: C.F2, 'font-size': 13, 'font-weight': 800,
            stroke: '#fff', 'stroke-width': 4, 'paint-order': 'stroke',
            'text-anchor': e.id === 'calf' ? 'end' : 'start',
          }, Ldraw).textContent = e.id === 'curl' ? '阻力点' : '重力作用点';
        }
      }
    }

    if (step >= 5) {
      S.drawForceLine(Ldraw, g.p1, g.d1, e.id==='neck' ? 110 : 190);
      S.drawForceLine(Ldraw, g.p2, g.d2, e.id==='neck' ? 110 : 190);
      const calf = e.id === 'calf', neck=e.id==='neck';
      S.drawArm(Ldraw, g.O, g.a1.foot, calf || neck ? '' : 'l₁', false, C.arm1, g.d1);
      S.drawArm(Ldraw, g.O, g.a2.foot, calf || neck ? '' : 'l₂', false, C.arm2, g.d2);
      if (calf) drawCalfArmLabels(Ldraw, g);
      if (neck) drawNeckArmLabels(Ldraw,g);
      if (K.dist(g.O, g.a1.foot) > 4) {
        S.drawRightAngle(Ldraw, g.a1.foot, K.sub(g.a1.foot, g.O), g.d1, 8, C.arm1);
      }
      if (K.dist(g.O, g.a2.foot) > 4) {
        S.drawRightAngle(Ldraw, g.a2.foot, K.sub(g.a2.foot, g.O), g.d2, 8, C.arm2);
      }
    }

    if (e.id === 'lift') { S.clear(Ldraw); drawLiftOverlay(Ldraw, g, step, false); }
    if (abstractNow) {
      if (e.id === 'lift') { S.clear(Ldraw); drawLiftOverlay(Lui, g, 7, true); }
      else {
      if (e.id==='neck') S.clear(Ldraw);
      drawAbstractModel(Lui, g);
      }
    }

    // 右侧把原“力矩条”改为两条力臂的直观比较。
    const maxArm = Math.max(g.a1.armLen, g.a2.armLen, 1e-6);
    const m1 = document.getElementById('bodyM1');
    const m2 = document.getElementById('bodyM2');
    if (m1) m1.style.width = (100 * g.a1.armLen / maxArm) + '%';
    if (m2) m2.style.width = (100 * g.a2.armLen / maxArm) + '%';

    const m1lab = document.getElementById('bodyM1Lab');
    const m2lab = document.getElementById('bodyM2Lab');
    if (m1lab) m1lab.textContent = '动力臂 l₁（模型）= ' + g.a1.armLen.toFixed(3);
    if (m2lab) m2lab.textContent = (e.id==='neck' ? '重力臂 l₂' : '阻力臂 l₂') + '（模型）= ' + g.a2.armLen.toFixed(3);

    const ratio = g.a1.armLen > 1e-6 ? g.a2.armLen / g.a1.armLen : Infinity;
    const cls = document.getElementById('bodyClass');
    if (cls) {
      let txt = (e.leverType || (g.cls.type + '杠杆')) +
        '｜l₂/l₁ ≈ ' + (isFinite(ratio) ? ratio.toFixed(2) : '∞') +
        '｜F₁ ≈ ' + (isFinite(g.f1) ? g.f1.toFixed(0) + ' N' : '很大') + '（示意）';
      if (g.stageName) txt += '｜' + g.stageName;
      if (e.id === 'lift' && g.lift) txt = g.stageName+'｜躯干前倾 '+Math.round(g.lift.trunkDegrees)+'°｜屈膝 '+Math.round(g.lift.kneeDegrees)+'°';
      if (e.id==='neck') txt='第一类杠杆｜'+g.cls.type+'杠杆｜平衡所需 F₁≈'+g.f1.toFixed(0)+' N（示意）';
      cls.textContent = txt;
    }

    const param = document.getElementById('bodyParam');
    if (param) param.hidden = step < 6 && !e.sample;
    const pl = document.getElementById('bodyParamLabel');
    const pv = document.getElementById('bodyParamVal');
    const po = document.getElementById('bodyParamOut');
    if (pl) pl.textContent = e.paramLabel;
    if (pv) pv.value = state.t;
    if (po) {
      const a=g.angleDegrees;
      po.textContent = e.id==='neck'
        ? (Number.isFinite(a) ? (Math.abs(a)<.05 ? '平视' : (a>0 ? '低头 ' : '抬头 ')+Math.abs(a).toFixed(1)+'°') : '低头 → 抬头')
        : e.id==='lift' ? Math.round(state.t*100)+'%' : state.t.toFixed(2);
    }

    const absBtn = document.getElementById('bodyAbstract');
    if (absBtn) {
      absBtn.classList.toggle('active-toggle', abstractNow);
      absBtn.textContent = abstractNow ? '恢复肌肉骨骼' : '简化成杠杆';
      absBtn.setAttribute('aria-pressed', String(abstractNow));
    }
    const playBtn = document.getElementById('bodyPlay');
    if (playBtn) playBtn.textContent = state.playing ? '暂停动作' : '播放动作';

    setJudge(step === 7 && !abstractNow ? '已恢复肌肉骨骼视图，可再次简化，对照观察同一位置的支点、作用点和力臂。' : stepHint(e, step, g), step >= 5 ? true : null);
  }

  function stopMotion() {
    state.playing = false;
    lastMotionTs = 0;
    if (motionRaf) cancelAnimationFrame(motionRaf);
    motionRaf = 0;
  }

  function motionTick(ts) {
    if (!state.playing) return;
    if (!lastMotionTs) lastMotionTs = ts;
    const dt = Math.min(0.05, Math.max(0, (ts - lastMotionTs) / 1000));
    lastMotionTs = ts;

    state.t += motionDir * dt * 0.38;
    const low=ex().id==='neck' ? 0 : .08, high=ex().id==='neck' ? 1 : .92;
    if (state.t >= high) {
      state.t = high;
      motionDir = -1;
    } else if (state.t <= low) {
      state.t = low;
      motionDir = 1;
    }
    render();
    motionRaf = requestAnimationFrame(motionTick);
  }

  function toggleMotion() {
    if (state.playing) {
      stopMotion();
      render();
      return;
    }
    state.playing = true;
    lastMotionTs = 0;
    motionRaf = requestAnimationFrame(motionTick);
    render();
  }

  function openVideoPreset() {
    const pid = ex().presetId;
    if (global.AppNav && global.AppNav.show) global.AppNav.show('video');
    else document.querySelector('[data-lab=video]')?.click();
    if (global.DynamicLifeLab && DynamicLifeLab.showTracking) DynamicLifeLab.showTracking();
    if (global.VideoLab && VideoLab.applyBodyPreset) VideoLab.applyBodyPreset(pid);
  }

  function bind3dControls() {
    if (state.bound3d) return;
    state.bound3d = true;
    const bone = document.getElementById('bodyToggleBone');
    const mus = document.getElementById('bodyToggleMuscle');

    if (bone) {
      bone.onclick = () => {
        const on = bone.dataset.on !== '1';
        bone.dataset.on = on ? '1' : '0';
        bone.classList.toggle('active-toggle', on);
        if (global.Body3D) Body3D.setLayers({ bone: on });
      };
    }
    if (mus) {
      mus.onclick = () => {
        const on = mus.dataset.on !== '1';
        mus.dataset.on = on ? '1' : '0';
        mus.classList.toggle('active-toggle', on);
        if (global.Body3D) Body3D.setLayers({ muscle: on });
      };
    }
  }

  function waitBody3D(cb) {
    if (global.Body3D && Body3D.isReady()) {
      cb();
      return;
    }
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      if (global.Body3D && Body3D.isReady()) {
        clearInterval(timer);
        cb();
      } else if (n > 200) {
        clearInterval(timer);
        cb();
      }
    }, 100);
    if (global.Body3D && Body3D.init) {
      Body3D.init().then(() => {
        clearInterval(timer);
        cb();
      });
    }
  }

  function bind() {
    renderList();
    bind3dControls();

    const list = document.getElementById('bodyList');
    if (list) {
      list.onclick = (ev) => {
        const b = ev.target.closest('[data-i]');
        if (!b) return;
        stopMotion();
        state.idx = +b.dataset.i;
        state.step = 1;
        state.abstract = false;
        state.tPrev = null;
        state.t = ex().id === 'curl' ? 0.35 : ex().id === 'lift' ? 0 : 0.45;
        renderList();
        if (global.Body3D && Body3D.isReady()) Body3D.setAction(ex().id, state.t);
        render();
      };
    }

    const prev = document.getElementById('bodyPrev');
    const next = document.getElementById('bodyNext');
    const skip = document.getElementById('bodySkip');
    const play = document.getElementById('bodyPlay');
    const abs = document.getElementById('bodyAbstract');
    const param = document.getElementById('bodyParamVal');
    const openVid = document.getElementById('bodyOpenVideo');

    if (prev) prev.onclick = () => {
      state.step = Math.max(1, state.step - 1);
      state.abstract = false;
      render();
    };
    if (next) next.onclick = () => {
      state.step = Math.min(STEPS, state.step + 1);
      state.abstract = state.step === STEPS;
      render();
    };
    if (skip) skip.onclick = () => {
      state.step = 5;
      state.abstract = false;
      render();
    };
    if (play) play.onclick = toggleMotion;
    if (abs) abs.onclick = () => {
      state.abstract = !state.abstract;
      render();
    };
    if (param) param.oninput = (ev) => {
      if (state.tPrev == null) state.tPrev = state.t;
      state.t = +ev.target.value;
      render();
    };
    if (openVid) openVid.onclick = openVideoPreset;
    document.querySelectorAll('[data-lift-style]').forEach(button => button.onclick = () => {
      stopMotion(); state.liftStyle = button.dataset.liftStyle;state.liftFocus=state.liftStyle==='squat'?'knee':'lumbar';render();
    });
    document.getElementById('bodyLiftFocus').onchange=ev=>{state.liftFocus=ev.target.value;render();};
    document.getElementById('bodyLiftDistance').oninput = ev => {state.liftDistance=+ev.target.value;render();};
    document.getElementById('bodyLiftBody').onchange = ev => {state.liftBody=ev.target.checked;render();};
  }

  function init() {
    state.idx = 1;
    state.step = 1;
    state.t = 0.35;
    state.abstract = false;
    stopMotion();
    bind();
    render();
    waitBody3D(() => {
      render();
      if (global.Body3D && Body3D.isReady()) {
        Body3D.setAction(ex().id, state.t);
      }
    });
  }

  global.BodyLab = { init, render };
})(typeof window !== 'undefined' ? window : globalThis);
