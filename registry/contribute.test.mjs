import test from 'node:test';
import assert from 'node:assert/strict';
import { draft, template, draftFragment, readDraft, versionLink } from './contribute-contract.mjs';
import { contribution } from './recipes.mjs';
test('draft round trip stays data, includes no credentials and bounds link size', () => {
  const value = template(); assert.deepEqual(readDraft(draftFragment(value)), value);
  for (const key of ['access_token', 'exposure_id', 'marker', 'status']) assert.throws(() => draft({ ...value, [key]: 'secret' }));
  assert.throws(() => readDraft('#draft=%invalid')); assert.throws(() => draft({ ...value, examples: ['x'.repeat(6001)] }));
  assert.throws(() => versionLink('javascript:alert(1)'));
});
test('incomplete first brick is rejected; correct recipe passes fixed examples', () => {
  const value = template(); assert.throws(() => contribution(value));
  value.recipe.fields[0].steps = ['trim', 'decimal-comma', 'number']; value.recipe.fields[1].steps = ['trim']; value.recipe.fields[2].steps = ['trim', 'lowercase', 'boolean'];
  assert.equal(contribution(value).verification.passed, 2);
});
