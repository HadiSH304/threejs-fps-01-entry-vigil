// laststand.js — LAST STAND mode.

import * as THREE from 'three';
import { Bot, buildBotMesh } from './bots.js';
import { WEAPONS, ECONOMY } from './config.js';
import { createMachine, LS_TABLE } from './fsm.js';

export const WAVE_TABLE = [
  { n: 1, rusher: 2, anchor: 1, bulwark: 0 },
  { n: 2, rusher: 2, anchor: 2, bulwark: 0 },
  { n: 3, rusher: 2, anchor: 2, bulwark: 1 },
  { n: 4, rusher: 3, anchor: 2, bulwark: 1 },
  { n: 5, rusher: 3, anchor: 3, bulwark: 1 },
  { n: 6, rusher: 4, anchor: 3, bulwark: 1 },
  { n: 7, rusher: 0, anchor: 0, bulwark: 4, boss: 1, bossHp: 900 },
];
const TYPES = {
  rusher: [60, 4.6, 0, 'raptor', 0.95],
  anchor: [100, 3.4, 0, 'kestrel', 1],
  bulwark: [220, 2.4, 100, 'bastion', 1.12],
};
const CORE = { x: 30, z: -16, hp: 1000, dps: 12 };
const GATES = [[-10, 23], [0, 24], [10, 23], [-18, 21], [18, 21]];
const HOLDS = [[24, -10], [32, -10], [28, -6]];

export class LastStand {
  constructor(game) {
    this.g = game;
    this.wave = 0;
    this.coreHp = CORE.hp;
    this.foes = [];
    this.boss = null;
    this.fsm = createMachine(LS_TABLE, 'deploy', { ls: this });
    this.buildCore();
  }

  spawnDefender(i) {
    const g = this.g;
    const b = new Bot('defend', i, 1, 'foundry');
    b.weapon = i === 2 ? WEAPONS.raptor : WEAPONS.bastion;
    buildBotMesh(b, g.scene);
    b.pos.set(HOLDS[i][0], 0, HOLDS[i][1]);
    b.holdPos = new THREE.Vector3(HOLDS[i][0], 0, HOLDS[i][1]);
    b.mesh.position.copy(b.pos);
    return b;
  }

