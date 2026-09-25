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
      action: '分析：向前扫地（用实物图拆解）',
      whyO: '上手相对稳定、约束扫把转动 → 支点 O；下手是动力作用点；扫把头与地面接触处受阻力',
      view: '侧视实物',
      paramLabel: '下手位置（改变动力臂）',
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
      id: 'opener',
      name: '开瓶器',
      key: true,
      pivotTol: 46,
      action: '分析：用开瓶器抬柄启盖',
      whyO: '鼻端压在瓶盖上的接触点几乎不移 → 支点 O；下唇钩住盖沿，手在柄端施力',
      view: '侧视实物',
      paramLabel: '手在柄端的施力位置',
      getGeom(t) {
        const O = K.v(213, 92);
        const hand = K.v(400 + t * 190, 180 + t * 135);
        const cap = K.v(220, 137);
        return {
          O, bar: [K.v(260, 210), O, hand],
          p1: hand, d1: K.v(0, -1),
          p2: cap, d2: K.v(0, 1),
          f2: 50,
          decor: 'opener',
        };
      },
    },
    {
      id: 'wheelbarrow',
      name: '小推车（独轮车）',
      key: true,
      action: '分析：抬起小推车把手',
      whyO: '轮轴是转动中心 → 支点 O；手在把手处向上抬；货物重力作用在车斗中的重心位置',
      view: '侧视实物',
      paramLabel: '货物在车斗中的前后位置',
      getGeom(t) {
        const O = K.v(143, 241);
        const handle = K.v(664, 95);
        const load = K.v(255 + t * 145, 141);
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
      id: 'rod',
      name: '钓鱼竿',
      freeForceDir: true,
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
          p2: tip, d2: K.v(0, -1),
          f2: 20,
          decor: 'rod',
        };
      },
    },
    {
      id: 'chopsticks',
      name: '筷子',
      pivotGiven: true,
      action: '分析：夹菜（不分析搅或敲）',
      whyO: '支点 O 直接给出在红圈位置：手中两筷相抵、约束转动的位置。',
      view: '侧视',
      paramLabel: '手指捏的位置',
      getGeom(t) {
        const O = K.v(293, 165);
        const tip = K.v(620, 300);
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
          p2: blade, d2: K.v(0, 1),
          f2: 80,
          decor: 'oar',
        };
      },
    },
    {
      id: 'hammer',
      name: '羊角锤',
      freeForceDir: true,
      action: '分析：拔钉子',
      whyO: '锤头抵木板处 → 支点 O；硬棒可以弯',
      view: '侧视',
      paramLabel: '装配固定（与画力臂工作台一致）',
      getGeom(t) {
        const O = K.v(431, 280);
        const nail = K.v(390, 275);
        const grip = K.v(210, 100);
        return {
          O, bar: [nail, O, grip],
          p1: grip, d1: K.v(0, -1),
          p2: nail, d2: K.v(0, 1),
          f2: 100,
          decor: 'hammer',
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
      action: '分析：依次看压柄、上刀口、下刀口三个杠杆',
      whyO: '按结构图分为三个杠杆：压柄以圆柱销为支点；上、下刀口均以尾部连接处为支点。',
      view: '侧视实物',
      paramLabel: '当前杠杆（左=压柄，中=上刀口，右=下刀口）',
      stages: true,
      getGeom(t) {
        const P = (u, v) => K.v(150 + u * 500, 2 + v * 500 * (352 / 420));

        if (t < 1 / 3) {
          const O = P(0.205, 0.70);
          const hand = P(0.815, 0.09);
          const load = P(0.135, 0.73);
          return {
            O, bar: [load, O, hand],
            p1: hand, d1: K.v(0, 1),
            p2: load, d2: K.v(0, 1),
            f2: 20,
            decor: 'clipper1',
            stageName: '① 压柄：第一类杠杆（省力）',
          };
        }

        if (t < 2 / 3) {
          const O = P(0.955, 0.64);
          const input = P(0.245, 0.72);
          const tip = P(0.045, 0.78);
          return {
            O, bar: [tip, input, O],
            p1: input, d1: K.v(0, 1),
            p2: tip, d2: K.v(0, -1),
            f2: 35,
            decor: 'clipper2',
            stageName: '② 上刀口：第三类杠杆（费力）',
          };
        }

        const O = P(0.955, 0.64);
        const input = P(0.235, 0.83);
        const tip = P(0.045, 0.86);
        return {
          O, bar: [tip, input, O],
          p1: input, d1: K.v(0, -1),
          p2: tip, d2: K.v(0, 1),
          f2: 35,
          decor: 'clipper3',
          stageName: '③ 下刀口：第三类杠杆（费力）',
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
    exploreLastValidDir: null,
    exploreStatus: null,
  };

  function ex() {
    return EXAMPLES[state.idx];
  }

  function sceneGeom(example, t) {
    if (global.LifeScenes) {
      try {
        const g = LifeScenes.layout(example.id, t);
        if (g) return g;
      } catch (err) {
        console.error('[LifeLab] LifeScenes.layout failed:', example.id, err);
      }
    }
    return example.getGeom(t);
  }

  function geom() {
    const g = sceneGeom(ex(), state.t);
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

  function exploreEnabled(example) {
    return !!example && example.id !== 'balance';
  }

  function resistanceDir(g) {
    return state.arm2 && state.arm2.dir
      ? K.norm(state.arm2.dir)
      : state.dir2Draft
        ? K.norm(state.dir2Draft)
        : K.norm(g.d2);
  }

  function exploreMetrics(g, dir) {
    const O = state.clickedO || g.O;
    const d1 = K.norm(dir || state.dirDraft || g.d1);
    const d2 = resistanceDir(g);
    const a1 = K.forceArm(O, g.p1, d1);
    const a2 = K.forceArm(O, g.p2, d2);
    const t1 = K.torque2D(O, g.p1, d1);
    const t2 = K.torque2D(O, g.p2, d2);
    const nearZero = a1.armLen < 4 || Math.abs(t1) < 1e-5;
    const opposite = Math.abs(t2) < 1e-6 ? true : t1 * t2 < 0;
    const ratio = a1.armLen < 4 ? Infinity : a2.armLen / a1.armLen;
    return {
      O, d1, d2, a1, a2, t1, t2, nearZero, opposite, ratio,
      cls: K.classifyLever(a1.armLen, a2.armLen),
    };
  }

  function exploreForcePx(m) {
    // 同一阻力矩下 F₁/F₂ = l₂/l₁。箭头长度随所需动力单调变化；
    // 为避免接近零力臂时箭头冲出画面，使用平方根压缩并设置显示上限。
    if (!m || m.nearZero || !isFinite(m.ratio)) return 165;
    const r = Math.max(0.18, Math.min(4, m.ratio));
    return Math.max(52, Math.min(165, 84 * Math.sqrt(r)));
  }

  function exploreHandlePx(m) {
    // 拖动小球至少离作用点 120 px；较大的力箭头时再向外留 28 px。
    return Math.max(120, exploreForcePx(m) + 28);
  }

  function boundaryDirection(g, candidate) {
    const O = state.clickedO || g.O;
    const toO = K.norm(K.sub(O, g.p1));
    const away = K.scale(toO, -1);
    return K.dot(candidate, toO) >= K.dot(candidate, away) ? toO : away;
  }

  function setExploreDirection(g, candidate) {
    const d = K.norm(candidate);
    const m = exploreMetrics(g, d);
    if (m.nearZero) {
      state.dirDraft = d;
      state.exploreLastValidDir = d;
      state.exploreStatus = 'zero';
      return m;
    }
    if (m.opposite) {
      state.dirDraft = d;
      state.exploreLastValidDir = d;
      state.exploreStatus = 'valid';
      return m;
    }

    // 不允许进入与阻力同向转动的半平面；钳制在“作用线经过 O”的边界。
    const boundary = boundaryDirection(g, d);
    state.dirDraft = boundary;
    state.exploreLastValidDir = boundary;
    state.exploreStatus = 'blocked';
    return exploreMetrics(g, boundary);
  }

  function renderList() {
    const box = document.getElementById('lifeList');
    box.innerHTML = EXAMPLES.map((e, i) => {
      const g = sceneGeom(e, 0.5);
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
    const exploring = state.practice && state.practicePhase === 'explore' && exploreEnabled(e);
    const em = exploring ? exploreMetrics(g, state.dirDraft || g.d1) : null;

    document.getElementById('lifeAction').textContent = e.action;
    document.getElementById('lifeWhy').textContent = e.whyO;
    document.getElementById('lifeStepBadge').textContent = exploring
      ? '方向探究'
      : state.practice
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
      if (step >= 2 || e.pivotGiven) S.drawPivot(Ldraw, g.O);
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
        const gOld = sceneGeom(ex(), state.tPrev);
        if (gOld) {
          const aOld = K.forceArm(gOld.O, gOld.p1, gOld.d1);
          S.drawArm(Lui, gOld.O, aOld.foot, null, true);
        }
      }
    } else {
      S.el('circle', { cx: g.p1.x, cy: g.p1.y, r: 5, fill: C.F1 }, Ldraw);
      S.el('circle', { cx: g.p2.x, cy: g.p2.y, r: 5, fill: C.F2 }, Ldraw);
      if (state.clickedO) S.drawPivot(Ldraw, state.clickedO);

      if (exploring && em) {
        // F1 方向可拖；作用线与 l1 按当前方向实时重算。
        // 同样任务下 l1 越小，所需 F1 越大，红色力箭头也随之增长。
        const forcePx = exploreForcePx(em);
        const handlePx = exploreHandlePx(em);
        S.drawForceArrow(Ldraw, g.p1, em.d1, forcePx, C.F1, 'F₁', { O: em.O });
        S.drawForceLine(Ldraw, g.p1, em.d1, 190, C.F1);
        if (!em.nearZero && em.a1.armLen > 4) {
          S.drawArm(Ldraw, em.O, em.a1.foot, 'l₁', false, C.arm1, em.d1);
          S.drawRightAngle(Ldraw, em.a1.foot, em.a1.armVec, em.a1.dir, 9, C.arm1);
        }

        // 阻力及阻力臂固定，作为参照。
        S.drawForceArrow(Ldraw, g.p2, em.d2, 60, C.F2, 'F₂', { O: em.O });
        S.drawForceLine(Ldraw, g.p2, em.d2, 170, C.F2);
        if (em.a2.armLen > 4) {
          S.drawArm(Ldraw, em.O, em.a2.foot, 'l₂', false, C.arm2, em.d2);
          S.drawRightAngle(Ldraw, em.a2.foot, em.a2.armVec, em.a2.dir, 9, C.arm2);
        }

        const arrowTip = K.add(g.p1, K.scale(em.d1, forcePx));
        const dragTip = K.add(g.p1, K.scale(em.d1, handlePx));
        if (handlePx - forcePx > 8) {
          S.el('line', {
            x1: arrowTip.x, y1: arrowTip.y,
            x2: dragTip.x, y2: dragTip.y,
            stroke: C.F1, 'stroke-width': 1.5,
            'stroke-dasharray': '5 5', opacity: 0.45,
          }, Lui);
        }
        S.el('circle', {
          cx: dragTip.x, cy: dragTip.y, r: 11,
          fill: '#fff', stroke: C.F1, 'stroke-width': 3,
          style: 'cursor:grab',
        }, Lui);
        S.el('text', {
          x: dragTip.x + 14, y: dragTip.y - 10,
          fill: C.F1, 'font-size': 11, 'font-weight': 700,
          stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke',
        }, Lui).textContent = '拖动';
      } else {
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
      }

      S.el('rect', {
        id: 'lifeHit',
        x: 0, y: 0, width: 800, height: 420,
        fill: 'transparent',
        'pointer-events': 'all',
      }, Lui);
    }

    if (exploring && em) {
      const maxArm = Math.max(em.a1.armLen, em.a2.armLen, 1);
      document.getElementById('lifeM1').style.width = (100 * em.a1.armLen / maxArm) + '%';
      document.getElementById('lifeM2').style.width = (100 * em.a2.armLen / maxArm) + '%';
      document.getElementById('lifeM1Lab').textContent = '动力臂 l₁ = ' + em.a1.armLen.toFixed(1);
      document.getElementById('lifeM2Lab').textContent = '阻力臂 l₂ = ' + em.a2.armLen.toFixed(1);

      const classBox = document.getElementById('lifeClass');
      if (em.nearZero || state.exploreStatus === 'blocked') {
        classBox.innerHTML =
          '<b>动力臂接近 0</b><br>' +
          '这个方向几乎不能使杠杆绕 O 转动。';
      } else {
        const lr = em.a2.armLen > 1e-6 ? em.a1.armLen / em.a2.armLen : Infinity;
        const fr = isFinite(em.ratio) ? em.ratio.toFixed(2) : '∞';
        classBox.innerHTML =
          '<b>当前施力方向：' + em.cls.type + '</b><br>' +
          'l₁/l₂ = ' + (isFinite(lr) ? lr.toFixed(2) : '∞') +
          '　·　完成同样任务时 F₁/F₂ ≈ ' + fr;
        if (g.stageName) classBox.innerHTML += '<br>' + g.stageName;
      }
    } else {
      // 原有力矩条
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
    }

    const param = document.getElementById('lifeParam');
    // 作图与方向探究阶段固定 O、P₁、P₂，避免同时改变多个变量。
    param.hidden = !(step >= 8 && !state.practice);
    document.getElementById('lifeParamLabel').textContent = e.paramLabel;
    document.getElementById('lifeParamVal').value = state.t;
    document.getElementById('lifeParamOut').textContent = state.t.toFixed(2);

    document.getElementById('lifePerp').disabled = state.practice || step < 5;
  }

  function drawProperArm(g, rec, label, color) {
    S.drawForceLine(g, rec.point, rec.dir, 170, color);
    S.drawArm(g, rec.O, rec.foot, label, false, color, rec.dir);
    const armVec = K.sub(rec.foot, rec.O);
    if (K.len(armVec) > 6) S.drawRightAngle(g, rec.foot, armVec, rec.dir, 9, color);
  }

  function clearAttempt() {
    const e = ex();
    const g = geom();
    state.practicePhase = e.pivotGiven ? 'dir' : 'pivot';
    state.clickedO = e.pivotGiven ? { x: g.O.x, y: g.O.y } : null;
    state.dirDraft = null;
    state.armEnd = null;
    state.dir2Draft = null;
    state.arm2End = null;
    state.arm1 = null;
    state.arm2 = null;
    state.showTruth = false;
    state.exploreLastValidDir = null;
    state.exploreStatus = null;
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

  function judgeFreeForceDirection(example, g, dir) {
    const arm = K.forceArm(g.O, g.p1, dir);
    if (arm.armLen < 4) {
      return {
        ok: false,
        message: '这个施力方向的作用线几乎通过支点，动力臂接近 0。方向本身可以存在，但几乎不能产生有效转动，请换一个方向。',
      };
    }
    const t1 = K.torque2D(g.O, g.p1, dir);
    const t2 = K.torque2D(g.O, g.p2, g.d2);
    if (Math.abs(t2) > 1e-6 && t1 * t2 >= 0) {
      return {
        ok: false,
        message: example.id === 'rod'
          ? '这个方向会让鱼竿向与提鱼相反的方向转动。请从前手位置重新选择一个能抬起鱼竿的方向。'
          : '这个方向产生的转动效果与拔钉方向相反，请重新选择施力方向。',
      };
    }
    return { ok: true, message: '这个动力方向物理上合理。系统会保留你选择的方向，请从支点 O 向它的作用线作垂线。' };
  }

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
      if (ex().id === 'broom') {
        setJudge('先只看扫把实物图。下一步先标上手支点 O，再揭示下手动力点和扫把头阻力点。', null);
      } else if (ex().id === 'opener') {
        setJudge('先只看真实开瓶器。重点观察：支点不是瓶子中心，而是开瓶器鼻端压住瓶盖的接触点。', null);
      } else if (ex().id === 'wheelbarrow') {
        setJudge('先只看真实小推车。下一步先标轮轴支点，再揭示把手动力点和货物阻力点。', null);
      } else {
        setJudge('', null);
      }
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
        setJudge(
          ex().pivotGiven
            ? '支点 O 已直接给出：从红色动力作用点拖出 F₁，再依次画 l₁、F₂、l₂。'
            : '你来画：① 点支点 ② 拖 F₁ 再画 l₁ ③ 拖 F₂ 再画 l₂',
          null
        );
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
      setJudge(
        ex().pivotGiven
          ? '开始练习：支点 O 已给出，请从红色动力作用点拖出 F₁。'
          : '开始练习：请先在实物图上判断并点出支点 O。',
        null
      );
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
      state.exploreLastValidDir = null;
      state.exploreStatus = null;
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
        const pivotTol = ex().pivotTol || 32;
        if (K.dist(p, g.O) < pivotTol) {
          // 容许人手点选误差；判定正确后吸附到该情境的真实支点，避免后续力臂被鼠标误差带偏。
          state.clickedO = { x: g.O.x, y: g.O.y };
          setJudge('支点正确。已吸附到真实支点 O；下一步从红色动力作用点拖出 F₁ 的方向。', true);
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
        if (K.dist(p, g.p1) > 36) {
          setJudge('请从红色动力作用点附近按下，再拖出 F₁ 的方向。', false);
          return;
        }
        dragging = 'dir';
        state.dirDraft = null;
        render();
        return;
      }
      if (state.practicePhase === 'arm') {
        const O0 = state.clickedO || g.O;
        if (K.dist(p, O0) > 36) {
          setJudge('动力方向已经确定，不会再改变。请从支点 O 开始拖动力臂。', false);
          return;
        }
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
      if (state.practicePhase === 'explore') {
        const dir = state.dirDraft || g.d1;
        const mNow = exploreMetrics(g, dir);
        const tip = K.add(g.p1, K.scale(K.norm(dir), exploreHandlePx(mNow)));
        if (K.dist(p, tip) > 34) {
          setJudge('方向探究：请拖动红色 F₁ 箭头末端。支点、两个作用点和阻力保持不变。', null);
          return;
        }
        dragging = 'exploreDir';
        state.exploreLastValidDir = K.norm(dir);
        return;
      }
      if (state.practicePhase === 'done') {
        setJudge(
          ex().id === 'balance'
            ? '天平两侧作用力方向由重力决定，本例不进行施力方向探究。要重画请点「退出你来画」。'
            : '动力臂和阻力臂都已保留。要重画，点「退出你来画」。',
          true
        );
      }
    });
    window.addEventListener('pointermove', (evt) => {
      if (!dragging || !state.practice) return;
      const p = svgPoint(evt);
      const g = geom();
      if (dragging === 'dir') {
        const dv = K.sub(p, g.p1);
        if (K.len(dv) > 8) state.dirDraft = K.norm(dv);
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
      } else if (dragging === 'exploreDir') {
        const dv = K.sub(p, g.p1);
        if (K.len(dv) > 8) {
          const m = setExploreDirection(g, dv);
          if (m.nearZero || state.exploreStatus === 'blocked') {
            setJudge('动力臂接近 0，这个方向几乎不能使杠杆绕 O 转动。', null);
          } else {
            setJudge('正在探究：只改变 F₁ 方向，观察动力臂和所需动力比例如何变化。', true);
          }
        }
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
        if (ex().freeForceDir) {
          const jr = judgeFreeForceDirection(ex(), g, state.dirDraft);
          if (jr.ok) {
            state.practicePhase = 'arm';
            setJudge(jr.message, true);
          } else {
            setJudge(jr.message, false);
          }
        } else {
          const signedDot = Math.max(-1, Math.min(1, K.dot(state.dirDraft, K.norm(g.d1))));
          const ang = Math.acos(signedDot);
          if ((ang * 180) / Math.PI < 28) {
            setJudge('F₁ 方向可以。从你点的 O 向这条红虚线作垂线，拖到交点。', true);
            state.practicePhase = 'arm';
          } else {
            setJudge('想想这个动作里人实际往哪边发力。', false);
          }
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
        const dot2 = Math.max(-1, Math.min(1, K.dot(state.dir2Draft, K.norm(g.d2))));
        const ang2 = Math.acos(dot2);
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
          // 阻力方向在通过判定后规范化到该情境的真实方向，作为后续方向探究的固定参照。
          const fixedDir2 = K.norm(g.d2);
          state.dir2Draft = fixedDir2;
          const truth2 = K.forceArm(state.clickedO, g.p2, fixedDir2);
          state.arm2 = { O: state.clickedO, foot: truth2.foot, dir: fixedDir2, point: g.p2 };
          state.arm2End = null;
          if (exploreEnabled(ex())) {
            state.practicePhase = 'explore';
            state.exploreLastValidDir = K.norm(state.dirDraft || g.d1);
            state.exploreStatus = 'valid';
            const m0 = exploreMetrics(g, state.exploreLastValidDir);
            if (!m0.nearZero && !m0.opposite) {
              state.dirDraft = boundaryDirection(g, state.exploreLastValidDir);
              state.exploreStatus = 'blocked';
            }
            setJudge('作图完成。进入“施力方向探究”：拖动红色控制小球。l₁ 变小时，同样任务所需 F₁ 增大，红色力箭头会随之增长。', true);
          } else {
            state.practicePhase = 'done';
            setJudge('作图完成。天平两侧作用力方向由重力决定，本例不进行施力方向探究。', true);
          }
        }
        render();
      }
      if (dragging === 'exploreDir') {
        const mx = exploreMetrics(g, state.dirDraft || g.d1);
        if (mx.nearZero || state.exploreStatus === 'blocked') {
          setJudge('动力臂接近 0，这个方向几乎不能使杠杆绕 O 转动。', null);
        } else {
          const ratioText = isFinite(mx.ratio) ? mx.ratio.toFixed(2) : '∞';
          setJudge('当前方向下 F₁/F₂ ≈ ' + ratioText + '。继续拖动红色箭头末端比较不同方向。', true);
        }
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
