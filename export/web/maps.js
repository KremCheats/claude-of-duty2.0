// Map registry shared by the browser and the bake tools.
//
// Every baked file a map needs is named from one prefix, so the exporters,
// the bakers, the deploy staging, and the runtime loader all agree on paths
// without listing them in five places. This module has no dependencies on
// purpose: .tools/*.mjs import it from Node.

export const DEFAULT_MAP = 'mp_nuketown_2020';
export const MAP_STORAGE_KEY = 'vibeslops:map';

export const MAPS = Object.freeze({
  mp_hijacked: Object.freeze({
    id: 'mp_hijacked',
    name: 'Hijacked',
    prefix: 'hijacked',
    card: 'ui/menu_mp_map_select_hijacked_final.png',
    radar: 'ui/hud/compass_map_mp_hijacked.png',
    // Radar viewport radius in world units, tuned by eye against the game.
    // Both maps run the engine default compassmaxrange of 2100 (Nuketown's
    // script sets it explicitly), so they share the same span here.
    minimapSpan: 1250,
    // Hijacked shipped before per-map asset folders existed. Its sky, probe
    // and vision set stay where the first deploy put them.
    env: 'textures/env/',
    probe: 'textures/probe/',
    vision: 'vision.json',
    lut: 'textures/mp_hijacked_lut.png',
    fallbackSpawn: [2102, 57, 133],
    // Names of the dumped source assets bake:env reads. They follow the
    // worldspawn's skyboxmodel and lutmaterial keys, not the map id.
    sources: { sky: 'skybox_mp_hijacked_ft', lut: 'mp_hijacked_lut_win', vision: 'mp_hijacked' },
    zombies: Object.freeze({
      spawnProtection: 650,
      mysteryBoxPositions: Object.freeze([[1760, 57, 220], [1240, 57, -520], [2280, 57, 520], [1510, 57, 760]]),
      spawnPositions: Object.freeze([[980, 57, -720], [2380, 57, -620], [2560, 57, 560], [920, 57, 820], [1840, 57, -940]]),
      atmosphere: Object.freeze({ background: 0x09070a, fog: 0x120b10, near: 220, far: 1550, hemi: 0.12, sun: 0.38, sunColor: 0x8f6470 }),
    }),
    baked: true,
  }),
  mp_nuketown_2020: Object.freeze({
    id: 'mp_nuketown_2020',
    name: 'Nuketown 2025',
    prefix: 'nuketown_2020',
    // The DLC card ships in patch_ui_mp.ff, not ui_mp.ff, and drops the
    // underscore like the rest of the map's art.
    card: 'ui/menu_mp_map_select_nuketown2020_final.png',
    // The zone drops the underscore in its art names: compass_map_mp_nuketown2020
    // and skybox_mp_nuketown2020, while the map itself is mp_nuketown_2020.
    radar: 'ui/hud/compass_map_mp_nuketown2020.png',
    minimapSpan: 1250,
    env: 'textures/nuketown_2020/env/',
    probe: 'textures/nuketown_2020/probe/',
    vision: 'nuketown_2020.vision.json',
    lut: 'textures/mp_nuketown_2020_lut.png',
    fallbackSpawn: [0, 0, 0],
    // The LUT material mp_nuketown2020_lut samples the image mp_nuketown2020_win.
    sources: { sky: 'skybox_mp_nuketown2020_ft', lut: 'mp_nuketown2020_win', vision: 'mp_nuketown_2020' },
    zombies: Object.freeze({
      spawnProtection: 520,
      mysteryBoxPositions: Object.freeze([[420, 0, 380], [-420, 0, 380], [420, 0, -380], [-420, 0, -380]]),
      spawnPositions: Object.freeze([[760, 0, 760], [-760, 0, 760], [760, 0, -760], [-760, 0, -760], [0, 0, -920]]),
      atmosphere: Object.freeze({ background: 0x09070a, fog: 0x140b10, near: 190, far: 1320, hemi: 0.09, sun: 0.3, sunColor: 0x7e5968 }),
    }),
    // Geometry, collision, navmesh and props are baked. Textures, sky, LUT,
    // radar and title card wait on the zone's image pack (see README).
    baked: true,
    // Nodes of the baked render scene the runtime hides. The hydro car's
    // display case is an fxanim model: the game poses it with an xanim the
    // composer does not play, so its bind pose puts the case 30-60 units under
    // the road and leaves only the sign panel floating over the buses. The
    // server-side brush copy of the case is the one to draw; until the next
    // bake carries it (see .tools/export_collision.py), the client model is
    // hidden here rather than shown wrong.
    hiddenNodes: Object.freeze(['fxanim_mp_nuked2025_display_glass_mod']),
  }),
  firing_range: Object.freeze({ id: 'firing_range', name: 'Firing Range', prefix: 'firing_range', card: 'ui/menu_mp_map_select_firing_range.webp', radar: 'ui/hud/compass_map_mp_hijacked.png', minimapSpan: 1250, env: 'textures/env/', probe: 'textures/probe/', vision: 'vision.json', lut: 'textures/mp_hijacked_lut.png', surfaceTexture: 'textures/firing_range_surface.png', fallbackSpawn: [0, 0, 0], zombies: Object.freeze({ spawnProtection: 650, mysteryBoxPositions: Object.freeze([[160,0,180],[-160,0,180],[160,0,-180],[-160,0,-180]]), spawnPositions: Object.freeze([[420,0,420],[-420,0,420],[420,0,-420],[-420,0,-420]]), atmosphere: Object.freeze({background:0x11140f,fog:0x1a1e17,near:180,far:1350,hemi:.2,sun:.55,sunColor:0xc6ae7a}) }), baked: true }),
  crash: Object.freeze({ id: 'crash', name: 'Crash', prefix: 'crash', card: 'ui/menu_mp_map_select_crash.webp', radar: 'ui/hud/compass_map_mp_hijacked.png', minimapSpan: 1250, env: 'textures/env/', probe: 'textures/probe/', vision: 'vision.json', lut: 'textures/mp_hijacked_lut.png', surfaceTexture: 'textures/crash_surface.png', fallbackSpawn: [0, 0, 0], zombies: Object.freeze({ spawnProtection: 650, mysteryBoxPositions: Object.freeze([[220,0,160],[-220,0,160],[220,0,-160],[-220,0,-160]]), spawnPositions: Object.freeze([[520,0,520],[-520,0,520],[520,0,-520],[-520,0,-520]]), atmosphere: Object.freeze({background:0x17100b,fog:0x25190e,near:200,far:1450,hemi:.18,sun:.6,sunColor:0xd19b62}) }), baked: true }),
});

