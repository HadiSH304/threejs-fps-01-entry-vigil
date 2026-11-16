// textures.js — every surface texture is drawn on a canvas at load: no external
// assets, no network loads. Each texture layers a base colour, seeded noise grime,
// and painted detail (mortar lines, stencils, hazard stripes, floor lettering).
// Warm palettes are baked in per map so screenshots read warm at a glance.

import * as THREE from 'three';
import { mulberry32 } from './config.js';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function grime(ctx, w, h, rng, n, alpha = 0.08) {
  for (let i = 0; i < n; i++) {
    const v = rng();
    ctx.fillStyle = v > 0.5 ? `rgba(0,0,0,${alpha * rng()})` : `rgba(255,255,255,${alpha * 0.6 * rng()})`;
    const r = 1 + rng() * 4;
    ctx.beginPath();
    ctx.arc(rng() * w, rng() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function streaks(ctx, w, h, rng, n, color = 'rgba(0,0,0,0.10)') {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = color;
    const x = rng() * w, y = rng() * h, len = 20 + rng() * 90;
    ctx.fillRect(x, y, 2 + rng() * 4, len);
  }
}

function toTexture(c, repeat = 1) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function makeBrick(seed = 7) {
  const rng = mulberry32(seed);
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = '#8a4a30'; ctx.fillRect(0, 0, 512, 512);
  const bh = 32, bw = 86;
  for (let y = 0; y < 512; y += bh) {
    const off = (y / bh) % 2 ? bw / 2 : 0;
    for (let x = -bw; x < 512 + bw; x += bw) {
      const r = 120 + rng() * 50, g = 58 + rng() * 26, b = 36 + rng() * 20;
      ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      ctx.fillRect(x + off + 2, y + 2, bw - 4, bh - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x + off + 2, y + 2, bw - 4, 3);
    }
  }
  ctx.fillStyle = 'rgba(40,20,12,0.55)';
  ctx.fillRect(0, 0, 512, 512); // mortar wash over everything, then bricks redrawn darker
  grime(ctx, 512, 512, rng, 900, 0.10);
  streaks(ctx, 512, 512, rng, 26);
  return toTexture(c, 2);
}

export function makeConcrete(seed = 11) {
  const rng = mulberry32(seed);
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = '#7d7468'; ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    ctx.beginPath(); ctx.moveTo(i * 128, 0); ctx.lineTo(i * 128, 512); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * 128); ctx.lineTo(512, i * 128); ctx.stroke();
  }
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${rng() > 0.5 ? '255,250,235' : '20,16,12'},${0.03 + rng() * 0.05})`;
    ctx.beginPath();
    ctx.ellipse(rng() * 512, rng() * 512, 30 + rng() * 90, 20 + rng() * 60, rng() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  grime(ctx, 512, 512, rng, 1400, 0.09);
  streaks(ctx, 512, 512, rng, 30);
  return toTexture(c, 3);
}

export function makeCobble(seed = 21) {
  const rng = mulberry32(seed);
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = '#4c443a'; ctx.fillRect(0, 0, 512, 512);
  const s = 52;
  for (let y = 0; y < 512; y += s) {
    const off = (y / s) % 2 ? s / 2 : 0;
    for (let x = -s; x < 512 + s; x += s) {
      const v = 62 + rng() * 42;
      ctx.fillStyle = `rgb(${v | 0},${(v * 0.92) | 0},${(v * 0.8) | 0})`;
      ctx.beginPath();
      ctx.roundRect(x + off + 3, y + 3, s - 6, s - 6, 10);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,210,0.07)';
      ctx.beginPath();
      ctx.roundRect(x + off + 6, y + 6, s - 12, 10, 5);
      ctx.fill();
    }
  }
  grime(ctx, 512, 512, rng, 1100, 0.10);
  streaks(ctx, 512, 512, rng, 22, 'rgba(20,12,6,0.12)');
  return toTexture(c, 6);
}

export function makeMetal(seed = 31) {
  const rng = mulberry32(seed);
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#5d6166'; ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) { // brushed streaks
    ctx.fillStyle = `rgba(255,255,255,${0.02 + rng() * 0.04})`;
    ctx.fillRect(0, rng() * 256, 256, 1 + rng() * 2);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2;
  for (let i = 0; i < 6; i++) { // rivet rows
    for (let x = 16; x < 256; x += 32) {
      ctx.beginPath(); ctx.arc(x, 20 + i * 40, 4, 0, Math.PI * 2); ctx.stroke();
    }
  }
  grime(ctx, 256, 256, rng, 500, 0.12);
  streaks(ctx, 256, 256, rng, 14, 'rgba(120,60,10,0.14)'); // rust weep
  return toTexture(c, 2);
}

export function makePlywood(seed = 41) {
  const rng = mulberry32(seed);
  const [c, ctx] = canvas(512, 512);
  ctx.fillStyle = '#a97e4e'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 46; i++) { // wood grain
    ctx.strokeStyle = `rgba(90,55,20,${0.08 + rng() * 0.10})`;
    ctx.lineWidth = 1 + rng() * 2;
    ctx.beginPath();
    const y = rng() * 512;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y + rng() * 14 - 7, 340, y + rng() * 14 - 7, 512, y + rng() * 10 - 5);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(60,35,12,0.4)'; ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 508, 508);
  ctx.fillStyle = 'rgba(30,20,10,0.55)';
  ctx.font = 'bold 44px monospace'; ctx.textAlign = 'center';
  ctx.fillText('LANE 01', 256, 120);
  ctx.font = 'bold 28px monospace';
  ctx.fillText('BREACH HERE', 256, 420);
  grime(ctx, 512, 512, rng, 500, 0.07);
  return toTexture(c, 1.5);
}

export function makeCrate(seed = 51) {
  const rng = mulberry32(seed);
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#7a5c33'; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(40,24,8,0.6)'; ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 244, 244);
  ctx.beginPath(); ctx.moveTo(6, 6); ctx.lineTo(250, 250); ctx.moveTo(250, 6); ctx.lineTo(6, 250); ctx.stroke();
  ctx.fillStyle = 'rgba(20,14,6,0.75)';
  ctx.font = 'bold 34px monospace'; ctx.textAlign = 'center';
  ctx.fillText('VIGIL', 128, 108);
  ctx.font = 'bold 22px monospace';
  ctx.fillText('AMMO // 7.62', 128, 148);
  ctx.fillText('LOT 04', 128, 180);
  grime(ctx, 256, 256, rng, 320, 0.09);
  return toTexture(c, 1);
}

export function makeHazard(seed = 61) {
  const rng = mulberry32(seed);
  const [c, ctx] = canvas(256, 64);
  ctx.fillStyle = '#e8b400'; ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#151310';
  for (let x = -64; x < 256; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 64); ctx.lineTo(x + 32, 0); ctx.lineTo(x + 64, 0); ctx.lineTo(x + 32, 64);
    ctx.closePath(); ctx.fill();
  }
  grime(ctx, 256, 64, rng, 160, 0.12);
  return toTexture(c, 1);
}

export function makeFloorText(text, seed = 71, color = '#e8e2d2') {
  const rng = mulberry32(seed);
  const [c, ctx] = canvas(512, 256);
  ctx.clearRect(0, 0, 512, 256);
  ctx.fillStyle = color;
  ctx.font = 'bold 150px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.88;
  ctx.fillText(text, 256, 128);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) {
    ctx.beginPath();
    ctx.arc(rng() * 512, rng() * 256, 1 + rng() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function makeSign(text, seed = 81, fg = '#f2ead8', bg = '#23201c') {
  const rng = mulberry32(seed);
  const [c, ctx] = canvas(512, 128);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = 'rgba(242,234,216,0.5)'; ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.fillStyle = fg;
  ctx.font = 'bold 64px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 66);
  grime(ctx, 512, 128, rng, 200, 0.10);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeVerticalSign(text, seed = 91) {
  const [c, ctx] = canvas(128, 1024);
  ctx.fillStyle = '#1d1712'; ctx.fillRect(0, 0, 128, 1024);
  ctx.fillStyle = '#f2a541';
  ctx.font = 'bold 96px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const chars = text.split('');
  chars.forEach((ch, i) => ctx.fillText(ch, 64, 70 + i * ((1024 - 140) / chars.length)));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function makeSkyGradient(colors, seed = 101) {
  const [c, ctx] = canvas(256, 512);
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, colors[0]); g.addColorStop(0.5, colors[1]); g.addColorStop(0.78, colors[2]); g.addColorStop(1, colors[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 512);
  const glow = ctx.createRadialGradient(150, 330, 8, 150, 330, 150);
  glow.addColorStop(0, 'rgba(255, 225, 160, 0.95)');
  glow.addColorStop(0.35, 'rgba(255, 180, 90, 0.55)');
  glow.addColorStop(1, 'rgba(255, 150, 60, 0)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 256, 512);
  ctx.fillStyle = 'rgba(255, 200, 140, 0.10)';
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.ellipse(30 + ((i * 37) % 200), 60 + (i % 3) * 55, 42, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildTextureSet() {
  return {
    brick: makeBrick(),
    concrete: makeConcrete(),
    cobble: makeCobble(),
    metal: makeMetal(),
    plywood: makePlywood(),
    crate: makeCrate(),
    hazard: makeHazard(),
  };
}
