// Offline artwork compilation only. The visitor app uses regional-topology.js.
import {SphericalTopology} from './topology.js';

export async function loadTopology() {
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./topology-loader.worker.js',import.meta.url),{type:'module'});
    worker.onmessage=({data})=>{worker.terminate();if(data.error)reject(Error(data.error));else{const topology=new SphericalTopology(data.buffer,data.manifest);topology.loadTiming=data.timing;resolve(topology);}};
    worker.onerror=error=>{worker.terminate();reject(Error(error.message||'Could not load exact cell data'));};
    worker.postMessage({});
  });
}
