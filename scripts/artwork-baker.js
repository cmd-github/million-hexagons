import * as THREE from 'three';
import {loadTopology} from '../src/globe/topology.js';
import {captureTile} from '../src/globe/tile-baker.js';
import {addSampleCampaigns} from '../src/globe/samples.js';
import * as icons from 'simple-icons';
const topology=await loadTopology(),renderer=new THREE.WebGLRenderer({alpha:true,antialias:false});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NoToneMapping;
const scene=new THREE.Scene();
const mode=new URLSearchParams(location.search).get('mode')||'sample';
if(mode==='sample') {
  const names=['Adidas','Apple','Cocacola','Google','Ikea','Mastercard','Mcdonalds','Netflix','Nike','Samsung','Spotify','Youtube'];
  const colours=['08090b','f4f4f1','f40009','f7f7f3','0058a3','f2f0eb','da291c','090909','f3f1eb','1428a0','1ed760','ffffff'];
  const brands=Object.fromEntries(names.map((name,i)=>[name,{bg:'#'+colours[i],fg:[1,3,5,8,10,11].includes(i)?'#101820':'#ffffff',path:new Path2D(icons['si'+name].path)}]));
  await addSampleCampaigns(topology,scene,4,brands,(ctx,b,x,y,w,h)=>{const size=Math.min(w,h)*.7;ctx.save();ctx.translate(x+(w-size)/2,y+(h-size)/2);ctx.scale(size/24,size/24);ctx.fillStyle=b.fg;ctx.fill(b.path);ctx.restore();},new Uint8Array(1000000));
} else if(mode==='million') {
  // One independently identified synthetic mark per actual claimable polygon.
  // Used only by the offline compiler, never evaluated by the visitor renderer.
  const material=new THREE.ShaderMaterial({side:THREE.DoubleSide,vertexShader:`attribute vec2 logoUv; attribute float cellId; varying vec2 vUv; varying float vId; void main(){vUv=logoUv;vId=cellId;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec2 vUv;varying float vId;void main(){float id=floor(vId+.5);vec3 bg=.25+.6*fract(vec3(id*.6180339,id*.381966,id*.141421));vec2 q=vUv*5.;float bit=mod(floor(id/pow(2.,mod(floor(q.x)+floor(q.y)*5.,20.))),2.);float inside=step(0.,q.x)*step(q.x,5.)*step(0.,q.y)*step(q.y,4.);vec2 cell=fract(q);float mark=inside*bit*step(.15,cell.x)*step(cell.x,.85)*step(.15,cell.y)*step(cell.y,.85);gl_FragColor=vec4(mix(bg,vec3(.025),mark),1.);
    #include <colorspace_fragment>
    }`});
  for(let start=1;start<=1000000;start+=4096) {
    const end=Math.min(1000001,start+4096),positions=[],uvs=[],ids=[];
    for(let id=start;id<end;id++) {
      const frame=topology.frame(id),polygon=topology.polygon(id),local=polygon.map(p=>topology.project(p,frame));
      for(let k=0;k<polygon.length;k++)for(const [p,uv] of [[topology.centre(id),{x:0,y:0}],[polygon[k],local[k]],[polygon[(k+1)%polygon.length],local[(k+1)%polygon.length]]]){positions.push(...Array.from(p,v=>v*4));uvs.push(uv.x/2+.5,uv.y/2+.5);ids.push(id);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('logoUv',new THREE.Float32BufferAttribute(uvs,2));g.setAttribute('cellId',new THREE.Float32BufferAttribute(ids,1));g.computeBoundingSphere();scene.add(new THREE.Mesh(g,material));
    if(start%65536===1)await new Promise(r=>setTimeout(r,0));
  }
}
scene.traverse(o=>{if(o.material)o.material.side=THREE.DoubleSide;});
window.baker={capture(face,level,x,y,size,gutter){return captureTile(renderer,scene,face,level,x,y,size,gutter).toDataURL('image/png').split(',')[1];}};
