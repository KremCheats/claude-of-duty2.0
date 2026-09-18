import {
  json, noStore, readJson, rejectMethod, requireSameOrigin, requireSession,
  requestHeaders, validateLobby, validationError,
} from './_security.js';

export async function onRequestGet({ request, env }) {
  const methodError = rejectMethod(request, ['GET']);
  if (methodError) return methodError;
  if (!env.MERK_DB) return json({ error: 'lobby service unavailable' }, 503, requestHeaders());
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  try {
    const result = await env.MERK_DB.prepare(`SELECT lobby_id, host_name, mode, map_id, max_players,
      current_players, is_private FROM lobbies WHERE status = 'open' ORDER BY created_at DESC LIMIT 50`).all();
    return json(result.results || [], 200, requestHeaders());
  } catch {
    return json({ error: 'lobby service unavailable' }, 503, requestHeaders());
  }
}

export async function onRequestPost({ request, env }) {
  const methodError = rejectMethod(request, ['POST']);
  if (methodError) return methodError;
  if (!requireSameOrigin(request)) return json({ error: 'cross-origin' }, 403, noStore);
  if (!env.MERK_DB) return json({ error: 'lobby service unavailable' }, 503, requestHeaders());
  const auth = await requireSession(request, env);
  if (!auth.ok) return auth.response;
  let body;
  try { body = await readJson(request); } catch (error) { return validationError(error); }
  let input;
  try { input = validateLobby(body); } catch (error) { return validationError(error); }
  try {
    const id = crypto.randomUUID();
    await env.MERK_DB.prepare(`INSERT INTO lobbies
      (lobby_id, host_name, mode, map_id, max_players, current_players, is_private, status)
      VALUES (?, ?, ?, ?, ?, 1, ?, 'open')`).bind(id, input.hostName, input.mode, input.mapId, input.maxPlayers, input.isPrivate).run();
    return json({ ok: true, lobby_id: id }, 201, requestHeaders());
  } catch {
    return json({ error: 'lobby service unavailable' }, 503, requestHeaders());
  }
}
