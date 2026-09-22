import { MAPS, findMap, randomBakedMapId } from './maps.js';
import { WEAPONS } from './weapons.js';

const lobby = document.getElementById('merk-lobby');
if (lobby) {
  const nav = [...lobby.querySelectorAll('[data-lobby-nav]')];
  const views = [...lobby.querySelectorAll('[data-lobby-view]')];
  const storageKey = 'merk-of-duty.ui-settings.v1';
  const mapKey = 'merk-of-duty.selected-map.v1';
  const safeStorage = (() => { try { return window.localStorage; } catch { return null; } })();
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
    try { const saved = JSON.parse(safeStorage?.getItem(storageKey) || '{}'); lobby.querySelectorAll('[data-setting-key]').forEach((input) => { if (saved[input.dataset.settingKey] != null) input.value = saved[input.dataset.settingKey]; }); } catch { /* local settings are optional */ }
  };
  const saveSettings = () => {
    const values = Object.fromEntries([...lobby.querySelectorAll('[data-setting-key]')].map((input) => [input.dataset.settingKey, input.value]));
    try { safeStorage?.setItem(storageKey, JSON.stringify(values)); } catch { /* private browsing */ }
  };
  const renderWeaponRoster = () => {
    const grid = lobby.querySelector('[data-lobby-weapon-grid]');
    if (!grid) return;
    const saved = safeStorage?.getItem('merk-of-duty.loadout-primary.v1') || 'm27';
    grid.replaceChildren();
    for (const weapon of Object.values(WEAPONS)) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'lobby-weapon-card';
      card.dataset.weaponId = weapon.id;
      card.dataset.active = String(weapon.id === saved);
      card.innerHTML = `<strong>${weapon.name}</strong><small>${weapon.role || weapon.class.toUpperCase()}</small><span>${weapon.damage ?? 0} DMG · ${weapon.magazineSize ?? 0} MAG · ${weapon.roundsPerMinute ?? 0} RPM</span>`;
      card.addEventListener('click', () => {
        grid.querySelectorAll('[data-weapon-id]').forEach((item) => { item.dataset.active = String(item === card); });
        try { safeStorage?.setItem('merk-of-duty.loadout-primary.v1', weapon.id); } catch { /* private browsing */ }
        const current = lobby.querySelector('.lobby-roster-row small');
        if (current) current.textContent = weapon.name;
      });
      grid.appendChild(card);
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
