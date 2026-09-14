import * as THREE from 'three';

const SIZE={width:768,height:384};
const PRESETS=[
  {id:'current',label:'Current'},
  {id:'drift',label:'Drift'},
  {id:'drape',label:'Strata Drape'},
  {id:'crisp',label:'Strata Crisp'},
];
const clampByte=value=>Math.max(0,Math.min(255,Math.round(value)));
const smoothstep=(a,b,value)=>{const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t);};

// The studies change only the base sphere's emissive colour. The tiny cell
// lattice in Claude's renders is intentionally not approximated with new meshes.
function studyColour(preset,u,v){
  const latitude=v*2-1;
  const wave=.026*Math.sin(u*Math.PI*4)+.012*Math.sin(u*Math.PI*10+1.1);
  const axis=Math.abs(latitude+wave);
  let lightness=1,cool=0;
  if(preset==='drift'){
    const broad=Math.sin(u*Math.PI*4+latitude*3.6);
    const cross=Math.sin(u*Math.PI*7-latitude*5.2+.8);
    const current=.5+.32*broad+.18*cross;
    lightness=.62+.68*current+.08*(1-axis);
    cool=.18*(current-.5);
  }else if(preset==='drape'){
    const inner=1-smoothstep(.23,.34,axis);
    const middle=(1-smoothstep(.57,.69,axis))*smoothstep(.21,.32,axis);
    lightness=.60+.57*inner+.35*middle;
    cool=.08*inner;
  }else if(preset==='crisp'){
    lightness=1.32-.30*smoothstep(.224,.236,axis)-.29*smoothstep(.454,.466,axis)-.22*smoothstep(.704,.716,axis);
    cool=axis<.46?.08:0;
  }
  return [clampByte(28*lightness+5*cool),clampByte(53*lightness+9*cool),clampByte(69*lightness+12*cool),255];
}

function studyTexture(preset){
  const {width,height}=SIZE,data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const offset=(y*width+x)*4;
    data.set(studyColour(preset,(x+.5)/width,(y+.5)/height),offset);
  }
  const texture=new THREE.DataTexture(data,width,height,THREE.RGBAFormat);
  texture.colorSpace=THREE.SRGBColorSpace;
  texture.wrapS=THREE.RepeatWrapping;
  texture.minFilter=THREE.LinearMipmapLinearFilter;
  texture.magFilter=THREE.LinearFilter;
  texture.generateMipmaps=true;
  texture.needsUpdate=true;
  return texture;
}

export function mountGlobeStudy({material,artworkGroups,pauseRotation}){
  const original={emissive:material.emissive.clone(),emissiveMap:material.emissiveMap,emissiveIntensity:material.emissiveIntensity};
  const textures=new Map(PRESETS.slice(1).map(({id})=>[id,studyTexture(id)]));
  const style=document.createElement('style');
  style.textContent=`
    .globe-study{position:fixed;right:18px;bottom:18px;z-index:8;width:260px;box-sizing:border-box;padding:14px;background:#09121deb;border:1px solid #d5fa7759;border-radius:13px;box-shadow:0 10px 30px #0009;color:#edf5ef;font:12px Manrope,system-ui,sans-serif}
    .creating .globe-study{display:none}
    .globe-study header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
    .globe-study header strong{font-size:13px}.globe-study button{font:inherit;cursor:pointer}
    .globe-study .study-collapse{border:0;background:none;color:#d5fa77;padding:3px 6px}
    .globe-study .study-options{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0 12px}
    .globe-study .study-options button{min-height:34px;padding:4px 6px;border:1px solid #6b838555;border-radius:7px;background:#142633;color:#dce8e7}
    .globe-study .study-options button[aria-pressed=true]{border-color:#d5fa77;background:#d5fa7728;color:#d5fa77}
    .globe-study label{display:flex;align-items:center;gap:8px;margin:0;cursor:pointer}.globe-study input{width:16px;height:16px;flex:0 0 16px;margin:0;padding:0;accent-color:#d5fa77}
    .globe-study small{display:block;margin-top:8px;color:#a9bbbf;line-height:1.35}
    .globe-study[data-collapsed=true]{width:auto;padding:5px 8px}.globe-study[data-collapsed=true] .study-body,.globe-study[data-collapsed=true] .study-title{display:none}
    @media (pointer:coarse){
      .globe-study{width:420px;padding:18px;font-size:19px}
      .globe-study header strong{font-size:20px}.globe-study .study-collapse{min-width:60px;min-height:52px;font-size:18px}
      .globe-study .study-options{gap:10px;margin:12px 0}.globe-study .study-options button{min-height:96px;font-size:18px}
      .globe-study label{min-height:56px;font-size:18px}.globe-study input{width:30px;height:30px;flex-basis:30px}
      .globe-study small{font-size:14px}.globe-study[data-collapsed=true]{padding:5px 8px}
    }
  `;
  document.head.append(style);
  const panel=document.createElement('aside');
  panel.className='globe-study';panel.setAttribute('aria-label','Local globe study');
  panel.innerHTML=`<header><strong class="study-title">Local globe study</strong><button class="study-collapse" type="button" aria-label="Collapse study controls">Hide</button></header>
    <div class="study-body"><div class="study-options" role="group" aria-label="Globe treatment"></div>
    <label><input class="study-artwork" type="checkbox" checked> Show staging artwork</label>
    <small>Artwork off is visual only. Claims and interactions remain live.</small></div>`;
  document.body.append(panel);
  const options=panel.querySelector('.study-options');
  let preset='current',artwork=true;
  pauseRotation();
  for(const item of PRESETS){
    const button=document.createElement('button');button.type='button';button.textContent=item.label;button.dataset.preset=item.id;
    button.setAttribute('aria-pressed',String(item.id===preset));button.addEventListener('click',()=>setPreset(item.id));options.append(button);
  }
  function setPreset(next){
    if(!textures.has(next)&&next!=='current')throw Error(`Unknown globe study: ${next}`);
    pauseRotation();preset=next;
    material.emissiveMap=next==='current'?original.emissiveMap:textures.get(next);
    if(next==='current')material.emissive.copy(original.emissive);else material.emissive.setHex(0xffffff);
    material.emissiveIntensity=original.emissiveIntensity;
    material.needsUpdate=true;
    for(const button of options.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.preset===next));
  }
  function setArtwork(visible){
    artwork=Boolean(visible);for(const group of artworkGroups)group.visible=artwork;
    panel.querySelector('.study-artwork').checked=artwork;
  }
  panel.querySelector('.study-artwork').addEventListener('change',event=>setArtwork(event.target.checked));
  panel.querySelector('.study-collapse').addEventListener('click',event=>{
    const collapsed=panel.dataset.collapsed!=='true';panel.dataset.collapsed=String(collapsed);
    event.currentTarget.textContent=collapsed?'Study':'Hide';
    event.currentTarget.setAttribute('aria-label',collapsed?'Expand study controls':'Collapse study controls');
  });
  window.globeStudy={setPreset,setArtwork,state:()=>({preset,artwork})};
  return window.globeStudy;
}
