import {cardCopy,SHARE_FORMATS} from './card-copy.js';

function loadImage(source){return new Promise((resolve,reject)=>{if(!source){resolve(null);return;}const image=new Image();image.crossOrigin='anonymous';image.onload=()=>resolve(image);image.onerror=reject;image.src=source;});}
function hex(context,x,y,r){context.beginPath();for(let i=0;i<6;i++){const angle=Math.PI/3*i-Math.PI/2,px=x+Math.cos(angle)*r,py=y+Math.sin(angle)*r;i?context.lineTo(px,py):context.moveTo(px,py);}context.closePath();}
function fitText(context,text,maxWidth,start,min=34){let size=start;while(size>min){context.font=`800 ${size}px Manrope, sans-serif`;if(context.measureText(text).width<=maxWidth)break;size-=2;}return size;}

export async function renderShareCard(record,ratio='4x5'){
  const format=SHARE_FORMATS[ratio]||SHARE_FORMATS['4x5'],copy=cardCopy(record,ratio),canvas=document.createElement('canvas');canvas.width=format.width;canvas.height=format.height;const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height,landscape=ratio==='og';
  c.fillStyle='#050b14';c.fillRect(0,0,w,h);
  const pad=landscape?62:72,globeSize=landscape?480:Math.min(760,h*.47),gx=landscape?w-globeSize/2-54:w/2,gy=landscape?h/2:pad+globeSize/2+70;
  c.save();c.beginPath();c.arc(gx,gy,globeSize/2,0,Math.PI*2);c.clip();const gradient=c.createRadialGradient(gx-globeSize*.15,gy-globeSize*.2,10,gx,gy,globeSize*.55);gradient.addColorStop(0,'#143944');gradient.addColorStop(1,'#07151e');c.fillStyle=gradient;c.fillRect(gx-globeSize/2,gy-globeSize/2,globeSize,globeSize);
  const step=globeSize/10,r=step*.52;for(let row=-6;row<7;row++)for(let col=-6;col<7;col++){const x=gx+col*step*.88,y=gy+row*step+(col%2?step/2:0);if(Math.hypot(x-gx,y-gy)>globeSize*.49)continue;hex(c,x,y,r);c.strokeStyle='rgba(213,250,119,.22)';c.lineWidth=2;c.stroke();}
  try{const image=await loadImage(record.logo||record.artworkDataUrl||record.thumbnailDataUrl);if(image){const iw=globeSize*.34,ih=globeSize*.28,x=gx-iw/2,y=gy-ih/2;c.save();hex(c,gx,gy,globeSize*.2);c.clip();const scale=Math.max(iw/image.naturalWidth,ih/image.naturalHeight);c.drawImage(image,gx-image.naturalWidth*scale/2,gy-image.naturalHeight*scale/2,image.naturalWidth*scale,image.naturalHeight*scale);c.restore();hex(c,gx,gy,globeSize*.2);c.strokeStyle='#d5fa77';c.lineWidth=7;c.stroke();}}
  catch{}
  c.restore();
  c.fillStyle='#d5fa77';c.font='600 20px "DM Mono", monospace';c.letterSpacing='3px';c.fillText(`MILLION HEXAGONS${copy.date?'  \u00b7  '+copy.date:''}`,pad,pad);
  const textWidth=landscape?w-globeSize-140:w-pad*2,headlineY=landscape?170:pad+globeSize+115,size=fitText(c,copy.headline,textWidth,landscape?54:64,38);c.font=`800 ${size}px Manrope, sans-serif`;c.fillStyle='#d5dde7';wrap(c,copy.headline,pad,headlineY,textWidth,size*1.08);
  c.font='500 27px Manrope, sans-serif';c.fillStyle='#98adae';const supportY=landscape?headlineY+size*2.25:headlineY+size*2.1;c.fillText(copy.support,pad,supportY);
  c.fillStyle='#d5fa77';c.font='700 29px Manrope, sans-serif';c.fillText(copy.action,pad,h-pad-58);c.textAlign='right';c.fillStyle='#98adae';c.font='500 20px "DM Mono", monospace';c.fillText(copy.address,w-pad,h-pad);c.textAlign='left';
  return canvas;
}

function wrap(c,text,x,y,maxWidth,lineHeight){const words=text.split(' '),lines=[];let line='';for(const word of words){const test=line?`${line} ${word}`:word;if(c.measureText(test).width>maxWidth&&line){lines.push(line);line=word;}else line=test;}lines.push(line);lines.slice(0,3).forEach((value,index)=>c.fillText(value,x,y+index*lineHeight));}

export async function downloadShareCard(record,ratio){const canvas=await renderShareCard(record,ratio),blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`million-hexagons-${record.anchor||record.hexId}-${ratio}.png`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);}
