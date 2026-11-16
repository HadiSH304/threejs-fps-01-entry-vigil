// world.js — ONE data-driven builder turns a map definition (maps.js) into the
// scene, colliders, hero props and teardown. Both maps share this code; the map
// data is the only thing that differs. Teardown disposes the world group and
// map-owned materials/textures, drops colliders, and clears bots, smokes and
// projectiles before a rebuild.

import * as THREE from 'three';
import { buildColliders, pointBlocked } from './physics.js';
import {
  buildTextureSet, makeFloorText, makeSign, makeVerticalSign, makeSkyGradient,
} from './textures.js';

const MAT_CACHE = new Map();
function matFor(tex, opts = {}) {
  const key = tex.uuid + JSON.stringify(opts);
  if (!MAT_CACHE.has(key)) {
    MAT_CACHE.set(key, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92, metalness: 0.04, ...opts }));
  }
  return MAT_CACHE.get(key);
}

function box(w, h, d, material) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function buildFurnace(hero, textures) {
  const g = new THREE.Group();
  const iron = new THREE.MeshStandardMaterial({ color: 0x4a3a30, roughness: 0.85, metalness: 0.55 });
  const ironDark = new THREE.MeshStandardMaterial({ color: 0x2e211a, roughness: 0.9, metalness: 0.5 });
  const rust = new THREE.MeshStandardMaterial({ color: 0x7a3a16, roughness: 0.95, metalness: 0.25 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 5.4, 3.2, 18), ironDark);
  base.position.y = 1.6; base.castShadow = true; g.add(base);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 4.6, 6.0, 18), iron);
  body.position.y = 3.2 + 3.0 - 0.04; body.castShadow = true; g.add(body); // 0.04 seam overlap
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 3.4, 4.4, 18), rust);
  neck.position.y = 9.2 + 2.2 - 0.04; neck.castShadow = true; g.add(neck);
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.2, 3.6, 14), ironDark);
  stack.position.y = 13.6 + 1.8 - 0.04; stack.castShadow = true; g.add(stack);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.5, 0.7, 14), rust);
  rim.position.y = 15.4 + 0.35 - 0.03; g.add(rim);
  const mouth = new THREE.Mesh(
    new THREE.CircleGeometry(1.5, 24),
    new THREE.MeshBasicMaterial({ color: 0xff7a18 }),
  );
  mouth.position.set(0, 1.7, 4.62); g.add(mouth);
  const mouthGlow = new THREE.PointLight(0xff7a18, 60, 22, 1.8);
  mouthGlow.position.set(0, 1.8, 6.2); g.add(mouthGlow);
  for (const y of [3.15, 6.15, 9.15, 13.55]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.0, 0.12, 8, 24), ironDark);
    ring.rotation.x = Math.PI / 2; ring.position.y = y; ring.scale.setScalar(y > 10 ? 0.62 : 1);
    g.add(ring);
  }
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 12),
    new THREE.MeshBasicMaterial({ map: makeVerticalSign(hero.name), transparent: true }),
  );
  sign.position.set(0, 9.5, 4.68); g.add(sign);
  g.position.set(hero.x, 0, hero.z);
  return g;
}

function buildHallSign(hero) {
  const g = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(10, 1.6, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x2a241e, roughness: 0.8, metalness: 0.2 }),
  );
  plate.position.y = hero.height; plate.castShadow = true; g.add(plate);
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(9.6, 1.4),
    new THREE.MeshBasicMaterial({ map: makeSign(hero.name, 83, '#ffb03a', '#241f18') }),
  );
  face.position.set(0, hero.height, 0.14); g.add(face);
  const lamp = new THREE.PointLight(0xffd9a0, 25, 14, 1.8);
  lamp.position.set(0, hero.height - 1.2, 1.2); g.add(lamp);
  g.position.set(hero.x, 0, hero.z);
  return g;
}

