import test from 'node:test';
import assert from 'node:assert/strict';
import {stagingViteDefines} from './staging-vite-defines.mjs';

test('snapshot renderer is opt-in and staging secrets stay out of the browser build',()=>{
  const base='https://assets.example/releases/test';
  assert.equal(stagingViteDefines({},base)['import.meta.env.VITE_ARTWORK_SNAPSHOTS'],JSON.stringify('false'));
  const enabled=stagingViteDefines({MH_ARTWORK_SNAPSHOTS:'true',MH_R2_SECRET_ACCESS_KEY:'private-value'},base);
  assert.equal(enabled['import.meta.env.VITE_ARTWORK_SNAPSHOTS'],JSON.stringify('true'));
  assert.equal(JSON.stringify(enabled).includes('private-value'),false);
});
