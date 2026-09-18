import {
  json, noStore, readJson, rejectMethod, requireSameOrigin, requireSession,
  requestHeaders, validateProfile, validationError,
} from './_security.js';

const guest = accountId => ({ player_id: accountId, display_name: 'OPERATIVE', level: 1, xp: 0, wins: 0, profile_json: '{}' });

export async function onRequestGet({ request, env }) {
  const methodError = rejectMethod(request, ['GET']);
  if (methodError) return methodError;
  if (!env.MERK_DB) return json({ error: 'profile service unavailable' }, 503, requestHeaders());
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  try {
    const row = await env.MERK_DB.prepare('SELECT * FROM player_profiles WHERE player_id = ?').bind(auth.session.account_id).first();
    return json(row || guest(auth.session.account_id), 200, requestHeaders());
  } catch {
    return json({ error: 'profile service unavailable' }, 503, requestHeaders());
  }
}

export async function onRequestPost({ request, env }) {
  const methodError = rejectMethod(request, ['POST']);
  if (methodError) return methodError;
  if (!requireSameOrigin(request)) return json({ error: 'cross-origin' }, 403, noStore);
  if (!env.MERK_DB) return json({ error: 'profile service unavailable' }, 503, requestHeaders());
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  let body;
  try { body = await readJson(request); } catch (error) { return validationError(error); }
  let input;
  try { input = validateProfile(body); } catch (error) { return validationError(error); }
  try {
    await env.MERK_DB.prepare(`INSERT INTO player_profiles (player_id, display_name, level, xp, wins, profile_json)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(player_id) DO UPDATE SET display_name=excluded.display_name, level=excluded.level,
      xp=excluded.xp, wins=excluded.wins, profile_json=excluded.profile_json`)
      .bind(auth.session.account_id, input.displayName, input.level, input.xp, input.wins, input.profileJson).run();
    return json({ ok: true, player_id: auth.session.account_id }, 200, requestHeaders());
  } catch {
    return json({ error: 'profile service unavailable' }, 503, requestHeaders());
  }
}
