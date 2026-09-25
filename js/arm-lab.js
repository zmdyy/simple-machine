/**
 * 画力臂工作台：
 * - fixed：方向唯一（重力/压力等），±5° 容错后自动吸附到规范方向；超差才显示纠错答案
 * - given：题目已给出力，学生只画对应力臂
 * - freeSector：开放施力方向。只判断物理可操作范围，不设置唯一标准动力；力臂答案随学生选择动态生成
 */
(function (global) {
  'use strict';

  const K = global.LeverKernel;
  const S = global.LeverSVG;
  const C = K.COLORS;

  const FORCE_TOL_DEG = 5;
  const ARM_TOL_DEG = 7;
  const ARM_TIP_TOL = 28;

  const SCENES = [
    {
      id: 'horiz_vert',
      name: '挂钩码',
      tip: '重力方向明确：允许少量手绘误差',
      practiceType: 'fixed',
      howO: '杠杆架在中间刀口支架上。支点 O = 刀口与杆接触的一点。',
      stem:
        '水平杠杆两侧挂钩码。右侧钩码重力作为动力 F₁。\n' +
        '请：① 点出支点 O；② 从右侧“动”点向下画 F₁；③ 从 O 画出动力臂 l₁。',
      known: '重力方向竖直向下。手绘允许 ±5°；在容差内会自动吸附为规范竖直线。',
      O: { x: 400, y: 220 },
      bar: [{ x: 180, y: 220 }, { x: 620, y: 220 }],
      point: { x: 520, y: 220 },
      dir: { x: 0, y: 1 },
      forcePx: 75,
      point2: { x: 280, y: 220 },
      dir2: { x: 0, y: 1 },
      forcePx2: 75,
      cue: 'hooks_both',
      pointLabel: '动',
      point2Label: '阻',
    },
    {
      id: 'horiz_oblique',
      name: '斜向压杆',
      tip: '已知斜向力：只判断力臂',
      practiceType: 'given',
      howO: '中间刀口支架顶住杆的位置就是支点 O。',
      stem:
        '杆保持水平，图中已经给出手对杆的斜向下压力 F₁。\n' +
        '本题不猜施力角度，只练一个核心：从 O 向 F₁ 的作用线作垂线，画出 l₁。',
      known: '红色箭头和红色虚线是已知条件。只需从 O 画到作用线的垂足。',
      O: { x: 400, y: 220 },
      bar: [{ x: 180, y: 220 }, { x: 620, y: 220 }],
      point: { x: 260, y: 220 },
      dir: { x: 0.55, y: 0.84 },
      forcePx: 90,
      point2: { x: 540, y: 220 },
      dir2: { x: 0, y: 1 },
      forcePx2: 70,
      cue: 'hand_and_hook',
      pointLabel: '动',
      point2Label: '阻',
    },
    {
      id: 'extend',
      name: '要延长作用线',
      tip: '垂足可能落在箭头之外',
      practiceType: 'given',
      howO: '中间刀口支架与杆的接触点是支点 O。',
      stem:
        '图中已经给出较短的斜向动力 F₁。它的垂足不一定落在箭头线段上。\n' +
        '请沿虚线理解“作用线可以延长”，再从 O 画出 l₁。',
      known: '力臂针对的是“力的作用线”，不是只针对箭头本身。',
      O: { x: 400, y: 200 },
      bar: [{ x: 200, y: 200 }, { x: 600, y: 200 }],
      point: { x: 280, y: 200 },
      dir: { x: 0.2, y: 1 },
      forcePx: 45,
      point2: { x: 520, y: 200 },
      dir2: { x: 0, y: 1 },
      forcePx2: 65,
      cue: 'hand_and_hook',
      pointLabel: '动',
      point2Label: '阻',
    },
    {
      id: 'tilt_vert',
      name: '杆是斜的',
      tip: '杆斜了，重力仍竖直',
      practiceType: 'fixed',
      howO: '斜杆仍架在刀口上；刀口与杆接触处是支点 O。',
      stem:
        '杠杆没有调成水平，但钩码重力仍然竖直向下。\n' +
        '请：① 找 O；② 画右侧 F₁；③ 画 l₁。不要沿着斜杆画力臂。',
      known: '重力方向不随杆倾斜。手绘 ±5° 内自动规范为竖直向下。',
      O: { x: 400, y: 240 },
      bar: [{ x: 200, y: 300 }, { x: 600, y: 180 }],
      point: { x: 520, y: 204 },
      dir: { x: 0, y: 1 },
      forcePx: 75,
      point2: { x: 280, y: 276 },
      dir2: { x: 0, y: 1 },
      forcePx2: 75,
      cue: 'hooks_tilt',
      pointLabel: '动',
      point2Label: '阻',
    },
    {
      id: 'bent',
      name: '羊角锤拔钉',
      tip: '开放施力：合理方向都可以',
      practiceType: 'freeSector',
      sector: { minDeg: -90, maxDeg: 0, label: '水平向右 → 竖直向上' },
      howO: '锤头外弧抵住木板的位置是支点 O，不是钉帽，也不是柄端。',
      stem:
        '羊角锤拔钉。手在柄端可以选择不同施力方向，并不存在唯一“标准动力”。\n' +
        '请：① 点支点 O；② 从柄端自由选择 F₁（水平向右到竖直向上的 90° 范围）；③ 按你自己的 F₁ 画 l₁。',
      known:
        '合理方向全部接受。程序不会替你换成某个“标准 F₁”；只会依据你选择的方向生成对应作用线与力臂。',
      O: { x: 431, y: 280 },
      bar: [{ x: 390, y: 275 }, { x: 431, y: 280 }, { x: 210, y: 100 }],
      point: { x: 210, y: 100 },
      // 教师演示只需要一个示例方向；练习不以它作为标准答案
      dir: { x: 0, y: -1 },
      forcePx: 78,
      point2: { x: 390, y: 275 },
      dir2: { x: 0, y: 1 },
      forcePx2: 55,
      cue: 'hammer',
      pointLabel: '手',
      point2Label: '钉',
    },
    {
      id: 'same_side',
      name: '提起鱼',
      tip: '真实鱼竿 · 开放施力方向',
      practiceType: 'freeSector',
      pivotGiven: true,
      sector: { minDeg: -180, maxDeg: -90, label: '水平向人方向 → 竖直向上' },
      howO: '支点 O 已直接标在鱼竿末端黄色握把的后手位置；动力作用点也已直接标在前手握持位置。',
      stem:
        '提起鱼：后手稳定竿尾，前手使鱼竿向人的方向靠近并抬起；鱼线在竿尖处给鱼竿一个向下的阻力。\n' +
        '本题支点 O、动力作用点和阻力作用点都已给出。请：① 从前手动力点拖出 F₁；② 施力方向可在“水平朝向人”到“竖直向上”的 90° 范围内自由选择；③ 按自己的 F₁ 画 l₁。',
      known:
        '开放题没有唯一动力方向。越接近沿“支点—前手”连线朝人拉，动力臂越小；越接近与该连线垂直，动力臂越大、越省力。',
      O: { x: 330, y: 242 },
      bar: [{ x: 200, y: 242 }, { x: 700, y: 242 }],
      point: { x: 430, y: 242 },
      dir: { x: 0, y: -1 },
      forcePx: 78,
      point2: { x: 700, y: 242 },
      dir2: { x: 0, y: 1 },
      forcePx2: 55,
      cue: 'fishing_real',
      pointLabel: '前手',
      point2Label: '鱼',
    },
  ];

  let state = {
    sceneIdx: 0,
    mode: 'demo',
    step: 5,
    showWrong: false,
    O: null,
    point: null,
    dir: null,
    dragging: null,
    practice: null,
  };

  function scene() {
    return SCENES[state.sceneIdx];
  }

  function freshPractice(sc) {
    const given = sc.practiceType === 'given';
    const pivotGiven = !!sc.pivotGiven;
    return {
      phase: given ? 'arm1' : (pivotGiven ? 'dir1' : 'pivot'),
      clickedO: (given || pivotGiven) ? { ...sc.O } : null,
      f1: {
        dir: given ? K.norm(sc.dir) : null,
        armEnd: null,
        point: sc.pointRange ? null : { ...sc.point },
      },
      correctionForce: false,
      correctionArm: false,
      showSector: false,
      lastForceAngle: null,
      lastArmError: null,
    };
  }

  function syncFromScene() {
    const sc = scene();
    state.O = { ...sc.O };
    state.point = { ...sc.point };
    state.dir = K.norm(sc.dir);
    state.step = state.mode === 'demo' ? 5 : 0;
    state.practice = freshPractice(sc);
  }

  function svg() {
    return document.getElementById('armSvg');
  }

  function layers() {
    const root = svg();
    return {
      root,
      bar: root.querySelector('#armBar'),
      draw: root.querySelector('#armDraw'),
      ui: root.querySelector('#armUi'),
    };
  }

  function addImage(g, href, x, y, w, h, attrs) {
    const img = S.el('image', Object.assign({
      x, y, width: w, height: h,
      preserveAspectRatio: 'none',
      'pointer-events': 'none',
    }, attrs || {}), g);
    img.setAttribute('href', href);
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href);
    return img;
  }

  function drawFishingReal(g, sc) {
    // 真实鱼竿抠图。这里只保留鱼竿、鱼线和鱼，不再增加人体轮廓或握持范围框。
    const x = 190;
    const y = 194;
    const w = 510;
    const h = w * (230 / 1200);
    addImage(g, 'assets/life/rod.png', x, y, w, h);

    // 支点直接给出：后手握住竿尾黄色握把的位置。
    S.drawPivot(g, sc.O);
    S.el('text', {
      x: sc.O.x, y: sc.O.y - 28,
      fill: '#0f766e', 'font-size': 12, 'font-weight': 800,
      'text-anchor': 'middle',
      stroke: 'rgba(255,255,255,0.95)', 'stroke-width': 3, 'paint-order': 'stroke',
    }, g).textContent = '后手 / 支点 O';

    // 动力作用点直接给出：前手握持位置。
    drawLabeledPoint(g, sc.point, C.F1);
    S.el('text', {
      x: sc.point.x, y: sc.point.y - 25,
      fill: C.F1, 'font-size': 12, 'font-weight': 800,
      'text-anchor': 'middle',
      stroke: 'rgba(255,255,255,0.95)', 'stroke-width': 3, 'paint-order': 'stroke',
    }, g).textContent = '前手 / 动力点';

    // 阻力作用点就是鱼线与鱼竿连接的竿尖末端。
    drawLabeledPoint(g, sc.point2, C.F2);
    S.el('text', {
      x: sc.point2.x - 6, y: sc.point2.y - 22,
      fill: C.F2, 'font-size': 12, 'font-weight': 800,
      'text-anchor': 'end',
      stroke: 'rgba(255,255,255,0.95)', 'stroke-width': 3, 'paint-order': 'stroke',
    }, g).textContent = '竿尖 / 阻力点';

    // 鱼线从竿尖垂下，鱼线对鱼竿的作用点仍在竿尖。
    S.el('line', {
      x1: sc.point2.x, y1: sc.point2.y + 3,
      x2: sc.point2.x, y2: 342,
      stroke: '#64748b', 'stroke-width': 1.5,
    }, g);
    addImage(g, 'assets/life/fish.png', sc.point2.x - 43, 330, 86, 38);
  }

  /** 图上线索：刀口 / 钩码 / 手 / 羊角锤 / 真实鱼竿 */
  function drawCues(g, sc, O) {
    const cue = sc.cue;
    const labStand = cue === 'hooks_both' || cue === 'hooks_tilt' || cue === 'hand_and_hook';
    if (labStand) S.drawFulcrumStand(g, O);

    if (cue === 'hooks_both' || cue === 'hooks_tilt') {
      if (sc.point2) S.drawHookWeight(g, sc.point2, C.F2);
      S.drawHookWeight(g, sc.point, C.F1);
    }
    if (cue === 'hand_and_hook') {
      if (sc.point2) S.drawHookWeight(g, sc.point2, C.F2);
      const p = sc.point;
      S.el('ellipse', {
        cx: p.x, cy: p.y - 14, rx: 15, ry: 10,
        fill: '#fed7aa', opacity: 0.95, stroke: '#9a3412', 'stroke-width': 1.5,
      }, g);
    }
    if (cue === 'hammer') {
      S.drawClawHammer(g, {
        O,
        grip: sc.point,
        nail: sc.point2 || { x: 390, y: 275 },
      });
    }
    if (cue === 'fishing_real') drawFishingReal(g, sc);
  }

  function drawLabeledPoint(g, p, color) {
    S.el('circle', {
      cx: p.x, cy: p.y, r: 6.5,
      fill: '#fff', stroke: color, 'stroke-width': 2.25,
    }, g);
    S.el('circle', { cx: p.x, cy: p.y, r: 2.5, fill: color }, g);
  }

  function drawPivotFindHint(g, sc) {
    const short =
      sc.cue === 'hammer'
        ? '请点锤头外弧与木板上沿的接触处。'
        : sc.cue === 'fishing_real'
          ? '请点竿尾与腰/后手稳定处的接触位置。'
          : '请点刀口支架顶住杠杆的接触处。';
    S.el('text', {
      x: 400, y: 388,
      fill: '#9a3412', 'font-size': 13, 'font-weight': 700,
      'text-anchor': 'middle',
      'font-family': 'Noto Sans SC, system-ui, sans-serif',
    }, g).textContent = '① 找支点：' + short;
  }

  function forceAngleDeg(dir) {
    let d = Math.atan2(dir.y, dir.x) * 180 / Math.PI;
    while (d < -180) d += 360;
    while (d >= 180) d -= 360;
    return d;
  }

  function angularErrorDeg(a, b) {
    const na = K.norm(a);
    const nb = K.norm(b);
    const dot = Math.max(-1, Math.min(1, K.dot(na, nb)));
    return Math.acos(dot) * 180 / Math.PI;
  }

  function snapFixedDirection(dir, truth) {
    return angularErrorDeg(dir, truth) <= FORCE_TOL_DEG ? K.norm(truth) : null;
  }

  function angleForSector(dir, sc) {
    let a = forceAngleDeg(dir);
    if (!sc.sector) return a;
    const mid = (sc.sector.minDeg + sc.sector.maxDeg) / 2;
    while (a - mid > 180) a -= 360;
    while (a - mid < -180) a += 360;
    return a;
  }

  function inOpenSector(dir, sc) {
    if (!sc.sector) return true;
    const a = angleForSector(dir, sc);
    return a >= sc.sector.minDeg - FORCE_TOL_DEG &&
      a <= sc.sector.maxDeg + FORCE_TOL_DEG;
  }

  function snapOpenBoundary(dir, sc) {
    if (!sc.sector) return K.norm(dir);
    let a = angleForSector(dir, sc);
    if (Math.abs(a - sc.sector.minDeg) <= FORCE_TOL_DEG) a = sc.sector.minDeg;
    if (Math.abs(a - sc.sector.maxDeg) <= FORCE_TOL_DEG) a = sc.sector.maxDeg;
    const r = a * Math.PI / 180;
    return K.v(Math.cos(r), Math.sin(r));
  }

  function drawAllowedSector(g, sc, point) {
    if (!sc.sector) return;
    const p = point || sc.point;
    const r = 94;
    const a0 = sc.sector.minDeg * Math.PI / 180;
    const a1 = sc.sector.maxDeg * Math.PI / 180;
    const x0 = p.x + r * Math.cos(a0);
    const y0 = p.y + r * Math.sin(a0);
    const x1 = p.x + r * Math.cos(a1);
    const y1 = p.y + r * Math.sin(a1);
    S.el('path', {
      d: 'M' + p.x + ',' + p.y + ' L' + x0 + ',' + y0 + ' A' + r + ',' + r + ' 0 0 1 ' + x1 + ',' + y1 + ' Z',
      fill: 'rgba(220,38,38,0.10)', stroke: 'rgba(220,38,38,0.55)',
      'stroke-width': 1.5, 'stroke-dasharray': '5 4',
    }, g);
    const am = (a0 + a1) / 2;
    S.el('text', {
      x: p.x + r * 0.68 * Math.cos(am),
      y: p.y + r * 0.68 * Math.sin(am),
      fill: '#b91c1c', 'font-size': 11, 'font-weight': 700,
      'text-anchor': 'middle',
    }, g).textContent = '允许施力范围';
  }

  function drawForceAndLine(g, sc, O, dir, label, point) {
    if (!dir) return;
    const p = point || sc.point;
    S.drawForceArrow(g, p, dir, sc.forcePx || 72, C.F1, label || 'F₁', { O });
    S.drawForceLine(g, p, dir, 260, C.F1);
  }

  function practicePoint(sc, pr) {
    return (pr && pr.f1 && pr.f1.point) || sc.point;
  }

  function nearestPointOnSegment(p, a, b) {
    const ab = K.sub(b, a);
    const den = K.dot(ab, ab) || 1;
    const t = Math.max(0, Math.min(1, K.dot(K.sub(p, a), ab) / den));
    return K.add(a, K.scale(ab, t));
  }

  function drawCorrectionForce(g, sc) {
    const wrap = S.el('g', { opacity: 0.72 }, g);
    S.drawForceArrow(wrap, sc.point, sc.dir, sc.forcePx || 72, C.F1, '正确方向', { O: sc.O });
    S.drawForceLine(wrap, sc.point, sc.dir, 250, C.F1);
  }

  function drawCorrectionArm(g, sc, O, dir, point) {
    const p = point || sc.point;
    const truth = K.forceArm(O, p, dir);
    const wrap = S.el('g', { opacity: 0.72 }, g);
    S.drawArm(wrap, O, truth.foot, '正确 l₁', false, C.arm1, dir);
    if (truth.armLen > 5) S.drawRightAngle(wrap, truth.foot, truth.armVec, truth.dir, 9, C.arm1);
  }

  function judgeArm(O, point, dir, end) {
    const truth = K.forceArm(O, point, dir);
    if (truth.armLen < 4) {
      return {
        ok: false,
        code: 'zero',
        truth,
        message: '这个施力方向使动力臂几乎为 0。方向本身可以存在，但此时很难靠它产生转动；可换一个方向再探究。',
      };
    }
    const sv = K.sub(end, O);
    if (K.len(sv) < 10) {
      return { ok: false, code: 'short', truth, message: '请从 O 拖到力的作用线上。' };
    }
    const dot = Math.max(-1, Math.min(1, K.dot(K.norm(sv), K.norm(truth.armVec))));
    const ang = Math.acos(dot) * 180 / Math.PI;
    const tip = K.dist(end, truth.foot);
    if (ang <= ARM_TOL_DEG && tip <= ARM_TIP_TOL) {
      return { ok: true, code: 'ok', truth, message: '正确。已自动吸附到规范垂足。' };
    }
    if (ang <= ARM_TOL_DEG) {
      return {
        ok: false, code: 'tip', truth,
        message: '垂直方向基本正确，但终点没有落在作用线的垂足附近。已显示对应的正确力臂。',
      };
    }
    return {
      ok: false, code: 'angle', truth,
      message: '力臂方向偏差较大。力臂必须是支点 O 到力的作用线的垂直距离。已显示对应答案。',
    };
  }

  function renderDemo(L, sc) {
    if (sc.point2 && state.step >= 2) {
      S.drawForceArmConstruction(L.ui, L.root, {
        O: state.O, point: sc.point2, dir: sc.dir2, forcePx: sc.forcePx2,
        which: 'F2', labelF: 'F₂', labelL: 'l₂', step: Math.min(state.step, 5),
      });
    }
    S.drawForceArmConstruction(L.draw, L.root, {
      O: state.O, point: state.point, dir: state.dir, forcePx: sc.forcePx,
      which: 'F1', labelF: 'F₁', labelL: 'l₁', step: state.step,
      showWrongToPoint: state.showWrong,
    });

    if (state.step >= 1) drawDemoHandle(L.ui, state.O);
    if (state.step >= 2) {
      drawDemoHandle(L.ui, state.point);
      const tip = K.add(state.point, K.scale(state.dir, sc.forcePx));
      drawDemoHandle(L.ui, tip);
    }
  }

  function renderPractice(L, sc) {
    const pr = state.practice;
    const O = pr.clickedO || sc.O;
    const p1 = practicePoint(sc, pr);

    // 支点已给的情境（鱼竿）直接显示 O；前手作用点允许在给定握把区域选择。
    if (p1) drawLabeledPoint(L.draw, p1, C.F1);
    if (sc.point2) drawLabeledPoint(L.draw, sc.point2, C.F2);

    if (pr.phase === 'pivot' && !pr.clickedO) drawPivotFindHint(L.ui, sc);
    if (pr.clickedO) S.drawPivot(L.draw, pr.clickedO);

    // 题目给定的阻力，仅作为情境条件；本工作台这一轮只要求动力侧作图。
    if (sc.point2) {
      S.drawForceArrow(L.ui, sc.point2, sc.dir2, sc.forcePx2 || 55, C.F2, 'F₂', { O: sc.O });
    }

    if (sc.practiceType === 'given') {
      drawForceAndLine(L.draw, sc, O, sc.dir, '已知 F₁', p1);
    } else if (pr.f1.dir && p1) {
      drawForceAndLine(L.draw, sc, O, pr.f1.dir, 'F₁', p1);
    }

    if (sc.practiceType === 'freeSector' && pr.showSector) drawAllowedSector(L.ui, sc, p1);
    if (pr.correctionForce && sc.practiceType === 'fixed') drawCorrectionForce(L.ui, sc);

    if (pr.phase === 'arm1' && pr.f1.armEnd && pr.clickedO) {
      S.el('line', {
        x1: pr.clickedO.x, y1: pr.clickedO.y,
        x2: pr.f1.armEnd.x, y2: pr.f1.armEnd.y,
        stroke: C.arm1, 'stroke-width': 2.5, 'stroke-linecap': 'round',
      }, L.draw);
    }

    if (pr.correctionArm && pr.f1.dir && pr.clickedO && p1) {
      drawCorrectionArm(L.ui, sc, pr.clickedO, pr.f1.dir, p1);
    }

    if (pr.phase === 'done' && pr.f1.armEnd && pr.clickedO && pr.f1.dir) {
      // 完成后只保留“学生自己的、已规范化”的作图；不再叠加标准答案。
      const t = K.forceArm(pr.clickedO, p1, pr.f1.dir);
      S.drawArm(L.draw, pr.clickedO, t.foot, 'l₁', false, C.arm1, pr.f1.dir);
      if (t.armLen > 5) S.drawRightAngle(L.draw, t.foot, t.armVec, t.dir, 9, C.arm1);
    }
  }

  function drawDemoHandle(g, p) {
    S.el('circle', {
      cx: p.x, cy: p.y, r: 11,
      fill: 'rgba(15,118,110,0.15)', stroke: '#0f766e', 'stroke-width': 2,
      style: 'cursor:grab',
    }, g);
  }

  function practicePhaseLabel() {
    const sc = scene();
    const p = state.practice.phase;
    if (sc.practiceType === 'given') {
      if (p === 'arm1') return '① 已知 F₁：画动力臂 l₁';
      return '② 完成';
    }
    if (p === 'pivot') return '① 点出支点 O';
    if (sc.pivotGiven) {
      if (p === 'dir1') return '① 从前手动力点画 F₁';
      if (p === 'arm1') return '② 按当前 F₁ 画动力臂 l₁';
      return '③ 完成';
    }
    if (p === 'dir1') return sc.practiceType === 'freeSector' ? '② 自定动力方向 F₁' : '② 画动力 F₁';
    if (p === 'arm1') return '③ 按当前 F₁ 画动力臂 l₁';
    return '④ 完成';
  }

  function updateSide() {
    const sc = scene();
    const pr = state.practice;
    const title = document.getElementById('armTaskTitle');
    const stepEl = document.getElementById('armTaskStep');
    const body = document.getElementById('armTaskBody');
    const known = document.getElementById('armTaskKnown');
    const read = document.getElementById('armReadout');
    const readHead = document.getElementById('armReadoutHeading');
    const stepLab = document.getElementById('armStepLabel');

    if (state.mode === 'demo') {
      if (title) title.textContent = '教师演示 · 看规范作图';
      if (stepEl) {
        const names = ['', '① 标支点 O', '② 画出力 F', '③ 虚线作用线', '④ 垂线与直角', '⑤ 标出力臂 l'];
        stepEl.textContent = names[state.step] || '⑤ 标出力臂 l';
      }
      if (body) body.textContent = sc.stem + '\n\n教师演示中可以拖动支点、作用点或力箭头末端。';
      if (known) known.textContent = sc.known;
      if (readHead) {
        readHead.hidden = false;
        readHead.textContent = '演示读数';
      }
      if (read) {
        const truth = K.forceArm(state.O, state.point, state.dir);
        read.hidden = false;
        read.innerHTML = '动力臂 l₁ ≈ ' + (truth.armLen / 4).toFixed(1) + ' cm（示意）';
      }
    } else {
      if (title) {
        title.textContent = sc.practiceType === 'given'
          ? '学生练习 · 已知力，只画力臂'
          : sc.practiceType === 'freeSector'
            ? '学生练习 · 自定施力方向'
            : '学生练习 · 容错作图';
      }
      if (stepEl) stepEl.textContent = practicePhaseLabel();
      if (body) {
        body.textContent = (sc.pivotGiven ? '【支点已给出】' : '【怎样找支点】') +
          sc.howO + '\n\n' + sc.stem;
      }
      if (known) known.textContent = sc.known;

      if (sc.practiceType === 'freeSector' && pr.f1.dir && practicePoint(sc, pr)) {
        const O = pr.clickedO || sc.O;
        const P = practicePoint(sc, pr);
        const arm = K.forceArm(O, P, pr.f1.dir).armLen;
        const r = K.dist(O, P);
        const factor = arm < 2 ? Infinity : r / arm;
        const eff = r > 0 ? Math.min(100, 100 * arm / r) : 0;
        const a = Math.abs(forceAngleDeg(pr.f1.dir));
        if (readHead) {
          readHead.hidden = false;
          readHead.textContent = '开放探究读数';
        }
        if (read) {
          read.hidden = false;
          read.innerHTML =
            '当前施力角：约 ' + a.toFixed(0) + '°（相对地面）<br>' +
            '当前动力臂：' + (arm / 4).toFixed(1) + ' cm（示意）<br>' +
            '最大可能动力臂：' + (r / 4).toFixed(1) + ' cm（示意）<br>' +
            '动力臂利用率：' + eff.toFixed(0) + '%<br>' +
            (isFinite(factor)
              ? '<b>同样任务所需动力约为“最省力方向”的 ' + factor.toFixed(2) + ' 倍</b>'
              : '<b style="color:#b45309">动力臂接近 0：方向允许，但几乎不能产生转动效果</b>');
        }
      } else {
        if (readHead) readHead.hidden = true;
        if (read) read.hidden = true;
      }
    }

    if (stepLab) {
      stepLab.textContent = state.mode === 'demo'
        ? ['', '① O', '② F', '③ 作用线', '④ 垂线', '⑤ 力臂'][state.step]
        : practicePhaseLabel();
    }
  }

  function render() {
    const L = layers();
    if (!L.root) return;
    S.ensureDefs(L.root);
    S.clear(L.bar);
    S.clear(L.draw);
    S.clear(L.ui);

    const sc = scene();
    const cueO = state.mode === 'practice' ? sc.O : state.O;
    drawCues(L.bar, sc, cueO);

    if (sc.cue !== 'hammer' && sc.cue !== 'fishing_real') {
      S.drawBar(L.bar, sc.bar);
    }

    // 角色标签是语境，不是答案。真实鱼竿有自己的标注，避免重复。
    if (sc.cue !== 'fishing_real') {
      if (sc.point2) S.drawRoleTag(L.bar, sc.point2, sc.point2Label || '阻', C.F2, cueO);
      S.drawRoleTag(L.bar, sc.point, sc.pointLabel || '动', C.F1, cueO);
    }

    if (state.mode === 'demo') renderDemo(L, sc);
    else renderPractice(L, sc);

    updateSide();
  }

  function setJudge(msg, ok) {
    const el = document.getElementById('armJudge');
    if (!el) return;
    el.textContent = msg || '';
    el.className = 'judge-msg' + (ok === true ? ' ok' : ok === false ? ' bad' : '');
  }

  function svgPoint(evt) {
    const s = svg();
    const pt = s.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const ctm = s.getScreenCTM().inverse();
    const p = pt.matrixTransform(ctm);
    return K.v(p.x, p.y);
  }

  function hitDemoHandle(p) {
    const sc = scene();
    const tip = K.add(state.point, K.scale(state.dir, sc.forcePx));
    if (K.dist(p, state.O) < 16) return 'O';
    if (K.dist(p, state.point) < 16) return 'P';
    if (K.dist(p, tip) < 18) return 'D';
    return null;
  }

  function onDown(evt) {
    const p = svgPoint(evt);
    const sc = scene();

    if (state.mode === 'demo') {
      const h = hitDemoHandle(p);
      if (h) {
        state.dragging = h === 'D' ? 'dir' : h === 'P' ? 'point' : 'O';
        evt.preventDefault();
      }
      return;
    }

    const pr = state.practice;
    pr.correctionForce = false;
    pr.correctionArm = false;

    if (pr.phase === 'pivot') {
      pr.clickedO = p;
      const d = K.dist(p, sc.O);
      if (d <= 32) {
        // 点对后吸附到真正的支点，避免后续因为鼠标误差把力臂几何整体带偏。
        pr.clickedO = { ...sc.O };
        pr.phase = 'dir1';
        setJudge(
          sc.practiceType === 'freeSector'
            ? '支点正确。现在从动力作用点自由选择一个合理施力方向。'
            : '支点正确。现在从动力作用点拖出力的方向。',
          true
        );
      } else {
        setJudge('支点偏差较大。请根据装置约束位置重新判断。', false);
      }
      render();
      return;
    }

    if (pr.phase === 'dir1') {
      let fp = sc.point;
      if (sc.pointRange) {
        const nearest = nearestPointOnSegment(p, sc.pointRange.a, sc.pointRange.b);
        if (K.dist(p, nearest) > (sc.pointRange.tol || 30)) {
          setJudge('请从鱼竿前方黄色握把区域按下，再向人的方向/向上拖出 F₁。', false);
          return;
        }
        pr.f1.point = nearest;
        fp = nearest;
      } else if (K.dist(p, sc.point) > 42) {
        setJudge(sc.cue === 'fishing_real'
          ? '请从已经标出的“前手 / 动力点”按下，再向人的方向或向上拖出 F₁。'
          : '请从红色动力作用点按下，再拖出力的方向。', false);
        return;
      }
      state.dragging = 'practiceDir1';
      pr.f1.dir = null;
      if (sc.practiceType === 'freeSector') pr.showSector = false;
      render();
      return;
    }

    if (pr.phase === 'arm1' && pr.clickedO && pr.f1.dir) {
      if (K.dist(p, pr.clickedO) > 38) {
        setJudge('力臂应从支点 O 开始。请按住 O，再拖到力的作用线。', false);
        return;
      }
      state.dragging = 'practiceArm1';
      pr.f1.armEnd = p;
      render();
    }
  }

  function onMove(evt) {
    if (!state.dragging) return;
    const p = svgPoint(evt);
    const sc = scene();

    if (state.dragging === 'O') state.O = p;
    else if (state.dragging === 'point') state.point = p;
    else if (state.dragging === 'dir') state.dir = K.norm(K.sub(p, state.point));
    else if (state.dragging === 'practiceDir1') {
      const fp = practicePoint(sc, state.practice);
      const dv = K.sub(p, fp);
      if (K.len(dv) > 6) state.practice.f1.dir = K.norm(dv);
    } else if (state.dragging === 'practiceArm1') {
      state.practice.f1.armEnd = p;
    }
    render();
  }

  function onUp() {
    if (!state.dragging) return;
    const sc = scene();
    const pr = state.practice;

    if (state.dragging === 'practiceDir1' && pr.f1.dir) {
      if (K.len(pr.f1.dir) < 0.5) {
        setJudge('请从作用点明显拖出一个方向后再松手。', false);
        state.dragging = null;
        render();
        return;
      }
      if (sc.practiceType === 'fixed') {
        const err = angularErrorDeg(pr.f1.dir, sc.dir);
        const snapped = snapFixedDirection(pr.f1.dir, sc.dir);
        pr.lastForceAngle = err;
        if (snapped) {
          pr.f1.dir = snapped;
          pr.phase = 'arm1';
          pr.correctionForce = false;
          setJudge('方向正确（误差 ' + err.toFixed(1) + '°）。已自动吸附为规范方向；继续画 l₁。', true);
        } else {
          pr.correctionForce = true;
          setJudge('方向偏差 ' + err.toFixed(1) + '°，超过 ±' + FORCE_TOL_DEG + '° 容差。已显示正确方向，请重画。', false);
        }
      } else if (sc.practiceType === 'freeSector') {
        if (inOpenSector(pr.f1.dir, sc)) {
          pr.f1.dir = snapOpenBoundary(pr.f1.dir, sc);
          pr.phase = 'arm1';
          pr.showSector = false;
          const arm = K.forceArm(pr.clickedO || sc.O, practicePoint(sc, pr), pr.f1.dir).armLen;
          if (arm < 4) {
            pr.phase = 'done';
            pr.f1.armEnd = { ...(pr.clickedO || sc.O) };
            setJudge('这个方向在允许范围内，所以不判错；此时力的作用线几乎通过 O，动力臂 l₁≈0。无需再画长度线，可重置后换方向比较。', true);
          } else {
            setJudge('这个施力方向物理上合理。程序保留你的选择，不替换成“标准 F₁”；请按它画 l₁。', true);
          }
        } else {
          pr.showSector = true;
          setJudge('这个方向超出本情境可操作范围。开放题没有唯一标准箭头；图中只提示允许的 90° 施力区域，请重新选择。', false);
        }
      }
      render();
    }

    if (state.dragging === 'practiceArm1' && pr.f1.armEnd && pr.clickedO && pr.f1.dir) {
      const r = judgeArm(pr.clickedO, practicePoint(sc, pr), pr.f1.dir, pr.f1.armEnd);
      if (r.ok) {
        // 自动吸附到精确垂足。最终看到的是自己的作图意图被规范化，而不是再叠一份标准答案。
        pr.f1.armEnd = { ...r.truth.foot };
        pr.phase = 'done';
        pr.correctionArm = false;
        setJudge(
          sc.practiceType === 'freeSector'
            ? '正确。力臂已按你自己选择的 F₁ 自动规范化。可重置后换一个施力方向，比较省力程度。'
            : '正确。已按你的作图意图自动吸附到规范垂足，不再额外叠加标准答案。',
          true
        );
      } else {
        pr.lastArmError = r.code;
        pr.correctionArm = true;
        setJudge(r.message, false);
      }
      render();
    }

    state.dragging = null;
  }

  function bind() {
    const s = svg();
    s.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    document.getElementById('armSceneChips').innerHTML = SCENES.map((sc, i) => {
      return '<button type="button" class="chip' + (i === 0 ? ' active' : '') + '" data-i="' + i + '">' + (i + 1) + '. ' + sc.name + '</button>';
    }).join('');

    document.getElementById('armSceneChips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      state.sceneIdx = +b.dataset.i;
      document.querySelectorAll('#armSceneChips .chip').forEach((c) => c.classList.remove('active'));
      b.classList.add('active');
      syncFromScene();
      setJudge(
        state.mode === 'practice'
          ? '已换题。请先读右侧任务卡；不同题型的作答步骤会自动变化。'
          : '已换情景。教师演示仍可逐步显示规范作图。',
        null
      );
      render();
    });

    document.getElementById('armModeDemo').onclick = () => {
      state.mode = 'demo';
      syncFromScene();
      state.step = 5;
      setJudge('教师演示：逐步观察支点、力、作用线和力臂。', null);
      document.getElementById('armModeDemo').classList.add('active-toggle');
      document.getElementById('armModePractice').classList.remove('active-toggle');
      render();
    };

    document.getElementById('armModePractice').onclick = () => {
      state.mode = 'practice';
      syncFromScene();
      const sc = scene();
      setJudge(
        sc.practiceType === 'given'
          ? '本题的力已经给出。请直接从 O 画对应的动力臂。'
          : sc.practiceType === 'freeSector'
            ? (sc.pivotGiven
              ? '支点 O 和前手动力作用点都已直接给出。请从前手动力点把 F₁ 朝人的方向到竖直向上的 90° 范围内拖出。'
              : '这是开放施力题：先找 O，再自己选择合理的 F₁，程序不会用唯一标准方向替换你的判断。')
            : '请按题意作图。方向误差在 ±' + FORCE_TOL_DEG + '° 内会自动吸附为规范方向。',
        null
      );
      document.getElementById('armModePractice').classList.add('active-toggle');
      document.getElementById('armModeDemo').classList.remove('active-toggle');
      render();
    };

    document.getElementById('armStepPrev').onclick = () => {
      if (state.mode !== 'demo') return;
      state.step = Math.max(1, state.step - 1);
      render();
    };
    document.getElementById('armStepNext').onclick = () => {
      if (state.mode !== 'demo') return;
      state.step = Math.min(5, state.step + 1);
      render();
    };
    document.getElementById('armStepAll').onclick = () => {
      if (state.mode !== 'demo') return;
      state.step = 5;
      render();
    };
    document.getElementById('armToggleWrong').onclick = (e) => {
      state.showWrong = !state.showWrong;
      e.target.classList.toggle('active-toggle', state.showWrong);
      render();
    };
    document.getElementById('armResetPractice').onclick = () => {
      syncFromScene();
      setJudge(
        state.mode === 'practice'
          ? '已重置当前题。你的上一轮方向和力臂已清除，可以重新探究。'
          : '已重置。',
        null
      );
      render();
    };
  }

  function init() {
    syncFromScene();
    bind();
    render();
  }

  global.ArmLab = { init, render };
})(typeof window !== 'undefined' ? window : globalThis);
