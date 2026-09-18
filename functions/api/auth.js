import {
  authCookieHeader, clearedCookieHeader, cleanupExpiredSessions, createSession, deleteSession,
  getSession, hashPassword, json, legacyPasswordHash, isLegacyHash, noStore,
  parseCookies, readJson, rejectMethod, requireSameOrigin, requestHeaders, validateAuth,
  verifyPassword, validationError,
} from './_security.js';

export async function onRequestGet({ request, env }) {
  if (!env.MERK_DB) return json({ error: 'account service unavailable' }, 503, requestHeaders());
  const session = await getSession(request, env);
  return session
    ? json({ authenticated: true, accountId: session.account_id, displayName: `@${session.display_name}` }, 200, requestHeaders())
    : json({ authenticated: false }, 200, requestHeaders());
}

export async function onRequestPost({ request, env }) {
  const methodError = rejectMethod(request, ['POST']);
  if (methodError) return methodError;
  if (!requireSameOrigin(request)) return json({ error: 'cross-origin' }, 403, noStore);
  if (!env.MERK_DB) return json({ error: 'account service unavailable' }, 503, requestHeaders());
  let body;
  try { body = await readJson(request); } catch (error) { return validationError(error); }
  let input;
  try { input = validateAuth(body); } catch (error) { return validationError(error); }

  try {
    if (input.action === 'logout') {
      await deleteSession(request, env);
      return json({ ok: true }, 200, { ...requestHeaders(), 'set-cookie': clearedCookieHeader });
    }
    await cleanupExpiredSessions(env.MERK_DB);
    const existing = await env.MERK_DB.prepare('SELECT * FROM accounts WHERE email = ?').bind(input.email).first();
    if (input.action === 'signup') {
      if (existing) return json({ error: 'email already registered' }, 409, requestHeaders());
      const accountId = crypto.randomUUID();
      const passwordHash = await hashPassword(input.password);
      await env.MERK_DB.prepare('INSERT INTO accounts (account_id, email, password_hash, display_name) VALUES (?, ?, ?, ?)').bind(accountId, input.email, passwordHash, input.displayName).run();
      const token = await createSession(env.MERK_DB, accountId);
      return json({ ok: true, accountId, displayName: `@${input.displayName}` }, 201, { ...requestHeaders(), 'set-cookie': authCookieHeader(token) });
    }
    if (!existing) return json({ error: 'invalid email or password' }, 401, requestHeaders());
    let valid = await verifyPassword(input.password, existing.password_hash);
    if (!valid && isLegacyHash(existing.password_hash)) {
      valid = existing.password_hash === await legacyPasswordHash(input.password);
      if (valid) {
        const upgraded = await hashPassword(input.password);
        await env.MERK_DB.prepare('UPDATE accounts SET password_hash = ? WHERE account_id = ?').bind(upgraded, existing.account_id).run();
      }
    }
    if (!valid) return json({ error: 'invalid email or password' }, 401, requestHeaders());
    const token = await createSession(env.MERK_DB, existing.account_id);
    return json({ ok: true, accountId: existing.account_id, displayName: `@${existing.display_name}` }, 200, { ...requestHeaders(), 'set-cookie': authCookieHeader(token) });
  } catch {
    return json({ error: 'auth request failed' }, 500, requestHeaders());
  }
}
