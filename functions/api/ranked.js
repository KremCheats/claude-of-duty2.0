import { calculateRP, rankForRP, updateMMR } from '../../export/web/ranked.js';
import {
  json, noStore, readJson, rejectMethod, requireSameOrigin, requireSession,
  requestHeaders, validateRankedMatch, validationError,
} from './_security.js';

const emptyRanked = accountId => ({ player_id: accountId, season_number: 1, rp: 0, mmr: 1000, wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0, games_played: 0, rank_protection: 1, top_gun: 'M27' });

export async function onRequestGet({ request, env }) {
  const methodError = rejectMethod(request, ['GET']);
  if (methodError) return methodError;
  if (!env.MERK_DB) return json({ error: 'ranked service unavailable' }, 503, requestHeaders());
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  try {
    const row = await env.MERK_DB.prepare('SELECT * FROM ranked_players WHERE player_id = ? AND season_number = 1').bind(auth.session.account_id).first();
    return json(row || emptyRanked(auth.session.account_id), 200, requestHeaders());
  } catch {
    return json({ error: 'ranked service unavailable' }, 503, requestHeaders());
  }
}

export async function onRequestPost({ request, env }) {
  const methodError = rejectMethod(request, ['POST']);
  if (methodError) return methodError;
  if (!requireSameOrigin(request)) return json({ error: 'cross-origin' }, 403, noStore);
  if (!env.MERK_DB) return json({ error: 'ranked service unavailable' }, 503, requestHeaders());
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  let body;
  try { body = await readJson(request); } catch (error) { return validationError(error); }
  let input;
  try { input = validateRankedMatch(body); } catch (error) { return validationError(error); }
  try {
    const duplicate = await env.MERK_DB.prepare('SELECT match_id FROM ranked_match_history WHERE match_id = ?').bind(input.matchId).first();
    if (duplicate) return json({ ok: false, error: 'duplicate_match_reward' }, 409, requestHeaders());
    const prior = await env.MERK_DB.prepare('SELECT * FROM ranked_players WHERE player_id = ? AND season_number = 1').bind(auth.session.account_id).first() || emptyRanked(auth.session.account_id);
    const calc = calculateRP({ ...input, currentRp: prior.rp, mmr: prior.mmr, opponentMmr: input.opponentMmr || prior.mmr });
    let delta = calc.rp;
    if (delta < 0 && prior.rank_protection > 0 && prior.rp >= 300) delta = 0;
    const rp = Math.max(0, prior.rp + delta);
    const mmr = updateMMR({ mmr: prior.mmr, won: input.won, performanceRating: calc.performanceRating, opponentMmr: input.opponentMmr || prior.mmr });
    const protection = delta === 0 && calc.rp < 0 ? Math.max(0, prior.rank_protection - 1) : prior.rank_protection;
    const topGun = input.topGun || prior.top_gun || 'M27';
    await env.MERK_DB.prepare(`INSERT INTO ranked_players
      (player_id, season_number, rp, mmr, wins, losses, kills, deaths, assists, games_played, rank_protection, top_gun)
      VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(player_id, season_number) DO UPDATE SET rp=excluded.rp, mmr=excluded.mmr,
      wins=excluded.wins, losses=excluded.losses, kills=excluded.kills, deaths=excluded.deaths,
      assists=excluded.assists, games_played=excluded.games_played, rank_protection=excluded.rank_protection,
      top_gun=excluded.top_gun`).bind(auth.session.account_id, rp, mmr, prior.wins + (input.won ? 1 : 0), prior.losses + (input.won ? 0 : 1), prior.kills + input.kills, prior.deaths + input.deaths, prior.assists + input.assists, prior.games_played + 1, protection, topGun).run();
    await env.MERK_DB.prepare(`INSERT INTO ranked_match_history
      (match_id, player_id, season_number, won, rp_change, kills, deaths, assists, objective, performance_rating, created_at)
      VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(input.matchId, auth.session.account_id, input.won ? 1 : 0, delta, input.kills, input.deaths, input.assists, input.objective, input.performanceRating ?? calc.performanceRating).run();
    return json({ ok: true, rp, delta, rank: rankForRP(rp), mmr, rankProtection: protection, performanceRating: calc.performanceRating, topGun }, 200, requestHeaders());
  } catch {
    return json({ error: 'ranked service unavailable' }, 503, requestHeaders());
  }
}
