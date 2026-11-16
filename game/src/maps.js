// maps.js — both maps as pure layout data. ONE builder (world.js) turns these
// arrays into geometry, colliders and radar floor plans, so a map is data, not code.
// Units are metres; y is up; a wall is { x, z, w, d, h, mat } centred on x/z.
// A doorway is simply a gap between two wall segments. Sites carry floor lettering.

export const MAPS = {
  foundry: {
    id: 'foundry', name: 'Foundry Yard', short: 'FOUNDRY', outdoor: true,
    bounds: { x: 34, z: 26 }, // half-extents of the playable yard
    palette: {
      sky: ['#2b1a12', '#c96a1e', '#f2a541'], // dusk gradient, warm amber
      fog: 0x3a2418, fogDensity: 0.011,
      hemiSky: 0xffd9a0, hemiGround: 0x4a2c1a, hemiInt: 0.85,
      sun: 0xffb066, sunInt: 2.4, sunPos: [-28, 38, 18],
      ambient: 0x604028, ambientInt: 0.55,
      floor: 'cobble', wall: 'brick', accent: '#f2a541',
    },
    walls: [
      { x: 0, z: -26, w: 68, d: 1, h: 7, mat: 'brick' },
      { x: 0, z: 26, w: 68, d: 1, h: 7, mat: 'brick' },
      { x: -34, z: 0, w: 1, d: 52, h: 7, mat: 'brick' },
      { x: 34, z: 0, w: 1, d: 52, h: 7, mat: 'brick' },
      { x: -24, z: -20, w: 20, d: 1, h: 5, mat: 'concrete' },
      { x: 0, z: -20, w: 8, d: 1, h: 5, mat: 'concrete' },
      { x: 24, z: -20, w: 20, d: 1, h: 5, mat: 'concrete' },
      { x: -6, z: -6, w: 10, d: 1, h: 4.5, mat: 'metal' },
      { x: 6, z: -6, w: 10, d: 1, h: 4.5, mat: 'metal' },
      { x: -10, z: 4, w: 1, d: 12, h: 4.5, mat: 'metal' },
      { x: 10, z: 4, w: 1, d: 12, h: 4.5, mat: 'metal' },
      { x: -28, z: -10, w: 1, d: 12, h: 5, mat: 'brick' },
      { x: -24, z: -14, w: 10, d: 1, h: 5, mat: 'brick' },
      { x: -24, z: -4, w: 6, d: 1, h: 5, mat: 'brick' },
      { x: 28, z: 10, w: 1, d: 12, h: 5, mat: 'brick' },
      { x: 24, z: 14, w: 10, d: 1, h: 5, mat: 'brick' },
      { x: 24, z: 4, w: 6, d: 1, h: 5, mat: 'brick' },
      { x: -16, z: 12, w: 12, d: 1, h: 4, mat: 'concrete' },
      { x: 16, z: -12, w: 12, d: 1, h: 4, mat: 'concrete' },
      { x: -2, z: 18, w: 8, d: 1, h: 4, mat: 'concrete' },
    ],
    crates: [
      { x: -3, z: -2, w: 2.2, d: 2.2, h: 1.2, stack: 2 }, // double-stacked at mid
      { x: 3, z: -2, w: 2.2, d: 2.2, h: 1.2, stack: 1 },
      { x: -22, z: -8, w: 2.2, d: 2.2, h: 1.2, stack: 2 },
      { x: 22, z: 8, w: 2.2, d: 2.2, h: 1.2, stack: 2 },
      { x: -8, z: 16, w: 2.2, d: 2.2, h: 1.2, stack: 1 },
      { x: 12, z: 14, w: 2.2, d: 2.2, h: 1.2, stack: 1 },
      { x: -26, z: 18, w: 2.2, d: 2.2, h: 1.2, stack: 1 },
    ],
    barriers: [ // waist-high plywood cover
      { x: -14, z: 0, w: 3, d: 0.3, h: 1.1 },
      { x: 14, z: 2, w: 3, d: 0.3, h: 1.1 },
      { x: 0, z: -14, w: 3, d: 0.3, h: 1.1 },
      { x: -18, z: -18, w: 0.3, d: 3, h: 1.1 },
    ],
    sites: {
      A: { x: -25, z: -9, r: 4.5, letter: 'A', floorText: 'SITE A' },
      B: { x: 25, z: 9, r: 4.5, letter: 'B', floorText: 'SITE B' },
    },
    spawns: {
      attack: [[-4, 22], [0, 23], [4, 22], [-8, 21], [8, 21]],
      defend: [[-24, -17], [-20, -18], [24, 17], [20, 18], [0, -22]],
    },
    catwalk: { x0: -20, x1: 20, z: -23, y: 4.2, width: 2.4, ramps: [-20, 20] },
    hero: {
      kind: 'furnace', x: 30, z: -22, height: 16,
      name: 'FOUNDRY', nameVertical: true, glow: true,
    },
    props: [
      { kind: 'barrel', x: -12, z: -16 }, { kind: 'barrel', x: -11, z: -15 },
      { kind: 'barrel', x: 18, z: -16 }, { kind: 'lamp', x: 0, z: 0 },
      { kind: 'lamp', x: -20, z: 8 }, { kind: 'lamp', x: 20, z: -8 },
      { kind: 'planter', x: -30, z: 20 }, { kind: 'planter', x: 30, z: -2 },
      { kind: 'barrel', x: 26, z: 20 }, { kind: 'barrel', x: -28, z: 2 },
      { kind: 'barrel', x: -9, z: 2 }, { kind: 'barrel', x: 9, z: -9 },
      { kind: 'planter', x: -7, z: -12 },
    ],
    hazardStripes: [
      { x: 0, z: -6, w: 4, d: 0.8 }, { x: 0, z: 10, w: 4, d: 0.8 },
      { x: -14, z: -20, w: 3, d: 0.8 }, { x: 14, z: -20, w: 3, d: 0.8 },
    ],
    signs: [
      { x: -24, z: -19.4, text: 'SITE A', size: 2.2 },
      { x: 24, z: 13.4, text: 'SITE B', size: 2.2 },
      { x: 0, z: -19.4, text: 'NORTH CORRIDOR', size: 1.4 },
      { x: -10, z: 3.4, text: 'MID', size: 1.6 },
    ],
  },

  killhouse: {
    id: 'killhouse', name: 'Killhouse', short: 'KILLHOUSE', outdoor: false,
    bounds: { x: 23, z: 17 },
    palette: {
      sky: ['#1a1a1c', '#232326', '#2e2a24'],
      fog: 0x1c1a18, fogDensity: 0.016,
      hemiSky: 0xfff2d8, hemiGround: 0x2a241e, hemiInt: 0.9,
      sun: 0xffe6b0, sunInt: 1.1, sunPos: [10, 20, 6],
      ambient: 0x554433, ambientInt: 0.7,
      floor: 'concrete', wall: 'plywood', accent: '#ffb03a',
    },
    walls: [
      { x: 0, z: -17, w: 46, d: 1, h: 4, mat: 'concrete' },
      { x: 0, z: 17, w: 46, d: 1, h: 4, mat: 'concrete' },
      { x: -23, z: 0, w: 1, d: 34, h: 4, mat: 'concrete' },
      { x: 23, z: 0, w: 1, d: 34, h: 4, mat: 'concrete' },
      { x: -19, z: -6, w: 8, d: 1, h: 4, mat: 'plywood' },
      { x: -9, z: -6, w: 8, d: 1, h: 4, mat: 'plywood' },
      { x: 3, z: -6, w: 8, d: 1, h: 4, mat: 'plywood' },
      { x: 13, z: -6, w: 6, d: 1, h: 4, mat: 'plywood' },
      { x: 21, z: -6, w: 4, d: 1, h: 4, mat: 'plywood' },
      { x: 0, z: -11, w: 1, d: 9, h: 4, mat: 'plywood' },
      { x: -12, z: 3, w: 1, d: 7, h: 4, mat: 'plywood' },
      { x: 8, z: -3, w: 1, d: 7, h: 4, mat: 'plywood' },
      { x: 14, z: 3, w: 1, d: 7, h: 4, mat: 'plywood' },
      { x: -10, z: 10, w: 14, d: 1, h: 4, mat: 'plywood' },
      { x: 10, z: 10, w: 14, d: 1, h: 4, mat: 'plywood' },
    ],
    crates: [
      { x: -18, z: -11, w: 2, d: 2, h: 1.1, stack: 2 },
      { x: 18, z: -11, w: 2, d: 2, h: 1.1, stack: 1 },
      { x: -6, z: -2, w: 2, d: 2, h: 1.1, stack: 1 },
      { x: 6, z: 2, w: 2, d: 2, h: 1.1, stack: 2 },
      { x: 0, z: 13, w: 2, d: 2, h: 1.1, stack: 1 },
    ],
    barriers: [
      { x: -4, z: 0, w: 3, d: 0.3, h: 1.1 },
      { x: 4, z: 0, w: 3, d: 0.3, h: 1.1 },
      { x: -16, z: -2, w: 0.3, d: 3, h: 1.1 },
      { x: 16, z: -2, w: 0.3, d: 3, h: 1.1 },
    ],
    sites: {
      A: { x: -14, z: -12, r: 4, letter: 'A', floorText: 'SITE A' },
      B: { x: 14, z: -12, r: 4, letter: 'B', floorText: 'SITE B' },
    },
    spawns: {
      attack: [[-4, 15], [0, 15], [4, 15], [-8, 14], [8, 14]],
      defend: [[-14, -14], [-10, -14], [14, -14], [10, -14], [0, -14]],
    },
    catwalk: null,
    hero: {
      kind: 'hallsign', x: 0, z: -5.4, height: 3.2,
      name: 'KILLHOUSE // LANE 01', nameVertical: false, glow: false,
    },
    props: [
      { kind: 'lamp', x: -12, z: 0 }, { kind: 'lamp', x: 12, z: 0 },
      { kind: 'barrel', x: -20, z: 12 }, { kind: 'barrel', x: 20, z: 12 },
      { kind: 'target', x: -18, z: -8 }, { kind: 'target', x: 18, z: -8 },
      { kind: 'target', x: 0, z: -12 }, { kind: 'planter', x: -21, z: 15 },
    ],
    hazardStripes: [
      { x: -15, z: -6, w: 3, d: 0.8 }, { x: 9, z: -6, w: 3, d: 0.8 },
      { x: 0, z: 10, w: 4, d: 0.8 },
    ],
    signs: [
      { x: -14, z: -5.4, text: 'SITE A', size: 2.0 },
      { x: 14, z: -5.4, text: 'SITE B', size: 2.0 },
      { x: -12, z: 9.4, text: 'SOUTH HALL', size: 1.3 },
      { x: 0, z: -16.4, text: 'TARGET LANES', size: 1.3 },
    ],
    targetLanes: [
      { x: -18, z: -14, dir: 1 }, { x: -14, z: -14, dir: 1 }, { x: 18, z: -14, dir: 1 },
    ],
    ceilingPanels: 14, // fluorescent ceiling panels down the main lane
  },
};

