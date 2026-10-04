/** One sagittal, quasi-static lumbar model for both lifting styles.
 * Kinematics and numeric values are classroom assumptions, not injury predictions.
 * Source coordinates refer to the bundled BodyParts3D asset (metres).
 */
import * as THREE from 'three';
const V = a => new THREE.Vector3(...a);
const nameOf = m => (m.userData.nameDetail || m.userData.name || m.name).replace(/_/g,' ').replace(/\.\d+$/, '').toLowerCase();
const axis = V([1,0,0]);
const smooth = x => { x=THREE.MathUtils.clamp(x,0,1); return x*x*(3-2*x); };
const Orest=V([0,.974,-.023]), hip=V([.085,.853,-.018]), knee=V([.085,.432,-.027]), ankle=V([.075,.075,-.044]);
export const LIFT_ASSUMPTIONS=Object.freeze({load:100,upperBodyWeight:300,muscleArm:.05});
export const isLiftMuscle=m=>/^(iliocostalis lumborum muscle|longissimus thoracis muscle)$/.test(nameOf(m));
const armName=n=>/^(humerus|radius|ulna|.*metacarpal bone|.*phalanx of .*hand|scaphoid bone|lunate bone|triquetrum bone|pisiform bone|trapezium bone|trapezoid bone|capitate bone|hamate bone)$/.test(n);
const footName=n=>/^(talus|calcaneus|navicular bone|cuboid bone|.*cuneiform bone|.*metatarsal bone|.*phalanx of .*foot|sesamoid bones of foot)$/.test(n);
const pelvicName=n=>/^(hip bone|sacrum|coccyx)$/.test(n);
const pointTurn=(p,origin,q)=>p.clone().sub(origin).applyQuaternion(q).add(origin);

export function liftPose(t, options={}) {
  const progress=THREE.MathUtils.clamp(t,0,1), amount=1-smooth(progress);
  const style=options.style==='squat'?'squat':'stoop';
  const distance=THREE.MathUtils.clamp(options.distance ?? .35,.20,.40);
  const degrees=style==='stoop'?{shin:4,thigh:-4,trunk:75}:{shin:30,thigh:-75,trunk:25};
  const qShin=new THREE.Quaternion().setFromAxisAngle(axis,THREE.MathUtils.degToRad(degrees.shin*amount));
  const qThigh=new THREE.Quaternion().setFromAxisAngle(axis,THREE.MathUtils.degToRad(degrees.thigh*amount));
  const qTrunk=new THREE.Quaternion().setFromAxisAngle(axis,THREE.MathUtils.degToRad(degrees.trunk*amount));
  const kneeNow=pointTurn(knee,ankle,qShin);
  const hipNow=hip.clone().sub(knee).applyQuaternion(qThigh).add(kneeNow);
  const translation=hipNow.clone().sub(hip);
  // Hip hinge moves pelvis and trunk together. O is a lumbar force-analysis
  // section, not the joint about which the entire visible torso must rotate.
  const trunk=p=>pointTurn(p,hip,qTrunk).add(translation);
  const O=trunk(Orest);
  const up=V([0,1,0]).applyQuaternion(qTrunk), posterior=V([0,0,-1]).applyQuaternion(qTrunk);
  const p1=O.clone().addScaledVector(up,.24).addScaledVector(posterior,LIFT_ASSUMPTIONS.muscleArm);
  const handY=.66+.35*smooth(progress);
  const box=V([0,handY-.12,O.z+distance]);
  const bodyCOM=trunk(Orest.clone().add(V([0,.25,.02])));
  const bodyWeight=options.includeBody===false?0:LIFT_ASSUMPTIONS.upperBodyWeight;
  const loadMoment=LIFT_ASSUMPTIONS.load*distance, bodyArm=bodyCOM.z-O.z;
  const bodyMoment=bodyWeight*bodyArm, totalMoment=loadMoment+bodyMoment;
  return {style,progress,distance,O,translation,qShin,qThigh,qTrunk,kneeNow,hipNow,trunk,
    p1,d1:up.clone().negate(),box,handY,bodyCOM,bodyWeight,bodyArm,loadMoment,bodyMoment,totalMoment,
    muscleForce:totalMoment/LIFT_ASSUMPTIONS.muscleArm,
    trunkDegrees:degrees.trunk*amount,kneeDegrees:(degrees.shin-degrees.thigh)*amount};
}

