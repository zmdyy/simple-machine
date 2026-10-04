/** One sagittal, quasi-static lumbar model for both lifting styles.
 * Kinematics and numeric values are classroom assumptions, not injury predictions.
 * Source coordinates refer to the bundled BodyParts3D asset (metres).
 */
import * as THREE from 'three';
import {createLiftHand, handBone} from './lift-grip.js?v=20261004grip';
const V = a => new THREE.Vector3(...a);
const nameOf = m => (m.userData.nameDetail || m.userData.name || m.name).replace(/_/g,' ').replace(/\.\d+$/, '').toLowerCase();
const axis = V([1,0,0]);
const smooth = x => { x=THREE.MathUtils.clamp(x,0,1); return x*x*(3-2*x); };
const Orest=V([0,.974,-.023]), hip=V([.085,.853,-.018]), knee=V([.085,.432,-.027]), ankle=V([.075,.075,-.044]);
export const LIFT_ASSUMPTIONS=Object.freeze({load:100,upperBodyWeight:300,muscleArm:.05});
const lowerMuscle=n=>/^(gluteus maximus muscle|rectus femoris muscle|vastus (lateralis|medialis|intermedius) muscle)$/.test(n);
export const isLiftMuscle=m=>/^(iliocostalis lumborum muscle|longissimus thoracis muscle)$/.test(nameOf(m));
const armName=n=>/^(humerus|radius|ulna|.*metacarpal bone|.*phalanx of .*hand|scaphoid bone|lunate bone|triquetrum bone|pisiform bone|trapezium bone|trapezoid bone|capitate bone|hamate bone)$/.test(n);
const footName=n=>/^(talus|calcaneus|navicular bone|cuboid bone|.*cuneiform bone|.*metatarsal bone|.*phalanx of .*foot|sesamoid bones of foot)$/.test(n);
const pelvicName=n=>/^(hip bone|sacrum|coccyx)$/.test(n);
const pointTurn=(p,origin,q)=>p.clone().sub(origin).applyQuaternion(q).add(origin);

export function liftPose(t, options={}) {
  const progress=THREE.MathUtils.clamp(t,0,1), amount=1-smooth(progress);
  const style=options.style==='squat'?'squat':'stoop';
  const startDistance=THREE.MathUtils.clamp(options.distance ?? .35,.20,.40);
  // A controlled lifting path: bring the box towards the torso while rising.
  // Both styles use the same distance schedule, not a constant force arm.
  const reach=THREE.MathUtils.lerp(startDistance,.18,smooth(progress));
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
  const shin=p=>pointTurn(p,ankle,qShin);
  const thigh=p=>p.clone().sub(knee).applyQuaternion(qThigh).add(kneeNow);
  const qPatella=qThigh.clone().slerp(qShin,.5);
  const patella=p=>p.clone().sub(knee).applyQuaternion(qPatella).add(kneeNow);
  const up=V([0,1,0]).applyQuaternion(qTrunk), posterior=V([0,0,-1]).applyQuaternion(qTrunk);
  const p1=O.clone().addScaledVector(up,.24).addScaledVector(posterior,LIFT_ASSUMPTIONS.muscleArm);
  const handY=.66+.35*smooth(progress);
  const box=V([0,handY-.12,O.z+reach]);
  const bodyCOM=trunk(Orest.clone().add(V([0,.25,.02])));
  const bodyWeight=options.includeBody===false?0:LIFT_ASSUMPTIONS.upperBodyWeight;
  const distance=box.z-O.z;
  const loadMoment=LIFT_ASSUMPTIONS.load*distance, bodyArm=bodyCOM.z-O.z;
  const bodyMoment=bodyWeight*bodyArm, totalMoment=loadMoment+bodyMoment;
  const hipInsertion=thigh(V([.096,.823,-.088])),hipOrigin=trunk(V([.060,.923,-.093]));
  const kneeInsertion=shin(V([.085,.392,.003])),kneePatella=patella(V([.085,.437,.014]));
  const joint=(O,p1,target,p2,d2,f2,extraMoment,label,effort,load)=>{
    p1=p1.clone();target=target.clone();p2=p2.clone();
    p1.x=target.x=p2.x=O.x; // sagittal projection onto the selected joint plane
    const d1=target.clone().sub(p1).normalize(),r1=p1.clone().sub(O),r2=p2.clone().sub(O);
    const signedArm=r1.clone().cross(d1).x,loadMoment=r2.clone().cross(d2.clone().multiplyScalar(f2)).x+extraMoment;
    return {O,p1,d1,p2,d2,f2,totalMoment:Math.abs(loadMoment),muscleArm:Math.abs(signedArm),
      muscleForce:Math.abs(loadMoment/signedArm),oppositeMoments:loadMoment*signedArm<0,
      pivotLabel:label,effortLabel:effort,loadLabel:load};
  };
  const hipJoint=joint(hipNow,hipOrigin,hipInsertion,box,V([0,-1,0]),50,
    (bodyCOM.z-hipNow.z)*bodyWeight/2,'髋关节 O','臀大肌','单侧分担重物 50 N');
  const kneeJoint=joint(kneeNow,kneeInsertion,kneePatella,V([.085,.003,ankle.z]),V([0,1,0]),350,0,
    '膝关节 O','股四头肌经髌腱','地面支持力 350 N');
  return {style,progress,startDistance,distance,O,translation,qShin,qThigh,qTrunk,qPatella,kneeNow,hipNow,trunk,shin,thigh,patella,hipJoint,kneeJoint,
    p1,d1:up.clone().negate(),box,handY,bodyCOM,bodyWeight,bodyArm,loadMoment,bodyMoment,totalMoment,
    muscleForce:totalMoment/LIFT_ASSUMPTIONS.muscleArm,
    trunkDegrees:degrees.trunk*amount,kneeDegrees:(degrees.shin-degrees.thigh)*amount};
}

