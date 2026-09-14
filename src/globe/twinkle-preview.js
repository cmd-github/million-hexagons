import * as THREE from 'three';
import {REGION_COUNT, regionBounds} from './region-format.js';

// Decorative layer only. These sprites never change the globe surface, grid,
// artwork, picking, or occupancy state.
export async function createTwinklePreview({globe,camera,radius,topology,occupiedCells}) {
  const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
  const context=canvas.getContext('2d');
  // A softly lit *hex*, not a circular point light. Leave transparent padding
  // around the silhouette so texture filtering cannot turn it into a disc.
  context.beginPath();
  for(let i=0;i<6;i++){
    const angle=Math.PI/3*i+Math.PI/6,x=32+18*Math.cos(angle),y=32+18*Math.sin(angle);
    if(i===0)context.moveTo(x,y);else context.lineTo(x,y);
  }
  context.closePath();
  const gradient=context.createRadialGradient(32,32,2,32,32,22);
  gradient.addColorStop(0,'rgba(255,255,255,1)');
  gradient.addColorStop(.65,'rgba(255,255,255,.9)');
  gradient.addColorStop(1,'rgba(255,255,255,.45)');
  context.fillStyle=gradient;context.fill();
  const texture=new THREE.CanvasTexture(canvas);
  const sprites=Array.from({length:2},()=>{
    const material=new THREE.SpriteMaterial({map:texture,color:0xd7ff55,transparent:true,opacity:0,depthTest:false,depthWrite:false,toneMapped:false});
    const sprite=new THREE.Sprite(material);sprite.scale.setScalar(.075);sprite.visible=false;
    globe.add(sprite);return {sprite,id:0,start:0,duration:0};
  });
  const regions=Array.from({length:REGION_COUNT},(_,key)=>({key,...regionBounds(key)}));
  const loaded=new Set(),loading=new Set();
  let candidates=[];
  function localEye(){return globe.worldToLocal(camera.position.clone()).normalize();}
  async function refreshRegions(){
    const eye=localEye(),chosen=[];
    for(const region of regions.sort((a,b)=>new THREE.Vector3(...b.direction).dot(eye)-new THREE.Vector3(...a.direction).dot(eye))){
      if(new THREE.Vector3(...region.direction).dot(eye)<.35)break;
      if(chosen.every(other=>new THREE.Vector3(...other.direction).dot(new THREE.Vector3(...region.direction))<.95))chosen.push(region);
      if(chosen.length===10)break;
    }
    await Promise.all(chosen.filter(({key})=>!loaded.has(key)&&!loading.has(key)).map(async ({key})=>{
      loading.add(key);
      try {await topology.loadRegion(key,0);loaded.add(key);} catch(error){console.warn('Twinkle region unavailable',error);} finally {loading.delete(key);}
    }));
    candidates=[];
    for(const key of loaded){
      const region=topology.regions.get(key);if(!region)continue;
      for(let i=0;i<region.ids.length;i+=Math.max(1,Math.floor(region.ids.length/80))){
        const id=region.ids[i];if(!occupiedCells[id-1])candidates.push({id,point:new THREE.Vector3(...region.centres.subarray(i*3,i*3+3))});
      }
    }
  }
  void refreshRegions();
  let nextRefresh=0;
  const recent=[];
  function update(time){
    const altitude=camera.position.length()-radius;
    const visibility=THREE.MathUtils.smoothstep(altitude,.9,1.8);
    if(visibility<.01){for(const {sprite} of sprites)sprite.visible=false;return;}
    if(time>nextRefresh&&visibility>.01){nextRefresh=time+5000;void refreshRegions();}
    const eye=localEye();
    for(const state of sprites){
      const {sprite}=state;
      if(time>state.start+state.duration){
        const edgeGuard=radius/camera.position.length()+.14;
        for(let i=recent.length-1;i>=0;i--)if(recent[i].until<time)recent.splice(i,1);
        const choices=candidates.filter(({id,point})=>point.dot(eye)>edgeGuard
          &&!occupiedCells[id-1]
          &&recent.every(entry=>point.dot(entry.point)<.82)
          &&!sprites.some(other=>other!==state&&other.id===id));
        if(choices.length){
          const choice=choices[Math.floor(Math.random()*choices.length)];
          const firstAppearance=state.id===0;
          state.id=choice.id;state.start=time+(firstAppearance?Math.random()*3000:4500+Math.random()*4500);
          state.duration=2200+Math.random()*900;
          sprite.position.copy(choice.point).multiplyScalar(radius+.007);
          recent.push({point:choice.point,until:state.start+state.duration+10000});
        }
      }
      const progress=(time-state.start)/state.duration;
      const pulse=progress>0&&progress<1?Math.min(1,progress*4,(1-progress)*3):0;
      const edgeGuard=radius/camera.position.length()+.14;
      sprite.material.opacity=pulse*.85*visibility*(sprite.position.clone().normalize().dot(eye)>edgeGuard&&!occupiedCells[state.id-1]?1:0);
      sprite.visible=sprite.material.opacity>.005;
    }
  }
  return {update};
}
