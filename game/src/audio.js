// audio.js — Web Audio synthesis, no files.

export class AudioSys {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
    this.lastStep = 0;
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch { this.ctx = null; }
  }

  noiseBuffer(seconds = 1) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  shot(weaponId, distanceM = 0) {
    if (!this.ctx || !this.enabled) return;
    this.ensure();
    const now = this.ctx.currentTime;
    const att = Math.max(0.12, 1 - distanceM / 90);
    const prof = {
      kestrel: { f: 1800, len: 0.16, g: 0.9, osc: 95 },
      bastion: { f: 2200, len: 0.13, g: 0.8, osc: 110 },
      raptor: { f: 2600, len: 0.09, g: 0.65, osc: 140 },
      hinge: { f: 1500, len: 0.12, g: 0.7, osc: 90 },
      anvil: { f: 1100, len: 0.22, g: 1.0, osc: 65 },
    }[weaponId] || { f: 1800, len: 0.14, g: 0.8, osc: 100 };
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.3);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = prof.f;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(prof.g * att, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + prof.len);
    src.connect(hp); hp.connect(g); g.connect(this.master);
    src.start(now); src.stop(now + prof.len + 0.02);
    const o = this.ctx.createOscillator();
    o.type = 'triangle'; o.frequency.setValueAtTime(prof.osc, now);
    o.frequency.exponentialRampToValueAtTime(40, now + 0.09);
    const og = this.ctx.createGain();
    og.gain.setValueAtTime(0.5 * att, now);
    og.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    o.connect(og); og.connect(this.master);
    o.start(now); o.stop(now + 0.12);
  }

  dink() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine'; o.frequency.value = 3400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.35, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    o.connect(g); g.connect(this.master);
    o.start(now); o.stop(now + 0.13);
  }

  thud() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.15);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 320;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.5, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(now); src.stop(now + 0.14);
  }

  reload() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    [0, 0.22, 0.45].forEach((t, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'square'; o.frequency.value = i === 2 ? 900 : 500;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.12, now + t);
      g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.05);
      o.connect(g); g.connect(this.master);
      o.start(now + t); o.stop(now + t + 0.06);
    });
  }

  step(speed) {
    if (!this.ctx || !this.enabled) return;
    const now = performance.now();
    const interval = speed > 0.5 ? Math.max(240, 620 - speed * 55) : Infinity;
    if (now - this.lastStep < interval) return;
    this.lastStep = now;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(0.08);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420;
    const g = this.ctx.createGain();
    const vol = Math.min(0.3, 0.06 + speed * 0.035);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    src.connect(lp); lp.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + 0.09);
  }

  smoke() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer(1.4);
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.4, now + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(now); src.stop(now + 1.4);
  }

  flash() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine'; o.frequency.setValueAtTime(5200, now);
    o.frequency.exponentialRampToValueAtTime(3800, now + 3);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 3);
    o.connect(g); g.connect(this.master);
    o.start(now); o.stop(now + 3.1);
  }

  plantBeep(final = false) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'square'; o.frequency.value = final ? 1400 : 950;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + (final ? 0.3 : 0.1));
    o.connect(g); g.connect(this.master);
    o.start(now); o.stop(now + (final ? 0.32 : 0.12));
  }

  roundEnd(win) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    [win ? 660 : 330, win ? 880 : 262].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.22, now + i * 0.16);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.16 + 0.35);
      o.connect(g); g.connect(this.master);
      o.start(now + i * 0.16); o.stop(now + i * 0.16 + 0.4);
    });
  }
}
