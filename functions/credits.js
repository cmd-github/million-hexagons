import { randomUUID } from 'node:crypto';

function creditAmount(value){const amount=Number(value);return Number.isSafeInteger(amount)&&amount>0&&amount<=1_000_000?amount:null;}

export async function issueCredits(db,{ownerId,amount,reason,actorId,idempotencyKey=randomUUID()},timestamp){
  const credits=creditAmount(amount);if(!ownerId||!credits||!reason||!actorId)throw Object.assign(new Error('invalid-credit-entry'),{code:'invalid-credit-entry'});
  const balanceRef=db.collection('stagingCreditBalances').doc(ownerId),entryRef=db.collection('stagingCreditLedger').doc(idempotencyKey);
  return db.runTransaction(async transaction=>{const [balance,entry]=await Promise.all([transaction.get(balanceRef),transaction.get(entryRef)]);if(entry.exists)return entry.data().result;
    const next=Number(balance.data()?.available||0)+credits,result={ownerId,available:next,delta:credits};
    transaction.set(balanceRef,{ownerId,available:next,updatedAt:timestamp},{merge:true});transaction.create(entryRef,{entryId:idempotencyKey,ownerId,delta:credits,type:'issue',reason:String(reason).slice(0,160),actorId,createdAt:timestamp,result});return result;});
}

export async function redeemCredits(db,{ownerId,amount,placementId,idempotencyKey=randomUUID()},timestamp){
  const credits=creditAmount(amount);if(!ownerId||!credits||!placementId)throw Object.assign(new Error('invalid-credit-entry'),{code:'invalid-credit-entry'});
  const balanceRef=db.collection('stagingCreditBalances').doc(ownerId),entryRef=db.collection('stagingCreditLedger').doc(idempotencyKey);
  return db.runTransaction(async transaction=>{const [balance,entry]=await Promise.all([transaction.get(balanceRef),transaction.get(entryRef)]);if(entry.exists)return entry.data().result;const available=Number(balance.data()?.available||0);if(available<credits)throw Object.assign(new Error('insufficient-credits'),{code:'insufficient-credits'});
    const result={ownerId,available:available-credits,delta:-credits};transaction.set(balanceRef,{ownerId,available:result.available,updatedAt:timestamp},{merge:true});transaction.create(entryRef,{entryId:idempotencyKey,ownerId,delta:-credits,type:'redeem',placementId,createdAt:timestamp,result});return result;});
}
