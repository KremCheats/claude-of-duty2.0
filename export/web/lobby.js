import { MAPS, findMap, randomBakedMapId } from './maps.js';
import { WEAPONS } from './weapons.js';

const lobby = document.getElementById('merk-lobby');
if (lobby) {
  const nav = [...lobby.querySelectorAll('[data-lobby-nav]')];
  const views = [...lobby.querySelectorAll('[data-lobby-view]')];
  const storageKey = 'merk-of-duty.ui-settings.v1';
  const mapKey = 'merk-of-duty.selected-map.v1';
  const loadoutsKey = 'merk-of-duty.loadouts.v2';
  const activeClassKey = 'merk-of-duty.active-class.v2';
  const activeLoadoutKey = 'merk-of-duty.active-loadout.v2';
  const safeStorage = (() => { try { return window.localStorage; } catch { return null; } })();
  const defaultClass = () => ({ primary: 'm27', secondary: 'fiveseven' });
  const normalizeClass = (value = {}) => ({
    primary: WEAPONS[value.primary]?.class === 'primary' ? value.primary : 'm27',
    secondary: WEAPONS[value.secondary]?.class === 'secondary' ? value.secondary : 'fiveseven',
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
    setTimeout(() => { if (!lobby.querySelector('[data-lobby-view="matchmaking"]')?.hidden) showLoading(); }, 2200);
  };
  const showLoading = () => {
    stopMatchTimer();
    openView('');
    const screen = document.getElementById('merk-loading-screen');
    const progress = screen?.querySelector('[data-loading-progress]');
    const copy = screen?.querySelector('[data-loading-copy]');
    if (!screen) return startGame();
    screen.hidden = false;
    let value = 0;
    const captions = ['CONNECTING TO TACTICAL NETWORK', 'ALLOCATING FIRETEAM', 'SYNCING WEAPON DATA', 'LOADING COMBAT SHADERS', 'MATCH FOUND // DEPLOYING'];
    const timer = setInterval(() => {
      value = Math.min(100, value + 5);
      if (progress) progress.style.width = `${value}%`;
      if (copy) copy.textContent = captions[Math.min(captions.length - 1, Math.floor(value / 25))];
      if (value >= 100) { clearInterval(timer); screen.hidden = true; startGame(); }
    }, 95);
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
  const loadSettings = () => {
    try {
      const saved = JSON.parse(safeStorage?.getItem(storageKey) || '{}');
      lobby.querySelectorAll('[data-setting-key]').forEach((input) => {
        if (saved[input.dataset.settingKey] != null) input.value = saved[input.dataset.settingKey];
      });
      const rendererPreset = safeStorage?.getItem('hijacked.graphics');
      const quality = lobby.querySelector('[data-setting-key="quality"]');
      if (quality && rendererPreset) quality.value = ({ quality: 'HIGH', auto: 'BALANCED', performance: 'PERFORMANCE' })[rendererPreset] || quality.value;
    } catch { /* local settings are optional */ }
  };
  const saveSettings = () => {
    const values = Object.fromEntries([...lobby.querySelectorAll('[data-setting-key]')].map((input) => [input.dataset.settingKey, input.value]));
    try {
      safeStorage?.setItem(storageKey, JSON.stringify(values));
      const rendererPreset = ({ HIGH: 'quality', BALANCED: 'auto', PERFORMANCE: 'performance' })[values.quality];
      if (rendererPreset) safeStorage?.setItem('hijacked.graphics', rendererPreset);
    } catch { /* private browsing */ }
  };
  const renderWeaponRoster = () => {
    const grid = lobby.querySelector('[data-lobby-weapon-grid]');
    if (!grid) return;
    const view = lobby.querySelector('[data-lobby-view="loadout"] .lobby-dialog');
    if (view && !view.querySelector('[data-loadout-class-tabs]')) {
      const classTabs = document.createElement('div');
      classTabs.className = 'lobby-mode-grid';
      classTabs.dataset.loadoutClassTabs = '';
      classTabs.setAttribute('aria-label', 'Saved custom classes');
      classTabs.innerHTML = Array.from({ length: 5 }, (_, index) =>
        `<button class="lobby-mode" type="button" data-loadout-class="${index}">CUSTOM ${index + 1}</button>`).join('');
      const slotTabs = document.createElement('div');
      slotTabs.className = 'lobby-mode-grid';
      slotTabs.dataset.loadoutSlotTabs = '';
      slotTabs.setAttribute('aria-label', 'Weapon slot');
      slotTabs.innerHTML = '<button class="lobby-mode" type="button" data-loadout-slot="primary">PRIMARY</button><button class="lobby-mode" type="button" data-loadout-slot="secondary">SECONDARY</button>';
      grid.before(classTabs, slotTabs);
      classTabs.querySelectorAll('[data-loadout-class]').forEach((button) => button.addEventListener('click', () => {
        activeClassIndex = Number(button.dataset.loadoutClass);
        persistLoadouts();
        renderWeaponRoster();
      }));
      slotTabs.querySelectorAll('[data-loadout-slot]').forEach((button) => button.addEventListener('click', () => {
        activeLoadoutSlot = button.dataset.loadoutSlot;
        renderWeaponRoster();
      }));
    }

    persistLoadouts();
    lobby.querySelectorAll('[data-loadout-class]').forEach((button) => {
      button.dataset.active = String(Number(button.dataset.loadoutClass) === activeClassIndex);
    });
    lobby.querySelectorAll('[data-loadout-slot]').forEach((button) => {
      button.dataset.active = String(button.dataset.loadoutSlot === activeLoadoutSlot);
    });

    const currentLoadout = activeClassLoadout();
    grid.replaceChildren();
    for (const weapon of Object.values(WEAPONS).filter((item) => item.class === activeLoadoutSlot)) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'lobby-weapon-card';
      card.dataset.weaponId = weapon.id;
      card.dataset.active = String(weapon.id === currentLoadout[activeLoadoutSlot]);
      card.innerHTML = `<strong>${weapon.name}</strong><small>${weapon.role || weapon.class.toUpperCase()}</small><span>${weapon.damage ?? 0} DMG · ${weapon.magazineSize ?? 0} MAG · ${weapon.roundsPerMinute ?? 0} RPM</span>`;
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
    const setRow = (row, label, weapon) => {
      if (!row || !weapon) return;
      const cells = row.children;
      if (cells[0]) cells[0].textContent = label;
      if (cells[1]) cells[1].textContent = weapon.name.toUpperCase();
      if (cells[2]) cells[2].textContent = (weapon.role || weapon.class).toUpperCase();
      if (cells[3]) cells[3].textContent = String(weapon.magazineSize ?? '—');
    };
    setRow(rows[0], 'PRIMARY', primary);
    setRow(rows[1], 'SECONDARY', secondary);
    if (rows[2]) {
      const cells = rows[2].children;
      if (cells[0]) cells[0].textContent = 'CLASS PROFILE';
      if (cells[1]) cells[1].textContent = `CUSTOM ${activeClassIndex + 1}`;
      if (cells[2]) cells[2].textContent = 'PRIMARY + SECONDARY';
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
  lobby.querySelectorAll('[data-lobby-mode]').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.lobbyMode)));
  lobby.querySelectorAll('[data-lobby-map]').forEach((button) => button.addEventListener('click', () => setMap(button.dataset.lobbyMap)));
  lobby.querySelectorAll('[data-setting-tab]').forEach((button) => button.addEventListener('click', () => { lobby.querySelectorAll('[data-setting-tab]').forEach((tab) => { tab.dataset.active = String(tab === button); }); lobby.querySelectorAll('[data-setting-panel]').forEach((panel) => { panel.hidden = panel.dataset.settingPanel !== button.dataset.settingTab; }); }));
  lobby.querySelectorAll('[data-setting-key]').forEach((input) => input.addEventListener('input', () => { const output = lobby.querySelector(`[data-setting-output="${input.dataset.settingKey}"]`); if (output) output.textContent = input.dataset.settingKey === 'fov' ? `${input.value}°` : `${input.value}×`; }));
  document.addEventListener('keydown', (event) => { if (lobby.hidden) return; if (event.key === 'ArrowDown') { event.preventDefault(); setSelected(selected + 1); } if (event.key === 'ArrowUp') { event.preventDefault(); setSelected(selected - 1); } if (event.key === 'Enter') { event.preventDefault(); activate(); } if (event.key === 'Escape') { event.preventDefault(); openView(''); } });
  loadSettings();
  setSelected(selected);
  setMap(activeMapId);
  renderMapCards();
  renderWeaponRoster();
}
