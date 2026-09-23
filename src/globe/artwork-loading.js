// Coverage means a rendered preview for every visible tile, including ancestors.
// Fine-detail downloads do not hold the initial screen open.
export function hasArtworkPreview(tiles){
  return !!tiles?.group.visible&&tiles.selection.length>0&&tiles.selection.every(tile=>tiles.views.get(tile.key)?.mesh.visible);
}

export function startArtworkLoading(readState,{beforeReady=()=>{}}={}){
  const loader=document.querySelector('#appLoading'),message=document.querySelector('#loadingMessage');
  const error=document.querySelector('#loadingError'),retry=document.querySelector('#loadingRetry');
  let started=performance.now(),waiting=false,finishing=false;
  const timer=setInterval(()=>{
    const state=readState(),now=performance.now();
    if(state.ready&&!finishing){
      finishing=true;clearInterval(timer);Promise.resolve(beforeReady()).then(()=>{
        loader.hidden=true;document.body.classList.remove('booting');document.body.setAttribute('aria-busy','false');document.querySelector('#world').dataset.artworkReady='true';
      });return;
    }
    if(!waiting){started=now;waiting=true;}
    const failed=state.error||now-started>=30000,slow=now-started>=8000;
    const text=failed?'Could not load the artwork. Please try again.':slow?'Still loading artwork. This is taking longer than usual.':state.message||'Loading artwork…';
    if(message.textContent!==text)message.textContent=text;
    error.hidden=true;retry.hidden=!failed;loader.querySelector('svg').style.display=failed?'none':'';
    document.body.setAttribute('aria-busy',String(!failed));
  },100);
  addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}
