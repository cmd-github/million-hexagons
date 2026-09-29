import assert from 'node:assert/strict';
import test from 'node:test';
import {normaliseContentReport} from './content-report.js';

test('accepts a bounded placement report without requiring reporter identity',()=>{
  const report={placementId:'00000000-0000-0000-0000-000000000001',kind:'unsafe-link',details:'This link points to a phishing page.'};
  assert.deepEqual(normaliseContentReport(report),report);
  assert.equal(normaliseContentReport({...report,website:'robot'}),null);
  for(const bad of [{...report,details:'short'},{...report,kind:'unknown'},{...report,email:'bad'}, {...report,placementId:'not-an-id'}])
    assert.throws(()=>normaliseContentReport(bad),error=>error.code==='invalid-content-report');
});
