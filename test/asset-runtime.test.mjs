import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PENDING_MAP_DEFINITIONS, PENDING_OPERATOR_DEFINITIONS, PENDING_WEAPON_DEFINITIONS, assetStatus, catalogSummary, isReadyAsset, sourceForAsset } from '../export/web/asset-runtime.js';

test('pending runtime registries cover new guns, operators, and maps safely', () => {
  assert.ok(PENDING_WEAPON_DEFINITIONS.hamr);
  assert.ok(PENDING_OPERATOR_DEFINITIONS.ghost);
  assert.ok(PENDING_MAP_DEFINITIONS.killhouse);
  assert.equal(assetStatus('hamr'), 'staged-browser-model');
  assert.equal(assetStatus('ghost'), 'pending-conversion');
  assert.equal(assetStatus('killhouse'), 'pending-material-audit');
  assert.equal(isReadyAsset('hamr'), true);
});

test('runtime catalog exposes source filenames for batch import tools', () => {
  assert.equal(sourceForAsset('ray_gun_bo2'), 'ray-gun-bo2-remastered.zip');
  assert.equal(catalogSummary().guns.length, 8);
  assert.equal(catalogSummary().operators.length, 2);
});
