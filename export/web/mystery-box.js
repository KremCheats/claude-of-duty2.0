import { WEAPONS } from './weapons.js';

export const ZOMBIES_WEAPON_POOL = Object.freeze([
  'm27', 'an94', 'sa58', 'scar', 'sig556', 'tar21', 'type95', 'xm8',
  'dsr50', 'ballista', 'svu', 'as50', 'fiveseven', 'fnp45', 'kard', 'beretta93r',
  'ray_gun_bo2',
]);

export const ZOMBIES_WEAPONS = Object.freeze({
  ray_gun_bo2: Object.freeze({
    id: 'ray_gun_bo2',
    name: 'Ray Gun',
    class: 'secondary',
    role: 'Wonder weapon',
    source: 'r2://zombies/ray-gun-bo2-remastered.zip',
    pendingAssetConversion: true,
    magazineSize: 20,
    reserveAmmo: 160,
    roundsPerMinute: 181,
    fireMode: 'semi',
    damage: 150,
  }),
});

export const MYSTERY_BOX_CONFIG = Object.freeze({
  cost: 950,
  cooldown: 2.2,
  rerollPenalty: 0.35,
});

const defaultWeapon = (id, table) => table[id] ?? ZOMBIES_WEAPONS[id] ?? null;

/**
 * Server-authoritative-friendly Mystery Box state machine. The browser can use
 * it for presentation, while a future co-op backend can replay the same roll
 * by supplying a seeded random function and validating the purchase separately.
 */
export class MysteryBox {
  constructor({ random = Math.random, weaponTable = WEAPONS, pool = ZOMBIES_WEAPON_POOL, config = MYSTERY_BOX_CONFIG } = {}) {
    this.random = random;
    this.weaponTable = weaponTable;
    this.pool = [...pool];
    this.config = config;
    this.cooldown = 0;
    this.lastWeaponId = null;
    this.totalRolls = 0;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - Math.max(0, Number(dt) || 0));
  }

  canOpen(points) {
    return Number(points) >= this.config.cost && this.cooldown <= 0 && this.pool.length > 0;
  }

  open(wallet) {
    const points = Number(wallet?.points);
    if (!this.canOpen(points)) {
      return { ok: false, reason: this.cooldown > 0 ? 'cooldown' : points < this.config.cost ? 'insufficient_points' : 'empty_pool' };
    }
    const index = Math.min(this.pool.length - 1, Math.max(0, Math.floor(this.random() * this.pool.length)));
    const weaponId = this.pool[index];
    const weapon = defaultWeapon(weaponId, this.weaponTable);
    if (!weapon) return { ok: false, reason: 'unavailable_asset', weaponId };
    wallet.points = points - this.config.cost;
    this.cooldown = this.config.cooldown;
    this.lastWeaponId = weaponId;
    this.totalRolls += 1;
    return { ok: true, cost: this.config.cost, weaponId, weapon, roll: this.totalRolls };
  }

  snapshot() {
    return { cooldown: this.cooldown, lastWeaponId: this.lastWeaponId, totalRolls: this.totalRolls };
  }
}

export function resolveZombiesWeapon(id, weaponTable = WEAPONS) {
  return defaultWeapon(id, weaponTable);
}

export function isMysteryBoxWeapon(id) {
  return ZOMBIES_WEAPON_POOL.includes(id);
}