function buildProp(kind, x, z, textures, rng) {
  const g = new THREE.Group();
  if (kind === 'barrel') {
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.55, 1.25, 14),
      new THREE.MeshStandardMaterial({ color: 0x8a5a20, roughness: 0.7, metalness: 0.45 }),
    );
    body.position.y = 0.63; body.castShadow = true; g.add(body);
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.56, 0.05, 8, 18),
      new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.8, metalness: 0.5 }),
    );
    band.rotation.x = Math.PI / 2; band.position.y = 0.9; g.add(band);
  } else if (kind === 'lamp') {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.12, 4.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.6, metalness: 0.7 }),
    );
    pole.position.y = 2.2; pole.castShadow = true; g.add(pole);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0 }),
    );
    head.position.y = 4.5; g.add(head);
    const light = new THREE.PointLight(0xffc98a, 30, 16, 1.9);
    light.position.y = 4.4; g.add(light);
  } else if (kind === 'planter') {
    const pot = box(1.4, 0.7, 1.4, new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.95 }));
    pot.position.y = 0.35; g.add(pot);
    const bush = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.8, 1),
      new THREE.MeshStandardMaterial({ color: 0x4a6a2a, roughness: 1, flatShading: true }),
    );
    bush.position.y = 1.1; bush.castShadow = true; g.add(bush);
  } else if (kind === 'target') {
    const post = box(0.12, 1.5, 0.12, new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.8 }));
    post.position.y = 0.75; g.add(post);
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xe8e2d2, roughness: 0.9, side: THREE.DoubleSide }),
    );
    paper.position.y = 1.5; paper.castShadow = true; g.add(paper);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.26, 20),
      new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide }),
    );
    ring.position.set(0, 1.55, 0.01); g.add(ring);
  }
  g.position.set(x, 0, z);
  return g;
}

