/**
 * 生活杠杆拆解：分步揭示 + 参数 + 你来画
 */
(function (global) {
  'use strict';

  const K = global.LeverKernel;
  const S = global.LeverSVG;
  const C = K.COLORS;

  /**
   * 每个例子：viewBox 800×420
   * getGeom(t) 返回 { O, p1, d1, p2, d2, bar, f2, label }
   * t ∈ [0,1] 可调参数（握点等）
   */
  const EXAMPLES = [
    {
      id: 'crowbar',
      name: '撬棒',
      key: true,
      action: '分析：压柄撬石（不是晃一下）',
      whyO: '垫块几乎不移，约束转动 → 支点 O',
      view: '侧视',
      paramLabel: '手到垫块的距离',
      getGeom(t) {
        const O = K.v(340, 280);
        const stone = K.v(280, 270);
        const handX = 340 + 120 + t * 200;
        const hand = K.v(handX, 280 - (handX - 340) * 0.08);
        const bar = [K.v(240, 300), O, hand];
        return {
          O, bar,
          p1: hand, d1: K.v(0, 1),
          p2: stone, d2: K.v(0, 1),
          f2: 200,
          decor: 'crowbar',
        };
      },
    },
    {
      id: 'broom',
      name: '扫把',
      key: true,
      action: '分析：向前扫地（不是拎起扫帚）',
      whyO: '上手相对稳定、约束杆转动 → 支点 O；下手推拉为动力',
      view: '侧视',
      paramLabel: '下手位置（越靠扫帚头相对越省力）',
      getGeom(t) {
        const O = K.v(220, 120);
        const head = K.v(520, 340);
        const handY = 140 + t * 160;
        const hand = K.v(220 + (handY - 120) * 0.85, handY);
        const bar = [O, head];
        return {
          O, bar,
          p1: hand, d1: K.v(1, 0.15),
          p2: head, d2: K.v(-1, 0),
          f2: 30,
          decor: 'broom',
        };
      },
    },
    {
      id: 'door',
      name: '门',
      key: false,
      action: '分析：推开门',
      whyO: '铰链不移 → 支点 O',
      view: '俯视',
      paramLabel: '推力点离铰链的远近',
      getGeom(t) {
        const O = K.v(160, 210);
        const tip = K.v(640, 210);
        const pushX = 200 + t * 400;
        const push = K.v(pushX, 210);
        const mid = K.v(400, 210);
        const bar = [O, tip];
        return {
          O, bar,
          p1: push, d1: K.v(0, -1),
          p2: mid, d2: K.v(0, 1),
          f2: 40,
          decor: 'door',
        };
      },
    },
    {
      id: 'opener',
      name: '开瓶器',
      action: '分析：抬柄启盖',
      whyO: '开瓶器抵在瓶盖顶上的一点几乎不移 → 支点 O；钩住盖沿，手柄向上抬',
      view: '侧视',
      paramLabel: '手抬的位置',
      getGeom(t) {
        const O = K.v(280, 200);
        const hand = K.v(280 + 80 + t * 180, 200);
        const cap = K.v(320, 200);
        return {
          O, bar: [K.v(260, 210), O, hand],
          p1: hand, d1: K.v(0, 1),
          p2: cap, d2: K.v(0, -1),
          f2: 50,
          decor: 'opener',
        };
      },
    },
    {
      id: 'rod',
      name: '钓鱼竿',
      action: '分析：提起鱼（不是甩竿）',
      whyO: '竿尾抵腰/后手按住 → 支点 O；前手抬竿为动力',
      view: '侧视',
      paramLabel: '前手位置',
      getGeom(t) {
        const O = K.v(160, 260);
        const tip = K.v(680, 140);
        const hand = K.v(160 + 80 + t * 200, 260 - t * 40);
        return {
          O, bar: [O, tip],
          p1: hand, d1: K.v(0, -1),
          p2: tip, d2: K.v(0, 1),
          f2: 20,
          decor: 'rod',
        };
      },
    },
    {
      id: 'chopsticks',
      name: '筷子',
      action: '分析：夹菜（不分析搅或敲）',
      whyO: '手中两筷相抵处约束转动 → 支点 O',
      view: '侧视',
      paramLabel: '手指捏的位置',
      getGeom(t) {
        const O = K.v(200, 200);
        const tip = K.v(620, 280);
        const finger = K.v(200 + 60 + t * 160, 200 + t * 30);
        return {
          O, bar: [O, tip],
          p1: finger, d1: K.v(0.2, 1),
          p2: tip, d2: K.v(0, -1),
          f2: 5,
          decor: 'chopsticks',
        };
      },
    },
    {
      id: 'tweezers',
      name: '镊子',
      action: '分析：夹取细物',
      whyO: '相连弯折端 → 支点 O',
      view: '侧视',
      paramLabel: '手指捏的位置',
      getGeom(t) {
        const O = K.v(180, 180);
        const tip = K.v(560, 300);
        const pinch = K.v(180 + 50 + t * 140, 180 + t * 40);
        return {
          O, bar: [O, tip],
          p1: pinch, d1: K.v(0.15, 1),
          p2: tip, d2: K.v(0, -1),
          f2: 4,
          decor: 'tweezers',
        };
      },
    },
    {
      id: 'oar',
      name: '船桨',
      action: '分析：坐船划（教材图）',
      whyO: '桨架相对船几乎不移 → 支点 O',
      view: '俯视',
      paramLabel: '手握位置',
      getGeom(t) {
        const O = K.v(400, 210);
        const blade = K.v(650, 210);
        const handle = K.v(180 + t * 80, 210);
        return {
          O, bar: [handle, O, blade],
          p1: handle, d1: K.v(0, 1),
          p2: blade, d2: K.v(0, -1),
          f2: 80,
          decor: 'oar',
        };
      },
    },
    {
      id: 'hammer',
      name: '羊角锤',
      action: '分析：拔钉子',
      whyO: '锤头抵木板处 → 支点 O；硬棒可以弯',
      view: '侧视',
      paramLabel: '手握柄的位置',
      getGeom(t) {
        const O = K.v(431, 280);
        const nail = K.v(390, 275);
        const grip = K.v(210 + t * 25, 100 + t * 20);
        return {
          O, bar: [nail, O, grip],
          p1: grip, d1: K.v(-0.35, -1),
          p2: nail, d2: K.v(0, 1),
          f2: 100,
          decor: 'hammer',
        };
      },
    },
    {
      id: 'wheelbarrow',
      name: '独轮车',
      action: '分析：抬车把',
      whyO: '轮轴着地 → 支点 O',
      view: '侧视',
      paramLabel: '货物前后位置',
      getGeom(t) {
        const O = K.v(280, 300);
        const handle = K.v(560, 220);
        const load = K.v(280 + 40 + t * 120, 280);
        return {
          O, bar: [O, handle],
          p1: handle, d1: K.v(0, -1),
          p2: load, d2: K.v(0, 1),
          f2: 300,
          decor: 'wheelbarrow',
        };
      },
    },
    {
      id: 'balance',
      name: '天平',
      action: '分析：称量（等臂对照）',
      whyO: '刀口 → 支点 O',
      view: '正视',
      paramLabel: '（等臂，参数仅示意）',
      getGeom() {
        const O = K.v(400, 160);
        return {
          O, bar: [K.v(220, 160), K.v(580, 160)],
          p1: K.v(240, 160), d1: K.v(0, 1),
          p2: K.v(560, 160), d2: K.v(0, 1),
          f2: 10,
          decor: 'balance',
        };
      },
    },
    {
      id: 'nailclipper',
      name: '指甲剪',
      action: '分析：先手柄级（省力），再刀口级（费力）',
      whyO: '两级杠杆：手柄支点与刀口支点不同',
      view: '侧视',
      paramLabel: '当前查看的一级',
      stages: true,
      getGeom(t) {
        // t<0.5 手柄级；t>=0.5 刀口级
        if (t < 0.5) {
          const O = K.v(300, 260);
          const hand = K.v(500, 300);
          const mid = K.v(340, 240);
          return {
            O, bar: [mid, O, hand],
            p1: hand, d1: K.v(0, 1),
            p2: mid, d2: K.v(0, -1),
            f2: 20,
            decor: 'clipper1',
            stageName: '手柄级（省力）',
          };
        }
        const O = K.v(340, 240);
        const tip = K.v(480, 200);
        const press = K.v(300, 260);
        return {
          O, bar: [press, O, tip],
          p1: press, d1: K.v(0, -1),
          p2: tip, d2: K.v(0, 1),
          f2: 40,
          decor: 'clipper2',
          stageName: '刀口级（费力）',
        };
      },
    },
  ];

  let state = {
    idx: 0,
    step: 1, // 1..9
    t: 0.55,
    tPrev: null,
    perpMode: false,
    practice: false,
    practicePhase: 'pivot',
    clickedO: null,
    dirDraft: null,
    armEnd: null,
    dir2Draft: null,
    arm2End: null,
    arm1: null,
    arm2: null,
    showTruth: false,
  };

  function ex() {
    return EXAMPLES[state.idx];
  }

  function geom() {
    const g = global.LifeScenes
      ? LifeScenes.layout(ex().id, state.t)
      : ex().getGeom(state.t);
    if (state.perpMode) {
      // 力改为垂直于杆
      const barDir = K.norm(K.sub(g.bar[g.bar.length - 1], g.bar[0]));
      const n = K.perp(barDir);
      // 保持大致朝向原力的半平面
      if (K.dot(n, g.d1) < 0) g.d1 = K.scale(n, -1);
      else g.d1 = n;
    }
    const a1 = K.forceArm(g.O, g.p1, g.d1);
    const a2 = K.forceArm(g.O, g.p2, g.d2);
    const f1 = g.f2 * (a2.armLen / (a1.armLen || 1e-6));
    g.f1 = f1;
    g.a1 = a1;
    g.a2 = a2;
    g.cls = K.classifyLever(a1.armLen, a2.armLen);
    return g;
  }

  function svg() {
    return document.getElementById('lifeSvg');
  }

  function renderList() {
    const box = document.getElementById('lifeList');
    box.innerHTML = EXAMPLES.map((e, i) => {
      const g = global.LifeScenes ? LifeScenes.layout(e.id, 0.5) : e.getGeom(0.5);
      const a1 = K.forceArm(g.O, g.p1, g.d1);
      const a2 = K.forceArm(g.O, g.p2, g.d2);
      const cls = K.classifyLever(a1.armLen, a2.armLen);
      const tag =
        (e.key ? '<span class="tag key">课眼</span>' : '') +
        `<span class="tag ${cls.type === '省力' ? 'save' : cls.type === '费力' ? 'cost' : 'eq'}">${cls.type}</span>`;
      return `<button type="button" class="life-item${i === state.idx ? ' active' : ''}" data-i="${i}">${e.name}${tag}</button>`;
    }).join('');
  }

  function drawDecor(gLayer, g, id) {
    // 极简装饰
    if (id === 'broom') {
      S.el('rect', {
        x: g.p2.x - 30, y: g.p2.y - 8, width: 60, height: 24, rx: 4,
        fill: '#a8a29e', opacity: 0.7,
      }, gLayer);
    }
    if (id === 'door') {
      S.el('rect', {
        x: g.O.x, y: g.O.y - 70, width: 480, height: 140, rx: 4,
        fill: '#fde68a', opacity: 0.35, stroke: '#d97706',
      }, gLayer);
    }
    if (id === 'rod') {
      S.el('text', { x: g.p2.x - 10, y: g.p2.y + 28, 'font-size': 20 }, gLayer).textContent = '🐟';
    }
    if (id === 'hammer') {
      S.drawClawHammer(gLayer, { O: g.O, grip: g.p1, nail: g.p2 });
    }
  }

  function render() {
    const root = svg();
    const Lbar = root.querySelector('#lifeBar');
    const Ldraw = root.querySelector('#lifeDraw');
    const Lui = root.querySelector('#lifeUi');
    S.ensureDefs(root);
    S.clear(Lbar);
    S.clear(Ldraw);
    S.clear(Lui);
    const e = ex();
    const g = geom();
    const step = state.practice ? 0 : state.step;

    document.getElementById('lifeAction').textContent = e.action;
    document.getElementById('lifeWhy').textContent = e.whyO;
    document.getElementById('lifeStepBadge').textContent = state.practice
      ? '你来画'
      : '步骤 ' + step + ' / 9';

    if (step >= 1 || state.practice) {
      if (global.LifeScenes) {
        LifeScenes.draw(Lbar, e.id, state.t, { step: state.practice ? 1 : step });
      } else {
        drawDecor(Lbar, g, g.decor);
        S.drawBar(Lbar, g.bar, { opacity: 0.35 });
      }
    }

    if (!state.practice) {
      if (step >= 2) S.drawPivot(Ldraw, g.O);
      if (step >= 3) {
        const px1 = 40 + Math.min(100, g.f1 * 0.4);
        const px2 = 40 + Math.min(100, g.f2 * 0.4);
        S.drawForceArrow(Ldraw, g.p1, g.d1, px1, C.F1, 'F₁ ' + g.f1.toFixed(1) + ' N', { O: g.O });
        S.drawForceArrow(Ldraw, g.p2, g.d2, px2, C.F2, 'F₂ ' + g.f2 + ' N', { O: g.O });
      }
      if (step >= 5) {
        const armStep = step >= 5 ? Math.min(5, step - 2) : 0;
        // 简化：直接画力臂
        if (step >= 5) {
          S.drawForceLine(Ldraw, g.p1, g.d1, 180);
          S.drawForceLine(Ldraw, g.p2, g.d2, 180);
          S.drawArm(Ldraw, g.O, g.a1.foot, 'l₁', false, C.arm1, g.d1);
          S.drawArm(Ldraw, g.O, g.a2.foot, 'l₂', false, C.arm2, g.d2);
          if (g.a1.armLen > 6) S.drawRightAngle(Ldraw, g.a1.foot, g.a1.armVec, g.a1.dir, 9, C.arm1);
          if (g.a2.armLen > 6) S.drawRightAngle(Ldraw, g.a2.foot, g.a2.armVec, g.a2.dir, 9, C.arm2);
        }
      }
      if (state.tPrev != null && step >= 8) {
        const gOld = ex().getGeom(state.tPrev);
        const aOld = K.forceArm(gOld.O, gOld.p1, gOld.d1);
        S.drawArm(Lui, gOld.O, aOld.foot, null, true);
      }
    } else {
      S.el('circle', { cx: g.p1.x, cy: g.p1.y, r: 5, fill: C.F1 }, Ldraw);
      S.el('circle', { cx: g.p2.x, cy: g.p2.y, r: 5, fill: C.F2 }, Ldraw);
      if (state.clickedO) S.drawPivot(Ldraw, state.clickedO);
      if (state.dirDraft) {
        S.drawForceArrow(Ldraw, g.p1, state.dirDraft, 60, C.F1, 'F₁', { O: state.clickedO || g.O });
      }
      if (state.arm1) drawProperArm(Ldraw, state.arm1, 'l₁', C.arm1);
      else if (state.armEnd && state.clickedO) {
        S.el('line', {
          x1: state.clickedO.x, y1: state.clickedO.y,
          x2: state.armEnd.x, y2: state.armEnd.y,
          stroke: C.arm, 'stroke-width': 2.5,
        }, Ldraw);
      }
      if (state.dir2Draft) {
        S.drawForceArrow(Ldraw, g.p2, state.dir2Draft, 60, C.F2, 'F₂', { O: state.clickedO || g.O });
      }
      if (state.arm2) drawProperArm(Ldraw, state.arm2, 'l₂', C.arm2);
      else if (state.arm2End && state.clickedO) {
        S.el('line', {
          x1: state.clickedO.x, y1: state.clickedO.y,
          x2: state.arm2End.x, y2: state.arm2End.y,
          stroke: C.arm2, 'stroke-width': 2.5,
        }, Ldraw);
      }
      S.el('rect', {
        id: 'lifeHit',
        x: 0, y: 0, width: 800, height: 420,
        fill: 'transparent',
        'pointer-events': 'all',
      }, Lui);
    }

    // 力矩条
    const maxM = Math.max(g.f1 * g.a1.armLen, g.f2 * g.a2.armLen, 1);
    const m1 = g.f1 * g.a1.armLen;
    const m2 = g.f2 * g.a2.armLen;
    document.getElementById('lifeM1').style.width = (100 * m1 / maxM) + '%';
    document.getElementById('lifeM2').style.width = (100 * m2 / maxM) + '%';
    document.getElementById('lifeM1Lab').textContent = 'F₁·l₁ = ' + m1.toFixed(0);
    document.getElementById('lifeM2Lab').textContent = 'F₂·l₂ = ' + m2.toFixed(0);
    document.getElementById('lifeClass').textContent = g.cls.type + '杠杆 — ' + g.cls.tip;
    if (g.stageName) {
      document.getElementById('lifeClass').textContent += '（' + g.stageName + '）';
    }

    const param = document.getElementById('lifeParam');
    param.hidden = !(step >= 8 || state.practice);
    document.getElementById('lifeParamLabel').textContent = e.paramLabel;
    document.getElementById('lifeParamVal').value = state.t;
    document.getElementById('lifeParamOut').textContent = state.t.toFixed(2);

    document.getElementById('lifePerp').disabled = step < 5 && !state.practice;
  }

  function drawProperArm(g, rec, label, color) {
    S.drawForceLine(g, rec.point, rec.dir, 170, color);
    S.drawArm(g, rec.O, rec.foot, label, false, color, rec.dir);
    const armVec = K.sub(rec.foot, rec.O);
    if (K.len(armVec) > 6) S.drawRightAngle(g, rec.foot, armVec, rec.dir, 9, color);
  }

  function clearAttempt() {
    state.practicePhase = 'pivot';
    state.clickedO = null;
    state.dirDraft = null;
    state.armEnd = null;
    state.dir2Draft = null;
    state.arm2End = null;
    state.arm1 = null;
    state.arm2 = null;
    state.showTruth = false;
  }

  function setJudge(msg, ok) {
    const el = document.getElementById('lifeJudge');
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

  function bind() {
    renderList();
    document.getElementById('lifeList').onclick = (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      state.idx = +b.dataset.i;
      state.step = 1;
      state.practice = false;
      state.tPrev = null;
      state.showTruth = false;
      renderList();
      setJudge('', null);
      render();
    };

    document.getElementById('lifePrev').onclick = () => {
      if (state.practice) {
        leavePractice();
        return;
      }
      state.step = Math.max(1, state.step - 1);
      render();
    };
    document.getElementById('lifeNext').onclick = () => {
      if (state.practice) {
        resetAttempt();
        return;
      }
      if (state.step === 8) state.tPrev = state.t;
      state.step = Math.min(9, state.step + 1);
      if (state.step === 9) {
        state.practice = true;
        clearAttempt();
        setJudge('你来画：① 点支点 ② 拖 F₁ 再画 l₁ ③ 拖 F₂ 再画 l₂', null);
      }
      render();
    };
    document.getElementById('lifeSkip').onclick = () => {
      state.step = 8;
      state.practice = false;
      render();
    };
    document.getElementById('lifeParamVal').oninput = (e) => {
      if (state.tPrev == null) state.tPrev = state.t;
      state.t = +e.target.value;
      render();
    };
    document.getElementById('lifePerp').onclick = (e) => {
      state.perpMode = !state.perpMode;
      e.target.classList.toggle('active-toggle', state.perpMode);
      render();
    };
    document.getElementById('lifeExitPractice').onclick = () => {
      resetAttempt();
    };

    function resetAttempt() {
      state.practice = true;
      state.step = 9;
      clearAttempt();
      setJudge('已清空。请直接在图上点支点（垫块棱）。', null);
      render();
    }

    function leavePractice() {
      state.practice = false;
      state.step = 1;
      state.practicePhase = 'pivot';
      state.clickedO = null;
      state.dirDraft = null;
      state.armEnd = null;
      state.showTruth = false;
      state.tPrev = null;
      setJudge('已回到实物。要再练，把「下一步」点到「你来画」。', null);
      render();
    }

    const s = svg();
    s.addEventListener('pointerdown', (evt) => {
      if (!state.practice) return;
      if (evt.target.closest && evt.target.closest('.stage-toolbar')) return;
      let p;
      try {
        p = svgPoint(evt);
      } catch (err) {
        setJudge('点选失败，请再点一次图上的支点。', false);
        return;
      }
      const g = geom();
      if (state.practicePhase === 'pivot') {
        state.clickedO = p;
        if (K.dist(p, g.O) < 32) {
          setJudge('支点正确。下一步：从蓝色动力作用点拖出力的方向。', true);
          state.practicePhase = 'dir';
        } else if (K.dist(p, g.p1) < 24 || K.dist(p, g.p2) < 24) {
          setJudge('作用点在杠杆上，但这里要先点支点 O。', false);
        } else {
          setJudge('再找找：哪个点几乎不移却约束了转动？', false);
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
      if (state.practicePhase === 'dir2') {
        dragging = 'dir2';
        state.dir2Draft = K.norm(K.sub(p, g.p2));
        render();
        return;
      }
      if (state.practicePhase === 'arm2') {
        dragging = 'arm2';
        state.arm2End = p;
        render();
        return;
      }
      if (state.practicePhase === 'done') {
        setJudge('动力臂和阻力臂都已保留。要重画，点「退出你来画」。', true);
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
      } else if (dragging === 'dir2') {
        state.dir2Draft = K.norm(K.sub(p, g.p2));
        render();
      } else if (dragging === 'arm2') {
        state.arm2End = p;
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
          setJudge('F₁ 方向可以。从你点的 O 向这条红虚线作垂线，拖到交点。', true);
          state.practicePhase = 'arm';
        } else {
          setJudge('想想这个动作里人实际往哪边发力。', false);
        }
      }
      if (dragging === 'arm' && state.armEnd && state.clickedO && state.dirDraft) {
        const dir = state.dirDraft;
        const r = K.judgeArmDraw(state.clickedO, g.p1, dir, state.armEnd);
        setJudge(r.ok
          ? '动力臂已标成 l₁：两端朝外箭头，并与 F₁ 垂直。接着从蓝色点拖出阻力 F₂ 的方向。'
          : r.message, r.ok);
        if (r.ok) {
          const truth = K.forceArm(state.clickedO, g.p1, dir);
          state.arm1 = { O: state.clickedO, foot: truth.foot, dir: dir, point: g.p1 };
          state.armEnd = null;
          state.practicePhase = 'dir2';
        }
        render();
      }
      if (dragging === 'dir2' && state.dir2Draft) {
        const ang2 = Math.acos(Math.min(1, Math.abs(K.dot(state.dir2Draft, K.norm(g.d2)))));
        if ((ang2 * 180) / Math.PI < 28) {
          setJudge('F₂ 方向可以。从 O 向蓝色虚线作垂线，拖到交点，标出 l₂。', true);
          state.practicePhase = 'arm2';
        } else {
          setJudge('阻力是石头压在撬棍上的力，方向向下。', false);
        }
      }
      if (dragging === 'arm2' && state.arm2End && state.clickedO && state.dir2Draft) {
        const dir2 = state.dir2Draft;
        const r2 = K.judgeArmDraw(state.clickedO, g.p2, dir2, state.arm2End);
        setJudge(r2.ok
          ? '阻力臂已标成 l₂：两端朝外箭头，并与 F₂ 垂直。'
          : r2.message, r2.ok);
        if (r2.ok) {
          const truth2 = K.forceArm(state.clickedO, g.p2, dir2);
          state.arm2 = { O: state.clickedO, foot: truth2.foot, dir: dir2, point: g.p2 };
          state.arm2End = null;
          state.practicePhase = 'done';
        }
        render();
      }
      dragging = null;
    });
  }

  function init() {
    // 默认选撬棒
    state.idx = 0;
    bind();
    render();
  }

  global.LifeLab = { init, render };
})(typeof window !== 'undefined' ? window : globalThis);
