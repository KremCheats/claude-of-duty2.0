import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  DEFAULT_SETTINGS, SETTINGS_KEY, fpsCap, graphicsPreset, loadSettings, normalizeSettings, saveSettings,
} from '../export/web/settings-runtime.js';

class MemoryStorage {
  constructor(entries = {}) { this.values = new Map(Object.entries(entries)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test('settings normalization clamps gameplay-critical values and rejects unknown choices', () => {
  const settings = normalizeSettings({
    sensitivity: 99,
    ads: 0,
    fov: 500,
    quality: 'ULTRA++',
    fps: '999 FPS',
    layout: 'SIDEWAYS',
    damage: 'MAYBE',
    name: 'A'.repeat(80),
  });
  assert.equal(settings.sensitivity, 2.5);
  assert.equal(settings.ads, 0.4);
  assert.equal(settings.fov, 120);
  assert.equal(settings.quality, DEFAULT_SETTINGS.quality);
  assert.equal(settings.fps, DEFAULT_SETTINGS.fps);
  assert.equal(settings.layout, DEFAULT_SETTINGS.layout);
  assert.equal(settings.damage, DEFAULT_SETTINGS.damage);
  assert.ok(settings.name.length <= 18);
});

test('legacy menu/profile settings migrate into the shared v3 schema', () => {
  const storage = new MemoryStorage({
    'merk-of-duty.ui-settings.v1': JSON.stringify({ quality: 'PERFORMANCE', sensitivity: 1.3 }),
    'merk-of-duty.profile.v2': JSON.stringify({ adsSens: 0.7, fov: 105, vibration: false, name: 'V4MP' }),
  });
  const settings = loadSettings(storage);
  assert.equal(settings.quality, 'PERFORMANCE');
  assert.equal(settings.sensitivity, 1.3);
  assert.equal(settings.ads, 0.7);
  assert.equal(settings.fov, 105);
  assert.equal(settings.vibration, 'OFF');
  assert.equal(settings.name, 'V4MP');
});

test('v3 settings override legacy values and save updates renderer compatibility keys', () => {
  const storage = new MemoryStorage({
    'merk-of-duty.ui-settings.v1': JSON.stringify({ quality: 'HIGH', fov: 80 }),
    [SETTINGS_KEY]: JSON.stringify({ quality: 'PERFORMANCE', fov: 110, fps: '120 FPS' }),
  });
  const loaded = loadSettings(storage);
  assert.equal(loaded.quality, 'PERFORMANCE');
  assert.equal(loaded.fov, 110);
  assert.equal(fpsCap(loaded), 120);
  assert.equal(graphicsPreset(loaded), 'performance');

  const saved = saveSettings({ ...loaded, quality: 'HIGH', fps: '30 FPS' }, storage, { broadcast: false });
  assert.equal(saved.quality, 'HIGH');
  assert.equal(fpsCap(saved), 30);
  assert.equal(storage.getItem('hijacked.graphics'), 'quality');
  assert.equal(JSON.parse(storage.getItem(SETTINGS_KEY)).fps, '30 FPS');
});

test('unlimited presentation rate leaves adaptive renderer uncapped by presentation', () => {
  const settings = normalizeSettings({ fps: 'UNLIMITED' });
  assert.equal(fpsCap(settings), 0);
});