export function createLiftRig({root,modelRoot,meshes}) {
  modelRoot.updateWorldMatrix(true,true);
  const world=p=>modelRoot.localToWorld(p.clone());
  const sourceInverse=modelRoot.matrixWorld.clone().invert();
  const sourceMatrix=m=>sourceInverse.clone().multiply(m.matrixWorld);
  const moving=[],selected=[],groups=[],records=[];
  const makeGroup=name=>{const g=new THREE.Group();g.name=name;root.add(g);groups.push(g);return g;};
  const trunkGroup=makeGroup('lift_trunk'),pelvisGroup=makeGroup('lift_pelvis');
  const legs=[-1,1].map(side=>({side,shin:makeGroup('lift_shin'),thigh:makeGroup('lift_thigh')}));
  const arms=[-1,1].map(side=>({side,upper:makeGroup('lift_upper_arm'),lower:makeGroup('lift_forearm'),
    shoulder:V([side*.163,1.386,-.025]),elbow:V([side*.222,1.100,-.034]),hand:V([side*.269,.812,.027])}));
  const setTransform=(g,restOrigin,currentOrigin,q)=>{
    g.quaternion.copy(q);
    g.position.copy(root.worldToLocal(world(currentOrigin))).sub(restOrigin.clone().applyQuaternion(q));
    // Children were bound below in raw model coordinates.
    g.updateWorldMatrix(true,true);
  };
  function bind(g,m) {
    const source=sourceMatrix(m);g.add(m);source.decompose(m.position,m.quaternion,m.scale);moving.push(m);
  }
  for(const m of meshes) {
    const n=nameOf(m),side=m.userData.restWorld.x<0?-1:1;
    if(isLiftMuscle(m)) {
      selected.push(m);
      const original=m.geometry,geometry=original.clone(),matrix=sourceMatrix(m),inverse=matrix.clone().invert();
      const p=geometry.attributes.position,source=[];
      for(let i=0;i<p.count;i++)source.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix));
      m.geometry=geometry;
      records.push({m,original,geometry,source,inverse});continue;
    }
    if(m.userData.anatType!=='bone')continue;
    let g;
    if(pelvicName(n))g=pelvisGroup;
    else if(/^(tibia|fibula)$/.test(n))g=legs.find(l=>l.side===side).shin;
    else if(/^(femur|patella)$/.test(n))g=legs.find(l=>l.side===side).thigh;
    else if(footName(n)){selected.push(m);continue;}
    else if(armName(n))g=arms.find(a=>a.side===side)[n==='humerus'?'upper':'lower'];
    else if(m.userData.restWorld.y>.1)g=trunkGroup; // restWorld is centred; pelvis excluded above.
    if(g){selected.push(m);bind(g,m);}
  }
  if(records.length!==4 || legs.some(l=>l.shin.children.length!==2) || arms.some(a=>!a.upper.children.length||a.lower.children.length<20))
    throw new Error('搬举模板缺少腰背肌或完整肢段，不能使用估算回退。');
  const extra=new THREE.Group();modelRoot.add(extra);
  const boxMaterial=new THREE.MeshStandardMaterial({color:0xb17b42,roughness:.85});
  const boxMesh=new THREE.Mesh(new THREE.BoxGeometry(.37,.24,.23),boxMaterial);extra.add(boxMesh);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(boxMesh.geometry),new THREE.LineBasicMaterial({color:0xf0d6ad}));boxMesh.add(edges);
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.2),new THREE.MeshStandardMaterial({color:0x303941,roughness:1,side:THREE.DoubleSide}));
  ground.rotation.x=-Math.PI/2;ground.position.set(0,.003,.14);extra.add(ground);
  let pose,options={style:'stoop',distance:.35,includeBody:true},lastKey='',maxReachError=0;
  function update(t) {
    const key=[t,options.style,options.distance,options.includeBody].join(':');if(key===lastKey)return;lastKey=key;
    pose=liftPose(t,options);maxReachError=0;
    setTransform(pelvisGroup,hip,pose.hipNow,pose.qTrunk);
    setTransform(trunkGroup,Orest,pose.O,pose.qTrunk);
    for(const l of legs){
      const a=ankle.clone();a.x*=l.side;
      const k=knee.clone();k.x*=l.side;
      const now=pose.kneeNow.clone();now.x=k.x;
      setTransform(l.shin,a,a,pose.qShin);setTransform(l.thigh,k,now,pose.qThigh);
    }
    for(const a of arms){
      const shoulder=pose.trunk(a.shoulder),target=V([a.side*.185,pose.handY,pose.box.z]);
      const l1=a.elbow.distanceTo(a.shoulder),l2=a.hand.distanceTo(a.elbow);
      const delta=target.clone().sub(shoulder),distance=delta.length(),direction=delta.clone().normalize();
      maxReachError=Math.max(maxReachError,Math.max(0,distance-l1-l2));
      const length=THREE.MathUtils.clamp(distance,Math.abs(l1-l2)+1e-5,l1+l2-1e-5);
      const along=(l1*l1-l2*l2+length*length)/(2*length);
      const perpendicular=new THREE.Vector3().crossVectors(direction,axis).normalize();
      const elbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(perpendicular,Math.sqrt(Math.max(0,l1*l1-along*along)));
      const upperQ=new THREE.Quaternion().setFromUnitVectors(a.elbow.clone().sub(a.shoulder).normalize(),elbow.clone().sub(shoulder).normalize());
      const lowerQ=new THREE.Quaternion().setFromUnitVectors(a.hand.clone().sub(a.elbow).normalize(),target.clone().sub(elbow).normalize());
      setTransform(a.upper,a.shoulder,shoulder,upperQ);setTransform(a.lower,a.elbow,elbow,lowerQ);
      a.currentShoulder=shoulder;a.currentElbow=elbow;a.target=target;
    }
    for(const r of records){
      const p=r.geometry.attributes.position;
      r.source.forEach((v,i)=>{
        const q=pose.trunk(v).applyMatrix4(r.inverse);
        p.setXYZ(i,q.x,q.y,q.z);
      });
      p.needsUpdate=true;r.geometry.computeVertexNormals();r.geometry.computeBoundingBox();r.geometry.computeBoundingSphere();
    }
    boxMesh.position.copy(pose.box);
  }
  function landmarks(){
    return {O:world(pose.O),p1:world(pose.p1),p2:world(pose.box),d1:pose.d1.clone(),d2:V([0,-1,0]),
      f2:LIFT_ASSUMPTIONS.load,bar:[world(pose.p1),world(pose.O),world(pose.box)],
      bodyCOM:world(pose.bodyCOM),bodyWeight:pose.bodyWeight,totalMoment:pose.totalMoment,
      lift:{style:pose.style,distance:pose.distance,bodyArm:pose.bodyArm,loadMoment:pose.loadMoment,bodyMoment:pose.bodyMoment,
        totalMoment:pose.totalMoment,muscleForce:pose.muscleForce,trunkDegrees:pose.trunkDegrees,kneeDegrees:pose.kneeDegrees,
        comparison:['stoop','squat'].map(style=>{const p=liftPose(pose.progress,{...options,style});return {style,loadMoment:p.loadMoment,bodyMoment:p.bodyMoment,bodyArm:p.bodyArm,muscleForce:p.muscleForce};})},
      stageName:pose.style==='stoop'?'直腿弯腰':'屈膝蹲举'};
  }
  const sourcePosition=(g,p)=>modelRoot.worldToLocal(g.localToWorld(p.clone()));
  function diagnostics(){
    let jointError=0,handError=0,attachmentError=0;
    for(const l of legs){
      const h=hip.clone(),k=knee.clone(),a=ankle.clone();h.x*=l.side;k.x*=l.side;a.x*=l.side;
      jointError=Math.max(jointError,
        sourcePosition(l.thigh,h).distanceTo(sourcePosition(pelvisGroup,h)),
        sourcePosition(l.shin,k).distanceTo(sourcePosition(l.thigh,k)),
        sourcePosition(l.shin,a).distanceTo(a));
    }
    for(const a of arms){
      jointError=Math.max(jointError,sourcePosition(a.upper,a.elbow).distanceTo(sourcePosition(a.lower,a.elbow)),
        sourcePosition(a.upper,a.shoulder).distanceTo(pose.trunk(a.shoulder)));
      handError=Math.max(handError,sourcePosition(a.lower,a.hand).distanceTo(a.target));
    }
    for(const r of records)r.source.forEach((v,i)=>{

      const actual=new THREE.Vector3().fromBufferAttribute(r.geometry.attributes.position,i);r.m.localToWorld(actual);modelRoot.worldToLocal(actual);
      attachmentError=Math.max(attachmentError,actual.distanceTo(pose.trunk(v)));
    });
    const gravityMoment=pose.box.clone().sub(pose.O).cross(V([0,-LIFT_ASSUMPTIONS.load,0])).x
      +pose.bodyCOM.clone().sub(pose.O).cross(V([0,-pose.bodyWeight,0])).x;
    const muscleMoment=pose.p1.clone().sub(pose.O).cross(pose.d1.clone().multiplyScalar(pose.muscleForce)).x;
    return {calibrated:true,style:pose.style,...landmarks().lift,jointError,handError,maxReachError,attachmentError,
      momentResidual:Math.abs(gravityMoment+muscleMoment),muscleNames:records.map(r=>nameOf(r.m)),
      movingBones:moving.length,visibleMuscles:records.filter(r=>r.m.visible).length,footBones:selected.filter(m=>footName(nameOf(m))).length,
      bodyWeight:pose.bodyWeight,boxWeight:LIFT_ASSUMPTIONS.load,muscleArm:LIFT_ASSUMPTIONS.muscleArm};
  }
  function dispose(){
    for(const r of records){r.m.geometry=r.original;r.geometry.dispose();}
    extra.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});extra.removeFromParent();
    groups.forEach(g=>g.removeFromParent());
  }
  update(0);
  return {pivot:trunkGroup,moving,selected,update,landmarks,diagnostics,dispose,
    setOptions(value){options={...options,...value};lastKey='';},
    focusBounds(){return new THREE.Box3(world(V([-.38,0,-.20])),world(V([.38,1.76,.60])));}};
}
