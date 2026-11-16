// config.js — one place for every number the game balances on.
// Weapon figures are CS2 game-file values (see fps-data-reference.md):
// Kestrel-7 = AK-47, Bastion-4 = M4A4, Raptor-9 = MP9, Anvil .50 = Desert Eagle.
// Economy and timers follow the CS2 competitive table in the same reference.

export const TEAMS = {
  attack: { id: 'attack', name: 'Ember Jackals', short: 'JACKALS', color: 0xff7a2a, css: '#ff7a2a' },
  defend: { id: 'defend', name: 'Harbor Wardens', short: 'WARDENS', color: 0x3fa7ff, css: '#3fa7ff' },
};

export const HITGROUP_MULT = { head: 4, chest: 1, stomach: 1.25, arm: 1, leg: 0.75 };
export const ARMORED_GROUPS = new Set(['head', 'chest', 'stomach', 'arm']); // legs never armored

export const WEAPONS = {
  kestrel: {
    id: 'kestrel', name: 'Kestrel-7', kind: 'rifle', slot: 1,
    dmg: 36, hs: 4.0, pen: 0.775, falloff: 0.02, rpm: 600, mag: 30, reserveMags: 4,
    price: 2700, reward: 300, move: 5.46, recovery: 0.368, recoveryCrouch: 0.305,
    spread: 0.00641, kick: 30, auto: true, range: 120,
    blurb: 'Attacker rifle. One-tap headshot through a helmet.',
  },
  bastion: {
    id: 'bastion', name: 'Bastion-4', kind: 'rifle', slot: 1,
    dmg: 33, hs: 4.0, pen: 0.70, falloff: 0.03, rpm: 666, mag: 30, reserveMags: 4,
    price: 2900, reward: 300, move: 5.72, recovery: 0.339, recoveryCrouch: 0.242,
    spread: 0.00590, kick: 23, auto: true, range: 120,
    blurb: 'Defender rifle. Headshot vs helmet totals 92.4 — never a one-tap.',
  },
  raptor: {
    id: 'raptor', name: 'Raptor-9', kind: 'smg', slot: 1,
    dmg: 26, hs: 4.0, pen: 0.65, falloff: 0.13, rpm: 857, mag: 30, reserveMags: 4,
    price: 1500, reward: 600, move: 6.10, recovery: 0.30, recoveryCrouch: 0.26,
    spread: 0.00920, kick: 16, auto: true, range: 60,
    blurb: 'Close-quarters sprayer. Pays $600 a kill.',
  },
  hinge: {
    id: 'hinge', name: 'Hinge P9', kind: 'pistol', slot: 2,
    dmg: 34, hs: 4.0, pen: 0.705, falloff: 0.09, rpm: 400, mag: 12, reserveMags: 5,
    price: 0, reward: 300, move: 6.10, recovery: 0.42, recoveryCrouch: 0.36,
    spread: 0.00780, kick: 14, auto: false, range: 50,
    blurb: 'Standard sidearm. Free, always in the loadout.',
  },
  anvil: {
    id: 'anvil', name: 'Anvil .50', kind: 'pistol', slot: 2,
    dmg: 53, hs: 3.9, pen: 0.932, falloff: 0.15, rpm: 267, mag: 7, reserveMags: 4,
    price: 700, reward: 300, move: 5.85, recovery: 0.811, recoveryCrouch: 0.450,
    spread: 0.00620, kick: 34, auto: false, range: 70,
    blurb: 'Heavy pistol. Two armored chest shots total 98.8 — just short.',
  },
  talon: {
    id: 'talon', name: 'Talon', kind: 'knife', slot: 3,
    dmg: 60, hs: 1.0, pen: 0.85, falloff: 0, rpm: 150, mag: Infinity, reserveMags: 0,
    price: 0, reward: 1500, move: 6.35, recovery: 0.20, recoveryCrouch: 0.20,
    spread: 0, kick: 0, auto: false, range: 2.2, melee: true,
    blurb: 'Fastest move speed. A kill pays $1,500.',
  },
};

export const UTILITY = {
  smoke: { name: 'Smoke Grenade', price: 300, key: 'Q', max: 2 },
  flash: { name: 'Flashbang', price: 200, key: 'G', max: 2 },
  frag: { name: 'Frag Grenade', price: 300, key: 'F', max: 1 },
};

export const ECONOMY = {
  start: 800,
  cap: 16000,
  winElimination: 3250,
  winObjective: 3500,
  plantPlanter: 800,
  plantTeam: 300,
  plantedLost: 600,
  defuseBonus: 300,
  lossBonus: [1400, 1900, 2400, 2900, 3400], // ladder by consecutive losses, step drops one on a win
  armor: 650,
  armorHelmet: 1000,
  defuseKit: 400,
  killRewardByKind: { rifle: 300, smg: 600, pistol: 300, knife: 1500 },
};

export const TIMERS = {
  buyPhase: 20,      // seconds
  round: 100,
  plant: 3.2,        // channel, stationary
  charge: 40,        // detonation countdown after plant
  defuse: 10,        // 5 s with a defuse kit
  defuseKit: 5,
  halftimeAfterRound: 8,
  winRounds: 9,
  maxRounds: 16,
};

export const MOVEMENT = {
  walkMult: 0.52,        // Shift silent walk
  crouchMult: 0.34,      // crouch-move
  accel: 42,             // m/s^2 ground acceleration
  friction: 9.5,         // ground friction (fast stop, deadzone feel)
  airAccel: 8,
  jumpSpeed: 6.4,
  gravity: 19.5,
  eyeHeight: 1.62,
  crouchEye: 1.12,
  radius: 0.38,
  height: 1.78,
  crouchHeight: 1.15,
};

export const ACCURACY = {
  moveMultMax: 27,
  crouchMult: 0.75,
  airMult: 6.5,
  deadzone: 0.275,       // below 27.5% of max speed counts as stopped
  bloomPerShot: 0.0016,  // spread added per shot, decays on the recovery timer
  maxBloom: 0.05,
};

export const BOT_NAMES = {
  attack: ['Ember', 'Cinder', 'Flint', 'Ash', 'Soot'],
  defend: ['Harbor', 'Breakwater', 'Anchor', 'Beacon', 'Tide'],
};
export const BOT_ROLES = ['Entry', 'Support', 'Lurker', 'Carrier', 'Anchor'];

export const MAP_ORDER = ['foundry', 'killhouse'];
export const MAP_META = {
  foundry: { id: 'foundry', name: 'Foundry Yard', short: 'FOUNDRY', outdoor: true },
  killhouse: { id: 'killhouse', name: 'Killhouse', short: 'KILLHOUSE', outdoor: false },
};

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
