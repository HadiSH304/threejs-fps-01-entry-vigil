// weapons.js — viewmodels, hitscan, FX.

export function recoilOffset(weapon, index) {
  const k = weapon.kick / 30;
  let pitch = 0, yaw = 0;
  if (index < 10) { pitch = (0.55 + index * 0.10) * k; yaw = (index % 2 ? 0.06 : -0.05) * k; }
  else if (index < 20) {
    const s = (index - 10) / 10;
    pitch = (1.5 + s * 0.4) * k; yaw = Math.sin(s * Math.PI * 1.4) * 0.85 * k;
  } else {
    const s = (index - 20) / 10;
    pitch = (1.9 + s * 0.2) * k; yaw = Math.sin(s * Math.PI * 2.2) * 1.5 * k;
  }
  return { pitch: pitch * 0.011, yaw: yaw * 0.011 };
}

export function spreadFor(weapon, speed, maxSpeed, crouched, airborne, bloom) {
  let m = 1;
  const ratio = maxSpeed > 0 ? Math.min(1, speed / maxSpeed) : 0;
  if (airborne) m = 6.5;
  else m = 1 + ratio * ratio * 26;
  if (crouched) m *= 0.75;
  return Math.max(0.0004, weapon.spread * m + bloom);
}

import * as THREE from 'three';
import { applyDamage } from './damage.js';
import { rayWorld } from './physics.js';

export function rayBody(origin, dir, actor, maxDist) {
  const p = actor.pos;
  const h = actor.crouched ? 1.15 : 1.78;
  const headY = p.y + (actor.crouched ? 0.95 : 1.55);
  const boxes = [
    { g: 'head', minX: p.x - 0.16, maxX: p.x + 0.16, minY: headY - 0.14, maxY: headY + 0.14, minZ: p.z - 0.16, maxZ: p.z + 0.16 },
    { g: 'chest', minX: p.x - 0.30, maxX: p.x + 0.30, minY: p.y + 1.05, maxY: p.y + 1.42, minZ: p.z - 0.22, maxZ: p.z + 0.22 },
    { g: 'stomach', minX: p.x - 0.28, maxX: p.x + 0.28, minY: p.y + 0.72, maxY: p.y + 1.05, minZ: p.z - 0.20, maxZ: p.z + 0.20 },
    { g: 'leg', minX: p.x - 0.26, maxX: p.x + 0.26, minY: p.y, maxY: p.y + 0.72, minZ: p.z - 0.20, maxZ: p.z + 0.20 },
  ];
  let best = null, bestT = maxDist;
  for (const b of boxes) {
    const t = rayBoxSlab(origin, dir, b);
    if (t < bestT) { bestT = t; best = b.g; }
  }
  if (!best) return null;
  return { hitgroup: best, distance: bestT, point: new THREE.Vector3().copy(origin).addScaledVector(dir, bestT) };
}

function rayBoxSlab(o, d, b) {
  let tmin = 0, tmax = Infinity;
  const oo = [o.x, o.y, o.z], dd = [d.x, d.y, d.z];
  const mn = [b.minX, b.minY, b.minZ], mx = [b.maxX, b.maxY, b.maxZ];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dd[i]) < 1e-9) { if (oo[i] < mn[i] || oo[i] > mx[i]) return Infinity; }
    else {
      let t1 = (mn[i] - oo[i]) / dd[i], t2 = (mx[i] - oo[i]) / dd[i];
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
      if (tmin > tmax) return Infinity;
    }
  }
  return tmin;
}

export function fireHitscan(shooter, dir, world, targets, fx) {
  const origin = new THREE.Vector3().copy(shooter.pos);
  origin.y += shooter.crouched ? 1.12 : 1.62;
  const wall = rayWorld(origin, dir, world.colliders, shooter.weapon.range || 120);
  const wallDist = wall ? wall.distance : (shooter.weapon.range || 120);
  let best = null, bestDist = wallDist;
  for (const t of targets) {
    if (t.dead || t === shooter) continue;
    if (t.team === shooter.team) continue;
    const r = rayBody(origin, dir, t, wallDist);
    if (r && r.distance < bestDist) { bestDist = r.distance; best = { actor: t, ...r }; }
  }
  const endPoint = new THREE.Vector3().copy(origin).addScaledVector(dir, bestDist);
  if (fx) fx.tracer(origin, endPoint, shooter.team);
  if (!best) {
    if (fx && wall) fx.impact(wall.point, wall.mat, false);
    return { hit: false, point: endPoint, distance: bestDist, wall: !!wall };
  }
  const res = applyDamage(best.actor, shooter.weapon, best.hitgroup, best.distance);
  if (fx) fx.impact(best.point, 'flesh', best.hitgroup === 'head');
  return { hit: true, actor: best.actor, hitgroup: best.hitgroup, distance: best.distance, point: best.point, ...res };
}

