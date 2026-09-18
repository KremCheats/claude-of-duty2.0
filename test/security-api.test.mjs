import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPassword, verifyPassword, validateAuth, validateLobby,
  validateProfile, validateRankedMatch, cookieHeader,
} from '../functions/api/_security.js';

test('password hashes are salted PBKDF2 values and verify correctly', async () => {
  const first = await hashPassword('correct horse battery staple');
  const second = await hashPassword('correct horse battery staple');
  assert.match(first, /^pbkdf2-sha256\$120000\$/);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('correct horse battery staple', first), true);
  assert.equal(await verifyPassword('wrong password', first), false);
});

test('authentication validation requires strong passwords and valid email', () => {
  assert.equal(validateAuth({ action: 'logout' }).action, 'logout');
  assert.throws(() => validateAuth({ action: 'login', email: 'bad', password: 'short' }), /invalid_email/);
  assert.throws(() => validateAuth({ action: 'login', email: 'a@example.com', password: 'short' }), /invalid_password/);
  assert.equal(validateAuth({ action: 'signup', email: 'a@example.com', password: 'long enough password', displayName: 'Operative-1' }).displayName, 'Operative-1');
});

test('profile and lobby validators reject forged or oversized state', () => {
  assert.throws(() => validateProfile({ display_name: 'A', level: 1, xp: -1, wins: 0, profile_json: {} }), /invalid_xp/);
  assert.throws(() => validateProfile({ display_name: 'A', level: 1, xp: 0, wins: 0, profile_json: [] }), /invalid_profile_json/);
  assert.throws(() => validateLobby({ mode: 'admin', map_id: 'hijacked', max_players: 10 }), /invalid_mode_or_map/);
  assert.throws(() => validateLobby({ mode: 'tdm', map_id: 'hijacked', max_players: 100 }), /invalid_max_players/);
});

test('ranked validator requires server-safe primitive fields', () => {
  const valid = validateRankedMatch({ matchId: 'match-123456', won: true, kills: 10, deaths: 2, assists: 3, objective: 50, damage: 1200 });
  assert.equal(valid.kills, 10);
  assert.throws(() => validateRankedMatch({ matchId: 'x', won: true, kills: 0, deaths: 0, assists: 0, objective: 0, damage: 0 }), /invalid_match_id/);
  assert.throws(() => validateRankedMatch({ matchId: 'match-123456', won: 'yes', kills: 0, deaths: 0, assists: 0, objective: 0, damage: 0 }), /invalid_won/);
  assert.throws(() => validateRankedMatch({ matchId: 'match-123456', won: true, kills: 101, deaths: 0, assists: 0, objective: 0, damage: 0 }), /invalid_kills/);
});

test('session cookie is HttpOnly, Secure, SameSite=Lax, and path scoped', () => {
  const header = cookieHeader('token');
  assert.match(header, /^merk_session=token;/);
  assert.match(header, /HttpOnly/);
  assert.match(header, /Secure/);
  assert.match(header, /SameSite=Lax/);
  assert.match(header, /Path=\//);
});
