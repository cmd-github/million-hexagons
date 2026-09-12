const endpoint='https://europe-west1-million-hexagons.cloudfunctions.net/stagingPlacements';
export default{
  async fetch(request,env,context){
    const url=new URL(request.url);
    if(url.pathname!=='/api/artwork/state')return env.ASSETS.fetch(request);
    if(request.method!=='GET')return new Response('Method not allowed',{status:405});
    // One bounded state object per edge location; never cache authenticated
    // requests or serve an expired response when the authority is unavailable.
    const key=new Request(`${url.origin}/api/artwork/state`),cache=caches.default;
    const hit=await cache.match(key);if(hit)return hit;
    try{
      const upstream=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'artwork-state'}),signal:AbortSignal.timeout(8000)});
      if(!upstream.ok)return new Response('Artwork state unavailable',{status:503,headers:{'cache-control':'no-store'}});
      const response=new Response(await upstream.text(),{headers:{'content-type':'application/json','cache-control':'public,max-age=2,must-revalidate','x-content-type-options':'nosniff'}});
      context.waitUntil(cache.put(key,response.clone()));return response;
    }catch{return new Response('Artwork state unavailable',{status:503,headers:{'cache-control':'no-store'}});}
  }
};
