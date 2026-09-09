import {decodeTopology} from './topology-codec.js';
import {fetchRuntimeJson,fetchRuntimeGzip} from '../runtime-assets.js';
self.onmessage=async()=>{
  try {
    const [meta,bytes]=await Promise.all([fetchRuntimeJson('topology/geodesic-v1.json'),fetchRuntimeGzip('topology/geodesic-v1.packed.gz')]);
    const buffer=decodeTopology(bytes,meta);
    self.postMessage({buffer,manifest:meta},[buffer]);
  }catch(error){self.postMessage({error:error.message});}
};
