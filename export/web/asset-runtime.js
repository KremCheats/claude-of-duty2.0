import { PENDING_ASSETS, assetById } from './asset-catalog.js';

export const PENDING_WEAPON_DEFINITIONS = Object.freeze({
  hamr: Object.freeze({ id: 'hamr', name: 'HAMR', class: 'primary', assetId: 'hamr', status: 'pending-conversion' }),
  locus: Object.freeze({ id: 'locus', name: 'Locus', class: 'primary', assetId: 'locus', status: 'pending-conversion' }),
  dlq33: Object.freeze({ id: 'dlq33', name: 'DLQ33', class: 'primary', assetId: 'dlq33', status: 'pending-conversion' }),
  mp5: Object.freeze({ id: 'mp5', name: 'MP5', class: 'primary', assetId: 'mp5', status: 'pending-conversion' }),
  m4a1: Object.freeze({ id: 'm4a1', name: 'M4A1', class: 'primary', assetId: 'm4a1', status: 'pending-conversion' }),
});

export const PENDING_OPERATOR_DEFINITIONS = Object.freeze({
  ghost: Object.freeze({ id: 'ghost', name: 'Ghost', assetId: 'ghost', status: 'pending-conversion' }),
  roze_rook: Object.freeze({ id: 'roze_rook', name: 'Roze Rook', assetId: 'roze_rook', status: 'pending-conversion' }),
});

export const PENDING_MAP_DEFINITIONS = Object.freeze({
  killhouse: Object.freeze({ id: 'killhouse', name: 'Kill House', assetId: 'killhouse', status: 'pending-material-audit' }),
  firing_range: Object.freeze({ id: 'firing_range', name: 'Firing Range', assetId: 'firing_range', status: 'pending-conversion' }),
  crash: Object.freeze({ id: 'crash', name: 'Crash', assetId: 'crash', status: 'pending-conversion' }),
  alcatraz: Object.freeze({ id: 'alcatraz', name: 'Alcatraz', assetId: 'alcatraz', status: 'pending-conversion' }),
});

export function assetStatus(id) {
  return assetById(id)?.status ?? 'unknown';
}

export function isReadyAsset(id) {
  return assetStatus(id) === 'browser-ready';
}

export function sourceForAsset(id) {
  return assetById(id)?.source ?? null;
}

export function catalogSummary() {
  return Object.fromEntries(Object.entries(PENDING_ASSETS).map(([kind, assets]) => [kind, assets.map(({ id, status }) => ({ id, status }))]));
}
