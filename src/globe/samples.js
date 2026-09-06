import * as THREE from 'three';
import { CELL_UNIT } from './topology.js';

export async function addSampleCampaigns(topology, globe, radius, brands, drawMark, occupied) {
  const response=await fetch('/topology/samples-v1.json');
  if(!response.ok)throw Error('Sample inventory could not be loaded');
  const catalogue=await response.json(),palette=Object.values(brands);
  const group=new THREE.Group();globe.add(group);
  for(const [index,sample] of catalogue.samples.entries()) {
    const frame=topology.frame(sample.anchor);
    const contour=sample.boundary.map(id=>topology.project(topology.vertices.subarray(id*3,id*3+3),frame));
    let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
    contour.forEach(p=>{left=Math.min(left,p.x);right=Math.max(right,p.x);top=Math.min(top,p.y);bottom=Math.max(bottom,p.y);});
    const width=right-left,height=bottom-top,positions=[],uvs=[];
    const vertex=p=>{
      const v=new THREE.Vector3(...frame.normal).addScaledVector(new THREE.Vector3(...frame.east),p.x*CELL_UNIT).addScaledVector(new THREE.Vector3(...frame.north),-p.y*CELL_UNIT).normalize().multiplyScalar(radius+.0006);
      positions.push(v.x,v.y,v.z);uvs.push((p.x-left)/width,1-(p.y-top)/height);
    };
    // Subdivide only the coarse union's interior, retaining the exact purchased
    // boundary. This avoids drawing every sample microcell at overview distance.
    const triangle=(a,b,c)=>{
      const vertices=[a,b,c],lengths=vertices.map((p,k)=>{const q=vertices[(k+1)%3];return(p.x-q.x)**2+(p.y-q.y)**2;});
      const k=lengths.indexOf(Math.max(...lengths));
      if(lengths[k]*CELL_UNIT*CELL_UNIT>.000225){const u=vertices[k],v=vertices[(k+1)%3],w=vertices[(k+2)%3],m={x:(u.x+v.x)/2,y:(u.y+v.y)/2};triangle(u,m,w);triangle(m,v,w);}
      else {vertex(a);vertex(c);vertex(b);}
    };
    THREE.ShapeUtils.triangulateShape(contour.map(p=>new THREE.Vector2(p.x,p.y)),[]).forEach(t=>triangle(...t.map(k=>contour[k])));
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    const art=document.createElement('canvas');art.width=2048;art.height=Math.round(2048*height/width);
    const context=art.getContext('2d'),brand=palette[index%palette.length];context.fillStyle=brand.bg;context.fillRect(0,0,art.width,art.height);
    drawMark(context,brand,art.width*.18,art.height*.18,art.width*.64,art.height*.64);
    const texture=new THREE.CanvasTexture(art);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({map:texture,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,side:THREE.DoubleSide}));mesh.renderOrder=1;group.add(mesh);
    sample.ids.forEach(id=>{occupied[id-1]=255;});
  }
  return group;
}
