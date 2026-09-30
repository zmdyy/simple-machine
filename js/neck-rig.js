/** Small nodding teaching model for the bundled BodyParts3D asset.
 * Source coordinates are metres before the viewer centres the GLB.
 * Bilateral splenius capitis is represented by one sagittal resultant.
 * This is an equivalent hinge model, not full cervical kinematics.
 */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

export const NECK_CALIBRATION = Object.freeze({
  pivot: [0, 1.550, -0.010],
  headCOM: [0, 1.620, 0.022], // Teaching estimate, not a measured anatomical COM.
  lowAngle: 0.24,
  levelAngle: 0,
  fixedHeight: 1.400,
  headPinnedHeight: 1.552,
});
const V = (a) => new THREE.Vector3(...a);
const smooth = (t) => { t = THREE.MathUtils.clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const nameOf = (m) => (m.userData.nameDetail || m.userData.name || m.name)
  .replace(/_/g, ' ').replace(/\.\d+$/, '').toLowerCase();
export const isNeckMuscle = (m) => nameOf(m) === 'splenius capitis muscle';
export const isNeckMovingBone = (m) => /^(occipital bone|parietal bone|frontal bone|temporal bone|sphenoid bone|ethmoid bone|mandible|maxilla|zygomatic bone|nasal bone|lacrimal bone|palatine bone|inferior nasal concha bone|vomer|malleus|incus|stapes|(?:upper|lower) (?:medial incisor|lateral incisor|canine|first premolar|second premolar|first molar tooth|second molar tooth)|major alar cartilage|lateral process of nasal septal cartilage|nasal septal cartilage)$/.test(nameOf(m));
export const isNeckStructure = (m) => isNeckMovingBone(m) || isNeckMuscle(m)
  || /^(atlas \(c1\)|axis \(c2\)|vertebra c[3-7]|vertebra t[1-3])$/.test(nameOf(m));

function subdivide(geometry) {
  const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
  const p = g.attributes.position, out = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const tri = (x,y,z) => out.push(...x.toArray(), ...y.toArray(), ...z.toArray());
  for (let i=0; i<p.count; i+=3) {
    a.fromBufferAttribute(p,i); b.fromBufferAttribute(p,i+1); c.fromBufferAttribute(p,i+2);
    const ab=a.clone().lerp(b,.5), bc=b.clone().lerp(c,.5), ca=c.clone().lerp(a,.5);
    tri(a,ab,ca); tri(ab,b,bc); tri(ca,bc,c); tri(ab,bc,ca);
  }
  g.dispose();
  const result = new THREE.BufferGeometry();
  result.setAttribute('position',new THREE.Float32BufferAttribute(out,3));
  const welded = mergeVertices(result,1e-6);
  result.dispose();
  return welded;
}

export function createNeckRig({root, modelRoot, meshes}) {
  modelRoot.updateWorldMatrix(true,true);
  const toSource = modelRoot.matrixWorld.clone().invert();
  const sourceMatrix = (m) => toSource.clone().multiply(m.matrixWorld);
  const world = (p) => modelRoot.localToWorld(p.clone());
  const O = V(NECK_CALIBRATION.pivot), com = V(NECK_CALIBRATION.headCOM);
  const turn = new THREE.Quaternion(), axis = new THREE.Vector3(1,0,0);
  const rotate = (p) => p.clone().sub(O).applyQuaternion(turn).add(O);
  const bones = meshes.filter(isNeckMovingBone);
  const muscles = meshes.filter(isNeckMuscle);
  const surfaces = bones.filter(m => /^(occipital bone|temporal bone)$/.test(nameOf(m)));
  const lowerBone=meshes.find(m=>nameOf(m)==='vertebra t3');
  if (muscles.length !== 2 || surfaces.length !== 3 || !meshes.some(m => nameOf(m)==='atlas (c1)'))
    throw new Error('头颈模型缺少头夹肌、枕骨、颞骨或寰椎，无法建立已校准模板。');
  if (!lowerBone) throw new Error('头夹肌模板缺少下方附着骨骼。');

  // Bind the broad upper insertion to the actual occipital/temporal triangle
  // surfaces. Do not use GLB annotation nodes, bounding-box centres or skin points.
  function surfaceTriangles(list) {
    const triangles=[];
    for (const m of list) {
      const p=m.geometry.attributes.position, idx=m.geometry.index, mat=sourceMatrix(m);
      for (let i=0; i<(idx ? idx.count : p.count); i+=3) {
        const tri=new THREE.Triangle();
        [tri.a,tri.b,tri.c].forEach((v,k)=>v.fromBufferAttribute(p,idx ? idx.getX(i+k) : i+k).applyMatrix4(mat));
        triangles.push(tri);
      }
    }
    return triangles;
  }
  const triangles=surfaceTriangles(surfaces), lowerTriangles=surfaceTriangles([lowerBone]);
  function surfacePoint(guess, list=triangles) {
    const q=new THREE.Vector3(), best=new THREE.Vector3(); let distance=Infinity;
    for (const tri of list) {
      tri.closestPointToPoint(guess,q); const d=q.distanceToSquared(guess);
      if (d<distance) { distance=d; best.copy(q); }
    }
    return best;
  }
  const records = muscles.map(m => {
    const original=m.geometry, geometry=subdivide(original);
    const mat=sourceMatrix(m), inverse=mat.clone().invert(), p=geometry.attributes.position;
    const source=[], weights=[], cap=[], fixed=[], lowerCap=[];
    const red=new THREE.Color(0xc86560), white=new THREE.Color(0xe9dfcf);
    const colors=new Float32Array(p.count*3);
    for (let i=0; i<p.count; i++) {
      const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(mat);
      const w=smooth((v.y-NECK_CALIBRATION.fixedHeight)
        /(NECK_CALIBRATION.headPinnedHeight-NECK_CALIBRATION.fixedHeight));
      if (w===1) { v.copy(surfacePoint(v)); cap.push(i); }
      if (w===0) fixed.push(i);
      // The delivered mesh's narrow tail reaches below T3. Calibrate its lower
      // insertion onto the visible T3 spinous region instead of leaving a tip in air.
      const lowerWeight=1-smooth((v.y-1.366)/.034);
      if (lowerWeight===1) lowerCap.push(i);
      if (lowerWeight>0) v.lerp(surfacePoint(v,lowerTriangles),lowerWeight);
      source.push(v); weights.push(w);
      const tendon=Math.max(smooth((v.y-1.550)/.018),1-smooth((v.y-1.370)/.020));
      red.clone().lerp(white,tendon).toArray(colors,i*3);
    }
    if (!cap.length || !fixed.length) throw new Error('头夹肌附着区域校准失败。');
    const mean = (indices) => indices.reduce((sum,i)=>sum.add(source[i]),new THREE.Vector3()).divideScalar(indices.length);
    const insertion=mean(cap), origin=mean(fixed);
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
    m.geometry=geometry; m.material.vertexColors=true; m.material.color.set(0xffffff); m.material.needsUpdate=true;
    return {m,original,geometry,inverse,source,weights,cap,fixed,lowerCap,insertion,origin};
  });
  const mean = (points) => points.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).divideScalar(points.length);
  const insertion=mean(records.map(r=>r.insertion.clone()));
  const origin=mean(records.map(r=>r.origin.clone()));
  // Mirror symmetry gives a sagittal equivalent of both muscles' pull.
  insertion.x=0; origin.x=0;
  const pivot=new THREE.Object3D(); pivot.name='pivot_neck';
  pivot.position.copy(root.worldToLocal(world(O))); root.add(pivot);
  bones.forEach(m=>pivot.attach(m));
  let angle=0, currentInsertion=insertion.clone();

  function update(t) {
    angle=THREE.MathUtils.lerp(NECK_CALIBRATION.lowAngle,NECK_CALIBRATION.levelAngle,THREE.MathUtils.clamp(t,0,1));
    turn.setFromAxisAngle(axis,angle);
    pivot.quaternion.copy(turn); pivot.updateWorldMatrix(true,true);
    for (const r of records) {
      const p=r.geometry.attributes.position;
      r.source.forEach((v,i)=>{
        const q=v.clone().lerp(rotate(v),r.weights[i]).applyMatrix4(r.inverse);
        p.setXYZ(i,q.x,q.y,q.z);
      });
      p.needsUpdate=true; r.geometry.computeVertexNormals();
      r.geometry.computeBoundingBox(); r.geometry.computeBoundingSphere();
    }
    currentInsertion=rotate(insertion);
  }
  function landmarks() {
    const p1=world(currentInsertion), p2=world(rotate(com));
    return {O:world(O),p1,p2,d1:world(origin).sub(p1).normalize(),
      d2:new THREE.Vector3(0,-1,0),f2:50,bar:[p1,world(O),p2]};
  }
  function diagnostics() {
    let attachmentError=0, fixedDrift=0, surfaceAttachmentError=0,lowerSurfaceAttachmentError=0;
    for (const r of records) {
      for (const i of r.cap) {
        const actual=new THREE.Vector3().fromBufferAttribute(r.geometry.attributes.position,i);
        r.m.localToWorld(actual);
        attachmentError=Math.max(attachmentError,actual.distanceTo(world(rotate(r.source[i]))));
        const rest=modelRoot.worldToLocal(actual.clone()).sub(O).applyQuaternion(turn.clone().invert()).add(O);
        surfaceAttachmentError=Math.max(surfaceAttachmentError,rest.distanceTo(surfacePoint(rest)));
      }
      for (const i of r.fixed) {
        const actual=new THREE.Vector3().fromBufferAttribute(r.geometry.attributes.position,i);
        r.m.localToWorld(actual);
        fixedDrift=Math.max(fixedDrift,actual.distanceTo(world(r.source[i])));
      }
      for (const i of r.lowerCap) {
        const actual=new THREE.Vector3().fromBufferAttribute(r.geometry.attributes.position,i);
        r.m.localToWorld(actual); modelRoot.worldToLocal(actual);
        lowerSurfaceAttachmentError=Math.max(lowerSurfaceAttachmentError,actual.distanceTo(surfacePoint(actual,lowerTriangles)));
      }
    }
    const L=landmarks(), muscleMoment=L.p1.clone().sub(L.O).cross(L.d1).x;
    const gravityMoment=L.p2.clone().sub(L.O).cross(L.d2).x;
    return {calibrated:true,muscleNames:records.map(r=>r.m.name),movingBones:bones.length,
      attachmentError,surfaceAttachmentError,lowerSurfaceAttachmentError,fixedDrift,angleDegrees:THREE.MathUtils.radToDeg(angle),
      muscleLength:currentInsertion.distanceTo(origin),muscleMoment,gravityMoment,
      oppositeMoments:muscleMoment*gravityMoment<0,
      hiddenMovingBones:bones.filter(m=>!m.visible).length,
      visibleMuscles:muscles.filter(m=>m.visible).length,
      insertions:records.map(r=>world(rotate(r.insertion)).toArray()),origin:world(origin).toArray()};
  }
  function dispose() {
    for (const r of records) {
      r.m.geometry=r.original; r.geometry.dispose();
      r.m.material.vertexColors=false; r.m.material.color.set(0xc45c5c); r.m.material.needsUpdate=true;
    }
  }
  update(.5);
  return {pivot,moving:bones,update,landmarks,diagnostics,dispose};
}
