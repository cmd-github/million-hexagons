import{injectPlacementMetadata,placementIdFromPath}from'./social-meta.js';
const endpoint='https://europe-west1-million-hexagons.cloudfunctions.net/stagingPlacements';
export default{
  async fetch(request,env,context){
    const url=new URL(request.url);
    const placementId=placementIdFromPath(url.pathname);
    if(placementId&&request.method==='GET'){
      const cache=caches.default,key=new Request(`${url.href}${url.search?'&':'?'}mh-meta=2`,{headers:{accept:'text/html'}}),hit=await cache.match(key);if(hit)return hit;
      const shell=await env.ASSETS.fetch(new Request(`${url.origin}/`,request));
      try{
        const upstream=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'public-placement',placementId}),signal:AbortSignal.timeout(8000)});
        if(!upstream.ok){const headers=new Headers(shell.headers);headers.set('content-type','text/html;charset=UTF-8');headers.set('cache-control','no-store');headers.set('x-robots-tag','noindex');return new Response(await shell.text(),{status:upstream.status===404?404:503,headers});}
        const {placement}=await upstream.json(),html=injectPlacementMetadata(await shell.text(),placement,url.origin),headers=new Headers(shell.headers);headers.set('content-type','text/html;charset=UTF-8');headers.set('cache-control','public,max-age=60,s-maxage=300');headers.set('x-content-type-options','nosniff');headers.set('x-robots-tag','noindex, nofollow');const response=new Response(html,{headers});
        context.waitUntil(cache.put(key,response.clone()));return response;
      }catch{const headers=new Headers(shell.headers);headers.set('content-type','text/html;charset=UTF-8');headers.set('cache-control','no-store');headers.set('x-robots-tag','noindex');return new Response(await shell.text(),{status:503,headers});}
    }
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
