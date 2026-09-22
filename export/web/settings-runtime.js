export const SETTINGS_KEY = 'merk-of-duty.settings.v3';

export const DEFAULT_SETTINGS = Object.freeze({
  sensitivity: 1,
  ads: 0.8,
  invert: 'OFF',
  assist: 'ON',
  layout: 'STANDARD',
  autoSprint: 'ON',
  gyro: 'OFF',
  vibration: 'ON',
  quality: 'BALANCED',
  fps: '60 FPS',
  shadows: 'LOW',
  blur: 'OFF',
  master: 80,
  music: 55,
  effects: 80,
  voice: 'OFF',
  hud: 'STANDARD',
  crosshair: 'DEFAULT',
  damage: 'ON',
  fov: 90,
  language: 'ENGLISH',
  name: 'OPERATIVE',
  privacy: 'FRIENDS ONLY',
});

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};
const choice = (value, values, fallback) => values.includes(value) ? value : fallback;

export function normalizeSettings(input = {}) {
  return {
    sensitivity: clamp(input.sensitivity, 0.4, 2.5, DEFAULT_SETTINGS.sensitivity),
    ads: clamp(input.ads ?? input.adsSens, 0.4, 2, DEFAULT_SETTINGS.ads),
    invert: choice(input.invert, ['OFF','ON'], DEFAULT_SETTINGS.invert),
    assist: choice(input.assist, ['ON','OFF'], DEFAULT_SETTINGS.assist),
    layout: choice(input.layout, ['STANDARD','TACTICAL','LEFT-HANDED'], DEFAULT_SETTINGS.layout),
    autoSprint: (() => {
      const value = choice(input.autoSprint ?? input.sprint, ['ON','OFF','AUTO SPRINT'], DEFAULT_SETTINGS.autoSprint);
      return value === 'AUTO SPRINT' ? 'ON' : value;
    })(),
    gyro: choice(input.gyro, ['OFF','ON'], DEFAULT_SETTINGS.gyro),
    vibration: choice(input.vibration === true ? 'ON' : input.vibration === false ? 'OFF' : input.vibration, ['ON','OFF'], DEFAULT_SETTINGS.vibration),
    quality: choice(input.quality ?? input.graphics, ['HIGH','BALANCED','PERFORMANCE'], DEFAULT_SETTINGS.quality),
    fps: choice(input.fps, ['30 FPS','60 FPS','120 FPS','UNLIMITED'], DEFAULT_SETTINGS.fps),
    shadows: choice(input.shadows === true ? 'HIGH' : input.shadows === false ? 'OFF' : input.shadows, ['HIGH','LOW','OFF'], DEFAULT_SETTINGS.shadows),
    blur: choice(input.blur ?? (input.motionBlur ? 'ON' : 'OFF'), ['OFF','ON'], DEFAULT_SETTINGS.blur),
    master: clamp(input.master, 0, 100, DEFAULT_SETTINGS.master),
    music: clamp(input.music, 0, 100, DEFAULT_SETTINGS.music),
    effects: clamp(input.effects, 0, 100, DEFAULT_SETTINGS.effects),
    voice: choice(input.voice, ['ON','OFF'], DEFAULT_SETTINGS.voice),
    hud: choice(input.hud === false ? 'MINIMAL' : input.hud, ['STANDARD','MINIMAL'], DEFAULT_SETTINGS.hud),
    crosshair: choice(input.crosshair, ['DEFAULT','CLASSIC','DOT'], DEFAULT_SETTINGS.crosshair),
    damage: choice(input.damage, ['ON','OFF'], DEFAULT_SETTINGS.damage),
    fov: clamp(input.fov, 70, 120, DEFAULT_SETTINGS.fov),
    language: choice(input.language, ['ENGLISH','ESPAÑOL','FRANÇAIS'], DEFAULT_SETTINGS.language),
    name: String(input.name || DEFAULT_SETTINGS.name).trim().slice(0, 24) || DEFAULT_SETTINGS.name,
    privacy: choice(input.privacy, ['FRIENDS ONLY','INVITE ONLY','OPEN'], DEFAULT_SETTINGS.privacy),
  };
}

export function loadSettings(storage = globalThis.localStorage) {
  let merged = {};
  try {
    merged = { ...merged, ...JSON.parse(storage?.getItem('merk-of-duty.ui-settings.v1') || '{}') };
  } catch {}
  try {
    const legacy = JSON.parse(storage?.getItem('merk-of-duty.profile.v2') || '{}');
    merged = {
      ...merged,
      sensitivity: legacy.sensitivity ?? legacy.sensX ?? merged.sensitivity,
      ads: legacy.adsSens ?? merged.ads,
      layout: legacy.layout ?? merged.layout,
      quality: legacy.graphics ?? legacy.quality ?? merged.quality,
      fps: legacy.fps ?? merged.fps,
      fov: legacy.fov ?? merged.fov,
      hud: legacy.hud === false ? 'MINIMAL' : merged.hud,
      vibration: legacy.vibration,
      gyro: legacy.gyro,
      shadows: legacy.shadows,
      blur: legacy.motionBlur ? 'ON' : merged.blur,
      name: legacy.name ?? merged.name,
    };
  } catch {}
  try { merged = { ...merged, ...JSON.parse(storage?.getItem(SETTINGS_KEY) || '{}') }; } catch {}
  return normalizeSettings(merged);
}

export function saveSettings(input, storage = globalThis.localStorage, { broadcast = true } = {}) {
  const settings = normalizeSettings(input);
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
    storage?.setItem('merk-of-duty.ui-settings.v1', JSON.stringify(settings));
    const preset = ({ HIGH:'quality', BALANCED:'auto', PERFORMANCE:'performance' })[settings.quality];
    if (preset) storage?.setItem('hijacked.graphics', preset);
  } catch {}
  if (broadcast && typeof globalThis.dispatchEvent === 'function') {
    globalThis.dispatchEvent(new CustomEvent('merk:settings-changed', { detail: settings }));
  }
  return settings;
}

export function graphicsPreset(settings) {
  return ({ HIGH:'quality', BALANCED:'auto', PERFORMANCE:'performance' })[normalizeSettings(settings).quality] || 'auto';
}

export function fpsCap(settings) {
  const value = normalizeSettings(settings).fps;
  if (value === '30 FPS') return 30;
  if (value === '60 FPS') return 60;
  if (value === '120 FPS') return 120;
  return 0;
}
