import {ArtworkTiles} from './tiles.js';
import {decodeOccupancy,SnapshotOwners} from './snapshot-index.js';
import {fetchGzipUrl} from '../runtime-assets.js';

export function validateSnapshotFeed(feed,now=Date.now()){
  if(!feed?.active||!feed.complete||feed.overflow||feed.baseRevision!==feed.active.revision)return false;
  if(!Number.isSafeInteger(feed.revision)||feed.revision<feed.baseRevision)return false;
  if(!Array.isArray(feed.changes)||feed.changes.length>32)return false;
  let cells=0;
  for(const change of feed.changes){
    if(!change.record||!Array.isArray(change.record.cells)||change.record.cells.some(id=>!Number.isInteger(id)||id<1||id>1000000)||!Number.isFinite(change.changedAt)||now-change.changedAt>300000)return false;
    cells+=change.record.cells.length;
  }
  return cells<=100000;
}

export function canActivateSnapshot(feed,next){
  return !!feed?.complete&&!feed.overflow&&feed.revision===next.revision&&feed.active?.snapshotId===next.snapshotId&&feed.active?.base===next.base;
}

// A replacement remains hidden until its inventory, masks and visible tiles are
// ready. A changed/unknown revision hides stale pixels before asynchronous work.
export class SnapshotRuntime{
  constructor({globe,radius,options,request,prepareChanges,activateInventory,onUnavailable,onInvalidate=()=>{}}){
    Object.assign(this,{globe,radius,options,request,prepareChanges,activateInventory,onUnavailable,onInvalidate});
    this.current=null;this.preparing=null;this.lastVerified=0;this.disposed=false;
    this.ready=new Promise(resolve=>{this.resolveReady=resolve;});
  }
  hide(){if(this.current){if(this.current.tiles.group.visible)this.onInvalidate();this.current.tiles.group.visible=false;this.current.changes.visible=false;}}
  async refresh(){
    if(this.busy||this.preparing||this.disposed)return;this.busy=true;
    try{
      const feed=await this.request({action:'artwork-state'});
      if(feed.revision<(this.highestRevision||0))throw Error('Older artwork state rejected');this.highestRevision=feed.revision;
      if(!validateSnapshotFeed(feed))throw Error('Artwork release is catching up');
      if(this.current?.revision===feed.revision&&this.current.snapshotId===feed.active.snapshotId){if(!this.current.tiles.group.visible)this.activateInventory(this.current);this.lastVerified=performance.now();this.current.tiles.group.visible=true;this.current.changes.visible=true;return;}
      this.hide();
      const retainedTiles=this.current?.snapshotId===feed.active.snapshotId?this.current.tiles:null;
      // Once newer authoritative state is known the old pixels cannot be used
      // as fallback. Release them before allocating replacement GPU resources.
      if(!retainedTiles)this.current?.tiles.dispose();this.current?.changes.dispose();this.current=null;
      const tiles=retainedTiles||new ArtworkTiles(this.globe,this.radius,{...this.options,base:feed.active.base});tiles.group.visible=false;
      const candidate={tiles,revision:feed.revision,snapshotId:feed.active.snapshotId,base:feed.active.base,started:performance.now()};this.preparing=candidate;
      await tiles.ready;
      if(tiles.manifest.snapshotId!==candidate.snapshotId||tiles.manifest.revision!==feed.active.revision)throw Error('Artwork manifest does not match release');
      const bits=await fetchGzipUrl(`${candidate.base}/occupancy.gz`,{expectedBytes:125000,expectedSha256:tiles.manifest.occupancySha256});
      candidate.occupancy=decodeOccupancy(bits);
      for(const change of feed.changes)for(const id of change.record.cells)candidate.occupancy[id-1]=['deleted','revoked'].includes(change.record.status)?0:255;
      candidate.changes=await this.prepareChanges(feed.changes.map(c=>c.record));candidate.changes.visible=false;
      candidate.owners=new SnapshotOwners(candidate.base,async url=>{const response=await fetch(url);if(!response.ok)throw Error('Ownership unavailable');return response.json();});
      candidate.records=feed.changes.map(c=>c.record);candidate.ready=true;
    }catch(error){this.hide();this.clearCandidate();this.onUnavailable(error);}finally{this.busy=false;}
  }
  update(camera,height,time){
    if(performance.now()-this.lastVerified>15000)this.hide();
    this.current?.tiles.update(camera,height,time);
    const next=this.preparing;if(!next?.ready||next.verifying)return;
    if(performance.now()-next.started>30000){this.clearCandidate();this.onUnavailable(Error('Artwork preparation timed out'));return;}
    next.tiles.update(camera,height,time);
    if(!next.tiles.selection.length||!next.tiles.selection.every(tile=>next.tiles.views.get(tile.key)?.mesh.visible))return;
    next.verifying=true;
    void this.request({action:'artwork-state',revision:next.revision}).then(feed=>{
      if(this.preparing!==next)return;
      if(!canActivateSnapshot(feed,next))throw Error('Artwork changed during preparation');
      this.current?.tiles.dispose();this.current?.changes.dispose();
      this.current=next;this.preparing=null;this.activateInventory(next);
      this.resolveReady(next);
      next.tiles.group.visible=true;next.changes.visible=true;this.lastVerified=performance.now();
    }).catch(error=>{this.hide();this.clearCandidate();this.onUnavailable(error);});
  }
  clearCandidate(){this.preparing?.tiles.dispose();this.preparing?.changes?.dispose();this.preparing=null;}
  async owner(region,id){
    for(const record of this.current?.records||[])if(record.cells.includes(id))return ['deleted','revoked'].includes(record.status)?null:record.placementId;
    return this.current?.owners.owner(region,id);
  }
  dispose(){this.disposed=true;this.clearCandidate();this.current?.tiles.dispose();this.current?.changes.dispose();}
}
