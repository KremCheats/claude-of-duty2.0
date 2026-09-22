import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MAPS, findMap, randomBakedMapId } from './maps.js';
import { WEAPONS } from './weapons.js';
import { loadSettings as loadRuntimeSettings, saveSettings as saveRuntimeSettings } from './settings-runtime.js';

const LOADOUT_ATTACHMENTS = Object.freeze({
  standard: Object.freeze({ id: 'standard', name: 'STANDARD', detail: 'Factory configuration', magScale: 1, reloadScale: 1 }),
  extended_mag: Object.freeze({ id: 'extended_mag', name: 'EXTENDED MAG', detail: '+50% magazine capacity', magScale: 1.5, reloadScale: 1 }),
  fast_mag: Object.freeze({ id: 'fast_mag', name: 'FAST MAG', detail: '20% faster reload', magScale: 1, reloadScale: 1.25 }),
});

const lobby = document.getElementById('merk-lobby');
if (lobby) {
  const nav = [...lobby.querySelectorAll('[data-lobby-nav]')];
  const views = [...lobby.querySelectorAll('[data-lobby-view]')];
  const mapKey = 'merk-of-duty.selected-map.v1';
  const loadoutsKey = 'merk-of-duty.loadouts.v2';
  const activeClassKey = 'merk-of-duty.active-class.v2';
  const activeLoadoutKey = 'merk-of-duty.active-loadout.v2';
  const safeStorage = (() => { try { return window.localStorage; } catch { return null; } })();
  const normalizeAttachment = (value) => LOADOUT_ATTACHMENTS[value] ? value : 'standard';
  const defaultClass = () => ({
    primary: 'm27',
    secondary: 'fiveseven',
    attachments: { primary: 'standard', secondary: 'standard' },
  });
  const normalizeClass = (value = {}) => ({
    primary: WEAPONS[value.primary]?.class === 'primary' ? value.primary : 'm27',
    secondary: WEAPONS[value.secondary]?.class === 'secondary' ? value.secondary : 'fiveseven',
    attachments: {
      primary: normalizeAttachment(value.attachments?.primary),
      secondary: normalizeAttachment(value.attachments?.secondary),
    },
  });
  const readClasses = () => {
    try {
      const parsed = JSON.parse(safeStorage?.getItem(loadoutsKey) || '[]');
      if (Array.isArray(parsed)) return Array.from({ length: 5 }, (_, index) => normalizeClass(parsed[index] || defaultClass()));
    } catch { /* corrupt local data falls back to defaults */ }
    return Array.from({ length: 5 }, defaultClass);
  };
  let customClasses = readClasses();
  let activeClassIndex = Math.max(0, Math.min(4, Number(safeStorage?.getItem(activeClassKey)) || 0));
  let activeLoadoutSlot = 'primary';
  const activeClassLoadout = () => customClasses[activeClassIndex];
  const persistLoadouts = () => {
    const current = normalizeClass(activeClassLoadout());
    customClasses[activeClassIndex] = current;
    try {
      safeStorage?.setItem(loadoutsKey, JSON.stringify(customClasses));
      safeStorage?.setItem(activeClassKey, String(activeClassIndex));
      safeStorage?.setItem(activeLoadoutKey, JSON.stringify(current));
      safeStorage?.setItem('merk-of-duty.loadout-primary.v1', current.primary);
      safeStorage?.setItem('merk-of-duty.loadout-secondary.v1', current.secondary);
    } catch { /* private browsing */ }
  };
  let selected = Math.max(0, nav.findIndex((item) => item.dataset.lobbyNav === 'multiplayer'));
  let activeMode = 'TEAM DEATHMATCH';
  const queryMap = new URLSearchParams(location.search).get('map');
  let activeMapId = queryMap || safeStorage?.getItem(mapKey) || randomBakedMapId();
  let queueMode = new URLSearchParams(location.search).get('mode') === 'zombies' ? 'zombies' : 'multiplayer';
  let matchTimer;
  let matchStartedAt;

  const mapName = (id) => findMap(id)?.name?.toUpperCase() || 'NUKETOWN 2025';
  const renderMapCards = () => {
    lobby.querySelectorAll('[data-lobby-map]').forEach((card) => {
      const map = findMap(card.dataset.lobbyMap);
      if (!map) return;
      card.style.setProperty('--map-card-image', `url("./${map.card || ''}")`);
      card.setAttribute('aria-label', `${map.name} map selection`);
      const title = card.querySelector('[data-map-title]');
      if (title) title.textContent = map.name.toUpperCase();
    });
  };
  const setSelected = (index) => {
    selected = (index + nav.length) % nav.length;
    nav.forEach((item, i) => {
      const on = i === selected;
      item.dataset.selected = String(on);
      item.setAttribute('aria-current', on ? 'page' : 'false');
    });
  };
  const openView = (name) => {
    views.forEach((view) => { view.hidden = view.dataset.lobbyView !== name; });
    if (name !== 'matchmaking') stopMatchTimer();
  };
  const setMode = (mode) => {
    activeMode = mode;
    lobby.querySelectorAll('[data-lobby-mode]').forEach((item) => { item.dataset.active = String(item.dataset.lobbyMode === mode); });
    lobby.querySelectorAll('[data-lobby-current-mode], [data-loading-mode]').forEach((item) => { item.textContent = mode; });
  };
  const setMap = (id) => {
    const map = findMap(id);
    if (!map) return;
    activeMapId = map.id;
    try { safeStorage?.setItem(mapKey, activeMapId); } catch { /* private browsing */ }
    lobby.querySelectorAll('[data-lobby-map]').forEach((item) => { item.dataset.active = String(item.dataset.lobbyMap === activeMapId); });
    lobby.querySelectorAll('[data-lobby-current-map], [data-loading-map]').forEach((item) => { item.textContent = map.name.toUpperCase(); });
    lobby.querySelectorAll('.scoreboard-mode').forEach((item) => { item.textContent = `// ${map.name.toUpperCase()}`; });
  };
  const stopMatchTimer = () => { if (matchTimer) clearInterval(matchTimer); matchTimer = null; };
  const openMatchmaking = () => {
    if (queueMode !== 'zombies') queueMode = 'multiplayer';
    openView('matchmaking');
    matchStartedAt = performance.now();
    const time = lobby.querySelector('[data-match-time]');
    stopMatchTimer();
    matchTimer = setInterval(() => { if (time) time.textContent = new Date(performance.now() - matchStartedAt).toISOString().slice(14, 19); }, 250);
    // Keep the matchmaking transition readable, but do not put an artificial
    // multi-second gate in front of the real asset loader.
    setTimeout(() => { if (!lobby.querySelector('[data-lobby-view="matchmaking"]')?.hidden) showLoading(); }, 650);
  };
  const showLoading = () => {
    stopMatchTimer();
    openView('');
    const screen = document.getElementById('merk-loading-screen');
    const progress = screen?.querySelector('[data-loading-progress]');
    const copy = screen?.querySelector('[data-loading-copy]');
    if (!screen) return startGame();
    screen.hidden = false;
    if (progress) progress.style.width = '62%';
    if (copy) copy.textContent = 'MATCH FOUND // PREPARING DEPLOYMENT';
    setTimeout(() => {
      if (progress) progress.style.width = '100%';
      if (copy) copy.textContent = 'DEPLOYING';
      setTimeout(() => { screen.hidden = true; startGame(); }, 110);
    }, 220);
  };
  const startGame = () => {
    const expectedMode = queueMode === 'zombies' ? 'zombies' : 'multiplayer';
    const query = new URLSearchParams(location.search);
    if (query.get('map') !== activeMapId || query.get('mode') !== expectedMode || query.get('autostart') !== '1') {
      query.set('map', activeMapId);
      query.set('mode', expectedMode);
      query.set('autostart', '1');
      location.assign(`${location.pathname}?${query.toString()}`);
      return;
    }
    lobby.hidden = true;
    if (globalThis.merkGameStarted && typeof globalThis.merkDeployGame === 'function') globalThis.merkDeployGame();
    else if (typeof globalThis.merkStartGame === 'function') globalThis.merkStartGame();
    else window.addEventListener('merk:game-ready', () => globalThis.merkStartGame?.(), { once: true });
  };
  const activate = (name = nav[selected]?.dataset.lobbyNav) => {
    if (name === 'multiplayer' || name === 'play') { queueMode = 'multiplayer'; openView('multiplayer'); }
    else if (name === 'zombies') { queueMode = 'zombies'; openView('zombies'); }
    else if (name === 'loadouts') openView('loadout');
    else if (name === 'campaign') openView('campaign');
    else if (name === 'custom') openView('custom');
    else if (name === 'store') openView('store');
    else if (name === 'options') openView('options');
    else if (name === 'account') {
      openView('');
      const panel = document.getElementById('merk-auth-panel');
      if (panel) panel.hidden = false;
    }
  };
  const outputForSetting = (key, value) => {
    if (key === 'fov') return `${value}°`;
    if (key === 'sensitivity' || key === 'ads') return `${Number(value).toFixed(1)}×`;
    if (['master','music','effects'].includes(key)) return `${value}%`;
    return String(value);
  };
  const loadSettings = () => {
    const saved = loadRuntimeSettings(safeStorage);
    lobby.querySelectorAll('[data-setting-key]').forEach((input) => {
      if (saved[input.dataset.settingKey] != null) input.value = saved[input.dataset.settingKey];
      const output = lobby.querySelector(`[data-setting-output="${input.dataset.settingKey}"]`);
      if (output) output.textContent = outputForSetting(input.dataset.settingKey, input.value);
    });
    return saved;
  };
  const saveSettings = () => {
    const values = Object.fromEntries([...lobby.querySelectorAll('[data-setting-key]')].map((input) => [input.dataset.settingKey, input.value]));
    const saved = saveRuntimeSettings(values, safeStorage);
    const status = lobby.querySelector('[data-settings-status]');
    if (status) {
      status.textContent = 'SETTINGS APPLIED';
      status.dataset.saved = 'true';
      setTimeout(() => { status.dataset.saved = 'false'; }, 1200);
    }
    return saved;
  };

  const localProfile = () => {
    try {
      const value = JSON.parse(safeStorage?.getItem('merk-of-duty.profile.v2') || '{}');
      return {
        display_name: value.name || null,
        level: Number(value.level) || 1,
        xp: Number(value.xp) || 0,
        wins: Number(value.wins) || 0,
      };
    } catch {
      return { display_name: null, level: 1, xp: 0, wins: 0 };
    }
  };
  const paintProfile = ({ authenticated = false, displayName = null, profile = null } = {}) => {
    const settings = loadRuntimeSettings(safeStorage);
    const fallback = localProfile();
    const cleanName = String(displayName || profile?.display_name || fallback.display_name || settings.name || 'OPERATIVE').replace(/^@/, '').trim() || 'OPERATIVE';
    const level = Math.max(1, Number(profile?.level ?? fallback.level) || 1);
    const xp = Math.max(0, Number(profile?.xp ?? fallback.xp) || 0);
    const wins = Math.max(0, Number(profile?.wins ?? fallback.wins) || 0);
    lobby.querySelectorAll('[data-profile-name]').forEach((el) => {
      const small = el.querySelector('small');
      const text = el.firstChild;
      if (text) text.textContent = cleanName.toUpperCase();
      else el.prepend(document.createTextNode(cleanName.toUpperCase()));
      if (small) el.appendChild(small);
    });
    lobby.querySelectorAll('[data-profile-level]').forEach((el) => { el.textContent = String(level).padStart(2, '0'); });
    lobby.querySelectorAll('[data-stat-level]').forEach((el) => { el.textContent = String(level); });
    lobby.querySelectorAll('[data-stat-wins]').forEach((el) => { el.textContent = wins.toLocaleString(); });
    lobby.querySelectorAll('[data-profile-xp]').forEach((el) => { el.textContent = xp.toLocaleString() + ' XP'; });
    lobby.querySelectorAll('[data-profile-status]').forEach((el) => { el.textContent = authenticated ? 'CLOUD PROFILE' : 'LOCAL PROFILE'; });
    lobby.querySelectorAll('[data-stat-sync]').forEach((el) => { el.textContent = authenticated ? 'SYNCED' : 'LOCAL'; });
    lobby.querySelectorAll('[data-account-state]').forEach((el) => { el.textContent = authenticated ? 'MERK NETWORK' : 'GUEST ONLINE'; });
    lobby.querySelectorAll('[data-account-nav-label]').forEach((el) => { el.textContent = authenticated ? 'Account / Profile' : 'Account / Sign In'; });
    lobby.querySelectorAll('[data-party-privacy]').forEach((el) => { el.textContent = settings.privacy; });
    const rosterName = lobby.querySelector('[data-lobby-view="multiplayer"] .lobby-roster-row span:first-child');
    if (rosterName) rosterName.textContent = cleanName.toUpperCase();
  };
  const refreshAccountProfile = async () => {
    let authenticated = false;
    let displayName = null;
    let profile = null;
    try {
      const response = await fetch('/api/auth', { credentials: 'same-origin', cache: 'no-store' });
      const auth = await response.json();
      authenticated = Boolean(response.ok && auth.authenticated);
      displayName = auth.displayName || null;
      if (authenticated) {
        const profileResponse = await fetch('/api/profile', { credentials: 'same-origin', cache: 'no-store' });
        if (profileResponse.ok) profile = await profileResponse.json();
      }
    } catch { /* local profile remains usable offline */ }
    paintProfile({ authenticated, displayName, profile });
  };

  let weaponPreview = null;

  const createWeaponPreview = (stage, fallback) => {
    const canvas = stage.querySelector('canvas');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
    camera.position.set(0, 0, 4.25);
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !matchMedia('(pointer: coarse)').matches,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));

    const modelRoot = new THREE.Group();
    scene.add(modelRoot);
    scene.add(new THREE.HemisphereLight(0xcfe7ff, 0x192127, 2.25));
    const key = new THREE.DirectionalLight(0xffd5ba, 4.2);
    key.position.set(3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x75a9d5, 3.1);
    rim.position.set(-4, 1, -3);
    scene.add(rim);

    const manager = new THREE.LoadingManager();
    manager.setURLModifier((url) => url.endsWith('.dds') ? url.slice(0, -4) + '.webp' : url);
    const loader = new GLTFLoader(manager);
    const cache = new Map();
    let model = null;
    let token = 0;
    let dragging = false;
    let pointerX = 0;
    let yaw = 0.45;

    const resize = () => {
      const width = Math.max(1, Math.floor(stage.clientWidth));
      const height = Math.max(1, Math.floor(stage.clientHeight));
      const pixelRatio = renderer.getPixelRatio();
      const drawWidth = renderer.domElement.width / pixelRatio;
      const drawHeight = renderer.domElement.height / pixelRatio;
      if (Math.abs(drawWidth - width) > 1 || Math.abs(drawHeight - height) > 1) {
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      }
    };

    const placeModel = (object) => {
      modelRoot.clear();
      model = object;
      modelRoot.add(model);
      model.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z, 0.001);
      model.position.sub(center);
      model.scale.setScalar(2.55 / maxDimension);
      model.rotation.set(-0.08, yaw, -0.03);
      fallback.hidden = true;
    };

    const show = async (weapon) => {
      if (!weapon) return;
      const request = ++token;
      fallback.hidden = false;
      fallback.textContent = 'LOADING 3D MODEL';
      try {
        const source = weapon.worldModelUrl || weapon.viewmodelUrl;
        if (!source) throw new Error('No model available');
        let template = cache.get(source);
        if (!template) {
          const gltf = await loader.loadAsync('./' + source);
          template = gltf.scene;
          cache.set(source, template);
        }
        if (request !== token) return;
        placeModel(template.clone(true));
      } catch {
        if (request !== token) return;
        modelRoot.clear();
        model = null;
        fallback.hidden = false;
        fallback.textContent = weapon.name.toUpperCase();
      }
    };

    stage.addEventListener('pointerdown', (event) => {
      dragging = true;
      pointerX = event.clientX;
      stage.setPointerCapture?.(event.pointerId);
    });
    stage.addEventListener('pointermove', (event) => {
      if (!dragging || !model) return;
      yaw += (event.clientX - pointerX) * 0.012;
      pointerX = event.clientX;
      model.rotation.y = yaw;
    });
    stage.addEventListener('pointerup', () => { dragging = false; });
    stage.addEventListener('pointercancel', () => { dragging = false; });

    const frame = () => {
      requestAnimationFrame(frame);
      if (!stage.isConnected || stage.offsetParent === null) return;
      resize();
      if (model && !dragging) {
        yaw += 0.0022;
        model.rotation.y = yaw;
      }
      renderer.render(scene, camera);
    };
    frame();
    return { show };
  };

  const ensureLoadoutWorkbench = (view, grid) => {
    if (!view || view.querySelector('[data-loadout-workbench]')) return;
    view.classList.add('lobby-loadout-dialog');

    const classTabs = document.createElement('div');
    classTabs.className = 'lobby-mode-grid loadout-class-tabs';
    classTabs.dataset.loadoutClassTabs = '';
    classTabs.setAttribute('aria-label', 'Saved custom classes');
    classTabs.innerHTML = Array.from({ length: 5 }, (_, index) =>
      '<button class="lobby-mode" type="button" data-loadout-class="' + index + '">CUSTOM ' + (index + 1) + '</button>').join('');

    const slotTabs = document.createElement('div');
    slotTabs.className = 'lobby-mode-grid loadout-slot-tabs';
    slotTabs.dataset.loadoutSlotTabs = '';
    slotTabs.setAttribute('aria-label', 'Weapon slot');
    slotTabs.innerHTML = '<button class="lobby-mode" type="button" data-loadout-slot="primary">PRIMARY</button><button class="lobby-mode" type="button" data-loadout-slot="secondary">SECONDARY</button>';

    const workbench = document.createElement('div');
    workbench.className = 'loadout-workbench';
    workbench.dataset.loadoutWorkbench = '';

    const preview = document.createElement('section');
    preview.className = 'loadout-preview-panel';
    preview.innerHTML =
      '<div class="loadout-preview-stage" data-loadout-preview-stage>' +
        '<canvas aria-label="Interactive 3D weapon preview"></canvas>' +
        '<div class="loadout-preview-fallback" data-loadout-preview-fallback>LOADING 3D MODEL</div>' +
        '<span class="loadout-preview-hint">DRAG TO ROTATE</span>' +
      '</div>' +
      '<div class="loadout-preview-copy">' +
        '<small data-loadout-preview-role>PRIMARY</small>' +
        '<h3 data-loadout-preview-name>M27</h3>' +
        '<p data-loadout-preview-meta>ASSAULT RIFLE</p>' +
        '<div class="loadout-stats">' +
          '<div class="loadout-stat"><span>DAMAGE</span><i><b data-loadout-stat="damage"></b></i><em data-loadout-stat-value="damage">0</em></div>' +
          '<div class="loadout-stat"><span>FIRE RATE</span><i><b data-loadout-stat="fire-rate"></b></i><em data-loadout-stat-value="fire-rate">0</em></div>' +
          '<div class="loadout-stat"><span>CAPACITY</span><i><b data-loadout-stat="capacity"></b></i><em data-loadout-stat-value="capacity">0</em></div>' +
          '<div class="loadout-stat"><span>MOBILITY</span><i><b data-loadout-stat="mobility"></b></i><em data-loadout-stat-value="mobility">0</em></div>' +
        '</div>' +
      '</div>';

    const browser = document.createElement('section');
    browser.className = 'loadout-browser-panel';
    const attachmentWrap = document.createElement('div');
    attachmentWrap.className = 'loadout-attachments';
    attachmentWrap.innerHTML = '<div class="loadout-section-label">ATTACHMENT</div><div class="loadout-attachment-grid" data-loadout-attachment-grid></div>';

    grid.before(classTabs, workbench);
    workbench.append(preview, browser);
    browser.append(slotTabs, attachmentWrap, grid);

    classTabs.querySelectorAll('[data-loadout-class]').forEach((button) => button.addEventListener('click', () => {
      activeClassIndex = Number(button.dataset.loadoutClass);
      persistLoadouts();
      renderWeaponRoster();
    }));
    slotTabs.querySelectorAll('[data-loadout-slot]').forEach((button) => button.addEventListener('click', () => {
      activeLoadoutSlot = button.dataset.loadoutSlot;
      renderWeaponRoster();
    }));

    weaponPreview = createWeaponPreview(
      preview.querySelector('[data-loadout-preview-stage]'),
      preview.querySelector('[data-loadout-preview-fallback]'),
    );
  };

  const renderPreviewStats = (weapon) => {
    const view = lobby.querySelector('[data-lobby-view="loadout"] .lobby-dialog');
    if (!view || !weapon) return;
    const role = view.querySelector('[data-loadout-preview-role]');
    const name = view.querySelector('[data-loadout-preview-name]');
    const meta = view.querySelector('[data-loadout-preview-meta]');
    if (role) role.textContent = activeLoadoutSlot.toUpperCase();
    if (name) name.textContent = weapon.name.toUpperCase();
    if (meta) meta.textContent = (weapon.role || weapon.class).toUpperCase() + ' · ' + String(weapon.fireMode || 'single').toUpperCase();

    const values = {
      damage: Math.min(100, Math.round(Number(weapon.damage) || 0)),
      'fire-rate': Math.min(100, Math.round((Number(weapon.roundsPerMinute) || 0) / 10)),
      capacity: Math.min(100, Math.round((Number(weapon.magazineSize) || 0) * 2)),
      mobility: weapon.class === 'secondary' ? 92 : /sniper/i.test(weapon.role || '') ? 56 : 76,
    };
    for (const [keyName, value] of Object.entries(values)) {
      const bar = view.querySelector('[data-loadout-stat="' + keyName + '"]');
      const out = view.querySelector('[data-loadout-stat-value="' + keyName + '"]');
      if (bar) bar.style.width = value + '%';
      if (out) out.textContent = String(value);
    }
    weaponPreview?.show(weapon);
  };

  const renderWeaponRoster = () => {
    const grid = lobby.querySelector('[data-lobby-weapon-grid]');
    if (!grid) return;
    const view = lobby.querySelector('[data-lobby-view="loadout"] .lobby-dialog');
    ensureLoadoutWorkbench(view, grid);

    persistLoadouts();
    lobby.querySelectorAll('[data-loadout-class]').forEach((button) => {
      button.dataset.active = String(Number(button.dataset.loadoutClass) === activeClassIndex);
    });
    lobby.querySelectorAll('[data-loadout-slot]').forEach((button) => {
      button.dataset.active = String(button.dataset.loadoutSlot === activeLoadoutSlot);
    });

    const currentLoadout = activeClassLoadout();
    const currentWeapon = WEAPONS[currentLoadout[activeLoadoutSlot]];
    renderPreviewStats(currentWeapon);

    const attachmentGrid = lobby.querySelector('[data-loadout-attachment-grid]');
    if (attachmentGrid) {
      attachmentGrid.replaceChildren();
      for (const attachment of Object.values(LOADOUT_ATTACHMENTS)) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'loadout-attachment';
        button.dataset.active = String(currentLoadout.attachments[activeLoadoutSlot] === attachment.id);
        button.innerHTML = '<strong>' + attachment.name + '</strong><small>' + attachment.detail + '</small>';
        button.addEventListener('click', () => {
          currentLoadout.attachments[activeLoadoutSlot] = attachment.id;
          persistLoadouts();
          renderWeaponRoster();
        });
        attachmentGrid.appendChild(button);
      }
    }

    grid.replaceChildren();
    for (const weapon of Object.values(WEAPONS).filter((item) => item.class === activeLoadoutSlot)) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'lobby-weapon-card';
      card.dataset.weaponId = weapon.id;
      card.dataset.active = String(weapon.id === currentLoadout[activeLoadoutSlot]);
      if (weapon.cardArt) card.style.setProperty('--weapon-card-art', 'url("./' + weapon.cardArt + '")');
      card.innerHTML =
        '<span class="lobby-weapon-thumb" aria-hidden="true"></span>' +
        '<strong>' + weapon.name + '</strong>' +
        '<small>' + (weapon.role || weapon.class.toUpperCase()) + '</small>' +
        '<span>' + (weapon.damage ?? 0) + ' DMG · ' + (weapon.magazineSize ?? 0) + ' MAG · ' + (weapon.roundsPerMinute ?? 0) + ' RPM</span>';
      card.addEventListener('click', () => {
        currentLoadout[activeLoadoutSlot] = weapon.id;
        persistLoadouts();
        renderWeaponRoster();
      });
      grid.appendChild(card);
    }

    const rows = [...lobby.querySelectorAll('[data-lobby-view="loadout"] .lobby-roster-row')];
    const primary = WEAPONS[currentLoadout.primary];
    const secondary = WEAPONS[currentLoadout.secondary];
    const effectiveMagazine = (weapon, slot) => {
      if (!weapon) return '—';
      const attachment = LOADOUT_ATTACHMENTS[currentLoadout.attachments[slot]] || LOADOUT_ATTACHMENTS.standard;
      return String(Math.max(1, Math.ceil((weapon.magazineSize || 1) * attachment.magScale)));
    };
    const setRow = (row, label, weapon, slot) => {
      if (!row || !weapon) return;
      const cells = row.children;
      if (cells[0]) cells[0].textContent = label;
      if (cells[1]) cells[1].textContent = weapon.name.toUpperCase();
      if (cells[2]) cells[2].textContent = LOADOUT_ATTACHMENTS[currentLoadout.attachments[slot]]?.name || 'STANDARD';
      if (cells[3]) cells[3].textContent = effectiveMagazine(weapon, slot);
    };
    setRow(rows[0], 'PRIMARY', primary, 'primary');
    setRow(rows[1], 'SECONDARY', secondary, 'secondary');
    if (rows[2]) {
      const cells = rows[2].children;
      if (cells[0]) cells[0].textContent = 'CLASS PROFILE';
      if (cells[1]) cells[1].textContent = 'CUSTOM ' + (activeClassIndex + 1);
      if (cells[2]) cells[2].textContent = '2 WEAPONS / 2 ATTACHMENTS';
      if (cells[3]) cells[3].textContent = 'SAVED';
    }
    if (rows[3]) {
      const cells = rows[3].children;
      if (cells[0]) cells[0].textContent = 'EQUIPMENT';
      if (cells[1]) cells[1].textContent = 'FRAG / SMOKE';
      if (cells[2]) cells[2].textContent = 'MATCH READY';
      if (cells[3]) cells[3].textContent = '✓';
    }
  };
  nav.forEach((item, index) => { item.addEventListener('pointerenter', () => setSelected(index)); item.addEventListener('click', () => activate(item.dataset.lobbyNav)); });
  lobby.querySelector('[data-lobby-action="find"]')?.addEventListener('click', () => openView('multiplayer'));
  lobby.querySelectorAll('[data-lobby-action="start"]').forEach((button) => button.addEventListener('click', openMatchmaking));
  lobby.querySelectorAll('[data-lobby-action="back"]').forEach((button) => button.addEventListener('click', () => openView('')));
  lobby.querySelector('[data-lobby-action="cancel-match"]')?.addEventListener('click', () => openView('multiplayer'));
  lobby.querySelector('[data-lobby-action="map-confirm"]')?.addEventListener('click', () => openView('multiplayer'));
  lobby.querySelector('[data-lobby-action="map-open"]')?.addEventListener('click', () => openView('map-select'));
  lobby.querySelector('[data-lobby-action="save-settings"]')?.addEventListener('click', () => { saveSettings(); openView(''); });
  lobby.querySelector('[data-open-auth]')?.addEventListener('click', () => {
    const panel = document.getElementById('merk-auth-panel');
    if (panel) {
      panel.hidden = false;
      panel.querySelector('input:not([hidden])')?.focus();
    }
  });
  lobby.querySelectorAll('[data-lobby-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.lobbyMode)));
  lobby.querySelectorAll('[data-lobby-map]').forEach((button) => button.addEventListener('click', () => setMap(button.dataset.lobbyMap)));
  lobby.querySelectorAll('[data-setting-tab]').forEach((button) => button.addEventListener('click', () => { lobby.querySelectorAll('[data-setting-tab]').forEach((tab) => { tab.dataset.active = String(tab === button); }); lobby.querySelectorAll('[data-setting-panel]').forEach((panel) => { panel.hidden = panel.dataset.settingPanel !== button.dataset.settingTab; }); }));
  lobby.querySelectorAll('[data-setting-key]').forEach((input) => input.addEventListener('input', () => {
    const output = lobby.querySelector(`[data-setting-output="${input.dataset.settingKey}"]`);
    if (output) output.textContent = outputForSetting(input.dataset.settingKey, input.value);
    const status = lobby.querySelector('[data-settings-status]');
    if (status) { status.textContent = 'UNSAVED CHANGES'; status.dataset.saved = 'false'; }
  }));
  document.addEventListener('keydown', (event) => { if (lobby.hidden) return; if (event.key === 'ArrowDown') { event.preventDefault(); setSelected(selected + 1); } if (event.key === 'ArrowUp') { event.preventDefault(); setSelected(selected - 1); } if (event.key === 'Enter') { event.preventDefault(); activate(); } if (event.key === 'Escape') { event.preventDefault(); openView(''); } });
  loadSettings();
  void refreshAccountProfile();
  addEventListener('merk:auth-changed', () => void refreshAccountProfile());
  addEventListener('merk:settings-changed', () => paintProfile());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refreshAccountProfile(); });
  setSelected(selected);
  setMap(activeMapId);
  renderMapCards();
  renderWeaponRoster();
}
