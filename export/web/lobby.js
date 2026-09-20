const lobby = document.getElementById('merk-lobby');
if (lobby) {
  const nav = [...lobby.querySelectorAll('[data-lobby-nav]')];
  const views = [...lobby.querySelectorAll('[data-lobby-view]')];
  const storageKey = 'merk-of-duty.ui-settings.v1';
  let selected = Math.max(0, nav.findIndex((item) => item.dataset.lobbyNav === 'multiplayer'));
  let activeMode = 'TEAM DEATHMATCH';
  let activeMap = 'NUKETOWN 2020';
  let matchTimer;
  let matchStartedAt;

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
  const setMap = (map) => {
    activeMap = map;
    lobby.querySelectorAll('[data-lobby-map]').forEach((item) => { item.dataset.active = String(item.dataset.lobbyMap === map); });
    lobby.querySelectorAll('[data-lobby-current-map], [data-loading-map]').forEach((item) => { item.textContent = map; });
  };
  const stopMatchTimer = () => { if (matchTimer) clearInterval(matchTimer); matchTimer = null; };
  const openMatchmaking = () => {
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
    lobby.hidden = true;
    if (globalThis.merkGameStarted && typeof globalThis.merkDeployGame === 'function') globalThis.merkDeployGame();
    else if (typeof globalThis.merkStartGame === 'function') globalThis.merkStartGame();
    else window.addEventListener('merk:game-ready', () => globalThis.merkStartGame?.(), { once: true });
  };
  const activate = (name = nav[selected]?.dataset.lobbyNav) => {
    if (name === 'multiplayer' || name === 'play') openView('multiplayer');
    else if (name === 'zombies') openView('zombies');
    else if (name === 'loadouts') openView('loadout');
    else if (name === 'campaign') openView('campaign');
    else if (name === 'custom') openView('custom');
    else if (name === 'store') openView('store');
    else if (name === 'options') openView('options');
  };
  const loadSettings = () => {
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); lobby.querySelectorAll('[data-setting-key]').forEach((input) => { if (saved[input.dataset.settingKey] != null) input.value = saved[input.dataset.settingKey]; }); } catch { /* local settings are optional */ }
  };
  const saveSettings = () => {
    const values = Object.fromEntries([...lobby.querySelectorAll('[data-setting-key]')].map((input) => [input.dataset.settingKey, input.value]));
    try { localStorage.setItem(storageKey, JSON.stringify(values)); } catch { /* private browsing */ }
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
  document.addEventListener('keydown', (event) => { if (lobby.hidden) return; if (event.key === 'ArrowRight' && !views.some((view) => !view.hidden && view.dataset.lobbyView === 'map-select')) return; if (event.key === 'ArrowDown') { event.preventDefault(); setSelected(selected + 1); } if (event.key === 'ArrowUp') { event.preventDefault(); setSelected(selected - 1); } if (event.key === 'Enter') { event.preventDefault(); activate(); } if (event.key === 'Escape') { event.preventDefault(); openView(''); } });
  loadSettings(); setSelected(selected); setMap(activeMap);
}
