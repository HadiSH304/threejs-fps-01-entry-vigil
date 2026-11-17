// bots.js — bot AI on the BOT_TABLE machine.

import * as THREE from 'three';
import { createMachine, BOT_TABLE } from './fsm.js';
import { ROUTES, PLANS } from './maps.js';
import { BOT_NAMES } from './config.js';
import { segmentBlocked } from './physics.js';
import { fireHitscan } from './weapons.js';
import { mulberry32, clamp } from './config.js';

let BOT_ID = 0;

export class Bot {
  constructor(team, index, wave, mapId) {
    this.id = ++BOT_ID;
    this.team = team;
    this.index = index;
    this.wave = wave;
    this.mapId = mapId;
    this.name = BOT_NAMES[team][index % 5];
    this.role = 'Entry';
    this.pos = new THREE.Vector3(0, 0, 0);
    this.yaw = 0;
    this.hp = 100;
    this.armor = 0;
    this.hasArmor = false;
    this.hasHelmet = false;
    this.dead = false;
    this.crouched = false;
    this.weapon = null;
    this.ammo = 30;
    this.isCarrier = false;
    this.hasLOS = false;
    this.heardShot = false;
    this.targetAlive = true;
    this.atSite = false;
    this.target = null;
    this.route = [];
    this.routeIdx = 0;
    this.holdPos = null;
    this.speed = 3.4;
    this.reaction = 0.55 - wave * 0.05;
    this.aimError = Math.max(0.004, 0.02 - wave * 0.002);
    this.burstLeft = 0;
    this.burstTimer = 0;
    this.fireTimer = 0;
    this.strafeDir = 1;
    this.strafeTimer = 0;
    this.seeTimer = 0;
    this.lastKnown = null;
    this.lean = 0;
    this.mesh = null;
    this.nameTag = null;
    this.fsm = createMachine(BOT_TABLE, 'patrol', { bot: this });
    this.rng = mulberry32(1000 + this.id * 77 + wave * 13);
  }

  reset(spawn, role, route, isCarrier, weapon) {
    this.pos.set(spawn[0], 0, spawn[1]);
    this.yaw = this.team === 'attack' ? Math.PI : 0;
    this.hp = 100; this.armor = this.hasArmor ? 50 : 0;
    this.dead = false; this.crouched = false;
    this.role = role; this.route = route || []; this.routeIdx = 0;
    this.isCarrier = !!isCarrier;
    this.weapon = weapon; this.ammo = weapon.mag;
    this.target = null; this.burstLeft = 0; this.fireTimer = 0;
    this.hasLOS = false; this.heardShot = false; this.lastKnown = null;
    this.holdPos = null;
    this.fsm.reset('patrol');
    this.fsm.ctx.bot = this;
    if (this.mesh) { this.mesh.visible = true; this.mesh.position.copy(this.pos); this.setDowned(false); }
  }

  updateVision(game, dt) {
    const enemies = game.actors.filter((a) => a.team !== this.team && !a.dead);
    this.hasLOS = false;
    let nearest = null, nearestD = 42;
    for (const e of enemies) {
      const d = this.pos.distanceTo(e.pos);
      if (d > nearestD) continue;
      const to = new THREE.Vector3().subVectors(e.pos, this.pos);
      const ang = Math.atan2(-to.x, -to.z) - this.yaw;
      const norm = Math.atan2(Math.sin(ang), Math.cos(ang));
      if (Math.abs(norm) > 1.15 && d > 6) continue;
      const eye = this.eyePos();
      const targetEye = new THREE.Vector3(e.pos.x, e.pos.y + 1.4, e.pos.z);
      if (segmentBlocked(eye, targetEye, game.world.colliders)) continue;
      if (game.world.smokeBlocks(eye, targetEye, game.smokes)) continue;
      nearest = e; nearestD = d;
    }
    if (nearest) {
      this.hasLOS = true;
      this.target = nearest;
      this.targetAlive = true;
      this.lastKnown = nearest.pos.clone();
      this.seeTimer += dt;
      if (this.seeTimer > this.reaction && this.fsm.state !== 'engage') {
        this.fsm.send('seeEnemy', { bot: this });
        if (this.fsm.state === 'engage') game.radio(this, `Contact ${game.areaName(this.lastKnown)} — ${nearest.name || 'hostile'} in sight`);
      }
    } else {
      this.seeTimer = 0;
      if (this.fsm.state === 'engage') {
        this.targetAlive = false;
        this.fsm.send('lostEnemy', { bot: this });
      }
    }
  }