const VM_PART = {
  dark: 0x45484e, mid: 0x6e7278, light: 0x9a9ea6, wood: 0x7d5a2e, accent: 0xf2a541,
};
function vmMat(color, rough = 0.55, metal = 0.6) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}
function vmBox(w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), vmMat(color));
  m.position.set(x, y, z); return m;
}
function vmCyl(r, len, color, x, y, z, axis = 'z') {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12), vmMat(color));
  if (axis === 'z') m.rotation.x = Math.PI / 2;
  if (axis === 'x') m.rotation.z = Math.PI / 2;
  m.position.set(x, y, z); return m;
}

export function buildViewmodel(weaponId) {
  const g = new THREE.Group();
  const dark = VM_PART.dark, mid = VM_PART.mid, light = VM_PART.light, acc = VM_PART.accent;
  if (weaponId === 'kestrel') {
    g.add(vmBox(0.09, 0.11, 0.55, dark, 0, 0, 0));
    g.add(vmCyl(0.035, 0.5, mid, 0, 0.01, -0.5));
    g.add(vmBox(0.06, 0.2, 0.12, VM_PART.wood, 0, -0.14, 0.08));
    g.add(vmBox(0.05, 0.12, 0.03, light, 0, 0.1, -0.12));
    g.add(vmBox(0.09, 0.02, 0.05, light, 0, 0.15, -0.12));
    g.add(vmBox(0.09, 0.05, 0.03, light, 0, 0.08, 0.2));
    g.add(vmBox(0.015, 0.07, 0.03, light, -0.045, 0.1, 0.2));
    g.add(vmBox(0.015, 0.07, 0.03, light, 0.045, 0.1, 0.2));
    g.add(vmBox(0.08, 0.05, 0.16, VM_PART.wood, 0, -0.01, 0.32));
    g.add(vmBox(0.05, 0.1, 0.06, dark, 0, -0.1, 0.2));
    g.add(vmBox(0.02, 0.03, 0.3, acc, 0.045, 0.06, -0.1));
    g.add(vmBox(0.095, 0.02, 0.5, acc, 0, 0.065, -0.02));
  } else if (weaponId === 'bastion') {
    g.add(vmBox(0.09, 0.1, 0.5, dark, 0, 0, 0));
    g.add(vmCyl(0.03, 0.45, mid, 0, 0.01, -0.46));
    g.add(vmBox(0.06, 0.16, 0.1, mid, 0, -0.12, 0.06));
    g.add(vmBox(0.1, 0.04, 0.3, light, 0, 0.075, -0.05));
    g.add(vmBox(0.015, 0.06, 0.03, light, -0.045, 0.11, 0.08));
    g.add(vmBox(0.015, 0.06, 0.03, light, 0.045, 0.11, 0.08));
    g.add(vmBox(0.04, 0.09, 0.03, light, 0, 0.1, -0.16));
    g.add(vmBox(0.07, 0.09, 0.14, dark, 0, -0.01, 0.3));
    g.add(vmBox(0.05, 0.1, 0.06, dark, 0, -0.1, 0.18));
    g.add(vmBox(0.02, 0.025, 0.28, acc, -0.045, 0.055, -0.08));
    g.add(vmBox(0.095, 0.02, 0.46, acc, 0, 0.06, -0.02));
  } else if (weaponId === 'raptor') {
    g.add(vmBox(0.08, 0.09, 0.4, dark, 0, 0, 0));
    g.add(vmCyl(0.04, 0.3, mid, 0, 0.01, -0.32));
    g.add(vmBox(0.05, 0.22, 0.09, mid, 0, -0.15, 0.1));
    g.add(vmBox(0.07, 0.06, 0.2, light, 0, 0.07, -0.1));
    g.add(vmBox(0.04, 0.09, 0.03, light, 0, 0.1, -0.16));
    g.add(vmBox(0.06, 0.08, 0.12, dark, 0, -0.01, 0.26));
    g.add(vmBox(0.02, 0.03, 0.2, acc, 0.04, 0.05, -0.05));
    g.add(vmBox(0.085, 0.02, 0.36, acc, 0, 0.055, -0.02));
  } else if (weaponId === 'hinge') {
    g.add(vmBox(0.06, 0.09, 0.24, dark, 0, 0, 0));
    g.add(vmBox(0.055, 0.05, 0.22, mid, 0, -0.06, 0.01));
    g.add(vmBox(0.05, 0.12, 0.07, VM_PART.wood, 0, -0.13, 0.09));
    g.add(vmBox(0.015, 0.02, 0.02, acc, 0, 0.055, -0.11));
  } else if (weaponId === 'anvil') {
    g.add(vmBox(0.07, 0.1, 0.3, light, 0, 0, 0));
    g.add(vmBox(0.06, 0.05, 0.28, dark, 0, -0.07, 0.01));
    g.add(vmBox(0.055, 0.13, 0.08, VM_PART.wood, 0, -0.14, 0.1));
    g.add(vmBox(0.02, 0.025, 0.03, acc, 0, 0.06, -0.14));
  } else {
    g.add(vmBox(0.015, 0.05, 0.34, light, 0, 0.01, -0.12));
    g.add(vmBox(0.04, 0.06, 0.12, dark, 0, 0, 0.1));
    g.add(vmBox(0.05, 0.02, 0.03, acc, 0, 0.02, 0.03));
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = false; } });
  g.scale.setScalar(1.25);
  return g;
}

