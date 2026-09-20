import { getSession, json, noStore, requestHeaders } from './_security.js';

export async function onRequestGet({ request, env }) {
  if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'websocket upgrade required' }, 426, noStore);
  if (!env.MATCH_ROOM) return json({ error: 'match service unavailable' }, 503, requestHeaders());
  const source = new URL(request.url);
  const mode = source.searchParams.get('mode') === 'ranked' ? 'ranked' : 'normal';
  const session = await getSession(request, env);
  if (mode === 'ranked' && !session) return json({ error: 'ranked matchmaking requires an account' }, 401, noStore);
  if (session) {
    source.searchParams.set('playerId', session.account_id);
    source.searchParams.set('name', session.display_name);
  }
  const id = env.MATCH_ROOM.idFromName('global-matchmaking');
  return env.MATCH_ROOM.get(id).fetch(new Request(source, { method: 'GET', headers: request.headers }));
}
