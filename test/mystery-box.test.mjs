import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MysteryBox, ZOMBIES_WEAPON_POOL } from '../export/web/mystery-box.js';

test('Mystery Box charges points and returns a weapon from the configured pool', () => {
  const box = new MysteryBox({ random: () => 0.999 });
  const wallet = { points: 1200 };
  const result = box.open(wallet);
  assert.equal(result.ok, true);
  assert.equal(result.weaponId, ZOMBIES_WEAPON_POOL.at(-1));
  assert.equal(wallet.points, 250);
  assert.equal(box.open(wallet).reason, 'cooldown');
});

test('Mystery Box rejects insufficient points and rolls deterministically', () => {
  const box = new MysteryBox({ random: () => 0 });
  assert.equal(box.open({ points: 949 }).reason, 'insufficient_points');
  const wallet = { points: 950 };
  assert.equal(box.open(wallet).weaponId, ZOMBIES_WEAPON_POOL[0]);
  box.update(3);
  assert.equal(box.snapshot().totalRolls, 1);
});

test('Ray Gun remains explicitly pending conversion until its R2 source is processed', () => {
  const box = new MysteryBox({ random: () => 0.999 });
  const result = box.open({ points: 950 });
  assert.equal(result.weapon.pendingAssetConversion, true);
  assert.match(result.weapon.source, /^r2:\/\/zombies\//);
});
