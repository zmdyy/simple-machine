/**
 * 杆秤观察案例：真实感矢量绘制 + 多物体称量 + 动态平衡
 * V1 只做观察，不做刻度读数；双提钮/双量程、提高精度、增大量程留作后续拓展。
 */
(function (global) {
  'use strict';

  const K = global.LeverKernel;
  const S = global.LeverSVG;
  const C = K.COLORS;

  const CFG = {
    O: K.v(235, 168),
    rodStartX: 94,
    rodEndX: 710,
    hookX: 125,
    zeroX: 235,
    poiseMassKg: 0.56,
    maxTiltDeg: 10,
    balanceToleranceDeg: 1.5,
    nearBalanceToleranceDeg: 3.0,
  };

  const OBJECTS = [
    { id: 'fish', name: '鲜鱼', massKg: 0.6, kind: 'fish' },
    { id: 'apples', name: '苹果袋', massKg: 1.1, kind: 'apples' },
    { id: 'pork', name: '猪肉', massKg: 1.6, kind: 'pork' },
    { id: 'rice', name: '米袋', massKg: 2.1, kind: 'rice' },
  ];

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function rot(p, O, deg) {
    const r = deg * Math.PI / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    const dx = p.x - O.x;
    const dy = p.y - O.y;
    return K.v(O.x + c * dx - s * dy, O.y + s * dx + c * dy);
  }

  function objectAt(index) {
    return OBJECTS[clamp(index | 0, 0, OBJECTS.length - 1)];
  }

  function targetT(index) {
    const obj = objectAt(index);
    const resistanceArm = CFG.O.x - CFG.hookX;
    const targetArm = obj.massKg * resistanceArm / CFG.poiseMassKg;
    return clamp(targetArm / (CFG.rodEndX - CFG.zeroX), 0, 1);
  }

  function beforeT(index) {
    return clamp(Math.max(0.045, targetT(index) * 0.34), 0, 1);
  }

  function model(opts) {
    opts = opts || {};
    const objectIndex = opts.objectIndex == null ? 0 : opts.objectIndex;
    const obj = objectAt(objectIndex);
    const t = clamp(opts.t == null ? beforeT(objectIndex) : opts.t, 0, 1);
    const poiseX = CFG.zeroX + t * (CFG.rodEndX - CFG.zeroX);
    const resistanceArm = CFG.O.x - CFG.hookX;
    const driveArm = poiseX - CFG.O.x;
    const mDrive = CFG.poiseMassKg * driveArm;
    const mResist = obj.massKg * resistanceArm;
    const denom = Math.max(mDrive, mResist, 1e-6);
    const imbalance = (mDrive - mResist) / denom;
    const angleDeg = clamp(imbalance * 14, -CFG.maxTiltDeg, CFG.maxTiltDeg);

    const O = K.v(CFG.O.x, CFG.O.y);
    const p1 = rot(K.v(poiseX, CFG.O.y), O, angleDeg);
    const p2 = rot(K.v(CFG.hookX, CFG.O.y), O, angleDeg);
    const left = rot(K.v(CFG.rodStartX, CFG.O.y), O, angleDeg);
    const right = rot(K.v(CFG.rodEndX, CFG.O.y), O, angleDeg);
    const d = K.v(0, 1);
    const a1 = K.forceArm(O, p1, d);
    const a2 = K.forceArm(O, p2, d);

    return {
      objectIndex,
      object: obj,
      t,
      targetT: targetT(objectIndex),
      beforeT: beforeT(objectIndex),
      angleDeg,
      balanced: Math.abs(angleDeg) <= CFG.balanceToleranceDeg,
      nearBalanced:
        Math.abs(angleDeg) > CFG.balanceToleranceDeg &&
        Math.abs(angleDeg) <= CFG.nearBalanceToleranceDeg,
      O,
      p1,
      p2,
      bar: [left, O, right],
      d1: d,
      d2: d,
      f1: CFG.poiseMassKg * 9.8,
      f2: obj.massKg * 9.8,
      a1,
      a2,
      poiseX,
      resistanceArm,
      driveArm,
      lever: {
        O,
        p1,
        d1: d,
        p2,
        d2: d,
        bar: [left, O, right],
        f2: obj.massKg * 9.8,
        caption: '杆秤：提钮是支点，秤砣和被称物体的重力方向都竖直向下。',
      },
    };
  }

  function tFromPoint(p, angleDeg) {
    const q = rot(p, CFG.O, -(angleDeg || 0));
    return clamp((q.x - CFG.zeroX) / (CFG.rodEndX - CFG.zeroX), 0, 1);
  }

  function status(m) {
    if (m.balanced) return '杆秤达到平衡。';
    if (m.nearBalanced) return '接近平衡，再微调秤砣位置。';
    return m.angleDeg < 0
      ? '物体侧下沉：请将秤砣向外移动。'
      : '秤砣侧下沉：请将秤砣向内移动。';
  }

  function statusColor(m) {
    if (m.balanced) return '#16a34a';
    if (m.nearBalanced) return '#d97706';
    return '#b45309';
  }

  function drawLevelGauge(g, m) {
    const cx = 650;
    const cy = 92;

    // 教学放大：杆秤实际变化 1°，水平仪中按 6° 显示。
    // 只保留两根线：固定水平基准线 + 杆秤姿态线。
    const displayDeg = clamp(m.angleDeg * 6, -36, 36);
    const rad = displayDeg * Math.PI / 180;

    const refHalf = 105;
    S.el('line', {
      x1: cx - refHalf, y1: cy,
      x2: cx + refHalf, y2: cy,
      stroke: '#16a34a', 'stroke-width': 5,
      'stroke-linecap': 'round',
      opacity: 0.92,
    }, g);

    const rodHalf = 82;
    const dx = Math.cos(rad) * rodHalf;
    const dy = Math.sin(rad) * rodHalf;
    S.el('line', {
      x1: cx - dx, y1: cy - dy,
      x2: cx + dx, y2: cy + dy,
      stroke: '#334155', 'stroke-width': 7,
      'stroke-linecap': 'round',
    }, g);
  }

  function ensureDefs(svg) {
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }
    if (svg.querySelector('#steelyardWood')) return;

    function grad(id, x1, y1, x2, y2, stops) {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
      g.setAttribute('id', id);
      g.setAttribute('x1', x1); g.setAttribute('y1', y1);
      g.setAttribute('x2', x2); g.setAttribute('y2', y2);
      stops.forEach(function (st) {
        const s = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
        s.setAttribute('offset', st[0]);
        s.setAttribute('stop-color', st[1]);
        if (st[2] != null) s.setAttribute('stop-opacity', st[2]);
        g.appendChild(s);
      });
      defs.appendChild(g);
    }

    grad('steelyardWood', '0', '0', '0', '1', [
      ['0%', '#9a6a3a'], ['23%', '#c49358'], ['52%', '#8a5b31'], ['78%', '#b67d43'], ['100%', '#70431f']
    ]);
    grad('steelyardMetal', '0', '0', '1', '1', [
      ['0%', '#f0e3bd'], ['25%', '#8f7b59'], ['50%', '#d8c99e'], ['72%', '#6b5c43'], ['100%', '#c5b589']
    ]);
    grad('steelyardIron', '0', '0', '1', '1', [
      ['0%', '#6b7280'], ['30%', '#d1d5db'], ['52%', '#59616c'], ['78%', '#e5e7eb'], ['100%', '#4b5563']
    ]);
    grad('steelyardFish', '0', '0', '1', '1', [
      ['0%', '#a8b8bd'], ['38%', '#607b82'], ['68%', '#354e55'], ['100%', '#182f36']
    ]);
    grad('steelyardMeat', '0', '0', '1', '1', [
      ['0%', '#c97973'], ['48%', '#994c4c'], ['100%', '#693337']
    ]);
    grad('steelyardSack', '0', '0', '1', '1', [
      ['0%', '#d6c6a6'], ['50%', '#aa9673'], ['100%', '#786548']
    ]);
  }

  function drawBeam(g, m, opts) {
    opts = opts || {};
    const opacity = opts.opacity == null ? 1 : opts.opacity;
    const ghost = !!opts.ghost;
    const gg = S.el('g', {
      transform: 'rotate(' + m.angleDeg + ' ' + m.O.x + ' ' + m.O.y + ')',
      opacity: opacity,
    }, g);

    if (ghost) {
      S.el('rect', {
        x: CFG.rodStartX, y: CFG.O.y - 11,
        width: CFG.rodEndX - CFG.rodStartX, height: 22, rx: 9,
        fill: 'none', stroke: '#64748b', 'stroke-width': 3,
        'stroke-dasharray': '9 7',
      }, gg);
      return;
    }

    S.el('rect', {
      x: CFG.rodStartX, y: CFG.O.y - 12,
      width: CFG.rodEndX - CFG.rodStartX, height: 24, rx: 9,
      fill: 'url(#steelyardWood)', stroke: '#5a371e', 'stroke-width': 1.6,
    }, gg);
    S.el('path', {
      d: 'M ' + (CFG.rodStartX + 14) + ' ' + (CFG.O.y - 5) +
         ' C 260 ' + (CFG.O.y - 9) + ', 470 ' + (CFG.O.y - 2) + ', ' +
         (CFG.rodEndX - 20) + ' ' + (CFG.O.y - 6),
      fill: 'none', stroke: '#e2b675', 'stroke-width': 2.1, opacity: 0.45,
    }, gg);
    S.el('rect', {
      x: CFG.rodStartX - 7, y: CFG.O.y - 13, width: 17, height: 26, rx: 4,
      fill: 'url(#steelyardMetal)', stroke: '#5f513b', 'stroke-width': 1,
    }, gg);
    S.el('rect', {
      x: CFG.rodEndX - 4, y: CFG.O.y - 13, width: 13, height: 26, rx: 4,
      fill: 'url(#steelyardMetal)', stroke: '#5f513b', 'stroke-width': 1,
    }, gg);

    for (let x = CFG.zeroX; x <= CFG.rodEndX - 8; x += 15) {
      const k = Math.round((x - CFG.zeroX) / 15);
      const h = k % 5 === 0 ? 10 : k % 2 === 0 ? 7 : 5;
      S.el('line', {
        x1: x, y1: CFG.O.y - 12,
        x2: x, y2: CFG.O.y - 12 + h,
        stroke: '#3f2a19', 'stroke-width': k % 5 === 0 ? 1.5 : 1,
        opacity: 0.72,
      }, gg);
    }

    S.el('line', {
      x1: CFG.zeroX, y1: CFG.O.y - 17,
      x2: CFG.zeroX, y2: CFG.O.y + 16,
      stroke: '#7c2d12', 'stroke-width': 2.2,
    }, gg);
    S.el('text', {
      x: CFG.zeroX + 7, y: CFG.O.y - 20,
      fill: '#7c2d12', 'font-size': 11, 'font-weight': 700,
    }, gg).textContent = '零位';

    S.el('rect', {
      x: CFG.O.x - 11, y: CFG.O.y - 15, width: 22, height: 30, rx: 5,
      fill: 'none', stroke: '#66543d', 'stroke-width': 2,
    }, gg);
  }

  function drawPoise(g, m, ghost) {
    const p = m.p1;
    if (ghost) {
      S.el('line', {
        x1: p.x, y1: p.y + 2, x2: p.x, y2: p.y + 52,
        stroke: '#64748b', 'stroke-width': 2, 'stroke-dasharray': '5 5',
        opacity: 0.5,
      }, g);
      S.el('path', {
        d: 'M ' + (p.x - 15) + ' ' + (p.y + 50) +
           ' L ' + (p.x - 22) + ' ' + (p.y + 82) +
           ' Q ' + p.x + ' ' + (p.y + 97) + ' ' + (p.x + 22) + ' ' + (p.y + 82) +
           ' L ' + (p.x + 15) + ' ' + (p.y + 50) + ' Z',
        fill: 'none', stroke: '#64748b', 'stroke-width': 2.2,
        'stroke-dasharray': '5 5', opacity: 0.48,
      }, g);
      return;
    }

    S.el('circle', {
      cx: p.x, cy: p.y + 4, r: 8,
      fill: 'none', stroke: '#6b5c43', 'stroke-width': 4,
    }, g);
    S.el('line', {
      x1: p.x, y1: p.y + 10, x2: p.x, y2: p.y + 44,
      stroke: '#6b5c43', 'stroke-width': 3,
    }, g);
    S.el('path', {
      d: 'M ' + (p.x - 15) + ' ' + (p.y + 42) +
         ' L ' + (p.x - 24) + ' ' + (p.y + 76) +
         ' Q ' + p.x + ' ' + (p.y + 96) + ' ' + (p.x + 24) + ' ' + (p.y + 76) +
         ' L ' + (p.x + 15) + ' ' + (p.y + 42) + ' Z',
      fill: 'url(#steelyardMetal)', stroke: '#5c4d36', 'stroke-width': 1.5,
    }, g);
    S.el('ellipse', {
      cx: p.x, cy: p.y + 72, rx: 12, ry: 20,
      fill: '#554833', opacity: 0.12,
    }, g);
  }

  function drawObject(g, m) {
    const p = m.p2;
    const y0 = p.y + 92;

    S.el('line', {
      x1: p.x, y1: p.y + 6,
      x2: p.x, y2: p.y + 82,
      stroke: '#6b7280', 'stroke-width': 3.6,
      'stroke-linecap': 'round',
    }, g);

    if (m.object.kind === 'fish') {
      const x = p.x - 6;
      S.el('path', {
        d: 'M ' + (x - 58) + ' ' + y0 +
           ' Q ' + (x - 8) + ' ' + (y0 - 31) + ' ' + (x + 51) + ' ' + (y0 - 2) +
           ' Q ' + (x - 2) + ' ' + (y0 + 30) + ' ' + (x - 58) + ' ' + y0 + ' Z',
        fill: 'url(#steelyardFish)', stroke: '#29434a', 'stroke-width': 1.5,
      }, g);
      S.el('path', {
        d: 'M ' + (x - 58) + ' ' + y0 + ' l -28 -22 l 5 28 l -8 24 z',
        fill: '#4a676d', stroke: '#29434a', 'stroke-width': 1.2,
      }, g);
      S.el('circle', { cx: x + 34, cy: y0 - 7, r: 3.3, fill: '#111827' }, g);
      S.el('path', {
        d: 'M ' + (x - 4) + ' ' + (y0 - 22) + ' q 13 -12 26 -4',
        fill: 'none', stroke: '#bcc9cb', 'stroke-width': 1.2, opacity: 0.65,
      }, g);
    } else if (m.object.kind === 'apples') {
      S.el('path', {
        d: 'M ' + (p.x - 42) + ' ' + (y0 - 28) +
           ' Q ' + p.x + ' ' + (y0 - 48) + ' ' + (p.x + 42) + ' ' + (y0 - 28) +
           ' L ' + (p.x + 34) + ' ' + (y0 + 39) +
           ' Q ' + p.x + ' ' + (y0 + 54) + ' ' + (p.x - 34) + ' ' + (y0 + 39) + ' Z',
        fill: '#d9e0d1', 'fill-opacity': 0.28, stroke: '#7f8f78', 'stroke-width': 1.4,
      }, g);
      [[-21,-5],[8,-9],[-4,18],[24,17],[-26,25]].forEach(function (q, i) {
        S.el('circle', {
          cx: p.x + q[0], cy: y0 + q[1], r: 16,
          fill: i % 2 ? '#a9342c' : '#b84435',
          stroke: '#7d2926', 'stroke-width': 1,
        }, g);
        S.el('path', {
          d: 'M ' + (p.x + q[0]) + ' ' + (y0 + q[1] - 14) + ' q 5 -9 11 -8',
          fill: 'none', stroke: '#526c3c', 'stroke-width': 2,
        }, g);
      });
      S.el('line', {
        x1: p.x, y1: p.y + 82, x2: p.x, y2: y0 - 38,
        stroke: '#7f8f78', 'stroke-width': 1.5,
      }, g);
    } else if (m.object.kind === 'pork') {
      S.el('path', {
        d: 'M ' + (p.x - 37) + ' ' + (y0 - 34) +
           ' Q ' + (p.x - 45) + ' ' + y0 + ' ' + (p.x - 31) + ' ' + (y0 + 43) +
           ' Q ' + p.x + ' ' + (y0 + 54) + ' ' + (p.x + 36) + ' ' + (y0 + 33) +
           ' L ' + (p.x + 28) + ' ' + (y0 - 29) + ' Z',
        fill: 'url(#steelyardMeat)', stroke: '#6e3538', 'stroke-width': 1.5,
      }, g);
      S.el('path', {
        d: 'M ' + (p.x - 29) + ' ' + (y0 - 10) + ' C ' + (p.x - 6) + ' ' + (y0 - 22) + ', ' +
           (p.x + 3) + ' ' + (y0 + 4) + ', ' + (p.x + 27) + ' ' + (y0 - 6) +
           ' M ' + (p.x - 24) + ' ' + (y0 + 22) + ' C ' + (p.x - 5) + ' ' + (y0 + 7) + ', ' +
           (p.x + 8) + ' ' + (y0 + 35) + ', ' + (p.x + 29) + ' ' + (y0 + 18),
        fill: 'none', stroke: '#e7b3a8', 'stroke-width': 5, opacity: 0.74,
      }, g);
      S.el('line', {
        x1: p.x, y1: p.y + 82, x2: p.x - 2, y2: y0 - 35,
        stroke: '#74706a', 'stroke-width': 2,
      }, g);
    } else {
      S.el('path', {
        d: 'M ' + (p.x - 39) + ' ' + (y0 - 38) +
           ' Q ' + p.x + ' ' + (y0 - 53) + ' ' + (p.x + 39) + ' ' + (y0 - 38) +
           ' L ' + (p.x + 34) + ' ' + (y0 + 43) +
           ' Q ' + p.x + ' ' + (y0 + 56) + ' ' + (p.x - 34) + ' ' + (y0 + 43) + ' Z',
        fill: 'url(#steelyardSack)', stroke: '#6d5b40', 'stroke-width': 1.5,
      }, g);
      S.el('path', {
        d: 'M ' + (p.x - 27) + ' ' + (y0 - 29) + ' Q ' + p.x + ' ' + (y0 - 20) + ' ' + (p.x + 27) + ' ' + (y0 - 29),
        fill: 'none', stroke: '#65533b', 'stroke-width': 2,
      }, g);
      S.el('text', {
        x: p.x, y: y0 + 15, 'text-anchor': 'middle',
        fill: '#57452f', 'font-size': 20, 'font-weight': 700,
        'font-family': 'Noto Serif SC, Songti SC, serif',
      }, g).textContent = '米';
      S.el('line', {
        x1: p.x, y1: p.y + 82, x2: p.x, y2: y0 - 41,
        stroke: '#72634c', 'stroke-width': 2,
      }, g);
    }
  }

  function drawLabels(g, m, opts) {
    if (!opts.showElements && !opts.showArms) return;
    if (opts.showElements) {
      S.drawPivot(g, m.O);
      S.drawForceArrow(g, m.p1, K.v(0, 1), 72, C.F1, '动力：秤砣重力', { O: m.O });
      S.drawForceArrow(g, m.p2, K.v(0, 1), 72, C.F2, '阻力：物体重力', { O: m.O });
      S.el('text', {
        x: m.O.x + 13, y: m.O.y - 35,
        fill: '#166534', 'font-size': 13, 'font-weight': 700,
        stroke: '#fff', 'stroke-width': 3, 'paint-order': 'stroke',
      }, g).textContent = '支点 O（提钮）';
    }
    if (opts.showArms) {
      const a1 = K.forceArm(m.O, m.p1, K.v(0, 1));
      const a2 = K.forceArm(m.O, m.p2, K.v(0, 1));
      S.drawForceLine(g, m.p1, K.v(0, 1), 150, C.F1);
      S.drawForceLine(g, m.p2, K.v(0, 1), 150, C.F2);
      S.drawArm(g, m.O, a1.foot, '动力臂 l₁', false, C.arm1, K.v(0, 1));
      S.drawArm(g, m.O, a2.foot, '阻力臂 l₂', false, C.arm2, K.v(0, 1));
      if (a1.armLen > 6) S.drawRightAngle(g, a1.foot, a1.armVec, a1.dir, 9, C.arm1);
      if (a2.armLen > 6) S.drawRightAngle(g, a2.foot, a2.armVec, a2.dir, 9, C.arm2);
    }
  }

  const EXT_BASE = {
    poiseMassKg: CFG.poiseMassKg,
    resistanceArm: CFG.O.x - CFG.hookX,
    maxDriveArm: CFG.rodEndX - CFG.O.x,
  };

  const EXT_STRATEGIES = {
    precision: [
      {
        id: 'lighterPoise',
        name: '减小秤砣质量',
        poiseMassKg: 0.38,
        resistanceArm: EXT_BASE.resistanceArm,
        maxDriveArm: EXT_BASE.maxDriveArm,
        summary: '秤砣变轻后，同样的质量变化需要更大的位移才能重新平衡。',
      },
      {
        id: 'longerResistanceArm',
        name: '增大阻力臂',
        poiseMassKg: EXT_BASE.poiseMassKg,
        resistanceArm: 145,
        maxDriveArm: EXT_BASE.maxDriveArm,
        summary: '支点离挂钩更远后，同样的质量变化会对应更大的秤砣位移。',
      },
    ],
    range: [
      {
        id: 'heavierPoise',
        name: '加重秤砣',
        poiseMassKg: 0.80,
        resistanceArm: EXT_BASE.resistanceArm,
        maxDriveArm: EXT_BASE.maxDriveArm,
        summary: '秤砣更重，在相同最大动力臂下可以平衡更重的物体。',
      },
      {
        id: 'longerRod',
        name: '加长有效秤杆',
        poiseMassKg: EXT_BASE.poiseMassKg,
        resistanceArm: EXT_BASE.resistanceArm,
        maxDriveArm: 535,
        summary: '秤砣能够移动得更远，最大动力臂增大，因此量程增大。',
      },
      {
        id: 'shorterResistanceArm',
        name: '减小阻力臂',
        poiseMassKg: EXT_BASE.poiseMassKg,
        resistanceArm: 80,
        maxDriveArm: 505,
        summary: '支点靠近挂钩后，物体的阻力臂变小，同样的秤砣可以平衡更重的物体。',
      },
    ],
  };

  function extensionStrategy(mode, strategyId) {
    const list = EXT_STRATEGIES[mode] || [];
    return list.find(function (s) { return s.id === strategyId; }) || list[0] || null;
  }

  function spacingForDelta(cfg, deltaKg) {
    return deltaKg * cfg.resistanceArm / cfg.poiseMassKg;
  }

  function maxMass(cfg) {
    return cfg.poiseMassKg * cfg.maxDriveArm / cfg.resistanceArm;
  }

  function extensionData(mode, strategyId) {
    const strategy = extensionStrategy(mode, strategyId);
    if (!strategy) return null;

    const deltaKg = 0.1;
    const baseSpacing = spacingForDelta(EXT_BASE, deltaKg);
    const changedSpacing = spacingForDelta(strategy, deltaKg);
    const baseMax = maxMass(EXT_BASE);
    const changedMax = maxMass(strategy);

    return {
      mode,
      strategy,
      deltaKg,
      base: {
        poiseMassKg: EXT_BASE.poiseMassKg,
        resistanceArm: EXT_BASE.resistanceArm,
        maxDriveArm: EXT_BASE.maxDriveArm,
        spacing: baseSpacing,
        maxMass: baseMax,
      },
      changed: {
        poiseMassKg: strategy.poiseMassKg,
        resistanceArm: strategy.resistanceArm,
        maxDriveArm: strategy.maxDriveArm,
        spacing: changedSpacing,
        maxMass: changedMax,
      },
      spacingRatio: changedSpacing / baseSpacing,
      rangeRatio: changedMax / baseMax,
    };
  }

  function extText(g, x, y, text, opts) {
    opts = opts || {};
    S.el('text', {
      x, y,
      fill: opts.fill || '#334155',
      'font-size': opts.size || 13,
      'font-weight': opts.weight || 600,
      'text-anchor': opts.anchor || 'start',
      'font-family': 'Noto Sans SC, Microsoft YaHei, sans-serif',
    }, g).textContent = text;
  }

  function drawTinyPoise(g, x, y, fill) {
    S.el('line', {
      x1: x, y1: y, x2: x, y2: y + 28,
      stroke: fill || '#6b5c43', 'stroke-width': 2.6,
    }, g);
    S.el('path', {
      d: 'M ' + (x - 9) + ' ' + (y + 27) +
         ' L ' + (x - 13) + ' ' + (y + 51) +
         ' Q ' + x + ' ' + (y + 61) + ' ' + (x + 13) + ' ' + (y + 51) +
         ' L ' + (x + 9) + ' ' + (y + 27) + ' Z',
      fill: fill || '#9b875e', stroke: '#5f513b', 'stroke-width': 1.1,
    }, g);
  }

  function drawPrecisionRow(g, y, label, cfg, ratio, accent, detail) {
    const xStart = 315;
    const xEnd = 735;
    const baseGap = 72;
    const gap = baseGap * ratio;
    const x1 = 455;
    const x2 = x1 + gap;

    // 行标题 + 当前改变的参数
    extText(g, 55, y - 45, label, { size: 15, weight: 800, fill: accent });
    extText(g, 55, y - 20, detail, { size: 12, weight: 600, fill: '#64748b' });

    // 局部放大的秤杆刻度。这里只比较“两个平衡位置的间距”。
    extText(g, xStart, y - 38, '秤杆局部放大', {
      size: 11, weight: 600, fill: '#94a3b8',
    });
    S.el('line', {
      x1: xStart, y1: y,
      x2: xEnd, y2: y,
      stroke: '#9a6a3a', 'stroke-width': 12, 'stroke-linecap': 'round',
    }, g);

    for (let x = xStart + 16; x < xEnd - 8; x += 22) {
      S.el('line', {
        x1: x, y1: y - 6,
        x2: x, y2: y + 6,
        stroke: '#5f4429', 'stroke-width': 1.4, opacity: 0.65,
      }, g);
    }

    // 1.0 kg 平衡位置
    S.el('line', {
      x1: x1, y1: y - 25,
      x2: x1, y2: y + 25,
      stroke: '#2563eb', 'stroke-width': 5,
      'stroke-linecap': 'round',
    }, g);
    S.el('circle', {
      cx: x1, cy: y, r: 7,
      fill: '#2563eb', stroke: '#ffffff', 'stroke-width': 2,
    }, g);
    extText(g, x1, y - 33, '1.0 kg', {
      size: 12, anchor: 'middle', fill: '#1d4ed8', weight: 800,
    });

    // 1.1 kg 平衡位置
    S.el('line', {
      x1: x2, y1: y - 25,
      x2: x2, y2: y + 25,
      stroke: '#ea580c', 'stroke-width': 5,
      'stroke-linecap': 'round',
    }, g);
    S.el('circle', {
      cx: x2, cy: y, r: 7,
      fill: '#ea580c', stroke: '#ffffff', 'stroke-width': 2,
    }, g);
    extText(g, x2, y - 33, '1.1 kg', {
      size: 12, anchor: 'middle', fill: '#c2410c', weight: 800,
    });

    // 从旧平衡位置到新平衡位置的位移箭头。
    const ay = y + 48;
    S.el('line', {
      x1: x1 + 4, y1: ay,
      x2: x2 - 4, y2: ay,
      stroke: accent, 'stroke-width': 3,
    }, g);
    S.el('path', {
      d: 'M ' + (x2 - 4) + ' ' + ay +
         ' l -10 -6 l 0 12 z',
      fill: accent,
    }, g);
    extText(g, (x1 + x2) / 2, ay + 24,
      '秤砣需移动 Δx ＝ ' + ratio.toFixed(2) + '×',
      { size: 13, anchor: 'middle', fill: accent, weight: 800 }
    );
  }

  function drawPrecisionExtension(g, data) {
    extText(g, 42, 35, '拓展实验｜怎样提高杆秤精度（分辨能力）', {
      size: 18, weight: 800, fill: '#0f766e',
    });

    // 把控制变量先说清楚，学生只比较“秤砣移动距离”。
    S.el('rect', {
      x: 42, y: 50, width: 716, height: 42, rx: 10,
      fill: '#eff6ff', stroke: '#bfdbfe', 'stroke-width': 1.2,
    }, g);
    extText(g, 400, 76, '同一个变化：物体质量 1.0 kg → 1.1 kg（增加 0.1 kg）', {
      size: 13, anchor: 'middle', fill: '#1e3a8a', weight: 800,
    });

    const changedDetail = data.strategy.id === 'lighterPoise'
      ? '改动：秤砣由 0.56 kg 减小到 0.38 kg'
      : '改动：增大支点到挂钩的距离（增大阻力臂）';

    drawPrecisionRow(
      g, 175,
      '原方案',
      data.base,
      1,
      '#64748b',
      '秤砣 0.56 kg；其余条件不变'
    );

    drawPrecisionRow(
      g, 315,
      data.strategy.name,
      data.changed,
      data.spacingRatio,
      '#b45309',
      changedDetail
    );

    S.el('rect', {
      x: 42, y: 378, width: 716, height: 30, rx: 8,
      fill: '#f0fdfa', stroke: '#99f6e4', 'stroke-width': 1,
    }, g);
    extText(g, 400, 398,
      '同样增加 0.1 kg → 改进后秤砣移动更远 → 相邻质量更容易区分',
      { size: 12, anchor: 'middle', fill: '#0f766e', weight: 800 }
    );
  }

  function rangeGeometry(strategyId, changed) {
    const basePivot = 235;
    const baseHook = 125;
    const baseEnd = 710;
    if (strategyId === 'longerRod') {
      return { pivotX: basePivot, hookX: baseHook, rodEnd: 770, poiseScale: 1 };
    }
    if (strategyId === 'shorterResistanceArm') {
      return { pivotX: 205, hookX: baseHook, rodEnd: baseEnd, poiseScale: 1 };
    }
    return {
      pivotX: basePivot,
      hookX: baseHook,
      rodEnd: baseEnd,
      poiseScale: changed.poiseMassKg / EXT_BASE.poiseMassKg,
    };
  }

  function drawRangeRow(g, y, label, cfg, geom, maxKg, accent) {
    extText(g, 45, y - 30, label, { size: 14, weight: 800, fill: accent });
    S.el('line', {
      x1: 88, y1: y, x2: geom.rodEnd, y2: y,
      stroke: '#8b5e34', 'stroke-width': 13, 'stroke-linecap': 'round',
    }, g);
    S.el('circle', { cx: geom.pivotX, cy: y, r: 7, fill: '#0f766e' }, g);
    S.el('line', {
      x1: geom.hookX, y1: y + 4, x2: geom.hookX, y2: y + 52,
      stroke: '#64748b', 'stroke-width': 2.5,
    }, g);

    const poiseX = geom.rodEnd - 12;
    const poiseColor = geom.poiseScale > 1.2 ? '#7c5a2d' : '#9b875e';
    drawTinyPoise(g, poiseX, y + 4, poiseColor);
    if (geom.poiseScale > 1.2) {
      S.el('ellipse', {
        cx: poiseX, cy: y + 52, rx: 17, ry: 14,
        fill: '#7c5a2d', opacity: 0.32,
      }, g);
    }

    S.el('rect', {
      x: geom.hookX - 25, y: y + 58,
      width: 50, height: 36, rx: 8,
      fill: '#e2e8f0', stroke: '#64748b', 'stroke-width': 1.4,
    }, g);
    extText(g, geom.hookX, y + 81, maxKg.toFixed(2) + ' kg', {
      size: 12, anchor: 'middle', fill: '#334155', weight: 800,
    });
    extText(g, 748, y + 5, '秤砣到最外端', {
      size: 11, anchor: 'end', fill: '#64748b', weight: 500,
    });
  }

  function drawRangeExtension(g, data) {
    extText(g, 42, 35, '拓展实验｜怎样增大杆秤量程', {
      size: 18, weight: 800, fill: '#0f766e',
    });
    extText(g, 42, 61, '把秤砣移到最外端，比较杆秤最多能平衡多重的物体。', {
      size: 13, weight: 500, fill: '#64748b',
    });

    drawRangeRow(
      g, 155, '原方案',
      data.base,
      { pivotX: 235, hookX: 125, rodEnd: 710, poiseScale: 1 },
      data.base.maxMass, '#64748b'
    );
    drawRangeRow(
      g, 300, data.strategy.name,
      data.changed,
      rangeGeometry(data.strategy.id, data.changed),
      data.changed.maxMass, '#b45309'
    );

    extText(g, 42, 395, '量程变大 = 最大可称质量提高。不同办法对分辨能力的影响并不相同。', {
      size: 12, weight: 600, fill: '#475569',
    });
  }

  function drawExtension(g, opts) {
    opts = opts || {};
    const mode = opts.mode === 'range' ? 'range' : 'precision';
    const data = extensionData(mode, opts.strategyId);
    if (!data) return null;
    if (mode === 'precision') drawPrecisionExtension(g, data);
    else drawRangeExtension(g, data);
    return data;
  }

  function draw(g, m, opts) {
    opts = opts || {};
    const svg = g.ownerSVGElement;
    ensureDefs(svg);

    S.el('text', {
      x: 38, y: 31,
      fill: '#44403c', 'font-size': 14, 'font-weight': 700,
      'font-family': 'Noto Sans SC, Microsoft YaHei, sans-serif',
    }, g).textContent = '真实感杆秤 · 拖动秤砣观察平衡';

    S.el('line', {
      x1: CFG.O.x, y1: 52, x2: CFG.O.x, y2: CFG.O.y - 22,
      stroke: '#79654a', 'stroke-width': 5, 'stroke-linecap': 'round',
    }, g);
    S.el('path', {
      d: 'M ' + (CFG.O.x - 22) + ' 56 Q ' + CFG.O.x + ' 34 ' + (CFG.O.x + 22) + ' 56',
      fill: 'none', stroke: '#79654a', 'stroke-width': 5, 'stroke-linecap': 'round',
    }, g);
    S.el('circle', {
      cx: CFG.O.x, cy: CFG.O.y - 4, r: 11,
      fill: 'none', stroke: '#6b5c43', 'stroke-width': 4,
    }, g);

    drawLevelGauge(g, m);

    if (opts.compare && opts.beforeModel) {
      drawBeam(g, opts.beforeModel, { ghost: true, opacity: 0.42 });
      drawPoise(g, opts.beforeModel, true);
      S.el('text', {
        x: 410, y: 82,
        fill: '#64748b', 'font-size': 12, 'font-weight': 700,
      }, g).textContent = '灰色虚线：称量前';
    }

    drawBeam(g, m);
    drawPoise(g, m, false);
    drawObject(g, m);
    drawLabels(g, m, opts);

    S.el('text', {
      x: 38, y: 402,
      fill: statusColor(m),
      'font-size': 13, 'font-weight': 700,
    }, g).textContent = status(m);

    S.el('circle', {
      cx: m.p1.x, cy: m.p1.y + 64, r: 31,
      fill: 'transparent', stroke: 'transparent',
      style: 'cursor:ew-resize',
      'data-steelyard-poise-hit': '1',
    }, g);
  }

  global.SteelyardCase = {
    CFG,
    OBJECTS,
    model,
    targetT,
    beforeT,
    tFromPoint,
    status,
    extensionData,
    extensionStrategies: EXT_STRATEGIES,
    drawExtension,
    draw,
  };
})(typeof window !== 'undefined' ? window : globalThis);
