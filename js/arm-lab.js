/**
 * 画力臂工作台：六档情景题干 + 教师演示 / 学生练习 + 图上线索
 */
(function (global) {
  'use strict';

  const K = global.LeverKernel;
  const S = global.LeverSVG;
  const C = K.COLORS;

  const SCENES = [
    {
      id: 'horiz_vert',
      name: '挂钩码',
      tip: '两侧挂码；本题练画动力臂',
      howO: '看图：杠杆架在中间刀口支架上。支点 O = 刀口与杆接触的那一点（杆中央，不是钩码）。',
      stem:
        '水平杠杆架在中间刀口上，左侧、右侧都挂钩码，重力都竖直向下。\n' +
        '左侧看作阻力 F₂，右侧看作动力 F₁。\n' +
        '本题只要求：点出支点 → 从右侧「动」钩拖出重力方向 → 画出动力臂 l₁。\n' +
        '（不必判断杠杆往哪边转；要判断转动需比较两侧力矩，见「平衡探究」。）',
      known: '红=动力及其力臂，蓝=阻力及其力臂。图上已画出两侧钩码；练习时请画红色动力这一侧。',
      O: { x: 400, y: 220 },
      bar: [{ x: 180, y: 220 }, { x: 620, y: 220 }],
      // 练习对象：右侧动力
      point: { x: 520, y: 220 },
      dir: { x: 0, y: 1 },
      forcePx: 75,
      // 左侧阻力（演示时画出；练习时只显示钩码轮廓）
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
      tip: '力臂短于杆上距离',
      howO: '看图：中间有刀口支架。支点 O = 刀口顶住杆的位置（不要点在「动」手或钩码上）。',
      stem:
        '杆仍水平。右侧挂钩码为阻力（竖直向下）；左侧用手斜向右下压，这是动力。\n' +
        '请：点出支点（刀口）；从左侧「动」点拖出斜向压力；再画动力臂。',
      known: '红=动力，蓝=阻力。本题练画红色动力臂。',
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
      tip: '垂足常在箭头外',
      howO: '看图：中间刀口支架托住杆。支点 O = 刀口与杆的接触点。',
      stem:
        '右侧有竖直向下的阻力；左侧手斜向下推（动力），箭头较短，垂足往往在延长线上。\n' +
        '请：点刀口；从「动」点拖出力的方向；画力臂时必要时先延长虚线。',
      known: '红=动力，蓝=阻力。',
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
      tip: '对照：为何要调水平',
      howO: '看图：斜杆仍架在刀口上。支点 O = 刀口与杆接触处（杆中间偏下的支架顶）。',
      stem:
        '杠杆还没调成水平，两侧仍挂钩码，重力竖直向下。\n' +
        '请：支点是刀口；本题练画右侧动力的力臂（竖直向下，不要沿杆拖）。',
      known: '红=动力，蓝=阻力。本题不要求判断转动方向。',
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
      tip: '硬棒不必是直的',
      howO: '看图：锤头抵在木板上。支点 O = 锤头外弧与木板上沿的接触处（不是钉帽，也不是柄端）。',
      stem:
        '羊角锤拔钉：锤头抵在木板上（支点），手向上扳木柄（动力），钉子卡在羊角里阻碍拔出（阻力）。\n' +
        '请：点出支点（锤头与木板接触处）；从柄端「动」点拖出扳的方向；画动力臂。',
      known: '红=动力，蓝=阻力（钉）。硬棒可以弯——力臂仍是支点到作用线的垂距。',
      O: { x: 431, y: 280 },
      bar: [{ x: 390, y: 275 }, { x: 431, y: 280 }, { x: 210, y: 100 }],
      point: { x: 210, y: 100 },
      dir: { x: -0.35, y: -1 },
      forcePx: 72,
      point2: { x: 390, y: 275 },
      dir2: { x: 0, y: 1 },
      forcePx2: 55,
      cue: 'hammer',
      pointLabel: '动',
      point2Label: '阻',
    },
    {
      id: 'same_side',
      name: '提起鱼',
      tip: '支点同侧，只画动力臂',
      howO: '看图：竿尾抵在「腰」上。支点 O = 竿尾与腰的接触处（标了「腰」的那一端，不是鱼、也不是「动」点）。',
      stem:
        '提起鱼：竿尾抵腰为支点；前手向上抬为动力；鱼在竿尖向下为阻力。两力在支点同侧。\n' +
        '请：只画动力臂——点竿尾支点；从「动」点向上拖；再画 l₁。',
      known: '红=动力，蓝=阻力。本题不要求画阻力臂。',
      O: { x: 220, y: 240 },
      bar: [{ x: 200, y: 240 }, { x: 620, y: 240 }],
      point: { x: 360, y: 240 },
      dir: { x: 0, y: -1 },
      forcePx: 70,
      point2: { x: 560, y: 240 },
      dir2: { x: 0, y: 1 },
      forcePx2: 55,
      cue: 'fishing',
      pointLabel: '动',
      point2Label: '阻',
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
    practice: {
      phase: 'pivot',
      clickedO: null,
      f1: { dir: null, armEnd: null },
      f2: { dir: null, armEnd: null },
      showTruth: false,
      lastArmCode: null,
    },
  };

  function scene() {
    return SCENES[state.sceneIdx];
  }

  function syncFromScene() {
    const sc = scene();
    state.O = { ...sc.O };
    state.point = { ...sc.point };
    state.dir = K.norm(sc.dir);
    state.step = state.mode === 'demo' ? 5 : 0;
    state.practice = {
      phase: 'pivot',
      clickedO: null,
      f1: { dir: null, armEnd: null },
      f2: { dir: null, armEnd: null },
      showTruth: false,
      lastArmCode: null,
    };
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

  /**
   * 图上线索：刀口支架 / 钩码 / 手 / 锤木板 / 腰与鱼
   * 练习阶段也保留装置图（否则无法判断支点）；但不预标字母 O
   */
  function drawCues(g, sc, O) {
    const cue = sc.cue;
    // 实验室杠杆才画刀口；钓鱼是「竿尾抵腰」，不用刀口架
    const labStand = cue === 'hooks_both' || cue === 'hooks_tilt' ||
      cue === 'hand_and_hook';
    if (labStand) S.drawFulcrumStand(g, O);

    if (cue === 'hooks_both' || cue === 'hooks_tilt') {
      if (sc.point2) S.drawHookWeight(g, sc.point2, C.F2);
      S.drawHookWeight(g, sc.point, C.F1);
    }
    if (cue === 'hand_and_hook') {
      if (sc.point2) S.drawHookWeight(g, sc.point2, C.F2);
      const p = sc.point;
      S.el('ellipse', {
        cx: p.x, cy: p.y - 14, rx: 14, ry: 10,
        fill: '#fecaca', opacity: 0.95, stroke: C.F1, 'stroke-width': 1.5,
      }, g);
    }
    if (cue === 'hammer') {
      S.drawClawHammer(g, {
        O: O,
        grip: sc.point,
        nail: sc.point2 || { x: 508, y: 278 },
      });
    }
    if (cue === 'fishing') {
      const tip = sc.point2 || { x: 560, y: 240 };
      const waist = sc.O;
      S.el('text', {
        x: tip.x - 6, y: tip.y + 28, 'font-size': 22, fill: C.F2,
      }, g).textContent = '鱼';
      // 腰：中性肤色，勿用动力红（会当成「动」）
      S.el('ellipse', {
        cx: waist.x - 6, cy: waist.y + 6, rx: 16, ry: 14,
        fill: '#e7e5e4', opacity: 0.95, stroke: '#78716c', 'stroke-width': 1.5,
      }, g);
      S.el('text', {
        x: waist.x - 34, y: waist.y + 30,
        fill: C.muted, 'font-size': 12, 'font-weight': 600,
      }, g).textContent = '腰';
    }
  }

  /** 练习找支点：图下短提示（完整说明在右侧任务卡；此处不预标 O） */
  function drawPivotFindHint(g, sc) {
    const short =
      sc.cue === 'hammer' ? '请点锤头外弧与木板上沿的接触处（不是钉、不是柄）。' :
      sc.cue === 'fishing' ? '请点竿尾与「腰」的接触处（不是鱼、不是「动」点）。' :
      '请点刀口支架顶住杠杆的接触处（杆中央附近，不是钩码）。';
    S.el('text', {
      x: 400, y: 388,
      fill: '#9a3412', 'font-size': 13, 'font-weight': 700,
      'text-anchor': 'middle',
      'font-family': 'Noto Sans SC, system-ui, sans-serif',
    }, g).textContent = '① 怎样找支点：' + short;
    S.el('text', {
      x: 400, y: 408,
      fill: '#a8a29e', 'font-size': 11,
      'text-anchor': 'middle',
      'font-family': 'Noto Sans SC, system-ui, sans-serif',
    }, g).textContent = '右侧任务卡有完整说明 · 点对后再拖力的方向';
  }

  /** 练习画力臂：图上脚手架——力箭头 + 作用线虚线（全情景通用） */
  function drawPracticeArmScaffold(g, sc, O, which) {
    const isF2 = which === 'F2';
    const saved = isF2 ? state.practice.f2 : state.practice.f1;
    const point = isF2 ? sc.point2 : state.point;
    const standardDir = K.norm(isF2 ? sc.dir2 : state.dir);
    const dir = saved.dir || standardDir;
    const color = isF2 ? C.F2 : C.F1;
    const active = (!isF2 && state.practice.phase === 'arm1') || (isF2 && state.practice.phase === 'arm2');
    if (!dir || !point) return;
    S.drawForceArrow(g, point, dir, (isF2 ? sc.forcePx2 : sc.forcePx) || 70, color, isF2 ? 'F₂' : 'F₁', { O: O });
    S.drawForceLine(g, point, dir, 260, color);
    S.el('text', {
      x: point.x + dir.x * 90 + 14,
      y: point.y + dir.y * 90,
      fill: color, 'font-size': 11, 'font-weight': 700,
      'font-family': 'Noto Sans SC, system-ui, sans-serif',
    }, g).textContent = '作用线';

    // 常见错画对照：沿杆连到作用点（仅当垂足不在作用点时显示）
    const truth = K.forceArm(state.O, point, standardDir);
    const footNearPoint = K.dist(truth.foot, point) < 28;
    const showWrongRod =
      active && !footNearPoint &&
      (state.practice.lastArmCode === 'along_bar' ||
        state.practice.lastArmCode === 'to_point');
    if (showWrongRod) {
      S.el('line', {
        x1: O.x, y1: O.y, x2: point.x, y2: point.y,
        stroke: C.wrong, 'stroke-width': 1.5, 'stroke-dasharray': '4 4',
      }, g);
      S.el('text', {
        x: (O.x + point.x) / 2,
        y: (O.y + point.y) / 2 - 10,
        fill: C.wrong, 'font-size': 11, 'font-weight': 700,
        'text-anchor': 'middle',
      }, g).textContent = '这不是力臂（杆上距离）';
    }

    if (active) {
      S.el('text', {
        x: 400, y: 388,
        fill: '#9a3412', 'font-size': 13, 'font-weight': 700,
        'text-anchor': 'middle',
        'font-family': 'Noto Sans SC, system-ui, sans-serif',
      }, g).textContent = footNearPoint
        ? '从 O 向' + (isF2 ? '蓝色' : '红色') + '虚线作垂线；本题垂足在作用点附近'
        : '从 O 向' + (isF2 ? '蓝色' : '红色') + '虚线作垂线，拖到交点松手';
      S.el('text', {
        x: 400, y: 408,
        fill: '#a8a29e', 'font-size': 11,
        'text-anchor': 'middle',
        'font-family': 'Noto Sans SC, system-ui, sans-serif',
      }, g).textContent = '力臂 = 支点到力的作用线的垂直距离';
    }
  }

  function drawLabeledPoint(g, p, label, color) {
    S.el('circle', {
      cx: p.x, cy: p.y, r: 6.5,
      fill: '#fff', stroke: color, 'stroke-width': 2.25,
    }, g);
    S.el('circle', {
      cx: p.x, cy: p.y, r: 2.5, fill: color,
    }, g);
  }

  function drawActionPoint(g, sc) {
    if (sc.point2) drawLabeledPoint(g, sc.point2, sc.point2Label || '阻', C.F2);
    drawLabeledPoint(g, sc.point, sc.pointLabel || '动', C.F1);
  }

  function render() {
    const L = layers();
    if (!L.root) return;
    S.ensureDefs(L.root);
    S.clear(L.bar);
    S.clear(L.draw);
    S.clear(L.ui);

    const sc = scene();
    const truth = K.forceArm(state.O, state.point, state.dir);
    const rodDist = K.dist(state.O, state.point);

    // 线索：演示用当前 O；练习用场景固定装置（含刀口/腰/木板），但不预标 O
    const cueO = state.mode === 'practice' ? sc.O : state.O;
    drawCues(L.bar, sc, cueO);
    // 羊角锤用写实外形，不再叠画抽象折线硬棒
    if (sc.cue !== 'hammer') S.drawBar(L.bar, sc.bar);

    // 「动/阻」放在作用点外侧，不写在钩码/箭杆上
    if (sc.point2) {
      S.drawRoleTag(L.bar, sc.point2, sc.point2Label || '阻', C.F2, cueO);
    }
    S.drawRoleTag(L.bar, sc.point, sc.pointLabel || '动', C.F1, cueO);

    if (state.mode === 'demo') {
      // 先画阻力（蓝），再画动力（红），红在上层
      if (sc.point2 && state.step >= 2) {
        S.drawForceArmConstruction(L.ui, L.root, {
          O: state.O,
          point: sc.point2,
          dir: sc.dir2,
          forcePx: sc.forcePx2,
          which: 'F2',
          labelF: 'F₂',
          labelL: 'l₂',
          step: Math.min(state.step, 5),
          showWrongToPoint: false,
        });
      }
      S.drawForceArmConstruction(L.draw, L.root, {
        O: state.O,
        point: state.point,
        dir: state.dir,
        forcePx: sc.forcePx,
        which: 'F1',
        labelF: 'F₁',
        labelL: 'l₁',
        step: state.step,
        showWrongToPoint: state.showWrong,
      });

      if (state.step >= 1) drawHandle(L.ui, state.O, 'O');
      if (state.step >= 2) {
        drawHandle(L.ui, state.point, 'P');
        const tip = K.add(state.point, K.scale(state.dir, sc.forcePx));
        drawHandle(L.ui, tip, 'D');
      }
    } else {
      // 练习：装置线索 + 作用点；力臂阶段画出作用线虚线脚手架
      drawActionPoint(L.draw, sc);

      if (state.practice.phase === 'pivot' && !state.practice.clickedO) {
        drawPivotFindHint(L.ui, sc);
      }

      if (state.practice.clickedO) {
        S.drawPivot(L.draw, state.practice.clickedO);
      }

      const pr = state.practice;
      const f1Reached = ['arm1', 'dir2', 'arm2', 'done'].includes(pr.phase);
      const f2Reached = ['arm2', 'done'].includes(pr.phase);
      if (f1Reached) {
        drawPracticeArmScaffold(L.draw, sc, pr.clickedO || state.O, 'F1');
      } else if (pr.f1.dir) {
        S.drawForceArrow(
          L.draw, state.point, pr.f1.dir, 70, C.F1, 'F₁？',
          { O: pr.clickedO || state.O }
        );
      }

      if (pr.f1.armEnd && pr.clickedO) {
        S.drawArm(
          L.draw, pr.clickedO, pr.f1.armEnd,
          'l₁', false, C.arm1, state.dir
        );
      }

      if (sc.point2 && pr.phase === 'dir2' && pr.f2.dir) {
        S.drawForceArrow(L.draw, sc.point2, pr.f2.dir, sc.forcePx2 || 70, C.F2, 'F₂？', { O: pr.clickedO || state.O });
      }
      if (sc.point2 && f2Reached) {
        drawPracticeArmScaffold(L.draw, sc, pr.clickedO || state.O, 'F2');
      }
      if (pr.f2.armEnd && pr.clickedO) {
        S.drawArm(L.draw, pr.clickedO, pr.f2.armEnd, 'l₂', false, C.arm2, sc.dir2);
      }

      if (state.practice.showTruth) {
        if (sc.point2) {
          S.drawForceArmConstruction(L.ui, L.root, {
            O: state.O,
            point: sc.point2,
            dir: sc.dir2,
            forcePx: sc.forcePx2,
            which: 'F2',
            labelF: 'F₂',
            labelL: 'l₂',
            step: 5,
          });
        }
        S.drawForceArmConstruction(L.ui, L.root, {
          O: state.O,
          point: state.point,
          dir: state.dir,
          forcePx: sc.forcePx,
          which: 'F1',
          labelF: 'F₁',
          labelL: 'l₁',
          step: 5,
        });
      }
    }

    updateSide(truth, rodDist);
  }

  function drawHandle(g, p) {
    S.el('circle', {
      cx: p.x, cy: p.y, r: 11,
      fill: 'rgba(15,118,110,0.15)',
      stroke: '#0f766e',
      'stroke-width': 2,
      style: 'cursor:grab',
    }, g);
  }

  function practicePhaseLabel() {
    const p = state.practice.phase;
    if (p === 'pivot') return '① 点出支点 O';
    if (p === 'dir1') return '② 画动力 F₁';
    if (p === 'arm1') return '③ 画动力臂 l₁';
    if (p === 'dir2') return '④ 画阻力 F₂';
    if (p === 'arm2') return '⑤ 画阻力臂 l₂';
    return '⑥ 完成：所有作图已保留';
  }

  function updateSide(truth, rodDist) {
    const sc = scene();
    const card = document.getElementById('armTaskCard');
    const title = document.getElementById('armTaskTitle');
    const stepEl = document.getElementById('armTaskStep');
    const body = document.getElementById('armTaskBody');
    const known = document.getElementById('armTaskKnown');
    const read = document.getElementById('armReadout');
    const readHead = document.getElementById('armReadoutHeading');
    const stepLab = document.getElementById('armStepLabel');

    if (card) card.classList.toggle('practice-mode', state.mode === 'practice');

    if (state.mode === 'demo') {
      if (title) title.textContent = '教师演示 · 看规范作图';
      if (stepEl) {
        const names = ['', '① 标支点 O', '② 画出力 F', '③ 虚线作用线', '④ 垂线与直角', '⑤ 标出力臂 l'];
        stepEl.textContent = names[state.step] || '⑤ 标出力臂 l';
      }
      if (body) {
        body.textContent =
          sc.stem +
          '\n\n操作：拖动支点、作用点或力箭头末端；或用「下一步 / 一键画完」。';
      }
      if (known) {
        known.textContent =
          '颜色约定：动力 F₁ 与力臂 l₁ 用红色，阻力 F₂ 与力臂 l₂ 用蓝色。' +
          '力臂两端是朝外箭头；力是作用点出发的单箭头。' +
          '本台练「画力臂」，不据此判断杠杆往哪边转。';
      }
      if (readHead) readHead.hidden = false;
      if (read) {
        read.hidden = false;
        const cm = (truth.armLen / 4).toFixed(1);
        const rod = (rodDist / 4).toFixed(1);
        read.innerHTML =
          `<span class="arm">力臂 l₁ ≈ ${cm} cm</span>（示意）<br>` +
          `杆上距离 ≈ ${rod} cm<br>` +
          (Math.abs(truth.armLen - rodDist) > 8
            ? `<b style="color:#b91c1c">力臂 ≠ 杆上距离</b>`
            : `<span style="color:#059669">此时力臂 ≈ 杆上水平距离</span>`);
      }
    } else {
      if (title) title.textContent = '学生练习 · 请你画';
      if (stepEl) stepEl.textContent = practicePhaseLabel();
      if (body) {
        const how = sc.howO ? ('【怎样找支点】' + sc.howO + '\n\n') : '';
        body.textContent = how + sc.stem;
      }
      if (known) {
        known.textContent =
          (state.practice.phase === 'pivot'
            ? '先根据图上的装置（刀口 / 木板 / 腰）判断支点，点在接触处；点对后再拖力的方向。\n'
            : state.practice.phase === 'arm1' || state.practice.phase === 'arm2'
              ? '画力臂通则：① 虚线是力的作用线；② 从 O 向虚线作垂线；③ 交点是垂足。\n'
              : '') + sc.known;
      }
      // 练习中不泄题；判对后显示对照读数
      const showRead = !!state.practice.showTruth;
      if (readHead) readHead.hidden = !showRead;
      if (read) {
        read.hidden = !showRead;
        if (showRead) {
          const cm = (truth.armLen / 4).toFixed(1);
          const rod = (rodDist / 4).toFixed(1);
          read.innerHTML =
            `<span class="arm">标准力臂 l₁ ≈ ${cm} cm</span><br>` +
            `杆上距离 ≈ ${rod} cm<br>` +
            (Math.abs(truth.armLen - rodDist) > 8
              ? `<b style="color:#b91c1c">力臂 ≠ 杆上距离</b>`
              : `<span style="color:#059669">此时力臂 ≈ 杆上水平距离</span>`);
        }
      }
    }

    if (stepLab) {
      stepLab.textContent =
        state.mode === 'demo'
          ? ['', '① O', '② F', '③ 作用线', '④ 垂线', '⑤ 力臂'][state.step]
          : practicePhaseLabel();
    }
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

  function hitHandle(p) {
    const sc = scene();
    const tip = K.add(state.point, K.scale(state.dir, sc.forcePx));
    if (K.dist(p, state.O) < 16) return 'O';
    if (K.dist(p, state.point) < 16) return 'P';
    if (K.dist(p, tip) < 18) return 'D';
    return null;
  }

  function onDown(evt) {
    const p = svgPoint(evt);
    if (state.mode === 'demo') {
      const h = hitHandle(p);
      if (h) {
        state.dragging = h === 'D' ? 'dir' : h === 'P' ? 'point' : 'O';
        evt.preventDefault();
      }
      return;
    }
    const pr = state.practice;
    const sc = scene();
    if (pr.phase === 'pivot') {
      pr.clickedO = p;
      const d = K.dist(p, state.O);
      if (d < 32) {
        setJudge('支点正确。下一步：从「' + (sc.pointLabel || '作用点') + '」拖出力的方向。', true);
        pr.phase = 'dir1';
      } else {
        setJudge(
          '支点不太对。读题：约束转动、几乎不移的那个点（刀口 / 锤头抵木板处 / 竿尾）。',
          false
        );
      }
      render();
      return;
    }
    if (pr.phase === 'dir1' || pr.phase === 'dir2') {
      const isF2 = pr.phase === 'dir2';
      const point = isF2 ? sc.point2 : state.point;
      // 必须从作用点附近开始拖
      if (!point || K.dist(p, point) > 40) {
        setJudge('请按住' + (isF2 ? '蓝色阻力点' : '红色动力点') + '，再拖出力的方向。', false);
        return;
      }
      state.dragging = isF2 ? 'practiceDir2' : 'practiceDir1';
      (isF2 ? pr.f2 : pr.f1).dir = K.norm(K.sub(p, point));
      render();
      return;
    }
    if ((pr.phase === 'arm1' || pr.phase === 'arm2') && pr.clickedO) {
      if (K.dist(p, pr.clickedO) > 36) {
        setJudge(
          '力臂要从支点 O 按下再拖到垂足：先按住你点出的 O，松手前拖到力的作用线（虚线方向）上。',
          false
        );
        return;
      }
      const isF2 = pr.phase === 'arm2';
      state.dragging = isF2 ? 'practiceArm2' : 'practiceArm1';
      (isF2 ? pr.f2 : pr.f1).armEnd = p;
      render();
    }
  }

  function onMove(evt) {
    if (!state.dragging) return;
    const p = svgPoint(evt);
    if (state.dragging === 'O') state.O = p;
    else if (state.dragging === 'point') state.point = p;
    else if (state.dragging === 'dir') state.dir = K.norm(K.sub(p, state.point));
    else if (state.dragging === 'practiceDir1') {
      state.practice.f1.dir = K.norm(K.sub(p, state.point));
    } else if (state.dragging === 'practiceDir2') {
      state.practice.f2.dir = K.norm(K.sub(p, scene().point2));
    } else if (state.dragging === 'practiceArm1') {
      state.practice.f1.armEnd = p;
    } else if (state.dragging === 'practiceArm2') {
      state.practice.f2.armEnd = p;
    }
    render();
  }

  function onUp() {
    if (state.dragging === 'practiceDir1' || state.dragging === 'practiceDir2') {
      const isF2 = state.dragging === 'practiceDir2';
      const saved = isF2 ? state.practice.f2 : state.practice.f1;
      const truthDir = K.norm(isF2 ? scene().dir2 : state.dir);
      if (!saved.dir) return;
      const ang = Math.acos(
        Math.min(1, Math.abs(K.dot(saved.dir, truthDir)))
      );
      if ((ang * 180) / Math.PI < 25) {
        saved.armEnd = null;
        state.practice.lastArmCode = null;
        setJudge((isF2 ? '阻力' : '动力') + '方向正确。请从 O 向作用线作垂线。', true);
        state.practice.phase = isF2 ? 'arm2' : 'arm1';
      } else {
        setJudge('方向偏差较大。再读题：力实际往哪边推 / 拉 / 压？', false);
      }
      render();
    }
    if ((state.dragging === 'practiceArm1' || state.dragging === 'practiceArm2') && state.practice.clickedO) {
      const isF2 = state.dragging === 'practiceArm2';
      const saved = isF2 ? state.practice.f2 : state.practice.f1;
      const point = isF2 ? scene().point2 : state.point;
      const dir = K.norm(isF2 ? scene().dir2 : state.dir);
      if (!saved.armEnd) return;
      const result = K.judgeArmDraw(
        state.O, point, dir, saved.armEnd
      );
      const result2 = K.judgeArmDraw(
        state.practice.clickedO, point, dir, saved.armEnd
      );
      const use = result.ok || result2.ok ? (result.ok ? result : result2) : result2;
      state.practice.lastArmCode = use.code || null;
      setJudge(use.message, use.ok);
      if (use.ok) {
        state.practice.phase = isF2 ? 'done' : (scene().point2 ? 'dir2' : 'done');
        if (!isF2 && scene().point2) {
          setJudge('动力臂正确并已保留。继续从蓝色阻力点拖出 F₂。', true);
        } else {
          state.practice.showTruth = true;
          setJudge('完成！支点、动力、阻力和两个力臂均已保留。', true);
        }
        state.practice.lastArmCode = null;
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
      return `<button type="button" class="chip${i === 0 ? ' active' : ''}" data-i="${i}">${i + 1}. ${sc.name}</button>`;
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
          ? '已换题。请先读右侧任务卡，再点支点。'
          : '已换情景。可拖图或用「下一步」分步作图。',
        null
      );
      render();
    });

    document.getElementById('armModeDemo').onclick = () => {
      state.mode = 'demo';
      state.step = 5;
      syncFromScene();
      state.step = 5;
      setJudge('教师演示：拖支点 / 作用点 / 力箭头，或逐步作图。', null);
      document.getElementById('armModeDemo').classList.add('active-toggle');
      document.getElementById('armModePractice').classList.remove('active-toggle');
      render();
    };
    document.getElementById('armModePractice').onclick = () => {
      state.mode = 'practice';
      syncFromScene();
      setJudge('请先读右侧橙色任务卡里的情景，再按①②③作答。', null);
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
      setJudge(state.mode === 'practice' ? '已重置。请重新读题、点支点。' : '已重置。', null);
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