/**
 * Hide the nodes a map lists in `hiddenNodes`. Names are matched with and
 * without the composer's `i_` instance prefix, and against the mesh name a
 * batched node carries. Returns how many objects were hidden.
 */
export function hideMapNodes(root, map) {
  const names = map?.hiddenNodes ?? [];
  if (!root || !names.length) return 0;
  let hidden = 0;
  root.traverse((object) => {
    const name = String(object.name ?? '').replace(/^i_/, '');
    if (!names.some((wanted) => name === wanted || name.startsWith(`${wanted}_`))) return;
    object.visible = false;
    // The static batcher must leave it alone or it would come back inside a batch.
    object.userData.keepSeparate = true;
    hidden += 1;
  });
  return hidden;
}

export const MAP_IDS = Object.freeze(Object.keys(MAPS));

export function randomBakedMapId(maps = MAPS, random = Math.random) {
  const baked = Object.values(maps).filter((map) => map?.baked).map((map) => map.id);
  if (!baked.length) return DEFAULT_MAP;
  const draw = Number(random());
  const index = Math.min(baked.length - 1, Math.max(0, Math.floor((Number.isFinite(draw) ? draw : 0) * baked.length)));
  return baked[index];
}

export function isMapId(id) {
  return typeof id === 'string' && Object.hasOwn(MAPS, id);
}