  eyePos() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.5, this.pos.z); }

  updateMove(game, dt) {
    if (this.dead) return;
    const state = this.fsm.state;
    let dest = null, speed = this.speed;
    if (state === 'engage' && this.target && !this.target.dead) {
      this.strafeTimer -= dt;
      if (this.strafeTimer <= 0) { this.strafeDir *= -1; this.strafeTimer = 0.7 + this.rng() * 0.9; }
      const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const side = new THREE.Vector3(-fwd.z, 0, fwd.x).multiplyScalar(this.strafeDir);
      dest = this.pos.clone().add(side).addScaledVector(fwd, 0.15);
      this.lean = this.strafeDir * 0.18;
      speed = this.speed * 0.55;
    } else if (state === 'take_cover') {
      dest = this.nearestCover(game);
      speed = this.speed * 1.1;
    } else if (state === 'plant' && this.atSite) {
      dest = null;
    } else if (this.route.length && this.routeIdx < this.route.length) {
      dest = new THREE.Vector3(this.route[this.routeIdx][0], 0, this.route[this.routeIdx][1]);
      if (this.pos.distanceTo(dest) < 1.2) this.routeIdx++;
    } else if (this.holdPos) {
      dest = this.holdPos;
    }
    if (dest) {
      const to = new THREE.Vector3().subVectors(dest, this.pos);
      to.y = 0;
      const dist = to.length();
      if (dist > 0.05) {
        to.multiplyScalar(1 / dist);
        const step = Math.min(dist, speed * dt);
        const before = this.pos.clone();
        const next = this.pos.clone().addScaledVector(to, step);
        if (!game.world.pointBlocked(next.x, 0.9, this.pos.z)) this.pos.x = next.x;
        if (!game.world.pointBlocked(this.pos.x, 0.9, next.z)) this.pos.z = next.z;
        if (this.pos.distanceTo(before) < 0.02 && dist > 1.2) this.stuckT = (this.stuckT || 0) + dt;
        else this.stuckT = 0;
        if ((this.stuckT || 0) > 0.4) {
          this.sideT = 0.9;
          this.sideDir = this.rng() > 0.5 ? 1 : -1;
          this.stuckT = 0;
        }
        const targetYaw = Math.atan2(-to.x, -to.z);
        let dy = targetYaw - this.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        this.yaw += dy * Math.min(1, dt * 8);
      }
    }
    if ((this.sideT || 0) > 0) {
      this.sideT -= dt;
      const fwd = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const side = new THREE.Vector3(-fwd.z, 0, fwd.x).multiplyScalar(this.sideDir || 1);
      const nx = this.pos.x + side.x * this.speed * dt;
      const nz = this.pos.z + side.z * this.speed * dt;
      if (!game.world.pointBlocked(nx, 0.9, this.pos.z)) this.pos.x = nx;
      if (!game.world.pointBlocked(this.pos.x, 0.9, nz)) this.pos.z = nz;
    }
    if (state === 'engage' && this.target && !this.target.dead) {
      const to = new THREE.Vector3().subVectors(this.target.pos, this.pos);
      this.yaw = Math.atan2(-to.x, -to.z);
    }
    if (this.mesh) {
      this.mesh.position.copy(this.pos);
      this.mesh.rotation.y = this.yaw;
      this.mesh.userData.lean = this.lean || 0;
    }
  }

  nearestCover(game) {
    let best = null, bd = Infinity;
    for (const c of game.mapDef.crates) {
      const d = (c.x - this.pos.x) ** 2 + (c.z - this.pos.z) ** 2;
      if (d < bd) { bd = d; best = new THREE.Vector3(c.x, 0, c.z); }
    }
    return best || this.pos.clone();
  }

  updateFire(game, dt) {
    if (this.dead || this.fsm.state !== 'engage' || !this.target || this.target.dead) return;
    this.fireTimer -= dt;
    if (this.burstLeft <= 0) {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        this.burstLeft = 3 + Math.floor(this.rng() * 3) + this.wave;
        this.burstTimer = 0.5 + this.rng() * 0.7;
      } else return;
    }
    const interval = 60 / this.weapon.rpm;
    if (this.fireTimer > 0) return;
    this.fireTimer = interval;
    if (this.ammo <= 0) { this.ammo = this.weapon.mag; return; }
    this.ammo--;
    this.burstLeft--;
    const dir = this.aimDir();
    const shooter = { pos: this.pos, crouched: false, weapon: this.weapon, team: this.team };
    const res = fireHitscan(shooter, dir, game.world, game.actors, game.fx);
    game.audio.shot(this.weapon.id, this.pos.distanceTo(game.player.pos));
    game.telemetry.botShotFired();
    if (res.hit && res.actor) {
      game.onHit(res.actor, res, this);
    }
  }

  aimDir() {
    const t = this.target;
    const aimAt = new THREE.Vector3(t.pos.x, t.pos.y + 1.35, t.pos.z);
    if (this.lastKnown) aimAt.lerp(this.lastKnown.clone().setY(t.pos.y + 1.35), 0.3);
    const dir = new THREE.Vector3().subVectors(aimAt, this.eyePos()).normalize();
    const moving = this.fsm.state === 'engage' ? 0.35 : 1;
    const err = this.aimError * (1 + moving);
    dir.x += (this.rng() - 0.5) * err * 2;
    dir.y += (this.rng() - 0.5) * err * 2;
    dir.z += (this.rng() - 0.5) * err * 2;
    return dir.normalize();
  }

  takeHit(res, attacker, game) {
    if (this.dead) return;
    if (res.killed) {
      this.dead = true;
      this.fsm.send('down', { bot: this });
      this.setDowned(true);
      game.radio(this, `I'm down — ${attacker?.name || 'hostile'} got me`);
      game.onBotDown(this, attacker);
    } else if (this.hp < 40 && this.fsm.state !== 'take_cover' && this.fsm.state !== 'downed') {
      this.fsm.send('lowHp', { bot: this });
      game.radio(this, `Taking heavy fire, falling back — HP ${Math.round(this.hp)}`);
    }
  }

  setDowned(down) {
    if (!this.mesh) return;
    const body = this.mesh.userData.body;
    if (!body) return;
    if (down) {
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.35;
      this.mesh.userData.tag.visible = false;
    } else {
      body.rotation.z = 0;
      body.position.y = 0;
      this.mesh.userData.tag.visible = true;
    }
  }
}

