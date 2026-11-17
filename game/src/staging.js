// staging.js — ?shot= staging, ?soak=1 test.

import * as THREE from 'three';
import { Game } from './main.js';
import { WEAPONS, ECONOMY } from './config.js';
import { WAVE_TABLE } from './laststand.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot') || '';
const SOAK = params.get('soak') === '1';

function placeBot(game, bot, x, z, yaw) {
  bot.pos.set(x, 0, z); bot.yaw = yaw; bot.dead = false;
  bot.route = []; bot.holdPos = new THREE.Vector3(x, 0, z);
  if (bot.mesh) { bot.mesh.visible = true; bot.mesh.position.copy(bot.pos); bot.mesh.rotation.y = yaw; }
}

export function installStaging(GameClass) {
  GameClass.prototype.stageShot = function stageShot(mode) {
    const g = this;
    g.hud.el.deploy.classList.remove('show');
    if (mode === 'killhouse') g.buildMap('killhouse');
    const fight = (pos) => {
      g.round = 7; g.score = { attack: 5, defend: 2 };
      g.phase = 'live'; g.phaseTime = 87;
      g.telemetry.startRound();
      g.player.money = 4350;
      g.player.respawn(pos.player, 'attack');
      g.player.yaw = pos.yaw;
      g.player.loadout = [WEAPONS.kestrel, WEAPONS.hinge, WEAPONS.talon];
      g.player.current = 0;
      g.player.ammo.kestrel = 24; g.player.reserve.kestrel = 90;
      g.player.equipViewmodel(g.scene, g.camera);
      g.hud.setTopBar(7, 5, 2, 'live');
      g.hud.setTimer(87, 'live');
      g.hud.setPlan('EXECUTE A', 'Entry');
      g.hud.setVitals(100, 50, true, 4350);
      g.hud.setAmmo(24, 90, 'Kestrel-7');
      g.hud.setSlots(g.player.loadout, 'kestrel');
      g.hud.setUtility(g.player.utility);
      const enemies = g.enemies.slice(0, 3);
      pos.enemies.forEach((p, i) => placeBot(g, enemies[i], p[0], p[1], Math.PI));
      placeBot(g, g.teammates[0], pos.mate[0], pos.mate[1], 0);
      g.teammates.slice(1).forEach((b) => { if (b.mesh) b.mesh.visible = false; });
      g.enemies.slice(3).forEach((b) => { if (b.mesh) b.mesh.visible = false; });
      g.spawnSmoke(new THREE.Vector3(pos.smoke[0], 0.1, pos.smoke[1]));
      let feedN = 0;
      const feed = () => {
        feedN++;
        if (feedN % 2 === 1) g.hud.killfeed('Ember', 'attack', 'Kestrel-7 ✕', 'Anchor', 'defend', true);
        else g.hud.killfeed('Cinder', 'attack', 'Raptor-9', 'Tide', 'defend', false);
        g.hud.radio('Cinder', 'Support', 'Contact Mid — hostile in sight', { x: pos.smoke[0], z: pos.smoke[1] });
      };
      feed();
      setInterval(feed, 4000);
      setInterval(() => {
        const b = enemies[Math.floor(Math.random() * enemies.length)];
        const from = b.eyePos().clone(); from.y -= 0.15;
        const to = g.camera.position.clone();
        to.x += (Math.random() - 0.5) * 1.6; to.y += (Math.random() - 0.5) * 0.8; to.z += (Math.random() - 0.5) * 1.6;
        g.fx.tracer(from, to, 'defend');
        g.fx.muzzle(from, new THREE.Vector3().subVectors(to, from).normalize());
        if (Math.random() < 0.5) g.fx.impact(to, 'flesh', false);
      }, 110);
    };
    if (mode === 'cover') fight({ player: [1.5, 10], yaw: -0.2, enemies: [[-5, -3], [1, -5], [6, -4]], mate: [-2, 6], smoke: [4, -5] });
    else if (mode === 'killhouse') fight({ player: [0, 8], yaw: 0, enemies: [[-6, -1], [2, -4], [-2, -6]], mate: [-2.5, 9], smoke: [9, -3] });
    else if (mode === 'aar') {
      g.score = { attack: 9, defend: 4 };
      g.hud.setTopBar(13, 9, 4, 'aar');
      g.hud.setTimer(0, 'aar');
      const t = g.telemetry;
      t.shots = 120; t.hits = 54; t.kills = 8; t.headshotKills = 4;
      t.damageDealt = 1240; t.damageTaken = 860; t.utilityUsed = 3;
      t.enemiesBlinded = 2; t.smokeDenials = 2; t.clearTime = 412;
      t.rounds = Array.from({ length: 13 }, (_, i) => ({ win: i < 9, reason: 'elimination', seconds: 52 + (i % 5) * 6 }));
      g.showAAR();
    } else if (mode === 'lscover') {
      g.startLastStand();
      g.ls.fsm.reset('buy');
      g.ls.startWave(7);
      g.ls.coreHp = 640;
      g.teammates.forEach((b) => { b.hp = 9999; });
      const boss = g.ls.boss;
      boss.hp = 495;
      placeBot(g, boss, 28, -12, Math.PI);
      const esc = g.ls.foes.filter((b) => b !== boss);
      const spots = [[27, -14], [33, -13], [31, -11], [24, -12]];
      esc.forEach((b, i) => placeBot(g, b, spots[i][0], spots[i][1], Math.PI));
      placeBot(g, g.teammates[0], 31, -9, 0);
      g.teammates.slice(1).forEach((b) => { if (b.mesh) b.mesh.visible = false; });
      g.player.pos.set(30, 0, -6); g.player.yaw = 0; g.player.pitch = -0.04;
      g.player.loadout = [WEAPONS.kestrel, WEAPONS.hinge, WEAPONS.talon];
      g.player.current = 0;
      g.player.ammo.kestrel = 24; g.player.reserve.kestrel = 90;
      g.player.equipViewmodel(g.scene, g.camera);
      g.hud.setLS(7, 640); g.hud.setBoss(495, 900);
      g.hud.setVitals(100, 50, true, 4350);
      g.hud.setAmmo(24, 90, 'Kestrel-7');
      g.hud.setSlots(g.player.loadout, 'kestrel');
      g.hud.setUtility(g.player.utility);
      g.spawnSmoke(new THREE.Vector3(24, 0.1, -11));
      g.hud.killfeed('Ember', 'defend', 'Bastion-4 ✕', 'Bulwark', 'attack', true);
      g.hud.radio('Cinder', 'Support', 'Warden on the floor — focus fire!', { x: 28, z: -12 });
      setInterval(() => {
        const b = esc[Math.floor(Math.random() * esc.length)] || boss;
        const from = b.eyePos().clone(); from.y -= 0.15;
        const to = g.camera.position.clone();
        to.x += (Math.random() - 0.5) * 1.6; to.y += (Math.random() - 0.5) * 0.8; to.z += (Math.random() - 0.5) * 1.6;
        g.fx.tracer(from, to, 'attack');
        g.fx.muzzle(from, new THREE.Vector3().subVectors(to, from).normalize());
        if (Math.random() < 0.5) g.fx.impact(to, 'flesh', false);
      }, 110);
    } else if (mode === 'lsaar') {
      g.startLastStand();
      g.ls.fsm.reset('buy');
      g.ls.startWave(7);
      g.ls.coreHp = 640;
      g.hud.setCore(640);
      const t = g.telemetry;
      t.shots = 210; t.hits = 96; t.kills = 14; t.headshotKills = 6;
      t.damageDealt = 2310; t.damageTaken = 940; t.utilityUsed = 4;
      t.enemiesBlinded = 3; t.smokeDenials = 2; t.clearTime = 486;
      t.rounds = Array.from({ length: 7 }, (_, i) => ({ win: true, reason: 'wave-clear', seconds: 64 + i * 4 }));
      g.onHit(g.ls.boss, { hit: true, hitgroup: 'chest', distance: 5, health: 999, armorDrain: 0, killed: true, headshot: false }, g.player);
    } else g.showDeploy();
  };

  GameClass.prototype.runSoak = function runSoak() {
    const log = [], errors = [];
    addEventListener('error', (e) => errors.push(String(e.message)));
    const stepN = (n) => { for (let i = 0; i < n; i++) this.step(1 / 60); };
    const stepUntil = (cond, cap) => {
      for (let i = 0; i < cap; i++) { this.step(1 / 60); if (cond()) return true; }
      return false;
    };
    const begin = () => { this.beginLive(); };
    const parkAttackers = (except) => {
      for (const a of this.actors) {
        if (a.team !== 'attack' || a.dead || a.isPlayer || a === except) continue;
        a.pos.set(-4, 0, 22); a.route = []; a.routeIdx = 0; a.hp = 9999;
      }
      this.player.pos.set(4, 0, 22); this.player.hp = 9999;
    };
    try {
      this.startRound(); this.beginLive();
      for (const e of this.enemies) {
        this.onHit(e, { hit: true, hitgroup: 'chest', distance: 5, health: 200, armorDrain: 0, killed: true, headshot: false }, this.player);
      }
      log.push(['round1-elimination', this.phase, this.score.attack, this.score.defend]);
      stepUntil(() => this.phase === 'buy', 2000);
      begin();
      const carrier = this.bots.find((b) => b.isCarrier);
      const site = this.mapDef.sites.A;
      carrier.pos.set(site.x, 0, site.z);
      this.plantCharge('A', carrier);
      log.push(['round2-planted', this.phase, this.planted, this.chargeSite]);
      carrier.hp = 9999; carrier.route = [[site.x, site.z]]; carrier.routeIdx = 0;
      parkAttackers(carrier);
      const detonated = stepUntil(() => this.phase === 'end' && this.telemetry.rounds.at(-1)?.reason === 'detonation', 3000);
      log.push(['round2-detonated', detonated, this.score.attack, this.score.defend]);
      stepUntil(() => this.phase === 'buy', 2000);
      begin();
      const c2 = this.bots.find((b) => b.isCarrier && !b.dead);
      if (c2) { c2.pos.set(site.x, 0, site.z); this.plantCharge('A', c2); }
      parkAttackers();
      const defused = stepUntil(() => this.phase === 'end' && this.telemetry.rounds.at(-1)?.reason === 'defuse', 3000);
      log.push(['round3-defuse', defused, this.score.attack, this.score.defend]);
      const fails = this.damageChecks.filter((c) => !c.pass);
      log.push(['damage-sanity', (this.damageChecks.length - fails.length) + '/' + this.damageChecks.length]);
      log.push(['money-after-rounds', this.player.money]);
      log.push(['rounds-played', this.round]);
      const ls = this.startLastStand();
      log.push(['ls-table', WAVE_TABLE.length, WAVE_TABLE[6].boss, WAVE_TABLE[6].bossHp, ls.wave, ls.foes.length, ls.coreHp, ls.fsm.state]);
      const e0 = ls.foes[0];
      e0.pos.set(30, 0, -15);
      stepN(120);
      log.push(['ls-core-damage', ls.coreHp < 1000, Math.round(ls.coreHp)]);
      for (const e of [...ls.foes]) {
        this.onHit(e, { hit: true, hitgroup: 'chest', distance: 5, health: 999, armorDrain: 0, killed: true, headshot: false }, this.player);
      }
      const bought = stepUntil(() => this.phase === 'lsBuy', 600);
      log.push(['ls-wave-clear', bought, this.phase, ls.fsm.state]);
      stepUntil(() => this.phase === 'lsWave' && ls.wave === 2, 1500);
      log.push(['ls-wave2', ls.wave, ls.foes.length, ls.fsm.state]);
      ls.fsm.reset('buy');
      ls.startWave(7);
      log.push(['ls-boss', ls.boss ? ls.boss.hp : -1, WAVE_TABLE[6].bossHp, ls.fsm.state]);
      this.onHit(ls.boss, { hit: true, hitgroup: 'chest', distance: 5, health: 999, armorDrain: 0, killed: true, headshot: false }, this.player);
      const won = stepUntil(() => this.phase === 'aar', 600);
      log.push(['ls-victory', won, this.phase, ls.fsm.state]);
      const ls2 = this.startLastStand();
      ls2.coreHp = 0;
      stepN(5);
      log.push(['ls-defeat', this.phase, ls2.fsm.state]);
    } catch (err) { errors.push('EXCEPTION ' + err.message); }
    window.__SOAK__ = { log, errors, done: true };
    console.log('SOAK ' + JSON.stringify({ log, errors }));
  };
}

installStaging(Game);
const game = new Game();
window.__GAME__ = game;
if (SOAK) setTimeout(() => game.runSoak(), 300);