  buildCore() {
    const g = this.g;
    const grp = new THREE.Group();
    const orb = new THREE.Mesh(new THREE.SphereGeometry(1.1, 18, 14),
      new THREE.MeshBasicMaterial({ color: 0xff8a1e }));
    orb.position.y = 1.4; grp.add(orb);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.09, 8, 28),
      new THREE.MeshBasicMaterial({ color: 0xffc266 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.15; grp.add(ring);
    const light = new THREE.PointLight(0xff8a1e, 50, 20, 1.8);
    light.position.y = 2; grp.add(light);
    grp.position.set(CORE.x, 0, CORE.z);
    g.scene.add(grp);
    this.core = grp;
    g.world.colliders.push({ minX: 28.7, maxX: 31.3, minZ: -17.3, maxZ: -14.7, minY: 0, maxY: 3 });
  }

  waveDown() {
    return this.foes.length > 0 && this.foes.every((b) => b.dead);
  }

  spawnEnemy(kind, i, n) {
    const g = this.g;
    const t = kind === 'boss'
      ? [WAVE_TABLE[6].bossHp, 2.2, 100, 'bastion', 1.45, 'FOUNDRY WARDEN', 'BOSS']
      : [...TYPES[kind], kind[0].toUpperCase() + kind.slice(1), 'WAVE ' + n];
    const [hp, speed, armor, weapon, scale, name, role] = t;
    const b = new Bot('attack', i, n, 'foundry');
    b.weapon = WEAPONS[weapon];
    b.hp = hp; b.maxHp = hp;
    b.armor = armor; b.hasArmor = armor > 0; b.hasHelmet = kind === 'boss';
    b.speed = speed;
    b.name = name; b.role = role;
    buildBotMesh(b, g.scene);
    b.mesh.scale.setScalar(scale);
    const gate = kind === 'boss' ? [0, 24] : GATES[i % GATES.length];
    b.pos.set(gate[0], 0, gate[1]);
    b.route = [[gate[0] * 0.5, 8], [0, 0], [16, -8], [30, -13]];
    b.holdPos = new THREE.Vector3(30, 0, -13);
    b.mesh.position.copy(b.pos);
    this.foes.push(b);
    if (kind === 'boss') this.boss = b;
  }

  startWave(n) {
    const g = this.g;
    this.wave = n;
    const row = WAVE_TABLE[n - 1];
    for (const b of this.foes) if (b.mesh) g.scene.remove(b.mesh);
    this.foes = [];
    this.boss = null;
    const p = g.player;
    if (p.dead) { p.respawn([26, -6], 'defend'); p.yaw = Math.PI; }
    g.teammates.forEach((b, i) => {
      b.hp = 100;
      if (b.dead) { b.dead = false; if (b.mesh) { b.mesh.visible = true; b.setDowned(false); } }
      b.pos.set(HOLDS[i][0], 0, HOLDS[i][1]);
      b.holdPos = new THREE.Vector3(HOLDS[i][0], 0, HOLDS[i][1]);
      b.route = [];
      if (b.mesh) b.mesh.position.copy(b.pos);
    });
    let i = 0;
    for (const kind of ['rusher', 'anchor', 'bulwark']) {
      for (let k = 0; k < (row[kind] || 0); k++) this.spawnEnemy(kind, i++, n);
    }
    if (row.boss) this.spawnEnemy('boss', i++, n);
    g.actors = [p, ...g.teammates, ...this.foes];
    g.bots = [...g.teammates, ...this.foes];
    this.fsm.send(n === 7 ? 'startBoss' : 'startWave', { ls: this });
    g.phase = 'lsWave';
    g.hud.setLS(n, this.coreHp);
    g.hud.banner(n === 7 ? 'WAVE 7 / 7 — WARDEN' : `WAVE ${n} / 7`,
      n === 7 ? 'Destroy the FOUNDRY WARDEN' : `${this.foes.length} hostiles inbound from the gates`);
    g.telemetry.startRound();
  }

  startBuy() {
    const g = this.g;
    g.phase = 'lsBuy';
    this.phaseTime = 20;
    g.player.money = Math.min(ECONOMY.cap, g.player.money + 500);
    g.hud.setTimer(20, 'buy');
    g.hud.hint('Buy phase — press B to buy, next wave in 20 s');
    g.hud.showBuy(g.player.money, g.player.loadout,
      (id) => { if (g.player.buy(id)) g.hud.showBuy(g.player.money, g.player.loadout, () => {}, () => {}); },
      () => {});
    g.hud.banner('WAVE CLEARED', `Wave ${this.wave} down — +$500, buy phase 20 s`);
  }

  attackCore(dt) {
    const g = this.g;
    let n = 0;
    for (const b of this.foes) {
      if (!b.dead && Math.hypot(b.pos.x - CORE.x, b.pos.z - CORE.z) < 4) n++;
    }
    if (!n) return;
    this.coreHp = Math.max(0, this.coreHp - CORE.dps * n * dt);
    g.hud.setCore(this.coreHp);
    this._fxT = (this._fxT || 0) + dt;
    if (this._fxT > 0.4) {
      this._fxT = 0;
      g.fx.impact(new THREE.Vector3(CORE.x, 1.4, CORE.z), 'flesh', false);
    }
  }

  step(dt) {
    const g = this.g;
    if (g.phase === 'lsBuy') {
      this.phaseTime -= dt;
      g.hud.setTimer(this.phaseTime, 'buy');
      if (this.phaseTime <= 0) { g.hud.hideBuy(); this.startWave(this.wave + 1); }
      return;
    }
    if (g.phase !== 'lsWave') return;
    const p = g.player;
    if (!p.dead) {
      p.updateMove(dt, g.world.colliders, g.mapDef.bounds);
      p.updateFire(dt, performance.now());
    }
    for (const b of g.bots) {
      if (b.dead) continue;
      if (b.blindUntil && performance.now() < b.blindUntil) continue;
      b.updateVision(g, dt);
      b.updateMove(g, dt);
      b.updateFire(g, dt);
    }
    for (const b of g.bots) if (b.mesh) b.mesh.userData.tag.lookAt(g.camera.position);
    this.attackCore(dt);
    if (this.boss && !this.boss.dead) g.hud.setBoss(this.boss.hp, this.boss.maxHp);
    if (this.coreHp <= 0) { this.fsm.send('coreDown', { ls: this }); this.endLS(false); return; }
    if (this.fsm.state === 'boss') {
      if (this.boss && this.boss.dead) { this.fsm.send('bossDown', { ls: this }); this.endLS(true); }
    } else if (this.waveDown()) {
      this.fsm.send('waveClear', { ls: this });
      this.startBuy();
    }
  }

  endLS(won) {
    const g = this.g;
    g.phase = 'aar';
    g.matchOver = true;
    this.fsm.send('showAAR', { ls: this });
    document.exitPointerLock?.();
    g.hud.banner(won ? 'VICTORY — WARDEN DOWN' : 'DEFEAT — THE FURNACE CORE FALLS',
      won ? 'All 7 waves cleared' : `The Core fell on wave ${this.wave}`);
    const extra = `<div class="aarRow"><span>Waves cleared</span><b>${won ? 7 : this.wave - 1} / 7</b></div>`
      + `<div class="aarRow"><span>Furnace Core HP left</span><b>${Math.ceil(this.coreHp)}</b></div>`;
    g.hud.showAAR(g.telemetry.summary(), won,
      () => g.startLastStand(), () => g.restartMatch(false), () => g.startLastStand(), extra);
  }
}

export function installLastStand(Game) {
  Game.prototype.startLastStand = function startLastStand() {
    if (this.ls) this.endLSMode();
    if (this.mapId !== 'foundry') this.buildMap('foundry');
    for (const b of this.bots) if (b.mesh) this.scene.remove(b.mesh);
    this.playerTeam = 'defend';
    this.score = { attack: 0, defend: 0 };
    this.round = 0;
    this.matchOver = false;
    this.telemetry.resetMatch();
    this.ls = new LastStand(this);
    this.teammates = [];
    for (let i = 0; i < 3; i++) this.teammates.push(this.ls.spawnDefender(i));
    this.player.respawn([26, -6], 'defend');
    this.player.yaw = Math.PI;
    this.player.money = ECONOMY.start;
    this.actors = [this.player, ...this.teammates];
    this.bots = [...this.teammates];
    this.hud.setVitals(100, 0, false, ECONOMY.start);
    this.hud.setAmmo(30, 120, 'Kestrel-7');
    this.hud.setSlots(this.player.loadout, 'kestrel');
    this.hud.setUtility(this.player.utility);
    this.ls.startWave(1);
    return this.ls;
  };

  Game.prototype.endLSMode = function endLSMode() {
    const ls = this.ls;
    if (!ls) return;
    if (ls.core) this.scene.remove(ls.core);
    for (const b of [...this.teammates, ...ls.foes]) if (b.mesh) this.scene.remove(b.mesh);
    this.hud.hideLS();
    this.ls = null;
  };
}
