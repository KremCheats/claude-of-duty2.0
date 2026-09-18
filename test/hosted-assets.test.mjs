import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hostedAssetUrl } from '../export/web/hosted-assets.js';
import { runtimeAssetUrl } from '../export/web/asset-runtime.js';

test('validated models resolve to hosted URLs outside GitHub', () => {
  for (const id of ['ballista_r2', 'dsr50_r2', 'fal_osw_r2', 'hamr', 'dlq33', 'alcatraz']) {
    assert.match(hostedAssetUrl(id), /^https:\/\/files\.manuscdn\.com\/.*\.glb$/);
    assert.equal(runtimeAssetUrl(id), hostedAssetUrl(id));
  }
});
