/**
 * SVG 规范作图：O、力箭头、作用线、垂线力臂、直角、双箭头标注
 */
(function (global) {
  'use strict';

  const K = global.LeverKernel;
  const C = K.COLORS;
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent) {
    const n = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (attrs[k] != null) n.setAttribute(k, attrs[k]);
      });
    }
    if (parent) parent.appendChild(n);
    return n;
  }

  function clear(g) {
    while (g.firstChild) g.removeChild(g.firstChild);
  }

  function arrowMarker(defs, id, color) {
    let m = defs.querySelector('#' + id);
    if (m) {
      const path = m.querySelector('path');
      if (path) path.setAttribute('fill', color);
      return m;
    }
    m = el('marker', {
      id,
      viewBox: '0 0 12 12',
      markerWidth: 9,
      markerHeight: 9,
      refX: 10,
      refY: 6,
      orient: 'auto',
      markerUnits: 'userSpaceOnUse',
    }, defs);
    el('path', {
      d: 'M1,1.5 L10,6 L1,10.5 L3.2,6 Z',
      fill: color,
    }, m);
    return m;
  }

  function ensureDefs(svg) {
    let defs = svg.querySelector('defs');
    if (!defs) defs = el('defs', null, svg);
    arrowMarker(defs, 'arrow-f1', C.F1);
    arrowMarker(defs, 'arrow-f2', C.F2);
    arrowMarker(defs, 'arrow-arm1', C.arm1);
    arrowMarker(defs, 'arrow-arm2', C.arm2);
    return defs;
  }

  function drawPivot(g, O, label, scale) {
    const sc = scale > 0 ? scale : 1;
    el('circle', {
      cx: O.x, cy: O.y, r: 10 * sc,
      fill: '#fff', stroke: '#111827', 'stroke-width': 3 * sc,
    }, g);
    el('circle', {
      cx: O.x, cy: O.y, r: 4.2 * sc,
      fill: '#111827', stroke: '#fff', 'stroke-width': 1.2 * sc,
    }, g);
    const fs = 16 * sc;
    el('text', {
      x: O.x + 14 * sc, y: O.y - 14 * sc,
      fill: '#fff', stroke: '#fff', 'stroke-width': fs * 0.22,
      'font-size': fs, 'font-weight': 800,
      'font-family': 'Noto Serif SC, Songti SC, serif',
      'paint-order': 'stroke',
    }, g).textContent = label || 'O';
    el('text', {
      x: O.x + 14 * sc, y: O.y - 14 * sc,
      fill: '#111827', 'font-size': fs, 'font-weight': 800,
      'font-family': 'Noto Serif SC, Songti SC, serif',
    }, g).textContent = label || 'O';
  }

  /**
   * 力箭头：细杆 + 实心三角箭头
   * opts.O：若给出支点，则把符号放到「远离支点」的一侧，避免压在箭杆上
   */
  function drawForceArrow(g, point, dir, magnitudePx, color, label, opts) {
    const d = K.norm(dir);
    const sc = (opts && opts.scale > 0) ? opts.scale : 1;
    const len = magnitudePx || 70;
    const head = 12 * sc;
    const tip = K.add(point, K.scale(d, len));
    const base = K.add(tip, K.scale(d, -head));
    const p = K.perp(d);
    const left = K.add(base, K.scale(p, head * 0.42));
    const right = K.add(base, K.scale(p, -head * 0.42));
    el('line', {
      x1: point.x, y1: point.y, x2: base.x, y2: base.y,
      stroke: color, 'stroke-width': 2.75 * sc, 'stroke-linecap': 'round',
    }, g);
    el('path', {
      d: 'M' + tip.x + ',' + tip.y + ' L' + left.x + ',' + left.y +
        ' L' + right.x + ',' + right.y + ' Z',
      fill: color,
    }, g);
    el('circle', {
      cx: point.x, cy: point.y, r: 3.5 * sc, fill: color, stroke: '#fff', 'stroke-width': sc,
    }, g);
    if (label) {
      const mid = K.add(point, K.scale(d, len * 0.62));
      const ox = (opts && opts.O) ? opts.O.x : 400;
      const outwardX = point.x >= ox ? 1 : -1;
      const gap = (opts && opts.labelOffset != null) ? opts.labelOffset : 44 * sc;
      let tx;
      let ty;
      if (Math.abs(d.x) < 0.4) {
        tx = mid.x + outwardX * gap;
        ty = mid.y;
      } else {
        let side = 1;
        if (opts && opts.O) {
          const away = K.sub(point, opts.O);
          const s = Math.sign(K.dot(p, away));
          if (s) side = s;
          else side = outwardX * (p.x >= 0 ? 1 : -1);
        } else if (opts && opts.side) {
          side = opts.side;
        }
        const off = K.scale(p, side * gap);
        tx = mid.x + off.x;
        ty = mid.y + off.y;
      }
      const fs = 15 * sc;
      el('text', {
        x: tx, y: ty,
        fill: '#fff', stroke: '#fff', 'stroke-width': fs * 0.28,
        'font-size': fs, 'font-weight': 800,
        'font-family': 'Noto Sans SC, Microsoft YaHei, sans-serif',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
        'paint-order': 'stroke',
      }, g).textContent = label;
      el('text', {
        x: tx, y: ty,
        fill: color, 'font-size': fs, 'font-weight': 800,
        'font-family': 'Noto Sans SC, Microsoft YaHei, sans-serif',
        'text-anchor': 'middle',
        'dominant-baseline': 'middle',
      }, g).textContent = label;
    }
    return tip;
  }

  function drawForceLine(g, point, dir, halfLen, color, scale) {
    const d = K.norm(dir);
    const sc = scale > 0 ? scale : 1;
    const a = K.add(point, K.scale(d, -halfLen));
    const b = K.add(point, K.scale(d, halfLen));
    el('line', {
      x1: a.x, y1: a.y, x2: b.x, y2: b.y,
      stroke: color || C.forceLine, 'stroke-width': 1.25 * sc,
      'stroke-dasharray': 5 * sc + ' ' + 4 * sc, opacity: 0.85,
    }, g);
  }

  function drawRightAngle(g, foot, alongArm, alongForce, size, color) {
    const s = size || 9;
    const u = K.norm(alongArm);
    const w = K.norm(alongForce);
    const p1 = K.add(foot, K.scale(u, -s));
    const p2 = K.add(p1, K.scale(w, s));
    const p3 = K.add(foot, K.scale(w, s));
    el('polyline', {
      points: [p1.x, p1.y, p2.x, p2.y, p3.x, p3.y].join(' '),
      fill: 'none', stroke: color || C.arm1, 'stroke-width': Math.max(1.5, s * 0.18),
    }, g);
  }

  /** 尺寸标注式箭头：两端朝外的小三角 */
  function drawOutwardArrowHead(g, tip, outwardDir, color, size) {
    const s = size || 9;
    const d = K.norm(outwardDir);
    const base = K.add(tip, K.scale(d, -s * 0.85));
    const p = K.perp(d);
    const left = K.add(base, K.scale(p, s * 0.38));
    const right = K.add(base, K.scale(p, -s * 0.38));
    el('path', {
      d: 'M' + tip.x + ',' + tip.y + ' L' + left.x + ',' + left.y +
        ' L' + right.x + ',' + right.y + ' Z',
      fill: color,
    }, g);
  }

  /**
   * 力臂：O→垂足，两端朝外箭头
   * forceDir — 若提供，力臂符号放在力的反侧（力向下则 l 标在力臂上方），避免与力箭头抢位
   */
  function drawArm(g, O, foot, label, ghost, color, forceDir, scale) {
    const col = ghost ? C.armGhost : (color || C.arm1);
    const sc = scale > 0 ? scale : 1;
    const sw = (ghost ? 1.75 : 2.25) * sc;
    const armVec = K.sub(foot, O);
    if (K.len(armVec) < 4) return;
    const d = K.norm(armVec);
    const inset = ghost ? 0 : 5 * sc;
    const a0 = K.add(O, K.scale(d, inset));
    const a1 = K.add(foot, K.scale(d, -inset));
    el('line', {
      x1: a0.x, y1: a0.y, x2: a1.x, y2: a1.y,
      stroke: col, 'stroke-width': sw, 'stroke-linecap': 'round',
    }, g);
    if (!ghost) {
      drawOutwardArrowHead(g, O, K.scale(d, -1), col, 9 * sc);
      drawOutwardArrowHead(g, foot, d, col, 9 * sc);
      if (label) {
        const p = K.perp(d);
        const mid = K.add(O, K.scale(armVec, 0.34));
        let side = -1;
        if (forceDir) {
          const fd = K.norm(forceDir);
          const s = K.dot(fd, p);
          side = s > 0 ? -1 : 1;
        }
        let off = K.scale(p, side * 18 * sc);
        if (mid.y + off.y > O.y - 4 * sc) {
          off = K.scale(p, -side * 18 * sc);
        }
        let tx = mid.x + off.x;
        let ty = mid.y + off.y;
        if (ty > O.y + 8 * sc) {
          ty = O.y - 16 * sc;
        }
        const fs = 15 * sc;
        el('text', {
          x: tx, y: ty,
          fill: '#fff', stroke: '#fff', 'stroke-width': fs * 0.28,
          'font-size': fs, 'font-weight': 800,
          'text-anchor': 'middle', 'dominant-baseline': 'middle',
          'font-family': 'JetBrains Mono, Consolas, monospace',
          'paint-order': 'stroke',
        }, g).textContent = label;
        el('text', {
          x: tx, y: ty,
          fill: col, 'font-size': fs, 'font-weight': 800,
          'text-anchor': 'middle', 'dominant-baseline': 'middle',
          'font-family': 'JetBrains Mono, Consolas, monospace',
        }, g).textContent = label;
      }
    }
  }

  /**
   * 完整力臂作图
   * opts.which: 'F1' | 'F2' 决定红/蓝
   */
  function drawForceArmConstruction(g, svg, opts) {
    ensureDefs(svg);
    const which = opts.which || 'F1';
    const forceColor = opts.color || (which === 'F2' ? C.F2 : C.F1);
    const armColor = which === 'F2' ? C.arm2 : C.arm1;
    const {
      O, point, dir, forcePx, labelF, labelL,
      step, showWrongToPoint,
    } = opts;
    const st = step == null ? 5 : step;

    if (st >= 1) drawPivot(g, O);

    if (showWrongToPoint && st >= 2) {
      el('line', {
        x1: O.x, y1: O.y, x2: point.x, y2: point.y,
        stroke: C.wrong, 'stroke-width': 1.5,
        'stroke-dasharray': '4 4',
      }, g);
      el('text', {
        x: (O.x + point.x) / 2, y: (O.y + point.y) / 2 - 8,
        fill: C.wrong, 'font-size': 11,
      }, g).textContent = '这不是力臂';
    }

    if (st >= 2) {
      drawForceArrow(g, point, dir, forcePx || 70, forceColor, labelF, { O: O });
    }
    if (st >= 3) {
      drawForceLine(g, point, dir, 220, forceColor);
    }
    if (st >= 4) {
      const { foot, armVec, dir: d } = K.forceArm(O, point, dir);
      drawArm(g, O, foot, st >= 5 ? labelL : null, false, armColor, dir);
      if (K.len(armVec) > 6) {
        drawRightAngle(g, foot, armVec, d, 9, armColor);
      }
    }
  }

  /**
   * 杠杆刀口台座：梯形支座 + 水平刀口棱，绝不用朝上尖三角（易被当成力箭头）
   */
  function drawFulcrumStand(g, O) {
    const ox = O.x;
    const oy = O.y;
    // 底板
    el('rect', {
      x: ox - 34, y: oy + 62, width: 68, height: 10, rx: 2,
      fill: '#64748b', stroke: '#334155', 'stroke-width': 1,
    }, g);
    // 梯形立柱（上窄下宽，像台座不是箭头）
    el('path', {
      d:
        'M' + (ox - 12) + ',' + (oy + 20) +
        ' L' + (ox + 12) + ',' + (oy + 20) +
        ' L' + (ox + 26) + ',' + (oy + 62) +
        ' L' + (ox - 26) + ',' + (oy + 62) + ' Z',
      fill: '#94a3b8',
      stroke: '#475569',
      'stroke-width': 1.25,
      'stroke-linejoin': 'round',
    }, g);
    // 台面横梁
    el('rect', {
      x: ox - 16, y: oy + 16, width: 32, height: 7, rx: 1.5,
      fill: '#64748b', stroke: '#334155', 'stroke-width': 1,
    }, g);
    // 水平刀口：细棱顶住支点（侧视像一条横线+小棱，不是↑）
    el('rect', {
      x: ox - 10, y: oy + 5, width: 20, height: 11, rx: 1,
      fill: '#475569', stroke: '#1e293b', 'stroke-width': 1,
    }, g);
    el('line', {
      x1: ox - 9, y1: oy + 5.5, x2: ox + 9, y2: oy + 5.5,
      stroke: '#e2e8f0', 'stroke-width': 1.5, 'stroke-linecap': 'round',
    }, g);
    // 刀口与杠杆接触的极小棱（水平）
    el('rect', {
      x: ox - 3, y: oy + 2, width: 6, height: 4, rx: 0.5,
      fill: '#1e293b',
    }, g);
    // 旁注「刀口」：练习时帮助学生认出装置（不标字母 O）
    el('text', {
      x: ox + 32, y: oy + 52,
      fill: '#475569', 'font-size': 12, 'font-weight': 700,
      'font-family': 'Noto Sans SC, system-ui, sans-serif',
    }, g).textContent = '刀口';
  }

  /**
   * 羊角锤拔钉：实拍抠图对齐
   * 关键点（900×716）：
   *   P_contact 锤头外弧贴木处 → 场景支点 O
   *   P_claw    羊角 V 口空隙 → 钉子 / F₂
   * 柄端由变换顺带落到 grip 附近（场景点已按此标定）
   */
  function drawClawHammer(g, opts) {
    const O = opts.O;
    const nail = opts.nail;
    const NW = 900;
    const NH = 716;
    const P_contact = { x: 654, y: 714 }; // 外弧贴木（支点）
    const P_claw = { x: 530, y: 680 }; // V 口最深处（钉帽）

    // 相似变换：外弧→O，V 口→钉（两点恰好定 scale/rot/平移）
    const vImg = { x: P_claw.x - P_contact.x, y: P_claw.y - P_contact.y };
    const vSc = { x: nail.x - O.x, y: nail.y - O.y };
    const lenImg = Math.hypot(vImg.x, vImg.y) || 1;
    const lenSc = Math.hypot(vSc.x, vSc.y) || 1;
    const scale = lenSc / lenImg;
    const rot = Math.atan2(vSc.y, vSc.x) - Math.atan2(vImg.y, vImg.x);
    const deg = (rot * 180) / Math.PI;

    // —— 木板：上沿贴外弧支点 ——
    const boardX = Math.min(O.x, nail.x) - 50;
    el('rect', {
      x: boardX, y: O.y + 1,
      width: Math.max(O.x, nail.x) - boardX + 120, height: 48, rx: 2,
      fill: '#c9a06a', stroke: '#78350f', 'stroke-width': 1.75,
    }, g);
    el('rect', {
      x: boardX, y: O.y + 1,
      width: Math.max(O.x, nail.x) - boardX + 120, height: 10, rx: 1,
      fill: '#ddb892', opacity: 0.5,
    }, g);

    // —— 实拍锤（先画，钉子画在上层）——
    const gH = el('g', {
      transform:
        'translate(' + O.x + ',' + O.y + ') ' +
        'rotate(' + deg + ') ' +
        'scale(' + scale + ') ' +
        'translate(' + (-P_contact.x) + ',' + (-P_contact.y) + ')',
      style: 'pointer-events:none',
    }, g);
    const img = el('image', {
      x: 0, y: 0, width: NW, height: NH,
      preserveAspectRatio: 'none',
    }, gH);
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'assets/claw-hammer.png');
    img.setAttribute('href', 'assets/claw-hammer.png');

    // —— 钉子：钉帽在羊角 V 口正中 ——
    el('line', {
      x1: nail.x, y1: Math.min(nail.y + 8, O.y + 4), x2: nail.x, y2: O.y + 6,
      stroke: '#334155', 'stroke-width': 3.5, 'stroke-linecap': 'round',
    }, g);
    el('ellipse', {
      cx: nail.x, cy: nail.y, rx: 10, ry: 4.5,
      fill: '#94a3b8', stroke: '#0f172a', 'stroke-width': 1.5,
    }, g);
    el('ellipse', {
      cx: nail.x, cy: nail.y - 2, rx: 10, ry: 3.5,
      fill: '#cbd5e1', stroke: '#0f172a', 'stroke-width': 1,
    }, g);
    el('text', {
      x: nail.x - 14, y: nail.y + 24,
      fill: C.F2, 'font-size': 12, 'font-weight': 700,
      'text-anchor': 'end',
    }, g).textContent = '钉';
  }

  /** 挂钩码示意：黑框空心，不填充（动力/阻力用旁注与力箭头区分） */
  function drawHookWeight(g, p) {
    const ink = '#1e293b';
    el('path', {
      d: 'M' + p.x + ',' + (p.y + 2) +
        ' A5,5 0 1,1 ' + (p.x + 0.01) + ',' + (p.y + 2),
      fill: 'none', stroke: ink, 'stroke-width': 2,
    }, g);
    el('rect', {
      x: p.x - 11, y: p.y + 10, width: 22, height: 24, rx: 3,
      fill: 'none', stroke: ink, 'stroke-width': 2,
    }, g);
  }

  /** 作用点旁的「动/阻」：纯文字，不画底框 */
  function drawRoleTag(g, p, tag, color, O) {
    if (!tag) return;
    const ox = O ? O.x : 400;
    const outward = p.x >= ox ? 1 : -1;
    const tx = p.x + outward * 24;
    const ty = p.y - 22;
    el('text', {
      x: tx, y: ty,
      fill: color, 'font-size': 14, 'font-weight': 700,
      'text-anchor': outward > 0 ? 'start' : 'end',
      'font-family': 'Noto Sans SC, Microsoft YaHei, sans-serif',
      stroke: 'rgba(255,255,255,0.92)', 'stroke-width': 3,
      'paint-order': 'stroke',
    }, g).textContent = tag;
  }

  /** 画一根抽象硬棒（折线或直线） */
  function drawBar(g, points, attrs) {
    const d = points.map((p, i) => (i ? 'L' : 'M') + p.x + ',' + p.y).join(' ');
    el('path', Object.assign({
      d,
      fill: 'none',
      stroke: '#334155',
      'stroke-width': 10,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }, attrs || {}), g);
    el('path', {
      d,
      fill: 'none',
      stroke: '#e2e8f0',
      'stroke-width': 6,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
    }, g);
  }

  global.LeverSVG = {
    el,
    clear,
    ensureDefs,
    drawPivot,
    drawForceArrow,
    drawForceLine,
    drawRightAngle,
    drawArm,
    drawForceArmConstruction,
    drawBar,
    drawFulcrumStand,
    drawHookWeight,
    drawClawHammer,
    drawRoleTag,
    SVG_NS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
