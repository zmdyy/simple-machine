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
      name: '踮脚',
      action: '观察：踮起脚跟（前脚掌着地）',
      whyO: '前脚掌着地并约束足部转动，可作为支点 O；跟腱向上拉脚跟，身体重力向下。',
      anatomy: '局部聚焦：胫骨、腓骨、跟骨、距骨、跖骨；腓肠肌和比目鱼肌经跟腱提供动力。',
      paramLabel: '踮起幅度',
      filmTip: '侧拍整脚与小腿；慢踮 5–8 秒；关节别裁出画外。',
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
      action: '观察：头颈屈伸',
      whyO: '寰枕关节附近可简化为支点 O；颈后肌群提供动力，头部重力竖直向下。',
      anatomy: '局部聚焦：颅骨、寰椎、枢椎和颈椎；颈后肌群提供动力。',
      paramLabel: '头位（低 → 抬）',
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
      action: '对比：同一重物，直腿弯腰与屈膝蹲举',
      whyO: '本案例后续将统一采用腰骶部简化枢轴，比较同一重物在两种姿态下的阻力臂。',
      anatomy: '局部聚焦：骨盆、腰椎、股骨与主要腰背伸肌；这是初中力学简化模型。',
      paramLabel: '姿态：弯腰 ↔ 蹲举',
      filmTip: '同一重物侧拍两种搬法；慢动作，腰与膝都要入画。',
      fallback(t) {
        const O = K.v(400, 318);
        if (t < 0.5) {
          const lean = t * 2;
          const shoulder = K.v(400 + lean * 140, 318 - lean * 100);
          const com = K.v(shoulder.x + 30, shoulder.y + 50);
          return {
            O, bar: [O, shoulder],
            p1: K.v(O.x - 8, O.y - 45 - lean * 20), d1: K.norm(K.v(0.08, -1)),
            p2: com, d2: K.v(0, 1), f2: 400,
            stageName: '直腿弯腰（后续重构为腰骶模型）',
          };
        }
        const squat = (t - 0.5) * 2;
        const shoulder = K.v(400, 318 - squat * 55);
        const com = K.v(410, shoulder.y + 45);
        return {
          O, bar: [O, shoulder],
          p1: K.v(O.x - 6, O.y - 35), d1: K.norm(K.v(0.1, -1)),
          p2: com, d2: K.v(0, 1), f2: 400,
          stageName: '屈膝蹲举（后续与弯腰做同物对照）',
        };
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

    g.f1 = g.f2 * (g.a2.armLen / Math.max(g.a1.armLen, 1e-6));
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
    if (e.id !== 'curl') {
      return '当前动作保留为后续模板。先用“举哑铃”验证人体杠杆完整流程。';
    }
    const ratio = g.a1.armLen > 1e-6 ? g.a2.armLen / g.a1.armLen : Infinity;
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

  function updateTemplateCard() {
    const e = ex();
    const rig = rigInfo();
    const t = rig && rig.teaching;
    const title = document.getElementById('bodyTemplateTitle');
    const anatomy = document.getElementById('bodyTemplateAnatomy');
    const lever = document.getElementById('bodyTemplateLever');
    const note = document.getElementById('bodyTemplateNote');
    if (title) title.textContent = e.sample ? '举哑铃 · 人体杠杆动作模板' : e.name + ' · 待完善模板';
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
      x1: p.x - 15, y1: p.y, x2: p.x + 15, y2: p.y,
      stroke: '#334155', 'stroke-width': 5, 'stroke-linecap': 'round',
    }, layer);
    S.el('circle', { cx: p.x - 18, cy: p.y, r: 8, fill: '#475569' }, layer);
    S.el('circle', { cx: p.x + 18, cy: p.y, r: 8, fill: '#475569' }, layer);
    S.el('text', {
      x: p.x + 24, y: p.y - 8, fill: '#334155', 'font-size': 13, 'font-weight': 700,
    }, layer).textContent = '哑铃';
  }

  function drawAbstractModel(layer, g) {
    S.el('rect', {
      x: 24, y: 20, width: 752, height: 372, rx: 18,
      fill: 'rgba(255,255,255,0.80)', stroke: '#cbd5e1', 'stroke-width': 1.2,
    }, layer);
    if (g.bar && g.bar.length >= 2) {
      const a = g.O;
      const b = g.p2;
      S.el('line', {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        stroke: '#475569', 'stroke-width': 10, 'stroke-linecap': 'round', opacity: 0.82,
      }, layer);
    }
    S.el('text', {
      x: 44, y: 52, fill: '#0f766e', 'font-size': 20, 'font-weight': 800,
    }, layer).textContent = '从人体结构抽象成杠杆';
    S.el('text', {
      x: 44, y: 78, fill: '#475569', 'font-size': 13, 'font-weight': 600,
    }, layer).textContent = '肘关节 O｜肱二头肌 F₁｜哑铃重力 F₂｜动力点位于 O 与阻力点之间 → 第三类杠杆';
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
    const abstractNow = state.abstract || step >= 7;
    const stage = document.getElementById('body3dStage');
    if (stage) stage.classList.toggle('abstract-mode', abstractNow);

    const ready3d = !!(global.Body3D && Body3D.isReady());
    const canvas = document.getElementById('body3dCanvas');
    if (canvas) canvas.style.visibility = ready3d ? 'visible' : 'hidden';
    if (ready3d) sync3d();

    const g = geom();

    const action = document.getElementById('bodyAction');
    const why = document.getElementById('bodyWhy');
    const film = document.getElementById('bodyFilmTip');
    const badge = document.getElementById('bodyStepBadge');
    if (action) action.textContent = e.action;
    if (why) why.textContent = e.whyO;
    if (film) film.textContent = e.filmTip || '';
    if (badge) badge.textContent = '步骤 ' + step + ' / ' + STEPS;

    updateTemplateCard();

    if (!ready3d && global.BodyScenes) BodyScenes.draw(Lbar, e.id, state.t);
    const status = document.getElementById('body3dStatus');
    if (status && ready3d) status.textContent = e.anatomy;

    // 分步揭示：1 解剖；2 O；3 F₁；4 F₂；5 力臂；6 动态；7 抽象。
    if (step >= 2) {
      S.drawPivot(Ldraw, g.O);
      if (e.id === 'curl') {
        S.el('text', {
          x: g.O.x + 12, y: g.O.y - 14,
          fill: '#111827', 'font-size': 15, 'font-weight': 800,
          stroke: '#fff', 'stroke-width': 4, 'paint-order': 'stroke',
        }, Ldraw).textContent = '肘关节 O';
      }
    }

    if (step >= 3) {
      const px1 = 46 + Math.min(92, Math.sqrt(Math.max(g.f1, 1)) * 4.2);
      S.drawForceArrow(
        Ldraw, g.p1, g.d1, px1, C.F1,
        'F₁ ' + g.f1.toFixed(0) + ' N（示意）',
        { O: g.O, scale: 1.08 }
      );
      if (e.id === 'curl') {
        S.el('text', {
          x: g.p1.x + 14, y: g.p1.y + 22,
          fill: C.F1, 'font-size': 14, 'font-weight': 800,
          stroke: '#fff', 'stroke-width': 4, 'paint-order': 'stroke',
        }, Ldraw).textContent = '肱二头肌牵拉桡骨';
      }
    }

    if (step >= 4) {
      const px2 = 72;
      S.drawForceArrow(
        Ldraw, g.p2, g.d2, px2, C.F2,
        'F₂ ' + g.f2 + ' N',
        { O: g.O }
      );
      drawDumbbell(Ldraw, g.p2);
      if (e.id === 'curl') {
        S.el('text', {
          x: g.p2.x + 22, y: g.p2.y + 24,
          fill: C.F2, 'font-size': 14, 'font-weight': 800,
          stroke: '#fff', 'stroke-width': 4, 'paint-order': 'stroke',
        }, Ldraw).textContent = '哑铃重力';
      }
    }

    if (step >= 5) {
      S.drawForceLine(Ldraw, g.p1, g.d1, 190);
      S.drawForceLine(Ldraw, g.p2, g.d2, 190);
      S.drawArm(Ldraw, g.O, g.a1.foot, 'l₁', false, C.arm1, g.d1);
      S.drawArm(Ldraw, g.O, g.a2.foot, 'l₂', false, C.arm2, g.d2);
      if (K.dist(g.O, g.a1.foot) > 4) {
        S.drawRightAngle(Ldraw, g.a1.foot, K.sub(g.a1.foot, g.O), g.d1, 8, C.arm1);
      }
      if (K.dist(g.O, g.a2.foot) > 4) {
        S.drawRightAngle(Ldraw, g.a2.foot, K.sub(g.a2.foot, g.O), g.d2, 8, C.arm2);
      }
    }

    if (abstractNow) drawAbstractModel(Lui, g);

    // 右侧把原“力矩条”改为两条力臂的直观比较。
    const maxArm = Math.max(g.a1.armLen, g.a2.armLen, 1e-6);
    const m1 = document.getElementById('bodyM1');
    const m2 = document.getElementById('bodyM2');
    if (m1) m1.style.width = (100 * g.a1.armLen / maxArm) + '%';
    if (m2) m2.style.width = (100 * g.a2.armLen / maxArm) + '%';

    const m1lab = document.getElementById('bodyM1Lab');
    const m2lab = document.getElementById('bodyM2Lab');
    if (m1lab) m1lab.textContent = '动力臂 l₁（模型）= ' + g.a1.armLen.toFixed(3);
    if (m2lab) m2lab.textContent = '阻力臂 l₂（模型）= ' + g.a2.armLen.toFixed(3);

    const ratio = g.a1.armLen > 1e-6 ? g.a2.armLen / g.a1.armLen : Infinity;
    const cls = document.getElementById('bodyClass');
    if (cls) {
      let txt = (e.leverType || (g.cls.type + '杠杆')) +
        '｜l₂/l₁ ≈ ' + (isFinite(ratio) ? ratio.toFixed(2) : '∞') +
        '｜F₁ ≈ ' + (isFinite(g.f1) ? g.f1.toFixed(0) + ' N' : '很大') + '（示意）';
      if (g.stageName) txt += '｜' + g.stageName;
      cls.textContent = txt;
    }

    const param = document.getElementById('bodyParam');
    if (param) param.hidden = step < 6 && !e.sample;
    const pl = document.getElementById('bodyParamLabel');
    const pv = document.getElementById('bodyParamVal');
    const po = document.getElementById('bodyParamOut');
    if (pl) pl.textContent = e.paramLabel;
    if (pv) pv.value = state.t;
    if (po) po.textContent = state.t.toFixed(2);

    const absBtn = document.getElementById('bodyAbstract');
    if (absBtn) absBtn.classList.toggle('active-toggle', abstractNow);
    const playBtn = document.getElementById('bodyPlay');
    if (playBtn) playBtn.textContent = state.playing ? '暂停动作' : '播放动作';

    setJudge(stepHint(e, step, g), step >= 5 ? true : null);
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
    if (state.t >= 0.92) {
      state.t = 0.92;
      motionDir = -1;
    } else if (state.t <= 0.08) {
      state.t = 0.08;
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
    const exp = document.getElementById('bodyExplode');

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
    if (exp) {
      exp.oninput = () => {
        if (global.Body3D) Body3D.setExplode(+exp.value);
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
        state.t = ex().id === 'curl' ? 0.35 : 0.45;
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
      render();
    };
    if (next) next.onclick = () => {
      state.step = Math.min(STEPS, state.step + 1);
      render();
    };
    if (skip) skip.onclick = () => {
      state.step = 5;
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
        Body3D.setAction('curl', state.t);
        setJudge('举哑铃样板已加载：先观察肱骨、尺骨、桡骨、肱二头肌和肘关节。', true);
      }
    });
  }

  global.BodyLab = { init, render };
})(typeof window !== 'undefined' ? window : globalThis);
