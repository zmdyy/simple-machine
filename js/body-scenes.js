/**
 * 人体杠杆：侧视实拍。踮脚、屈肘、头颈绕关节转；弯腰与蹲抬换两张照片。
 * 力点按这张照片上的真实位置，不画在衣服外面的空处。
 */
(function (global) {
  'use strict';

  const K = global.LeverKernel;
  const S = () => global.LeverSVG;

  function fit(g, href, natW, natH, x, y, destH) {
    const destW = (destH * natW) / natH;
    const img = S().el('image', {
      x, y, width: destW, height: destH,
    }, g);
    img.setAttribute('href', href);
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href);
    return {
      x, y, w: destW, h: destH,
      p(u, v) { return K.v(x + u * destW, y + v * destH); },
    };
  }

  function rot(p, O, deg) {
    const a = (deg * Math.PI) / 180;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const dx = p.x - O.x;
    const dy = p.y - O.y;
    return K.v(O.x + c * dx - s * dy, O.y + s * dx + c * dy);
  }

  function caption(g, text) {
    S().el('text', {
      x: 24, y: 26,
      fill: '#44403c', 'font-size': 14, 'font-weight': 700,
      'font-family': 'Noto Sans SC, Microsoft YaHei, sans-serif',
    }, g).textContent = text;
  }

  function ground(g, y) {
    S().el('line', {
      x1: 40, y1: y, x2: 760, y2: y,
      stroke: '#a8a29e', 'stroke-width': 2,
    }, g);
  }

  function pack(O, p1, d1, p2, d2, bar, f2, extra) {
    const o = { O, p1, d1: K.norm(d1), p2, d2: K.norm(d2), bar, f2 };
    if (extra) Object.keys(extra).forEach((k) => { o[k] = extra[k]; });
    return o;
  }

  function calfPose(t) {
    const destH = 390;
    const destW = destH * (385 / 1032);
    const x = 250;
    const y = 16;
    const P = (u, v) => K.v(x + u * destW, y + v * destH);
    const O0 = P(0.28, 0.9);
    const heel0 = P(0.72, 0.74);
    const ankle0 = P(0.58, 0.62);
    const deg = (0.55 - t) * 22;
    const O = O0;
    const heel = rot(heel0, O, deg);
    const ankle = rot(ankle0, O, deg);
    return {
      box: { x, y, w: destW, h: destH, deg, O },
      geom: pack(O, heel, K.v(0.15, -1), ankle, K.v(0, 1), [O, heel], 600, {
        caption: '踮脚：前脚掌着地是支点，跟腱把脚跟向上拉，体重经踝向下',
      }),
    };
  }

  function curlPose(t) {
    const destH = 360;
    const destW = destH * (751 / 809);
    const x = 160;
    const y = 30;
    const P = (u, v) => K.v(x + u * destW, y + v * destH);
    const O0 = P(0.22, 0.9);
    const ins0 = P(0.42, 0.62);
    const grip0 = P(0.78, 0.36);
    const deg = (0.45 - t) * 28;
    return {
      box: { x, y, w: destW, h: destH, deg, O: O0 },
      geom: pack(O0, rot(ins0, O0, deg), K.v(-0.15, -1), rot(grip0, O0, deg), K.v(0, 1), [O0, rot(grip0, O0, deg)], 50, {
        caption: '举哑铃，只析肘：肘是支点，肱二头肌拉前臂，哑铃重力在握点竖直向下',
      }),
    };
  }

  function neckPose(t) {
    const destH = 380;
    const destW = destH * (695 / 982);
    const x = 220;
    const y = 16;
    const P = (u, v) => K.v(x + u * destW, y + v * destH);
    const O0 = P(0.38, 0.48);
    const nape0 = P(0.28, 0.58);
    const com0 = P(0.58, 0.36);
    const deg = (0.45 - t) * 16;
    return {
      box: { x, y, w: destW, h: destH, deg, O: O0 },
      geom: pack(O0, rot(nape0, O0, deg), K.v(0.2, 1), rot(com0, O0, deg), K.v(0, 1), [O0, rot(com0, O0, deg)], 50, {
        caption: '低头 / 抬头：耳屏附近是支点，颈后肌拉枕骨，头重竖直向下',
      }),
    };
  }

  function liftPose(t) {
    const squat = t >= 0.5;
    const href = squat ? 'assets/body/squat.png' : 'assets/body/lift.png';
    const natW = squat ? 685 : 654;
    const natH = squat ? 910 : 767;
    const destH = 380;
    const destW = destH * (natW / natH);
    const x = squat ? 140 : 120;
    const y = 24;
    const P = (u, v) => K.v(x + u * destW, y + v * destH);
    const O = squat ? P(0.38, 0.52) : P(0.32, 0.48);
    const back = squat ? P(0.42, 0.32) : P(0.28, 0.32);
    const load = squat ? P(0.72, 0.58) : P(0.7, 0.42);
    return {
      box: { x, y, w: destW, h: destH, deg: 0, O, href, natW, natH },
      geom: pack(O, back, K.v(0.05, -1), load, K.v(0, 1), [O, load], 400, {
        stageName: squat ? '屈膝蹲抬（躯干更竖，阻力臂较短）' : '直腿弯腰（阻力臂很长）',
        caption: squat
          ? '蹲抬同一重物：髋仍是支点，背更直，箱子的阻力臂变短'
          : '直腿弯腰：髋是支点，竖脊肌贴在背后，上半身加箱子的重力臂很长',
      }),
    };
  }

  const POSE = { calf: calfPose, curl: curlPose, neck: neckPose, lift: liftPose };

  function layout(id, t) {
    const fn = POSE[id];
    if (!fn) return null;
    return fn(t).geom;
  }

  function draw(g, id, t) {
    const fn = POSE[id];
    if (!fn) return;
    const pose = fn(t);
    const b = pose.box;
    const wrap = S().el('g', {
      transform: 'rotate(' + b.deg + ' ' + b.O.x + ' ' + b.O.y + ')',
    }, g);
    const href = b.href || ('assets/body/' + id + '.png');
    const nat = {
      calf: [385, 1032],
      curl: [751, 809],
      neck: [695, 982],
    }[id];
    const natW = b.natW || (nat && nat[0]);
    const natH = b.natH || (nat && nat[1]);
    fit(wrap, href, natW, natH, b.x, b.y, b.h);
    if (id === 'calf') ground(g, b.y + b.h - 4);
    if (pose.geom.caption) caption(g, pose.geom.caption);
  }

  global.BodyScenes = { layout, draw };
})(typeof window !== 'undefined' ? window : globalThis);
