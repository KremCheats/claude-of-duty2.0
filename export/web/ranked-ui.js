import { rankForRP } from './ranked.js';
const profileKey = 'merk-ranked-local';
const fallback = { playerId:'guest', rp:0, mmr:1000, wins:0, losses:0, kills:0, deaths:0, assists:0, gamesPlayed:0, rankProtection:1, top_gun:'M27' };
const get = () => { try { return { ...fallback, ...JSON.parse(localStorage.getItem(profileKey) || '{}') }; } catch { return { ...fallback }; } };
const save = x => { try { localStorage.setItem(profileKey, JSON.stringify(x)); } catch {} };
const $ = q => document.querySelector(q);
function render(p) {
  const rank = rankForRP(p.rp);
  const gun = p.top_gun || p.topGun || 'M27';
  const next = rank.next ? `${rank.next.toLocaleString()} RP` : 'GLOBAL LEADERBOARD';
  const values = {
    '#merk-rank-name': rank.name, '#merk-rank-stat-name': rank.name, '#merk-rp-points': `${p.rp.toLocaleString()} RP`,
    '#merk-rank-xp': rank.next ? `${p.rp.toLocaleString()} / ${rank.next.toLocaleString()} RP` : `${p.rp.toLocaleString()} RP · GLOBAL LEADERBOARD`,
    '#merk-rp-next': `NEXT RANK // ${next}`, '#merk-ranked-kills': Number(p.kills || 0).toLocaleString(),
    '#merk-ranked-deaths': Number(p.deaths || 0).toLocaleString(), '#merk-ranked-top-gun': gun,
    '#merk-ranked-record': `${p.wins || 0}–${p.losses || 0}`, '#merk-rank-card': `${rank.name} // ${p.rp.toLocaleString()} RP`,
    '#merk-rank-icon': rank.tier === 'LEGENDARY' ? 'L' : `${rank.tier[0]}${rank.division || ''}`
  };
  for (const [id, value] of Object.entries(values)) { const el = $(id); if (el) el.textContent = value; }
  const bar = $('#merk-rank-progress'); if (bar) bar.style.width = `${Math.round(rank.progress * 100)}%`;
}
async function refresh() {
  let p = get();
  try { const r = await fetch('/api/ranked'); if (r.ok) p = { ...p, ...(await r.json()) }; } catch {}
  save(p); render(p); return p;
}
function showResults(r) {
  const modal = $('#merk-results'); if (!modal) return; const rank = rankForRP(r.rp);
  $('#merk-result-outcome').textContent = r.won ? 'VICTORY' : 'DEFEAT'; $('#merk-result-outcome').classList.toggle('win', r.won);
  $('#merk-result-rp').textContent = `${r.delta >= 0 ? '+' : ''}${r.delta} RP`; $('#merk-result-rank').textContent = `${rank.name} · ${r.rp}${rank.next ? ` / ${rank.next} RP` : ' RP'}`;
  $('#merk-result-progress-bar').style.width = `${Math.round(rank.progress * 100)}%`;
  for (const [id, value] of [['kills',r.kills],['deaths',r.deaths],['assists',r.assists],['objective',r.objective],['performance',r.performanceRating]]) { const el = $(`#merk-result-${id}`); if (el) el.textContent = value; }
  $('#merk-result-xp').textContent = `${r.xp || 420} XP`; modal.hidden = false;
}
async function submitDemoMatch() {
  const p = get(); const body = { matchId:`demo-${Date.now()}`, won:true, kills:18, deaths:7, assists:5, objective:1240, damage:0, performanceRating:86, topGun:'M27' };
  try { const response = await fetch('/api/ranked', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(body) }); if (response.ok) { const updated = await response.json(); await refresh(); showResults({ ...body, ...updated, rp:updated.rp, delta:updated.delta, xp:420 }); return; } } catch {}
  showResults({ ...body, rp:p.rp+28, delta:28, xp:420 });
}
document.addEventListener('DOMContentLoaded', () => { refresh(); $('#merk-results-close')?.addEventListener('click', () => $('#merk-results').hidden = true); $('#merk-ranked-start')?.addEventListener('click', submitDemoMatch); $('#merk-ranked-history')?.addEventListener('click', () => alert('Match history is persistent and updates after every ranked deployment.')); $('#merk-ranked-rewards')?.addEventListener('click', () => alert('Season 01 rewards: Rookie weapon camo, Veteran calling card, Legendary operator badge.')); });
