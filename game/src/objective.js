// objective.js — input, the plant/defuse objective and utility throws,
// installed onto the Game prototype. Kept apart from main.js so the
// orchestrator stays small and each module keeps one job:
//   main.js      — boot, loop, rounds, economy
//   objective.js — input binding, E-channel plant/defuse, smoke/flash
//   bots.js      — bot AI and team plans

import * as THREE from 'three';
import { TIMERS, ECONOMY, clamp } from './config.js';

export function installObjective(Game) {
  Game.prototype.bindInput = function bindInput() {
    const c = this.renderer.domElement;
    addEventListener('keydown', (e) => {
      this.player.keys[e.code] = true;
      if (e.code === 'KeyR') this.player.startReload();
      if (e.code === 'Digit1') this.player.switchWeapon(0, this.scene, this.camera);
      if (e.code === 'Digit2') this.player.switchWeapon(1, this.scene, this.camera);
      if (e.code === 'Digit3') this.player.switchWeapon(2, this.scene, this.camera);
      if (e.code === 'Digit4') this.player.switchWeapon(3, this.scene, this.camera);
      if (e.code === 'KeyQ') this.player.throwUtility('smoke');
      if (e.code === 'KeyG') this.player.throwUtility('flash');
      if (e.code === 'KeyF') this.player.throwUtility('frag');
      if (e.code === 'KeyB' && (this.phase === 'buy' || this.phase === 'live')) {
        if (this.hud.el.buy.classList.contains('show')) this.hud.hideBuy();
        else this.hud.showBuy(this.player.money, this.player.loadout, (id) => { this.player.buy(id); }, () => {});
      }
      if (e.code === 'KeyM' && this.phase === 'end') {
        this.mapId = this.mapId === 'foundry' ? 'killhouse' : 'foundry';
        this.buildMap(this.mapId); this.spawnTeams(); this.showDeploy();
      }
      if (e.code === 'Tab') { e.preventDefault(); this.updateScoreboard(true); }
      if (e.code === 'KeyE') this.tryInteract(true);
    });
    addEventListener('keyup', (e) => {
      this.player.keys[e.code] = false;
      if (e.code === 'Tab') this.hud.hideScoreboard();
      if (e.code === 'KeyE') this.tryInteract(false);
    });
    addEventListener('mousedown', (e) => {
      if (e.button === 0 && document.pointerLockElement === c) this.player.firing = true;
    });
    addEventListener('mouseup', (e) => { if (e.button === 0) this.player.firing = false; });
    c.addEventListener('click', () => {
      if (this.phase === 'live' || this.phase === 'planted') {
        if (document.pointerLockElement !== c) c.requestPointerLock();
      }
    });
    addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== c) return;
      const s = 0.0022 * this.hud.sensitivity;
      this.player.yaw -= e.movementX * s;
      this.player.pitch = clamp(this.player.pitch - e.movementY * s, -1.45, 1.45);
    });
    document.addEventListener('pointerlockchange', () => {
      this.hud.hint(document.pointerLockElement === c ? '' : 'Click to capture the mouse');
    });
  };

  Game.prototype.tryInteract = function tryInteract(down) {
    const p = this.player;
    if (p.dead || (this.phase !== 'live' && this.phase !== 'planted')) return;
    if (p.team === 'attack' && !this.planted && down) {
      for (const key of ['A', 'B']) {
        const s = this.mapDef.sites[key];
        if (Math.hypot(p.pos.x - s.x, p.pos.z - s.z) < s.r) {
          p.planting = true; p.plantProgress = 0; p.plantSite = key;
          this.hud.hint('Planting the charge — hold still');
          return;
        }
      }
    }
    if (p.team === 'defend' && this.planted && down) {
      const s = this.mapDef.sites[this.chargeSite];
      if (Math.hypot(p.pos.x - s.x, p.pos.z - s.z) < s.r + 1) {
        p.defusing = true; p.defuseProgress = 0;
        this.hud.hint('Defusing — hold still');
        this.radio(this.bots.find((b) => b.team === 'defend') || p, 'Defuse started — cover me');
        this.hud.banner('DEFUSE STARTED', `Site ${this.chargeSite}`);
      }
    }
    if (!down) { p.planting = false; p.defusing = false; }
  };

  Game.prototype.plantCharge = function plantCharge(siteKey, planter) {
    this.planted = true;
    this.chargeSite = siteKey;
    this.phase = 'planted';
    this.chargeTimer = TIMERS.charge;
    this.roundMachine.send('plant', { round: this });
    if (planter) {
      planter.money = Math.min(ECONOMY.cap, (planter.money || 0) + ECONOMY.plantPlanter);
      for (const a of this.actors) if (a.team === 'attack' && a !== planter) a.money = Math.min(ECONOMY.cap, (a.money || 0) + ECONOMY.plantTeam);
    }
    this.hud.banner('CHARGE PLANTED', `Site ${siteKey} — ${TIMERS.charge}s to detonation`);
    this.audio.plantBeep(true);
    this.radio(planter || this.player, `Charge planted at Site ${siteKey}`);
  };

  Game.prototype.updatePlantDefuse = function updatePlantDefuse(dt) {
    const p = this.player;
    if (p.planting && this.phase === 'live') {
      p.plantProgress += dt;
      this.hud.hint(`Planting… ${(p.plantProgress).toFixed(1)}s / ${TIMERS.plant}s`);
      if (p.plantProgress >= TIMERS.plant) {
        p.planting = false;
        this.plantCharge(p.plantSite, p);
      }
    }
    if (p.defusing && this.phase === 'planted') {
      p.defuseProgress += dt;
      const need = p.hasKit ? TIMERS.defuseKit : TIMERS.defuse;
      this.hud.hint(`Defusing… ${(p.defuseProgress).toFixed(1)}s / ${need}s`);
      if (p.defuseProgress >= need) {
        p.defusing = false;
        p.money = Math.min(ECONOMY.cap, p.money + ECONOMY.defuseBonus);
        this.endRound('defend', 'defuse');
      }
    }
    if (this.phase === 'live') {
      const carrier = this.bots.find((b) => b.isCarrier && !b.dead);
      if (carrier) {
        const plan = this.plan;
        const siteKey = plan && plan.route === 'B' ? 'B' : 'A';
        const s = this.mapDef.sites[siteKey];
        if (Math.hypot(carrier.pos.x - s.x, carrier.pos.z - s.z) < s.r) {
          if (carrier.fsm.state !== 'plant') carrier.fsm.send('plantOrder', { bot: carrier });
          carrier.atSite = true;
          carrier.plantT = (carrier.plantT || 0) + dt;
          if (carrier.plantT >= TIMERS.plant) {
            carrier.plantT = 0;
            carrier.fsm.send('planted', { bot: carrier });
            this.plantCharge(siteKey, carrier);
          }
        } else carrier.plantT = 0;
      }
    }
    if (this.phase === 'planted') {
      const site = this.mapDef.sites[this.chargeSite];
      const atkNear = this.actors.some((a) => a.team === 'attack' && !a.dead &&
        Math.hypot(a.pos.x - site.x, a.pos.z - site.z) < 10);
      const defNear = this.bots.some((b) => b.team === 'defend' && !b.dead &&
        Math.hypot(b.pos.x - site.x, b.pos.z - site.z) < site.r + 3); // wall-pressed counts: the enclosure rim is 5.5-7 m out
      if (!atkNear && defNear) {
        this.defuseChannel = (this.defuseChannel || 0) + dt;
        if (this.defuseChannel >= TIMERS.defuse) { this.defuseChannel = 0; this.endRound('defend', 'defuse'); }
      } else this.defuseChannel = 0;
    }
  };

  Game.prototype.spawnSmoke = function spawnSmoke(pos) {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xcfc8bd, transparent: true, opacity: 0.5, depthWrite: false });
    const puffs = [[0, 0, 0, 3.2], [2.4, 0.4, 0.8, 2.2], [-2.2, 0.3, -0.6, 2.4]];
    for (const [x, y, z, r] of puffs) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat);
      s.position.set(x, y, z); s.scale.y = 0.55;
      group.add(s);
    }
    group.position.copy(pos);
    this.scene.add(group);
    this.smokes.push({ pos: pos.clone(), radius: 3.4, alive: true, mesh: group, until: performance.now() + 18000 });
    this.audio.smoke();
  };

  Game.prototype.spawnFlash = function spawnFlash(pos) {
    const eye = new THREE.Vector3(this.player.pos.x, this.player.pos.y + 1.6, this.player.pos.z);
    const dist = eye.distanceTo(pos);
    const facing = this.camera.getWorldDirection(new THREE.Vector3()).dot(
      new THREE.Vector3().subVectors(pos, eye).normalize());
    if (dist < 26 && facing > -0.2) {
      this.hud.flashWhite(clamp(1.2 - dist / 26, 0.25, 1));
      this.audio.flash();
    }
    let blinded = 0;
    for (const b of this.bots) {
      if (b.dead) continue;
      const d = b.pos.distanceTo(pos);
      if (d > 24) continue;
      const toFlash = new THREE.Vector3().subVectors(pos, b.eyePos()).normalize();
      const look = new THREE.Vector3(-Math.sin(b.yaw), 0, -Math.cos(b.yaw));
      if (look.dot(toFlash) > -0.3) {
        b.blindUntil = performance.now() + 2200;
        b.hasLOS = false;
        blinded++;
      }
    }
    if (blinded) this.telemetry.blinded(blinded);
    this.audio.flash();
  };

  Game.prototype.clearSmokes = function clearSmokes() {
    for (const s of this.smokes) this.scene.remove(s.mesh);
    this.smokes = [];
  };
}
