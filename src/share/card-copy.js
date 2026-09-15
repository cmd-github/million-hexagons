const TOTAL_CELLS=1_000_000;

export function displayName(record={}){
  const value=String(record.name||record.title||'').replace(/\s+/g,' ').trim();
  return value.slice(0,60);
}

export function cardCopy(record={},ratio='4x5'){
  const name=displayName(record),count=Math.max(1,Number(record.count||record.cellCount||1)),hexId=Math.max(1,Number(record.anchor||record.hexId||1));
  const linkable=ratio==='1x1'||ratio==='og';
  return {
    name,
    headline:name?`${name} is on the globe.`:'A new place on the globe.',
    support:`${count.toLocaleString('en-GB')} of ${TOTAL_CELLS.toLocaleString('en-GB')} hexagons claimed.`,
    action:linkable?'See it on the globe \u2192':`Search #${hexId} to find it`,
    address:`millionhexagons.com \u00b7 #${hexId}`,
    hexId:`#${hexId}`,
    date:record.createdAt?new Date(record.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase():'',
    shareText:name?`${name} is on the Million Hexagons globe. Find the placement at #${hexId}.`:`A new place is on the Million Hexagons globe. Find the placement at #${hexId}.`,
  };
}

export const SHARE_FORMATS={
  '1x1':{label:'Square',width:1080,height:1080},
  '4x5':{label:'Portrait',width:1080,height:1350},
  '9x16':{label:'Story',width:1080,height:1920},
  og:{label:'Landscape',width:1200,height:630},
};
