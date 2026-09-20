const lobby = document.getElementById('merk-lobby');
if (lobby) {
  const nav = [...lobby.querySelectorAll('[data-lobby-nav]')];
  const views = [...lobby.querySelectorAll('[data-lobby-view]')];
  let selected = Math.max(0, nav.findIndex((item) => item.dataset.lobbyNav === 'multiplayer'));
  let activeMode = 'TEAM DEATHMATCH';
  let activeMap = 'HIJACKED';

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
  };
  const startGame = () => {
    lobby.hidden = true;
    if (typeof globalThis.merkStartGame === 'function') globalThis.merkStartGame();
    else window.addEventListener('merk:game-ready', () => globalThis.merkStartGame?.(), { once: true });
  };
  const activate = (name = nav[selected]?.dataset.lobbyNav) => {
    if (name === 'multiplayer' || name === 'play') openView('multiplayer');
    else if (name === 'loadouts') openView('loadout');
    else if (name === 'zombies') openView('zombies');
    else if (name === 'campaign') openView('campaign');
    else if (name === 'custom') openView('custom');
    else if (name === 'store') openView('store');
    else if (name === 'options') openView('options');
  };
  nav.forEach((item, index) => {
    item.addEventListener('pointerenter', () => setSelected(index));
    item.addEventListener('click', () => activate(item.dataset.lobbyNav));
  });
  lobby.querySelector('[data-lobby-action="find"]')?.addEventListener('click', () => openView('multiplayer'));
  lobby.querySelectorAll('[data-lobby-action="start"]').forEach((button) => button.addEventListener('click', startGame));
  lobby.querySelectorAll('[data-lobby-action="back"]').forEach((button) => button.addEventListener('click', () => openView('')));
  lobby.querySelectorAll('[data-lobby-mode]').forEach((button) => button.addEventListener('click', () => {
    activeMode = button.dataset.lobbyMode;
    lobby.querySelectorAll('[data-lobby-mode]').forEach((item) => { item.dataset.active = String(item === button); });
    const modeLine = lobby.querySelector('[data-lobby-current-mode]');
    if (modeLine) modeLine.textContent = activeMode;
  }));
  lobby.querySelectorAll('[data-lobby-map]').forEach((button) => button.addEventListener('click', () => {
    activeMap = button.dataset.lobbyMap;
    lobby.querySelectorAll('[data-lobby-map]').forEach((item) => { item.dataset.active = String(item === button); });
    const mapLine = lobby.querySelector('[data-lobby-current-map]');
    if (mapLine) mapLine.textContent = activeMap;
  }));
  document.addEventListener('keydown', (event) => {
    if (lobby.hidden) return;
    if (event.key === 'ArrowDown') { event.preventDefault(); setSelected(selected + 1); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setSelected(selected - 1); }
    if (event.key === 'Enter') { event.preventDefault(); activate(); }
    if (event.key === 'Escape') { event.preventDefault(); openView(''); }
  });
  setSelected(selected);
  window.addEventListener('merk:game-ready', () => { if (!lobby.hidden) lobby.querySelector('[data-lobby-nav="multiplayer"]')?.focus(); });
}
