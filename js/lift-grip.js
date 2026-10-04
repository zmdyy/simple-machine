/** Articulated grasp for the bundled hand bones; never bake pose into geometry. */
import * as THREE from 'three';
const v=a=>new THREE.Vector3(...a);
const x=v([1,0,0]);
export const handBone=n=>! /^(humerus|radius|ulna)$/.test(n);
const ordinals=['first','second','third','fourth','fifth'];

export function createLiftHand({arm,makeGroup,bind,sourceMatrix,setTransform,sourcePosition}) {
  const side=arm.side;
  const wrist=v([side*.261,.854,.022]);
  // Local grip centre lies inside the curved fingers, not at the wrist/palm.
  const grip=v([side*.269,.784,.067]);
  const handQ=new THREE.Quaternion().setFromAxisAngle(v([0,1,0]),-side*Math.PI/2);
  const palm=makeGroup('lift_palm'),chains=[];
  const cap=(m,top)=>{
    const p=m.geometry.attributes.position,M=sourceMatrix(m),points=[];
    for(let i=0;i<p.count;i++)points.push(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(M));
    const ys=points.map(p=>p.y),min=Math.min(...ys),max=Math.max(...ys);
    const tip=points.filter(p=>top?p.y>max-(max-min)*.12:p.y<min+(max-min)*.12);
    return tip.reduce((sum,p)=>sum.add(p),new THREE.Vector3()).divideScalar(tip.length);
  };
  // Caps are sampled before any reparenting. Adjacent segments share each
  // joint anchor, preserving the original small cartilage gap.
  for(let f=0;f<5;f++){
    const thumb=f===0;
    const names=thumb?['first metacarpal bone','proximal phalanx of first finger of hand','distal phalanx of first finger of hand']:
      ['proximal','middle','distal'].map(s=>s+' phalanx of '+ordinals[f]+' finger of hand');
    const bones=names.map(n=>arm.handMeshes.find(item=>item.name===n)?.mesh);
    if(bones.some(m=>!m))throw new Error('搬举手部缺少指骨');
    const tops=bones.map(m=>cap(m,true)),bottoms=bones.map(m=>cap(m,false));
    const joints=[tops[0],bottoms[0].clone().lerp(tops[1],.5),bottoms[1].clone().lerp(tops[2],.5)];
    const groups=bones.map((m,i)=>{const g=makeGroup('lift_finger_'+f+'_'+i);bind(g,m);return g;});
    chains.push({groups,joints,tip:bottoms[2],thumb,bones});
  }
  for(const {mesh} of arm.handMeshes)if(!chains.some(c=>c.bones.includes(mesh)))bind(palm,mesh);
  function update(handle){
    const currentWrist=handle.clone().sub(grip.clone().sub(wrist).applyQuaternion(handQ));
    const handPoint=p=>p.clone().sub(wrist).applyQuaternion(handQ).add(currentWrist);
    setTransform(palm,wrist,currentWrist,handQ);
    for(const c of chains){
      let q=new THREE.Quaternion(),at=handPoint(c.joints[0]);
      c.current=[];
      for(let i=0;i<3;i++){
        if(c.thumb&&i===0)q.setFromEuler(new THREE.Euler(-.3,0,-side*.65));
        else q.multiply(new THREE.Quaternion().setFromAxisAngle(x,-(c.thumb?[0,.25,.35]:[.52,1.05,.80])[i]));
        const worldQ=handQ.clone().multiply(q);
        setTransform(c.groups[i],c.joints[i],at,worldQ);c.current.push(at.clone());
        if(i<2)at=at.clone().add(c.joints[i+1].clone().sub(c.joints[i]).applyQuaternion(worldQ));
      }
    }
    arm.target=handle;arm.currentWrist=currentWrist;
    return currentWrist;
  }
  function diagnostics(){
    let fingerJointError=0;
    for(const c of chains)for(let i=1;i<3;i++)fingerJointError=Math.max(fingerJointError,
      sourcePosition(c.groups[i-1],c.joints[i]).distanceTo(sourcePosition(c.groups[i],c.joints[i])));
    const contact=sourcePosition(palm,grip);
    let boxPenetrations=0,minHandleRadius=Infinity;
    const box=arm.target.clone().sub(v([side*.245,.035,0]));
    for(const {mesh} of arm.handMeshes){
      const p=mesh.geometry.attributes.position;
      for(let i=0;i<p.count;i++){
        const point=sourcePosition(mesh,new THREE.Vector3().fromBufferAttribute(p,i));
        const d=point.clone().sub(box);
        if(Math.abs(d.x)<.184&&Math.abs(d.y)<.119&&Math.abs(d.z)<.114)boxPenetrations++;
        if(Math.abs(point.z-arm.target.z)<.070)minHandleRadius=Math.min(minHandleRadius,Math.hypot(point.x-arm.target.x,point.y-arm.target.y));
      }
    }
    return {fingerJointError,boxPenetrations,minHandleRadius,gripError:contact.distanceTo(arm.target),
      wristError:sourcePosition(palm,wrist).distanceTo(sourcePosition(arm.lower,wrist)),
      fingers:chains.length,handMeshes:arm.handMeshes.length,
      tips:chains.map(c=>sourcePosition(c.groups[2],c.tip).toArray())};
  }
  return {wrist,grip,handQ,update,diagnostics};
}