/** Resolve a map from its id, prefix, or the short name after `mp_`. */
export function findMap(value, maps = MAPS) {
  if (!value) return null;
  const text = String(value).trim().toLowerCase();
  if (Object.hasOwn(maps, text)) return maps[text];
  if (Object.hasOwn(maps, `mp_${text}`)) return maps[`mp_${text}`];
  for (const map of Object.values(maps)) {
    if (map.prefix === text) return map;
  }
  return null;
}

/**
 * Baked and intermediate file names for a map, relative to export/web/.
 * The intermediate set is bake input only and never ships.
 */
export function mapFiles(map) {
  const prefix = map.assetPrefix ?? map.prefix;
  return {
    // compose_scene.py output, then bake:map input
    sourceGltf: `${prefix}.gltf`,
    sourceBin: `${prefix}.bin`,
    geometry: `${prefix}_geometry.glb`,
    // export_collision.py output, then bake input for the rest
    collisionGltf: `${prefix}_collision.gltf`,
    collisionBin: `${prefix}_collision.bin`,
    collisionSource: `${prefix}_collision_source.json`,
    // shipped runtime set
    render: `${prefix}_optimized.glb`,
    collisionBvh: `${prefix}_collision_bvh.bin`,
    collisionBvhMeta: `${prefix}_collision_bvh.json`,
    navmesh: `${prefix}.navmesh.bin`,
    navmeshMeta: `${prefix}.navmesh.json`,
    navHints: `${prefix}_nav_hints.json`,
    ladders: `${prefix}_ladders.json`,
    probes: `${prefix}_probes.bin`,
    probesMeta: `${prefix}_probes.json`,
  };
}

/** Files bake:map and compose_scene.py write that the deploy must not carry. */
export function mapIntermediateFiles(map) {
  const files = mapFiles(map);
  return [
    files.sourceGltf, files.sourceBin, files.geometry,
    files.collisionGltf, files.collisionBin, files.collisionSource,
  ];
}

/** Files a deploy needs before a map marked `baked` is playable at all. */
export function mapRequiredFiles(map) {
  const files = mapFiles(map);
  return [files.render, files.collisionBvh, files.collisionBvhMeta, files.navmesh];
}

/**
 * Files the runtime degrades without: flat lighting instead of the map's sky,
 * probe and grade, no radar art, no title card. Worth a warning, not a stop.
 */
export function mapRecommendedFiles(map) {
  const files = mapFiles(map);
  return [files.navHints, files.probes, map.env, map.probe, map.lut, map.vision, map.card, map.radar].filter(Boolean);
}

/**
 * Pick the map for this page load: `?map=` wins, then the remembered choice,
 * then a random baked map. Unknown values fall through rather than throw so a
 * stale link still opens the game. An explicit link to an unbaked map is
 * honoured so it can explain itself; a remembered one is not.
 */
export function resolveMapId({ search = '', storage = null, maps = MAPS, random = Math.random } = {}) {
  let requested = null;
  try {
    requested = new URLSearchParams(search).get('map');
  } catch {
    requested = null;
  }
  const fromQuery = findMap(requested, maps);
  if (fromQuery) return fromQuery.id;
  let remembered = null;
  try {
    remembered = storage?.getItem(MAP_STORAGE_KEY) ?? null;
  } catch {
    remembered = null;
  }
  const fromStorage = findMap(remembered, maps);
  if (fromStorage?.baked) return fromStorage.id;
  return randomBakedMapId(maps, random);
}

export function rememberMap(storage, id, maps = MAPS) {
  if (!Object.hasOwn(maps, id) || !maps[id].baked) return;
  try {
    storage?.setItem(MAP_STORAGE_KEY, id);
  } catch {
    // Storage is a convenience; a sandboxed frame simply forgets.
  }
}
