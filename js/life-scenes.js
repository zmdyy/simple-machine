/**
 * 生活杠杆：实拍抠图按接触点摆放，力画在杆上的真实作用点
 * 坐标 u,v 是抠图宽高的比例（0–1）
 */
(function (global) {
  'use strict';

  const K = global.LeverKernel;
  const S = () => global.LeverSVG;

  function fit(g, href, natW, natH, x, y, destW) {
    const destH = (destW * natH) / natW;
    const img = S().el('image', {
      x, y, width: destW, height: destH,
      preserveAspectRatio: 'none',
      'pointer-events': 'none',
    }, g);
    img.setAttribute('href', href);
    img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', href);
    return {
      x, y, w: destW, h: destH,
      p(u, v) {
        return K.v(x + u * destW, y + v * destH);
      },
    };
  }

  function ground(g, y) {
    S().el('line', {
      x1: 36, y1: y, x2: 764, y2: y,
      stroke: '#a8a29e', 'stroke-width': 2,
    }, g);
  }

  function caption(g, text) {
    S().el('text', {
      x: 40, y: 28,
      fill: '#44403c', 'font-size': 14, 'font-weight': 700,
      'font-family': 'Noto Sans SC, Microsoft YaHei, sans-serif',
    }, g).textContent = text;
  }

  function tag(g, p, text, dx, dy) {
    S().el('text', {
      x: p.x + (dx || 0), y: p.y + (dy || 0),
      fill: '#44403c', 'font-size': 13, 'font-weight': 700,
      stroke: '#faf9f6', 'stroke-width': 3, 'paint-order': 'stroke',
      'font-family': 'Noto Sans SC, Microsoft YaHei, sans-serif',
    }, g).textContent = text;
  }

  function lerp(a, b, t) {
    return K.v(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
  }

  function rot(p, O, deg) {
    const rad = (deg * Math.PI) / 180;
    const cs = Math.cos(rad);
    const sn = Math.sin(rad);
    const dx = p.x - O.x;
    const dy = p.y - O.y;
    return K.v(O.x + cs * dx - sn * dy, O.y + sn * dx + cs * dy);
  }

  function axis(g, pts, on) {
    if (!on || pts.length < 2) return;
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p.x + ',' + p.y).join(' ');
    S().el('path', {
      d, fill: 'none', stroke: '#92400e', 'stroke-width': 1.75,
      'stroke-dasharray': '7 5', opacity: 0.8,
    }, g);
  }

  function pack(O, p1, d1, p2, d2, bar, f2, extra) {
    const o = {
      O, p1, d1: K.norm(d1), p2, d2: K.norm(d2), bar, f2,
    };
    if (extra) Object.keys(extra).forEach((k) => { o[k] = extra[k]; });
    return o;
  }

  /**
   * 直撬棍：扁尖在左。棍底面一点搁在垫块左上棱（O），
   * 绕该棱逆时针抬起，扁尖斜插到石头底下，长端在右上方。
   * 石头底面坐在扁尖上沿，垫块立在地面上，三者只在棱上相切。
   */
  function crowbarAsm(t) {
    const GY = 346;
    const blockW = 124;
    const blockH = blockW * (303 / 786);
    const O = K.v(308, GY - blockH);
    const natW = 955;
    const natH = 62;
    const destW = 620;
    const destH = (destW * natH) / natW;
    const deg = -5;
    const uO = 0.36;
    const vO = 0.98;
    const rad = (deg * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    const ax = uO * destW;
    const ay = vO * destH;
    function map(u, v) {
      const lx = u * destW - ax;
      const ly = v * destH - ay;
      return K.v(O.x + c * lx - s * ly, O.y + s * lx + c * ly);
    }
    const u1 = 0.58 + t * 0.32;
    const seat = map(0.14, 0.1);
    return {
      O,
      p1: map(u1, 0.12),
      p2: seat,
      tip: map(0.0, 0.45),
      handle: map(0.98, 0.5),
      mid: map(uO, 0.5),
      seat,
      blockW,
      blockH,
      GY,
      deg,
      destW,
      destH,
      uO,
      vO,
      natW,
      natH,
    };
  }

  function rodAsm(t) {
    const x = 130;
    const y = 230;
    const w = 540;
    const h = w * (230 / 1200);
    const P0 = (u, v) => K.v(x + u * w, y + v * h);
    const O = P0(0.04, 0.14);
    const angleDeg = -22;
    const map = (u, v) => rot(P0(u, v), O, angleDeg);
    const tip = map(0.97, 0.1);
    const p1 = map(0.16 + t * 0.28, 0.13);
    const fish = K.v(tip.x + 4, 360);
    return { x, y, w, h, O, tip, p1, fish, angleDeg };
  }

  const LAYOUT = {
    crowbar(t) {
      const a = crowbarAsm(t);
      return pack(a.O, a.p1, K.v(0, 1), a.p2, K.v(0, 1), [a.tip, a.mid, a.handle], 200, {
        caption: '石头压在撬棍上，棍底搁在垫块棱上。支点是那条棱，长端向下压。',
      });
    },
    broom(t) {
      const x = 300;
      const h = 360;
      const w = h * (452 / 1101);
      const y = 36;
      const P = (u, v) => K.v(x + u * w, y + v * h);
      const O = P(0.36, 0.04);                 // 上手：支点
      const head = P(0.38, 0.97);              // 扫把头：阻力作用点
      const p1 = P(0.36, 0.22 + t * 0.32);     // 下手：动力作用点
      return pack(O, p1, K.v(1, 0.08), head, K.v(-1, 0), [O, head], 30, {
        fixedKeyPoints: true,
        caption: '扫把：上手作支点 O，下手是动力作用点，扫把头与地面接触处是阻力作用点。',
      });
    },
    door(t) {
      const x = 80;
      const y = 70;
      const w = 640;
      const h = w * (526 / 1072);
      const P = (u, v) => K.v(x + u * w, y + v * h);
      const O = P(0.03, 0.5);
      const p1 = P(0.16 + t * 0.72, 0.5);
      const p2 = P(0.5, 0.5);
      return pack(O, p1, K.v(0, -1), p2, K.v(0, 1), [O, P(0.97, 0.5)], 40, {
        caption: '推开门（俯视）：铰链是支点，阻力画在门扇中部，不画在门锁',
      });
    },
    opener(t) {
      const x = 40;
      const y = 24;
      const natW = 1081;
      const natH = 629;
      const w = 720;
      const h = w * (natH / natW);
      const P = (u, v) => K.v(x + u * w, y + v * h);
      const O = P(0.255, 0.1);                 // 鼻端压住瓶盖：支点
      const p2 = P(0.25, 0.23);                // 下唇钩住盖沿：阻力点
      const u1 = 0.5 + t * 0.32;
      const v1 = 0.3 + (u1 - 0.55) * 0.95;
      const p1 = P(u1, v1);                    // 手柄：动力点
      return pack(O, p1, K.v(0, -1), p2, K.v(0, 1), [p2, O, p1], 40, {
        fixedKeyPoints: true,
        caption: '开瓶器：鼻端压在瓶盖上作支点 O，下唇钩住盖沿，手在柄端向上抬。',
      });
    },
    rod(t) {
      const a = rodAsm(t);
      return pack(a.O, a.p1, K.v(0, -1), a.tip, K.v(0, 1), [a.O, a.tip], 20, {
        fish: a.fish,
        caption: '提起鱼（不是甩竿）：竿尾抵腰是支点，前手向上抬，鱼线对竿尖产生向下的拉力',
      });
    },
    chopsticks(t) {
      const x = 120;
      const y = 140;
      const w = 540;
      const h = w * (217 / 1116);
      const P = (u, v) => K.v(x + u * w, y + v * h);
      const O = P(0.06, 0.28);
      const tip = P(0.94, 0.42);
      const p1 = P(0.22 + t * 0.35, 0.3 + t * 0.06);
      return pack(O, p1, K.v(0.15, 1), tip, K.v(0, -1), [O, tip], 5, {
        caption: '夹菜：两筷在手中相抵处是支点，手指在中段发力，食物在筷尖',
      });
    },
    tweezers(t) {
      const x = 140;
      const y = 160;
      const w = 520;
      const h = w * (150 / 1116);
      const P = (u, v) => K.v(x + u * w, y + v * h);
      const O = P(0.08, 0.42);
      const tip = P(0.96, 0.55);
      const p1 = P(0.28 + t * 0.3, 0.45);
      return pack(O, p1, K.v(0.1, 1), tip, K.v(0, -1), [O, tip], 4, {
        caption: '夹取细物：相连的弯折端是支点，手指捏中段，阻力在镊尖',
      });
    },
    oar(t) {
      const x = 80;
      const y = 150;
      const w = 640;
      const h = w * (205 / 1200);
      const P = (u, v) => K.v(x + u * w, y + v * h);
      const O = P(0.4, 0.48);
      const blade = P(0.86, 0.48);
      const p1 = P(0.08 + t * 0.18, 0.48);
      return pack(O, p1, K.v(0, 1), blade, K.v(0, -1), [P(0.04, 0.48), O, blade], 80, {
        caption: '坐船划（俯视）：桨架是支点，手拉桨柄，水阻碍桨叶',
      });
    },
    hammer() {
      const x = 80;
      const y = 40;
      const w = 520;
      const h = w * (786 / 1004);
      const P = (u, v) => K.v(x + u * w, y + v * h);
      const O = P(0.68, 0.58);
      const nail = P(0.78, 0.42);
      const grip = P(0.28, 0.72);
      return pack(O, grip, K.v(-0.25, -1), nail, K.v(0, 1), [nail, O, grip], 100, {
        caption: '拔钉：锤头抵住木板是支点，手向上扳柄，钉子阻碍羊角',
      });
    },
    wheelbarrow(t) {
      const x = 70;
      const y = 70;
      const w = 660;
      const h = w * (407 / 1066);
      const P = (u, v) => K.v(x + u * w, y + v * h);
      const O = P(0.14, 0.62);                 // 轮轴：支点
      const handle = P(0.9, 0.1);              // 把手：动力点
      const load = P(0.28 + t * 0.22, 0.28);   // 货物重心：阻力点
      return pack(O, handle, K.v(0, -1), load, K.v(0, 1), [O, handle], 300, {
        fixedKeyPoints: true,
        caption: '小推车：轮轴是支点 O，手在把手处向上抬，货物重力作用在车斗中的重心位置。',
      });
    },
    balance() {
      const x = 140;
      const y = 40;
      const w = 520;
      const h = w * (590 / 974);
      const P = (u, v) => K.v(x + u * w, y + v * h);
      const O = P(0.5, 0.22);
      const p1 = P(0.18, 0.62);
      const p2 = P(0.82, 0.62);
      return pack(O, p1, K.v(0, 1), p2, K.v(0, 1), [P(0.16, 0.28), P(0.84, 0.28)], 10, {
        caption: '天平：刀口是支点，两侧托盘竖直向下，等臂',
      });
    },
    nailclipper(t) {
      const x = 90;
      const y = 120;
      const w = 620;
      const h = w * (274 / 1108);
      const P = (u, v) => K.v(x + u * w, y + v * h);
      if (t < 0.5) {
        const O = P(0.7, 0.42);
        const p1 = P(0.94, 0.16);
        const p2 = P(0.28, 0.36);
        return pack(O, p1, K.v(0, 1), p2, K.v(0, -1), [p2, O, p1], 20, {
          stageName: '手柄级（省力）',
          caption: '指甲剪 · 先看手柄这一级：支点在销钉，手压柄端，省力',
        });
      }
      const O = P(0.1, 0.4);
      const p1 = P(0.42, 0.38);
      const p2 = P(0.04, 0.3);
      return pack(O, p1, K.v(0, -1), p2, K.v(0, 1), [p1, O, p2], 40, {
        stageName: '刀口级（费力）',
        caption: '指甲剪 · 再看刀口这一级：支点在刀口销，费力但刀口位移小',
      });
    },
  };

  function draw(g, id, t, opts) {
    const step = (opts && opts.step) || 1;
    const showAxis = step >= 4;
    const L = LAYOUT[id] ? LAYOUT[id](t) : null;
    if (!L) return;

    if (id === 'crowbar') {
      const a = crowbarAsm(t);
      ground(g, a.GY);
      const blockTop = a.O.y - 18;
      const blockH = Math.max(36, a.GY - blockTop);
      fit(g, 'assets/life/block.png', 786, 303, a.O.x, blockTop, a.blockW);
      const blockImg = g.querySelector('image[href="assets/life/block.png"]');
      if (blockImg) blockImg.setAttribute('height', blockH);
      const barG = S().el('g', {
        transform:
          'translate(' + a.O.x + ',' + a.O.y + ') rotate(' + a.deg + ') ' +
          'translate(' + (-a.uO * a.destW) + ',' + (-a.vO * a.destH) + ')',
      }, g);
      const img = S().el('image', {
        x: 0, y: 0, width: a.destW, height: a.destH,
        'pointer-events': 'none',
      }, barG);
      img.setAttribute('href', 'assets/life/prybar.png');
      img.setAttributeNS('http://www.w3.org/1999/xlink', 'href', 'assets/life/prybar.png');
      const stoneW = 210;
      const stoneH = stoneW * (559 / 902);
      fit(
        g,
        'assets/life/stone.png',
        902,
        559,
        a.seat.x - stoneW * 0.78,
        a.seat.y - stoneH + 14,
        stoneW
      );
      tag(g, a.O, '垫块棱', 14, 22);
      tag(g, a.seat, '压在棍上', -28, -10);
      axis(g, [a.tip, a.mid, a.handle], showAxis);
    } else if (id === 'broom') {
      const h = 360;
      const w = h * (452 / 1101);
      const bar = fit(g, 'assets/life/broom.png', 452, 1101, 300, 36, w);
      const O = bar.p(0.36, 0.04);
      const head = bar.p(0.38, 0.97);
      const p1 = bar.p(0.36, 0.22 + t * 0.32);
      ground(g, head.y + 6);
      if (step >= 2) tag(g, O, '上手 · 支点 O', 28, 0);
      if (step >= 3) {
        tag(g, p1, '下手 · 动力点', 28, -8);
        tag(g, head, '扫把头 · 阻力点', 24, 0);
      }
      axis(g, [O, head], showAxis);
    } else if (id === 'door') {
      const w = 640;
      const bar = fit(g, 'assets/life/door.png', 1072, 526, 80, 70, w);
      const O = bar.p(0.03, 0.5);
      tag(g, O, '铰链', -8, -16);
      tag(g, bar.p(0.5, 0.5), '门中部·阻力', 10, 28);
      axis(g, [O, bar.p(0.97, 0.5)], showAxis);
    } else if (id === 'opener') {
      const x = 40;
      const y = 24;
      const w = 720;
      const natW = 1081;
      const natH = 629;
      const bar = fit(g, 'assets/life/opener-lift.png', natW, natH, x, y, w);
      const u1 = 0.5 + t * 0.32;
      const v1 = 0.3 + (u1 - 0.55) * 0.95;
      const O = bar.p(0.255, 0.1);
      const p2 = bar.p(0.25, 0.23);
      const p1 = bar.p(u1, v1);
      if (step >= 2) tag(g, O, '支点 O', 12, -4);
      if (step >= 3) {
        tag(g, p2, '盖沿 · 阻力点', 12, 18);
        tag(g, p1, '手柄 · 动力点', 12, -12);
      }
      axis(g, [p2, O, p1], showAxis);
    } else if (id === 'rod') {
      const a = rodAsm(t);
      const rodG = S().el('g', {
        transform: 'rotate(' + a.angleDeg + ' ' + a.O.x + ' ' + a.O.y + ')',
      }, g);
      fit(rodG, 'assets/life/rod.png', 1200, 230, a.x, a.y, a.w);
      S().el('line', {
        x1: a.tip.x, y1: a.tip.y + 3, x2: a.fish.x, y2: a.fish.y - 12,
        stroke: '#64748b', 'stroke-width': 1.6,
      }, g);
      const fishW = 88;
      fit(g, 'assets/life/fish.png', 942, 414, a.fish.x - fishW * 0.48, a.fish.y - 10, fishW);
      tag(g, a.O, '腰部支点', -8, 26);
      tag(g, a.p1, '前手向上抬', -20, -22);
      tag(g, a.tip, '鱼线拉竿尖', 12, 18);
      axis(g, [a.O, a.tip], showAxis);
    } else if (id === 'chopsticks') {
      const w = 540;
      const bar = fit(g, 'assets/life/chopsticks.png', 1116, 217, 120, 140, w);
      const tip = bar.p(0.94, 0.42);
      const p1 = bar.p(0.22 + t * 0.35, 0.3 + t * 0.06);
      S().el('ellipse', {
        cx: tip.x, cy: tip.y + 10, rx: 14, ry: 8,
        fill: '#65a30d', stroke: '#3f6212', 'stroke-width': 1,
      }, g);
      axis(g, [bar.p(0.06, 0.28), tip], showAxis);
    } else if (id === 'tweezers') {
      const w = 520;
      const bar = fit(g, 'assets/life/tweezers.png', 1116, 150, 140, 160, w);
      axis(g, [bar.p(0.08, 0.42), bar.p(0.96, 0.55)], showAxis);
    } else if (id === 'oar') {
      const w = 640;
      const bar = fit(g, 'assets/life/oar.png', 1200, 205, 80, 150, w);
      tag(g, bar.p(0.4, 0.48), '桨架', 8, -14);
      tag(g, bar.p(0.86, 0.48), '桨叶', 8, 22);
      axis(g, [bar.p(0.04, 0.48), bar.p(0.4, 0.48), bar.p(0.86, 0.48)], showAxis);
    } else if (id === 'hammer') {
      fit(g, 'assets/life/hammer.png', 1004, 786, 80, 40, 520);
      const P = (u, v) => K.v(80 + u * 520, 40 + v * 520 * (786 / 1004));
      axis(g, [P(0.78, 0.42), P(0.68, 0.58), P(0.28, 0.72)], showAxis);
    } else if (id === 'wheelbarrow') {
      const w = 660;
      const bar = fit(g, 'assets/life/wheel.png', 1066, 407, 70, 70, w);
      const O = bar.p(0.14, 0.62);
      const handle = bar.p(0.9, 0.1);
      const load = bar.p(0.28 + t * 0.22, 0.28);
      if (step >= 2) tag(g, O, '轮轴 · 支点 O', 10, 18);
      if (step >= 3) {
        tag(g, handle, '把手 · 动力点', -6, -14);
        tag(g, load, '货物重心 · 阻力点', 8, -8);
      }
      axis(g, [O, handle], showAxis);
    } else if (id === 'balance') {
      fit(g, 'assets/life/scale.png', 974, 590, 140, 40, 520);
      const P = (u, v) => K.v(140 + u * 520, 40 + v * 520 * (590 / 974));
      axis(g, [P(0.16, 0.28), P(0.5, 0.22), P(0.84, 0.28)], showAxis);
    } else if (id === 'nailclipper') {
      const w = 620;
      const bar = fit(g, 'assets/life/clipper.png', 1108, 274, 90, 120, w);
      axis(g, t < 0.5
        ? [bar.p(0.28, 0.36), bar.p(0.7, 0.42), bar.p(0.94, 0.16)]
        : [bar.p(0.42, 0.38), bar.p(0.1, 0.4), bar.p(0.04, 0.3)], showAxis);
    }

    if (L.caption) caption(g, L.caption);
  }

  function layout(id, t) {
    const fn = LAYOUT[id];
    if (!fn) return null;
    return fn(t);
  }

  global.LifeScenes = { layout, draw };
})(typeof window !== 'undefined' ? window : globalThis);
