export const HERO_WORDS=['brand','idea','moment','message','art','story','community','mark'];

export function startHeroTypewriter(element,{motion=matchMedia('(prefers-reduced-motion: reduce)')}={}){
  let timer=0,index=0,text='brand',deleting=false,stopped=false;
  const render=value=>{element.textContent=value;};
  const schedule=(delay)=>{clearTimeout(timer);timer=setTimeout(step,delay);};
  function reset(){clearTimeout(timer);index=0;text='brand';deleting=false;render(text);element.closest('.hero-changing-line')?.classList.toggle('typewriter-running',!motion.matches);if(!motion.matches)schedule(2000);}
  function step(){if(stopped||motion.matches)return;const target=HERO_WORDS[index];if(!deleting){if(text.length<target.length){text=target.slice(0,text.length+1);render(text);schedule(115);}else{deleting=true;schedule(2000);}}else if(text.length){text=text.slice(0,-1);render(text);schedule(68);}else{deleting=false;index=(index+1)%HERO_WORDS.length;schedule(320);}}
  const change=()=>reset();motion.addEventListener?.('change',change);reset();
  return()=>{stopped=true;clearTimeout(timer);motion.removeEventListener?.('change',change);};
}
