// Continuous altitude-relative zoom. A wheel tick near the surface no longer
// changes the entire planet-to-camera radius and jumps to the minimum distance.
export function smoothZoom(canvas,camera,controls,radius,onChange=()=>{}) {
  let target=null,lastTime=performance.now(),pinch=null;
  const pointers=new Map();
  const change=factor=>{onChange();const altitude=(target??camera.position.length())-radius;target=Math.min(controls.maxDistance,Math.max(controls.minDistance,radius+altitude*factor));};
  canvas.addEventListener('wheel',event=>{event.preventDefault();event.stopImmediatePropagation();const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1);change(Math.exp(Math.max(-250,Math.min(250,delta))*.0018));},{capture:true,passive:false});
  canvas.addEventListener('pointerdown',event=>{if(event.pointerType==='touch')pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});},{capture:true});
  canvas.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size!==2)return;const [a,b]=[...pointers.values()],span=Math.hypot(a.x-b.x,a.y-b.y);
    if(pinch&&span>0)change(pinch/span);pinch=span;
    event.stopImmediatePropagation();event.preventDefault();
  },{capture:true,passive:false});
  const end=event=>{pointers.delete(event.pointerId);pinch=null;};canvas.addEventListener('pointerup',end,{capture:true});canvas.addEventListener('pointercancel',end,{capture:true});
  return {change,cancel(){target=null;},update(){const now=performance.now(),dt=Math.min(.1,(now-lastTime)/1000);lastTime=now;if(target===null)return;const current=camera.position.length(),next=target+(current-target)*Math.exp(-14*dt);camera.position.setLength(next);if(Math.abs(next-target)<.0001)target=null;}};
}
