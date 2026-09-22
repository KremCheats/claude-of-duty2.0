import { rankForRP } from './ranked.js';

const profileKey = 'merk-ranked-local';
const fallback = {
  playerId:'guest', rp:0, mmr:1000, wins:0, losses:0, kills:0, deaths:0,
  assists:0, gamesPlayed:0, rankProtection:1, top_gun:'M27',
};
const getLocal = () => {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(profileKey) || '{}') }; }
  catch { return { ...fallback }; }
};
const saveLocal = (value) => { try { localStorage.setItem(profileKey, JSON.stringify(value)); } catch {} };
const $ = (selector) => document.querySelector(selector);

function setStatus(message) {
  const out = $('#merk-match-summary') || $('#merk-rank-card');
  if (out) out.textContent = message;
}

function render(profile) {
  const rank = rankForRP(profile.rp);
  const gun = profile.top_gun || profile.topGun || 'M27';
  const next = rank.next ? `${rank.next.toLocaleString()} RP` : 'GLOBAL LEADERBOARD';
  const values = {
    '#merk-rank-name': rank.name,
    '#merk-rank-stat-name': rank.name,
    '#merk-rp-points': `${profile.rp.toLocaleString()} RP`,
    '#merk-rank-xp': rank.next
      ? `${profile.rp.toLocaleString()} / ${rank.next.toLocaleString()} RP`
      : `${profile.rp.toLocaleString()} RP · GLOBAL LEADERBOARD`,
    '#merk-rp-next': `NEXT RANK // ${next}`,
    '#merk-ranked-kills': Number(profile.kills || 0).toLocaleString(),
    '#merk-ranked-deaths': Number(profile.deaths || 0).toLocaleString(),
    '#merk-ranked-top-gun': gun,
    '#merk-ranked-record': `${profile.wins || 0}–${profile.losses || 0}`,
    '#merk-rank-card': `${rank.name} // ${profile.rp.toLocaleString()} RP`,
    '#merk-rank-icon': rank.tier === 'LEGENDARY' ? 'L' : `${rank.tier[0]}${rank.division || ''}`,
  };
  for (const [selector, value] of Object.entries(values)) {
    const element = $(selector);
    if (element) element.textContent = value;
  }
  const bar = $('#merk-rank-progress');
  if (bar) bar.style.width = `${Math.round(rank.progress * 100)}%`;
}

async function refresh() {
  let profile = getLocal();
  try {
    const response = await fetch('/api/ranked', { credentials:'same-origin', cache:'no-store' });
    if (response.ok) {
      profile = { ...profile, ...(await response.json()) };
      saveLocal(profile);
    }
  } catch {}
  render(profile);
  return profile;
}

async function startRanked() {
  try {
    const response = await fetch('/api/auth', { credentials:'same-origin', cache:'no-store' });
    const session = response.ok ? await response.json() : null;
    if (!session?.authenticated) {
      const panel = $('#merk-auth-panel');
      if (panel) panel.hidden = false;
      setStatus('SIGN IN REQUIRED // RANKED MATCHMAKING');
      return false;
    }
  } catch {
    setStatus('RANKED SERVICE UNAVAILABLE');
    return false;
  }
  const url = new URL(location.href);
  url.searchParams.set('mode', 'ranked');
  url.searchParams.set('autostart', '1');
  location.assign(url);
  return true;
}

document.addEventListener('DOMContentLoaded', () => {
  void refresh();
  $('#merk-results-close')?.addEventListener('click', () => { $('#merk-results').hidden = true; });
  $('#merk-ranked-start')?.addEventListener('click', () => void startRanked());
  $('#merk-ranked-history')?.addEventListener('click', () => setStatus('MATCH HISTORY // AVAILABLE AFTER VERIFIED RANKED MATCHES'));
  $('#merk-ranked-rewards')?.addEventListener('click', () => setStatus('SEASON REWARDS // TRACKED BY YOUR VERIFIED RANK'));
});
