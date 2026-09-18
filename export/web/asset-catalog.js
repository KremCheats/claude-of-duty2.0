export const PENDING_ASSETS = Object.freeze({
  guns: Object.freeze([
    { id: 'ballista_r2', name: 'Ballista', bucket: 'guns', source: 'black-ops-2-ballista.zip', targetId: 'ballista', status: 'staged-browser-model', stagedPath: 'imported-assets/ballista_r2/source/BALLISTA.glb' },
    { id: 'dsr50_r2', name: 'DSR-50', bucket: 'guns', source: 'black-ops-2-dsr-50.zip', targetId: 'dsr50', status: 'staged-browser-model', stagedPath: 'imported-assets/dsr50_r2/source/DSR 50.glb' },
    { id: 'fal_osw_r2', name: 'FAL OSW', bucket: 'guns', source: 'black-ops-2-fal-osw.zip', targetId: 'sa58', status: 'staged-browser-model', stagedPath: 'imported-assets/fal_osw_r2/source/FAL-OSW.glb' },
    { id: 'hamr', name: 'HAMR', bucket: 'guns', source: 'black-ops-2-hamr.zip', targetId: 'hamr', status: 'staged-browser-model', stagedPath: 'imported-assets/hamr/source/HAMR.glb' },
    { id: 'locus', name: 'Locus', bucket: 'guns', source: 'locus-sniper.zip', targetId: 'locus', status: 'pending-conversion' },
    { id: 'dlq33', name: 'DLQ33', bucket: 'guns', source: 'dlq33-holidays.zip', targetId: 'dlq33', status: 'staged-browser-model', stagedPath: 'imported-assets/dlq33/source/holidays.glb' },
    { id: 'mp5', name: 'MP5', bucket: 'guns', source: 'hk-mp5.zip', targetId: 'mp5', status: 'pending-conversion' },
    { id: 'm4a1', name: 'M4A1', bucket: 'guns', source: 'custom-m4a1-cod-warzone.zip', targetId: 'm4a1', status: 'pending-conversion' },
  ]),
  operators: Object.freeze([
    { id: 'ghost', name: 'Ghost', bucket: 'oporator', source: 'ghost.zip', targetId: 'ghost', status: 'pending-conversion' },
    { id: 'roze_rook', name: 'Roze Rook', bucket: 'oporator', source: 'call-of-duty-modern-warfare-2019-roze-rook.zip', targetId: 'roze_rook', status: 'pending-conversion' },
  ]),
  maps: Object.freeze([
    { id: 'killhouse', name: 'Kill House', bucket: 'yar', source: 'killhouse.obj', status: 'pending-material-audit' },
    { id: 'firing_range', name: 'Firing Range', bucket: 'yar', source: 'call-of-duty-mobile-firing-range-map.zip', status: 'pending-conversion' },
    { id: 'crash', name: 'Crash', bucket: 'yar', source: 'crash-lowpoly-cod-map.zip', status: 'pending-conversion' },
    { id: 'alcatraz', name: 'Alcatraz', bucket: 'maps2', source: 'alcatraz.zip', status: 'staged-browser-model', stagedPath: 'imported-assets/alcatraz/source/ALCATRAZ ISLAND.glb' },
  ]),
  zombies: Object.freeze([
    { id: 'ray_gun_bo2', name: 'Ray Gun', bucket: 'zombies', source: 'ray-gun-bo2-remastered.zip', status: 'source-c4d-rar' },
    { id: 'hellhound', name: 'Hellhound', bucket: 'zombies', source: 'cod-ghosts-hellhound.zip', status: 'pending-conversion' },
    { id: 'zombie', name: 'Zombie', bucket: 'zombies', source: 'zombie.zip', status: 'pending-conversion' },
    { id: 'zombie_walk', name: 'Zombie Walk Animation', bucket: 'zombies', source: 'zombie-walk-test.zip', status: 'pending-conversion' },
    { id: 'mystery_box', name: 'Mystery Box', bucket: 'zombies', source: '11-mystery-box-3december2019.zip', status: 'pending-conversion' },
  ]),
});

export const pendingAssets = (kind) => kind ? [...(PENDING_ASSETS[kind] ?? [])] : Object.values(PENDING_ASSETS).flat();
export const assetById = (id) => pendingAssets().find((asset) => asset.id === id) ?? null;
