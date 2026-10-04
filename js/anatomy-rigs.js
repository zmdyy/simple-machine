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
      singleSide: true,
      sideSign: 1,
      hideUnfocused: true,
      focusOnlyHighlightedMuscle: true,
      trackFocus: true,
      camera: {
        position: [1.35, -0.63, 0.16],
        target: [0.10, -0.73, 0.02],
        fov: 33,
        fitPadding: 1.00,
        minDistance: 0.38,
      },
      dimOpacity: 0.01,
      teaching: {
        joint: '前脚掌着地点（跖趾关节附近，简化为支点）',
        bones: '胫骨、腓骨、距骨、跟骨、跖骨和趾骨',
        muscles: '腓肠肌、比目鱼肌（经跟腱作用于跟骨）',
        effort: '小腿三头肌经跟腱向上牵拉跟骨，形成动力 F₁',
        load: '身体重力经踝部向下作用，取约 600 N 作课堂示意',
        note: '这是用于初中力学学习的简化人体杠杆模型：把前脚掌着地点看作支点，忽略足部多关节、软组织弹性和动态惯性。',
      },
      focusPatterns: [
        /tibia/i, /fibula/i, /calcane/i, /talus/i, /navicular/i, /cuboid/i,
        /cuneiform/i, /metatars/i, /phalanx of .*foot/i,
        /gastrocnemius/i, /soleus/i, /calcaneal tendon/i, /achilles/i,
      ],
      pivotFrom: [
        /head of first metatarsal/i, /first metatarsal bone/i,
        /proximal phalanx of .*foot/i,
      ],
      movable: [
        /calcane/i, /talus/i, /navicular/i, /cuboid/i, /cuneiform/i,
        /metatarsal/i, /phalanx of .*foot/i, /sesamoid.*foot/i, /bones of foot/i,
      ],
      // 足部绕前脚掌转动；小腿骨和主要小腿肌群只跟随踝部平移，
      // 避免把整条小腿和脚刚性焊成一根杆。
      followMovable: [/tibia/i, /fibula/i, /gastrocnemius/i, /soleus/i, /plantaris/i],
      followAnchor: [/talus(?!\.)/i, /talus/i, /inferior articular surface of tibia/i],
      highlightMuscle: [/gastrocnemius/i, /soleus/i, /calcaneal tendon/i, /achilles/i],
      axis: 'x',
      angleMin: 0.02,
      angleMax: 0.32,
      landmarks(ctx) {
        const O = ctx.centerOf([
          /head of first metatarsal/i, /first metatarsal/i, /proximal phalanx of .*foot/i,
        ]) || ctx.pivotWorld;
        const heel = ctx.centerOf([/calcaneal tuberosity/i, /calcaneus(?!\.)/i, /calcaneus/i]) ||
          O.clone().add(ctx.v(-0.10, 0.01, -0.04));
        const ankle = ctx.centerOf([/talus(?!\.)/i, /talus/i, /inferior articular surface of tibia/i]) ||
          O.clone().lerp(heel, 0.58).add(ctx.v(0, 0.05, 0));
        const belly = ctx.centerOf([/soleus/i, /gastrocnemius/i]) ||
          ankle.clone().add(ctx.v(0, 0.18, -0.02));
        return {
          O,
          p1: heel,
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
      focusOnlyHighlightedMuscle: true,
      trackFocus: true,
      camera: {
        position: [-1.0, 0.08, 0.85],
        target: [0.32, 0.02, 0],
        fov: 32,
        fitPadding: 1.08,
        minDistance: 0.34,
      },
      dimOpacity: 0.01,
      teaching: {
        joint: '肘关节',
        bones: '肱骨、尺骨、桡骨、手部骨骼',
        muscles: '肱二头肌、肱肌（主要示意）',
        effort: '肱二头肌经肌腱牵拉桡骨，形成动力 F₁',
        load: '手持约 5 kg 哑铃，重力约 50 N（示意值）',
        note: '固定上臂、保持前臂旋后，单独观察屈肘。肌肉变形为教学示意；忽略前臂和手自身重力。',
      },
      // curl-rig.js binds an explicit bone inventory and calibrated surface attachments.
      focusPatterns: [/humerus/i, /radius/i, /ulna/i, /biceps brachii/i, /^brachialis muscle/i,
        /metacarpal/i, /scapula/i, /clavicle/i, /phalanx of.*hand/i,
        /scaphoid bone|lunate bone|triquetrum bone|pisiform bone|trapezium bone|trapezoid bone|capitate bone|hamate bone/i],
      // Intentionally no generic pivot/landmark fallback: a missing calibrated rig is an error.
      pivotFrom: [],
      movable: [],
      highlightMuscle: [/biceps brachii/i, /^brachialis muscle/i],
      landmarks() { throw new Error('举哑铃需要已校准的动作模板'); },
    },

    neck: {
      id: 'neck',
      label: '低头 / 抬头',
      singleSide: false,
      hideUnfocused: true,
      focusOnlyHighlightedMuscle: true,
      camera: { position: [1.15, 0.55, 0], target: [0, 0.55, 0], fov: 32, fitPadding: 1.30, minDistance: .65 },
      teaching: {
        joint: '枕寰关节附近的等效支点',
        bones: '头骨、寰椎、枢椎及颈部支撑骨骼',
        muscles: '左右头夹肌（代表颈后伸肌）',
        effort: '头夹肌牵拉头部附着区域，两侧作用简化为动力 F₁',
        load: '头部重力从重心 A 竖直向下，取 50 N 作课堂示意',
        note: '把头部视为刚体，上颈部连接简化为固定支点。放大展示低头 30° 到抬头 10°；动作幅度、重心、肌肉变形和力值为教学示意。',
      },
      focusPatterns: [
        /bone/i, /^atlas \(c1\)/i, /^axis \(c2\)/i, /^vertebra [ct]/i, /^splenius capitis muscle/i,
      ],
      pivotFrom: [],
      movable: [],
      highlightMuscle: [/^splenius capitis muscle/i],
      landmarks() { throw new Error('头颈动作需要已校准的头夹肌模板'); },
    },

    lift: {
      id: 'lift', label: '弯腰 vs 蹲举', singleSide: false,
      hideUnfocused: true, focusOnlyHighlightedMuscle: true, trackFocus: true,
      camera: { position: [2.6, .30, .35], target: [0, .05, .1], fov: 36, fitPadding: 1.02, minDistance: 1.0 },
      teaching: {
        joint: 'L5/S1 附近的腰骶部等效支点',
        bones: '骨盆、脊柱、胸廓与双侧肢段',
        muscles: '髂肋肌、最长肌，合并为腰背伸肌拉力',
        effort: '腰背伸肌提供伸展力矩；等效动力臂取 5 cm',
        load: '同一 10 kg 重物：重力 100 N；可计入上身自重 300 N',
        note: '只研究慢速提起时的转动平衡。上身和肌肉参数为教学设定，不计算椎间盘压力，也不据此判断损伤风险。',
      },
      focusPatterns: [/bone|vertebra|rib|humerus|radius|ulna|femur|tibia|fibula|sacrum|iliocostalis lumborum|longissimus thoracis/i],
      pivotFrom: [], movable: [],
      landmarks() { throw new Error('搬举需要已校准的腰部比较模板'); },
    },
  };

  global.AnatomyRigs = { RIGS, matchAny, preferSide };
})(typeof window !== 'undefined' ? window : globalThis);
