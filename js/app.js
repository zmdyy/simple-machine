/**
 * 入口导航
 */
(function () {
  'use strict';

  const labs = {
    arm: { el: 'labArm', init: () => window.ArmLab && ArmLab.init() },
    life: { el: 'labLife', init: () => window.LifeLab && LifeLab.init() },
    body: { el: 'labBody', init: () => window.BodyLab && BodyLab.init() },
    balance: { el: 'labBalance', init: () => window.BalanceLab && BalanceLab.init() },
    video: { el: 'labVideo', init: () => window.DynamicLifeLab && DynamicLifeLab.init() },
  };

  const inited = {};

  function show(id) {
    Object.keys(labs).forEach((k) => {
      document.getElementById(labs[k].el).classList.toggle('active', k === id);
    });
    document.querySelectorAll('.nav-tabs button').forEach((b) => {
      b.classList.toggle('active', b.dataset.lab === id);
    });
    if (!inited[id] && labs[id].init) {
      labs[id].init();
      inited[id] = true;
    } else if (id === 'arm' && window.ArmLab) ArmLab.render();
    else if (id === 'life' && window.LifeLab) LifeLab.render();
    else if (id === 'body' && window.BodyLab) {
      BodyLab.render();
      if (window.Body3D && Body3D.resize) Body3D.resize();
    }
    else if (id === 'video' && window.DynamicLifeLab) DynamicLifeLab.render();
  }

  window.AppNav = { show };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.nav-tabs button').forEach((b) => {
      b.addEventListener('click', () => show(b.dataset.lab));
    });
    show('arm');
  });
})();
