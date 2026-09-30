const TYPES=new Set(['globe_viewed','globe_searched','placement_viewed','outbound_link_clicked','cells_selected','design_started','design_completed','checkout_started','placement_shared']);
const PLACEMENT_TYPES=new Set(['placement_viewed','outbound_link_clicked','placement_shared']);
const CONTEXT_KEYS=new Set(['cellCount','deviceClass','source']);

export function normaliseAnalyticsEvent(input){
  const type=String(input?.type||''),eventToken=String(input?.eventToken||input?.sessionId||''),placementId=String(input?.placementId||'');
  if(!TYPES.has(type)||!/^[-_a-z0-9]{16,80}$/i.test(eventToken))return null;
  if(PLACEMENT_TYPES.has(type)&&!/^[0-9a-f-]{36}$/.test(placementId))return null;
  if(placementId&&!/^[0-9a-f-]{36}$/.test(placementId))return null;
  const context={};
  for(const [key,value] of Object.entries(input?.context||{}))if(CONTEXT_KEYS.has(key)){
    if(key==='cellCount'&&Number.isSafeInteger(value)&&value>=0&&value<=1000000)context[key]=value;
    if(key==='deviceClass'&&['mobile','tablet','desktop'].includes(value))context[key]=value;
    if(key==='source'&&['direct','search','feed','share','studio','checkout'].includes(value))context[key]=value;
  }
  return{type,eventToken,...(placementId?{placementId}:{}),...(Object.keys(context).length?{context}:{})};
}

export function normalisePlacementEvent(input){return normaliseAnalyticsEvent({...input,type:input?.type==='view'?'placement_viewed':input?.type==='click'?'outbound_link_clicked':input?.type});}
export function metricField(type){return type==='placement_viewed'?'views':type==='outbound_link_clicked'?'clicks':null;}
export function publicMetrics(data={}){return{views:Math.max(0,Number(data.views)||0),clicks:Math.max(0,Number(data.clicks)||0)};}
export function publicGlobalStats(data={}){const claimedCells=Math.max(0,Math.min(1000000,Number(data.claimedCells)||0));return{claimedCells,remainingCells:1000000-claimedCells,placements:Math.max(0,Number(data.placements)||0),views:Math.max(0,Number(data.views)||0),clicks:Math.max(0,Number(data.clicks)||0)};}

/**
 * Counting no longer stores anything on a visitor's device, which also removed
 * the only thing that capped how often one placement could be counted. Without
 * a cap the public endpoint would let anyone inflate their own view count, or a
 * rival's, and those numbers are sold to placement owners.
 *
 * This limits how many events one network address can contribute to one
 * placement in an hour. It exists to stop abuse, not to make the metrics
 * accurate: it never identifies anyone, the address is hashed with a rotating
 * bucket and nothing is kept beyond the window.
 */
export const EVENT_LIMIT_PER_HOUR = 30;
export const EVENT_WINDOW_MS = 60 * 60 * 1000;

export function eventRateKey(hashHex, nowMs, windowMs = EVENT_WINDOW_MS) {
  if (typeof hashHex !== 'string' || !/^[0-9a-f]{16,128}$/.test(hashHex)) return null;
  if (!Number.isSafeInteger(nowMs) || nowMs < 0) return null;
  return `${hashHex}-${Math.floor(nowMs / windowMs)}`;
}

export function overEventLimit(count, limit = EVENT_LIMIT_PER_HOUR) {
  return Number.isSafeInteger(count) && count >= limit;
}
