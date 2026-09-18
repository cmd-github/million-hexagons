const PLACEMENT_PATH=/^\/placement\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

export function placementIdFromPath(pathname){return pathname.match(PLACEMENT_PATH)?.[1]?.toLowerCase()||'';}

function escapeAttribute(value){return String(value??'').replace(/[&<>'"]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));}
function compact(value,limit){const text=String(value||'').replace(/\s+/g,' ').trim();return text.length<=limit?text:`${text.slice(0,limit-1).trimEnd()}…`;}
function replaceMeta(html,selector,value){
  const escaped=escapeAttribute(value),pattern=selector.startsWith('property=')
    ?new RegExp(`<meta\\s+property=["']${selector.slice(9)}["']\\s+content=["'][^"']*["']\\s*\\/?>(?:\\r?\\n)?`,'i')
    :new RegExp(`<meta\\s+name=["']${selector.slice(5)}["']\\s+content=["'][^"']*["']\\s*\\/?>(?:\\r?\\n)?`,'i');
  const attribute=selector.startsWith('property=')?'property':'name',name=selector.slice(attribute.length+1),tag=`    <meta ${attribute}="${name}" content="${escaped}" />\n`;
  return pattern.test(html)?html.replace(pattern,tag):html.replace('</head>',`${tag}</head>`);
}

export function placementMetadata(record,origin){
  const base=String(origin).replace(/\/$/,''),canonical=`${base}/placement/${record.placementId}`;
  const name=compact(record.title||'Claimed placement',60),count=Math.max(1,Number(record.cellCount)||1),anchor=Math.max(1,Number(record.anchor)||1);
  const title=compact(`${name} on Million Hexagons`,70);
  const description=compact(record.description||`${count.toLocaleString('en-GB')} hexagon${count===1?'':'s'} claimed on the Million Hexagons globe at #${anchor}.`,180);
  const image=record.openGraphImageUrl||record.overviewDataUrl||`${base}/share-preview.svg`;
  return{title,description,canonical,image,imageAlt:`${name} on the Million Hexagons globe`};
}

export function injectPlacementMetadata(html,record,origin){
  const meta=placementMetadata(record,origin);
  let output=html.replace(/<title>[^<]*<\/title>/i,`<title>${escapeAttribute(meta.title)}</title>`);
  for(const [selector,value] of [['name=description',meta.description],['property=og:title',meta.title],['property=og:description',meta.description],['property=og:type','website'],['property=og:url',meta.canonical],['property=og:image',meta.image],['property=og:image:width','1200'],['property=og:image:height','630'],['property=og:image:alt',meta.imageAlt],['name=twitter:card','summary_large_image'],['name=twitter:title',meta.title],['name=twitter:description',meta.description],['name=twitter:image',meta.image]])output=replaceMeta(output,selector,value);
  const canonical=`    <link rel="canonical" href="${escapeAttribute(meta.canonical)}" />\n`;
  output=/<link\s+rel=["']canonical["'][^>]*>/i.test(output)?output.replace(/<link\s+rel=["']canonical["'][^>]*>/i,canonical.trim()):output.replace('</head>',`${canonical}</head>`);
  return output;
}
