// hud.js — every DOM surface.

import { WEAPONS, UTILITY, ECONOMY, TIMERS } from './config.js';

export class HUD {
  constructor(game) {
    this.game = game;
    this.el = {};
    for (const id of ['hud', 'topbar', 'crosshair', 'hitmarker', 'killfeed', 'radio',
      'radar', 'radarLabel', 'slots', 'utility', 'health', 'armor', 'ammo', 'money',
      'timer', 'score', 'pips', 'roundLabel', 'planLabel', 'roleLabel', 'banner',
      'deploy', 'buy', 'scoreboard', 'aar', 'damageArc', 'flashOverlay', 'hint',
      'bossBar', 'coreBar']) {
      this.el[id] = document.getElementById(id);
    }
    this.radarCtx = this.el.radar?.getContext('2d');
    this.blips = [];
    this.feed = [];
    this.radioLines = [];
    this.sensitivity = 1.0;
  }

  setTopBar(round, scoreA, scoreD, phase) {
    this.el.roundLabel.textContent = `ROUND ${round} OF ${TIMERS.maxRounds}`;
    this.el.score.textContent = `${scoreA} — ${scoreD}`;
    const pips = (n, color) => Array.from({ length: TIMERS.winRounds }, (_, i) =>
      `<span class="pip ${i < n ? 'won' : ''}" style="--c:${color}"></span>`).join('');
    this.el.pips.innerHTML = pips(scoreA, '#ff7a2a') + '<span class="pipSep">:</span>' + pips(scoreD, '#3fa7ff');
  }
  setTimer(seconds, phase) {
    const s = Math.max(0, Math.ceil(seconds));
    this.el.timer.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    this.el.timer.classList.toggle('urgent', s <= 10 && phase === 'live');
  }
  setPlan(planLabel, role) {
    this.el.planLabel.textContent = planLabel || '';
    this.el.roleLabel.textContent = role ? `YOUR ROLE: ${role}` : '';
  }

  setLS(wave, coreHp) {
    this.el.roundLabel.textContent = `WAVE ${wave} / 7`;
    this.el.pips.innerHTML = '';
    this.el.planLabel.textContent = 'WIN: destroy the FOUNDRY WARDEN';
    this.el.roleLabel.textContent = 'LOSE: the Furnace Core falls';
    this.el.timer.textContent = '—';
    this.el.coreBar.classList.add('show');
    this.el.bossBar.classList.remove('show');
    this.setCore(coreHp);
  }
  setCore(hp) {
    this.el.score.textContent = `CORE ${Math.ceil(hp)}`;
    this.el.coreBar.querySelector('i').style.width = `${Math.max(0, hp / 10)}%`;
  }
  setBoss(hp, max) {
    this.el.bossBar.classList.add('show');
    this.el.bossBar.querySelector('i').style.width = `${Math.max(0, hp / max * 100)}%`;
  }
  hideLS() {
    this.el.coreBar.classList.remove('show');
    this.el.bossBar.classList.remove('show');
  }

  setCrosshair(spreadPx) {
    const c = this.el.crosshair;
    if (!c) return;
    const gap = Math.max(3, Math.min(26, spreadPx));
    c.style.setProperty('--gap', `${gap}px`);
  }
  hitmarker(headshot) {
    const h = this.el.hitmarker;
    if (!h) return;
    h.classList.add('on');
    h.classList.toggle('hs', !!headshot);
    clearTimeout(this._hmT);
    this._hmT = setTimeout(() => h.classList.remove('on'), 110);
  }
  setVitals(hp, armor, hasHelmet, money) {
    this.el.health.textContent = Math.ceil(hp);
    this.el.health.classList.toggle('low', hp <= 30);
    this.el.armor.textContent = Math.ceil(armor) + (hasHelmet ? ' +H' : '');
    this.el.money.textContent = '$' + money;
  }
  setAmmo(mag, reserve, weaponName) {
    this.el.ammo.innerHTML = `<b>${mag === Infinity ? '∞' : mag}</b> / ${reserve === Infinity ? '∞' : reserve}<span>${weaponName}</span>`;
  }
  setSlots(loadout, currentId) {
    this.el.slots.innerHTML = loadout.map((w) => {
      const active = w.id === currentId ? ' active' : '';
      return `<div class="slot${active}"><span class="key">${w.slot}</span>${w.name}</div>`;
    }).join('');
  }
  setUtility(counts) {
    this.el.utility.innerHTML = Object.entries(counts).map(([k, n]) => {
      const u = UTILITY[k];
      return `<div class="util"><span class="key">${u.key}</span>${u.name} ×${n}</div>`;
    }).join('');
  }

  killfeed(killerName, killerTeam, weaponName, victimName, victimTeam, headshot) {
    const div = document.createElement('div');
    div.className = 'kf';
    div.innerHTML = `<span style="color:${killerTeam === 'attack' ? '#ff7a2a' : '#3fa7ff'}">${killerName}</span> <span class="kfW">[${weaponName}${headshot ? ' ✕' : ''}]</span> <span style="color:${victimTeam === 'attack' ? '#ff7a2a' : '#3fa7ff'}">${victimName}</span>`;
    this.el.killfeed.prepend(div);
    while (this.el.killfeed.children.length > 5) this.el.killfeed.lastChild.remove();
    setTimeout(() => div.remove(), 6000);
  }