export function buildBotMesh(bot, scene) {
  const teamColor = bot.team === 'attack' ? 0xff7a2a : 0x3fa7ff;
  const g = new THREE.Group();
  const body = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: bot.team === 'attack' ? 0x5a2e16 : 0x1c3a5a, roughness: 0.85 });
  const accent = new THREE.MeshStandardMaterial({ color: teamColor, roughness: 0.6, emissive: teamColor, emissiveIntensity: 0.25 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc9a184, roughness: 0.8 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.36), cloth);
  torso.position.y = 1.15; torso.castShadow = true; body.add(torso);
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.4, 0.42), accent);
  vest.position.y = 1.22; body.add(vest);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.07, 0.38), accent);
  stripe.position.y = 1.52; body.add(stripe);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.3), skin);
  head.position.y = 1.68; head.castShadow = true; body.add(head);
  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.14, 0.36), accent);
  helmet.position.y = 1.86; body.add(helmet);
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.26), cloth);
  legL.position.set(-0.16, 0.38, 0); body.add(legL);
  const legR = legL.clone(); legR.position.x = 0.16; body.add(legR);
  const armGeo = new THREE.BoxGeometry(0.14, 0.14, 0.62);
  const armL = new THREE.Mesh(armGeo, cloth); armL.position.set(-0.2, 1.32, 0.3); body.add(armL);
  const armR = new THREE.Mesh(armGeo, cloth); armR.position.set(0.2, 1.32, 0.3); body.add(armR);
  const gun = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.7), new THREE.MeshStandardMaterial({ color: 0x1c1d20, roughness: 0.5, metalness: 0.6 }));
  barrel.position.z = -0.2; gun.add(barrel);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 0.1), new THREE.MeshStandardMaterial({ color: 0x3a3d42, roughness: 0.5, metalness: 0.6 }));
  mag.position.set(0, -0.12, 0.05); gun.add(mag);
  gun.position.set(0, 1.32, 0.55);
  body.add(gun);
  g.add(body);
  const tag = makeNameTag(bot.name, bot.role, teamColor);
  tag.position.set(0, 2.15 + (bot.index % 3) * 0.18, 0);
  g.add(tag);
  g.userData.body = body;
  g.userData.tag = tag;
  g.userData.gun = gun;
  scene.add(g);
  bot.mesh = g;
  return g;
}

function makeNameTag(name, role, color) {
  const c = document.createElement('canvas');
  c.width = 288; c.height = 72;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(10,10,12,0.82)';
  ctx.fillRect(0, 0, 288, 72);
  ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
  ctx.fillRect(0, 0, 10, 72);
  ctx.fillRect(0, 66, 288, 6);
  ctx.fillStyle = '#f2ead8';
  ctx.font = 'bold 28px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(name, 22, 24);
  ctx.fillStyle = '#b8b0a0';
  ctx.font = '22px monospace';
  ctx.fillText(role, 22, 52);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(1.7, 0.43, 1);
  return sprite;
}

export function assignPlan(bots, team, mapId, rng) {
  const plans = PLANS[team];
  const plan = plans[Math.floor(rng() * plans.length)];
  const assignments = new Map();
  const routes = ROUTES[mapId];
  bots.forEach((bot, i) => {
    let route = [];
    let role = plan.roles[i % plan.roles.length];
    if (team === 'attack') {
      const base = routes[plan.route] || routes.mid;
      route = base.map(([x, z]) => [x + (rng() - 0.5) * 2, z + (rng() - 0.5) * 2]);
      if (plan.id === 'rushMid') route = routes.mid;
    } else {
      const site = plan.site || (i < 2 ? 'A' : 'B');
      const sitePos = { A: [-14, -12], B: [14, -12] }[site];
      const near = sitePos[0] < 0 ? routes.A : routes.B;
      route = [near[near.length - 1], [sitePos[0] + (rng() - 0.5) * 4, sitePos[1] + (rng() - 0.5) * 3]];
      if (plan.id === 'split' && i >= 2) {
        const other = i % 2 ? 'A' : 'B';
        const op = { A: [-14, -12], B: [14, -12] }[other];
        route = [[op[0] + (rng() - 0.5) * 4, op[1] + (rng() - 0.5) * 3]];
      }
    }
    assignments.set(bot, { route, role });
  });
  return { plan, assignments };
}
