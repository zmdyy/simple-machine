/**
 * 动态生活杠杆：按实时力矩判断是否运动，显示力臂/力矩双纵轴曲线。
 * 视频跟踪作为拓展模式，仍由 VideoLab 提供。
 */
(function (global) {
  'use strict';

  const K = global.LeverKernel;
  const S = global.LeverSVG;
  const C = K.COLORS;
  const PX_TO_CM = 0.18;

  const SCENES = [
    { id: 'crowbar', name: '撬棒撬石', f2: 300, start: -5, end: -20, fMin: 20, fMax: 260, fDefault: 120 },
    { id: 'opener', name: '开瓶器', f2: 520, start: 5, end: -30, fMin: 30, fMax: 260, fDefault: 110 },
    { id: 'rod', name: '钓鱼竿提鱼', f2: 25, start: -12, end: -35, fMin: 20, fMax: 180, fDefault: 90 },
    { id: 'door', name: '推门', f2: 75, start: 0, end: -38, fMin: 20, fMax: 220, fDefault: 80 },
  ];

  const state = { idx: 0, force: 120, progress: 0, playing: false, startedAt: 0, lastAt: 0, raf: 0, history: [] };
  const $ = (id) => document.getElementById(id);
  const scene = () => SCENES[state.idx];
  const rad = (d) => d * Math.PI / 180;
  const along = (O, len, a) => K.v(O.x + len * Math.cos(a), O.y + len * Math.sin(a));

  function geometry() {
    const sc = scene();
    const a = rad(sc.start + (sc.end - sc.start) * state.progress);
    let O, p1, p2, bar, d1, d2;
    if (sc.id === 'crowbar') {
      O = K.v(315, 235); p1 = along(O, 360, a); p2 = along(O, -92, a);
      bar = [along(O, -125, a), p1]; d1 = K.v(0, 1); d2 = K.v(0, 1);
    } else if (sc.id === 'opener') {
      O = K.v(315, 235); p1 = along(O, 285, a); p2 = along(O, 48, a);
      bar = [along(O, -22, a), p1]; d1 = K.v(0, -1); d2 = K.v(0, 1);
    } else if (sc.id === 'rod') {
      O = K.v(145, 250); p1 = along(O, 165, a); p2 = along(O, 510, a);
      bar = [O, p2]; d1 = K.v(0, -1); d2 = K.v(0, 1);
    } else {
      O = K.v(175, 245); p1 = along(O, 470, a); p2 = along(O, 250, a);
      bar = [O, p1]; d1 = K.v(0, -1); d2 = K.v(0, 1);
    }
    const arm1 = K.forceArm(O, p1, d1);
    const arm2 = K.forceArm(O, p2, d2);
    const l1cm = arm1.armLen * PX_TO_CM;
    const l2cm = arm2.armLen * PX_TO_CM;
    return {
      O, p1, p2, bar, d1, d2, arm1, arm2, a,
      l1cm, l2cm,
      m1: state.force * l1cm / 100,
      m2: sc.f2 * l2cm / 100,
    };
  }

  function svgText(g, x, y, text, attrs) {
    const n = S.el('text', Object.assign({ x, y, fill: C.ink, 'font-size': 13, 'font-weight': 700 }, attrs || {}), g);
    n.textContent = text;
    return n;
  }

  function drawDecor(g, geo) {
    const sc = scene();
    if (sc.id === 'crowbar') {
      S.el('rect', { x: 274, y: 246, width: 82, height: 38, rx: 5, fill: '#94a3b8', stroke: '#475569' }, g);
      const lift = state.progress * 32;
      S.el('ellipse', { cx: geo.p2.x - 42, cy: geo.p2.y - 24 - lift, rx: 57, ry: 38, fill: '#9ca3af', stroke: '#475569', 'stroke-width': 2 }, g);
      svgText(g, geo.p2.x - 42, geo.p2.y - 20 - lift, '石块', { 'text-anchor': 'middle', fill: '#fff' });
    } else if (sc.id === 'opener') {
      S.el('rect', { x: 268, y: 252, width: 92, height: 68, rx: 16, fill: '#93c5fd', stroke: '#2563eb' }, g);
      S.el('rect', { x: 286, y: 228 - state.progress * 20, width: 58, height: 12, rx: 4, fill: '#94a3b8', stroke: '#334155' }, g);
      svgText(g, 315, 309, '瓶口', { 'text-anchor': 'middle' });
    } else if (sc.id === 'rod') {
      const fishY = 355 - state.progress * 32;
      S.el('line', { x1: geo.p2.x, y1: geo.p2.y, x2: geo.p2.x, y2: fishY - 15, stroke: '#64748b', 'stroke-width': 1.5 }, g);
      S.el('ellipse', { cx: geo.p2.x, cy: fishY, rx: 27, ry: 13, fill: '#a3b88c', stroke: '#475569' }, g);
      S.el('path', { d: `M${geo.p2.x + 25},${fishY} l20,-13 v26 z`, fill: '#a3b88c', stroke: '#475569' }, g);
      svgText(g, geo.O.x - 18, geo.O.y + 42, '腰', { fill: C.muted });
    } else {
      S.el('circle', { cx: geo.O.x, cy: geo.O.y, r: 16, fill: '#64748b' }, g);
      svgText(g, geo.O.x, geo.O.y + 42, '铰链', { 'text-anchor': 'middle', fill: C.muted });
      S.el('path', { d: `M${geo.bar[0].x},${geo.bar[0].y} L${geo.bar[1].x},${geo.bar[1].y}`, stroke: '#d6a96f', 'stroke-width': 62, opacity: 0.42 }, g);
    }
  }

  function renderMechanism() {
    const svg = $('dynLifeSvg');
    if (!svg) return;
    S.ensureDefs(svg); S.clear(svg);
    const geo = geometry();
    drawDecor(svg, geo);
    S.drawBar(svg, geo.bar, { 'stroke-width': scene().id === 'door' ? 12 : 11 });
    S.drawPivot(svg, geo.O);
    S.drawForceArrow(svg, geo.p1, geo.d1, 72, C.F1, `F₁ ${state.force} N`, { O: geo.O });
    S.drawForceLine(svg, geo.p1, geo.d1, 190, C.F1);
    S.drawArm(svg, geo.O, geo.arm1.foot, 'l₁', false, C.arm1, geo.d1);
    S.drawRightAngle(svg, geo.arm1.foot, geo.arm1.armVec, geo.arm1.dir, 8, C.arm1);
    S.drawForceArrow(svg, geo.p2, geo.d2, 64, C.F2, `F₂ ${scene().f2} N`, { O: geo.O });
    S.drawForceLine(svg, geo.p2, geo.d2, 190, C.F2);
    S.drawArm(svg, geo.O, geo.arm2.foot, 'l₂', false, C.arm2, geo.d2);
    S.drawRightAngle(svg, geo.arm2.foot, geo.arm2.armVec, geo.arm2.dir, 8, C.arm2);
    svgText(svg, 400, 28, `${scene().name} · 杠杆角度 ${(geo.a * 180 / Math.PI).toFixed(1)}°`, { 'text-anchor': 'middle', 'font-size': 17 });
    updateReadout(geo);
  }

  function updateReadout(g) {
    const canMove = g.m1 >= g.m2 * 1.02;
    $('dynReadout').innerHTML =
      `<span style="color:${C.F1}">l₁ = ${g.l1cm.toFixed(1)} cm　M₁ = ${g.m1.toFixed(1)} N·m</span><br>` +
      `<span style="color:${C.F2}">l₂ = ${g.l2cm.toFixed(1)} cm　M₂ = ${g.m2.toFixed(1)} N·m</span><br>` +
      `M₁/M₂ = ${(g.m1 / Math.max(0.01, g.m2)).toFixed(2)}`;
    const judge = $('dynJudge');
    judge.className = 'judge-msg ' + (canMove ? 'ok' : 'bad');
    judge.textContent = canMove
      ? '动力矩足够：播放后杠杆会转动，请观察力臂和力矩如何改变。'
      : '动力矩不足：增大力、调整作用点或改变方向才能撬动。';
  }

  function drawChart() {
    const svg = $('dynLifeChart');
    if (!svg) return;
    S.clear(svg);
    const W = 800, H = 190, p = { l: 58, r: 58, t: 24, b: 34 };
    const iw = W - p.l - p.r, ih = H - p.t - p.b;
    S.el('rect', { x: 0, y: 0, width: W, height: H, fill: '#fffef9' }, svg);
    const hist = state.history.length ? state.history : [{ t: 0, ...geometry() }];
    const maxT = Math.max(4, hist[hist.length - 1].t || 0);
    const maxL = Math.max(10, ...hist.map(h => Math.max(h.l1cm || 0, h.l2cm || 0))) * 1.12;
    const maxM = Math.max(5, ...hist.map(h => Math.max(h.m1 || 0, h.m2 || 0))) * 1.12;
    const x = v => p.l + (v / maxT) * iw;
    const yL = v => p.t + ih - (v / maxL) * ih;
    const yM = v => p.t + ih - (v / maxM) * ih;
    for (let i = 0; i <= 4; i++) {
      const yy = p.t + ih * i / 4;
      S.el('line', { x1: p.l, y1: yy, x2: W - p.r, y2: yy, stroke: '#e2e8f0', 'stroke-width': 1 }, svg);
      svgText(svg, p.l - 8, yy + 4, (maxL * (1 - i / 4)).toFixed(0), { 'text-anchor': 'end', 'font-size': 10, fill: C.muted });
      svgText(svg, W - p.r + 8, yy + 4, (maxM * (1 - i / 4)).toFixed(0), { 'font-size': 10, fill: C.muted });
    }
    for (let i = 0; i <= 4; i++) {
      const xx = p.l + iw * i / 4;
      S.el('line', { x1: xx, y1: p.t, x2: xx, y2: p.t + ih, stroke: '#f1f5f9' }, svg);
      svgText(svg, xx, H - 12, (maxT * i / 4).toFixed(1), { 'text-anchor': 'middle', 'font-size': 10, fill: C.muted });
    }
    S.el('line', { x1: p.l, y1: p.t, x2: p.l, y2: p.t + ih, stroke: '#334155', 'stroke-width': 1.5 }, svg);
    S.el('line', { x1: p.l, y1: p.t + ih, x2: W - p.r, y2: p.t + ih, stroke: '#334155', 'stroke-width': 1.5 }, svg);
    S.el('line', { x1: W - p.r, y1: p.t, x2: W - p.r, y2: p.t + ih, stroke: '#334155', 'stroke-width': 1.5 }, svg);
    svgText(svg, 14, 16, '力臂 l/cm', { 'font-size': 11, fill: C.muted });
    svgText(svg, W - 6, 16, '力矩 M/(N·m)', { 'text-anchor': 'end', 'font-size': 11, fill: C.muted });
    svgText(svg, 400, H - 4, '时间 t/s', { 'text-anchor': 'middle', 'font-size': 11, fill: C.muted });
    function path(key, yFn, color, dash) {
      if (hist.length < 2) return;
      const d = hist.map((h, i) => `${i ? 'L' : 'M'}${x(h.t).toFixed(1)},${yFn(h[key]).toFixed(1)}`).join(' ');
      S.el('path', { d, fill: 'none', stroke: color, 'stroke-width': dash ? 2 : 3, 'stroke-dasharray': dash || null }, svg);
    }
    path('l1cm', yL, C.F1); path('l2cm', yL, C.F2);
    path('m1', yM, C.F1, '6 4'); path('m2', yM, C.F2, '6 4');
    svgText(svg, 238, 16, '红实线 l₁  蓝实线 l₂  虚线 M₁/M₂', { 'font-size': 11, fill: C.muted });
  }

  function tick(now) {
    if (!state.playing) return;
    if (!state.lastAt) state.lastAt = now;
    const dt = Math.min(0.05, (now - state.lastAt) / 1000);
    state.lastAt = now;
    const before = geometry();
    if (before.m1 >= before.m2 * 1.02) {
      const ratio = Math.min(2, before.m1 / Math.max(0.01, before.m2));
      state.progress = Math.min(1, state.progress + dt * (0.16 + 0.15 * (ratio - 1)));
    }
    const g = geometry();
    const t = (now - state.startedAt) / 1000;
    const last = state.history[state.history.length - 1];
    if (!last || t - last.t >= 0.05) state.history.push({ t, l1cm: g.l1cm, l2cm: g.l2cm, m1: g.m1, m2: g.m2 });
    renderMechanism(); drawChart();
    if (state.progress >= 1 || t >= 8) {
      state.playing = false; $('dynPlay').textContent = '再次演示';
      return;
    }
    state.raf = requestAnimationFrame(tick);
  }

  function reset() {
    cancelAnimationFrame(state.raf);
    state.playing = false; state.progress = 0; state.history = []; state.lastAt = 0;
    $('dynPlay').textContent = '开始演示';
    renderMechanism(); drawChart();
  }

  function showLife() {
    $('dynLifePanel').hidden = false; $('dynLifeSide').hidden = false;
    $('vidAdvancedToolbar').hidden = true; $('vidSeesawPanel').hidden = true; $('vidImportPanel').hidden = true; $('vidLegacySide').hidden = true;
    $('dynModeLife').classList.add('active-toggle'); $('dynModeTrack').classList.remove('active-toggle');
  }

  function showTracking() {
    state.playing = false; cancelAnimationFrame(state.raf);
    $('dynLifePanel').hidden = true; $('dynLifeSide').hidden = true;
    $('vidAdvancedToolbar').hidden = false; $('vidLegacySide').hidden = false;
    $('dynModeLife').classList.remove('active-toggle'); $('dynModeTrack').classList.add('active-toggle');
    if (global.VideoLab && VideoLab.setMode) VideoLab.setMode('import');
    else {
      $('vidSeesawPanel').hidden = true; $('vidImportPanel').hidden = false;
    }
  }

  function init() {
    if (global.VideoLab && VideoLab.init) VideoLab.init();
    $('dynSceneChips').innerHTML = SCENES.map((s, i) => `<button type="button" class="chip${i === 0 ? ' active' : ''}" data-dyn="${i}">${s.name}</button>`).join('');
    $('dynSceneChips').onclick = (e) => {
      const b = e.target.closest('[data-dyn]'); if (!b) return;
      state.idx = +b.dataset.dyn; state.force = scene().fDefault;
      $('dynForce').min = scene().fMin; $('dynForce').max = scene().fMax; $('dynForce').value = state.force; $('dynForceOut').textContent = state.force + ' N';
      document.querySelectorAll('[data-dyn]').forEach(x => x.classList.toggle('active', x === b)); reset();
    };
    $('dynForce').oninput = (e) => { state.force = +e.target.value; $('dynForceOut').textContent = state.force + ' N'; if (!state.playing) { renderMechanism(); drawChart(); } };
    $('dynPlay').onclick = () => {
      if (state.playing) { state.playing = false; cancelAnimationFrame(state.raf); $('dynPlay').textContent = '继续演示'; return; }
      if (state.progress >= 1) reset();
      state.playing = true; state.startedAt = performance.now() - (state.history.length ? state.history[state.history.length - 1].t * 1000 : 0); state.lastAt = 0;
      $('dynPlay').textContent = '暂停'; state.raf = requestAnimationFrame(tick);
    };
    $('dynReset').onclick = reset; $('dynModeLife').onclick = showLife; $('dynModeTrack').onclick = showTracking;
    state.force = scene().fDefault; $('dynForce').value = state.force; $('dynForceOut').textContent = state.force + ' N';
    showLife(); reset();
  }

  global.DynamicLifeLab = { init, render: renderMechanism, showTracking };
})(typeof window !== 'undefined' ? window : globalThis);