export function createEffects(scene) {
  const pool = [];
  const tracerGeo = new THREE.BufferGeometry();
  const tracerMat = new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.9 });
  const flash = new THREE.PointLight(0xffc266, 0, 9, 1.8);
  scene.add(flash);
  let flashUntil = 0;

  const spriteTex = (() => {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 32, 1, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.85)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const flashSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: spriteTex, color: 0xffc266, transparent: true, opacity: 0.95,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  flashSprite.scale.setScalar(0.4);
  flashSprite.visible = false;
  scene.add(flashSprite);

  function tracer(from, to, team) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
      color: team === 'attack' ? 0xffb03a : 0x7ac8ff, transparent: true, opacity: 0.85,
    }));
    scene.add(line);
    pool.push({ obj: line, until: performance.now() + 90, kind: 'line' });
  }
  function impact(point, mat, headshot) {
    const n = headshot ? 16 : 8;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = point.x + (Math.random() - 0.5) * 0.18;
      pos[i * 3 + 1] = point.y + (Math.random() - 0.5) * 0.18;
      pos[i * 3 + 2] = point.z + (Math.random() - 0.5) * 0.18;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({
      map: spriteTex,
      color: headshot ? 0xffd700 : (mat === 'flesh' ? 0xc03028 : 0xffc266),
      size: headshot ? 0.07 : 0.05, transparent: true, opacity: 0.9, depthWrite: false,
    }));
    scene.add(pts);
    pool.push({ obj: pts, until: performance.now() + 160, kind: 'points' });
  }
  function muzzle(pos, dir) {
    flash.position.copy(pos);
    flash.intensity = 55;
    flashUntil = performance.now() + 55;
    flashSprite.position.copy(pos);
    if (dir) flashSprite.position.addScaledVector(dir, 0.55);
    flashSprite.visible = true;
  }
  function update(now) {
    for (let i = pool.length - 1; i >= 0; i--) {
      if (now > pool[i].until) {
        scene.remove(pool[i].obj);
        pool[i].obj.geometry.dispose();
        pool[i].obj.material.dispose();
        pool.splice(i, 1);
      }
    }
    if (now > flashUntil) {
      if (flash.intensity > 0) flash.intensity = 0;
      if (flashSprite.visible) flashSprite.visible = false;
    }
  }
  return { tracer, impact, muzzle, update };
}
