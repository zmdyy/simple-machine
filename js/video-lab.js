/**
 * 视频叠力臂：同一 LeverKernel
 * - 课眼：跷跷板 θ(t) → l(t)/M(t)（重力竖直，力臂随倾角变）
 * - 导入：本地视频 + 三点标定，叠加跟 video.currentTime
 */
(function (global) {
  'use strict';

  const K = global.LeverKernel;
  const S = global.LeverSVG;
  const C = K.COLORS;

  const SEE_W = 800;
  const SEE_H = 320;
  const CHART_H = 168;

  const BODY_PRESETS = {
    calf: {
      name: '踮脚',
      taskBody:
        '侧拍踮脚：暂停后依次标点。\n' +
        '① 前脚掌着地（几乎不移）→ O\n' +
        '② 脚跟 / 跟腱向上拉处 → 动力点\n' +
        '③ 踝部（体重竖直向下作用线）→ 阻力点\n' +
        '标定后勾选「杆身轮廓贴板」，播放看 l(t)、θ(t)。',
      step: {
        O: '① 前脚掌 O',
        P1: '② 跟腱拉力点',
        P2: '③ 踝 / 体重线',
        done: '已标定 · 可播放',
      },
      judge: {
        start: '导入侧拍踮脚视频。① 前脚掌着地几乎不移 → O。',
        afterO: '已标 O。下一步：② 脚跟/跟腱向上拉处。',
        afterP1: '已标动力点。下一步：③ 踝部体重竖直线附近，或「跳过阻力点」。',
        afterP2: '三点已齐。播放时脚骨段绕 O 转，作用点半径不变。',
        loaded: '视频已载入。按踮脚口令：先点前脚掌 O。',
      },
    },
    curl: {
      name: '举哑铃（肘）',
      taskBody:
        '侧拍屈肘举哑铃：只析肘关节。\n' +
        '① 肘关节枢纽 → O\n' +
        '② 肱二头肌拉力作用处（前臂骨上）\n' +
        '③ 握点 / 哑铃重心（重力竖直向下）\n' +
        '三点标在骨段/握点上，不要点衣服。',
      step: {
        O: '① 肘关节 O',
        P1: '② 肌拉力点',
        P2: '③ 握点 / 哑铃',
        done: '已标定 · 可播放',
      },
      judge: {
        start: '导入侧拍屈肘视频。① 肘关节 → O。',
        afterO: '已标 O。下一步：② 前臂上肌拉力作用处。',
        afterP1: '已标动力点。下一步：③ 握点或哑铃重心，或跳过阻力点。',
        afterP2: '三点已齐。前臂绕肘 O 转，看力臂随角度变化。',
        loaded: '视频已载入。按屈肘口令：先点肘关节 O。',
      },
    },
    neck: {
      name: '低头 / 抬头',
      taskBody:
        '侧拍头颈屈伸。\n' +
        '① 耳屏附近枢椎枢纽 → O\n' +
        '② 颈后肌拉力作用处\n' +
        '③ 头部重心（重力竖直向下）\n' +
        '慢低头再抬头，标在头颈骨段上。',
      step: {
        O: '① 耳屏 / 枢椎 O',
        P1: '② 颈后肌拉力点',
        P2: '③ 头重心',
        done: '已标定 · 可播放',
      },
      judge: {
        start: '导入侧拍头颈视频。① 耳屏附近枢纽 → O。',
        afterO: '已标 O。下一步：② 颈后肌拉力处。',
        afterP1: '已标动力点。下一步：③ 头部重心，或跳过阻力点。',
        afterP2: '三点已齐。头绕 O 转，观察 l₁ 随头位变化。',
        loaded: '视频已载入。按头颈口令：先点枢纽 O。',
      },
    },
    lift: {
      name: '弯腰 vs 蹲抬',
      taskBody:
        '侧拍同一重物两种搬法（可先标一种）。\n' +
        '① 髋关节枢纽 → O\n' +
        '② 腰背肌拉力作用处（躯干骨上）\n' +
        '③ 躯干/货物重心（重力竖直向下）\n' +
        '对照直腿弯腰与屈膝蹲抬时力臂差异。',
      step: {
        O: '① 髋关节 O',
        P1: '② 腰背肌拉力点',
        P2: '③ 躯干 / 货重心',
        done: '已标定 · 可播放',
      },
      judge: {
        start: '导入侧拍搬物视频。① 髋关节 → O。',
        afterO: '已标 O。下一步：② 腰背肌拉力作用处。',
        afterP1: '已标动力点。下一步：③ 躯干或货物重心，或跳过阻力点。',
        afterP2: '三点已齐。对照弯腰与蹲抬时 l₁、l₂ 谁更大。',
        loaded: '视频已载入。按搬物口令：先点髋关节 O。',
      },
    },
  };

  let state = {
    mode: 'seesaw', // seesaw | import
    playing: false,
    t0: 0,
    t: 0,
    ampDeg: 22,
    period: 4,
    rL: 160,
    rR: 140,
    mL: 2.0,
    mR: 2.5,
    g: 9.8,
    history: [], // {t, thDeg, lL, lR, ML, MR} 或导入 {t,lL,lR}
    markPhase: 'O', // O | P1 | P2 | done
    marks: { O: null, P1: null, P2: null },
    templates: { O: null, P1: null, P2: null },
    rigid: null, // 标定后：锁 O + 沿板弧长 s1/s2（半径约束）
    boardProfile: null, // 标定杆身一维 RGB 轮廓，不限颜色
    boardHalfT: 40,
    videoUrl: null,
    raf: 0,
    trackCanvas: null,
    lastTrackT: -1,
    trackScale: 1,
    trackFps: 0,
    trackVel: { O: { x: 0, y: 0 }, P1: { x: 0, y: 0 }, P2: { x: 0, y: 0 } },
    trackConfidence: { O: 0, P1: 0, P2: 0 },
    _fpsT: 0,
    _fpsN: 0,
    frameCbId: 0,
    bodyPreset: null,
  };

  function bodyPresetCfg() {
    return state.bodyPreset ? BODY_PRESETS[state.bodyPreset] : null;
  }

  function markStepText(phase) {
    const p = bodyPresetCfg();
    if (p && p.step) {
      if (phase === 'O') return p.step.O;
      if (phase === 'P1') return p.step.P1;
      if (phase === 'P2') return p.step.P2;
      return p.step.done;
    }
    if (phase === 'O') return '① 点支点 O';
    if (phase === 'P1') return '② 点动力作用点';
    if (phase === 'P2') return '③ 点阻力作用点';
    return '已标定 · 可播放';
  }

  function applyBodyPreset(id) {
    const preset = BODY_PRESETS[id];
    if (!preset) return;
    state.bodyPreset = id;
    setMode('import');
    state.marks = { O: null, P1: null, P2: null };
    state.templates = { O: null, P1: null, P2: null };
    state.rigid = null;
    state.boardProfile = null;
    state.history = [];
    state.markPhase = 'O';
    state.lastTrackT = -1;
    $('vidMarkStep').textContent = markStepText('O');
    $('vidTaskBody').textContent = preset.taskBody;
    $('vidJudge').textContent = preset.judge.start;
    $('vidJudge').className = 'judge-msg';
    requestAnimationFrame(() => {
      syncOverlaySize();
      drawVideoOverlay();
    });
  }

  function $(id) {
    return document.getElementById(id);
  }

  function thetaAt(t) {
    const A = (state.ampDeg * Math.PI) / 180;
    const w = (2 * Math.PI) / state.period;
    return A * Math.sin(w * t);
  }

  /** 板坐标：θ 为相对水平，屏坐标 y 向下 */
  function alongBoard(O, r, th) {
    return { x: O.x + r * Math.cos(th), y: O.y + r * Math.sin(th) };
  }

  function seesawSnapshot(t) {
    const O = { x: 400, y: 200 };
    const th = thetaAt(t);
    const pL = alongBoard(O, -state.rL, th);
    const pR = alongBoard(O, state.rR, th);
    const dirG = { x: 0, y: 1 };
    const armL = K.forceArm(O, pL, dirG);
    const armR = K.forceArm(O, pR, dirG);
    const FL = state.mL * state.g;
    const FR = state.mR * state.g;
    // 力矩：竖直向下力，符号用内核（屏坐标）
    const ML = Math.abs(K.torque2D(O, pL, { x: 0, y: FL }));
    const MR = Math.abs(K.torque2D(O, pR, { x: 0, y: FR }));
    return {
      O: O,
      th: th,
      thDeg: (th * 180) / Math.PI,
      pL: pL,
      pR: pR,
      armL: armL,
      armR: armR,
      FL: FL,
      FR: FR,
      ML: ML,
      MR: MR,
      tipL: alongBoard(O, -220, th),
      tipR: alongBoard(O, 220, th),
    };
  }

  function pushHistory(snap) {
    state.history.push({
      t: state.t,
      thDeg: snap.thDeg,
      lL: snap.armL.armLen,
      lR: snap.armR.armLen,
      ML: snap.ML,
      MR: snap.MR,
    });
    if (state.history.length > 240) state.history.shift();
  }

  function drawSeesaw(snap) {
    const svg = $('vidSeesawSvg');
    if (!svg) return;
    S.ensureDefs(svg);
    const gBoard = svg.querySelector('#vidSeesawBoard');
    const gDraw = svg.querySelector('#vidSeesawDraw');
    S.clear(gBoard);
    S.clear(gDraw);

    // 支架
    S.drawFulcrumStand(gBoard, snap.O);
    // 板
    S.el('line', {
      x1: snap.tipL.x, y1: snap.tipL.y, x2: snap.tipR.x, y2: snap.tipR.y,
      stroke: '#475569', 'stroke-width': 14, 'stroke-linecap': 'round',
    }, gBoard);
    S.el('line', {
      x1: snap.tipL.x, y1: snap.tipL.y, x2: snap.tipR.x, y2: snap.tipR.y,
      stroke: '#94a3b8', 'stroke-width': 8, 'stroke-linecap': 'round',
    }, gBoard);

    // 两人（简化坐姿块）
    function seat(p, color, tag) {
      S.el('rect', {
        x: p.x - 14, y: p.y - 28, width: 28, height: 26, rx: 4,
        fill: color, opacity: 0.9, stroke: '#0f172a', 'stroke-width': 1.25,
      }, gBoard);
      S.el('circle', {
        cx: p.x, cy: p.y - 36, r: 9,
        fill: '#fecaca', stroke: '#0f172a', 'stroke-width': 1,
      }, gBoard);
      S.el('text', {
        x: p.x, y: p.y + 18,
        fill: color, 'font-size': 12, 'font-weight': 700,
        'text-anchor': 'middle',
      }, gBoard).textContent = tag;
    }
    seat(snap.pL, C.F2, '左');
    seat(snap.pR, C.F1, '右');

    // 内核作图：重力竖直 + 力臂
    S.drawPivot(gDraw, snap.O);
    S.drawForceArmConstruction(gDraw, svg, {
      O: snap.O,
      point: snap.pL,
      dir: { x: 0, y: 1 },
      forcePx: 55,
      which: 'F2',
      labelF: 'G左',
      labelL: 'l左',
      step: 5,
    });
    S.drawForceArmConstruction(gDraw, svg, {
      O: snap.O,
      point: snap.pR,
      dir: { x: 0, y: 1 },
      forcePx: 55,
      which: 'F1',
      labelF: 'G右',
      labelL: 'l右',
      step: 5,
    });

    // θ 标注
    S.el('text', {
      x: 400, y: 36,
      fill: C.ink, 'font-size': 14, 'font-weight': 700,
      'text-anchor': 'middle',
      'font-family': 'Noto Sans SC, system-ui, sans-serif',
    }, gDraw).textContent =
      'θ = ' + snap.thDeg.toFixed(1) + '°　重力始终竖直 → 力臂 = |r·cosθ|';
  }

  function drawChart(svgId) {
    const svg = $(svgId || (state.mode === 'import' ? 'vidImportChartSvg' : 'vidChartSvg'));
    if (!svg) return;
    S.clear(svg);
    const W = 800;
    const H = CHART_H;
    const pad = { l: 44, r: 16, t: 12, b: 22 };
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;

    S.el('rect', {
      x: 0, y: 0, width: W, height: H, fill: '#fffef9',
    }, svg);
    S.el('text', {
      x: pad.l, y: 14, fill: C.muted, 'font-size': 11,
    }, svg).textContent =
      state.mode === 'import'
        ? '导入视频：红 l₁ · 蓝 l₂（纵轴随数据缩放）· 灰虚线 θ'
        : 'l(t) 力臂（实线）· M(t) 力矩示意（虚线）随时间';

    const hist = state.history;
    if (hist.length < 2) return;

    const t0 = hist[0].t;
    const t1 = hist[hist.length - 1].t;
    const dt = Math.max(0.01, t1 - t0);
    let minL = Infinity;
    let maxL = -Infinity;
    let minTh = Infinity;
    let maxTh = -Infinity;
    let maxM = 1;
    hist.forEach((h) => {
      if (h.lL != null) {
        minL = Math.min(minL, h.lL);
        maxL = Math.max(maxL, h.lL);
      }
      if (h.lR != null) {
        minL = Math.min(minL, h.lR);
        maxL = Math.max(maxL, h.lR);
      }
      if (h.thDeg != null) {
        minTh = Math.min(minTh, h.thDeg);
        maxTh = Math.max(maxTh, h.thDeg);
      }
      maxM = Math.max(maxM, h.ML || 0, h.MR || 0);
    });
    if (!isFinite(minL)) {
      minL = 0;
      maxL = 1;
    }
    const spanL = Math.max(12, maxL - minL);
    const padL = spanL * 0.22;
    minL = Math.max(0, minL - padL);
    maxL = maxL + padL;
    const hasTh = isFinite(minTh);
    if (hasTh) {
      const spanTh = Math.max(8, maxTh - minTh);
      minTh -= spanTh * 0.15;
      maxTh += spanTh * 0.15;
    }

    function xOf(t) {
      return pad.l + ((t - t0) / dt) * iw;
    }
    function yL(v) {
      return pad.t + 8 + ih - 8 - ((v - minL) / Math.max(1e-6, maxL - minL)) * (ih - 8);
    }
    function yTh(v) {
      return pad.t + 8 + ih - 8 - ((v - minTh) / Math.max(1e-6, maxTh - minTh)) * (ih - 8);
    }
    function yM(v) {
      return pad.t + ih - (v / maxM) * ih;
    }

    // 明确坐标轴、刻度和网格，避免曲线只有形状没有量的含义
    for (let i = 0; i <= 4; i++) {
      const yy = pad.t + ih * i / 4;
      const lv = maxL - (maxL - minL) * i / 4;
      S.el('line', { x1: pad.l, y1: yy, x2: W - pad.r, y2: yy, stroke: '#e2e8f0', 'stroke-width': 1 }, svg);
      S.el('text', { x: pad.l - 6, y: yy + 4, fill: C.muted, 'font-size': 9, 'text-anchor': 'end' }, svg).textContent = lv.toFixed(0);
    }
    for (let i = 0; i <= 4; i++) {
      const xx = pad.l + iw * i / 4;
      const tv = t0 + dt * i / 4;
      S.el('line', { x1: xx, y1: pad.t, x2: xx, y2: pad.t + ih, stroke: '#f1f5f9', 'stroke-width': 1 }, svg);
      S.el('text', { x: xx, y: H - 12, fill: C.muted, 'font-size': 9, 'text-anchor': 'middle' }, svg).textContent = tv.toFixed(1);
    }
    S.el('line', { x1: pad.l, y1: pad.t, x2: pad.l, y2: pad.t + ih, stroke: '#334155', 'stroke-width': 1.4 }, svg);
    S.el('line', { x1: pad.l, y1: pad.t + ih, x2: W - pad.r, y2: pad.t + ih, stroke: '#334155', 'stroke-width': 1.4 }, svg);
    S.el('text', { x: 5, y: pad.t + 9, fill: C.muted, 'font-size': 10 }, svg).textContent = state.mode === 'import' ? '力臂 l/px' : '力臂 l/cm';
    S.el('text', { x: W / 2, y: H - 1, fill: C.muted, 'font-size': 10, 'text-anchor': 'middle' }, svg).textContent = '时间 t/s';

    function poly(key, yfn, color, dash, width) {
      let started = false;
      const parts = [];
      hist.forEach((h) => {
        if (h[key] == null) return;
        const cmd = started ? 'L' : 'M';
        started = true;
        parts.push(cmd + xOf(h.t).toFixed(1) + ',' + yfn(h[key]).toFixed(1));
      });
      if (!parts.length) return;
      S.el('path', {
        d: parts.join(' '),
        fill: 'none',
        stroke: color,
        'stroke-width': width || (dash ? 1.5 : 3),
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
        'stroke-dasharray': dash || null,
      }, svg);
    }

    if (hasTh) poly('thDeg', yTh, '#64748b', '5 4', 1.75);
    poly('lL', yL, C.F2, null, 3.25);
    poly('lR', yL, C.F1, null, 3.25);
    if (state.mode === 'seesaw') {
      poly('ML', yM, C.F2, '4 3', 1.75);
      poly('MR', yM, C.F1, '4 3', 1.75);
    }

    const xNow = xOf(hist[hist.length - 1].t);
    S.el('line', {
      x1: xNow, y1: pad.t, x2: xNow, y2: pad.t + ih,
      stroke: '#0f766e', 'stroke-width': 1.5,
    }, svg);
  }

  function updateSeesawReadout(snap) {
    const el = $('vidReadout');
    if (!el) return;
    const pxToCm = 0.25;
    el.innerHTML =
      `<span class="arm">θ ≈ ${snap.thDeg.toFixed(1)}°</span><br>` +
      `l<sub>左</sub> ≈ ${(snap.armL.armLen * pxToCm).toFixed(1)}　` +
      `l<sub>右</sub> ≈ ${(snap.armR.armLen * pxToCm).toFixed(1)}（示意 cm）<br>` +
      `M<sub>左</sub> ≈ ${snap.ML.toFixed(0)}　M<sub>右</sub> ≈ ${snap.MR.toFixed(0)}（示意）<br>` +
      `<b style="color:#0f766e">板一倾斜，力臂变短 —— 与「实验要调水平」同一句话</b>`;
  }

  function tickSeesaw(now) {
    if (!state.playing || state.mode !== 'seesaw') return;
    if (!state.t0) state.t0 = now;
    state.t = (now - state.t0) / 1000;
    const snap = seesawSnapshot(state.t);
    pushHistory(snap);
    drawSeesaw(snap);
    drawChart();
    updateSeesawReadout(snap);
    state.raf = requestAnimationFrame(tickSeesaw);
  }

  function renderSeesawOnce() {
    const snap = seesawSnapshot(state.t);
    drawSeesaw(snap);
    drawChart();
    updateSeesawReadout(snap);
  }

  // —— 导入视频 ——
  function videoEl() {
    return $('vidPlayer');
  }

  function overlaySvg() {
    return $('vidOverlaySvg');
  }

  function ensureTrackCanvas() {
    if (!state.trackCanvas) state.trackCanvas = document.createElement('canvas');
    return state.trackCanvas;
  }

  /** object-fit:contain 时，视频实际画面在元素内的矩形 */
  function videoContentBox() {
    const v = videoEl();
    const rect = v.getBoundingClientRect();
    const vw = v.videoWidth || 1;
    const vh = v.videoHeight || 1;
    const scale = Math.min(rect.width / vw, rect.height / vh);
    const dw = vw * scale;
    const dh = vh * scale;
    return {
      scale: scale,
      offX: (rect.width - dw) / 2,
      offY: (rect.height - dh) / 2,
      dispW: dw,
      dispH: dh,
      rect: rect,
      vw: vw,
      vh: vh,
    };
  }

  function syncOverlaySize() {
    const v = videoEl();
    const wrap = $('vidOverlayWrap');
    const stage = $('vidStageWrap');
    const svg = overlaySvg();
    if (!v || !wrap || !stage || !v.videoWidth) return;
    const sr = stage.getBoundingClientRect();
    const box = videoContentBox();
    wrap.style.left = (box.rect.left - sr.left + box.offX) + 'px';
    wrap.style.top = (box.rect.top - sr.top + box.offY) + 'px';
    wrap.style.width = box.dispW + 'px';
    wrap.style.height = box.dispH + 'px';
    // 关键：viewBox 与视频像素 1:1，避免固定 16:9 导致「光标 ≠ 标点」
    if (svg) {
      svg.setAttribute('viewBox', '0 0 ' + v.videoWidth + ' ' + v.videoHeight);
      svg.setAttribute('preserveAspectRatio', 'none');
    }
  }

  function videoToSvg(p) {
    // 与视频像素同一坐标系
    return { x: p.x, y: p.y };
  }

  function clientToVideo(evt) {
    const box = videoContentBox();
    const x = (evt.clientX - box.rect.left - box.offX) / box.scale;
    const y = (evt.clientY - box.rect.top - box.offY) / box.scale;
    return {
      x: Math.max(0, Math.min(box.vw - 1, x)),
      y: Math.max(0, Math.min(box.vh - 1, y)),
    };
  }

  /** 缩放到最长边 ≤ 640，整帧只 getImageData 一次；兼顾轻量与定位精度。 */
  function grabTrackFrame() {
    const v = videoEl();
    if (!v || !v.videoWidth) return null;
    const maxSide = 640;
    const scale = Math.min(1, maxSide / Math.max(v.videoWidth, v.videoHeight));
    state.trackScale = scale;
    const tw = Math.max(1, Math.round(v.videoWidth * scale));
    const th = Math.max(1, Math.round(v.videoHeight * scale));
    const c = ensureTrackCanvas();
    if (c.width !== tw || c.height !== th) {
      c.width = tw;
      c.height = th;
    }
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(v, 0, 0, tw, th);
    return {
      data: ctx.getImageData(0, 0, tw, th).data,
      w: tw,
      h: th,
      scale: scale,
    };
  }

  function toTrack(p) {
    const s = state.trackScale || 1;
    return { x: p.x * s, y: p.y * s };
  }

  function fromTrack(p) {
    const s = state.trackScale || 1;
    return { x: p.x / s, y: p.y / s };
  }

  function captureTemplate(key, pVid) {
    const fr = grabTrackFrame();
    if (!fr) return;
    const p = toTrack(pVid);
    const r = 14;
    const x0 = Math.max(0, Math.round(p.x - r));
    const y0 = Math.max(0, Math.round(p.y - r));
    const x1 = Math.min(fr.w - 1, Math.round(p.x + r));
    const y1 = Math.min(fr.h - 1, Math.round(p.y + r));
    const tw = x1 - x0 + 1;
    const th = y1 - y0 + 1;
    if (tw < 6 || th < 6) return;
    const buf = new Uint8Array(tw * th * 3);
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let n = 0;
    let i = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const j = (y * fr.w + x) * 4;
        const R = fr.data[j];
        const G = fr.data[j + 1];
        const B = fr.data[j + 2];
        buf[i++] = R;
        buf[i++] = G;
        buf[i++] = B;
        sr += R;
        sg += G;
        sb += B;
        n++;
      }
    }
    const gray = new Uint8Array(tw * th);
    let gm = 0;
    for (let k = 0, q = 0; k < buf.length; k += 3, q++) {
      gray[q] = Math.round(0.299 * buf[k] + 0.587 * buf[k + 1] + 0.114 * buf[k + 2]);
      gm += gray[q];
    }
    gm /= gray.length;
    let gv = 0;
    for (let q = 0; q < gray.length; q++) gv += (gray[q] - gm) * (gray[q] - gm);
    state.templates[key] = {
      rgb: buf,
      gray,
      w: tw,
      h: th,
      mean: { r: sr / n, g: sg / n, b: sb / n },
      grayMean: gm,
      grayNorm: Math.sqrt(gv) || 1,
    };
  }

  /** 零均值归一化相关：比 RGB 绝对差更耐光照变化。 */
  function nccAt(fr, tpl, cx, cy) {
    const hw = (tpl.w / 2) | 0, hh = (tpl.h / 2) | 0;
    const x0 = (cx - hw) | 0, y0 = (cy - hh) | 0;
    if (x0 < 0 || y0 < 0 || x0 + tpl.w > fr.w || y0 + tpl.h > fr.h) return -1;
    let sum = 0, n = 0;
    for (let y = 0; y < tpl.h; y += 2) for (let x = 0; x < tpl.w; x += 2) {
      const j = ((y0 + y) * fr.w + x0 + x) * 4;
      sum += 0.299 * fr.data[j] + 0.587 * fr.data[j + 1] + 0.114 * fr.data[j + 2]; n++;
    }
    const mean = sum / Math.max(1, n);
    let num = 0, da = 0, db = 0;
    for (let y = 0; y < tpl.h; y += 2) for (let x = 0; x < tpl.w; x += 2) {
      const j = ((y0 + y) * fr.w + x0 + x) * 4;
      const a = tpl.gray[y * tpl.w + x] - tpl.grayMean;
      const b = (0.299 * fr.data[j] + 0.587 * fr.data[j + 1] + 0.114 * fr.data[j + 2]) - mean;
      num += a * b; da += a * a; db += b * b;
    }
    return da > 1 && db > 1 ? num / Math.sqrt(da * db) : -1;
  }

  function sadAt(fr, tpl, cx, cy) {
    const halfW = (tpl.w / 2) | 0;
    const halfH = (tpl.h / 2) | 0;
    const x0 = (cx - halfW) | 0;
    const y0 = (cy - halfH) | 0;
    if (x0 < 0 || y0 < 0 || x0 + tpl.w > fr.w || y0 + tpl.h > fr.h) return Infinity;
    const td = tpl.rgb;
    const fd = fr.data;
    const fw = fr.w;
    let sad = 0;
    let ti = 0;
    // 隔点采样，再快一倍
    for (let y = 0; y < tpl.h; y += 2) {
      let fi = ((y0 + y) * fw + x0) * 4;
      for (let x = 0; x < tpl.w; x += 2) {
        const tbase = (y * tpl.w + x) * 3;
        sad += Math.abs(td[tbase] - fd[fi]) +
          Math.abs(td[tbase + 1] - fd[fi + 1]) +
          Math.abs(td[tbase + 2] - fd[fi + 2]);
        fi += 8;
        ti++;
        if (sad > 1e9) return sad;
      }
    }
    // 颜色均值门禁：外观差太多直接丢弃
    void ti;
    return sad;
  }

  function meanAt(fr, cx, cy, r) {
    const x0 = Math.max(0, (cx - r) | 0);
    const y0 = Math.max(0, (cy - r) | 0);
    const x1 = Math.min(fr.w - 1, (cx + r) | 0);
    const y1 = Math.min(fr.h - 1, (cy + r) | 0);
    let sr = 0;
    let sg = 0;
    let sb = 0;
    let n = 0;
    const fd = fr.data;
    const fw = fr.w;
    for (let y = y0; y <= y1; y += 2) {
      for (let x = x0; x <= x1; x += 2) {
        const j = (y * fw + x) * 4;
        sr += fd[j];
        sg += fd[j + 1];
        sb += fd[j + 2];
        n++;
      }
    }
    return n ? { r: sr / n, g: sg / n, b: sb / n } : null;
  }

  /** 运动预测 + NCC 粗搜/精搜；低置信度时宁可保持，不让点位乱跳。 */
  function trackOne(key, prevVid, fr) {
    const tpl = state.templates[key];
    if (!tpl || !prevVid || !fr) return prevVid;
    const prev = toTrack(prevVid);
    const halfW = (tpl.w / 2) | 0;
    const halfH = (tpl.h / 2) | 0;
    const vel = state.trackVel[key] || { x: 0, y: 0 };
    const search = key === 'O' ? 22 : 46;
    const cx0 = Math.round(prev.x + vel.x * (state.trackScale || 1));
    const cy0 = Math.round(prev.y + vel.y * (state.trackScale || 1));

    function searchRange(step, rad, aroundX, aroundY) {
      let best = -Infinity;
      let second = -Infinity;
      let bx = aroundX;
      let by = aroundY;
      const sx0 = Math.max(halfW, aroundX - rad);
      const sy0 = Math.max(halfH, aroundY - rad);
      const sx1 = Math.min(fr.w - halfW - 1, aroundX + rad);
      const sy1 = Math.min(fr.h - halfH - 1, aroundY + rad);
      for (let cy = sy0; cy <= sy1; cy += step) {
        for (let cx = sx0; cx <= sx1; cx += step) {
          const score = nccAt(fr, tpl, cx, cy);
          if (score > best) {
            second = best;
            best = score;
            bx = cx;
            by = cy;
          } else if (score > second) {
            second = score;
          }
        }
      }
      return { x: bx, y: by, score: best, second };
    }

    const coarse = searchRange(3, search, cx0, cy0);
    const fine = searchRange(1, 4, coarse.x, coarse.y);
    // 颜色校验：精搜点与模板均值差太大则放弃
    const m = meanAt(fr, fine.x, fine.y, 6);
    if (m) {
      const cd =
        Math.abs(m.r - tpl.mean.r) +
        Math.abs(m.g - tpl.mean.g) +
        Math.abs(m.b - tpl.mean.b);
      if (cd > 150) return prevVid;
    }
    const confidence = fine.score;
    state.trackConfidence[key] = confidence;
    if (confidence < 0.50) {
      state.trackVel[key].x *= 0.55; state.trackVel[key].y *= 0.55;
      return prevVid;
    }
    const found = fromTrack({ x: fine.x, y: fine.y });
    state.trackVel[key] = {
      x: 0.65 * vel.x + 0.35 * (found.x - prevVid.x),
      y: 0.65 * vel.y + 0.35 * (found.y - prevVid.y),
    };
    return found;
  }

  function lumAt(fr, x, y) {
    if (x < 0 || y < 0 || x >= fr.w || y >= fr.h) return null;
    const j = (y * fr.w + x) * 4;
    return 0.3 * fr.data[j] + 0.59 * fr.data[j + 1] + 0.11 * fr.data[j + 2];
  }

  /** 沿过 O 的直线取 RGB 轮廓（条带平均）。任意杆色都适用。 */
  function extractProfile(fr, O, theta, halfT, step) {
    const o = toTrack(O);
    const ca = Math.cos(theta);
    const sa = Math.sin(theta);
    const px = -sa;
    const py = ca;
    const out = [];
    for (let t = -halfT; t <= halfT; t += step) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let w = -1; w <= 1; w++) {
        const x = Math.round(o.x + t * ca + w * px);
        const y = Math.round(o.y + t * sa + w * py);
        if (x < 1 || y < 1 || x >= fr.w - 1 || y >= fr.h - 1) continue;
        const j = (y * fr.w + x) * 4;
        r += fr.data[j];
        g += fr.data[j + 1];
        b += fr.data[j + 2];
        n++;
      }
      if (n) {
        out.push(r / n, g / n, b / n);
      }
    }
    return out;
  }

  function profileNCC(a, b) {
    const n = Math.min(a.length, b.length);
    if (n < 24) return 0;
    const off = Math.floor((Math.max(a.length, b.length) - n) / 2);
    const aLong = a.length >= b.length;
    let ma = 0;
    let mb = 0;
    for (let i = 0; i < n; i++) {
      const ia = aLong ? i + off : i;
      const ib = aLong ? i : i + off;
      const wa = 0.35 + 0.65 * Math.sin((Math.PI * (i + 0.5)) / n);
      ma += wa * a[ia];
      mb += wa * b[ib];
    }
    let wsum = 0;
    for (let i = 0; i < n; i++) wsum += 0.35 + 0.65 * Math.sin((Math.PI * (i + 0.5)) / n);
    ma /= wsum;
    mb /= wsum;
    let num = 0;
    let da = 0;
    let db = 0;
    for (let i = 0; i < n; i++) {
      const ia = aLong ? i + off : i;
      const ib = aLong ? i : i + off;
      const wa = 0.35 + 0.65 * Math.sin((Math.PI * (i + 0.5)) / n);
      const xa = a[ia] - ma;
      const xb = b[ib] - mb;
      num += wa * xa * xb;
      da += wa * xa * xa;
      db += wa * xb * xb;
    }
    if (da < 1e-3 || db < 1e-3) return 0;
    return num / Math.sqrt(da * db);
  }

  /** 垂直于杆的亮度差：细长杆高，大片地面低 */
  function edgeEnergy(fr, O, theta, halfT, step) {
    const o = toTrack(O);
    const ca = Math.cos(theta);
    const sa = Math.sin(theta);
    const px = -sa;
    const py = ca;
    const w = 4;
    let e = 0;
    let n = 0;
    for (let t = -halfT; t <= halfT; t += step) {
      const x0 = Math.round(o.x + t * ca);
      const y0 = Math.round(o.y + t * sa);
      const x1 = Math.round(o.x + t * ca + w * px);
      const y1 = Math.round(o.y + t * sa + w * py);
      const x2 = Math.round(o.x + t * ca - w * px);
      const y2 = Math.round(o.y + t * sa - w * py);
      const L0 = lumAt(fr, x0, y0);
      const L1 = lumAt(fr, x1, y1);
      const L2 = lumAt(fr, x2, y2);
      if (L0 == null || L1 == null || L2 == null) continue;
      e += Math.abs(L1 - L0) + Math.abs(L2 - L0);
      n++;
    }
    return n ? e / n : 0;
  }

  function clickAxisTheta(O, P1, P2) {
    const a1 = Math.atan2(P1.y - O.y, P1.x - O.x);
    if (!P2) return a1;
    const sgn = (P2.x - O.x) * Math.cos(a1) + (P2.y - O.y) * Math.sin(a1);
    const a2 = Math.atan2(
      (sgn >= 0 ? 1 : -1) * (P2.y - O.y),
      (sgn >= 0 ? 1 : -1) * (P2.x - O.x)
    );
    return Math.atan2(Math.sin(a1) + Math.sin(a2), Math.cos(a1) + Math.cos(a2));
  }

  function clampAngleStep(prev, next, maxDeg) {
    let d = next - prev;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    const max = (maxDeg * Math.PI) / 180;
    if (d > max) d = max;
    if (d < -max) d = -max;
    return prev + d;
  }

  /** 用标定轮廓的 NCC + 横向边缘能量估 θ，不依赖黄/蓝分类。 */
  function estimateBoardTheta(O, P1, P2, hintOverride) {
    const hint = hintOverride != null ? hintOverride : clickAxisTheta(O, P1, P2);
    const fr = grabTrackFrame();
    if (!fr || !state.boardProfile) return hint;
    const halfT = state.boardHalfT;
    const step = 2;
    const tpl = state.boardProfile;
    function scoreAngle(a) {
      const prof = extractProfile(fr, O, a, halfT, step);
      const ncc = profileNCC(prof, tpl);
      const edge = edgeEnergy(fr, O, a, halfT, step);
      return ncc * 100 + Math.min(18, edge * 0.08);
    }
    let best = -Infinity;
    let bestA = hint;
    const hintScore = scoreAngle(hint);
    best = hintScore;
    const span = hintOverride != null ? 16 : 6;
    for (let d = -span; d <= span; d += 2) {
      if (d === 0) continue;
      const a = hint + (d * Math.PI) / 180;
      const score = scoreAngle(a);
      if (score > best) {
        best = score;
        bestA = a;
      }
    }
    const nccBest = profileNCC(extractProfile(fr, O, bestA, halfT, step), tpl);
    if (nccBest < 0.42) return hint;
    return bestA;
  }

  function onBoard(O, s, theta) {
    return {
      x: O.x + s * Math.cos(theta),
      y: O.y + s * Math.sin(theta),
    };
  }

  /** 标定后：锁 O，把点击投影到过 O 的板轴上，记下沿板有符号距离 s */
  function bakeRigid() {
    const O = state.marks.O;
    const P1 = state.marks.P1;
    const P2 = state.marks.P2;
    if (!O || !P1) {
      state.rigid = null;
      state.boardProfile = null;
      return;
    }
    const theta = clickAxisTheta(O, P1, P2);
    const fr = grabTrackFrame();
    const spanPx = Math.max(
      Math.hypot(P1.x - O.x, P1.y - O.y),
      P2 ? Math.hypot(P2.x - O.x, P2.y - O.y) : 0
    );
    state.boardHalfT = Math.max(20, spanPx * (state.trackScale || 1) * 0.82);
    state.boardProfile = fr ? extractProfile(fr, O, theta, state.boardHalfT, 2) : null;
    const ux = Math.cos(theta);
    const uy = Math.sin(theta);
    const s1 = (P1.x - O.x) * ux + (P1.y - O.y) * uy;
    const s2 = P2 ? (P2.x - O.x) * ux + (P2.y - O.y) * uy : null;
    state.rigid = {
      lockO: { x: O.x, y: O.y },
      theta: theta,
      bakeTheta: theta,
      s1: s1,
      s2: s2,
    };
    state.marks.O = { x: O.x, y: O.y };
    state.marks.P1 = onBoard(O, s1, theta);
    captureTemplate('P1', state.marks.P1);
    if (s2 != null) {
      state.marks.P2 = onBoard(O, s2, theta);
      captureTemplate('P2', state.marks.P2);
    }
  }

  /** 跟踪只提供 θ 线索；作用点 = O + s·(cosθ, sinθ)，左右共用一个 θ */
  function applyRigidConstraint() {
    const rigidOn = !$('vidRigidOn') || $('vidRigidOn').checked;
    if (!rigidOn || !state.rigid || !state.marks.O) return;
    const O = state.rigid.lockO;
    state.marks.O = { x: O.x, y: O.y };

    const prevTheta = state.rigid.theta;
    let theta = estimateBoardTheta(O, state.marks.P1, state.marks.P2, prevTheta);
    theta = clampAngleStep(prevTheta, theta, 4);
    state.rigid.theta = theta;
    state.marks.P1 = onBoard(O, state.rigid.s1, theta);
    if (state.rigid.s2 != null) {
      state.marks.P2 = onBoard(O, state.rigid.s2, theta);
    }
  }

  function trackAllMarks() {
    const trackOn = $('vidTrackOn');
    if (trackOn && !trackOn.checked) return false;
    if (!(state.marks.O && state.marks.P1)) return false;
    const v = videoEl();
    if (!v || v.paused) return false;

    const fr = grabTrackFrame();
    if (!fr) return false;

    const rigidOn = !$('vidRigidOn') || $('vidRigidOn').checked;
    // 贴板开启后用杆身轮廓估 θ，作用点由 O+s 还原
    if (!(state.rigid && rigidOn)) {
      if (state.templates.O) {
        state._oSkip = (state._oSkip || 0) + 1;
        if (state._oSkip % 3 === 0) {
          state.marks.O = trackOne('O', state.marks.O, fr);
        }
      }
      if (state.templates.P1) {
        state.marks.P1 = trackOne('P1', state.marks.P1, fr);
      }
      if (state.marks.P2 && state.templates.P2) {
        state.marks.P2 = trackOne('P2', state.marks.P2, fr);
      }
    }
    applyRigidConstraint();

    const now = performance.now();
    state._fpsN++;
    if (now - state._fpsT > 500) {
      state.trackFps = Math.round((state._fpsN * 1000) / (now - state._fpsT));
      state._fpsN = 0;
      state._fpsT = now;
    }
    return true;
  }

  function pushImportHistory() {
    const v = videoEl();
    const m = state.marks;
    if (!v || !m.O || !m.P1) return;
    const dirG = { x: 0, y: 1 };
    const a1 = K.forceArm(m.O, m.P1, dirG);
    const a2 = m.P2 ? K.forceArm(m.O, m.P2, dirG) : null;
    const t = v.currentTime;
    const thDeg = state.rigid ? (state.rigid.theta * 180) / Math.PI : null;
    const last = state.history[state.history.length - 1];
    if (last && Math.abs(last.t - t) < 0.04) {
      last.lR = a1.armLen;
      last.lL = a2 ? a2.armLen : null;
      last.thDeg = thDeg;
      return;
    }
    state.history.push({
      t: t,
      thDeg: thDeg,
      lR: a1.armLen,
      lL: a2 ? a2.armLen : null,
      ML: null,
      MR: null,
    });
    if (state.history.length > 300) state.history.shift();
  }

  function overlayPx() {
    const box = videoContentBox();
    return Math.min(3.8, box.scale > 0.05 ? 1 / box.scale : 3);
  }

  function haloText(g, x, y, text, fill, fontSize, extra) {
    const base = {
      x: x, y: y,
      'font-size': fontSize,
      'font-weight': 800,
      'font-family': 'Noto Sans SC, Microsoft YaHei, sans-serif',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
    };
    if (extra) Object.keys(extra).forEach(function (k) { base[k] = extra[k]; });
    S.el('text', Object.assign({}, base, {
      fill: '#fff', stroke: '#fff', 'stroke-width': Math.max(3, fontSize * 0.22),
      'paint-order': 'stroke',
    }), g).textContent = text;
    S.el('text', Object.assign({}, base, { fill: fill }), g).textContent = text;
  }

  function drawOverlayForce(g, svg, O, point, which, labelF, labelL, forcePx, u) {
    const color = which === 'F2' ? C.F2 : C.F1;
    const armColor = which === 'F2' ? C.arm2 : C.arm1;
    const dirG = { x: 0, y: 1 };
    S.el('circle', {
      cx: point.x, cy: point.y, r: 11 * u,
      fill: '#fff', stroke: color, 'stroke-width': 3.2 * u,
    }, g);
    S.el('circle', { cx: point.x, cy: point.y, r: 4.2 * u, fill: color }, g);
    haloText(g, point.x + (point.x >= O.x ? 22 * u : -22 * u), point.y - 16 * u,
      which === 'F2' ? '阻力点' : '动力点', color, 13 * u);
    S.drawForceArrow(g, point, dirG, forcePx, color, labelF, {
      O: O, scale: u, labelOffset: 36 * u,
    });
    S.drawForceLine(g, point, dirG, Math.max(220 * u, forcePx * 2.2), color, u);
    const fa = K.forceArm(O, point, dirG);
    if (fa.armLen > 6 * u) {
      S.drawArm(g, O, fa.foot, labelL, false, armColor, dirG, u);
      S.drawRightAngle(g, fa.foot, fa.armVec, fa.dir, 8 * u, armColor);
    }
  }

  function drawVideoOverlay() {
    const svg = overlaySvg();
    const v = videoEl();
    if (!svg || !v) return;
    syncOverlaySize();
    S.ensureDefs(svg);
    S.clear(svg);
    const m = state.marks;
    if (!m.O) return;

    const u = overlayPx();
    const O = videoToSvg(m.O);
    S.drawPivot(svg, O, 'O', u);
    haloText(svg, O.x, O.y + 22 * u, '支点', '#111827', 14 * u);

    const forcePx = Math.max(48 * u, Math.min(72 * u, (v.videoHeight || 400) * 0.08));
    if (m.P2) {
      drawOverlayForce(svg, svg, O, videoToSvg(m.P2), 'F2', 'F₂', 'l₂', forcePx, u);
    }
    if (m.P1) {
      drawOverlayForce(svg, svg, O, videoToSvg(m.P1), 'F1', 'F₁', 'l₁', forcePx, u);
    }

    const el = $('vidReadout');
    const dirG = { x: 0, y: 1 };
    if (el && m.P1) {
      const a1 = K.forceArm(m.O, m.P1, dirG);
      const a2 = m.P2 ? K.forceArm(m.O, m.P2, dirG) : null;
      const tracking = $('vidTrackOn') && $('vidTrackOn').checked;
      const rigid = state.rigid && (!$('vidRigidOn') || $('vidRigidOn').checked);
      el.innerHTML =
        `t = ${(v.currentTime || 0).toFixed(2)} s` +
        (v.paused ? '（暂停）' : '（播放中）') +
        (state.trackFps ? ` · 跟踪 ≈ ${state.trackFps} fps` : '') + '<br>' +
        `置信度：${Math.round(100 * (state.trackConfidence.P1 || 0))}%<br>` +
        `l₁ ≈ ${a1.armLen.toFixed(1)} px` +
        (a2 ? `　l₂ ≈ ${a2.armLen.toFixed(1)} px` : '') + '<br>' +
        (rigid
          ? '<b style="color:#0f766e">刚体约束：O 锁定，作用点贴在板上绕 O 转（半径不变）</b>'
          : tracking
            ? '<span style="color:#b45309">未开刚体约束时，点会跟人走、离开杠杆</span>'
            : '<span style="color:#b45309">未开跟踪</span>');
    }
  }

  function tickImport() {
    const v = videoEl();
    if (state.mode !== 'import' || !v || v.paused) {
      $('vidPlay').textContent = '播放';
      state.frameCbId = 0;
      return;
    }
    trackAllMarks();
    pushImportHistory();
    drawVideoOverlay();
    // 曲线降频，减轻主线程压力
    state._chartSkip = (state._chartSkip || 0) + 1;
    if (state._chartSkip % 3 === 0) drawChart('vidImportChartSvg');

    if (typeof v.requestVideoFrameCallback === 'function') {
      state.frameCbId = v.requestVideoFrameCallback(() => tickImport());
    } else {
      state.raf = requestAnimationFrame(tickImport);
    }
  }

  function stopImportLoop() {
    const v = videoEl();
    cancelAnimationFrame(state.raf);
    if (v && state.frameCbId && typeof v.cancelVideoFrameCallback === 'function') {
      try { v.cancelVideoFrameCallback(state.frameCbId); } catch (e) { /* ignore */ }
    }
    state.frameCbId = 0;
  }

  function setMode(mode) {
    state.mode = mode;
    state.playing = false;
    stopImportLoop();
    cancelAnimationFrame(state.raf);
    const see = $('vidSeesawPanel');
    const imp = $('vidImportPanel');
    if (see) {
      if (mode === 'seesaw') see.removeAttribute('hidden');
      else see.setAttribute('hidden', '');
    }
    if (imp) {
      if (mode === 'import') imp.removeAttribute('hidden');
      else imp.setAttribute('hidden', '');
    }
    const sc = $('vidSeesawControls');
    if (sc) {
      if (mode === 'seesaw') sc.removeAttribute('hidden');
      else sc.setAttribute('hidden', '');
    }
    $('vidMarkStep').textContent =
      mode === 'seesaw' ? '跷跷板 · θ(t)' : markStepText(state.markPhase === 'done' ? 'done' : state.markPhase);
    document.querySelectorAll('[data-vid-mode]').forEach((b) => {
      b.classList.toggle('active-toggle', b.dataset.vidMode === mode);
    });
    $('vidPlay').textContent = '播放';
    if (mode === 'seesaw') {
      state.history = [];
      state.t = 0;
      state.t0 = 0;
      renderSeesawOnce();
      $('vidTaskBody').textContent =
        '课眼：两人相对板坐下时，沿板距离几乎不变，但重力永远竖直。' +
        '板一倾斜，力臂变成 |r·cosθ|——和「杠杆平衡实验要调水平」是同一句话。' +
        '点播放，看 l(t)、M(t) 跟着变。';
      $('vidJudge').textContent = '先看跷跷板课眼：播放后观察力臂随 θ 变短变长。';
      $('vidJudge').className = 'judge-msg';
    } else {
      const bp = bodyPresetCfg();
      $('vidTaskBody').textContent = bp
        ? bp.taskBody
        : '暂停画面后依次点在杠杆上：① 支点 O（枢纽）② 动力侧座位与板的接触处 ③ 阻力侧接触处。\n' +
          '不要点衣服。标定后记下杆身轮廓（不限黄杆/蓝杆），播放时用轮廓匹配估倾角，作用点绕 O 转。';
      $('vidJudge').textContent = bp
        ? bp.judge.start
        : '请选择视频。三点都要点在杆上，不要点人。';
      $('vidMarkStep').textContent = markStepText(state.markPhase === 'done' ? 'done' : state.markPhase);
      $('vidJudge').className = 'judge-msg';
      $('vidReadout').innerHTML = '尚未载入视频。<br>点「选择视频」后，在杆上点 O 与两个接触点。';
      requestAnimationFrame(() => {
        syncOverlaySize();
        drawVideoOverlay();
      });
    }
  }

  function onMarkClick(evt) {
    if (state.mode !== 'import') return;
    const v = videoEl();
    if (!v || !v.videoWidth) {
      $('vidJudge').textContent = '请先选择并加载视频。';
      $('vidJudge').className = 'judge-msg bad';
      return;
    }
    if (!v.paused) v.pause();
    const p = clientToVideo(evt);
    const phase = state.markPhase;
    const bp = bodyPresetCfg();
    if (phase === 'O') {
      state.marks.O = p;
      captureTemplate('O', p);
      state.markPhase = 'P1';
      $('vidJudge').textContent = bp
        ? bp.judge.afterO
        : '已标 O（枢纽中心）。下一步：点右侧「座位与板的接触处」，不要点衣服。';
      $('vidJudge').className = 'judge-msg ok';
    } else if (phase === 'P1') {
      state.marks.P1 = p;
      captureTemplate('P1', p);
      state.markPhase = 'P2';
      $('vidJudge').textContent = bp
        ? bp.judge.afterP1
        : '已标动力点。下一步：点左侧座位与板的接触处，或点「跳过阻力点」。';
      $('vidJudge').className = 'judge-msg ok';
    } else if (phase === 'P2') {
      state.marks.P2 = p;
      captureTemplate('P2', p);
      state.markPhase = 'done';
      state.history = [];
      bakeRigid();
      $('vidJudge').textContent = bp
        ? bp.judge.afterP2
        : '三点已齐，作用点已投影到板上。播放时绕 O 转（半径不变），不要跟人走。';
      $('vidJudge').className = 'judge-msg ok';
    }
    $('vidMarkStep').textContent = markStepText(state.markPhase);
    drawVideoOverlay();
  }

  function bind() {
    document.querySelectorAll('[data-vid-mode]').forEach((b) => {
      b.addEventListener('click', () => setMode(b.dataset.vidMode));
    });

    $('vidPlay').addEventListener('click', () => {
      if (state.mode === 'seesaw') {
        if (state.playing) {
          state.playing = false;
          cancelAnimationFrame(state.raf);
          $('vidPlay').textContent = '播放';
        } else {
          state.playing = true;
          state.t0 = performance.now() - state.t * 1000;
          $('vidPlay').textContent = '暂停';
          state.raf = requestAnimationFrame(tickSeesaw);
        }
      } else {
        const v = videoEl();
        if (!v.src) return;
        if (v.paused) {
          if (!(state.marks.O && state.marks.P1)) {
            $('vidJudge').textContent = '请先标定 O 与动力点，再播放。';
            $('vidJudge').className = 'judge-msg bad';
            return;
          }
          // 从当前帧刷新模板，避免暂停太久后外观变化
          if (state.marks.O) captureTemplate('O', state.marks.O);
          if (state.marks.P1) captureTemplate('P1', state.marks.P1);
          if (state.marks.P2) captureTemplate('P2', state.marks.P2);
          state.lastTrackT = -1;
          state._fpsT = performance.now();
          state._fpsN = 0;
          v.play();
          $('vidPlay').textContent = '暂停';
          stopImportLoop();
          if (typeof v.requestVideoFrameCallback === 'function') {
            state.frameCbId = v.requestVideoFrameCallback(() => tickImport());
          } else {
            state.raf = requestAnimationFrame(tickImport);
          }
        } else {
          v.pause();
          $('vidPlay').textContent = '播放';
          stopImportLoop();
        }
      }
    });

    $('vidReset').addEventListener('click', () => {
      state.playing = false;
      stopImportLoop();
      cancelAnimationFrame(state.raf);
      state.t = 0;
      state.t0 = 0;
      state.history = [];
      $('vidPlay').textContent = '播放';
      if (state.mode === 'seesaw') renderSeesawOnce();
      else {
        const v = videoEl();
        if (v) {
          v.pause();
          v.currentTime = 0;
        }
        drawVideoOverlay();
        drawChart('vidImportChartSvg');
      }
    });

    $('vidAmp').addEventListener('input', (e) => {
      state.ampDeg = Number(e.target.value);
      $('vidAmpOut').textContent = state.ampDeg + '°';
      if (!state.playing) renderSeesawOnce();
    });
    $('vidPeriod').addEventListener('input', (e) => {
      state.period = Number(e.target.value);
      $('vidPeriodOut').textContent = state.period.toFixed(1) + ' s';
    });

    const file = $('vidFile');
    if (file) {
      file.addEventListener('change', () => {
        const f = file.files && file.files[0];
        if (!f) return;
        if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
        state.videoUrl = URL.createObjectURL(f);
        const v = videoEl();
        v.src = state.videoUrl;
        v.load();
        state.marks = { O: null, P1: null, P2: null };
        state.templates = { O: null, P1: null, P2: null };
        state.trackVel = { O: { x: 0, y: 0 }, P1: { x: 0, y: 0 }, P2: { x: 0, y: 0 } };
        state.trackConfidence = { O: 0, P1: 0, P2: 0 };
        state.rigid = null;
        state.boardProfile = null;
        state.history = [];
        state.markPhase = 'O';
        state.lastTrackT = -1;
        $('vidMarkStep').textContent = markStepText('O');
        $('vidJudge').textContent = '正在加载视频…';
        $('vidJudge').className = 'judge-msg';
        $('vidReadout').textContent = '文件：' + f.name;
        const onReady = () => {
          syncOverlaySize();
          drawVideoOverlay();
          const bp = bodyPresetCfg();
          $('vidJudge').textContent = bp
            ? bp.judge.loaded + '（' + v.videoWidth + '×' + v.videoHeight + '）'
            : '视频已载入（' + v.videoWidth + '×' + v.videoHeight + '）。请在画面上点支点 O。';
          $('vidJudge').className = 'judge-msg ok';
          $('vidReadout').innerHTML =
            '已载入：' + f.name + '<br>分辨率 ' + v.videoWidth + '×' + v.videoHeight;
        };
        v.onloadeddata = onReady;
        v.onloadedmetadata = syncOverlaySize;
        v.onerror = () => {
          $('vidJudge').textContent = '视频无法解码。请换 MP4（H.264）再试。';
          $('vidJudge').className = 'judge-msg bad';
        };
      });
    }

    $('vidRemark').addEventListener('click', () => {
      state.marks = { O: null, P1: null, P2: null };
      state.templates = { O: null, P1: null, P2: null };
      state.trackVel = { O: { x: 0, y: 0 }, P1: { x: 0, y: 0 }, P2: { x: 0, y: 0 } };
      state.trackConfidence = { O: 0, P1: 0, P2: 0 };
      state.rigid = null;
      state.boardProfile = null;
      state.history = [];
      state.markPhase = 'O';
      state.lastTrackT = -1;
      $('vidMarkStep').textContent = markStepText('O');
      const bp = bodyPresetCfg();
      $('vidJudge').textContent = bp ? bp.judge.start : '请重新标点。';
      drawVideoOverlay();
      drawChart('vidImportChartSvg');
    });
    $('vidSkipP2').addEventListener('click', () => {
      if (state.markPhase === 'P2' || state.marks.P1) {
        state.marks.P2 = null;
        state.templates.P2 = null;
        state.markPhase = 'done';
        state.history = [];
        bakeRigid();
        $('vidMarkStep').textContent = markStepText('done');
        $('vidJudge').textContent = '已跳过阻力点。单侧按「到 O 半径不变」约束。';
        drawVideoOverlay();
      }
    });

    const v = videoEl();
    if (v) {
      v.addEventListener('pause', () => {
        if (state.mode === 'import') $('vidPlay').textContent = '播放';
      });
      v.addEventListener('ended', () => {
        cancelAnimationFrame(state.raf);
        $('vidPlay').textContent = '播放';
      });
      v.addEventListener('click', onMarkClick);
    }

    window.addEventListener('resize', syncOverlaySize);
  }

  function init() {
    bind();
    setMode('seesaw');
  }

  global.VideoLab = { init: init, render: renderSeesawOnce, applyBodyPreset: applyBodyPreset, setMode: setMode };
})(typeof window !== 'undefined' ? window : globalThis);
