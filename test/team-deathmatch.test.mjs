import test from 'node:test';
import assert from 'node:assert/strict';
import { TeamDeathmatchMatch } from '../export/web/team-deathmatch-match.js';

function match(scoreLimit = 3) {
  const value = new TeamDeathmatchMatch({ scoreLimit, timeLimitSeconds: 60 });
  value.register('player', 'YOU', { human:true, team:'allies' });
  value.register('ally', 'ALLY', { team:'allies' });
  value.register('enemy-a', 'ENEMY A', { team:'axis' });
  value.register('enemy-b', 'ENEMY B', { team:'axis' });
  return value;
}

test('enemy kills add exactly one point to the killer team', () => {
  const value = match();
  value.recordKill('player', 'enemy-a');
  value.recordKill('enemy-b', 'ally');
  const state = value.getState();
  assert.deepEqual(state.teamScores, { allies:1, axis:1 });
  assert.equal(state.standings.find(x => x.id === 'player').score, 100);
  assert.equal(state.standings.find(x => x.id === 'enemy-b').kills, 1);
});

test('friendly kills never increase team score and apply a score penalty', () => {
  const value = match();
  value.recordKill('player', 'enemy-a');
  const event = value.recordKill('player', 'ally');
  const state = value.getState();
  assert.equal(event.friendly, true);
  assert.deepEqual(state.teamScores, { allies:1, axis:0 });
  assert.equal(state.standings.find(x => x.id === 'player').score, 0);
});

test('score limit ends TDM for the scoring team', () => {
  const value = match(2);
  value.recordKill('player', 'enemy-a');
  value.recordKill('ally', 'enemy-b');
  const state = value.getState();
  assert.equal(state.phase, 'ended');
  assert.equal(state.winnerTeam, 'allies');
  assert.equal(state.teamScores.allies, 2);
});

test('time limit resolves by team score and permits a draw', () => {
  const winning = match();
  winning.recordKill('enemy-a', 'player');
  winning.update(60);
  assert.equal(winning.getState().winnerTeam, 'axis');

  const draw = match();
  draw.update(60);
  assert.equal(draw.getState().winnerTeam, null);
});

test('reset preserves roster but clears match and team state', () => {
  const value = match();
  value.recordKill('player', 'enemy-a');
  value.reset();
  const state = value.getState();
  assert.equal(state.phase, 'playing');
  assert.deepEqual(state.teamScores, { allies:0, axis:0 });
  assert.equal(state.standings.length, 4);
  assert.ok(state.standings.every(entry => entry.kills === 0 && entry.deaths === 0 && entry.score === 0));
});
