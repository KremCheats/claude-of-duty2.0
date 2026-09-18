import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PENDING_ASSETS, assetById, pendingAssets } from '../export/web/asset-catalog.js';

test('pending asset catalog covers every uploaded asset category', () => {
  assert.equal(PENDING_ASSETS.guns.length, 8);
  assert.equal(PENDING_ASSETS.operators.length, 2);
  assert.equal(PENDING_ASSETS.maps.length, 4);
  assert.equal(PENDING_ASSETS.zombies.length, 5);
  assert.equal(pendingAssets().length, 19);
});

test('existing weapon replacements are marked safe candidates, not automatic replacements', () => {
  assert.equal(assetById('ballista_r2').status, 'replacement-candidate');
  assert.equal(assetById('dsr50_r2').status, 'replacement-candidate');
  assert.equal(assetById('fal_osw_r2').status, 'replacement-candidate');
  assert.equal(assetById('ray_gun_bo2').status, 'source-c4d-rar');
});
