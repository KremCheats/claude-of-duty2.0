import { DurableObject } from 'cloudflare:workers';

const MAX_PLAYERS = 8;
const MIN_HUMANS = 2;
const BOT_FILL_DELAY_MS = 8000;
const VALID_MODES = new Set(['normal', 'ranked']);

function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(-100000, Math.min(100000, n)) : fallback;
}

export class MatchRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.env = env;
    this.sessions = new Map();
    this.queue = [];
    this.rooms = new Map();
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment();
      if (!attachment?.playerId) continue;
      this.sessions.set(ws, attachment);
      if (attachment.roomId) {
        if (!this.rooms.has(attachment.roomId)) this.rooms.set(attachment.roomId, new Set());
        this.rooms.get(attachment.roomId).add(ws);
      } else if (attachment.queued) this.queue.push(ws);
    }
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(request) {
    if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'websocket upgrade required' }, 426);
    const url = new URL(request.url);
    const mode = VALID_MODES.has(url.searchParams.get('mode')) ? url.searchParams.get('mode') : 'normal';
    const playerId = url.searchParams.get('playerId')?.slice(0, 80) || crypto.randomUUID();
    const displayName = url.searchParams.get('name')?.slice(0, 24) || `Operative-${playerId.slice(0, 4)}`;
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const attachment = { playerId, displayName, mode, queued: true, roomId: null, human: true, x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(attachment);
    this.sessions.set(server, attachment);
    this.queue.push(server);
    await this.ctx.storage.put('queueAt', Date.now());
    this.tryMatch(mode);
    return new Response(null, { status: 101, webSocket: client });
  }

  tryMatch(mode) {
    const waiting = this.queue.filter((ws) => this.sessions.get(ws)?.mode === mode && this.sessions.get(ws)?.queued && ws.readyState === 1);
    if (waiting.length < MIN_HUMANS) {
      if (waiting.length) this.ctx.storage.setAlarm(Date.now() + BOT_FILL_DELAY_MS);
      return;
    }
    const selected = waiting.slice(0, MAX_PLAYERS);
    this.startRoom(mode, selected, false);
  }

  startRoom(mode, humans, botFill) {
    const roomId = `${mode}-${crypto.randomUUID().slice(0, 8)}`;
    const members = new Set();
    for (const ws of humans) {
      const data = this.sessions.get(ws);
      if (!data) continue;
      data.queued = false; data.roomId = roomId;
      ws.serializeAttachment(data);
      members.add(ws);
      this.send(ws, { type: 'match_found', roomId, mode, playerId: data.playerId, mapId: null, players: [] });
    }
    if (botFill || members.size < MAX_PLAYERS) {
      const botCount = Math.max(0, MAX_PLAYERS - members.size);
      for (let i = 0; i < botCount; i += 1) {
        const bot = { playerId: `bot-${roomId}-${i}`, displayName: `BOT ${String(i + 1).padStart(2, '0')}`, mode, roomId, human: false, bot: true, x: 0, y: 0, z: 0, yaw: 0, pitch: 0 };
        const ws = { readyState: 1, send: () => {}, close: () => {}, serializeAttachment: () => {} };
        this.sessions.set(ws, bot); members.add(ws);
      }
    }
    this.rooms.set(roomId, members);
    this.queue = this.queue.filter((ws) => !members.has(ws));
    this.broadcastRoom(roomId, { type: 'room_state', roomId, mode, players: this.playerList(roomId) });
  }

  async alarm() {
    const waiting = this.queue.filter((ws) => this.sessions.get(ws)?.queued);
    if (!waiting.length) return;
    const byMode = new Map();
    for (const ws of waiting) { const mode = this.sessions.get(ws)?.mode || 'normal'; if (!byMode.has(mode)) byMode.set(mode, []); byMode.get(mode).push(ws); }
    for (const [mode, humans] of byMode) {
      if (humans.length >= MIN_HUMANS) this.startRoom(mode, humans.slice(0, MAX_PLAYERS), false);
      else if (humans.length) this.startRoom(mode, humans, true);
    }
  }

  webSocketMessage(ws, raw) {
    const player = this.sessions.get(ws);
    if (!player) return;
    let message; try { message = JSON.parse(raw); } catch { return this.send(ws, { type: 'error', error: 'invalid message' }); }
    if (message.type === 'state' && player.roomId) {
      player.x = safeNumber(message.x); player.y = safeNumber(message.y); player.z = safeNumber(message.z); player.yaw = safeNumber(message.yaw); player.pitch = safeNumber(message.pitch);
      ws.serializeAttachment(player);
      this.broadcastRoom(player.roomId, { type: 'player_state', player: { id: player.playerId, x: player.x, y: player.y, z: player.z, yaw: player.yaw, pitch: player.pitch } }, ws);
    } else if (message.type === 'fire' && player.roomId) {
      this.broadcastRoom(player.roomId, { type: 'player_fire', playerId: player.playerId, weaponId: String(message.weaponId || '').slice(0, 40) }, ws);
    } else if (message.type === 'leave') this.remove(ws);
  }

  webSocketClose(ws) { this.remove(ws); }
  webSocketError(ws) { this.remove(ws); }

  remove(ws) {
    const player = this.sessions.get(ws);
    if (!player) return;
    this.sessions.delete(ws);
    this.queue = this.queue.filter((entry) => entry !== ws);
    if (player.roomId) {
      const members = this.rooms.get(player.roomId);
      members?.delete(ws);
      this.broadcastRoom(player.roomId, { type: 'player_left', playerId: player.playerId });
      if (!members?.size) this.rooms.delete(player.roomId);
    }
    try { ws.close(1000, 'closed'); } catch {}
  }

  playerList(roomId) {
    const members = this.rooms.get(roomId) || new Set();
    return [...members].map((ws) => { const p = this.sessions.get(ws); return { id: p.playerId, name: p.displayName, human: Boolean(p.human), bot: Boolean(p.bot), x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch }; });
  }

  send(ws, payload) { try { if (ws.readyState === 1) ws.send(JSON.stringify(payload)); } catch {} }
  broadcastRoom(roomId, payload, except = null) { for (const ws of this.rooms.get(roomId) || []) if (ws !== except) this.send(ws, payload); }
}

export default { fetch() { return json({ error: 'match service route not found' }, 404); } };
