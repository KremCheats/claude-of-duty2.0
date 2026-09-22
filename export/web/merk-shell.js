import { loadSettings, saveSettings } from './settings-runtime.js';

const $ = (selector) => document.querySelector(selector);
const storage = (() => { try { return localStorage; } catch { return null; } })();
const LEGACY_PROFILE_KEY = 'merk-of-duty.profile.v2';

let settings = loadSettings(storage);
let profile = {
  name: settings.name,
  level: 1,
  xp: 0,
  wins: 0,
  mode: 'normal',
};

try {
  const old = JSON.parse(storage?.getItem(LEGACY_PROFILE_KEY) || '{}');
  profile = { ...profile, ...old, name: old.name || settings.name };
} catch {}

function renderCompatibilityProfile() {
  $('#merk-player-line')?.replaceChildren(`${profile.name.toUpperCase()} · LEVEL ${String(profile.level || 1).padStart(2,'0')}`);
  const badge = $('#merk-rank-badge');
  if (badge) badge.textContent = String(profile.level || 1).padStart(2,'0');
  const score = $('#merk-leader-score');
  if (score) score.textContent = `${Number(profile.wins || 0)} WINS`;
}

function saveProfile() {
  settings = saveSettings({ ...settings, name: profile.name }, storage);
  try { storage?.setItem(LEGACY_PROFILE_KEY, JSON.stringify(profile)); } catch {}
  renderCompatibilityProfile();
}

async function loadCloudProfile() {
  try {
    const auth = await fetch('/api/auth', { credentials:'same-origin', cache:'no-store' });
    if (!auth.ok) return;
    const session = await auth.json();
    if (!session.authenticated) return;
    profile.name = String(session.displayName || profile.name).replace(/^@/,'');
    const response = await fetch('/api/profile', { credentials:'same-origin', cache:'no-store' });
    if (response.ok) {
      const cloud = await response.json();
      profile = {
        ...profile,
        level: Number(cloud.level) || profile.level,
        xp: Number(cloud.xp) || profile.xp,
        wins: Number(cloud.wins) || profile.wins,
      };
    }
    renderCompatibilityProfile();
  } catch {}
}

// The old operations hub is retained only as a compatibility surface. The
// remastered lobby owns navigation, settings, loading, and authentication.
$('#merk-signin')?.addEventListener('click', () => {
  const panel = $('#merk-auth-panel');
  if (panel) panel.hidden = false;
});
$('#merk-deploy')?.addEventListener('click', () => globalThis.merkStartGame?.());
$('#merk-drawer-deploy')?.addEventListener('click', () => globalThis.merkStartGame?.());
document.querySelectorAll('.merk-mode').forEach((button) => button.addEventListener('click', () => {
  profile.mode = button.dataset.mode || profile.mode;
  saveProfile();
}));

addEventListener('merk:settings-changed', (event) => {
  settings = event.detail;
  profile.name = settings.name || profile.name;
  renderCompatibilityProfile();
});

renderCompatibilityProfile();
void loadCloudProfile();

globalThis.merkOfDuty = {
  profile,
  get settings() { return settings; },
  openHub() {
    const lobby = $('#merk-lobby');
    if (lobby) lobby.hidden = false;
  },
  closeHub() {
    const lobby = $('#merk-lobby');
    if (lobby) lobby.hidden = true;
  },
  saveProfile,
};
