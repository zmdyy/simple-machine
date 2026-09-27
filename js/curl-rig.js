/** Calibrated single-arm teaching rig for the bundled BodyParts3D mesh.
 * Coordinates below are in the GLB's uncentred metre space, not label-node positions.
 * A fixed shoulder and supinated forearm isolate elbow flexion for this lesson.
 */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const CURL_CALIBRATION = Object.freeze({
  elbow: [0.222, 1.100, -0.034],
  axis: [-1, -0.06, 0],
  radialInsertion: [0.239, 1.061, -0.014],
  ulnarInsertion: [0.222, 1.065, -0.025],
  minAngle: 0.12,
  maxAngle: 2.18,
});
const V = (a) => new THREE.Vector3(...a);
const smooth = (t) => { t = THREE.MathUtils.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const nameOf = (m) => (m.userData.nameDetail || m.userData.name || m.name)
  .replace(/_/g, ' ').replace(/\.\d+$/, '').toLowerCase();
export const isCurlMovingBone = (m) => /^(radius|ulna|scaphoid bone|lunate bone|triquetrum bone|pisiform bone|trapezium bone|trapezoid bone|capitate bone|hamate bone|(?:first|second|third|fourth|fifth) metacarpal bone|(?:proximal|middle|distal) phalanx of (?:first|second|third|fourth|fifth) finger of hand)$/.test(nameOf(m));
const isCurlMuscle = (m) => /^(long head of biceps brachii|short head of biceps brachii|brachialis muscle)$/.test(nameOf(m));
export const isCurlStructure = (m) => isCurlMovingBone(m) || isCurlMuscle(m) || /^(humerus|scapula|clavicle)$/.test(nameOf(m));

// The delivered asset is deliberately low-poly. Subdivide its existing surface to
// support smooth deformation; this does not invent higher-detail anatomy.
function subdivide(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const p = g.attributes.position;
  const out = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const tri = (x,y,z) => out.push(...x.toArray(),...y.toArray(),...z.toArray());
  for (let i=0;i<p.count;i+=3) {
    a.fromBufferAttribute(p,i); b.fromBufferAttribute(p,i+1); c.fromBufferAttribute(p,i+2);
    const ab=a.clone().lerp(b,.5),bc=b.clone().lerp(c,.5),ca=c.clone().lerp(a,.5);
    tri(a,ab,ca);tri(ab,b,bc);tri(ca,bc,c);tri(ab,bc,ca);
  }
  g.dispose();
  const result = new THREE.BufferGeometry();
  result.setAttribute('position',new THREE.Float32BufferAttribute(out,3));
  const smoothGeometry = mergeVertices(result, 1e-6);
  result.dispose();
  return smoothGeometry;
}

export function createCurlRig({root, modelRoot, meshes}) {
  modelRoot.updateWorldMatrix(true,true);
  const toSource = modelRoot.matrixWorld.clone().invert();
  const sourceMatrix = (m) => toSource.clone().multiply(m.matrixWorld);
  const right = meshes.filter(m => m.userData.restWorld.x > .05);
  const find = (name) => right.find(m => nameOf(m) === name);
  const elbow = V(CURL_CALIBRATION.elbow);
  const axis = V(CURL_CALIBRATION.axis).normalize();
  const turn = new THREE.Quaternion();
  const world = (p) => modelRoot.localToWorld(p.clone());
  const rotate = (p) => p.clone().sub(elbow).applyQuaternion(turn).add(elbow);

  // Snap manually identified tuberosity regions to actual triangle surfaces.
  // Annotation nodes in this GLB include offset text-label positions and zero origins.
  function surfacePoint(mesh, guess) {
    const g=mesh.geometry,p=g.attributes.position,idx=g.index,mat=sourceMatrix(mesh);
    const tri=new THREE.Triangle(),q=new THREE.Vector3(),best=new THREE.Vector3();let distance=Infinity;
    for(let i=0;i<(idx?idx.count:p.count);i+=3){
      [tri.a,tri.b,tri.c].forEach((v,k)=>v.fromBufferAttribute(p,idx?idx.getX(i+k):i+k).applyMatrix4(mat));
      tri.closestPointToPoint(guess,q);const d=q.distanceToSquared(guess);
      if(d<distance){distance=d;best.copy(q);}
    }
    return best;
  }
  const radius=find('radius'),ulna=find('ulna'),palm=find('third metacarpal bone');
  if(!radius||!ulna||!palm) throw new Error('举哑铃模型缺少必要骨骼，停止使用估算关节。');
  const radial=surfacePoint(radius,V(CURL_CALIBRATION.radialInsertion));
  const ulnar=surfacePoint(ulna,V(CURL_CALIBRATION.ulnarInsertion));
  const grip=new THREE.Box3().setFromObject(palm).getCenter(new THREE.Vector3()).applyMatrix4(toSource);
  const pivot=new THREE.Object3D();pivot.name='pivot_curl';
  pivot.position.copy(root.worldToLocal(world(elbow)));root.add(pivot);
  const moving=right.filter(isCurlMovingBone);
  moving.forEach(m=>pivot.attach(m));
  const muscleRecords=[];
  let currentInsertion=radial.clone(),currentJunction;

  const long=find('long head of biceps brachii');
  if(!long) throw new Error('举哑铃模型缺少肱二头肌。');
  function distalCenter(mesh) {
    const p=mesh.geometry.attributes.position,mat=sourceMatrix(mesh),v=new THREE.Vector3(),c=new THREE.Vector3();
    let minY=Infinity,n=0;
    for(let i=0;i<p.count;i++)minY=Math.min(minY,v.fromBufferAttribute(p,i).applyMatrix4(mat).y);
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mat);if(v.y<minY+.003){c.add(v);n++;}}
    return c.divideScalar(n);
  }
  const bicepsTip=distalCenter(long);
  for(const m of right.filter(isCurlMuscle)) {
    const brachialis=nameOf(m)==='brachialis muscle';
    const original=m.geometry,geometry=subdivide(original),mat=sourceMatrix(m),inverse=mat.clone().invert();
    const rest=geometry.attributes.position.array.slice();
    const tip=brachialis?distalCenter(m):bicepsTip.clone();
    const insertion=brachialis?ulnar:radial;
    const pinY=brachialis?1.265:1.340;
    const source=[];
    for(let i=0;i<rest.length;i+=3)source.push(new THREE.Vector3(rest[i],rest[i+1],rest[i+2]).applyMatrix4(mat));
    const color=new Float32Array(rest.length),red=new THREE.Color(brachialis?0xb95050:0xc86560),white=new THREE.Color(0xe9dfcf);
    source.forEach((p,i)=>{
      const distal=brachialis?1-smooth((p.y-1.070)/.025):1-smooth((p.y-1.115)/.022);
      const proximal=brachialis?0:smooth((p.y-1.330)/.055);
      red.clone().lerp(white,Math.max(distal,proximal)).toArray(color,i*3);
    });
    geometry.setAttribute('color',new THREE.BufferAttribute(color,3));
    m.geometry=geometry;m.material.vertexColors=true;m.material.color.set(0xffffff);m.material.needsUpdate=true;
    const junction = brachialis ? V([.222,1.092,-.027]) : V([.224,1.113,-.016]);
    const proximal = brachialis ? V([.198,pinY,-.024]) : V([.179,pinY,-.004]);
    muscleRecords.push({m,original,geometry,inverse,source,tip,insertion,pinY,brachialis,junction,proximal});
  }
  const biceps=muscleRecords.find(r=>r.m===long);
  // Keep the narrow tendon segment approximately inextensible. The changing
  // insertion-to-shoulder distance is taken up by the muscle belly, not the tendon.
  function prepareDeformation(r) {
    r.end = rotate(r.insertion);
    const restDirection = r.junction.clone().sub(r.tip);
    const direction = r.proximal.clone().sub(r.end).normalize();
    r.currentJunction = r.end.clone().addScaledVector(direction, restDirection.length());
    r.tendonRotation = new THREE.Quaternion().setFromUnitVectors(restDirection.normalize(), direction);
    r.delta = r.currentJunction.clone().sub(r.junction);
    r.contraction = Math.max(0,r.delta.y)/(r.pinY-r.junction.y);
  }
  function deform(p,r) {
    const u=THREE.MathUtils.clamp((r.pinY-p.y)/(r.pinY-r.junction.y),0,1);
    const belly=p.clone().addScaledVector(r.delta,u);
    belly.z+=Math.sin(Math.PI*u)**2*r.contraction*(r.brachialis?.017:.028);
    const tendon=p.clone().sub(r.tip).applyQuaternion(r.tendonRotation).add(r.end);
    const blend=1-smooth((p.y-r.junction.y+.004)/.008);
    const result=belly.lerp(tendon,blend);
    // Close the distal cap onto its bone anchor instead of leaving floating tip vertices.
    const cap=1-smooth((p.y-r.tip.y+.001)/.006);
    return result.lerp(r.end,cap);
  }
  function update(t) {
    const angle=THREE.MathUtils.lerp(CURL_CALIBRATION.minAngle,CURL_CALIBRATION.maxAngle,THREE.MathUtils.clamp(t,0,1));
    turn.setFromAxisAngle(axis,angle);
    pivot.quaternion.copy(turn);pivot.updateWorldMatrix(true,true);
    for(const r of muscleRecords){
      prepareDeformation(r);
      const p=r.geometry.attributes.position;
      r.source.forEach((v,i)=>{const q=deform(v,r).applyMatrix4(r.inverse);p.setXYZ(i,q.x,q.y,q.z);});
      p.needsUpdate=true;r.geometry.computeVertexNormals();r.geometry.computeBoundingBox();r.geometry.computeBoundingSphere();
    }
    currentInsertion=rotate(radial);currentJunction=biceps.currentJunction.clone();
  }
  function landmarks(){
    const O=world(elbow),p1=world(currentInsertion),p2=world(rotate(grip));
    return {O,p1,p2,d1:world(currentJunction).sub(p1).normalize(),d2:new THREE.Vector3(0,-1,0),f2:50,bar:[O,p2]};
  }
  function diagnostics(){
    let attachmentError=0,proximalDrift=0,surfaceAttachmentError=0;
    for(const r of muscleRecords){
      if(nameOf(r.m)==='short head of biceps brachii')continue;
      let lowest=0;
      r.source.forEach((p,i)=>{if(p.y<r.source[lowest].y)lowest=i;});
      const rendered=new THREE.Vector3().fromBufferAttribute(r.geometry.attributes.position,lowest);
      r.m.localToWorld(rendered);
      attachmentError=Math.max(attachmentError,rendered.distanceTo(world(rotate(r.insertion))));
      const renderedSource=modelRoot.worldToLocal(rendered.clone());
      surfaceAttachmentError=Math.max(surfaceAttachmentError,renderedSource.distanceTo(
        surfacePoint(r.brachialis?ulna:radius,renderedSource)));
      r.source.forEach((p,i)=>{if(p.y>=r.pinY){
        const actual=new THREE.Vector3().fromBufferAttribute(r.geometry.attributes.position,i);r.m.localToWorld(actual);
        proximalDrift=Math.max(proximalDrift,actual.distanceTo(world(p)));
      }});
    }
    return {calibrated:true,movingBones:moving.length,carpals:moving.filter(m=>/^(scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate) bone$/.test(nameOf(m))).length,
      phalanges:moving.filter(m=>nameOf(m).includes('phalanx')).length,
      attachmentError,surfaceAttachmentError,proximalDrift,axis:axis.toArray(),radialInsertion:radial.toArray(),ulnarInsertion:ulnar.toArray(),
      muscleNames:muscleRecords.map(r=>nameOf(r.m)),
      tendonLength:currentInsertion.distanceTo(currentJunction),
      hiddenMovingBones:moving.filter(m=>!m.visible).length};
  }
  function dispose(){
    for(const r of muscleRecords){r.m.geometry=r.original;r.geometry.dispose();r.m.material.vertexColors=false;r.m.material.color.set(0xc45c5c);r.m.material.needsUpdate=true;}
  }
  update(0);
  return {pivot,moving,update,landmarks,diagnostics,dispose};
}
