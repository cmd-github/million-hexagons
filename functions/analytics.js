const TYPES=new Set(['globe_viewed','globe_searched','placement_viewed','outbound_link_clicked','cells_selected','design_started','design_completed','checkout_started','placement_shared']);
const PLACEMENT_TYPES=new Set(['placement_viewed','outbound_link_clicked','placement_shared']);
const CONTEXT_KEYS=new Set(['cellCount','deviceClass','source']);

export function normaliseAnalyticsEvent(input){
  const type=String(input?.type||''),sessionId=String(input?.sessionId||''),placementId=String(input?.placementId||'');
  if(!TYPES.has(type)||!/^[-_a-z0-9]{16,80}$/i.test(sessionId))return null;
  if(PLACEMENT_TYPES.has(type)&&!/^[0-9a-f-]{36}$/.test(placementId))return null;
  if(placementId&&!/^[0-9a-f-]{36}$/.test(placementId))return null;
  const context={};
  for(const [key,value] of Object.entries(input?.context||{}))if(CONTEXT_KEYS.has(key)){
    if(key==='cellCount'&&Number.isSafeInteger(value)&&value>=0&&value<=1000000)context[key]=value;
    if(key==='deviceClass'&&['mobile','tablet','desktop'].includes(value))context[key]=value;
    if(key==='source'&&['direct','search','feed','share','studio','checkout'].includes(value))context[key]=value;
  }
  return{type,sessionId,...(placementId?{placementId}:{}),...(Object.keys(context).length?{context}:{})};
}

export function normalisePlacementEvent(input){return normaliseAnalyticsEvent({...input,type:input?.type==='view'?'placement_viewed':input?.type==='click'?'outbound_link_clicked':input?.type});}
export function metricField(type){return type==='placement_viewed'?'views':type==='outbound_link_clicked'?'clicks':null;}
export function publicMetrics(data={}){return{views:Math.max(0,Number(data.views)||0),clicks:Math.max(0,Number(data.clicks)||0)};}
export function publicGlobalStats(data={}){const claimedCells=Math.max(0,Math.min(1000000,Number(data.claimedCells)||0));return{claimedCells,remainingCells:1000000-claimedCells,placements:Math.max(0,Number(data.placements)||0),views:Math.max(0,Number(data.views)||0),clicks:Math.max(0,Number(data.clicks)||0)};}
