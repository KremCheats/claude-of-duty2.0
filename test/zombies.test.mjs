import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';
import { ZombieManager, ZOMBIES_CONFIG } from '../export/web/zombies.js';

test('round manager progressively spawns and scales zombie difficulty', () => {
  const scene=new THREE.Scene(); const player={position:new THREE.Vector3(0,0,0)}; const health={health:100,dead:false};
  const manager=new ZombieManager({scene,player,playerHealth:health,config:{...ZOMBIES_CONFIG,maxActive:8,baseCount:2,countPerRound:1}});
  assert.equal(manager.rounds.round,1); for(let i=0;i<10;i++) manager.update(.2); assert.ok(manager.activeCount>0); const first=manager.active[0].maxHealth; manager.active.forEach(z=>{z.dead=true;z.root.visible=false}); manager.update(.1); manager.update(ZOMBIES_CONFIG.intermission+1); assert.equal(manager.rounds.round,2); manager.update(1); assert.ok(manager.active.some(z=>!z.dead&&z.maxHealth>=first));
});

test('weak-point damage kills zombies and awards headshot points', () => {
  const scene=new THREE.Scene(); const player={position:new THREE.Vector3(0,0,0)}; const health={health:100,dead:false}; const manager=new ZombieManager({scene,player,playerHealth:health,config:{...ZOMBIES_CONFIG,maxActive:2,baseCount:1}}); manager.update(1); const z=manager.active.find(x=>!x.dead); const hit={object:z.hitboxes[1],distance:20}; const result=manager.handlePlayerHit(hit,()=>z.maxHealth); assert.equal(result.killed,true); assert.equal(result.headshot,true); assert.ok(manager.score.points>=ZOMBIES_CONFIG.killPoints+ZOMBIES_CONFIG.headshotPoints);
});

test('every fifth round schedules a dedicated Hellhound wave', () => {
  const scene=new THREE.Scene(); const player={position:new THREE.Vector3(0,0,0)}; const health={health:100,dead:false}; const manager=new ZombieManager({scene,player,playerHealth:health});
  assert.equal(manager.difficulty.forRound(5).hellhound, true);
  assert.equal(manager.difficulty.forRound(5).count, ZOMBIES_CONFIG.hellhoundCount + 1);
  assert.equal(manager.difficulty.forRound(4).hellhound, false);
});

test('Hellhounds use their faster movement and closer attack range', () => {
  const scene=new THREE.Scene(); const player={position:new THREE.Vector3(0,0,0)}; const health={health:100,dead:false}; const manager=new ZombieManager({scene,player,playerHealth:health,config:{...ZOMBIES_CONFIG,maxActive:2,hellhoundCount:1}});
  const stats=manager.difficulty.forRound(5); manager.spawnOne(stats); const h=manager.active.find(x=>!x.dead); assert.equal(h.variant,'hellhound'); assert.equal(h.attackRange,ZOMBIES_CONFIG.hellhoundAttackRange); assert.equal(h.speed,ZOMBIES_CONFIG.hellhoundSpeed);
});

test('ZombieManager exposes a points-backed Mystery Box purchase and HUD state', () => {
  const scene=new THREE.Scene(); const player={position:new THREE.Vector3(0,0,0)}; const health={health:100,dead:false}; const manager=new ZombieManager({scene,player,playerHealth:health});
  manager.score.points=950;
  const result=manager.openMysteryBox();
  assert.equal(result.ok,true);
  assert.equal(manager.score.points,0);
  assert.equal(manager.hudState().lastBoxWeapon,result.weaponId);
  assert.equal(manager.openMysteryBox().reason,'cooldown');
});

test('Mystery Box requires proximity and exposes its world position', () => {
  const scene=new THREE.Scene(); const player={position:new THREE.Vector3(0,0,0)}; const health={health:100,dead:false}; const manager=new ZombieManager({scene,player,playerHealth:health,mysteryBoxPosition:[500,0,0]});
  manager.score.points=950;
  assert.equal(manager.boxRoot.name,'zombies-mystery-box');
  assert.equal(manager.openMysteryBox().reason,'out_of_range');
  player.position.set(500,0,0);
  assert.equal(manager.openMysteryBox().ok,true);
  assert.equal(manager.hudState().boxInRange,true);
});

test('Mystery Box relocates after the configured number of successful draws', () => {
  const scene=new THREE.Scene(); const player={position:new THREE.Vector3(0,0,0)}; const health={health:100,dead:false};
  const manager=new ZombieManager({scene,player,playerHealth:health,hints:{boxPositions:[[0,0,0],[400,0,0]]},config:{...ZOMBIES_CONFIG,mysteryBoxMoveEvery:2}});
  manager.score.points=1900;
  const first=manager.boxPosition.clone(); assert.equal(manager.openMysteryBox().ok,true); manager.mysteryBox.update(3);
  assert.equal(manager.openMysteryBox().ok,true); assert.equal(manager.boxMoveCount,1); assert.notDeepEqual(manager.boxPosition.toArray(),first.toArray());
});

test('Hellhound spawns with dedicated dark materials and glowing eyes', () => {
  const scene=new THREE.Scene(); const player={position:new THREE.Vector3(0,0,0)}; const health={health:100,dead:false};
  const manager=new ZombieManager({scene,player,playerHealth:health});
  manager.spawnOne({hellhound:true,health:260,speed:118,damage:24,attackRange:62});
  const hound=manager.active.at(-1);
  assert.equal(hound.variant,'hellhound');
  assert.equal(hound.hitboxes[0].material.color.getHex(),0x171217);
  assert.equal(hound.hitboxes[1].userData.hellhoundEyes,true);
  assert.equal(hound.hitboxes[1].children.length,3);
});
