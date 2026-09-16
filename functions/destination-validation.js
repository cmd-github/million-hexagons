import {resolve4,resolve6} from 'node:dns/promises';
import {isIP} from 'node:net';

function privateAddress(address){
  if(isIP(address)===4){const [a,b]=address.split('.').map(Number);return a===10||a===127||a===0||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a>=224;}
  const value=address.toLowerCase();return value==='::1'||value==='::'||value.startsWith('fc')||value.startsWith('fd')||value.startsWith('fe8')||value.startsWith('fe9')||value.startsWith('fea')||value.startsWith('feb')||value.startsWith('::ffff:');
}

export async function validateDestinationUrl(value,{lookup=async hostname=>[...(await resolve4(hostname).catch(()=>[])),...(await resolve6(hostname).catch(()=>[]))],request=fetch}={}){
  if(!value)return '';
  let current;try{current=new URL(value);}catch{throw Object.assign(new Error('destination-invalid'),{code:'destination-invalid'});}
  for(let redirect=0;redirect<=3;redirect++){
    if(!['http:','https:'].includes(current.protocol)||current.username||current.password||!current.hostname||current.port&&!['80','443'].includes(current.port))throw Object.assign(new Error('destination-unsafe'),{code:'destination-unsafe'});
    const addresses=await lookup(current.hostname);if(!addresses.length||addresses.some(privateAddress))throw Object.assign(new Error('destination-unsafe'),{code:'destination-unsafe'});
    let response;try{response=await request(current,{method:'GET',redirect:'manual',headers:{Range:'bytes=0-0','User-Agent':'MillionHexagons-LinkCheck/1.0'},signal:AbortSignal.timeout(6000)});}catch{throw Object.assign(new Error('destination-unreachable'),{code:'destination-unreachable'});}
    response.body?.cancel?.();
    if(response.status>=300&&response.status<400&&response.headers.get('location')){current=new URL(response.headers.get('location'),current);continue;}
    if(response.status===404||response.status>=500)throw Object.assign(new Error(response.status===404?'destination-not-found':'destination-unreachable'),{code:response.status===404?'destination-not-found':'destination-unreachable'});
    return current.href;
  }
  throw Object.assign(new Error('destination-too-many-redirects'),{code:'destination-too-many-redirects'});
}
