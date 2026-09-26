import { randomUUID } from 'node:crypto';

function creditAmount(value){const amount=Number(value);return Number.isSafeInteger(amount)&&amount>0&&amount<=1_000_000?amount:null;}

export async function issueCredits(db,{ownerId,amount,reason,actorId,source='support',idempotencyKey=randomUUID()},timestamp){
  const credits=creditAmount(amount);if(!ownerId||!credits||!reason||!actorId)throw Object.assign(new Error('invalid-credit-entry'),{code:'invalid-credit-entry'});
  if(!['support','promotion','moderation'].includes(source))throw Object.assign(new Error('invalid-credit-entry'),{code:'invalid-credit-entry'});
  const balanceRef=db.collection('stagingCreditBalances').doc(ownerId),entryRef=db.collection('stagingCreditLedger').doc(idempotencyKey);
  return db.runTransaction(async transaction=>{const [balance,entry]=await Promise.all([transaction.get(balanceRef),transaction.get(entryRef)]);if(entry.exists)return entry.data().result;
    const next=Number(balance.data()?.available||0)+credits,result={ownerId,available:next,delta:credits};
    transaction.set(balanceRef,{ownerId,available:next,unit:'hexagon',updatedAt:timestamp},{merge:true});transaction.create(entryRef,{entryId:idempotencyKey,ownerId,delta:credits,type:'issue',source,unit:'hexagon',cashValue:false,transferable:false,reason:String(reason).slice(0,160),actorId,createdAt:timestamp,result});return result;});
}

export async function redeemCredits(db,{ownerId,amount,placementId,actorId,idempotencyKey=randomUUID()},timestamp){
  const credits=creditAmount(amount);if(!ownerId||!credits||!placementId||!actorId)throw Object.assign(new Error('invalid-credit-entry'),{code:'invalid-credit-entry'});
  const balanceRef=db.collection('stagingCreditBalances').doc(ownerId),entryRef=db.collection('stagingCreditLedger').doc(idempotencyKey);
  return db.runTransaction(async transaction=>{const [balance,entry]=await Promise.all([transaction.get(balanceRef),transaction.get(entryRef)]);if(entry.exists)return entry.data().result;const available=Number(balance.data()?.available||0);if(available<credits)throw Object.assign(new Error('insufficient-credits'),{code:'insufficient-credits'});
    const result={ownerId,available:available-credits,delta:-credits};transaction.set(balanceRef,{ownerId,available:result.available,unit:'hexagon',updatedAt:timestamp},{merge:true});transaction.create(entryRef,{entryId:idempotencyKey,ownerId,delta:-credits,type:'redeem',placementId,unit:'hexagon',cashValue:false,transferable:false,actorId,createdAt:timestamp,result});return result;});
}

async function availableFor(db,ownerId){return Number((await db.collection('stagingCreditBalances').doc(ownerId).get()).data()?.available||0);}

/** Total credits a person holds across every owner id their identity resolves to. */
export async function creditsAvailableForOwners(db,ownerIds){
  const balances=await Promise.all([...new Set(ownerIds)].map(ownerId=>availableFor(db,ownerId)));
  return balances.reduce((sum,value)=>sum+value,0);
}

/**
 * Spends up to `amount` credits across a person's owner ids. Balances can sit
 * under both their uid and their email-derived id, so this walks them in order.
 * A race that empties a balance mid-way stops the walk instead of failing the
 * purchase: the caller charges for whatever was not covered, so the amount
 * actually redeemed is always what the customer is credited for.
 */
export async function redeemCreditsAcrossOwners(db,{ownerIds,amount,placementId,actorId,keyPrefix},timestamp){
  const redemptions=[];let remaining=Number(amount)||0;
  for(const ownerId of [...new Set(ownerIds)]){
    if(remaining<=0)break;
    const available=await availableFor(db,ownerId);
    if(available<=0)continue;
    const take=Math.min(available,remaining);
    try{await redeemCredits(db,{ownerId,amount:take,placementId,actorId,idempotencyKey:`${keyPrefix}-${ownerId}`},timestamp);}
    catch(error){if(error.code==='insufficient-credits')break;throw error;}
    redemptions.push({ownerId,amount:take});remaining-=take;
  }
  return redemptions;
}

/** Returns redeemed credits when a checkout never completes. Idempotent per order. */
export async function refundRedeemedCredits(db,{redemptions,reason,actorId,keyPrefix},timestamp){
  for(const {ownerId,amount} of redemptions||[])
    await issueCredits(db,{ownerId,amount,reason,source:'support',actorId,idempotencyKey:`${keyPrefix}-${ownerId}`},timestamp);
  return redemptions||[];
}