  radio(name, role, text, blipPos) {
    const div = document.createElement('div');
    div.className = 'radioLine';
    div.innerHTML = `<span class="radioTag">[RADIO]</span> ${name} (${role}): ${text}`;
    this.el.radio.prepend(div);
    while (this.el.radio.children.length > 5) this.el.radio.lastChild.remove();
    setTimeout(() => div.remove(), 7000);
    if (blipPos) this.blips.push({ x: blipPos.x, z: blipPos.z, until: performance.now() + 3000, color: '#ffd24a' });
  }

  banner(text, sub = '') {
    const b = this.el.banner;
    b.innerHTML = `<div class="bannerMain">${text}</div><div class="bannerSub">${sub}</div>`;
    b.classList.add('show');
    clearTimeout(this._bnT);
    this._bnT = setTimeout(() => b.classList.remove('show'), 3200);
  }

  damageArc(fromYaw) {
    const a = this.el.damageArc;
    a.style.setProperty('--rot', `${fromYaw}deg`);
    a.classList.add('show');
    clearTimeout(this._daT);
    this._daT = setTimeout(() => a.classList.remove('show'), 500);
  }

  flashWhite(strength) {
    const f = this.el.flashOverlay;
    f.style.opacity = String(Math.min(1, strength));
    if (strength > 0.05) {
      clearTimeout(this._flT);
      this._flT = setTimeout(() => { f.style.opacity = '0'; }, 700);
    }
  }

  hint(text) { this.el.hint.textContent = text || ''; }

