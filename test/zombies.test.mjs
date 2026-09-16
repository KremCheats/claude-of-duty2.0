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
