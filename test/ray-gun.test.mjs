import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RAY_GUN_PROFILE, RayGunProjectile, rayGunDamage } from '../export/web/ray-gun.js';
import { MAPS } from '../export/web/maps.js';

test('Ray Gun has a Zombies-only explosive profile', () => {
  assert.equal(RAY_GUN_PROFILE.id, 'ray_gun_bo2');
  assert.equal(RAY_GUN_PROFILE.magazineSize, 20);
  assert.equal(rayGunDamage(0), 150);
  assert.equal(rayGunDamage(RAY_GUN_PROFILE.splashRadius), 0);
});

test('Ray Gun projectile advances and becomes inactive on impact', () => {
  const projectile = new RayGunProjectile({
    origin: { clone: () => ({ x: 0, y: 0, z: 0 }) },
    direction: { clone: () => ({ x: 0, y: 0, z: -1 }) },
  });
  projectile.update(.1);
  assert.equal(projectile.position.z, -92);
  assert.equal(projectile.alive, true);
  assert.equal(projectile.impact().radius, 170);
  assert.equal(projectile.alive, false);
});

test('baked maps expose Zombies-only Mystery Box locations and atmosphere', () => {
  for (const map of Object.values(MAPS)) {
    assert.ok(map.zombies?.mysteryBoxPositions?.length >= 2);
    assert.ok(map.zombies?.spawnPositions?.length >= 4);
    assert.ok(map.zombies.atmosphere);
  }
});
