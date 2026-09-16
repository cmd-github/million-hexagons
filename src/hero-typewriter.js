export const HERO_WORDS=['brand','idea','moment','message','art','story','community','mark','project','vision','cause','business'];
export const HERO_HOLD_MS=3000;

export function shuffleHeroWords(words,random=Math.random){
  const shuffled=[...words];
  for(let index=shuffled.length-1;index>0;index--){const swap=Math.floor(random()*(index+1));[shuffled[index],shuffled[swap]]=[shuffled[swap],shuffled[index]];}
  return shuffled;
}

export function startHeroTypewriter(element,{motion=matchMedia('(prefers-reduced-motion: reduce)'),random=Math.random}={}){
  let timer=0,index=0,text='brand.',deleting=false,stopped=false,order=[];
  const render=value=>{element.textContent=value;};
  const schedule=(delay)=>{clearTimeout(timer);timer=setTimeout(step,delay);};
  const nextOrder=previous=>{const next=shuffleHeroWords(HERO_WORDS,random);if(next.length>1&&next[0]===previous)[next[0],next[1]]=[next[1],next[0]];return next;};
  function reset(){clearTimeout(timer);index=0;text='brand.';order=['brand',...shuffleHeroWords(HERO_WORDS.filter(word=>word!=='brand'),random)];deleting=false;render(text);element.closest('.hero-changing-line')?.classList.toggle('typewriter-running',!motion.matches);if(!motion.matches)schedule(HERO_HOLD_MS);}
  function step(){if(stopped||motion.matches)return;const target=`${order[index]}.`;if(!deleting){if(text.length<target.length){text=target.slice(0,text.length+1);render(text);schedule(115);}else{deleting=true;schedule(HERO_HOLD_MS);}}else if(text.length){text=text.slice(0,-1);render(text);schedule(68);}else{deleting=false;index++;if(index>=order.length){order=nextOrder(order.at(-1));index=0;}schedule(320);}}
  const change=()=>reset();motion.addEventListener?.('change',change);reset();
  return()=>{stopped=true;clearTimeout(timer);motion.removeEventListener?.('change',change);};
}
