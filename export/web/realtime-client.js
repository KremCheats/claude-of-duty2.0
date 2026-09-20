import * as THREE from 'three';

function makeRemotePlayer(name, human) {
  const root = new THREE.Group();
  root.name = `remote-player-${name}`;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(15, 38, 4, 8), new THREE.MeshStandardMaterial({ color: human ? 0x2e86c1 : 0x777777, roughness: .9 }));
  body.position.y = 34;
  const head = new THREE.Mesh(new THREE.SphereGeometry(13, 12, 8), new THREE.MeshStandardMaterial({ color: human ? 0xc9946b : 0x8c8c8c, roughness: .95 }));
  head.position.y = 68;
  root.add(body, head);
  root.userData.playerName = name;
  return root;
}

export class RealtimeMatchClient {
  constructor({ scene, mode, onStatus = () => {}, onPlayers = () => {} } = {}) {
    this.scene = scene; this.mode = mode; this.onStatus = onStatus; this.onPlayers = onPlayers;
    this.socket = null; this.roomId = null; this.playerId = null; this.players = new Map(); this.elapsed = 0; this.lastSend = 0;
  }
  connect() {
    if (!['normal', 'ranked'].includes(this.mode) || !('WebSocket' in globalThis)) return false;
    const url = new URL('/api/match', location.href); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'; url.searchParams.set('mode', this.mode);
    this.socket = new WebSocket(url);
    this.socket.addEventListener('open', () => this.onStatus('MATCHMAKING // SEARCHING FOR OPERATIVES'));
    this.socket.addEventListener('message', (event) => this.receive(event.data));
    this.socket.addEventListener('close', () => { this.onStatus('MATCH DISCONNECTED // LOCAL BOTS ACTIVE'); this.socket = null; });
    this.socket.addEventListener('error', () => this.onStatus('MATCH SERVICE UNAVAILABLE // LOCAL BOTS ACTIVE'));
    return true;
  }
  receive(raw) {
    let message; try { message = JSON.parse(raw); } catch { return; }
    if (message.type === 'match_found') { this.roomId = message.roomId; this.playerId = message.playerId; this.onStatus(`MATCH FOUND // ${message.mode.toUpperCase()}`); }
    if (message.type === 'room_state') { this.roomId = message.roomId; this.syncPlayers(message.players || []); this.onStatus(`ONLINE // ${this.humanCount()} OPERATIVES · ${this.botCount()} BOTS`); }
    if (message.type === 'player_state') this.applyState(message.player);
    if (message.type === 'player_left') this.removePlayer(message.playerId);
  }
  syncPlayers(list) { for (const p of list) if (p.id !== this.playerId) this.addOrUpdate(p); this.onPlayers(this.players); }
  addOrUpdate(player) {
    let entry = this.players.get(player.id);
    if (!entry) { entry = { data: player, root: makeRemotePlayer(player.name || player.id, player.human !== false), target: new THREE.Vector3(), yaw: 0 }; this.players.set(player.id, entry); this.scene.add(entry.root); }
    entry.data = { ...entry.data, ...player }; entry.target.set(Number(player.x) || 0, Number(player.y) || 0, Number(player.z) || 0); entry.yaw = Number(player.yaw) || 0;
  }
  applyState(player) { if (player?.id && player.id !== this.playerId) this.addOrUpdate(player); }
  removePlayer(id) { const entry = this.players.get(id); if (!entry) return; this.scene.remove(entry.root); entry.root.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); this.players.delete(id); }
  humanCount() { return [...this.players.values()].filter((p) => p.data.human !== false).length + 1; }
  botCount() { return [...this.players.values()].filter((p) => p.data.bot).length; }
  update(dt, player, camera) {
    for (const entry of this.players.values()) { entry.root.position.lerp(entry.target, Math.min(1, dt * 14)); entry.root.rotation.y += (entry.yaw - entry.root.rotation.y) * Math.min(1, dt * 14); }
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !player || !camera) return;
    this.elapsed += dt; if (this.elapsed - this.lastSend < 0.05) return; this.lastSend = this.elapsed;
    const p = player.position; const payload = { type: 'state', x: p.x, y: p.y, z: p.z, yaw: camera.rotation.y, pitch: camera.rotation.x };
    this.socket.send(JSON.stringify(payload));
  }
  disconnect() { if (this.socket) { try { this.socket.send(JSON.stringify({ type: 'leave' })); } catch {} this.socket.close(); } for (const id of [...this.players.keys()]) this.removePlayer(id); }
}
