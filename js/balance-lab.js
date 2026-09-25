/**
 * 平衡探究：叠挂、换格、同侧测力计、记录表
 */
(function (global) {
  'use strict';

  const K = global.LeverKernel;
  const C = K.COLORS;

  const G = 10; // N/kg
  const MASS = 0.05; // kg
  const HOOK_W = MASS * G; // 0.5 N
  const UNIT = 28; // px per grid
  const CX = 400;
  const CY = 200;
  const HALF = 10; // grids each side when pivot center

  let state = {
    mode: 'both', // both | same
    angle: 0, // rad, positive = clockwise on screen (y down)
    omega: 0,
    nuts: { left: -9.2, right: 9.2 }, // grid units from pivot (for balance)
    // hooks: { grid: number (integer, +right), count: n }
    hooks: [],
    // spring: { grid, forceN } upward, same-side mode
    spring: null,
    drag: null,
    hoverGrid: null,
    records: [],
    running: true,
  };

  function pivotX() {
    return CX;
  }

  function gridToX(grid) {
    return pivotX() + grid * UNIT;
  }

  function xToGrid(x) {
    return Math.round((x - pivotX()) / UNIT);
  }

  function barY(x) {
    // tilted bar: through pivot
    const dx = x - pivotX();
    return CY + dx * Math.tan(state.angle);
  }

  /** 自重力矩：螺母简化为两端小质量 */
  function nutTorque() {
    const m = 0.08 * G; // 等效
    let T = 0;
    T += m * state.nuts.left * UNIT; // τ = F * x (y-down: F down is +Fy, r×F = rx*Fy)
    T += m * state.nuts.right * UNIT;
    return T;
  }

  function hookTorque() {
    let T = 0;
    state.hooks.forEach((h) => {
      const F = h.count * HOOK_W;
      // force down = (0, F), r = (grid*UNIT, 0) in bar frame approx when nearly level
      // screen: torque2D = rx*Fy - ry*Fx ≈ grid*UNIT * F
      T += h.grid * UNIT * F;
    });
    return T;
  }

  function springTorque() {
    if (!state.spring) return 0;
    // upward force = (0, -F)
    return state.spring.grid * UNIT * (-state.spring.forceN);
  }

  function netTorque() {
    return nutTorque() + hookTorque() + springTorque();
  }

  function isLevel() {
    return Math.abs(state.angle) < 0.012 && Math.abs(state.omega) < 0.05 && Math.abs(netTorque()) < 8;
  }

  function sideMoments() {
    // For display: left (grid<0) and right (grid>0), plus spring
    let left = 0;
    let right = 0;
    state.hooks.forEach((h) => {
      const M = Math.abs(h.grid) * UNIT * h.count * HOOK_W;
      if (h.grid < 0) left += M;
      else if (h.grid > 0) right += M;
      else {
        /* on pivot */
      }
    });
    if (state.spring) {
      const M = Math.abs(state.spring.grid) * UNIT * state.spring.forceN;
      if (state.spring.grid < 0) left += M;
      else right += M;
    }
    // nuts small
    left += Math.abs(state.nuts.left) * UNIT * 0.08 * G;
    right += Math.abs(state.nuts.right) * UNIT * 0.08 * G;
    return { left, right };
  }

  function canvas() {
    return document.getElementById('balCanvas');
  }

  function draw() {
    const c = canvas();
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (c.width !== w * dpr || c.height !== h * dpr) {
      c.width = w * dpr;
      c.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    // stand
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(CX - 14, CY + 8, 28, h - CY - 20);
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.lineTo(CX - 18, CY + 22);
    ctx.lineTo(CX + 18, CY + 22);
    ctx.closePath();
    ctx.fill();

    // stops
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(80, CY + 70, 16, 10);
    ctx.fillRect(w - 96, CY + 70, 16, 10);

    // bar
    ctx.save();
    ctx.translate(CX, CY);
    ctx.rotate(state.angle);
    const barW = HALF * UNIT + 40;
    ctx.fillStyle = '#e2e8f0';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    roundRect(ctx, -barW, -10, barW * 2, 20, 4);
    ctx.fill();
    ctx.stroke();

    // grids
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    for (let i = -HALF; i <= HALF; i++) {
      if (i === 0) continue;
      const x = i * UNIT;
      ctx.beginPath();
      ctx.moveTo(x, -10);
      ctx.lineTo(x, 10);
      ctx.stroke();
      if (i % 2 === 0) ctx.fillText(String(Math.abs(i)), x, -14);
    }

    // knife edge mark
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.moveTo(0, 12);
    ctx.lineTo(-8, 28);
    ctx.lineTo(8, 28);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.font = 'bold 14px serif';
    ctx.fillText('O', 12, 36);

    // nuts
    drawNut(ctx, state.nuts.left * UNIT, '#0f766e');
    drawNut(ctx, state.nuts.right * UNIT, '#0f766e');

    // hooks in bar frame
    state.hooks.forEach((hk) => {
      drawHookStack(ctx, hk.grid * UNIT, hk.count);
    });

    // spring
    if (state.spring) {
      const x = state.spring.grid * UNIT;
      ctx.strokeStyle = C.F1;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, -10);
      ctx.lineTo(x, -10 - 50 - state.spring.forceN * 8);
      ctx.stroke();
      ctx.fillStyle = C.F1;
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('测力计 ↑ ' + state.spring.forceN.toFixed(1) + ' N', x, -70 - state.spring.forceN * 8);
    }

    // hover
    if (state.hoverGrid != null && state.hoverGrid !== 0) {
      ctx.fillStyle = 'rgba(15,118,110,0.2)';
      ctx.fillRect(state.hoverGrid * UNIT - 10, -14, 20, 28);
    }

    ctx.restore();

    // force arrows when level-ish (world vertical)
    if (Math.abs(state.angle) < 0.2) {
      state.hooks.forEach((hk) => {
        const x = gridToX(hk.grid);
        const y = barY(x) + 14;
        drawWorldForce(ctx, x, y, hk.count * HOOK_W, true);
      });
      if (state.spring) {
        const x = gridToX(state.spring.grid);
        const y = barY(x) - 14;
        drawWorldForce(ctx, x, y, state.spring.forceN, false);
      }
    }

    // status
    const st = document.getElementById('balStatus');
    if (st) {
      const T = netTorque();
      const level = isLevel();
      st.innerHTML = level
        ? '<span style="color:#059669;font-weight:700">已水平平衡</span>'
        : `倾角 ${(state.angle * 180 / Math.PI).toFixed(1)}° · 净力矩 ${T > 0 ? '顺时针' : '逆时针'}`;
    }

    const { left, right } = sideMoments();
    const max = Math.max(left, right, 1);
    document.getElementById('balBarL').style.width = (100 * left / max) + '%';
    document.getElementById('balBarR').style.width = (100 * right / max) + '%';
    document.getElementById('balBarLLab').textContent = '左侧力矩 ∑ ≈ ' + left.toFixed(0);
    document.getElementById('balBarRLab').textContent = '右侧力矩 ∑ ≈ ' + right.toFixed(0);

    // same-side tip
    const tip = document.getElementById('balSameTip');
    if (tip) {
      const leftHooks = state.hooks.filter((h) => h.grid < 0);
      const rightHooks = state.hooks.filter((h) => h.grid > 0);
      if (!state.spring && leftHooks.length >= 2 && rightHooks.length === 0) {
        tip.textContent = '同侧、同方向（都向下）的力，力矩是加在一起的，不能靠它们自己平衡。';
        tip.hidden = false;
      } else if (!state.spring && rightHooks.length >= 2 && leftHooks.length === 0) {
        tip.textContent = '同侧、同方向（都向下）的力，力矩是加在一起的，不能靠它们自己平衡。';
        tip.hidden = false;
      } else {
        tip.hidden = true;
      }
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawNut(ctx, x, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x - 10, -18, 20, 8);
    ctx.fillRect(x - 6, -22, 12, 6);
  }

  function drawHookStack(ctx, x, count) {
    for (let i = 0; i < count; i++) {
      const y = 14 + i * 22;
      ctx.fillStyle = '#475569';
      ctx.fillRect(x - 9, y, 18, 18);
      ctx.strokeStyle = '#1e293b';
      ctx.strokeRect(x - 9, y, 18, 18);
      ctx.beginPath();
      ctx.arc(x, y - 2, 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(count), x, 28);
  }

  function drawWorldForce(ctx, x, y, F, down) {
    const len = 20 + F * 12;
    ctx.strokeStyle = down ? C.F2 : C.F1;
    ctx.fillStyle = down ? C.F2 : C.F1;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (down) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + len);
      ctx.lineTo(x - 5, y + len - 8);
      ctx.moveTo(x, y + len);
      ctx.lineTo(x + 5, y + len - 8);
    } else {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - len);
      ctx.lineTo(x - 5, y - len + 8);
      ctx.moveTo(x, y - len);
      ctx.lineTo(x + 5, y - len + 8);
    }
    ctx.stroke();
    ctx.font = '11px sans-serif';
    ctx.fillText(F.toFixed(1) + ' N', x + 8, down ? y + len / 2 : y - len / 2);
  }

  function physics(dt) {
    if (!state.running) return;
    const T = netTorque();
    const I = 18000;
    const alpha = T / I;
    state.omega += alpha * dt;
    state.omega *= 0.985; // damping
    state.angle += state.omega * dt;
    // stops
    const maxA = 0.35;
    if (state.angle > maxA) {
      state.angle = maxA;
      state.omega = 0;
    }
    if (state.angle < -maxA) {
      state.angle = -maxA;
      state.omega = 0;
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    physics(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function canvasPos(evt) {
    const c = canvas();
    const r = c.getBoundingClientRect();
    return { x: evt.clientX - r.left, y: evt.clientY - r.top };
  }

  function findHookAt(grid) {
    return state.hooks.find((h) => h.grid === grid);
  }

  function addHook(grid, count) {
    if (grid === 0) return;
    if (grid < -HALF || grid > HALF) return;
    const exist = findHookAt(grid);
    if (exist) exist.count += count;
    else state.hooks.push({ grid, count });
  }

  function bind() {
    const c = canvas();

    document.getElementById('balModeBoth').onclick = () => {
      state.mode = 'both';
      state.spring = null;
      document.getElementById('balModeBoth').classList.add('active-toggle');
      document.getElementById('balModeSame').classList.remove('active-toggle');
      document.getElementById('balSpringPanel').hidden = true;
    };
    document.getElementById('balModeSame').onclick = () => {
      state.mode = 'same';
      document.getElementById('balModeSame').classList.add('active-toggle');
      document.getElementById('balModeBoth').classList.remove('active-toggle');
      document.getElementById('balSpringPanel').hidden = false;
      if (!state.spring) state.spring = { grid: 6, forceN: 1.5 };
    };

    document.getElementById('balUnlevel').onclick = () => {
      state.nuts.left = -8;
      state.nuts.right = 9.5;
      state.angle = 0.08;
    };
    document.getElementById('balLevelNuts').onclick = () => {
      state.nuts.left = -9.2;
      state.nuts.right = 9.2;
    };
    document.getElementById('balClearHooks').onclick = () => {
      state.hooks = [];
    };

    document.getElementById('balSpringF').oninput = (e) => {
      if (!state.spring) state.spring = { grid: 6, forceN: 1 };
      state.spring.forceN = +e.target.value;
      document.getElementById('balSpringFOut').textContent = state.spring.forceN.toFixed(1) + ' N';
    };
    document.getElementById('balSpringGrid').oninput = (e) => {
      if (!state.spring) state.spring = { grid: 6, forceN: 1.5 };
      state.spring.grid = +e.target.value;
      document.getElementById('balSpringGridOut').textContent = String(state.spring.grid);
    };

    function updateHoverFromEvent(evt) {
      const rect = c.getBoundingClientRect();
      const over =
        evt.clientX >= rect.left &&
        evt.clientX <= rect.right &&
        evt.clientY >= rect.top &&
        evt.clientY <= rect.bottom;
      if (!over) {
        state.hoverGrid = null;
        return null;
      }
      const p = { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
      const grid = xToGrid(p.x);
      if (grid !== 0 && Math.abs(grid) <= HALF) state.hoverGrid = grid;
      else state.hoverGrid = null;
      return p;
    }

    // tray: click chip = hang 1 on hover/default grid; drag onto bar also works
    document.querySelectorAll('.hook-chip').forEach((chip) => {
      chip.addEventListener('pointerdown', (evt) => {
        state.drag = { type: 'new', count: 1, fromTray: true };
        chip.setPointerCapture(evt.pointerId);
        evt.preventDefault();
      });
    });

    window.addEventListener('pointermove', (evt) => {
      const p = updateHoverFromEvent(evt);
      if (state.drag && state.drag.type === 'nut' && p) {
        const g = xToGrid(p.x);
        if (state.drag.side === 'left') state.nuts.left = Math.min(-1, Math.max(-HALF, g === 0 ? -1 : g));
        else state.nuts.right = Math.max(1, Math.min(HALF, g === 0 ? 1 : g));
      }
    });

    c.addEventListener('pointerdown', (evt) => {
      const p = canvasPos(evt);
      const lx = (p.x - CX) * Math.cos(state.angle) + (p.y - CY) * Math.sin(state.angle);
      if (Math.abs(lx - state.nuts.left * UNIT) < 16 && Math.abs(p.y - CY) < 40) {
        state.drag = { type: 'nut', side: 'left' };
        return;
      }
      if (Math.abs(lx - state.nuts.right * UNIT) < 16 && Math.abs(p.y - CY) < 40) {
        state.drag = { type: 'nut', side: 'right' };
        return;
      }
      const g = xToGrid(p.x);
      const hk = findHookAt(g);
      if (hk && Math.abs(p.y - barY(gridToX(g))) < 80) {
        state.drag = { type: 'move', count: hk.count };
        state.hooks = state.hooks.filter((h) => h.grid !== g);
      }
    });

    window.addEventListener('pointerup', (evt) => {
      if (!state.drag) return;
      const rect = c.getBoundingClientRect();
      const over =
        evt.clientX >= rect.left &&
        evt.clientX <= rect.right &&
        evt.clientY >= rect.top &&
        evt.clientY <= rect.bottom;
      if (over && (state.drag.type === 'new' || state.drag.type === 'move')) {
        const p = { x: evt.clientX - rect.left, y: evt.clientY - rect.top };
        const g = xToGrid(p.x);
        if (g !== 0 && Math.abs(g) <= HALF) addHook(g, state.drag.count || 1);
      } else if (state.drag.type === 'new' && state.drag.fromTray && state.hoverGrid) {
        addHook(state.hoverGrid, 1);
      }
      state.drag = null;
    });
    document.getElementById('balRecord').onclick = recordRow;
    document.getElementById('balClearTable').onclick = () => {
      state.records = [];
      renderTable();
    };
  }

  function pickF1F2() {
    // 两侧：右侧动力 F1，左侧阻力 F2
    // 同侧：测力计为 F1（上），钩码为 F2（下）— 取主钩码堆
    if (state.mode === 'same' && state.spring) {
      const downs = state.hooks.filter((h) => h.grid !== 0);
      if (!downs.length) return null;
      // 取力矩最大的向下堆为 F2
      downs.sort((a, b) => Math.abs(b.grid) * b.count - Math.abs(a.grid) * a.count);
      const h = downs[0];
      return {
        side: '同侧',
        F1: state.spring.forceN,
        l1: Math.abs(state.spring.grid),
        F2: h.count * HOOK_W,
        l2: Math.abs(h.grid),
      };
    }
    const left = state.hooks.filter((h) => h.grid < 0);
    const right = state.hooks.filter((h) => h.grid > 0);
    if (!left.length || !right.length) return null;
    const L = left.reduce(
      (acc, h) => {
        acc.F += h.count * HOOK_W;
        acc.M += Math.abs(h.grid) * h.count * HOOK_W;
        return acc;
      },
      { F: 0, M: 0 }
    );
    const R = right.reduce(
      (acc, h) => {
        acc.F += h.count * HOOK_W;
        acc.M += Math.abs(h.grid) * h.count * HOOK_W;
        return acc;
      },
      { F: 0, M: 0 }
    );
    // 等效力臂 = M/F
    return {
      side: '两侧',
      F1: R.F,
      l1: R.F ? R.M / R.F : 0,
      F2: L.F,
      l2: L.F ? L.M / L.F : 0,
    };
  }

  function recordRow() {
    const level = isLevel();
    const pair = pickF1F2();
    if (!pair) {
      toast('请先挂好可对比的力（两侧各至少一堆，或同侧钩码+测力计）');
      return;
    }
    if (!level) {
      toast('尚未水平平衡：可记入，但「是否水平」为否，勿用来总结规律');
    }
    const M1 = pair.F1 * pair.l1;
    const M2 = pair.F2 * pair.l2;
    state.records.push({
      n: state.records.length + 1,
      side: pair.side,
      F1: pair.F1,
      l1: pair.l1,
      F2: pair.F2,
      l2: pair.l2,
      M1,
      M2,
      level,
    });
    renderTable();
  }

  function renderTable() {
    const tb = document.getElementById('balTableBody');
    tb.innerHTML = state.records
      .map((r) => {
        const ok = r.level && Math.abs(r.M1 - r.M2) / Math.max(r.M1, r.M2, 1e-6) < 0.08;
        return `<tr class="${ok ? 'ok-row' : ''}">
          <td>${r.n}</td><td>${r.side}</td>
          <td>${r.F1.toFixed(2)}</td><td>${r.l1.toFixed(2)}</td>
          <td>${r.F2.toFixed(2)}</td><td>${r.l2.toFixed(2)}</td>
          <td>${r.M1.toFixed(2)}</td><td>${r.M2.toFixed(2)}</td>
          <td>${r.level ? '是' : '否'}</td>
        </tr>`;
      })
      .join('');

    const concl = document.getElementById('balConclusion');
    const good = state.records.filter(
      (r) => r.level && Math.abs(r.M1 - r.M2) / Math.max(r.M1, r.M2, 1e-6) < 0.08
    );
    const hasBoth = good.some((r) => r.side === '两侧');
    const hasSame = good.some((r) => r.side === '同侧');
    if (good.length >= 3 && hasBoth) {
      concl.innerHTML =
        '<b style="color:#059669">规律：</b>水平平衡时 F₁l₁ ≈ F₂l₂' +
        (hasSame ? '（两侧与同侧都成立）' : '。建议再做 1 组同侧实验对照。');
    } else {
      concl.textContent = '至少记录 3 组水平平衡的两侧数据；再加 1 组同侧更完整。';
    }

    // product bars from last good or last row
    const last = state.records[state.records.length - 1];
    if (last) {
      const max = Math.max(last.M1, last.M2, 1);
      document.getElementById('balProd1').style.width = (100 * last.M1 / max) + '%';
      document.getElementById('balProd2').style.width = (100 * last.M2 / max) + '%';
      document.getElementById('balProd1Lab').textContent = 'F₁l₁ = ' + last.M1.toFixed(2);
      document.getElementById('balProd2Lab').textContent = 'F₂l₂ = ' + last.M2.toFixed(2);
    }
  }

  function toast(msg) {
    const t = document.getElementById('balToast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2200);
  }

  function init() {
    bind();
    renderTable();
    requestAnimationFrame(loop);
    // double-click tray chip to add one on hover grid — also click "挂到高亮格"
    document.getElementById('balDropHere').onclick = () => {
      if (state.hoverGrid) addHook(state.hoverGrid, 1);
      else addHook(4, 1);
    };
  }

  global.BalanceLab = { init };
})(typeof window !== 'undefined' ? window : globalThis);
