import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

if (!globalThis.FileReader) {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) { blob.arrayBuffer().then((buffer) => { this.result = buffer; this.onloadend?.({ target: this }); }).catch((error) => this.onerror?.(error)); }
  };
}

const outDir = path.resolve('export/web');
function mat(color, roughness = .82, metalness = .05) { return new THREE.MeshStandardMaterial({ color, roughness, metalness }); }
function box(root, name, size, pos, material, rot = [0, 0, 0]) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material); mesh.name = name; mesh.position.set(...pos); mesh.rotation.set(...rot); root.add(mesh); return mesh; }
function cylinder(root, name, radius, height, pos, material, segments = 16) { const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material); mesh.name = name; mesh.position.set(...pos); root.add(mesh); return mesh; }
function base(name, groundColor) { const root = new THREE.Group(); root.name = `${name}_runtime_scene`; box(root, 'ground', [2600, 20, 2200], [0, -10, 0], mat(groundColor)); return root; }
function killhouse() { const r = base('killhouse', 0x46504c); const concrete = mat(0x778078), dark = mat(0x303936), red = mat(0x7b2d27), wood = mat(0x806243); for (let x = -900; x <= 900; x += 450) { box(r, 'training_wall', [300, 170, 24], [x, 85, -420], concrete); box(r, 'training_wall_back', [300, 170, 24], [x, 85, 420], concrete); } for (let z = -300; z <= 300; z += 300) { box(r, 'room_block', [500, 180, 180], [-650, 90, z], dark); box(r, 'room_block', [500, 180, 180], [650, 90, z], dark); } for (const x of [-350, 0, 350]) box(r, 'cover', [120, 70, 300], [x, 35, 0], wood); for (const x of [-1000, 1000]) box(r, 'red_gate', [40, 220, 760], [x, 110, 0], red); return r; }
function firingRange() { const r = base('firing_range', 0x5b624f); const sand = mat(0xa08d67), bunker = mat(0x5d675e), roof = mat(0x33443d), target = mat(0xb8b7a2); for (let x = -1000; x <= 1000; x += 250) box(r, 'firing_lane', [170, 3, 1800], [x, 2, 0], sand); for (let x = -1000; x <= 1000; x += 500) { box(r, 'bunker', [260, 170, 220], [x, 85, -620], bunker); box(r, 'bunker_roof', [290, 18, 250], [x, 179, -620], roof); } for (const z of [-500, -150, 220, 590]) for (const x of [-750, -250, 250, 750]) { box(r, 'target', [10, 130, 8], [x, 67, z], target); cylinder(r, 'target_pole', 7, 100, [x, -20, z], mat(0x252a27), 10); } box(r, 'range_control', [520, 260, 240], [0, 130, 850], bunker); return r; }
function crash() { const r = base('crash', 0x4c5547); const road = mat(0x242a29), sand = mat(0x907e5a), building = mat(0x6a6254), metal = mat(0x515b5a); box(r, 'road', [700, 4, 2100], [0, 2, 0], road); for (const x of [-950, 950]) box(r, 'sand_lot', [700, 4, 2100], [x, 2, 0], sand); box(r, 'hotel', [620, 340, 450], [-720, 170, -420], building); box(r, 'hotel_ruin', [520, 180, 360], [760, 90, -620], building, [0, .12, 0]); for (const z of [-700, -200, 300, 800]) box(r, 'road_barrier', [220, 80, 25], [-280, 40, z], metal, [0, .15, 0]); box(r, 'wrecked_plane_body', [360, 120, 120], [300, 60, 350], metal, [0, .18, .1]); box(r, 'plane_wing', [700, 22, 70], [340, 95, 350], metal, [0, .18, .1]); return r; }
const scenes = { killhouse: killhouse(), firing_range: firingRange(), crash: crash() };
await mkdir(outDir, { recursive: true });
const exporter = new GLTFExporter();
for (const [id, scene] of Object.entries(scenes)) {
  await new Promise((resolve, reject) => exporter.parse(scene, async (result) => { try { await writeFile(path.join(outDir, `${id}_optimized.glb`), Buffer.from(result)); resolve(); } catch (e) { reject(e); } }, reject, { binary: true }));
  console.log(`generated ${id}_optimized.glb`);
}
