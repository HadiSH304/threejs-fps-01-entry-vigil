// physics.js — AABB collision.

import * as THREE from 'three';

export function buildColliders(mapDef) {
  const list = [];
  const push = (x, z, w, d, h, y0 = 0, mat = 'concrete') => {
    list.push({
      minX: x - w / 2, maxX: x + w / 2,
      minZ: z - d / 2, maxZ: z + d / 2,
      minY: y0, maxY: y0 + h, mat,
    });
  };
  for (const w of mapDef.walls) push(w.x, w.z, w.w, w.d, w.h, 0, w.mat || 'concrete');
  for (const c of mapDef.crates) {
    const h = c.h * (c.stack || 1);
    push(c.x, c.z, c.w, c.d, h, 0, 'crate');
  }
  for (const b of (mapDef.barriers || [])) push(b.x, b.z, b.w, b.d, b.h, 0, 'plywood');
  if (mapDef.catwalk) {
    const cw = mapDef.catwalk;
    push((cw.x0 + cw.x1) / 2, cw.z, cw.x1 - cw.x0, cw.width, 0.3, cw.y - 0.3, 'metal');
  }
  return list;
}

export function pointBlocked(colliders, x, y, z) {
  for (const c of colliders) {
    if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ && y >= c.minY && y <= c.maxY) return c;
  }
  return null;
}

export function moveBody(pos, vel, dt, colliders, radius, height, bounds) {
  let onGround = false;
  let hitWall = false;
  const feet = pos.y;

  pos.x += vel.x * dt;
  for (const c of colliders) {
    if (feet + height <= c.minY + 0.01 || feet >= c.maxY - 0.01) continue;
    if (pos.z + radius <= c.minZ || pos.z - radius >= c.maxZ) continue;
    if (pos.x + radius > c.minX && pos.x - radius < c.maxX) {
      if (vel.x > 0) pos.x = c.minX - radius; else if (vel.x < 0) pos.x = c.maxX + radius;
      vel.x = 0; hitWall = true;
    }
  }
  pos.z += vel.z * dt;
  for (const c of colliders) {
    if (feet + height <= c.minY + 0.01 || feet >= c.maxY - 0.01) continue;
    if (pos.x + radius <= c.minX || pos.x - radius >= c.maxX) continue;
    if (pos.z + radius > c.minZ && pos.z - radius < c.maxZ) {
      if (vel.z > 0) pos.z = c.minZ - radius; else if (vel.z < 0) pos.z = c.maxZ + radius;
      vel.z = 0; hitWall = true;
    }
  }
  pos.y += vel.y * dt;
  if (pos.y <= 0) { pos.y = 0; vel.y = 0; onGround = true; }
  for (const c of colliders) {
    if (pos.x + radius <= c.minX || pos.x - radius >= c.maxX) continue;
    if (pos.z + radius <= c.minZ || pos.z - radius >= c.maxZ) continue;
    if (vel.y <= 0 && feet >= c.maxY - 0.35 && pos.y <= c.maxY && pos.y + height > c.minY) {
      pos.y = c.maxY; vel.y = 0; onGround = true;
    } else if (vel.y > 0 && pos.y + height > c.minY && feet + height <= c.minY + 0.35) {
      pos.y = c.minY - height; vel.y = 0;
    }
  }
  if (bounds) {
    pos.x = Math.max(-bounds.x + radius, Math.min(bounds.x - radius, pos.x));
    pos.z = Math.max(-bounds.z + radius, Math.min(bounds.z - radius, pos.z));
  }
  return { onGround, hitWall };
}

export function rayBox(origin, dir, box) {
  let tmin = 0, tmax = Infinity;
  const o = [origin.x, origin.y, origin.z];
  const d = [dir.x, dir.y, dir.z];
  const mn = [box.minX, box.minY, box.minZ];
  const mx = [box.maxX, box.maxY, box.maxZ];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < mn[i] || o[i] > mx[i]) return Infinity;
    } else {
      let t1 = (mn[i] - o[i]) / d[i];
      let t2 = (mx[i] - o[i]) / d[i];
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return Infinity;
    }
  }
  return tmin;
}

export function rayWorld(origin, dir, colliders, maxDist = 200) {
  let best = null, bestT = maxDist;
  for (const c of colliders) {
    const t = rayBox(origin, dir, c);
    if (t < bestT) { bestT = t; best = { t, box: c }; }
  }
  if (!best) return null;
  const point = new THREE.Vector3().copy(origin).addScaledVector(dir, bestT);
  return { point, distance: bestT, mat: best.box.mat };
}

export function segmentBlocked(a, b, colliders) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  if (len < 1e-6) return false;
  dir.multiplyScalar(1 / len);
  return rayWorld(a, dir, colliders, len) !== null;
}
