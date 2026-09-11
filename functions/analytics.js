const TYPES=new Set(['view','click']);

export function normalisePlacementEvent(input){
  const placementId=String(input?.placementId||''),type=String(input?.type||''),sessionId=String(input?.sessionId||'');
  if(!/^[0-9a-f-]{36}$/.test(placementId)||!TYPES.has(type)||!/^[-_a-z0-9]{16,80}$/i.test(sessionId))return null;
  return{placementId,type,sessionId};
}

export function publicMetrics(data={}){return{views:Math.max(0,Number(data.views)||0),clicks:Math.max(0,Number(data.clicks)||0)};}
