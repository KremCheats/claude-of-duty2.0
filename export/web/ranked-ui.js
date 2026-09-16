import { rankForRP } from './ranked.js';
const profileKey = 'merk-ranked-local';
const fallback = { playerId:'guest', rp:742, mmr:1260, wins:18, losses:7, kills:320, deaths:140, assists:95, gamesPlayed:25, rankProtection:1 };
const get = () => { try { return { ...fallback, ...JSON.parse(localStorage.getItem(profileKey) || '{}') }; } catch { return { ...fallback }; } };
const save = x => { try { localStorage.setItem(profileKey, JSON.stringify(x)); } catch {} };
const $ = q => document.querySelector(q);
async function refresh() {
  let p = get();
  try { const r = await fetch(`/api/ranked?playerId=${encodeURIComponent(p.playerId)}`); if (r.ok) p = { ...p, ...(await r.json()) }; } catch {}
  save(p); const rank = rankForRP(p.rp); const name = $('#merk-rank-name'), icon = $('#merk-rank-icon'), xp = $('#merk-rank-xp'), bar = $('#merk-rank-progress');
  if (name) name.textContent = rank.name; if (icon) icon.textContent = rank.tier === 'LEGENDARY' ? 'L' : `${rank.tier[0]}${rank.division || ''}`;
  if (xp) xp.textContent = rank.next ? `${p.rp.toLocaleString()} / ${rank.next.toLocaleString()} RP` : `${p.rp.toLocaleString()} RP · GLOBAL LEADERBOARD`;
  if (bar) bar.style.width = `${Math.round(rank.progress * 100)}%`; return p;
}
function showResults(r) {
  const modal = $('#merk-results'); if (!modal) return; const rank = rankForRP(r.rp);
  $('#merk-result-outcome').textContent = r.won ? 'VICTORY' : 'DEFEAT'; $('#merk-result-outcome').classList.toggle('win', r.won);
  $('#merk-result-rp').textContent = `${r.delta >= 0 ? '+' : ''}${r.delta} RP`; $('#merk-result-rank').textContent = `${rank.name} · ${r.rp}${rank.next ? ` / ${rank.next} RP` : ' RP'}`;
  $('#merk-result-progress-bar').style.width = `${Math.round(rank.progress * 100)}%`;
  for (const [id, value] of [['kills',r.kills],['deaths',r.deaths],['assists',r.assists],['objective',r.objective],['performance',r.performanceRating]]) { const el = $(`#merk-result-${id}`); if (el) el.textContent = value; }
  $('#merk-result-xp').textContent = `${r.xp || 420} XP`; modal.hidden = false;
}
document.addEventListener('DOMContentLoaded', () => { refresh(); $('#merk-results-close')?.addEventListener('click', () => $('#merk-results').hidden = true); $('#merk-ranked-start')?.addEventListener('click', () => { const p = get(); showResults({ won:true, delta:28, rp:p.rp+28, kills:18, deaths:7, assists:5, objective:1240, performanceRating:86, xp:420 }); }); $('#merk-ranked-history')?.addEventListener('click', () => alert('Match history is server-backed and will populate after your first ranked match.')); $('#merk-ranked-rewards')?.addEventListener('click', () => alert('Season 01 rewards: Rookie weapon camo, Veteran calling card, Legendary operator badge.')); });
