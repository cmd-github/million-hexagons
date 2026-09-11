// Dry run by default. --apply requires MH_FIXTURE_OWNER_EMAIL and staging QA access.
// Fixed fixture IDs make retries safe and preserve subsequent owner edits.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { loadEnv } from 'vite';
import { SphericalTopology } from '../src/globe/topology.js';
import { footprintBounds } from '../src/placements/geometry.js';

const settings = { ...loadEnv('staging', process.cwd(), 'MH_'), ...process.env };
const apply = process.argv.includes('--apply');
const api = 'https://europe-west1-million-hexagons.cloudfunctions.net/stagingPlacements';
const headers = {'content-type':'application/json','x-mh-qa-key':settings.MH_STAGING_QA_KEY || settings.MH_R2_SECRET_ACCESS_KEY || '', 'x-mh-qa-owner':`staging-qa-${crypto.randomUUID()}`};
if (apply && (!settings.MH_FIXTURE_OWNER_EMAIL || !headers['x-mh-qa-key'])) throw Error('Set MH_FIXTURE_OWNER_EMAIL and staging QA credentials locally.');
async function request(body, authenticated = false) {
  const response = await fetch(api, {method:'POST',headers:authenticated ? headers : {'content-type':'application/json'},body:JSON.stringify(body)});
  const value = await response.json();
  if (!response.ok || !value.ok) throw Error(`${body.action}: ${value.error || response.status}`);
  return value;
}
const data = await fs.readFile('public/topology/geodesic-v1.bin');
const grid = new SphericalTopology(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),JSON.parse(await fs.readFile('public/topology/geodesic-v1.json','utf8')));
const existing = (await request({action:'public-list'})).placements;
const occupied = new Set(existing.flatMap(p=>p.cells));
const fixtures = [
  ['Northstar',1800,'rectangle',-18,15,'#142f62','#ffe5a0'],
  ['Moss',360,'patch',28,48,'#c5ed8f','#183e2a'],
  ['Daybreak',4200,'strip',-38,-32,'#fd7042','#fff5cb'],
  ['Orbit',96,'diamond',48,-12,'#b3a0ff','#201945'],
  ['Tide',900,'rectangle',8,-68,'#7ce5e0','#123544'],
  ['Fable',7200,'patch',-10,105,'#da91c2','#482342'],
  ['Kite',48,'strip',60,112,'#ffda53','#27251d'],
  ['Ember',2400,'diamond',-50,155,'#bd3c36','#fff0d5'],
  ['Fieldwork',650,'rectangle',20,-138,'#f4e9ca','#245c43'],
  ['Nightjar',12000,'rectangle',-15,-165,'#30244e','#d4b6ff'],
  ['Good Egg',240,'patch',-65,-92,'#ffdb75','#713c2c'],
  ['Signal',3200,'strip',42,-48,'#b8ef52','#203326'],
];

function footprint(anchor,count,shape) {
  const frame=grid.frame(anchor),seen=new Set([anchor]),frontier=[anchor],ids=[];
  const score=id=>{const {x,y}=grid.project(grid.centre(id),frame);return shape==='strip'?Math.max(Math.abs(x)/2.4,Math.abs(y)*2.4):shape==='diamond'?Math.abs(x)+Math.abs(y):shape==='patch'?Math.max(Math.abs(x)/1.4,Math.abs(y)*(x>0?1.8:.8)):Math.max(Math.abs(x)/1.5,Math.abs(y)*1.5);};
  while(ids.length<count && frontier.length) {
    frontier.sort((a,b)=>score(b)-score(a)||b-a);
    const id=frontier.pop();
    if(occupied.has(id))continue;
    ids.push(id);
    for(const next of grid.neighboursOf(id))if(!seen.has(next)){seen.add(next);frontier.push(next);}
  }
  if(ids.length!==count || !ids.includes(anchor) || !grid.isConnected(ids))throw Error('Invalid fixture footprint');
  return grid.cells(ids,anchor);
}
await fs.mkdir('artifacts/editable-brands',{recursive:true});
const report=[];
const previews=[];
for (const [name,count,shape,latitude,longitude,background,foreground] of fixtures) {
  const hex=crypto.createHash('sha256').update(`editable-brands-v1:${name}`).digest('hex');
  const fixtureId=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
  const old=existing.find(p=>p.placementId===fixtureId);
  if(old){
    if(apply)await request({action:'create-fixture',fixtureId,ownerEmail:settings.MH_FIXTURE_OWNER_EMAIL},true);
    report.push({name,placementId:fixtureId,cells:old.cellCount,existing:true});continue;
  }
  const lat=latitude*Math.PI/180,lon=longitude*Math.PI/180;
  const anchor=grid.pick([Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)]);
  const cells=footprint(anchor,count,shape),ids=cells.map(c=>c.id),bounds=footprintBounds(cells);
  ids.forEach(id=>occupied.add(id));
  const width=Math.round(1200*Math.min(1,bounds.width/bounds.height)),height=Math.round(1200*Math.min(1,bounds.height/bounds.width));
  const font=Math.min(width*(shape==='diamond'?.50:.72)/(name.length*.8),height*.36);
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${background}"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="${font}" fill="${foreground}">${name.toUpperCase()}</text><path d="M ${width*.3} ${height*.77} H ${width*.7}" stroke="${foreground}" stroke-width="${Math.max(2,height*.015)}"/></svg>`;
  const artwork=await sharp(Buffer.from(svg)).png().toBuffer();
  await fs.writeFile(`artifacts/editable-brands/${name.toLowerCase().replaceAll(' ','-')}.png`,artwork);
  const artworkDataUrl=`data:image/png;base64,${artwork.toString('base64')}`;
  const polygons=cells.map(cell=>`<polygon points="${cell.polygon.map(p=>`${(p.x-bounds.left)/bounds.width*width},${(p.y-bounds.top)/bounds.height*height}`).join(' ')}"/>`).join('');
  const clipped=await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><clipPath id="footprint">${polygons}</clipPath></defs><image href="${artworkDataUrl}" width="${width}" height="${height}" clip-path="url(#footprint)"/></svg>`)).resize(360,220,{fit:'contain',background:'#091620'}).png().toBuffer();
  previews.push({input:clipped,left:(previews.length%3)*380,top:Math.floor(previews.length/3)*240});
  const placement={topologyVersion:'geodesic-v1',anchor,cells:ids,title:name,description:'An editable staging test brand. Created to exercise the same ownership and artwork flow as purchased placements.',destinationUrl:'',artworkDataUrl,sourceArtworkDataUrl:artworkDataUrl,originalArtworkDataUrl:artworkDataUrl,designState:{schemaVersion:1,topologyVersion:'geodesic-v1',anchor,cells:ids.map(id=>({id})),baseColour:background,imageTransform:{scale:100,x:0,y:0,rotation:0,treatment:'original'}}};
  const result=apply?await request({action:'create-fixture',fixtureId,ownerEmail:settings.MH_FIXTURE_OWNER_EMAIL,placement},true):null;
  report.push({name,placementId:fixtureId,cells:count,shape,anchor,latitude,longitude,created:!!result});
  await fs.writeFile('artifacts/editable-brands/report.json',JSON.stringify(report,null,2));
}
if(previews.length)await sharp({create:{width:1140,height:Math.ceil(previews.length/3)*240,channels:4,background:'#091620'}}).composite(previews).png().toFile('artifacts/editable-brands/footprints.png');
console.log(JSON.stringify({applied:apply,totalCells:report.reduce((n,p)=>n+p.cells,0),placements:report},null,2));
