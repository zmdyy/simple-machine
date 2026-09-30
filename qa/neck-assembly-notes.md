# 低头 / 抬头：头夹肌与杠杆模板

## 解剖对应

采用资产中已有的左右 `Splenius capitis muscle`（头夹肌）。
头部端附着在乳突及枕骨上项线外侧区域，下方连接项韧带和下颈、上胸椎棘突区域。
两侧共同作用可以使头部后伸；图中的 F₁ 代表两侧肌肉在侧视平面中的等效拉力。

依据：

- [Elsevier Complete Anatomy：Splenius Capitis Muscle](https://www.elsevier.com/resources/anatomy/muscular-system/muscles-of-back/splenius-capitis-muscle/24194)
- [OpenStax Anatomy and Physiology 2e：11.3](https://openstax.org/books/anatomy-and-physiology-2e/pages/11-3-axial-muscles-of-the-head-neck-and-back)
- [头部屈伸运动的三维研究](https://pubmed.ncbi.nlm.nih.gov/9183030/)：真实运动包含上颈部转动及颈椎位移；本模板的固定支点是课堂简化。

## 实现边界

- 头部骨骼、下颌、牙齿和鼻部结构整体运动；C1 至 C7、T1 至 T3 保持固定。
- 在 GLB 原始坐标中人工校准等效支点；放大展示低头 30°、经过平视到抬头 10°。继续沿用固定等效支点假设，展示角度不代表真实单个关节的运动范围。
- 头夹肌上端绑定到实际枕骨、颞骨三角形表面，随头骨转动。原资产下方窄尾伸到 T3 以下，已校准到 T3 骨面，消除悬空尾端。肌腹在固定端和移动端之间平滑变形。
- 头部重心位置是教学估计；50 N 为示意重力。姿态动画不模拟肌肉激活或动态惯性，显示的 F₁ 是保持当前姿态平衡所需的等效力。
- 左右拉力合并为矢状面中的等效作用线，抵消侧向分量。重力始终竖直向下，两个力绕 O 的转动作用相反。
- 人体与抽象杠杆共享 O、A、B 和两条作用线；力臂先在世界坐标中求垂直距离，再投影到屏幕。
- 切换动作时恢复原网格，避免累计形变或污染其他案例。

## 验证

在本地网页服务运行时执行 `node qa/body-neck-qa.mjs`（需要 Playwright 和 Three.js 0.160.0）。
脚本使用项目原版本 Three.js 的本地副本，避免依赖 CDN 可用性。

已通过：11 个头位的上下端骨面附着、固定端稳定、抬头时肌肉缩短、相反转动作用、力臂；
简化/恢复、肌肉与骨骼显隐、播放/暂停、动作切换、相机旋转、1280 × 800 和 1440 × 900 投影对齐。
已有 `body-curl-qa.mjs` 和 `body-calf-qa.mjs` 回归检查通过，无浏览器错误。

测得的网格附着误差仅用于检查程序绑定一致性，不表示人体解剖或教学重心具有同等精度。
