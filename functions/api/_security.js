const SESSION_COOKIE = 'merk_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const MAX_BODY_BYTES = 32 * 1024;

const encoder = new TextEncoder();
const hex = bytes => [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
const base64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromBase64 = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));

export const json = (body, status = 200, extraHeaders = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders },
});

export const noStore = { 'cache-control': 'no-store' };

export function parseCookies(request) {
  return Object.fromEntries((request.headers.get('cookie') || '').split(';').map(part => {
    const index = part.indexOf('=');
    return index < 0 ? ['', ''] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }).filter(([key]) => key));
}

export function cookieHeader(token, maxAge = SESSION_TTL_SECONDS) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export async function sha256(value) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256);
  return `pbkdf2-sha256$120000$${base64(salt)}$${base64(bits)}`;
}

export async function verifyPassword(password, stored) {
  try {
    const [algorithm, iterationsText, saltText, expectedText] = String(stored || '').split('$');
    const iterations = Number(iterationsText);
    if (algorithm !== 'pbkdf2-sha256' || iterations < 100000 || iterations > 1000000) return false;
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: fromBase64(saltText), iterations, hash: 'SHA-256' }, key, 256);
    const actual = new Uint8Array(bits);
    const expected = fromBase64(expectedText);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let i = 0; i < actual.length; i += 1) difference |= actual[i] ^ expected[i];
    return difference === 0;
  } catch {
    return false;
  }
}

export async function createSession(db, accountId) {
  const token = crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const tokenHash = await sha256(token);
  await db.prepare('INSERT INTO sessions (session_id, account_id, token_hash, expires_at) VALUES (?, ?, ?, datetime(\'now\', \'+30 days\'))').bind(crypto.randomUUID(), accountId, tokenHash).run();
  return token;
}

export async function getSession(request, env) {
  if (!env.MERK_DB) return null;
  const token = parseCookies(request)[SESSION_COOKIE];
  if (!token || token.length > 128) return null;
  const tokenHash = await sha256(token);
  return env.MERK_DB.prepare(`SELECT s.session_id, s.account_id, a.email, a.display_name
    FROM sessions s JOIN accounts a ON a.account_id = s.account_id
    WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP`).bind(tokenHash).first();
}

export async function requireSession(request, env) {
  const session = await getSession(request, env);
  return session ? { ok: true, session } : { ok: false, response: json({ error: 'authentication required' }, 401, noStore) };
}

export function requireSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(request.url).origin; } catch { return false; }
}

export async function readJson(request) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BODY_BYTES) throw new Error('body_too_large');
  const text = await request.text();
  if (encoder.encode(text).byteLength > MAX_BODY_BYTES) throw new Error('body_too_large');
  if (!text) throw new Error('invalid_json');
  return JSON.parse(text);
}

export const stringField = (value, name, { min = 1, max = 128, pattern = null } = {}) => {
  if (typeof value !== 'string') throw new Error(`invalid_${name}`);
  const result = value.trim();
  if (result.length < min || result.length > max || (pattern && !pattern.test(result))) throw new Error(`invalid_${name}`);
  return result;
};

export const finiteInt = (value, name, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`invalid_${name}`);
  return value;
};

export function validationError(error) {
  return json({ error: error?.message?.startsWith('invalid_') || error?.message === 'body_too_large' ? error.message : 'invalid_request' }, 400, noStore);
}

export { SESSION_COOKIE, SESSION_TTL_SECONDS };

// Kept for a one-release migration from the old unsalted SHA-256 format.
export async function legacyPasswordHash(password) {
  return hex(await crypto.subtle.digest('SHA-256', encoder.encode(`${password}::merk-of-duty-v1`)));
}

export function isLegacyHash(value) { return /^[a-f0-9]{64}$/.test(String(value || '')); }

export async function deleteSession(request, env) {
  const token = parseCookies(request)[SESSION_COOKIE];
  if (token && env.MERK_DB) await env.MERK_DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256(token)).run();
}

