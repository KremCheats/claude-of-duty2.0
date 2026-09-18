#!/usr/bin/env node
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { MAPS, mapFiles } from '../export/web/maps.js';

const root = resolve(new URL('../export/web/', import.meta.url).pathname);
const required = ['render', 'collisionBvh', 'collisionBvhMeta', 'navmesh', 'navmeshMeta', 'navHints', 'ladders', 'probes', 'probesMeta'];
let failures = 0;
for (const map of Object.values(MAPS)) {
  const files = mapFiles(map);
  console.log(`\n${map.name} (${map.id})`);
  for (const key of required) {
    const relative = files[key];
    const path = resolve(root, relative);
    const ok = existsSync(path) && statSync(path).size > 0;
    console.log(`${ok ? 'OK ' : 'MISS'} ${key.padEnd(16)} ${relative}`);
    if (!ok) failures += 1;
  }
  for (const [key, relative] of Object.entries({ env: map.env, probe: map.probe, vision: map.vision, lut: map.lut })) {
    const path = resolve(root, relative);
    const ok = existsSync(path);
    console.log(`${ok ? 'OK ' : 'MISS'} ${key.padEnd(16)} ${relative}`);
    if (!ok) failures += 1;
  }
}
console.log(`\n${failures ? `${failures} missing map assets` : 'all baked map assets present'}`);
process.exitCode = failures ? 1 : 0;