  drawRadar(mapDef, player, actors, smokes) {
    const ctx = this.radarCtx;
    if (!ctx || !mapDef) return;
    const W = 190, H = 150;
    const bx = mapDef.bounds.x, bz = mapDef.bounds.z;
    const sx = W / (bx * 2), sz = H / (bz * 2);
    const X = (x) => (x + bx) * sx;
    const Z = (z) => (z + bz) * sz;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(12,12,14,0.85)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2c2a26';
    ctx.fillRect(2, 2, W - 4, H - 4);
    ctx.fillStyle = '#5d564a';
    for (const w of mapDef.walls) ctx.fillRect(X(w.x - w.w / 2), Z(w.z - w.d / 2), w.w * sx, w.d * sz);
    ctx.fillStyle = '#7a6a42';
    for (const c of mapDef.crates) ctx.fillRect(X(c.x - c.w / 2), Z(c.z - c.d / 2), c.w * sx, c.d * sz);
    for (const key of ['A', 'B']) {
      const s = mapDef.sites[key];
      ctx.fillStyle = key === 'A' ? '#ff7a2a' : '#3fa7ff';
      ctx.fillRect(X(s.x) - 10, Z(s.z) - 9, 20, 18);
      ctx.fillStyle = '#101010';
      ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(key, X(s.x), Z(s.z) + 0.5);
    }
    for (const s of smokes) {
      if (!s.alive) continue;
      ctx.fillStyle = 'rgba(200,200,200,0.5)';
      ctx.beginPath(); ctx.arc(X(s.pos.x), Z(s.pos.z), s.radius * sx * 0.6, 0, Math.PI * 2); ctx.fill();
    }
    const now = performance.now();
    this.blips = this.blips.filter((b) => b.until > now);
    for (const b of this.blips) {
      const pulse = 3 + Math.sin(now / 120) * 1.5;
      ctx.strokeStyle = b.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(X(b.x), Z(b.z), 4 + pulse, 0, Math.PI * 2); ctx.stroke();
    }
    for (const a of actors) {
      if (a.dead) continue;
      if (a.isPlayer) {
        ctx.save();
        ctx.translate(X(a.pos.x), Z(a.pos.z));
        ctx.rotate(-a.yaw);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4.5, 5); ctx.lineTo(-4.5, 5); ctx.closePath(); ctx.fill();
        ctx.restore();
      } else if (a.team === player.team) {
        ctx.fillStyle = '#58d68d';
        ctx.beginPath(); ctx.arc(X(a.pos.x), Z(a.pos.z), 3.5, 0, Math.PI * 2); ctx.fill();
      } else if (a.seen) {
        ctx.fillStyle = '#ff3b30';
        ctx.beginPath(); ctx.arc(X(a.pos.x), Z(a.pos.z), 3.5, 0, Math.PI * 2); ctx.fill();
      }
    }
    this.el.radarLabel.textContent = mapDef.name.toUpperCase();
  }

  showDeploy(mapName, planLabel, role, sensitivity, onStart, onLastStand) {
    const d = this.el.deploy;
    d.classList.add('show');
    d.querySelector('.mapName').textContent = mapName;
    d.querySelector('.planLine').textContent = planLabel;
    d.querySelector('.roleLine').textContent = 'Your role: ' + role;
    const slider = d.querySelector('#sens');
    slider.value = sensitivity;
    slider.oninput = () => { this.sensitivity = parseFloat(slider.value); };
    d.querySelector('.deployBtn').onclick = () => { d.classList.remove('show'); onStart(); };
    const lsBtn = d.querySelector('.lsBtn');
    if (lsBtn && onLastStand) lsBtn.onclick = () => { d.classList.remove('show'); onLastStand(); };
  }

  showBuy(money, loadout, onBuy, onClose) {
    const b = this.el.buy;
    const items = [
      { key: '1', name: 'Kestrel-7', price: 2700, id: 'kestrel' },
      { key: '2', name: 'Bastion-4', price: 2900, id: 'bastion' },
      { key: '3', name: 'Raptor-9', price: 1500, id: 'raptor' },
      { key: '4', name: 'Anvil .50', price: 700, id: 'anvil' },
      { key: '5', name: 'Armor', price: 650, id: 'armor' },
      { key: '6', name: 'Armor + Helmet', price: 1000, id: 'helmet' },
      { key: '7', name: 'Defuse Kit', price: 400, id: 'kit' },
      { key: '8', name: 'Smoke ×1', price: 300, id: 'smoke' },
      { key: '9', name: 'Flash ×1', price: 200, id: 'flash' },
    ];
    b.querySelector('.buyMoney').textContent = 'Money: $' + money;
    b.querySelector('.buyGrid').innerHTML = items.map((it) => {
      const owned = it.id === 'kestrel' || it.id === 'bastion' ? loadout.some((w) => w.id === it.id) : false;
      const afford = money >= it.price;
      return `<div class="buyItem${afford ? '' : ' poor'}${owned ? ' owned' : ''}" data-id="${it.id}">
        <span class="key">${it.key}</span><span class="buyName">${it.name}</span><span class="buyPrice">$${it.price}</span></div>`;
    }).join('');
    b.classList.add('show');
    b.querySelectorAll('.buyItem').forEach((el) => {
      el.onclick = () => onBuy(el.dataset.id);
    });
    this._buyHandler = (e) => {
      const map = { Digit1: 'kestrel', Digit2: 'bastion', Digit3: 'raptor', Digit4: 'anvil', Digit5: 'armor', Digit6: 'helmet', Digit7: 'kit', Digit8: 'smoke', Digit9: 'flash' };
      if (map[e.code]) onBuy(map[e.code]);
      if (e.code === 'KeyB' || e.code === 'Escape') { e.stopPropagation(); this.hideBuy(); }
    };
    document.addEventListener('keydown', this._buyHandler);
    this._onCloseBuy = onClose;
  }
  hideBuy() {
    this.el.buy.classList.remove('show');
    if (this._buyHandler) document.removeEventListener('keydown', this._buyHandler);
    if (this._onCloseBuy) this._onCloseBuy();
  }

  showScoreboard(rows, scoreA, scoreD) {
    const s = this.el.scoreboard;
    s.querySelector('.sbScore').textContent = `Ember Jackals ${scoreA} — ${scoreD} Harbor Wardens`;
    s.querySelector('tbody').innerHTML = rows.map((r) =>
      `<tr class="${r.isPlayer ? 'me' : ''}"><td>${r.name}</td><td>${r.team}</td><td>${r.kills}</td><td>${r.deaths}</td><td>$${r.money}</td></tr>`).join('');
    s.classList.add('show');
  }
  hideScoreboard() { this.el.scoreboard.classList.remove('show'); }

  showAAR(summary, won, onAgain, onSwitch, onWave, extra) {
    const a = this.el.aar;
    a.querySelector('.aarResult').textContent = won ? 'VICTORY' : 'DEFEAT';
    a.querySelector('.aarResult').classList.toggle('won', won);
    a.querySelector('.aarRank').textContent = summary.rank;
    const row = (k, v) => `<div class="aarRow"><span>${k}</span><b>${v}</b></div>`;
    a.querySelector('.aarStats').innerHTML =
      (extra || '') +
      row('Accuracy', (summary.accuracy * 100).toFixed(1) + '%') +
      row('Headshot share', (summary.headshotShare * 100).toFixed(1) + '%') +
      row('Kills', summary.kills) +
      row('Damage dealt / taken', `${summary.damageDealt} / ${summary.damageTaken}`) +
      row('Utility efficiency', (summary.parts.utility).toFixed(1) + ' / 10') +
      row('Clear time', summary.clearTime.toFixed(1) + ' s') +
      row('Composite', summary.composite.toFixed(1) + ' / 100');
    a.classList.add('show');
    a.querySelector('.againBtn').onclick = () => { a.classList.remove('show'); onAgain(); };
    a.querySelector('.switchBtn').onclick = () => { a.classList.remove('show'); onSwitch(); };
    a.querySelector('.waveBtn').onclick = () => { a.classList.remove('show'); onWave(); };
  }
}