export const ROUTES = {
  foundry: {
    A: [[0, 22], [-8, 12], [-14, 0], [-20, -6], [-25, -9]],
    B: [[0, 22], [8, 12], [14, 2], [20, 6], [25, 9]],
    mid: [[0, 22], [0, 12], [0, 4], [0, -4], [0, -14]],
    north: [[-4, 22], [-14, 16], [-20, 6], [-16, -14], [0, -22]],
    rotateA: [[25, 9], [14, 2], [0, -4], [-14, 0], [-25, -9]],
    rotateB: [[-25, -9], [-14, 0], [0, -4], [14, 2], [25, 9]],
  },
  killhouse: {
    A: [[0, 15], [-8, 12], [-12, 6], [-15, 0], [-15, -6], [-14, -12]],
    B: [[0, 15], [8, 12], [12, 6], [15, 0], [15, -6], [14, -12]],
    mid: [[0, 15], [0, 10], [0, 4], [0, -2], [0, -8]],
    north: [[-4, 15], [-12, 12], [-18, 6], [-18, -2], [-10, -8]],
    rotateA: [[14, -12], [10, -6], [0, -2], [-10, -6], [-14, -12]],
    rotateB: [[-14, -12], [-10, -6], [0, -2], [10, -6], [14, -12]],
  },
};

export const PLANS = {
  attack: [
    { id: 'execA', label: 'EXECUTE A', route: 'A', roles: ['Entry', 'Support', 'Carrier', 'Lurker'] },
    { id: 'execB', label: 'EXECUTE B', route: 'B', roles: ['Entry', 'Support', 'Carrier', 'Lurker'] },
    { id: 'spread', label: 'SPREAD / DEFAULT', route: 'mid', roles: ['Entry', 'Lurker', 'Support', 'Carrier'] },
    { id: 'rushMid', label: 'RUSH MID', route: 'mid', roles: ['Entry', 'Entry', 'Carrier', 'Support'] },
  ],
  defend: [
    { id: 'stackA', label: 'STACK A', site: 'A', roles: ['Anchor', 'Anchor', 'Support', 'Lurker'] },
    { id: 'stackB', label: 'STACK B', site: 'B', roles: ['Anchor', 'Anchor', 'Support', 'Lurker'] },
    { id: 'split', label: 'SPLIT 2-2', site: null, roles: ['Anchor', 'Anchor', 'Anchor', 'Anchor'] },
  ],
};
