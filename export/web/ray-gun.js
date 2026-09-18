export const RAY_GUN_PROFILE = Object.freeze({
  id: 'ray_gun_bo2',
  name: 'Ray Gun',
  magazineSize: 20,
  reserveAmmo: 160,
  roundsPerMinute: 181,
  projectileSpeed: 920,
  directDamage: 150,
  splashDamage: 110,
  splashRadius: 170,
  selfDamageScale: 0.18,
  color: 0xff2b18,
});

export function rayGunDamage(distance, profile = RAY_GUN_PROFILE) {
  if (distance <= 0) return profile.directDamage;
  if (distance >= profile.splashRadius) return 0;
  return profile.splashDamage * (1 - distance / profile.splashRadius);
}

export class RayGunProjectile {
  constructor({ origin, direction, profile = RAY_GUN_PROFILE } = {}) {
    this.position = origin?.clone?.() ?? { x: 0, y: 0, z: 0 };
    this.direction = direction?.clone?.() ?? { x: 0, y: 0, z: -1 };
    this.profile = profile;
    this.alive = true;
    this.age = 0;
  }

  update(dt) {
    if (!this.alive) return this.position;
    const seconds = Math.max(0, Number(dt) || 0);
    this.position.x += this.direction.x * this.profile.projectileSpeed * seconds;
    this.position.y += this.direction.y * this.profile.projectileSpeed * seconds;
    this.position.z += this.direction.z * this.profile.projectileSpeed * seconds;
    this.age += seconds;
    return this.position;
  }

  impact() {
    this.alive = false;
    return { position: this.position, radius: this.profile.splashRadius, damage: this.profile.splashDamage };
  }
}
