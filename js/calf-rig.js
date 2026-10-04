/** Calibrated calf / Achilles assembly in source GLB metres. */
import * as THREE from 'three';
const V=a=>new THREE.Vector3(...a),X=V([1,0,0]);
const norm=m=>(m.userData.nameDetail||m.userData.name||m.name).replace(/_/g,' ').replace(/\.\d+$/,'').toLowerCase();
const calfMuscle=n=>/^(lateral head of gastrocnemius|medial head of gastrocnemius|soleus muscle)$/.test(n);
const foot=n=>/^(talus|calcaneus|navicular bone|cuboid bone|.*cuneiform bone|.*metatarsal bone|.*phalanx of .*foot|sesamoid bones of foot)$/.test(n);
const smooth=x=>{x=THREE.MathUtils.clamp(x,0,1);return x*x*(3-2*x);};
// Trim triangles at the section plane, rather than dropping intersecting
// triangles (which leaves spikes at the displayed femoral cross-section).
function distalSection(original,M,height){
  const src=original.index?original.toNonIndexed():original.clone();
  const p=src.attributes.position,n=src.attributes.normal,positions=[],normals=[],rim=[];
  const emit=(a,b,c)=>{for(const v of [a,b,c]){positions.push(...v.p.toArray());normals.push(...v.n.toArray());}};
  for(let i=0;i<p.count;i+=3){
    const poly=[0,1,2].map(k=>{const point=new THREE.Vector3().fromBufferAttribute(p,i+k);return {p:point,n:new THREE.Vector3().fromBufferAttribute(n,i+k),y:point.clone().applyMatrix4(M).y};});
    const clipped=[];
    for(let k=0;k<3;k++){
      const a=poly[k],b=poly[(k+1)%3],inside=a.y<=height;
      if(inside)clipped.push(a);
      if(inside!==(b.y<=height)){const t=(height-a.y)/(b.y-a.y),v={p:a.p.clone().lerp(b.p,t),n:a.n.clone().lerp(b.n,t).normalize(),y:height};clipped.push(v);rim.push(v.p);}
    }
    for(let k=1;k<clipped.length-1;k++)emit(clipped[0],clipped[k],clipped[k+1]);
  }
  if(rim.length){
    const centre=rim.reduce((s,p)=>s.add(p),new THREE.Vector3()).divideScalar(rim.length),C=centre.clone().applyMatrix4(M),normal=V([0,1,0]).transformDirection(M.clone().invert());
    rim.sort((a,b)=>{const A=a.clone().applyMatrix4(M),B=b.clone().applyMatrix4(M);return Math.atan2(A.z-C.z,A.x-C.x)-Math.atan2(B.z-C.z,B.x-C.x);});
    rim.forEach((p,i)=>emit({p:centre,n:normal},{p:rim[(i+1)%rim.length],n:normal},{p,n:normal}));
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.computeBoundingBox();g.computeBoundingSphere();src.dispose();return g;
}
export function createCalfRig({root,modelRoot,meshes}){
  modelRoot.updateWorldMatrix(true,true);
  const world=p=>modelRoot.localToWorld(p.clone()),inverse=modelRoot.matrixWorld.clone().invert();
  const selected=[],moving=[],records=[],restored=[];
  const pivot=new THREE.Group(),follow=new THREE.Group();root.add(pivot,follow);
  const O=V([.095,.017,.078]),ankle=V([.075,.075,-.044]);
  const source=m=>inverse.clone().multiply(m.matrixWorld);
  const bind=(g,m)=>{const M=source(m);g.add(m);M.decompose(m.position,m.quaternion,m.scale);};
  let calcaneus;
  for(const m of meshes){
    if(m.userData.restWorld.x<.015)continue;
    const n=norm(m);
    if(m.userData.anatType==='bone'&&foot(n)){
      selected.push(m);if(n==='calcaneus')calcaneus=m;
      if(!/phalanx|sesamoid/.test(n)){bind(pivot,m);moving.push(m);}continue;
    }
    if(m.userData.anatType==='bone'&&/^(tibia|fibula|femur)$/.test(n)){
      if(n==='femur'){
        const original=m.geometry,g=distalSection(original,source(m),.535);
        m.geometry=g;restored.push({m,original,g});
      }
      selected.push(m);bind(follow,m);continue;
    }
    if(calfMuscle(n)){
      selected.push(m);const original=m.geometry,g=original.clone(),M=source(m),inv=M.clone().invert(),p=g.attributes.position,pts=[];
      for(let i=0;i<p.count;i++)pts.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(M));
      const min=Math.min(...pts.map(p=>p.y)),max=Math.max(...pts.map(p=>p.y));
      const end=pts.filter(p=>p.y<min+.012).reduce((a,p)=>a.add(p),new THREE.Vector3());end.divideScalar(pts.filter(p=>p.y<min+.012).length);
      m.geometry=g;records.push({m,original,g,inv,pts,min,max,end});
    }
  }
  if(!calcaneus||records.length!==3)throw new Error('踮脚缺少跟骨或小腿三头肌');
  // Pick a real posterior calcaneal surface point; do not attach to its centre.
  const M=source(calcaneus),p=calcaneus.geometry.attributes.position,candidates=[];
  for(let i=0;i<p.count;i++)candidates.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(M));
  const seed=V([.077,.044,-.086]);const heel=candidates.reduce((a,b)=>a.distanceTo(seed)<b.distanceTo(seed)?a:b).clone();
  const heelLocal=heel.clone().applyMatrix4(M.clone().invert());
  const extra=new THREE.Group();modelRoot.add(extra);
  const tendonMat=new THREE.MeshStandardMaterial({color:0xf4e7cd,roughness:.8});
  const tendons=records.map(()=>{const m=new THREE.Mesh(new THREE.CylinderGeometry(.005,.004,1,12),tendonMat);extra.add(m);return m;});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(.20,.32),new THREE.MeshStandardMaterial({color:0x33404a,side:THREE.DoubleSide}));ground.rotation.x=-Math.PI/2;ground.position.set(.095,.003,.035);extra.add(ground);
  let q=new THREE.Quaternion(),translation=new THREE.Vector3(),heelNow,ankleNow,ends,lastT;
  const turn=p=>p.clone().sub(O).applyQuaternion(q).add(O);
  function update(t){
    if(t===lastT)return;lastT=t;q.setFromAxisAngle(X,THREE.MathUtils.degToRad(30*t));
    heelNow=turn(heel);ankleNow=turn(ankle);translation.copy(ankleNow).sub(ankle);
    pivot.quaternion.copy(q);pivot.position.copy(root.worldToLocal(world(O))).sub(O.clone().applyQuaternion(q));
    follow.position.copy(root.worldToLocal(world(translation)));pivot.updateWorldMatrix(true,true);follow.updateWorldMatrix(true,true);
    ends=[];
    records.forEach((r,i)=>{
      // Proximal origins follow their bones. Distal aponeurosis shortens towards
      // the rising heel; a separate pale tendon joins the exact mesh endpoint.
      const distal=heelNow.clone().sub(heel).sub(translation).multiplyScalar(.35);
      const deform=v=>v.clone().add(translation).addScaledVector(distal,1-smooth((v.y-r.min)/(r.max-r.min)*2));
      const pos=r.g.attributes.position;r.pts.forEach((v,k)=>{const w=deform(v).applyMatrix4(r.inv);pos.setXYZ(k,w.x,w.y,w.z);});
      pos.needsUpdate=true;r.g.computeVertexNormals();r.g.computeBoundingBox();r.g.computeBoundingSphere();
      const cap=r.pts.filter(v=>v.y<r.min+.012);
      const end=cap.reduce((sum,v)=>sum.add(deform(v)),new THREE.Vector3()).divideScalar(cap.length);ends.push(end);
    });
    tendons.forEach((m,i)=>{const a=i===2?heelNow:ends[2],b=ends[i],d=b.clone().sub(a);
      m.position.copy(a).lerp(b,.5);m.quaternion.setFromUnitVectors(V([0,1,0]),d.clone().normalize());m.scale.y=d.length();});
  }
  function landmarks(){const end=ends[2];return{O:world(O),p1:world(heelNow),d1:end.clone().sub(heelNow).normalize(),p2:world(ankleNow),d2:V([0,-1,0]),f2:600,bar:[world(O),world(heelNow)]};}
  function diagnostics(){
    let originDrift=0;
    for(const r of records)r.pts.forEach((v,i)=>{if(v.y<r.max-.012)return;const actual=new THREE.Vector3().fromBufferAttribute(r.g.attributes.position,i);r.m.localToWorld(actual);modelRoot.worldToLocal(actual);originDrift=Math.max(originDrift,actual.distanceTo(v.clone().add(translation)));});
    const actualHeel=calcaneus.localToWorld(heelLocal.clone());
    const surfaceAttachmentError=actualHeel.distanceTo(world(heelNow));
    return{calibrated:true,muscleNames:records.map(r=>norm(r.m)),visibleMuscles:records.filter(r=>r.m.visible).length,
    insertion:world(heelNow).toArray(),tendonEnds:ends.map(p=>world(p).toArray()),surfaceAttachmentError,originDrift,
    angleDegrees:30*lastT,heelRise:heelNow.y-heel.y,followOffset:translation.toArray(),tendonLengths:ends.map(p=>p.distanceTo(heelNow))};}
  function dispose(){for(const r of records){r.m.geometry=r.original;r.g.dispose();}for(const r of restored){r.m.geometry=r.original;r.g.dispose();}extra.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});extra.removeFromParent();pivot.removeFromParent();follow.removeFromParent();}
  update(0);
  return{pivot,follow,moving,selected,update,landmarks,diagnostics,dispose,
    setVisible(show){tendons.forEach(m=>m.visible=show);},
    focusBounds(){return new THREE.Box3(world(V([.02,-.07,-.14])),world(V([.15,.64,.16])));}};
}
