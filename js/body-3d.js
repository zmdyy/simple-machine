/**
 * BodyParts3D / Z-Anatomy 3D 查看器 + 关节刚体姿态 + 力臂叠加
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const LOCAL_GLB = 'assets/anatomy/body.glb';
const CDN_GLB =
  'https://cdn.jsdelivr.net/gh/hpfrei/body-anatomy-3d-viewer@main/public/body.glb';
const DRACO_PATH = 'assets/anatomy/draco/';

const MAT = {
  bone: { color: 0xf2e6d0, roughness: 0.55, metalness: 0.05 },
  muscle: { color: 0xc45c5c, roughness: 0.62, metalness: 0.08 },
  other: { color: 0xb8a99a, roughness: 0.7, metalness: 0.02 },
  dim: 0.22,
  focus: 1,
};

let state = {
  ready: false,
  loading: false,
  error: null,
  actionId: 'calf',
  t: 0.45,
  showBone: true,
  showMuscle: true,
  explode: 0,
  step: 1,
  practice: false,
  overlay: { showO: false, showF: false, showArm: false, showBar: false },
};

let scene, camera, renderer, controls, root, modelRoot;
let meshes = [];
let pivots = {};
let kneePivot = null;
let overlayGroup;
let clock;
let raf = 0;
let raycaster, pointer;
let onPick = null;
let statusEl = null;
let stageEl = null;
let canvasEl = null;
let resizeObs = null;

const R = () => window.AnatomyRigs;
const K = () => window.LeverKernel;

function setStatus(msg) {
  statusEl = statusEl || document.getElementById('body3dStatus');
  if (statusEl) statusEl.textContent = msg || '';
}

function setBoot(visible, title, msg, hint) {
  const boot = document.getElementById('body3dBoot');
  if (!boot) return;
  if (!visible) {
    boot.hidden = true;
    return;
  }
  boot.hidden = false;
  const t = document.getElementById('body3dBootTitle');
  const m = document.getElementById('body3dBootMsg');
  const h = document.getElementById('body3dBootHint');
  if (t && title) t.textContent = title;
  if (m && msg) m.textContent = msg;
  if (h && hint != null) h.innerHTML = hint;
}

function classifyType(obj) {
  const t = (obj.userData && obj.userData.type) || '';
  if (t === 'bone' || t === 'muscle') return t;
  const n = (obj.name || '').toLowerCase();
  if (/muscle|tendon|aponeurosis|retinaculum|bursa/.test(n)) return 'muscle';
  if (/bone|vertebra|femur|tibia|fibula|humerus|radius|ulna|scapula|ilium|sacrum|cranium|atlas|calcane|talus|metatars|phalanx|rib|sternum|patella|occipital|parietal|frontal|temporal/.test(n))
    return 'bone';
  return 'other';
}

function applyStudioMaterial(mesh) {
  const type = classifyType(mesh);
  mesh.userData.anatType = type;
  const base = MAT[type] || MAT.other;
  const mat = new THREE.MeshStandardMaterial({
    color: base.color,
    roughness: base.roughness,
    metalness: base.metalness,
    side: THREE.DoubleSide,
  });
  if (mesh.material && mesh.material.map) mat.map = mesh.material.map;
  mesh.userData.baseMat = mat;
  mesh.material = mat;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
}

function meshCenter(obj) {
  obj.updateWorldMatrix(true, false);
  const box = new THREE.Box3().setFromObject(obj);
  return box.getCenter(new THREE.Vector3());
}

function findMeshes(patterns, sidePrefer) {
  const hit = [];
  for (const m of meshes) {
    const name = m.name || '';
    const detail = (m.userData && (m.userData.nameDetail || m.userData.name)) || '';
    if (!R().matchAny(name, patterns) && !R().matchAny(detail, patterns)) continue;
    hit.push(m);
  }
  if (sidePrefer) {
    const pref = hit.filter((m) => R().preferSide(m.name));
    if (pref.length) return pref;
  }
  return hit;
}

function centerOfMeshes(list) {
  if (!list.length) return null;
  const c = new THREE.Vector3();
  list.forEach((m) => c.add(meshCenter(m)));
  return c.multiplyScalar(1 / list.length);
}

function makeCtx(t) {
  return {
    t,
    pivotWorld: pivots[state.actionId]
      ? pivots[state.actionId].getWorldPosition(new THREE.Vector3())
      : new THREE.Vector3(),
    v(x, y, z) {
      return new THREE.Vector3(x, y, z);
    },
    dir(from, to) {
      return to.clone().sub(from).normalize();
    },
    centerOf(patterns) {
      return centerOfMeshes(findMeshes(patterns, true));
    },
  };
}

function clearPivots() {
  Object.keys(pivots).forEach((id) => {
    const p = pivots[id];
    if (!p) return;
    while (p.children.length) {
      const ch = p.children[0];
      root.attach(ch);
    }
    if (p.parent) p.parent.remove(p);
  });
  pivots = {};
  if (kneePivot) {
    while (kneePivot.children.length) root.attach(kneePivot.children[0]);
    if (kneePivot.parent) kneePivot.parent.remove(kneePivot);
    kneePivot = null;
  }
  meshes.forEach((m) => {
    m.userData.homePos = m.position.clone();
    m.userData.homeQuat = m.quaternion.clone();
  });
}

function buildPivotFor(actionId) {
  const rig = R().RIGS[actionId];
  if (!rig || !modelRoot) return;

  clearPivots();

  const pivotSources = findMeshes(rig.pivotFrom, true);
  let pivotPos = centerOfMeshes(pivotSources);
  if (!pivotPos) {
    const focus = findMeshes(rig.focusPatterns, true);
    pivotPos = centerOfMeshes(focus) || new THREE.Vector3();
  }

  const pivot = new THREE.Object3D();
  pivot.name = 'pivot_' + actionId;
  pivot.position.copy(pivotPos);
  root.add(pivot);

  const movable = findMeshes(rig.movable, false);
  movable.forEach((m) => {
    // 避免把枢轴骨本身绑进会转的组导致漂移：枢轴参考网格仍可高亮但不强制排除
    pivot.attach(m);
  });
  pivots[actionId] = pivot;

  if (actionId === 'lift' && rig.kneeMovable) {
    const kneeSources = findMeshes([/patella(?!\.)/i, /tibial plateau/i, /lateral condyle of femur/i], true);
    let kp = centerOfMeshes(kneeSources);
    if (!kp) kp = pivotPos.clone().add(new THREE.Vector3(0, -0.35, 0.05));
    kneePivot = new THREE.Object3D();
    kneePivot.name = 'pivot_knee';
    kneePivot.position.copy(kp);
    root.add(kneePivot);
    findMeshes(rig.kneeMovable, false).forEach((m) => kneePivot.attach(m));
  }
}

function setPose(actionId, t) {
  state.actionId = actionId;
  state.t = t;
  const rig = R().RIGS[actionId];
  if (!rig) return;

  if (!pivots[actionId]) buildPivotFor(actionId);
  const pivot = pivots[actionId];
  if (!pivot) return;

  pivot.rotation.set(0, 0, 0);
  if (kneePivot) kneePivot.rotation.set(0, 0, 0);

  if (actionId === 'lift') {
    if (t < 0.5) {
      const lean = (t / 0.5) * 0.85;
      if (rig.axis === 'x') pivot.rotation.x = lean;
      else pivot.rotation.z = lean;
    } else {
      const squat = (t - 0.5) / 0.5;
      if (rig.axis === 'x') pivot.rotation.x = 0.25 * (1 - squat);
      else pivot.rotation.z = 0.25 * (1 - squat);
      if (kneePivot) kneePivot.rotation.x = squat * 0.9;
    }
  } else {
    const ang = THREE.MathUtils.lerp(rig.angleMin, rig.angleMax, t);
    if (rig.axis === 'x') pivot.rotation.x = ang;
    else if (rig.axis === 'y') pivot.rotation.y = ang;
    else pivot.rotation.z = ang;
    // 踮脚：脚跟抬起方向与模型轴向可能相反，取负
    if (actionId === 'calf') pivot.rotation.x = -ang;
    if (actionId === 'neck') pivot.rotation.x = ang;
  }

  applyFocusDim();
  drawOverlay3D();
}

function applyFocusDim() {
  const rig = R().RIGS[state.actionId];
  const focus = rig ? rig.focusPatterns : null;
  const hiMus = rig ? rig.highlightMuscle : null;

  meshes.forEach((m) => {
    const type = m.userData.anatType || classifyType(m);
    const show =
      (type === 'bone' && state.showBone) ||
      (type === 'muscle' && state.showMuscle) ||
      (type === 'other' && state.showBone);
    m.visible = !!show;
    if (!show) return;

    const mat = m.userData.baseMat || m.material;
    if (!mat || !mat.color) return;

    let opacity = MAT.dim;
    const name = m.name || '';
    const detail = (m.userData && (m.userData.nameDetail || m.userData.name)) || '';
    const inFocus = focus && (R().matchAny(name, focus) || R().matchAny(detail, focus));
    const hi = hiMus && (R().matchAny(name, hiMus) || R().matchAny(detail, hiMus));
    if (inFocus) opacity = MAT.focus;
    if (hi) {
      opacity = 1;
      mat.emissive = new THREE.Color(0x3a1010);
      mat.emissiveIntensity = 0.25;
    } else {
      mat.emissive = new THREE.Color(0x000000);
      mat.emissiveIntensity = 0;
    }
    mat.transparent = opacity < 0.99;
    mat.opacity = opacity;
    mat.depthWrite = opacity > 0.5;
  });
}

function applyExplode(amount) {
  state.explode = amount;
  const k = amount / 100;
  meshes.forEach((m) => {
    if (!m.userData.restWorld) return;
    // 仅对未挂在关节下的、或爆炸时相对根偏移
    if (m.parent && m.parent.name && m.parent.name.indexOf('pivot_') === 0) return;
    const rest = m.userData.restLocal;
    const out = m.userData.explodeDir;
    if (!rest || !out) return;
    m.position.copy(rest).addScaledVector(out, k * 0.55);
  });
}

function storeRestPose() {
  const origin = new THREE.Vector3();
  meshes.forEach((m) => {
    m.userData.restLocal = m.position.clone();
    const c = meshCenter(m);
    const dir = c.clone().sub(origin);
    if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
    else dir.normalize();
    m.userData.explodeDir = dir;
    m.userData.restWorld = c;
  });
}

function flyToAction(actionId) {
  const rig = R().RIGS[actionId];
  if (!rig || !camera || !controls) return;
  const p = rig.camera.position;
  const t = rig.camera.target;
  camera.position.set(p[0], p[1], p[2]);
  controls.target.set(t[0], t[1], t[2]);
  camera.fov = rig.camera.fov || 42;
  camera.updateProjectionMatrix();
  controls.update();
}

function worldToSvg(v3) {
  if (!camera || !canvasEl) return { x: 400, y: 210 };
  const w = canvasEl.clientWidth || 1;
  const h = canvasEl.clientHeight || 1;
  const v = v3.clone().project(camera);
  return {
    x: ((v.x + 1) / 2) * 800,
    y: ((1 - v.y) / 2) * 420,
    behind: v.z > 1,
  };
}

function dirToSvg(dir3) {
  // 世界方向 → 屏坐标增量（y 向下）
  const o = new THREE.Vector3(0, 0, 0);
  const a = worldToSvg(o);
  const b = worldToSvg(o.clone().add(dir3.clone().normalize()));
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

function getLandmarks() {
  const rig = R().RIGS[state.actionId];
  if (!rig || !state.ready) return null;
  const ctx = makeCtx(state.t);
  const L = rig.landmarks(ctx);
  const O = worldToSvg(L.O);
  const p1 = worldToSvg(L.p1);
  const p2 = worldToSvg(L.p2);
  const d1 = dirToSvg(L.d1);
  const d2 = dirToSvg(L.d2);
  // 重力在世界向下 → SVG y+
  const g = dirToSvg(new THREE.Vector3(0, -1, 0));
  return {
    O: { x: O.x, y: O.y },
    p1: { x: p1.x, y: p1.y },
    p2: { x: p2.x, y: p2.y },
    d1,
    d2: { x: g.x, y: Math.abs(g.y) > 0.2 ? (g.y > 0 ? 1 : -1) : 1 },
    f2: L.f2,
    bar: (L.bar || []).map((p) => {
      const s = worldToSvg(p);
      return { x: s.x, y: s.y };
    }),
    stageName: L.stageName,
    world: L,
  };
}

function clearOverlay3D() {
  if (!overlayGroup) return;
  while (overlayGroup.children.length) {
    const c = overlayGroup.children.pop();
    if (c.geometry) c.geometry.dispose();
    if (c.material) c.material.dispose();
  }
}

function addArrow(from, dir, len, color) {
  const to = from.clone().add(dir.clone().normalize().multiplyScalar(len));
  const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
  const line = new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.95 })
  );
  line.renderOrder = 10;
  overlayGroup.add(line);
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.012, 0.03, 10),
    new THREE.MeshBasicMaterial({ color, depthTest: false })
  );
  head.position.copy(to);
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  head.renderOrder = 11;
  overlayGroup.add(head);
}

function drawOverlay3D() {
  clearOverlay3D();
  if (!state.ready || !overlayGroup) return;
  const L = getLandmarks();
  if (!L || !L.world) return;
  const W = L.world;
  const ov = state.overlay;

  if (ov.showO) {
    const sph = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x111827, depthTest: false })
    );
    sph.position.copy(W.O);
    sph.renderOrder = 12;
    overlayGroup.add(sph);
  }
  if (ov.showBar && W.bar && W.bar.length >= 2) {
    const geo = new THREE.BufferGeometry().setFromPoints(W.bar);
    const line = new THREE.Line(
      geo,
      new THREE.LineDashedMaterial({
        color: 0xf59e0b, dashSize: 0.03, gapSize: 0.02, depthTest: false,
      })
    );
    line.computeLineDistances();
    line.renderOrder = 9;
    overlayGroup.add(line);
  }
  if (ov.showF) {
    addArrow(W.p1, W.d1, 0.14, 0xdc2626);
    addArrow(W.p2, new THREE.Vector3(0, -1, 0), 0.14, 0x2563eb);
  }
  if (ov.showArm && K()) {
    const a1 = K().forceArm(
      { x: L.O.x, y: L.O.y },
      { x: L.p1.x, y: L.p1.y },
      L.d1
    );
    // 3D 近似：从 O 向力线作垂足用世界向量
    const d1 = W.d1.clone().normalize();
    const r1 = W.p1.clone().sub(W.O);
    const foot1 = W.O.clone().add(r1.clone().sub(d1.clone().multiplyScalar(r1.dot(d1))));
    const geo1 = new THREE.BufferGeometry().setFromPoints([W.O, foot1]);
    overlayGroup.add(
      new THREE.Line(geo1, new THREE.LineBasicMaterial({ color: 0xdc2626, depthTest: false }))
    );
    const d2 = new THREE.Vector3(0, -1, 0);
    const r2 = W.p2.clone().sub(W.O);
    const foot2 = W.O.clone().add(r2.clone().sub(d2.clone().multiplyScalar(r2.dot(d2))));
    const geo2 = new THREE.BufferGeometry().setFromPoints([W.O, foot2]);
    overlayGroup.add(
      new THREE.Line(geo2, new THREE.LineBasicMaterial({ color: 0x2563eb, depthTest: false }))
    );
    void a1;
  }
}

function setOverlayFlags(flags) {
  state.overlay = Object.assign({}, state.overlay, flags || {});
  drawOverlay3D();
}

function setLayers({ bone, muscle }) {
  if (bone != null) state.showBone = !!bone;
  if (muscle != null) state.showMuscle = !!muscle;
  applyFocusDim();
}

function setStepReveal(step, practice) {
  state.step = step;
  state.practice = !!practice;
  if (stageEl) stageEl.classList.toggle('practice', state.practice);
  if (practice) {
    setOverlayFlags({ showO: false, showF: false, showArm: false, showBar: true });
    return;
  }
  setOverlayFlags({
    showO: step >= 2,
    showF: step >= 3,
    showBar: step >= 4,
    showArm: step >= 5,
  });
}

function onCanvasClick(ev) {
  if (!state.ready || state.practice) return;
  const rect = canvasEl.getBoundingClientRect();
  pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(meshes.filter((m) => m.visible), false);
  const pick = document.getElementById('body3dPick');
  if (!hits.length) {
    if (pick) pick.hidden = true;
    return;
  }
  const obj = hits[0].object;
  const title =
    (obj.userData && (obj.userData.nameDetail || obj.userData.name)) ||
    obj.name ||
    '未命名结构';
  const type = obj.userData.anatType || classifyType(obj);
  const zhType = type === 'bone' ? '骨' : type === 'muscle' ? '肌' : '结构';
  if (pick) {
    pick.hidden = false;
    pick.innerHTML = '<strong>' + zhType + '</strong> · ' + title;
  }
  if (typeof onPick === 'function') onPick(obj);
}

function resize() {
  if (!renderer || !camera || !stageEl) return;
  const w = stageEl.clientWidth || 1;
  const h = stageEl.clientHeight || 1;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
  drawOverlay3D();
}

function animate() {
  raf = requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
}

async function loadModel() {
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath(DRACO_PATH);
  loader.setDRACOLoader(draco);

  const tryUrl = async (url) =>
    new Promise((resolve, reject) => {
      loader.load(url, resolve, (e) => {
        if (e.total) {
          const pct = Math.round((100 * e.loaded) / e.total);
          setStatus('加载解剖模型… ' + pct + '%');
        }
      }, reject);
    });

  let gltf;
  try {
    setStatus('加载本地解剖模型…');
    gltf = await tryUrl(LOCAL_GLB);
  } catch (e1) {
    setStatus('本地未找到，改用 CDN…');
    gltf = await tryUrl(CDN_GLB);
  }
  return gltf;
}

async function init() {
  if (state.ready || state.loading) return state.ready;
  state.loading = true;
  stageEl = document.getElementById('body3dStage');
  canvasEl = document.getElementById('body3dCanvas');
  if (!stageEl || !canvasEl) {
    state.loading = false;
    setStatus('舞台节点缺失');
    setBoot(true, '页面结构不完整', '找不到 3D 画布节点。', '');
    return false;
  }

  if (location.protocol === 'file:') {
    state.loading = false;
    setStatus('请用 http://127.0.0.1:5500 打开');
    setBoot(
      true,
      '不能直接双击打开 HTML',
      '3D 解剖模型需要本地网页服务。请先在本文件夹启动服务，再用浏览器访问下面的地址。',
      '在本文件夹执行：<code>python -m http.server 5500</code><br>然后打开 <code>http://127.0.0.1:5500/index.html</code>'
    );
    return false;
  }

  setBoot(true, '正在加载 3D 解剖模型', '约 8MB（BodyParts3D / Z-Anatomy），首次可能需要十几秒。', '请稍候…');
  setStatus('加载解剖模型…');

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x151820);
  scene.fog = new THREE.Fog(0x151820, 4.5, 9);

  camera = new THREE.PerspectiveCamera(42, 1, 0.01, 50);
  camera.position.set(1.2, 0.2, 1.4);

  renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const amb = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(amb);
  const key = new THREE.DirectionalLight(0xffffff, 1.05);
  key.position.set(2.5, 3.5, 2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xa8c4ff, 0.45);
  fill.position.set(-2, 1, -1);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffe0c0, 0.35);
  rim.position.set(0, 2, -3);
  scene.add(rim);

  controls = new OrbitControls(camera, canvasEl);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 0.35;
  controls.maxDistance = 5;
  controls.target.set(0, 0, 0);

  root = new THREE.Group();
  scene.add(root);
  overlayGroup = new THREE.Group();
  scene.add(overlayGroup);

  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();
  clock = new THREE.Clock();

  canvasEl.addEventListener('click', onCanvasClick);
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) {
    resizeObs = new ResizeObserver(resize);
    resizeObs.observe(stageEl);
  }

  try {
    const gltf = await loadModel();
    modelRoot = gltf.scene;
    root.add(modelRoot);

    meshes = [];
    modelRoot.traverse((ch) => {
      if (ch.isMesh) {
        // glTF extras → userData
        if (ch.parent && ch.parent.userData && ch.parent.userData.type && !ch.userData.type) {
          Object.assign(ch.userData, ch.parent.userData);
        }
        applyStudioMaterial(ch);
        meshes.push(ch);
      }
    });
    // 节点 extras 有时在 Object3D 而非 Mesh：向上抄
    meshes.forEach((m) => {
      let p = m.parent;
      while (p) {
        if (p.userData && p.userData.type && !m.userData.type) {
          m.userData.type = p.userData.type;
          m.userData.name = m.userData.name || p.userData.name;
          m.userData.nameDetail = m.userData.nameDetail || p.userData.nameDetail;
          m.userData.anatType = classifyType(m);
          break;
        }
        p = p.parent;
      }
    });

    const box = new THREE.Box3().setFromObject(modelRoot);
    const center = box.getCenter(new THREE.Vector3());
    modelRoot.position.sub(center);
    storeRestPose();

    state.ready = true;
    state.loading = false;
    setBoot(false);
    setStatus('解剖模型就绪 · 可旋转缩放');
    resize();
    setAction('calf', state.t);
    animate();
    return true;
  } catch (err) {
    console.error(err);
    state.loading = false;
    state.error = err;
    setStatus('解剖模型加载失败');
    setBoot(
      true,
      '解剖模型加载失败',
      String(err && err.message ? err.message : err),
      '确认 <code>assets/anatomy/body.glb</code> 存在，并用 <code>http://127.0.0.1:5500/index.html</code> 打开。'
    );
    return false;
  }
}

function setAction(actionId, t) {
  const changed = state.actionId !== actionId;
  state.actionId = actionId;
  state.t = t == null ? state.t : t;
  if (!state.ready) return;
  if (changed || !pivots[actionId]) buildPivotFor(actionId);
  if (changed) flyToAction(actionId);
  setPose(actionId, state.t);
  applyExplode(state.explode);
  setStepReveal(state.step, state.practice);
}

function dispose() {
  cancelAnimationFrame(raf);
  if (resizeObs) resizeObs.disconnect();
}

const Body3D = {
  init,
  setAction,
  setPose,
  setLayers,
  setExplode: (v) => {
    state.explode = +v || 0;
    applyExplode(state.explode);
  },
  setStepReveal,
  setOverlayFlags,
  getLandmarks,
  isReady: () => state.ready,
  resize,
  onPick(fn) {
    onPick = fn;
  },
  dispose,
};

window.Body3D = Body3D;
export default Body3D;
