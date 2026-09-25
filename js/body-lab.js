/**
 * 人体杠杆课控：分步揭示 + 力矩条 + 你来画 + 拍摄卡
 * 几何来自 Body3D（BodyParts3D 解剖）；未就绪时回退 2D 近似
 */
(function (global) {
  'use strict';

  const K = global.LeverKernel;
  const S = global.LeverSVG;
  const C = K.COLORS;

  const EXAMPLES = [
    {
      id: 'calf',
      presetId: 'calf',
      name: '踮脚',
      key: true,
      action: '分析：踮起脚跟（前脚掌着地）',
      whyO: '前脚掌着地几乎不移 → 支点 O；跟腱向上拉，体重过踝向下',
      anatomy: '局部聚焦：胫骨、腓骨、足骨；动力来自腓肠肌和比目鱼肌，经跟腱向上拉脚跟。',
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
      name: '举哑铃（肘）',
      key: true,
      action: '分析：只析肘关节 — 肱二头肌拉前臂（费力）',
      whyO: '肘关节为枢纽 → O；哑铃重力在握点竖直向下',
      anatomy: '局部聚焦：肱骨、尺骨、桡骨；肱二头肌经肌腱牵拉桡骨，肘关节是支点。',
      paramLabel: '屈肘角度',
      filmTip: '侧拍肩肘手与哑铃；只慢屈肘，身体别大幅晃动。',
      fallback(t) {
        const O = K.v(260, 248);
        const len = 128;
        const th = t * (Math.PI / 2);
        const grip = K.v(O.x + len * Math.cos(th), O.y + len * Math.sin(th));
        const ins = K.v(O.x + len * 0.42 * Math.cos(th), O.y + len * 0.42 * Math.sin(th) - 18);
        return {
          O, bar: [O, grip],
          p1: ins, d1: K.norm(K.sub(O, ins)),
          p2: grip, d2: K.v(0, 1), f2: 80,
        };
      },
    },
    {
      id: 'neck',
      presetId: 'neck',
      name: '低头 / 抬头',
      key: false,
      action: '分析：头颈屈伸（费力）',
      whyO: '耳屏附近枢椎枢纽 → O；头重竖直向下',
      anatomy: '局部聚焦：头骨、寰椎和枢椎；夹肌、半棘肌等颈后肌群提供动力。',
      paramLabel: '头位（低 → 抬）',
      filmTip: '侧拍头颈肩；慢低头再抬头，别转身体。',
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
      name: '弯腰 vs 蹲抬',
      key: true,
      action: '分析：搬物 — 直腿弯腰与屈膝蹲抬对照',
      whyO: '髋关节为枢纽 → O；躯干/货物重力竖直向下',
      anatomy: '局部聚焦：骨盆、腰椎和股骨；竖脊肌、髂肋肌和最长肌等腰背肌群提供动力。',
      paramLabel: '姿态：弯腰 ↔ 蹲抬',
      filmTip: '同一重物侧拍两种搬法；慢动作，腰与膝都入画。',
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
            stageName: '直腿弯腰（腰力臂大）',
          };
        }
        const squat = (t - 0.5) * 2;
        const shoulder = K.v(400, 318 - squat * 55);
        const com = K.v(410, shoulder.y + 45);
        return {
          O, bar: [O, shoulder],
          p1: K.v(O.x - 6, O.y - 35), d1: K.norm(K.v(0.1, -1)),
          p2: com, d2: K.v(0, 1), f2: 400,
          stageName: '屈膝蹲抬（躯干更竖）',
        };
      },
    },
  ];

  let state = {
    idx: 0,
    step: 1,
    t: 0.45,
    tPrev: null,
    practice: false,
    practicePhase: 'pivot',
    clickedO: null,
    dirDraft: null,
    armEnd: null,
    showTruth: false,
    bound3d: false,
  };

  function ex() {
    return EXAMPLES[state.idx];
  }

  function svg() {
    return document.getElementById('bodySvg');
  }

  function sync3d() {
    const B = global.Body3D;
    if (!B || !B.isReady()) return;
    B.setAction(ex().id, state.t);
    B.setStepReveal(state.practice ? 0 : state.step, state.practice);
  }

  function geom() {
    let g = null;
    if (global.Body3D && Body3D.isReady()) g = Body3D.getLandmarks();
    if (!g && global.BodyScenes) g = BodyScenes.layout(ex().id, state.t);
    if (!g || !g.O) g = ex().fallback(state.t);

    const a1 = K.forceArm(g.O, g.p1, g.d1);
    const a2 = K.forceArm(g.O, g.p2, g.d2);
    const f1 = g.f2 * (a2.armLen / (a1.armLen || 1e-6));
    g.f1 = f1;
    g.a1 = a1;
    g.a2 = a2;
    g.cls = K.classifyLever(a1.armLen, a2.armLen);
    return g;
  }

  function renderList() {
    const box = document.getElementById('bodyList');
    box.innerHTML = EXAMPLES.map((e, i) => {
      const raw = global.BodyScenes ? BodyScenes.layout(e.id, 0.5) : e.fallback(0.5);
      const a1 = K.forceArm(raw.O, raw.p1, raw.d1);
      const a2 = K.forceArm(raw.O, raw.p2, raw.d2);
      const cls = K.classifyLever(a1.armLen, a2.armLen);
      const tag =
        (e.key ? '<span class="tag key">课眼</span>' : '') +
        '<span class="tag ' + (cls.type === '省力' ? 'save' : cls.type === '费力' ? 'cost' : 'eq') + '">' + cls.type + '</span>';
      return '<button type="button" class="life-item' + (i === state.idx ? ' active' : '') + '" data-i="' + i + '">' + e.name + tag + '</button>';
    }).join('');
  }

  function render() {
    const root = svg();
    const Lbar = root.querySelector('#bodyBar');
    const Ldraw = root.querySelector('#bodyDraw');
    const Lui = root.querySelector('#bodyUi');
    S.ensureDefs(root);
    S.clear(Lbar);
    S.clear(Ldraw);
    S.clear(Lui);

    const e = ex();
    const step = state.practice ? 0 : state.step;
    const stage = document.getElementById('body3dStage');
    if (stage) stage.classList.toggle('practice', state.practice);
    const ready3d = !!(global.Body3D && Body3D.isReady());
    const canvas = document.getElementById('body3dCanvas');
    if (canvas) canvas.style.visibility = ready3d ? 'visible' : 'hidden';
    if (ready3d) sync3d();
    const g = geom();

    document.getElementById('bodyAction').textContent = e.action;
    document.getElementById('bodyWhy').textContent = e.whyO;
    document.getElementById('bodyFilmTip').textContent = e.filmTip || '';
    document.getElementById('bodyStepBadge').textContent = state.practice
      ? '你来画'
      : '步骤 ' + step + ' / 9';

    if (!ready3d && global.BodyScenes) BodyScenes.draw(Lbar, e.id, state.t);
    const status = document.getElementById('body3dStatus');
    if (status && ready3d) status.textContent = e.anatomy;

    if (!state.practice) {
      if (step >= 2) S.drawPivot(Ldraw, g.O);
      if (step >= 3) {
        const px1 = 36 + Math.min(70, g.f1 * 0.25);
        const px2 = 36 + Math.min(70, g.f2 * 0.12);
        S.drawForceArrow(Ldraw, g.p1, g.d1, px1, C.F1, 'F₁ ' + g.f1.toFixed(0) + ' N', { O: g.O });
        S.drawForceArrow(Ldraw, g.p2, g.d2, px2, C.F2, 'F₂ ' + g.f2 + ' N', { O: g.O });
      }
      if (step >= 5) {
        S.drawForceLine(Ldraw, g.p1, g.d1, 160);
        S.drawForceLine(Ldraw, g.p2, g.d2, 160);
        S.drawArm(Ldraw, g.O, g.a1.foot, 'l₁', false, C.arm1, g.d1);
        S.drawArm(Ldraw, g.O, g.a2.foot, 'l₂', false, C.arm2, g.d2);
        if (g.a1.armLen > 4) S.drawRightAngle(Ldraw, g.a1.foot, g.a1.armVec, g.a1.dir, 8, C.arm1);
        if (g.a2.armLen > 4) S.drawRightAngle(Ldraw, g.a2.foot, g.a2.armVec, g.a2.dir, 8, C.arm2);
      }
      if (state.tPrev != null && step >= 8) {
        const oldRaw = e.fallback(state.tPrev);
        if (oldRaw) {
          const aOld = K.forceArm(oldRaw.O, oldRaw.p1, oldRaw.d1);
          S.drawArm(Lui, oldRaw.O, aOld.foot, null, true);
        }
      }
    } else {
      S.el('circle', { cx: g.p1.x, cy: g.p1.y, r: 6, fill: C.F1 }, Ldraw);
      S.el('circle', { cx: g.p2.x, cy: g.p2.y, r: 6, fill: C.F2 }, Ldraw);
      if (state.clickedO) S.drawPivot(Ldraw, state.clickedO);
      if (state.dirDraft) {
        S.drawForceArrow(Ldraw, g.p1, state.dirDraft, 55, C.F1, 'F₁?', { O: state.clickedO || g.O });
      }
      if (state.armEnd && state.clickedO) {
        S.el('line', {
          x1: state.clickedO.x, y1: state.clickedO.y,
          x2: state.armEnd.x, y2: state.armEnd.y,
          stroke: C.arm, 'stroke-width': 2.5,
        }, Ldraw);
      }
    }

    const maxM = Math.max(g.f1 * g.a1.armLen, g.f2 * g.a2.armLen, 1);
    const m1 = g.f1 * g.a1.armLen;
    const m2 = g.f2 * g.a2.armLen;
    document.getElementById('bodyM1').style.width = (100 * m1 / maxM) + '%';
    document.getElementById('bodyM2').style.width = (100 * m2 / maxM) + '%';
    document.getElementById('bodyM1Lab').textContent = 'F₁·l₁ = ' + m1.toFixed(0);
    document.getElementById('bodyM2Lab').textContent = 'F₂·l₂ = ' + m2.toFixed(0);
    let clsTxt = g.cls.type + '杠杆 — ' + g.cls.tip;
    if (g.stageName) clsTxt += '（' + g.stageName + '）';
    document.getElementById('bodyClass').textContent = clsTxt;

    const param = document.getElementById('bodyParam');
    param.hidden = !(step >= 8 || state.practice);
    document.getElementById('bodyParamLabel').textContent = e.paramLabel;
    document.getElementById('bodyParamVal').value = state.t;
    document.getElementById('bodyParamOut').textContent = state.t.toFixed(2);
  }

  function setJudge(msg, ok) {
    const el = document.getElementById('bodyJudge');
    el.textContent = msg || '';
    el.className = 'judge-msg' + (ok === true ? ' ok' : ok === false ? ' bad' : '');
  }

  function svgPoint(evt) {
    const s = svg();
    const pt = s.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    return pt.matrixTransform(s.getScreenCTM().inverse());
  }

  let dragging = null;

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

    document.getElementById('bodyList').onclick = (ev) => {
      const b = ev.target.closest('[data-i]');
      if (!b) return;
      state.idx = +b.dataset.i;
      state.step = 1;
      state.practice = false;
      state.tPrev = null;
      state.showTruth = false;
      renderList();
      setJudge('从步骤 1 开始：在 3D 解剖上找支点 O。', null);
      if (global.Body3D && Body3D.isReady()) Body3D.setAction(ex().id, state.t);
      render();
    };

    document.getElementById('bodyPrev').onclick = () => {
      if (state.practice) return;
      state.step = Math.max(1, state.step - 1);
      render();
    };
    document.getElementById('bodyNext').onclick = () => {
      if (state.practice) return;
      if (state.step === 8) state.tPrev = state.t;
      state.step = Math.min(9, state.step + 1);
      if (state.step === 9) {
        state.practice = true;
        state.practicePhase = 'pivot';
        state.clickedO = null;
        state.dirDraft = null;
        state.armEnd = null;
        state.showTruth = false;
        setJudge('你来画：① 点支点 ② 从动力作用点拖方向 ③ 从 O 拖力臂', null);
      }
      render();
    };
    document.getElementById('bodySkip').onclick = () => {
      state.step = 8;
      state.practice = false;
      render();
    };
    document.getElementById('bodyParamVal').oninput = (ev) => {
      if (state.tPrev == null) state.tPrev = state.t;
      state.t = +ev.target.value;
      render();
    };
    document.getElementById('bodyExitPractice').onclick = () => {
      state.practice = false;
      state.step = 1;
      state.practicePhase = 'pivot';
      state.clickedO = null;
      state.dirDraft = null;
      state.armEnd = null;
      state.showTruth = false;
      state.tPrev = null;
      setJudge('已退出练习，回到这一动作。点「下一步」再分步看。', null);
      const exit = document.getElementById('bodyExitPractice');
      if (exit) exit.classList.remove('active-toggle');
      render();
    };
    document.getElementById('bodyOpenVideo').onclick = openVideoPreset;

    const s = svg();
    s.addEventListener('pointerdown', (evt) => {
      if (!state.practice) return;
      const p = svgPoint(evt);
      const g = geom();
      if (state.practicePhase === 'pivot') {
        state.clickedO = p;
        if (K.dist(p, g.O) < 36) {
          setJudge('支点正确。下一步：从红色动力作用点拖出力的方向。', true);
          state.practicePhase = 'dir';
        } else if (K.dist(p, g.p1) < 28 || K.dist(p, g.p2) < 28) {
          setJudge('作用点在杠杆上，但这里要先点支点 O。', false);
        } else {
          setJudge('再找找：哪个关节/着地点几乎不移却约束了转动？', false);
        }
        render();
        return;
      }
      if (state.practicePhase === 'dir') {
        dragging = 'dir';
        state.dirDraft = K.norm(K.sub(p, g.p1));
        render();
        return;
      }
      if (state.practicePhase === 'arm') {
        dragging = 'arm';
        state.armEnd = p;
        render();
        return;
      }
      if (state.practicePhase === 'done') {
        setJudge('这条力臂已保留。要重画，点「退出你来画」清空后再点支点。', true);
      }
    });
    window.addEventListener('pointermove', (evt) => {
      if (!dragging || !state.practice) return;
      const p = svgPoint(evt);
      const g = geom();
      if (dragging === 'dir') {
        state.dirDraft = K.norm(K.sub(p, g.p1));
        render();
      } else if (dragging === 'arm') {
        state.armEnd = p;
        render();
      }
    });
    window.addEventListener('pointerup', () => {
      if (!state.practice) {
        dragging = null;
        return;
      }
      const g = geom();
      if (dragging === 'dir' && state.dirDraft) {
        const ang = Math.acos(Math.min(1, Math.abs(K.dot(state.dirDraft, K.norm(g.d1)))));
        if ((ang * 180) / Math.PI < 28) {
          setJudge('方向可以。从 O 拖出力臂。', true);
          state.practicePhase = 'arm';
        } else {
          setJudge('想想这个动作里肌肉实际往哪边发力。', false);
        }
      }
      if (dragging === 'arm' && state.armEnd && state.clickedO) {
        const r = K.judgeArmDraw(g.O, g.p1, g.d1, state.armEnd);
        const r2 = K.judgeArmDraw(state.clickedO, g.p1, g.d1, state.armEnd);
        const use = r.ok ? r : r2;
        setJudge(use.message, use.ok);
        if (use.ok) state.practicePhase = 'done';
        render();
      }
      dragging = null;
    });
  }

  function init() {
    state.idx = 0;
    bind();
    setJudge('从踮脚开始：前脚掌着地是 O，跟腱向上拉是 F₁，体重向下是 F₂。点「下一步」叠到实拍上。', null);
    render();
    waitBody3D(() => {
      render();
      if (global.Body3D && Body3D.isReady()) {
        Body3D.setAction(ex().id, state.t);
        setJudge('局部解剖已就绪：淡化非相关结构，高亮本动作的骨骼、肌肉与支点。', true);
      }
    });
  }

  global.BodyLab = { init, render };
})(typeof window !== 'undefined' ? window : globalThis);
