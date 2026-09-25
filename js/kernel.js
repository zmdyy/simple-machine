/**
 * 几何内核：支点、力的作用线、垂足、力臂
 * 所有实验室共用，单位：像素（屏幕）或格（实验台）
 */
(function (global) {
  'use strict';

  const COLORS = {
    bg: '#f7f5f1',
    ink: '#1f2933',
    muted: '#667085',
    stroke: '#98a2b3',
    pivot: '#1a1a2e',
    // 动力及其力臂：红；阻力及其力臂：蓝
    F1: '#dc2626',
    F2: '#2563eb',
    arm1: '#dc2626',
    arm2: '#2563eb',
    arm: '#dc2626',
    armGhost: 'rgba(220, 38, 38, 0.28)',
    forceLine: '#64748b',
    wrong: '#94a3b8',
    ok: '#059669',
    panel: '#ffffff',
  };

  function v(x, y) {
    return { x, y };
  }

  function add(a, b) {
    return v(a.x + b.x, a.y + b.y);
  }

  function sub(a, b) {
    return v(a.x - b.x, a.y - b.y);
  }

  function scale(a, s) {
    return v(a.x * s, a.y * s);
  }

  function len(a) {
    return Math.hypot(a.x, a.y);
  }

  function norm(a) {
    const L = len(a) || 1;
    return v(a.x / L, a.y / L);
  }

  function dot(a, b) {
    return a.x * b.x + a.y * b.y;
  }

  function perp(a) {
    return v(-a.y, a.x);
  }

  function dist(a, b) {
    return len(sub(a, b));
  }

  function angleOf(dir) {
    return Math.atan2(dir.y, dir.x);
  }

  function fromAngle(rad, magnitude) {
    return v(Math.cos(rad) * magnitude, Math.sin(rad) * magnitude);
  }

  /**
   * 从支点 O 到过作用点 P、沿方向 D（单位或任意）的直线的垂足与力臂长度
   * 力的作用线：P + t * D
   */
  function footOfPerpendicular(O, P, D) {
    const d = norm(D);
    const OP = sub(O, P);
    const t = dot(OP, d);
    const foot = add(P, scale(d, t));
    const armVec = sub(foot, O);
    const armLen = len(armVec);
    return { foot, armLen, armVec, dir: d, t };
  }

  /** 力臂：支点到力的作用线的垂直距离 */
  function forceArm(O, point, forceDir) {
    return footOfPerpendicular(O, point, forceDir);
  }

  /**
   * 判断学生拖出的「力臂线」是否正确
   * studentEnd: 学生从 O 拖到的终点
   */
  function judgeArmDraw(O, point, forceDir, studentEnd, opts) {
    const o = Object.assign(
      {
        angleTolDeg: 18,
        tipTol: 28,
        alongBarTolDeg: 22,
      },
      opts || {}
    );

    const truth = forceArm(O, point, forceDir);
    if (truth.armLen < 4) {
      return { ok: false, code: 'zero', message: '此时力臂几乎为 0（作用线过支点）。换一个力的方向再试。' };
    }

    const studentVec = sub(studentEnd, O);
    const studentLen = len(studentVec);
    if (studentLen < 12) {
      return { ok: false, code: 'short', message: '线太短。请从 O 一直拖到红色虚线（力的作用线）上再松手。' };
    }

    const toPoint = sub(point, O);
    const toPointLen = len(toPoint);
    const tipToPoint = dist(studentEnd, point);
    const tipToFoot = dist(studentEnd, truth.foot);
    // 垂足刚好落在作用点附近（如水平杆 + 竖直力）时，力臂看起来就像「沿杆连到作用点」，这是对的
    const footNearPoint = dist(truth.foot, point) < o.tipTol;

    // 连到作用点：只有垂足并不在作用点时，才是误把「杆上距离」当力臂
    if (toPointLen > 8 && tipToPoint < o.tipTol && !footNearPoint) {
      const along = Math.abs(dot(norm(studentVec), norm(toPoint)));
      if (along > 0.92) {
        return {
          ok: false,
          code: 'to_point',
          message:
            '你画的是「O 到作用点」的杆上距离，不是力臂。' +
            '正确做法：从 O 向红色虚线（力的作用线）作垂线，拖到交点（垂足）松手——交点往往不在作用点上。',
          truth,
        };
      }
    }

    // 几乎沿着杆，却没落到垂足：才算画偏
    if (toPointLen > 8 && !footNearPoint) {
      const angBar = Math.acos(
        Math.min(1, Math.abs(dot(norm(studentVec), norm(toPoint))))
      );
      if ((angBar * 180) / Math.PI < o.alongBarTolDeg && tipToFoot > o.tipTol) {
        return {
          ok: false,
          code: 'along_bar',
          message:
            '不要沿杆画。力臂 = 支点到力的作用线的垂直距离。' +
            '请从 O 垂直拖向红色虚线，在虚线上的交点松手（斜向力时交点常在杆外）。',
          truth,
        };
      }
    }

    // 正确力臂应平行于从 O 到 foot 的方向
    const d = truth.dir;
    const angToTruth = Math.acos(
      Math.min(1, Math.abs(dot(norm(studentVec), norm(truth.armVec))))
    );
    const angDeg = (angToTruth * 180) / Math.PI;

    if (angDeg > o.angleTolDeg) {
      if (Math.abs(dot(norm(studentVec), d)) > 0.85) {
        return {
          ok: false,
          code: 'need_extend',
          message:
            '方向几乎顺着力走了。请先看清红色虚线（可向两端延长），再从 O 向虚线作垂线。',
          truth,
        };
      }
      return {
        ok: false,
        code: 'not_perp',
        message:
          '还不够垂直。正确力臂与红色虚线应成直角：从 O 拖到虚线上，使交角接近 90°。',
        truth,
      };
    }

    if (tipToFoot > o.tipTol * 1.4 && Math.abs(studentLen - truth.armLen) > o.tipTol) {
      if (angDeg <= o.angleTolDeg) {
        return {
          ok: true,
          code: 'ok_dir',
          message: '方向正确。再对准虚线上的垂足（交点），松手即可。',
          truth,
        };
      }
    }

    return {
      ok: true,
      code: 'ok',
      message: '正确！力臂是支点到力的作用线的垂直距离（图上红色虚线到 O 的最短距离）。',
      truth,
    };
  }

  /** 力矩符号：在 2D 屏幕坐标（y 向下）中，相对 O 的力矩（正=逆时针视觉上……） */
  function torque2D(O, point, force) {
    const r = sub(point, O);
    return r.x * force.y - r.y * force.x;
  }

  function classifyLever(l1, l2, eps) {
    const e = eps ?? 0.08;
    const r = l1 / (l2 || 1e-9);
    if (Math.abs(r - 1) < e) return { type: '等臂', tip: '动力臂 ≈ 阻力臂' };
    if (r > 1) return { type: '省力', tip: '动力臂 > 阻力臂，省力但费距离' };
    return { type: '费力', tip: '动力臂 < 阻力臂，费力但省距离' };
  }

  global.LeverKernel = {
    COLORS,
    v,
    add,
    sub,
    scale,
    len,
    norm,
    dot,
    perp,
    dist,
    angleOf,
    fromAngle,
    footOfPerpendicular,
    forceArm,
    judgeArmDraw,
    torque2D,
    classifyLever,
  };
})(typeof window !== 'undefined' ? window : globalThis);
