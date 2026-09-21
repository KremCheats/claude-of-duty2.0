import { json, requestHeaders } from './_security.js';

export async function onRequestGet({ env }) {
  const database = env.MERK_DB ?? null;
  const checks = { database: Boolean(database), counter: false, lobbies: false };
  if (database) {
    try {
      await database.prepare('SELECT players, plays FROM play_totals WHERE id = 1').first();
      checks.counter = true;
    } catch {
      checks.counter = false;
    }
    try {
      await database.prepare("SELECT COUNT(*) AS open_lobbies FROM lobbies WHERE status = 'open'").first();
      checks.lobbies = true;
    } catch {
      checks.lobbies = false;
    }
  }
  const ok = Object.values(checks).every(Boolean);
  return json({ ok, service: 'merk-of-duty', checks, timestamp: new Date().toISOString() }, ok ? 200 : 503, requestHeaders());
}

export function onRequest({ request, env }) {
  if (request.method === 'GET') return onRequestGet({ env });
  return json({ error: 'method not allowed' }, 405, requestHeaders());
}