export const clearedCookieHeader = cookieHeader('', 0);
export const authCookieHeader = token => cookieHeader(token);
export const displayNamePattern = /^[A-Za-z0-9 _-]+$/;
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const allowedMaps = new Set(['hijacked', 'mp_hijacked', 'nuketown', 'mp_nuketown_2020']);
export const allowedModes = new Set(['tdm', 'ffa', 'ranked', 'zombies']);

export function validateProfile(body) {
  const displayName = stringField(body.display_name, 'display_name', { max: 24, pattern: displayNamePattern });
  const level = finiteInt(body.level, 'level', { min: 1, max: 1000 });
  const xp = finiteInt(body.xp, 'xp', { max: 1000000000 });
  const wins = finiteInt(body.wins, 'wins', { max: 10000000 });
  if (!body.profile_json || typeof body.profile_json !== 'object' || Array.isArray(body.profile_json)) throw new Error('invalid_profile_json');
  return { displayName, level, xp, wins, profileJson: JSON.stringify(body.profile_json) };
}

export function validateLobby(body) {
  const hostName = stringField(body.host_name || 'OPERATIVE', 'host_name', { max: 24, pattern: displayNamePattern });
  const mode = stringField(body.mode || 'tdm', 'mode', { max: 16 });
  const mapId = stringField(body.map_id || 'hijacked', 'map_id', { max: 32 });
  if (!allowedModes.has(mode) || !allowedMaps.has(mapId)) throw new Error('invalid_mode_or_map');
  const maxPlayers = finiteInt(body.max_players ?? 10, 'max_players', { min: 2, max: 20 });
  if (typeof body.is_private !== 'boolean' && body.is_private !== undefined) throw new Error('invalid_is_private');
  return { hostName, mode, mapId, maxPlayers, isPrivate: body.is_private === true ? 1 : 0 };
}

export function validateRankedMatch(body) {
  const matchId = stringField(body.matchId, 'match_id', { min: 8, max: 128, pattern: /^[A-Za-z0-9._:-]+$/ });
  if (typeof body.won !== 'boolean') throw new Error('invalid_won');
  const kills = finiteInt(body.kills, 'kills', { max: 100 });
  const deaths = finiteInt(body.deaths, 'deaths', { max: 100 });
  const assists = finiteInt(body.assists, 'assists', { max: 100 });
  const objective = finiteInt(body.objective, 'objective', { max: 100000 });
  const damage = finiteInt(body.damage, 'damage', { max: 100000 });
  const performanceRating = body.performanceRating === undefined ? undefined : finiteInt(body.performanceRating, 'performance_rating', { min: 0, max: 100 });
  const opponentMmr = body.opponentMmr === undefined ? undefined : finiteInt(body.opponentMmr, 'opponent_mmr', { min: 100, max: 5000 });
  const topGun = body.topGun === undefined ? undefined : stringField(body.topGun, 'top_gun', { max: 32, pattern: /^[A-Za-z0-9 _-]+$/ });
  return { matchId, won: body.won, kills, deaths, assists, objective, damage, performanceRating, opponentMmr, topGun };
}

export function validateAuth(body) {
  const action = stringField(body.action, 'action', { max: 16 });
  if (action === 'logout') return { action, email: '', password: '', displayName: null };
  const email = stringField(body.email, 'email', { max: 254 }).toLowerCase();
  if (!emailPattern.test(email)) throw new Error('invalid_email');
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 12 || password.length > 256) throw new Error('invalid_password');
  const displayName = action === 'signup' ? stringField(body.displayName, 'display_name', { max: 18, pattern: displayNamePattern }).replace(/^@/, '') : null;
  if (!['signup', 'login', 'logout'].includes(action)) throw new Error('invalid_action');
  return { action, email, password, displayName };
}

export function rejectMethod(request, allowed) {
  return allowed.includes(request.method) ? null : json({ error: 'method not allowed' }, 405, { allow: allowed.join(', '), ...noStore });
}

export async function cleanupExpiredSessions(db) {
  await db.prepare("DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP").run();
}

export function requestHeaders() { return { ...noStore, 'x-content-type-options': 'nosniff' }; }
