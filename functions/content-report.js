const KINDS=new Set(['illegal','rights','unsafe-link','other']);
export function normaliseContentReport(input){
  if(String(input?.website||''))return null;
  const placementId=String(input?.placementId||''),kind=String(input?.kind||''),details=String(input?.details||'').trim(),email=String(input?.email||'').trim().toLowerCase();
  if(!/^[0-9a-f-]{36}$/i.test(placementId)||!KINDS.has(kind)||details.length<10||details.length>1000||email.length>254||(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    throw Object.assign(new Error('invalid-content-report'),{code:'invalid-content-report'});
  return{placementId,kind,details,...(email?{email}:{})};
}
