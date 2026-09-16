const STORAGE = 'merk-of-duty.profile.v1';
const defaults = { name: 'GUEST OPERATIVE', level: 1, xp: 0, wins: 0, mode: 'normal', quality: 'hd', fov: 90, aim: 'TAP TO AIM', split: true, hud: true };
const load = () => { try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORAGE) || '{}') }; } catch { return { ...defaults }; } };
const save = (p) => { try { localStorage.setItem(STORAGE, JSON.stringify(p)); } catch {} };
const p = load();
const $ = (q) => document.querySelector(q);
const hub = $('#merk-hub');
const modeNames = { normal: 'TEAM DEATHMATCH · 10 MIN', ranked: 'RANKED TDM · 10 MIN', hardcore: 'HARDCORE TDM · 10 MIN', zombies: 'ZOMBIES · INFINITE ROUNDS' };
function render() {
  $('#merk-player-line').textContent = `${p.name} · LEVEL ${String(p.level).padStart(2, '0')}`;
  $('#merk-rank-badge').textContent = String(p.level).padStart(2, '0');
  $('#merk-rank-xp').textContent = `${p.xp.toLocaleString()} / 1,000 XP`;
  $('#merk-leader-score').textContent = `${p.wins} WINS`;
  $('#merk-rank-progress').style.width = `${Math.min(100, p.xp / 10)}%`;
  $('#merk-match-summary').textContent = modeNames[p.mode];
  $('#merk-quality').value = p.quality; $('#merk-fov').value = p.fov; $('#merk-fov-out').value = `${p.fov}°`; $('#merk-fov-out').textContent = `${p.fov}°`;
  $('#merk-aim').value = p.aim; $('#merk-split').checked = p.split; $('#merk-hud').checked = p.hud;
  document.querySelectorAll('.merk-mode').forEach(b => b.classList.toggle('is-active', b.dataset.mode === p.mode));
}
function openHub() { hub.hidden = false; render(); }
function closeHub() { hub.hidden = true; }
function bind() {
  document.querySelectorAll('[data-merk-tab]').forEach(b => b.addEventListener('click', () => { document.querySelectorAll('.merk-tab').forEach(x => x.classList.toggle('is-active', x === b)); document.querySelectorAll('[data-merk-view]').forEach(v => v.classList.toggle('is-active', v.dataset.merkView === b.dataset.merkTab)); }));
  document.querySelectorAll('.merk-mode').forEach(b => b.addEventListener('click', () => { p.mode = b.dataset.mode; save(p); render(); }));
  $('#merk-hub-close').addEventListener('click', closeHub);
  $('#merk-deploy').addEventListener('click', () => { closeHub(); document.querySelector('#fe-load-game')?.click(); });
  $('#merk-custom').addEventListener('click', () => { alert('Custom Games ready: 10 min → unlimited · 10 → unlimited kills · 20 bots · map selection · weapon bans.'); });
  $('#merk-signin').addEventListener('click', () => { const name = prompt('Enter your operative name', p.name === defaults.name ? '' : p.name); if (name) { p.name = name.toUpperCase().slice(0, 18); save(p); render(); } });
  $('#merk-quick-settings').addEventListener('click', () => document.querySelector('[data-merk-tab="settings"]').click());
  $('#merk-quality').addEventListener('change', e => { p.quality = e.target.value; save(p); });
  $('#merk-fov').addEventListener('input', e => { p.fov = Number(e.target.value); save(p); render(); });
  $('#merk-aim').addEventListener('change', e => { p.aim = e.target.value; save(p); });
  $('#merk-split').addEventListener('change', e => { p.split = e.target.checked; save(p); });
  $('#merk-hud').addEventListener('change', e => { p.hud = e.target.checked; save(p); document.body.classList.toggle('merk-hud-hidden', !p.hud); });
  // Open the product hub from the existing title screen without replacing the game shell.
  document.querySelectorAll('[data-action="class"]').forEach(b => b.insertAdjacentHTML('afterend', '<button type="button" class="fe-btn merk-open-hub">OPERATIONS HUB</button>'));
  document.querySelectorAll('.merk-open-hub').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); openHub(); }));
}
bind();
render();
window.merkOfDuty = { profile: p, openHub, closeHub, save };
