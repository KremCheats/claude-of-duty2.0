import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LOADOUT_ATTACHMENTS,
  LOADOUT_ATTACHMENT_IDS,
  normalizeLoadoutAttachment,
  attachmentProfile,
} from '../export/web/loadout-attachments.js';

test('attachment registry exposes stable functional profiles', () => {
  assert.deepEqual(LOADOUT_ATTACHMENT_IDS, ['standard','extended_mag','fast_mag','quickdraw','foregrip']);
  for (const id of LOADOUT_ATTACHMENT_IDS) {
    const profile = LOADOUT_ATTACHMENTS[id];
    assert.equal(profile.id, id);
    assert.ok(profile.name);
    assert.ok(profile.detail);
    assert.ok(profile.magazineScale > 0);
    assert.ok(profile.reloadScale > 0);
    assert.ok(profile.adsTimeScale > 0);
    assert.ok(profile.recoilScale > 0);
  }
});

test('normalization rejects unknown persisted attachment ids', () => {
  assert.equal(normalizeLoadoutAttachment('quickdraw'), 'quickdraw');
  assert.equal(normalizeLoadoutAttachment('not-real'), 'standard');
  assert.equal(normalizeLoadoutAttachment(null), 'standard');
});

test('attachment effects are scoped to their advertised handling axis', () => {
  assert.equal(attachmentProfile('extended_mag').magazineScale, 1.5);
  assert.equal(attachmentProfile('fast_mag').reloadScale, 1.25);
  assert.equal(attachmentProfile('quickdraw').adsTimeScale, 0.72);
  assert.equal(attachmentProfile('foregrip').recoilScale, 0.78);
  assert.equal(attachmentProfile('standard').magazineScale, 1);
});
