// fsm.js — transition tables + driver.

export const Guards = {
  hasLineOfSight: (ctx) => ctx.bot?.hasLOS === true,
  lostLineOfSight: (ctx) => ctx.bot?.hasLOS === false,
  heardGunshot: (ctx) => ctx.bot?.heardShot === true,
  hpCritical: (ctx) => (ctx.bot?.hp ?? 100) < 40,
  hpRecovered: (ctx) => (ctx.bot?.hp ?? 0) >= 40,
  ammoLow: (ctx) => (ctx.bot?.ammo ?? 99) <= 5,
  ammoOk: (ctx) => (ctx.bot?.ammo ?? 0) > 5,
  isCarrier: (ctx) => ctx.bot?.isCarrier === true,
  atSite: (ctx) => ctx.bot?.atSite === true,
  roundLive: (ctx) => ctx.round?.phase === 'live' || ctx.round?.phase === 'planted',
  roundOver: (ctx) => ctx.round?.phase === 'end',
  chargePlanted: (ctx) => ctx.round?.phase === 'planted',
  timeExpired: (ctx) => (ctx.round?.timeLeft ?? 99) <= 0,
  targetDown: (ctx) => ctx.bot?.targetAlive === false,
  lsWaveClear: (ctx) => ctx.ls?.waveDown() === true,
  lsBossDown: (ctx) => ctx.ls?.boss?.dead === true,
  lsCoreDown: (ctx) => (ctx.ls?.coreHp ?? 1) <= 0,
  always: () => true,
};

export const ROUND_TABLE = {
  deploy: [
    { event: 'startBuy', to: 'buy', guard: 'always' },
  ],
  buy: [
    { event: 'startRound', to: 'live', guard: 'always' },
    { event: 'timeout', to: 'live', guard: 'always' },
  ],
  live: [
    { event: 'plant', to: 'planted', guard: 'always' },
    { event: 'eliminate', to: 'end', guard: 'always' },
    { event: 'timeout', to: 'end', guard: 'always' },
  ],
  planted: [
    { event: 'defuse', to: 'end', guard: 'always' },
    { event: 'detonate', to: 'end', guard: 'always' },
    { event: 'eliminate', to: 'end', guard: 'always' },
  ],
  end: [
    { event: 'nextRound', to: 'buy', guard: 'always' },
    { event: 'halftime', to: 'deploy', guard: 'always' },
    { event: 'matchEnd', to: 'aar', guard: 'always' },
  ],
  aar: [
    { event: 'playAgain', to: 'deploy', guard: 'always' },
    { event: 'nextWave', to: 'deploy', guard: 'always' },
  ],
};

export const LS_TABLE = {
  deploy: [
    { event: 'startWave', to: 'wave', guard: 'always' },
  ],
  wave: [
    { event: 'waveClear', to: 'buy', guard: 'lsWaveClear' },
    { event: 'bossDown', to: 'victory', guard: 'lsBossDown' },
    { event: 'coreDown', to: 'defeat', guard: 'lsCoreDown' },
  ],
  buy: [
    { event: 'startWave', to: 'wave', guard: 'always' },
    { event: 'startBoss', to: 'boss', guard: 'always' },
  ],
  boss: [
    { event: 'bossDown', to: 'victory', guard: 'lsBossDown' },
    { event: 'coreDown', to: 'defeat', guard: 'lsCoreDown' },
  ],
  victory: [
    { event: 'showAAR', to: 'aar', guard: 'always' },
  ],
  defeat: [
    { event: 'showAAR', to: 'aar', guard: 'always' },
  ],
  aar: [
    { event: 'playAgain', to: 'deploy', guard: 'always' },
  ],
};

export const BOT_TABLE = {
  patrol: [
    { event: 'seeEnemy', to: 'engage', guard: 'hasLineOfSight' },
    { event: 'hearShot', to: 'alert', guard: 'heardGunshot' },
    { event: 'callout', to: 'alert', guard: 'always' },
    { event: 'plantOrder', to: 'plant', guard: 'isCarrier' },
    { event: 'down', to: 'downed', guard: 'always' },
  ],
  alert: [
    { event: 'seeEnemy', to: 'engage', guard: 'hasLineOfSight' },
    { event: 'lostEnemy', to: 'patrol', guard: 'lostLineOfSight' },
    { event: 'plantOrder', to: 'plant', guard: 'isCarrier' },
    { event: 'down', to: 'downed', guard: 'always' },
  ],
  engage: [
    { event: 'lostEnemy', to: 'alert', guard: 'lostLineOfSight' },
    { event: 'targetDown', to: 'patrol', guard: 'targetDown' },
    { event: 'lowHp', to: 'take_cover', guard: 'hpCritical' },
    { event: 'reload', to: 'engage', guard: 'ammoLow' },
    { event: 'down', to: 'downed', guard: 'always' },
  ],
  take_cover: [
    { event: 'seeEnemy', to: 'engage', guard: 'hasLineOfSight' },
    { event: 'recovered', to: 'alert', guard: 'hpRecovered' },
    { event: 'down', to: 'downed', guard: 'always' },
  ],
  plant: [
    { event: 'planted', to: 'patrol', guard: 'always' },
    { event: 'interrupted', to: 'engage', guard: 'hasLineOfSight' },
    { event: 'down', to: 'downed', guard: 'always' },
  ],
  downed: [],
};

export function transition(table, state, event, ctx, guards = Guards) {
  const rows = table[state] || [];
  for (const row of rows) {
    if (row.event !== event) continue;
    const guard = typeof row.guard === 'function' ? row.guard : guards[row.guard];
    if (guard && !guard(ctx || {})) continue;
    return { from: state, to: row.to, event, ok: true };
  }
  return { from: state, to: state, event, ok: false };
}

export function createMachine(table, initial, context = {}) {
  const m = {
    table,
    state: initial,
    ctx: context,
    log: [],
    send(event, payload) {
      const ctx = { ...this.ctx, ...(payload || {}) };
      const r = transition(this.table, this.state, event, ctx);
      if (r.ok) {
        this.log.push({ from: r.from, to: r.to, event, t: performance.now() });
        if (this.log.length > 64) this.log.shift();
        this.state = r.to;
      }
      return r;
    },
    reset(state) { this.state = state; this.log.length = 0; },
  };
  return m;
}