export function buildWorld(scene, mapDef) {
  const textures = buildTextureSet();
  const group = new THREE.Group();
  group.name = 'world';
  const disposables = [];
  const track = (o) => { disposables.push(o); return o; };

  const pal = mapDef.palette;
  scene.fog = new THREE.FogExp2(pal.fog, pal.fogDensity);
  scene.background = null; // sky dome below replaces the clear colour

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(220, 24, 16),
    new THREE.MeshBasicMaterial({ map: makeSkyGradient(pal.sky), side: THREE.BackSide, fog: false }),
  );
  group.add(sky); disposables.push(sky.material.map);

  const hemi = new THREE.HemisphereLight(pal.hemiSky, pal.hemiGround, pal.hemiInt);
  group.add(hemi);
  const amb = new THREE.AmbientLight(pal.ambient, pal.ambientInt);
  group.add(amb);
  const sun = new THREE.DirectionalLight(pal.sun, pal.sunInt);
  sun.position.set(...pal.sunPos);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -45; sun.shadow.camera.right = 45;
  sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45;
  sun.shadow.camera.far = 120;
  group.add(sun);

  const floorTex = textures[mapDef.palette.floor] || textures.concrete;
  floorTex.repeat.set(mapDef.bounds.x / 6, mapDef.bounds.z / 6);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(mapDef.bounds.x * 2 + 4, mapDef.bounds.z * 2 + 4),
    new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.95, metalness: 0.02 }),
  );
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  group.add(floor);

  for (const key of ['A', 'B']) {
    const site = mapDef.sites[key];
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 3.5),
      new THREE.MeshBasicMaterial({
        map: makeFloorText(site.floorText, key === 'A' ? 71 : 72),
        transparent: true, opacity: 0.85, depthWrite: false,
      }),
    );
    label.rotation.x = -Math.PI / 2;
    label.rotation.z = key === 'A' ? 0.3 : -0.4;
    label.position.set(site.x, 0.02, site.z);
    group.add(label); disposables.push(label.material.map);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(site.r - 0.15, site.r, 40),
      new THREE.MeshBasicMaterial({ color: key === 'A' ? 0xff7a2a : 0x3fa7ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2; ring.position.set(site.x, 0.02, site.z);
    group.add(ring);
  }
  for (const h of (mapDef.hazardStripes || [])) {
    const strip = new THREE.Mesh(
      new THREE.PlaneGeometry(h.w, h.d),
      new THREE.MeshStandardMaterial({ map: textures.hazard, roughness: 0.9 }),
    );
    strip.rotation.x = -Math.PI / 2; strip.position.set(h.x, 0.02, h.z);
    group.add(strip);
  }

  const wallMats = { brick: matFor(textures.brick), concrete: matFor(textures.concrete), metal: matFor(textures.metal), plywood: matFor(textures.plywood) };
  for (const w of mapDef.walls) {
    const m = box(w.w, w.h, w.d, wallMats[w.mat] || wallMats.concrete);
    m.position.set(w.x, w.h / 2, w.z);
    group.add(m);
  }
  for (const c of mapDef.crates) {
    const n = c.stack || 1;
    for (let i = 0; i < n; i++) {
      const m = box(c.w, c.h, c.d, matFor(textures.crate));
      m.position.set(c.x, c.h / 2 + i * c.h, c.z);
      m.rotation.y = (i % 2) * 0.12;
      group.add(m);
    }
  }
  for (const b of (mapDef.barriers || [])) {
    const m = box(b.w, b.h, b.d, wallMats.plywood);
    m.position.set(b.x, b.h / 2, b.z);
    group.add(m);
  }
  for (const p of (mapDef.props || [])) group.add(buildProp(p.kind, p.x, p.z, textures, Math.random));
  for (const s of (mapDef.signs || [])) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(s.size * 3.2, s.size),
      new THREE.MeshBasicMaterial({ map: makeSign(s.text, 80 + s.text.length), transparent: false }),
    );
    sign.position.set(s.x, 3.4, s.z);
    group.add(sign); disposables.push(sign.material.map);
  }
  if (mapDef.catwalk) {
    const cw = mapDef.catwalk;
    const deck = box(cw.x1 - cw.x0, 0.3, cw.width, matFor(textures.metal, { metalness: 0.6, roughness: 0.5 }));
    deck.position.set((cw.x0 + cw.x1) / 2, cw.y, cw.z);
    group.add(deck);
    for (const rx of cw.ramps) {
      const ramp = box(6, 0.25, cw.width, matFor(textures.metal, { metalness: 0.6, roughness: 0.5 }));
      ramp.position.set(rx + (rx < 0 ? 3 : -3), cw.y / 2, cw.z);
      ramp.rotation.z = (rx < 0 ? -1 : 1) * Math.atan2(cw.y, 6);
      group.add(ramp);
    }
    const rail = box(cw.x1 - cw.x0, 0.08, 0.08, new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.7, roughness: 0.4 }));
    rail.position.set((cw.x0 + cw.x1) / 2, cw.y + 1.1, cw.z - cw.width / 2);
    group.add(rail);
  }
  if (mapDef.hero.kind === 'furnace') group.add(buildFurnace(mapDef.hero, textures));
  if (mapDef.hero.kind === 'hallsign') group.add(buildHallSign(mapDef.hero));
  if (mapDef.ceilingPanels) {
    const ceil = box(mapDef.bounds.x * 2, 0.2, mapDef.bounds.z * 2, new THREE.MeshStandardMaterial({ color: 0x1e1c1a, roughness: 1 }));
    ceil.position.set(0, 4.1, 0); group.add(ceil);
    for (let i = 0; i < mapDef.ceilingPanels; i++) {
      const x = -20 + i * 3.1;
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 0.9),
        new THREE.MeshBasicMaterial({ color: 0xfff2cf }),
      );
      panel.rotation.x = Math.PI / 2; panel.position.set(x, 3.98, 0);
      group.add(panel);
      if (i % 4 === 0) {
        const pl = new THREE.PointLight(0xffe6b0, 14, 12, 1.9);
        pl.position.set(x, 3.6, 0); group.add(pl);
      }
    }
  }

  scene.add(group);
  const colliders = buildColliders(mapDef);
  if (mapDef.hero.kind === 'furnace') {
    colliders.push({ minX: mapDef.hero.x - 5, maxX: mapDef.hero.x + 5, minZ: mapDef.hero.z - 5, maxZ: mapDef.hero.z + 5, minY: 0, maxY: 16, mat: 'metal' });
  }

  const api = {
    group, colliders, mapDef, disposables,
    smokeBlocks(a, b, smokes) {
      for (const s of smokes) {
        if (!s.alive) continue;
        const d = new THREE.Vector3().subVectors(b, a);
        const len = d.length(); if (len < 1e-6) continue;
        const t = Math.max(0, Math.min(1, new THREE.Vector3().subVectors(s.pos, a).dot(d) / (len * len)));
        const closest = new THREE.Vector3().copy(a).addScaledVector(d, t);
        if (closest.distanceTo(s.pos) < s.radius) return true;
      }
      return false;
    },
    pointBlocked(x, y, z) { return pointBlocked(colliders, x, y, z); },
    dispose() {
      scene.remove(group);
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const ms = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of ms) { if (m.map && m.map.dispose) m.map.dispose(); }
        }
      });
      for (const t of disposables) { if (t && t.dispose) t.dispose(); }
      colliders.length = 0;
    },
  };
  return api;
}
