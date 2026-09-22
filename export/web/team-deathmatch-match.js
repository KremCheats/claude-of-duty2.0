const safeName = (value, fallback) => String(value ?? fallback).trim() || fallback;
const safeTeam = (value) => value === 'allies' || value === 'axis' ? value : 'axis';

export class TeamDeathmatchMatch {
  constructor({ scoreLimit = 50, timeLimitSeconds = 600, feedLimit = 6 } = {}) {
    this.scoreLimit = Math.max(1, Math.trunc(Number(scoreLimit) || 50));
    this.timeLimitSeconds = Math.max(1, Number(timeLimitSeconds) || 600);
    this.feedLimit = Math.max(1, Math.trunc(Number(feedLimit) || 6));
    this.combatants = new Map();
    this.reset();
  }

  register(id, name = id, { human = false, team = 'axis' } = {}) {
    const key = String(id);
    const previous = this.combatants.get(key);
    const entry = previous ?? { id: key, kills: 0, deaths: 0, streak: 0, score: 0 };
    entry.name = safeName(name, key);
    entry.human = Boolean(human);
    entry.team = safeTeam(team);
    this.combatants.set(key, entry);
    return entry;
  }

  reset() {
    this.phase = 'playing';
    this.elapsedSeconds = 0;
    this.winnerId = null;
    this.winnerTeam = null;
    this.feed = [];
    this.teamScores = { allies: 0, axis: 0 };
    for (const entry of this.combatants?.values?.() ?? []) {
      entry.kills = 0;
      entry.deaths = 0;
      entry.streak = 0;
      entry.score = 0;
    }
    return this.getState();
  }

  update(deltaSeconds) {
    if (this.phase !== 'playing') return;
    const dt = Math.max(0, Math.min(Number(deltaSeconds) || 0, 0.25));
    this.elapsedSeconds = Math.min(this.timeLimitSeconds, this.elapsedSeconds + dt);
    if (this.elapsedSeconds >= this.timeLimitSeconds) this.finish();
  }

  recordKill(killerId, victimId, detail = null) {
    if (this.phase !== 'playing') return null;
    const killer = this.combatants.get(String(killerId));
    const victim = this.combatants.get(String(victimId));
    if (!victim) return null;

    victim.deaths += 1;
    victim.streak = 0;
    const credited = killer && killer !== victim;
    const enemyKill = credited && killer.team !== victim.team;
    if (enemyKill) {
      killer.kills += 1;
      killer.streak += 1;
      killer.score += 100;
      this.teamScores[killer.team] += 1;
    } else if (credited) {
      killer.score = Math.max(0, killer.score - 100);
    }

    const event = {
      killerId: credited ? killer.id : null,
      killer: credited ? killer.name : 'The environment',
      killerTeam: credited ? killer.team : null,
      victimId: victim.id,
      victim: victim.name,
      victimTeam: victim.team,
      friendly: Boolean(credited && !enemyKill),
      at: this.elapsedSeconds,
      ...(detail && typeof detail === 'object' ? detail : {}),
    };
    this.feed.unshift(event);
    this.feed.length = Math.min(this.feed.length, this.feedLimit);

    if (enemyKill && this.teamScores[killer.team] >= this.scoreLimit) this.finish(killer.team);
    return event;
  }

  finish(team = null) {
    if (this.phase === 'ended') return this.winnerTeam;
    this.phase = 'ended';
    const chosen = team && Object.hasOwn(this.teamScores, team)
      ? team
      : this.teamScores.allies === this.teamScores.axis
        ? null
        : this.teamScores.allies > this.teamScores.axis ? 'allies' : 'axis';
    this.winnerTeam = chosen;
    const winner = chosen
      ? this.standings.find((entry) => entry.team === chosen)
      : this.standings[0];
    this.winnerId = winner?.id ?? null;
    return this.winnerTeam;
  }

  get standings() {
    return [...this.combatants.values()].sort((a, b) =>
      (a.team === 'allies' ? 0 : 1) - (b.team === 'allies' ? 0 : 1) ||
      b.score - a.score || b.kills - a.kills || a.deaths - b.deaths ||
      Number(b.human) - Number(a.human) || a.name.localeCompare(b.name));
  }

  get remainingSeconds() {
    return Math.max(0, this.timeLimitSeconds - this.elapsedSeconds);
  }

  getState() {
    const withinTeamPlace = { allies: 0, axis: 0 };
    const standings = this.standings.map((entry) => ({
      id: entry.id,
      name: entry.name,
      human: entry.human,
      team: entry.team,
      score: entry.score,
      kills: entry.kills,
      deaths: entry.deaths,
      streak: entry.streak,
      place: ++withinTeamPlace[entry.team],
    }));
    return {
      mode: 'tdm',
      phase: this.phase,
      scoreLimit: this.scoreLimit,
      timeLimitSeconds: this.timeLimitSeconds,
      elapsedSeconds: Math.round(this.elapsedSeconds * 1000) / 1000,
      remainingSeconds: Math.ceil(this.remainingSeconds),
      winnerId: this.winnerId,
      winnerTeam: this.winnerTeam,
      teamScores: { ...this.teamScores },
      standings,
      feed: this.feed.map((event) => ({ ...event })),
    };
  }
}

export default TeamDeathmatchMatch;
