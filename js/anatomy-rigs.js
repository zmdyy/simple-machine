/**
 * 四条人体课眼的关节组、摄像机与力臂路标规则
 * 网格名匹配 BodyParts3D / Z-Anatomy（英文 anatomical name）
 */
(function (global) {
  'use strict';

  function matchAny(name, patterns) {
    if (!name) return false;
    const n = name.toLowerCase();
    return patterns.some((p) => {
      if (p instanceof RegExp) return p.test(name) || p.test(n);
      return n.indexOf(String(p).toLowerCase()) >= 0;
    });
  }

  /** 选一侧：优先无 .001 后缀的右/主侧网格 */
  function preferSide(name) {
    return !/\.\d{3}$/.test(name || '');
  }

  const RIGS = {
    calf: {
      id: 'calf',
      label: '踮脚',
      camera: { position: [0.55, -0.55, 1.35], target: [0.08, -0.72, 0.05], fov: 42 },
      focusPatterns: [
        /tibia/i, /fibula/i, /calcane/i, /talus/i, /metatars/i,
        /phalanx of .*foot/i, /gastrocnemius/i, /soleus/i, /plantaris/i,
        /bones of foot/i, /muscles of foot/i,
      ],
      pivotFrom: [/first metatarsal bone(?!\.)/i, /first metatarsal bone/i, /metatarsal bones/i],
      movable: [
        /calcane/i, /talus/i, /navicular/i, /cuboid/i, /cuneiform/i,
        /metatarsal/i, /phalanx of .*foot/i, /sesamoid.*foot/i, /bones of foot/i,
      ],
      // 腓肠肌/比目鱼肌留在小腿上不跟着脚转（近似）
      highlightMuscle: [/gastrocnemius/i, /soleus/i, /plantaris/i],
      axis: 'x', // 侧视绕左右轴抬脚跟（模型 Y 向上）
      angleMin: 0,
      angleMax: 0.55, // rad ≈ 31°
      landmarks(ctx) {
        const O = ctx.centerOf([/first metatarsal/i, /head of metatarsal/i]) || ctx.pivotWorld;
        const heel = ctx.centerOf([/calcaneal tuberosity/i, /calcaneus(?!\.)/i, /calcaneus/i]) || O.clone().add(ctx.v(-0.08, -0.02, -0.06));
        const ankle = ctx.centerOf([/talus(?!\.)/i, /talus/i, /inferior articular surface of tibia/i]) || O.clone().add(ctx.v(0.02, 0.08, 0));
        const belly = ctx.centerOf([/soleus/i, /gastrocnemius/i]) || ankle.clone().add(ctx.v(0, 0.12, -0.04));
        return {
          O,
          p1: heel.clone().lerp(belly, 0.15),
          d1: ctx.dir(heel, belly),
          p2: ankle,
          d2: ctx.v(0, -1, 0),
          f2: 600,
          bar: [O, heel],
        };
      },
    },

    curl: {
      id: 'curl',
      label: '举哑铃（肘）',
      singleSide: true,
      sideSign: 1,
      hideUnfocused: true,
      trackFocus: true,
      camera: {
        position: [1.28, 0.12, 0.50],
        target: [0.32, 0.02, 0],
        fov: 32,
        fitPadding: 0.92,
        minDistance: 0.34,
      },
      dimOpacity: 0.01,
      teaching: {
        joint: '肘关节',
        bones: '肱骨、尺骨、桡骨、手部骨骼',
        muscles: '肱二头肌、肱肌（主要示意）',
        effort: '肱二头肌经肌腱牵拉桡骨，形成动力 F₁',
        load: '手持约 5 kg 哑铃，重力约 50 N（示意值）',
        note: '简化模型忽略前臂和手自身重力，只突出肘关节、肌肉拉力与哑铃重力。',
      },
      focusPatterns: [
        /humerus/i, /radius/i, /ulna/i, /biceps brachii/i, /brachialis/i,
        /metacarpal/i, /scapula/i, /clavicle/i, /forearm/i,
      ],
      pivotFrom: [/trochlea of humerus/i, /capitulum of humerus/i, /head of radius/i, /olecranon/i],
      movable: [
        /radius/i, /ulna/i, /metacarpal/i, /phalanx of.*(hand|finger(?! of foot))/i,
        /carpal/i, /scaphoid/i, /lunate/i, /bones of hand/i, /hand bone/i,
      ],
      highlightMuscle: [/biceps brachii/i, /brachialis/i, /short head of biceps/i, /long head of biceps brachii/i],
      axis: 'z',
      angleMin: 0.12,
      angleMax: 1.35,
      landmarks(ctx) {
        const O = ctx.pivotWorld.clone();
        const grip = ctx.centerOf([/third metacarpal/i, /metacarpal bones/i, /first metacarpal/i]) || O.clone().add(ctx.v(0, -0.28, 0.05));
        // 桡骨粗隆是肱二头肌主要止点。找不到命名网格时，用靠近肘部的前臂位置回退，
        // 不再用整根桡骨中心，避免把动力作用点错误推到前臂中段。
        const insert = ctx.centerOf([/tuberosity of radius/i]) || O.clone().lerp(grip, 0.18);
        const belly = ctx.centerOf([/biceps brachii/i, /short head of biceps brachii/i, /long head of biceps brachii/i]) ||
          O.clone().add(ctx.v(0.02, 0.11, 0.04));
        return {
          O,
          p1: insert,
          d1: ctx.dir(insert, belly),
          p2: grip,
          d2: ctx.v(0, -1, 0),
          f2: 50,
          bar: [O, grip],
        };
      },
    },

    neck: {
      id: 'neck',
      label: '低头 / 抬头',
      camera: { position: [1.15, 0.55, 0.35], target: [0, 0.55, 0], fov: 38 },
      focusPatterns: [
        /occipital/i, /cranium/i, /atlas/i, /axis \(c2\)/i, /cervical/i,
        /splenius/i, /semispinalis/i, /trapezius/i, /sternocleid/i, /skull/i,
      ],
      pivotFrom: [/atlas \(c1\)/i, /occipital condyle/i, /atlas(?!\.)/i],
      movable: [
        /occipital bone/i, /parietal bone/i, /frontal bone/i, /temporal bone/i,
        /sphenoid/i, /ethmoid/i, /cranium/i, /neurocranium/i, /viscerocranium/i,
        /mandible/i, /zygomatic/i, /maxilla/i, /nasal bone/i,
      ],
      highlightMuscle: [/splenius/i, /semispinalis/i, /trapezius/i, /suboccipital/i],
      axis: 'x',
      angleMin: -0.45,
      angleMax: 0.35,
      landmarks(ctx) {
        const O = ctx.pivotWorld.clone();
        const com = ctx.centerOf([/cranium/i, /neurocranium/i, /frontal bone/i]) || O.clone().add(ctx.v(0.02, 0.08, 0.03));
        const nape = ctx.centerOf([/external occipital protuberance/i, /occipital bone/i, /splenius capitis/i]) || O.clone().add(ctx.v(-0.02, 0.04, -0.06));
        const belly = ctx.centerOf([/splenius/i, /semispinalis/i]) || nape.clone().add(ctx.v(0, -0.06, -0.02));
        return {
          O,
          p1: nape,
          d1: ctx.dir(nape, belly),
          p2: com,
          d2: ctx.v(0, -1, 0),
          f2: 50,
          bar: [O, com],
        };
      },
    },

    lift: {
      id: 'lift',
      label: '弯腰 vs 蹲抬',
      camera: { position: [1.6, 0.1, 0.2], target: [0, -0.05, 0], fov: 40 },
      focusPatterns: [
        /hip bone/i, /ilium/i, /sacrum/i, /lumbar/i, /femur/i,
        /erector/i, /iliocostalis/i, /longissimus/i, /multifidus/i, /vertebra l/i,
      ],
      pivotFrom: [/hip bone(?!\.)/i, /ilium(?!\.)/i, /head of femur/i],
      movable: [
        /vertebra l/i, /vertebra t/i, /lumbar/i, /thoracic vertebrae/i,
        /rib/i, /sternum/i, /sacrum/i, /erector/i, /iliocostalis/i, /longissimus/i,
        /latissimus/i, /scapula/i, /humerus/i, /cranium/i, /cervical/i,
      ],
      kneeMovable: [/tibia/i, /fibula/i, /patella/i, /bones of foot/i, /calcane/i, /talus/i, /metatars/i],
      highlightMuscle: [/erector/i, /iliocostalis/i, /longissimus/i, /multifidus/i],
      axis: 'x',
      // t<0.5 弯腰；t>=0.5 蹲抬
      angleMin: 0,
      angleMax: 0.9,
      landmarks(ctx) {
        const O = ctx.pivotWorld.clone();
        const shoulder = ctx.centerOf([/scapula(?!\.)/i, /vertebra t1/i, /sternum/i]) || O.clone().add(ctx.v(0, 0.35, 0.05));
        const com = shoulder.clone().add(ctx.v(0.05, -0.05, 0.08));
        const belly = ctx.centerOf([/erector/i, /iliocostalis lumborum/i]) || O.clone().add(ctx.v(-0.03, 0.12, -0.05));
        return {
          O,
          p1: belly,
          d1: ctx.dir(belly, O.clone().add(ctx.v(0, 0.2, -0.02))),
          p2: com,
          d2: ctx.v(0, -1, 0),
          f2: 400,
          bar: [O, shoulder],
          stageName: ctx.t < 0.5 ? '直腿弯腰（腰力臂大）' : '屈膝蹲抬（躯干更竖）',
        };
      },
    },
  };

  global.AnatomyRigs = { RIGS, matchAny, preferSide };
})(typeof window !== 'undefined' ? window : globalThis);
