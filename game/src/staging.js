// staging.js — ?shot= staging for screenshots, the ?soak=1 logic test, boot.
// Staging places actors deterministically and re-emits tracers/muzzle flashes
// on an interval so a mid-fight frame is caught at any instant. The soak drives
// full rounds (kills, a bot plant, a detonation, score progression) through the
// real step() loop and reports to window.__SOAK__.

import * as THREE from 'three';
import { Game } from './main.js';
import { WEAPONS, ECONOMY } from './config.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot') || '';
const SOAK = params.get('soak') === '1';

function placeBot(game, bot, x, z, yaw) {
  bot.pos.set(x, 0, z); bot.yaw = yaw; bot.dead = false;
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
        g.fx.muzzle(from);
        if (Math.random() < 0.5) g.fx.impact(to, 'flesh', false);
      }, 110);
    };
    if (mode === 'cover') fight({ player: [1.5, 10], yaw: -0.2, enemies: [[-5, -3], [1, -5], [6, -4]], mate: [-2, 6], smoke: [4, -5] });
    else if (mode === 'killhouse') fight({ player: [0, 8], yaw: 0, enemies: [[-6, -1], [4, -3], [-2, -6]], mate: [-2.5, 9], smoke: [3, -2] });
    else if (mode === 'buy') {
      g.player.money = 4350;
      g.startRound();
      g.hud.setVitals(100, 0, false, 4350);
      g.hud.showBuy(4350, g.player.loadout, (id) => { g.player.buy(id); }, () => {});
    } else if (mode === 'aar') {
      g.score = { attack: 9, defend: 4 };
      g.hud.setTopBar(13, 9, 4, 'aar');
      g.hud.setTimer(0, 'aar');
      const t = g.telemetry;
      t.shots = 120; t.hits = 54; t.kills = 8; t.headshotKills = 4;
      t.damageDealt = 1240; t.damageTaken = 860; t.utilityUsed = 3;
      t.enemiesBlinded = 2; t.smokeDenials = 2; t.clearTime = 412;
      t.rounds = Array.from({ length: 13 }, (_, i) => ({ win: i < 9, reason: 'elimination', seconds: 52 + (i % 5) * 6 }));
      g.showAAR();
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
    const begin = () => { this.beginLive(); }; // later rounds are auto-started by the end phase
    const parkAttackers = (except) => { // keep every living attacker far from the site
      for (const a of this.actors) {
        if (a.team !== 'attack' || a.dead || a.isPlayer || a === except) continue;
        a.pos.set(-4, 0, 22); a.route = []; a.routeIdx = 0; a.hp = 9999; // test-only: combat cannot end the round
      }
      this.player.pos.set(4, 0, 22); this.player.hp = 9999;
    };
    try {
      this.startRound(); this.beginLive();
      for (const e of this.enemies) {
        this.onHit(e, { hit: true, hitgroup: 'chest', distance: 5, health: 200, armorDrain: 0, killed: true, headshot: false }, this.player);
      }
      log.push(['round1-elimination', this.phase, this.score.attack, this.score.defend]);
      stepUntil(() => this.phase === 'buy', 2000); // auto-advance to round 2 buy
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
    } catch (err) { errors.push('EXCEPTION ' + err.message); }
    window.__SOAK__ = { log, errors, done: true };
    console.log('SOAK ' + JSON.stringify({ log, errors }));
  };
}

installStaging(Game);
const game = new Game();
window.__GAME__ = game;
if (SOAK) setTimeout(() => game.runSoak(), 300);
