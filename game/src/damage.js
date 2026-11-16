// damage.js — the damage pipeline, one function every shot in the game shares.
// Order (CS2 game files): base x range falloff, x hitgroup multiplier, then x armor
// penetration ONLY on armored hitgroups (head with helmet, torso, arms). Legs never
// take penetration. There is NO extra x0.5 anywhere. A 100-point armor pool drains
// at half the blocked amount; protection is full until the pool empties.
//
// Sanity targets (point blank, armored target, 100 HP / 100 armor):
//   Kestrel-7 chest vs armor 36 x 0.775 = 27.9  (4 shots kill)
//   Kestrel-7 bare chest 36                    (3 shots kill)
//   Kestrel-7 headshot vs helmet 36 x 4 x 0.775 = 111.6 (lethal)
//   Bastion-4 headshot vs helmet 33 x 4 x 0.70 = 92.4 (NOT lethal)
//   Anvil .50 two armored chest shots 2 x 53 x 0.932 = 98.8 (just short)

import { HITGROUP_MULT, ARMORED_GROUPS } from './config.js';

export function falloffFactor(weapon, distanceM) {
  if (!weapon.falloff) return 1;
  const units = distanceM / 0.0254; // 1 m = 39.37 units; 500 u = 12.7 m
  return Math.pow(1 - weapon.falloff, units / 500);
}

export function isArmoredHit(hitgroup, target) {
  if (!target) return false;
  if (hitgroup === 'head') return target.hasHelmet === true;
  if (hitgroup === 'leg') return false;
  return ARMORED_GROUPS.has(hitgroup) && target.hasArmor === true;
}

export function computeDamage(weapon, hitgroup, distanceM, target) {
  const mult = HITGROUP_MULT[hitgroup] ?? 1;
  const hsMult = hitgroup === 'head' ? weapon.hs : 1;
  const raw = weapon.dmg * falloffFactor(weapon, distanceM) * mult * (hitgroup === 'head' ? hsMult / 4 : 1);
  const armored = isArmoredHit(hitgroup, target);
  if (!armored) return { health: raw, armorDrain: 0, blocked: 0 };
  const health = raw * weapon.pen;
  const blocked = raw - health;
  return { health, armorDrain: blocked * 0.5, blocked };
}

export function applyDamage(target, weapon, hitgroup, distanceM) {
  const d = computeDamage(weapon, hitgroup, distanceM, target);
  let health = d.health;
  let drain = d.armorDrain;
  if (target.armor > 0 && drain > 0) {
    if (drain > target.armor) {
      const overflow = (drain - target.armor) * 2; // blocked damage the pool could not soak
      health += overflow * weapon.pen;
      drain = target.armor;
    }
    target.armor = Math.max(0, target.armor - drain);
    if (target.armor <= 0) { target.hasArmor = false; target.hasHelmet = false; }
  }
  target.hp = Math.max(0, target.hp - health);
  return { health, armorDrain: drain, killed: target.hp <= 0, headshot: hitgroup === 'head' };
}

export function shotsToKill(weapon, armored, hitgroup = 'chest') {
  const target = { hp: 100, armor: armored ? 100 : 0, hasArmor: armored, hasHelmet: armored };
  let n = 0;
  while (target.hp > 0 && n < 40) { applyDamage(target, weapon, hitgroup, 0); n++; }
  return n;
}

export function sanityChecks(weapons) {
  const out = [];
  const check = (name, got, want, tol = 0.01) => {
    out.push({ name, got: Math.round(got * 100) / 100, want, pass: Math.abs(got - want) <= tol });
  };
  const armored = { hp: 100, armor: 100, hasArmor: true, hasHelmet: true };
  const bare = { hp: 100, armor: 0, hasArmor: false, hasHelmet: false };
  const k = weapons.kestrel, b = weapons.bastion, a = weapons.anvil;
  check('kestrel chest vs armor', computeDamage(k, 'chest', 0, armored).health, 27.9);
  check('kestrel bare chest', computeDamage(k, 'chest', 0, bare).health, 36);
  check('kestrel headshot vs helmet', computeDamage(k, 'head', 0, armored).health, 111.6);
  check('kestrel headshot bare', computeDamage(k, 'head', 0, bare).health, 144);
  check('bastion headshot vs helmet', computeDamage(b, 'head', 0, armored).health, 92.4);
  check('anvil two armored chest shots', computeDamage(a, 'chest', 0, armored).health * 2, 98.8);
  check('kestrel chest shots to kill armored', shotsToKill(k, true, 'chest'), 4);
  check('kestrel chest shots to kill bare', shotsToKill(k, false, 'chest'), 3);
  check('bastion chest shots to kill armored', shotsToKill(b, true, 'chest'), 5);
  check('anvil chest shots to kill armored', shotsToKill(a, true, 'chest'), 3);
  check('leg never takes penetration', computeDamage(k, 'leg', 0, armored).health, 27);
  const t2 = { hp: 100, armor: 100, hasArmor: true, hasHelmet: true };
  applyDamage(t2, k, 'chest', 0);
  check('armor pool after one chest hit', t2.armor, 95.95);
  return out;
}
