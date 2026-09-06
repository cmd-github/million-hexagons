import {decodeTopology} from './topology-codec.js';
self.onmessage=async()=>{
  try {
    const [meta,response]=await Promise.all([fetch('/topology/geodesic-v1.json').then(r=>r.json()),fetch('/topology/geodesic-v1.packed.gz')]);
    if(!response.ok)throw Error('Unable to load exact cell data');
    const stream=response.headers.get('content-encoding')==='gzip'?response.body:response.body.pipeThrough(new DecompressionStream('gzip'));
    const bytes=new Uint8Array(await new Response(stream).arrayBuffer()),buffer=decodeTopology(bytes,meta);
    self.postMessage({buffer,manifest:meta},[buffer]);
  }catch(error){self.postMessage({error:error.message});}
};
