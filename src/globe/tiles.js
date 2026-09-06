import * as THREE from 'three';
import { cubePoint,tileKey } from './cube.js';
import {selectArtworkTiles} from './tile-selection.js';

function describe(face,level,x,y,radius){
  return {key:tileKey(face,level,x,y),face,level,x,y};
}

export class ArtworkTiles {
  constructor(globe,radius,{base='/artwork/sample',maxTiles=128,concurrency=4,anisotropy=8}={}) {
    this.globe=globe;this.radius=radius;this.base=base;this.maxTiles=maxTiles;this.concurrency=concurrency;this.anisotropy=anisotropy;
    this.views=new Map();this.selection=[];this.lastSelection=-Infinity;
    this.cache=new Map();this.queue=[];this.inflight=0;this.epoch=0;this.revision=0;this.errors=0;
    this.group=new THREE.Group();globe.add(this.group);
    this.stats={resident:0,visible:0,pending:0,bytes:0,requests:0,evictions:0};
    this.ready=fetch(`${base}/manifest.json`).then(r=>{if(!r.ok)throw Error('Artwork catalogue unavailable');return r.json();}).then(m=>{this.manifest=m;for(let f=0;f<6;f++)this.request(f,0,0,0);});
  }
  request(face,level,x,y) {
    const key=tileKey(face,level,x,y);let tile=this.cache.get(key);
    if(tile){tile.used=this.epoch;if(!tile.ready&&!tile.loading&&!tile.queued&&(!tile.failed||performance.now()-tile.failed>3000)){tile.queued=true;this.queue.push(tile);}return tile;}
    if(this.cache.size>=(this.capacity??this.maxTiles)){
      const victim=[...this.cache.values()].filter(t=>t.level>0&&!t.loading&&t.used<this.epoch&&!this.protected?.has(t.key)).sort((a,b)=>a.used-b.used)[0];
      if(!victim)return null;
      this.evict(victim);
    }
    tile={...describe(face,level,x,y,this.radius),used:this.epoch,ready:false,queued:true};this.cache.set(key,tile);this.queue.push(tile);return tile;
  }
  async fetchTile(tile) {
    tile.loading=true;this.inflight++;this.stats.requests++;
    try {
      const blob=await this.read(tile.key);
      const bitmap=await createImageBitmap(blob,{imageOrientation:'flipY',premultiplyAlpha:'none'});
      if(this.cache.get(tile.key)!==tile){bitmap.close();return;}
      const texture=new THREE.Texture(bitmap);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;texture.generateMipmaps=true;
      texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;
      texture.anisotropy=this.anisotropy;
      Object.assign(tile,{texture,bitmap,ready:true,loaded:performance.now(),queued:false,bytes:bitmap.width*bitmap.height*4*4/3});
    } catch(error) {tile.queued=false;tile.failed=performance.now();this.errors++;}
    finally {tile.loading=false;this.inflight--;}
  }
  async read(key) {
    if(this.database) {
      const value=await new Promise((resolve,reject)=>{const request=this.database.transaction('tiles').objectStore('tiles').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
      if(value)return value;
    }
    const response=await fetch(`${this.base}/${key}.webp`);if(!response.ok)throw Error(`Missing tile ${key}`);return response.blob();
  }
  geometry(tile) {
    const segments=16,count=2**tile.level,positions=[],uvs=[],indices=[];
    const size=this.manifest.tileSize,gutter=this.manifest.gutter||0,total=size+gutter*2;
    for(let j=0;j<=segments;j++)for(let i=0;i<=segments;i++) {
      // One texel of geometric overlap covers T-junctions between LOD meshes;
      // the baked gutter supplies the correct neighbouring artwork there.
      const s=(i/segments*(size+2)-1)/size,t=(j/segments*(size+2)-1)/size;
      positions.push(...cubePoint(tile.face,(tile.x+s)/count*2-1,1-(tile.y+t)/count*2).map(v=>v*(this.radius+.0007)));
      uvs.push((gutter+s*size)/total,(gutter+(1-t)*size)/total);
    }
    for(let j=0;j<segments;j++)for(let i=0;i<segments;i++){const a=j*(segments+1)+i,b=a+segments+1;indices.push(a,b,a+1,b,b+1,a+1);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeBoundingSphere();return geometry;
  }
  update(camera,height,time) {
    if(!this.manifest)return;
    this.epoch++;
    if(time-this.lastSelection>=60){
      this.selection=selectArtworkTiles(this.globe,camera,this.radius,height,this.manifest);
      this.capacity=Math.max(this.maxTiles,this.selection.length+6+this.concurrency);
      this.lastSelection=time;
    }
    // Protect the complete screen's target set before allocating any requests.
    // No traversal-order allocation, mandatory sibling loads or ancestor chains.
    this.protected=new Set(this.selection.map(t=>t.key));
    for(const view of this.views.values())if(view.source)this.protected.add(view.source.key);
    const wanted=new Set(this.selection.map(t=>t.key));
    for(const [key,view] of this.views)if(!wanted.has(key)){
      // Zooming out must not discard sharp cached children while their new
      // parent page is in flight. Draw them above its temporary fallback.
      const parent=this.selection.find(t=>t.face===view.target.face&&t.level<view.target.level&&Math.floor(view.target.x/2**(view.target.level-t.level))===t.x&&Math.floor(view.target.y/2**(view.target.level-t.level))===t.y);
      if(parent&&!this.cache.get(parent.key)?.ready){view.mesh.renderOrder=2;continue;}
      view.mesh.removeFromParent();view.mesh.geometry.dispose();view.mesh.material.dispose();this.views.delete(key);
    }
    let fallback=0;
    for(const target of this.selection){
      const requested=this.request(target.face,target.level,target.x,target.y);
      let source=requested;
      for(let level=target.level-1;!source?.ready&&level>=0;level--){
        const divisor=2**(target.level-level);
        source=this.cache.get(tileKey(target.face,level,Math.floor(target.x/divisor),Math.floor(target.y/divisor)));
      }
      if(!source?.ready){fallback++;const previous=this.views.get(target.key);if(previous)previous.mesh.visible=false;continue;}
      if(source.level!==target.level)fallback++;
      source.used=this.epoch;
      let view=this.views.get(target.key);
      if(!view){
        const geometry=this.geometry(target);
        const material=new THREE.MeshBasicMaterial({map:source.texture,transparent:true,depthTest:false,depthWrite:false,toneMapped:false});
        const mesh=new THREE.Mesh(geometry,material);mesh.renderOrder=1;this.group.add(mesh);
        view={mesh,target,originalUv:geometry.attributes.uv.array.slice()};this.views.set(target.key,view);
      }
      if(view.source!==source){
        const size=this.manifest.tileSize,g=this.manifest.gutter||0,total=size+g*2;
        const divisor=2**(target.level-source.level),dx=target.x-source.x*divisor,dy=target.y-source.y*divisor;
        const uv=view.mesh.geometry.attributes.uv;
        for(let i=0;i<uv.count;i++){
          const s=(view.originalUv[i*2]*total-g)/size,t=(view.originalUv[i*2+1]*total-g)/size;
          uv.setXY(i,(g+(dx+s)*size/divisor)/total,(g+(divisor-1-dy+t)*size/divisor)/total);
        }
        uv.needsUpdate=true;view.mesh.material.map=source.texture;view.source=source;
      }
      view.mesh.visible=true;
      view.mesh.renderOrder=1;
    }
    this.queue=this.queue.filter(t=>{const keep=this.cache.get(t.key)===t&&t.queued&&(t.level===0||wanted.has(t.key));if(!keep)t.queued=false;return keep;});
    this.queue.sort((a,b)=>a.level-b.level);
    while(this.inflight<this.concurrency&&this.queue.length){const tile=this.queue.shift();tile.queued=false;void this.fetchTile(tile);}
    for(const tile of [...this.cache.values()].sort((a,b)=>a.used-b.used)){
      if(this.cache.size<=this.capacity)break;
      if(tile.level>0&&!tile.loading&&!this.protected.has(tile.key))this.evict(tile);
    }
    this.stats.resident=[...this.cache.values()].filter(t=>t.ready).length;
    this.stats.visible=this.views.size;this.stats.pending=this.inflight+this.queue.length;
    this.stats.bytes=[...this.cache.values()].reduce((sum,t)=>sum+(t.bytes||0),0);
    this.stats.levels=[...new Set(this.selection.map(t=>t.level))].sort();
    this.stats.fallback=fallback;this.stats.required=this.selection.length;this.stats.errors=this.errors;this.stats.capacity=this.capacity;
  }
  evict(tile) {tile.mesh?.removeFromParent();tile.mesh?.geometry.dispose();tile.mesh?.material.dispose();tile.texture?.dispose();tile.bitmap?.close();this.cache.delete(tile.key);this.stats.evictions++;}
  async openSession() {
    if(this.database)return;
    const name=`million-hexagons-artwork-${crypto.randomUUID()}`;
    this.database=await new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('tiles');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    this.databaseName=name;
    addEventListener('pagehide',()=>{this.database.close();indexedDB.deleteDatabase(name);},{once:true});
  }
  async write(key,blob) {
    await this.openSession();
    await new Promise((resolve,reject)=>{const transaction=this.database.transaction('tiles','readwrite');transaction.objectStore('tiles').put(blob,key);transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);});
    const tile=this.cache.get(key);if(tile){this.evict(tile);this.request(tile.face,tile.level,tile.x,tile.y);}
  }
}
