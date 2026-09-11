// Export paging is for the compiler; visitors must not walk the whole catalogue.
export function cataloguePage(body={}){
  const value=Number(body.pageSize??1000),cursor=String(body.cursor||'');
  if(!Number.isSafeInteger(value)||value<1||value>1000)throw Error('invalid-page-size');
  if(cursor&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(cursor))throw Error('invalid-cursor');
  return{pageSize:value,cursor};
}
export function publishedVersion(placement){
  return placement.publicState?.publicVersion||placement.currentPublishedVersion||placement.currentVersion||1;
}
export function nextCatalogueCursor(documents,pageSize){
  // Advance over deleted records too, otherwise a filtered page can hide later owners.
  return documents.length===pageSize?documents.at(-1).id:null;
}
