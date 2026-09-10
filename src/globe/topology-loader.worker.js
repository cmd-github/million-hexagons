import {decodeTopology} from './topology-codec.js';
import {fetchRuntimeJson,fetchRuntimeGzip} from '../runtime-assets.js';
self.onmessage=async()=>{
  try {
    const started=performance.now();
    const meta=await fetchRuntimeJson('topology/geodesic-v1.json');
    const bytes=await fetchRuntimeGzip('topology/geodesic-v1.packed.gz',{persistent:true,expectedBytes:meta.bytes});
    const loaded=performance.now();
    const buffer=decodeTopology(bytes,meta);
    self.postMessage({buffer,manifest:meta,timing:{loadMs:loaded-started,decodeMs:performance.now()-loaded}},[buffer]);
  }catch(error){self.postMessage({error:error.message});}
};
