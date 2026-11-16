// player.js — the player controller: pointer-lock mouse look, WASD movement
// with acceleration and friction (counter-strafe stop), crouch, jump, weapon
// switching, firing with bloom + recoil, reload, buy, plant/defuse channels,
// utility throws. Movement and accuracy numbers come from config.js.

import * as THREE from 'three';
import { WEAPONS, UTILITY, ECONOMY, MOVEMENT, ACCURACY, clamp } from './config.js';
import { moveBody } from './physics.js';
import { fireHitscan, recoilOffset, spreadFor, buildViewmodel } from './weapons.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.isPlayer = true;
    this.name = 'YOU';
    this.team = 'attack';
    this.pos = new THREE.Vector3(0, 0, 20);
    this.vel = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = 0;
    this.hp = 100;
    this.armor = 0;
    this.hasArmor = false;
    this.hasHelmet = false;
    this.money = ECONOMY.start;
    this.dead = false;
    this.crouched = false;
    this.onGround = true;
    this.keys = {};
    this.loadout = [WEAPONS.kestrel, WEAPONS.hinge, WEAPONS.talon];
    this.current = 0;
    this.ammo = { kestrel: 30, bastion: 30, raptor: 30, hinge: 12, anvil: 7, talon: Infinity };
    this.reserve = { kestrel: 120, bastion: 120, raptor: 120, hinge: 60, anvil: 28, talon: Infinity };
    this.utility = { smoke: 1, flash: 1, frag: 0 };
    this.hasKit = false;
    this.bloom = 0;
    this.recoilIndex = 0;
    this.recoilPitch = 0;
    this.recoilYaw = 0;
    this.lastShot = 0;
    this.reloading = false;
    this.reloadUntil = 0;
    this.firing = false;
    this.plantProgress = 0;
    this.defuseProgress = 0;
    this.planting = false;
    this.defusing = false;
    this.viewmodel = null;
    this.viewmodelGroup = null;
    this.lossStreak = 0;
    this.kills = 0;
    this.deaths = 0;
    this.role = 'Entry';
  }

  get weapon() { return this.loadout[this.current]; }
  get speed() { return this.weapon.move; }

  equipViewmodel(scene, camera) {
    if (this.viewmodelGroup) scene.remove(this.viewmodelGroup);
    this.viewmodel = buildViewmodel(this.weapon.id);
    this.viewmodelGroup = new THREE.Group();
    this.viewmodelGroup.add(this.viewmodel);
    this.viewmodelGroup.position.set(0.34, -0.32, -0.62);
    camera.add(this.viewmodelGroup);
    scene.add(camera);
  }

  switchWeapon(i, scene, camera) {
    if (i < 0 || i >= this.loadout.length || i === this.current) return;
    this.current = i;
    this.reloading = false;
    this.recoilIndex = 0;
    this.equipViewmodel(scene, camera);
    this.game.hud.setSlots(this.loadout, this.weapon.id);
    this.game.hud.setAmmo(this.ammo[this.weapon.id], this.reserve[this.weapon.id], this.weapon.name);
  }

  buy(itemId) {
    const g = this.game;
    const price = {
      kestrel: 2700, bastion: 2900, raptor: 1500, anvil: 700,
      armor: 650, helmet: 1000, kit: 400, smoke: 300, flash: 200,
    }[itemId];
    if (price === undefined || this.money < price) return false;
    if (itemId === 'armor') {
      if (this.hasArmor && !this.hasHelmet) { /* already armored */ }
      this.money -= price; this.hasArmor = true; this.armor = 100; return true;
    }
    if (itemId === 'helmet') {
      if (!this.hasArmor) return false;
      this.money -= price; this.hasHelmet = true; this.armor = 100; return true;
    }
    if (itemId === 'kit') { this.money -= price; this.hasKit = true; return true; }
    if (itemId === 'smoke' || itemId === 'flash') {
      if (this.utility[itemId] >= UTILITY[itemId].max) return false;
      this.money -= price; this.utility[itemId]++; return true;
    }
    const w = WEAPONS[itemId];
    if (!w) return false;
    this.money -= price;
    const slot = this.loadout.findIndex((x) => x.slot === w.slot && x.kind !== 'knife');
    if (slot >= 0) this.loadout[slot] = w; else this.loadout.splice(0, 0, w);
    this.ammo[w.id] = w.mag; this.reserve[w.id] = w.mag * w.reserveMags;
    this.current = this.loadout.findIndex((x) => x.id === w.id);
    this.equipViewmodel(g.scene, g.camera);
    return true;
  }

  updateMove(dt, colliders, bounds) {
    const k = this.keys;
    const walk = k['ShiftLeft'] || k['ShiftRight'];
    const crouch = k['KeyC'];
    this.crouched = !!crouch;
    const w = this.weapon;
    let maxSpeed = w.move * (walk ? MOVEMENT.walkMult : 1) * (crouch ? MOVEMENT.crouchMult : 1);
    const fwd = (k['KeyW'] ? 1 : 0) - (k['KeyS'] ? 1 : 0);
    const strafe = (k['KeyD'] ? 1 : 0) - (k['KeyA'] ? 1 : 0);
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
    let mx = (-sin * fwd + cos * strafe);
    let mz = (-cos * fwd - sin * strafe);
    const len = Math.hypot(mx, mz);
    if (len > 0) { mx /= len; mz /= len; }
    const accel = this.onGround ? MOVEMENT.accel : MOVEMENT.airAccel;
    this.vel.x += mx * accel * dt;
    this.vel.z += mz * accel * dt;
    if (this.onGround) {
      const f = Math.max(0, 1 - MOVEMENT.friction * dt);
      if (len === 0) { this.vel.x *= f; this.vel.z *= f; }
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (sp > maxSpeed) { this.vel.x *= maxSpeed / sp; this.vel.z *= maxSpeed / sp; }
    }
    if (k['Space'] && this.onGround) {
      this.vel.y = MOVEMENT.jumpSpeed;
      this.onGround = false;
    }
    this.vel.y -= MOVEMENT.gravity * dt;
    const r = moveBody(this.pos, this.vel, dt, colliders, MOVEMENT.radius,
      this.crouched ? MOVEMENT.crouchHeight : MOVEMENT.height, bounds);
    this.onGround = r.onGround;
    const speed = Math.hypot(this.vel.x, this.vel.z);
    this.game.audio.step(this.onGround ? speed : 0);
    return speed;
  }

  updateFire(dt, now) {
    const w = this.weapon;
    const interval = 60 / w.rpm;
    const rec = this.crouched ? w.recoveryCrouch : w.recovery;
    if (now - this.lastShot > rec * 1000) { this.bloom = 0; this.recoilIndex = 0; }
    else this.bloom = Math.max(0, this.bloom - dt * 0.02);
    this.recoilPitch *= Math.max(0, 1 - dt * 7);
    this.recoilYaw *= Math.max(0, 1 - dt * 7);
    if (this.reloading) {
      if (now >= this.reloadUntil) {
        this.reloading = false;
        const need = w.mag - this.ammo[w.id];
        const take = Math.min(need, this.reserve[w.id]);
        this.ammo[w.id] += take; this.reserve[w.id] -= take;
        this.game.hud.setAmmo(this.ammo[w.id], this.reserve[w.id], w.name);
      }
      return;
    }
    if (!this.firing || this.planting || this.defusing) return;
    if (now - this.lastShot < interval * 1000) return;
    if (this.ammo[w.id] <= 0) { this.startReload(); return; }
    if (w.melee) { this.swingKnife(); return; }
    this.lastShot = now;
    this.ammo[w.id]--;
    const speed = Math.hypot(this.vel.x, this.vel.z);
    const spread = spreadFor(w, speed, w.move, this.crouched, !this.onGround, this.bloom);
    const dir = new THREE.Vector3(
      -Math.sin(this.yaw + this.recoilYaw) * Math.cos(this.pitch + this.recoilPitch) + (Math.random() - 0.5) * spread * 2,
      Math.sin(this.pitch + this.recoilPitch) + (Math.random() - 0.5) * spread * 2,
      -Math.cos(this.yaw + this.recoilYaw) * Math.cos(this.pitch + this.recoilPitch) + (Math.random() - 0.5) * spread * 2,
    ).normalize();
    const shooter = { pos: this.pos, crouched: this.crouched, weapon: w, team: this.team };
    const res = fireHitscan(shooter, dir, this.game.world, this.game.actors, this.game.fx);
    const muzzlePos = this.pos.clone(); muzzlePos.y += 1.5;
    this.game.fx.muzzle(muzzlePos);
    this.game.audio.shot(w.id, 0);
    this.game.telemetry.shotFired();
    this.bloom = Math.min(ACCURACY.maxBloom, this.bloom + ACCURACY.bloomPerShot);
    const kick = recoilOffset(w, this.recoilIndex++);
    this.recoilPitch += kick.pitch;
    this.recoilYaw += kick.yaw;
    this.pitch = clamp(this.pitch + kick.pitch * 0.35, -1.45, 1.45);
    if (this.viewmodelGroup) {
      this.viewmodelGroup.position.z = -0.62 + 0.06; // kickback
      setTimeout(() => { if (this.viewmodelGroup) this.viewmodelGroup.position.z = -0.62; }, 60);
    }
    if (res.hit && res.actor) this.game.onHit(res.actor, res, this);
    this.game.hud.setAmmo(this.ammo[w.id], this.reserve[w.id], w.name);
    this.game.hud.setCrosshair(6 + this.bloom * 900 + speed * 1.4);
  }

  swingKnife() {
    const now = performance.now();
    this.lastShot = now;
    const dir = new THREE.Vector3(-Math.sin(this.yaw), 0.1, -Math.cos(this.yaw)).normalize();
    const shooter = { pos: this.pos, crouched: this.crouched, weapon: WEAPONS.talon, team: this.team };
    const res = fireHitscan(shooter, dir, this.game.world, this.game.actors, this.game.fx);
    this.game.telemetry.shotFired();
    if (res.hit && res.actor) this.game.onHit(res.actor, res, this);
  }

  startReload() {
    const w = this.weapon;
    if (this.reloading || w.melee || this.reserve[w.id] <= 0 || this.ammo[w.id] === w.mag) return;
    this.reloading = true;
    this.reloadUntil = performance.now() + 2400;
    this.game.audio.reload();
  }

  throwUtility(kind) {
    if (this.utility[kind] <= 0) return;
    this.utility[kind]--;
    this.game.telemetry.utility();
    const origin = this.pos.clone(); origin.y += 1.5;
    const dir = new THREE.Vector3(-Math.sin(this.yaw), 0.15, -Math.cos(this.yaw)).normalize();
    const landing = origin.clone().addScaledVector(dir, 9);
    landing.y = 0.1;
    if (kind === 'smoke') this.game.spawnSmoke(landing);
    if (kind === 'flash') this.game.spawnFlash(landing);
    this.game.hud.setUtility(this.utility);
  }

  respawn(spawn, team) {
    this.pos.set(spawn[0], 0, spawn[1]);
    this.vel.set(0, 0, 0);
    this.hp = 100;
    this.dead = false;
    this.team = team;
    this.yaw = team === 'attack' ? Math.PI : 0;
    this.pitch = 0;
    this.planting = false; this.defusing = false;
    this.plantProgress = 0; this.defuseProgress = 0;
  }
}
