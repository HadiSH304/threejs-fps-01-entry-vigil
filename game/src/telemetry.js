// telemetry.js — match telemetry + AAR rank.

export class Telemetry {
  constructor() { this.resetMatch(); }

  resetMatch() {
    this.shots = 0; this.hits = 0;
    this.kills = 0; this.headshotKills = 0;
    this.damageDealt = 0; this.damageTaken = 0;
    this.utilityUsed = 0; this.enemiesBlinded = 0;
    this.smokeDenials = 0; this.botShots = 0;
    this.rounds = [];
    this.matchStart = performance.now();
    this.clearTime = 0;
  }

  startRound() { this.roundStart = performance.now(); }
  endRound(win, reason) {
    this.rounds.push({ win, reason, seconds: (performance.now() - this.roundStart) / 1000 });
  }
  shotFired() { this.shots++; }
  botShotFired() { this.botShots++; }
  hitLanded(damage, headshot) {
    this.hits++;
    this.damageDealt += damage;
    if (headshot) this.headshotKills++;
  }
  killConfirmed(headshot) { this.kills++; if (headshot) this.headshotKills++; }
  tookDamage(d) { this.damageTaken += d; }
  utility() { this.utilityUsed++; }
  blinded(n) { this.enemiesBlinded += n; }
  smokeDenial() { this.smokeDenials++; }

  accuracy() { return this.shots > 0 ? this.hits / this.shots : 0; }
  headshotShare() { return this.kills > 0 ? this.headshotKills / this.kills : 0; }
  damageExchange() {
    const total = this.damageDealt + this.damageTaken;
    return total > 0 ? this.damageDealt / total : 0.5;
  }
  utilityEfficiency() {
    if (this.utilityUsed === 0) return 0;
    return Math.min(1, (this.enemiesBlinded + this.smokeDenials) / (this.utilityUsed * 2));
  }
  speedScore() {
    if (!this.rounds.length) return 0;
    const avg = this.rounds.reduce((s, r) => s + r.seconds, 0) / this.rounds.length;
    return Math.max(0, Math.min(1, (100 - avg) / 55));
  }

  composite() {
    const acc = this.accuracy();
    const hs = this.headshotShare();
    const parts = {
      accuracy: Math.min(1, acc / 0.6) * 40,
      headshot: Math.min(1, hs / 0.6) * 25,
      damage: this.damageExchange() * 15,
      utility: this.utilityEfficiency() * 10,
      speed: this.speedScore() * 10,
    };
    const total = parts.accuracy + parts.headshot + parts.damage + parts.utility + parts.speed;
    let rank = 'C';
    if (total >= 88 && acc >= 0.40 && hs >= 0.45) rank = 'S+';
    else if (total >= 74 && acc >= 0.35 && hs >= 0.40) rank = 'S';
    else if (total >= 58) rank = 'A';
    else if (total >= 40) rank = 'B';
    return { total: Math.round(total * 10) / 10, rank, parts };
  }

  summary() {
    const c = this.composite();
    return {
      accuracy: this.accuracy(),
      headshotShare: this.headshotShare(),
      kills: this.kills,
      damageDealt: Math.round(this.damageDealt),
      damageTaken: Math.round(this.damageTaken),
      utilityUsed: this.utilityUsed,
      enemiesBlinded: this.enemiesBlinded,
      smokeDenials: this.smokeDenials,
      clearTime: this.clearTime,
      rounds: this.rounds.length,
      composite: c.total,
      rank: c.rank,
      parts: c.parts,
    };
  }
}