// Preserve the elbow hinge plane as well as the segment direction. A shortest
// rotation alone leaves bone roll unconstrained when solving a bent arm.
function hingeRotation(restDirection, direction, hinge) {
  const frame=(long,bendAxis)=>{
    const y=long.clone().normalize();
    const x=bendAxis.clone().addScaledVector(y,-bendAxis.dot(y)).normalize();
    return new THREE.Matrix4().makeBasis(x,y,x.clone().cross(y));
  };
  return new THREE.Quaternion().setFromRotationMatrix(
    frame(direction,hinge).multiply(frame(restDirection,axis).transpose()));
}

export function createLiftRig({root,modelRoot,meshes}) {
  modelRoot.updateWorldMatrix(true,true);
  const world=p=>modelRoot.localToWorld(p.clone());
  const sourceInverse=modelRoot.matrixWorld.clone().invert();
  const sourceMatrix=m=>sourceInverse.clone().multiply(m.matrixWorld);
  const moving=[],selected=[],groups=[],records=[];
  const makeGroup=name=>{const g=new THREE.Group();g.name=name;root.add(g);groups.push(g);return g;};
  const trunkGroup=makeGroup('lift_trunk'),pelvisGroup=makeGroup('lift_pelvis');
  const legs=[-1,1].map(side=>({side,shin:makeGroup('lift_shin'),thigh:makeGroup('lift_thigh'),patella:makeGroup('lift_patella')}));
  const arms=[-1,1].map(side=>({side,upper:makeGroup('lift_upper_arm'),lower:makeGroup('lift_forearm'),
    shoulder:V([side*.163,1.386,-.025]),elbow:V([side*.222,1.100,-.034]),handMeshes:[]}));
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
    if(isLiftMuscle(m)||lowerMuscle(n)) {
      selected.push(m);
      const original=m.geometry,geometry=original.clone(),matrix=sourceMatrix(m),inverse=matrix.clone().invert();
      const p=geometry.attributes.position,source=[];
      for(let i=0;i<p.count;i++)source.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(matrix));
      m.geometry=geometry;
      records.push({m,original,geometry,source,inverse,name:n,side});continue;
    }
    if(m.userData.anatType!=='bone')continue;
    let g;
    if(pelvicName(n))g=pelvisGroup;
    else if(/^(tibia|fibula)$/.test(n))g=legs.find(l=>l.side===side).shin;
    else if(n==='femur'||n==='patella')g=legs.find(l=>l.side===side)[n==='femur'?'thigh':'patella'];
    else if(footName(n)){selected.push(m);continue;}
    else if(armName(n)){
      const arm=arms.find(a=>a.side===side);
      if(handBone(n)){selected.push(m);arm.handMeshes.push({mesh:m,name:n});continue;}
      g=arm[n==='humerus'?'upper':'lower'];
    }
    else if(m.userData.restWorld.y>.1)g=trunkGroup; // restWorld is centred; pelvis excluded above.
    if(g){selected.push(m);bind(g,m);}
  }
  if(records.length!==14 || legs.some(l=>l.shin.children.length!==2) || arms.some(a=>!a.upper.children.length||a.lower.children.length!==2||a.handMeshes.length!==27))
    throw new Error('搬举模板缺少腰背肌或完整肢段，不能使用估算回退。');
  const sourcePosition=(g,p)=>modelRoot.worldToLocal(g.localToWorld(p.clone()));
  for(const arm of arms)arm.grasp=createLiftHand({arm,makeGroup,bind,sourceMatrix,setTransform,sourcePosition});
  const extra=new THREE.Group();modelRoot.add(extra);
  const boxMaterial=new THREE.MeshStandardMaterial({color:0xb17b42,roughness:.85});
  const boxMesh=new THREE.Mesh(new THREE.BoxGeometry(.37,.24,.23),boxMaterial);extra.add(boxMesh);
  const edges=new THREE.LineSegments(new THREE.EdgesGeometry(boxMesh.geometry),new THREE.LineBasicMaterial({color:0xf0d6ad}));boxMesh.add(edges);
  // Rigid side handles, well clear of the box wall so fingers can wrap around.
  const handleMaterial=new THREE.MeshStandardMaterial({color:0x485866,metalness:.5,roughness:.4});
  const cylinder=(a,b,r)=>{const d=b.clone().sub(a);const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),16),handleMaterial);
    m.position.copy(a).lerp(b,.5);m.quaternion.setFromUnitVectors(V([0,1,0]),d.normalize());boxMesh.add(m);};
  for(const side of [-1,1]){
    cylinder(V([side*.245,.035,-.075]),V([side*.245,.035,.075]),.013);
    for(const z of [-.075,.075])cylinder(V([side*.185,.035,z]),V([side*.245,.035,z]),.009);
  }
  const kneeTendons=legs.map(()=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.006,.005,1,12),new THREE.MeshStandardMaterial({color:0xf4e7cd,roughness:.8}));extra.add(m);return m;});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(1.1,1.2),new THREE.MeshStandardMaterial({color:0x303941,roughness:1,side:THREE.DoubleSide}));
  ground.rotation.x=-Math.PI/2;ground.position.set(0,.003,.14);extra.add(ground);
  let pose,options={style:'stoop',distance:.35,includeBody:true},lastKey='',maxReachError=0;
  function musclePoint(r,v){
    if(!lowerMuscle(r.name))return pose.trunk(v);
    // Mirror source-space samples to reuse the calibrated right-leg transforms.
    const p=v.clone();p.x*=r.side;
    let q;
    if(r.name==='gluteus maximus muscle')q=pose.thigh(p).lerp(pose.trunk(p),smooth((p.y-.76)/.13));
    else {
      q=pose.shin(p).lerp(pose.patella(p),smooth((p.y-.400)/.035));
      q.lerp(pose.thigh(p),smooth((p.y-.455)/.10));
      if(r.name==='rectus femoris muscle')q.lerp(pose.trunk(p),smooth((p.y-.80)/.09));
    }
    q.x*=r.side;return q;
  }
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
      setTransform(l.patella,k,now,pose.qPatella);
      const A=pose.kneeJoint.p1.clone(),B=pose.kneeJoint.p1.clone().add(pose.kneeJoint.d1.clone().multiplyScalar(pose.kneeJoint.p1.distanceTo(pose.patella(V([.085,.437,.014])))));
      A.x*=l.side;B.x*=l.side;const d=B.clone().sub(A),m=kneeTendons[legs.indexOf(l)];
      m.position.copy(A).lerp(B,.5);m.quaternion.setFromUnitVectors(V([0,1,0]),d.clone().normalize());m.scale.y=d.length();
    }
    for(const a of arms){
      const shoulder=pose.trunk(a.shoulder),handle=pose.box.clone().add(V([a.side*.245,.035,0]));
      const target=a.grasp.update(handle),wrist=a.grasp.wrist;
      const l1=a.elbow.distanceTo(a.shoulder),l2=wrist.distanceTo(a.elbow);
      const delta=target.clone().sub(shoulder),distance=delta.length(),direction=delta.clone().normalize();
      maxReachError=Math.max(maxReachError,Math.max(0,distance-l1-l2));
      const length=THREE.MathUtils.clamp(distance,Math.abs(l1-l2)+1e-5,l1+l2-1e-5);
      const along=(l1*l1-l2*l2+length*length)/(2*length);
      const perpendicular=new THREE.Vector3().crossVectors(axis,direction).normalize(); // elbow behind the shoulder–wrist line
      const elbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(perpendicular,Math.sqrt(Math.max(0,l1*l1-along*along)));
      const upperDirection=elbow.clone().sub(shoulder),lowerDirection=target.clone().sub(elbow);
      const hinge=lowerDirection.clone().cross(upperDirection).normalize();
      const upperQ=hingeRotation(a.elbow.clone().sub(a.shoulder),upperDirection,hinge);
      const lowerQ=hingeRotation(wrist.clone().sub(a.elbow),lowerDirection,hinge);
      setTransform(a.upper,a.shoulder,shoulder,upperQ);setTransform(a.lower,a.elbow,elbow,lowerQ);
      a.currentShoulder=shoulder;a.currentElbow=elbow;
    }
    for(const r of records){
      const p=r.geometry.attributes.position;
      r.source.forEach((v,i)=>{
        const q=musclePoint(r,v).applyMatrix4(r.inverse);
        p.setXYZ(i,q.x,q.y,q.z);
      });
      p.needsUpdate=true;r.geometry.computeVertexNormals();r.geometry.computeBoundingBox();r.geometry.computeBoundingSphere();
    }
    boxMesh.position.copy(pose.box);
  }
  function landmarks(){
    const focus=options.focus||'lumbar',J=focus==='knee'?pose.kneeJoint:focus==='hip'?pose.hipJoint:null;
    const base={O:world(pose.O),p1:world(pose.p1),p2:world(pose.box),d1:pose.d1.clone(),d2:V([0,-1,0]),
      f2:LIFT_ASSUMPTIONS.load,bar:[world(pose.p1),world(pose.O),world(pose.box)],
      bodyCOM:world(pose.bodyCOM),bodyWeight:pose.bodyWeight,totalMoment:pose.totalMoment,
      lift:{style:pose.style,focus,startDistance:pose.startDistance,distance:pose.distance,bodyArm:pose.bodyArm,loadMoment:pose.loadMoment,bodyMoment:pose.bodyMoment,
        totalMoment:pose.totalMoment,muscleForce:pose.muscleForce,trunkDegrees:pose.trunkDegrees,kneeDegrees:pose.kneeDegrees,
        comparison:['stoop','squat'].map(style=>{const p=liftPose(pose.progress,{...options,style});return {style,distance:p.distance,loadMoment:p.loadMoment,bodyMoment:p.bodyMoment,bodyArm:p.bodyArm,muscleForce:p.muscleForce};})},
      stageName:pose.style==='stoop'?'直腿弯腰':'屈膝蹲举'};
    base.lift.pivotLabel='腰骶部 O';base.lift.effortLabel='腰背肌';base.lift.loadLabel='重物 100 N';
    if(J){
      Object.assign(base,{O:world(J.O),p1:world(J.p1),p2:world(J.p2),d1:J.d1,d2:J.d2,f2:J.f2,totalMoment:J.totalMoment,
        bar:[world(J.p1),world(J.O),world(J.p2)],bodyWeight:focus==='hip'?pose.bodyWeight/2:0,bodyCOM:world(pose.bodyCOM.clone().setX(J.O.x))});
      Object.assign(base.lift,{joint:J.pivotLabel,pivotLabel:J.pivotLabel,effortLabel:J.effortLabel,loadLabel:J.loadLabel,
        totalMoment:J.totalMoment,muscleForce:J.muscleForce,muscleArm:J.muscleArm,
        loadArm:Math.abs(J.p2.clone().sub(J.O).cross(J.d2).x),oppositeMoments:J.oppositeMoments});
    }
    return base;
  }
  function diagnostics(){
    let jointError=0,handError=0,attachmentError=0,fingerJointError=0;
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
      const grip=a.grasp.diagnostics();
      handError=Math.max(handError,grip.gripError,grip.wristError);
      fingerJointError=Math.max(fingerJointError,grip.fingerJointError);
    }
    for(const r of records)r.source.forEach((v,i)=>{

      const actual=new THREE.Vector3().fromBufferAttribute(r.geometry.attributes.position,i);r.m.localToWorld(actual);modelRoot.worldToLocal(actual);
      attachmentError=Math.max(attachmentError,actual.distanceTo(musclePoint(r,v)));
    });
    const L=landmarks();
    const gravityMoment=L.p2.clone().sub(L.O).cross(L.d2.clone().multiplyScalar(L.f2)).x
      +L.bodyCOM.clone().sub(L.O).cross(V([0,-L.bodyWeight,0])).x;
    const muscleMoment=L.p1.clone().sub(L.O).cross(L.d1.clone().multiplyScalar(L.lift.muscleForce)).x;
    return {calibrated:true,knee: {muscleArm:pose.kneeJoint.muscleArm,oppositeMoments:pose.kneeJoint.oppositeMoments},hip:{muscleArm:pose.hipJoint.muscleArm,oppositeMoments:pose.hipJoint.oppositeMoments},style:pose.style,...landmarks().lift,jointError,handError,fingerJointError,maxReachError,attachmentError,
      hands:arms.map(a=>a.grasp.diagnostics()),
      elbows:arms.map(a=>{
        const S=sourcePosition(a.upper,a.shoulder),E=sourcePosition(a.upper,a.elbow),W=sourcePosition(a.lower,a.grasp.wrist);
        const line=W.clone().sub(S).normalize(),offset=E.clone().sub(S);
        offset.addScaledVector(line,-offset.dot(line));
        const upper=E.clone().sub(S).normalize(),forearm=W.clone().sub(E).normalize();
        return {side:a.side,shoulder:S.toArray(),elbow:E.toArray(),wrist:W.toArray(),
          posteriorOffset:-offset.z,flexionDegrees:THREE.MathUtils.radToDeg(upper.angleTo(forearm)),
          hingeDirection:forearm.clone().cross(upper).normalize().toArray()};
      }),
      momentResidual:Math.abs(gravityMoment+muscleMoment),muscleNames:records.map(r=>nameOf(r.m)),
      movingBones:moving.length,visibleMuscles:records.filter(r=>r.m.visible).length,footBones:selected.filter(m=>footName(nameOf(m))).length,
      bodyWeight:pose.bodyWeight,boxWeight:LIFT_ASSUMPTIONS.load,muscleArm:L.lift.muscleArm??LIFT_ASSUMPTIONS.muscleArm};
  }
  function dispose(){
    for(const r of records){r.m.geometry=r.original;r.geometry.dispose();}
    extra.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});extra.removeFromParent();
    groups.forEach(g=>g.removeFromParent());
  }
  update(0);
  return {pivot:trunkGroup,moving,selected,update,landmarks,diagnostics,dispose,
    setVisible(show){kneeTendons.forEach(m=>m.visible=show);},
    setOptions(value){options={...options,...value};lastKey='';},
    focusBounds(){return new THREE.Box3(world(V([-.38,-.06,-.20])),world(V([.38,1.82,.60])));}};
}
